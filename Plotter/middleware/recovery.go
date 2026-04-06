// middleware/recovery.go
package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery returns a gin middleware for panic recovery with structured logging
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic with stack trace
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.String("stack", string(debug.Stack())),
				)

				// Return error response
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "Internal server error",
					"message": fmt.Sprintf("%v", err),
				})

				c.Abort()
			}
		}()

		c.Next()
	}
}
