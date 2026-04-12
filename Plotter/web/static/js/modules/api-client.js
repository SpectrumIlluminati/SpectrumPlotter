/**
 * API Client Module
 *
 * Centralized API communication layer for SFAF Plotter
 * Provides typed methods for all backend endpoints
 */

const APIClient = (() => {
    const BASE_URL = '/api';

    /**
     * Generic fetch wrapper with error handling
     */
    async function request(endpoint, options = {}) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                // Try to get error details from response body
                let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorBody = await response.json();
                    console.error(`❌ Backend Error Response:`, errorBody);
                    if (errorBody.error) {
                        errorDetails += ` - ${errorBody.error}`;
                    }
                } catch (e) {
                    // Response body is not JSON
                }
                throw new Error(errorDetails);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ==================== Marker Endpoints ====================

    /**
     * Fetch all markers
     * GET /api/markers
     */
    async function fetchMarkers() {
        return request('/markers');
    }

    /**
     * Create a new marker
     * POST /api/markers
     */
    async function createMarker(data) {
        return request('/markers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Update a marker
     * PUT /api/markers/:id
     */
    async function updateMarker(id, data) {
        return request(`/markers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Delete a marker
     * DELETE /api/markers/:id
     */
    async function deleteMarker(id) {
        return request(`/markers/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Delete all markers
     * DELETE /api/markers
     */
    async function deleteAllMarkers() {
        return request('/markers', {
            method: 'DELETE'
        });
    }

    // ==================== Coordinate Endpoints ====================

    /**
     * Convert coordinates to multiple formats
     * GET /api/convert-coords?lat={lat}&lng={lng}
     */
    async function convertCoordinates(lat, lng) {
        // Ensure lat/lng are numbers
        const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
        const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;

        return request(`/convert-coords?lat=${latNum.toFixed(4)}&lng=${lngNum.toFixed(4)}`);
    }

    // ==================== SFAF Endpoints ====================

    /**
     * Fetch SFAF object data for a marker
     * GET /api/sfaf/object-data/:marker_id
     */
    async function fetchSFAFData(markerId) {
        return request(`/sfaf/object-data/${markerId}`);
    }

    /**
     * Create SFAF record
     * POST /api/sfaf
     */
    async function saveSFAFData(markerId, fields) {
        console.log('🔍 saveSFAFData called with:', { markerId, fieldsCount: Object.keys(fields).length });

        const payload = {
            marker_id: markerId,
            fields: fields
        };
        console.log('📤 Sending to /api/sfaf:', payload);

        return request('/sfaf', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Update existing SFAF record
     * PUT /api/sfaf/:id
     */
    async function updateSFAFData(sfafId, fields) {
        console.log('🔍 updateSFAFData called with:', { sfafId, fieldsCount: Object.keys(fields).length });

        // UpdateSFAFRequest only expects 'fields', not 'marker_id'
        const payload = {
            fields: fields
        };
        console.log('📤 Sending to PUT /api/sfaf/' + sfafId + ':', payload);

        return request(`/sfaf/${sfafId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Validate SFAF fields
     * POST /api/sfaf/validate
     */
    async function validateSFAFFields(fields) {
        return request('/sfaf/validate', {
            method: 'POST',
            body: JSON.stringify({ fields: fields })
        });
    }

    /**
     * Delete SFAF record
     * DELETE /api/sfaf/:id
     */
    async function deleteSFAFRecord(id) {
        return request(`/sfaf/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== Geometry Endpoints ====================

    /**
     * Create a circle geometry
     * POST /api/geometry/circle
     */
    async function createCircle(data) {
        return request('/geometry/circle', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Update a circle geometry
     * PUT /api/geometry/circle/:id
     */
    async function updateCircle(id, data) {
        return request(`/geometry/circle/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Create a polygon geometry
     * POST /api/geometry/polygon
     */
    async function createPolygon(data) {
        return request('/geometry/polygon', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Update a polygon geometry
     * PUT /api/geometry/polygon/:id
     */
    async function updatePolygon(id, data) {
        return request(`/geometry/polygon/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Create a rectangle geometry
     * POST /api/geometry/rectangle
     */
    async function createRectangle(data) {
        return request('/geometry/rectangle', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Update a rectangle geometry
     * PUT /api/geometry/rectangle/:id
     */
    async function updateRectangle(id, data) {
        return request(`/geometry/rectangle/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Fetch all geometries
     * GET /api/geometry
     */
    async function fetchGeometries() {
        return request('/geometry');
    }

    /**
     * Delete a geometry
     * DELETE /api/geometry/:id
     */
    async function deleteGeometry(id) {
        return request(`/geometry/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== IRAC Notes Endpoints ====================

    /**
     * Fetch IRAC notes
     * GET /api/irac-notes
     */
    async function fetchIRACNotes() {
        return request('/irac-notes');
    }

    // Public API
    return {
        // Markers
        fetchMarkers,
        createMarker,
        updateMarker,
        deleteMarker,
        deleteAllMarkers,

        // Coordinates
        convertCoordinates,

        // SFAF
        fetchSFAFData,
        saveSFAFData,
        updateSFAFData,
        validateSFAFFields,
        deleteSFAFRecord,

        // Geometry
        fetchGeometries,
        createCircle,
        updateCircle,
        createPolygon,
        updatePolygon,
        createRectangle,
        updateRectangle,
        deleteGeometry,

        // IRAC
        fetchIRACNotes
    };
})();

// Make globally available
window.APIClient = APIClient;
