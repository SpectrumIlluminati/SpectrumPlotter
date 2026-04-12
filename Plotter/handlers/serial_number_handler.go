package handlers

import (
	"database/sql"
	"net/http"
	"sfaf-plotter/repositories"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SerialNumberHandler struct {
	repo     *repositories.SerialNumberRepository
	freqRepo *repositories.FrequencyRepository
}

func NewSerialNumberHandler(repo *repositories.SerialNumberRepository, freqRepo *repositories.FrequencyRepository) *SerialNumberHandler {
	return &SerialNumberHandler{repo: repo, freqRepo: freqRepo}
}

// GET /api/serial-numbers/next?prefix=AF&limit=50
// Agency/ntia/admin roles see all available serials.
// All other roles are restricted to serials allocated to their primary MAJCOM unit.
func (h *SerialNumberHandler) GetNext(c *gin.Context) {
	prefix := c.Query("prefix")
	if prefix == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prefix required"})
		return
	}
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	// agency/ntia/admin see all available serials.
	// Everyone else is restricted to serials allocated to their primary unit.
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	privileged := roleStr == "agency" || roleStr == "ntia" || roleStr == "admin"

	var unitIDs []uuid.UUID
	if !privileged {
		uid, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}
		unit, err := h.freqRepo.GetUserISMUnit(uid.(uuid.UUID))
		if err != nil && err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if unit == nil {
			c.JSON(http.StatusOK, gin.H{"serials": []interface{}{}, "count": 0})
			return
		}
		unitIDs = []uuid.UUID{unit.ID}
	}

	rows, err := h.repo.GetNext(prefix, unitIDs, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"serials": rows, "count": len(rows)})
}

// GET /api/serial-numbers?prefix=AF
func (h *SerialNumberHandler) GetAvailable(c *gin.Context) {
	prefix := c.Query("prefix")
	rows, err := h.repo.GetAvailable(prefix)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"serials": rows, "count": len(rows)})
}

// GET /api/serial-numbers/allocations?prefix=AF
func (h *SerialNumberHandler) GetAllocations(c *gin.Context) {
	prefix := c.Query("prefix")
	rows, err := h.repo.GetAllocationSummary(prefix)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"allocations": rows})
}

// POST /api/serial-numbers/allocate
// Body: { "prefix": "AF", "unit_id": "<uuid>", "count": 500 }
func (h *SerialNumberHandler) Allocate(c *gin.Context) {
	var body struct {
		Prefix string    `json:"prefix" binding:"required"`
		UnitID uuid.UUID `json:"unit_id" binding:"required"`
		Count  int       `json:"count"  binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Count <= 0 || body.Count > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "count must be 1–10000"})
		return
	}
	n, err := h.repo.AllocateToUnit(body.Prefix, body.UnitID, body.Count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"allocated": n, "message": "ok"})
}

// POST /api/serial-numbers/sub-allocate
// Body: { "from_unit_id": "<uuid>", "to_unit_id": "<uuid>", "prefix": "AF", "count": 100 }
// Moves serials from a parent unit's pool to a child unit's pool.
func (h *SerialNumberHandler) SubAllocate(c *gin.Context) {
	var body struct {
		FromUnitID uuid.UUID `json:"from_unit_id" binding:"required"`
		ToUnitID   uuid.UUID `json:"to_unit_id"   binding:"required"`
		Prefix     string    `json:"prefix"       binding:"required"`
		Count      int       `json:"count"        binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Count <= 0 || body.Count > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "count must be 1–10000"})
		return
	}
	// command role: ensure from_unit_id is the caller's own unit
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if roleStr == "command" {
		if uid, exists := c.Get("userID"); exists {
			unit, err := h.freqRepo.GetUserPrimaryUnit(uid.(uuid.UUID))
			if err != nil || unit == nil || unit.ID != body.FromUnitID {
				c.JSON(http.StatusForbidden, gin.H{"error": "from_unit_id must be your own unit"})
				return
			}
		}
	}
	n, err := h.repo.SubAllocateToUnit(body.FromUnitID, body.ToUnitID, body.Prefix, body.Count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"allocated": n, "message": "ok"})
}

// DELETE /api/serial-numbers/sub-allocate?from_unit_id=X&to_unit_id=Y&count=N
// Reclaims serials from a child unit back to a parent unit's pool.
func (h *SerialNumberHandler) Reclaim(c *gin.Context) {
	fromUnitID, err := uuid.Parse(c.Query("from_unit_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid from_unit_id"})
		return
	}
	toUnitID, err := uuid.Parse(c.Query("to_unit_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid to_unit_id"})
		return
	}
	count := 0
	if cs := c.Query("count"); cs != "" {
		if n, err2 := strconv.Atoi(cs); err2 == nil {
			count = n
		}
	}
	// command role: ensure from_unit_id is the caller's own unit
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if roleStr == "command" {
		if uid, exists := c.Get("userID"); exists {
			unit, err2 := h.freqRepo.GetUserPrimaryUnit(uid.(uuid.UUID))
			if err2 != nil || unit == nil || unit.ID != fromUnitID {
				c.JSON(http.StatusForbidden, gin.H{"error": "from_unit_id must be your own unit"})
				return
			}
		}
	}
	n, err := h.repo.ReclaimFromUnit(fromUnitID, toUnitID, count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"reclaimed": n, "message": "ok"})
}

// GET /api/serial-numbers/my-pool
// Returns per-prefix availability for the current user's allocated pool.
// Privileged roles (agency/ntia/admin) see the global unallocated pool totals.
func (h *SerialNumberHandler) GetMyPool(c *gin.Context) {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	privileged := roleStr == "agency" || roleStr == "ntia" || roleStr == "admin"

	if privileged {
		// Return global unallocated pool summary (what AFSMO has left to give out)
		rows, err := h.repo.GetAllocationSummary("")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"pool": rows})
		return
	}

	uid, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	unit, err := h.freqRepo.GetUserISMUnit(uid.(uuid.UUID))
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if unit == nil {
		c.JSON(http.StatusOK, gin.H{"pool": []interface{}{}})
		return
	}
	rows, err := h.repo.GetPoolSummaryForUnits([]uuid.UUID{unit.ID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"pool": rows})
}

// GET /api/serial-numbers/pool?unit_id=<uuid>
// Returns per-prefix pool summary for a specific unit.
func (h *SerialNumberHandler) GetUnitPool(c *gin.Context) {
	unitID, err := uuid.Parse(c.Query("unit_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit_id"})
		return
	}
	rows, err := h.repo.GetUnitPoolSummary(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"pool": rows})
}

// DELETE /api/serial-numbers/allocations/:unit_id?count=N
// Omit count (or count=0) to remove all unassigned allocations for the unit.
func (h *SerialNumberHandler) Deallocate(c *gin.Context) {
	unitID, err := uuid.Parse(c.Param("unit_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit_id"})
		return
	}
	count := 0
	if cs := c.Query("count"); cs != "" {
		if n, err := strconv.Atoi(cs); err == nil {
			count = n
		}
	}
	n, err := h.repo.DeallocateFromUnit(unitID, count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deallocated": n, "message": "ok"})
}
