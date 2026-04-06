/**
 * Tooltip Manager Module
 *
 * Manages tooltip rendering and coordinate caching for markers and circles
 */

const TooltipManager = (() => {
    // Coordinate cache for DMS conversions
    const coordinateCache = new Map();

    /**
     * Update marker tooltip with coordinates and metadata
     * Hides tooltip if marker has a linked circle
     */
    async function updateMarkerTooltip(marker) {
        const data = marker.markerData;
        const coordKey = `${data.lat},${data.lng}`;

        // Hide marker tooltip if it has a linked circle
        if (marker.linkedCircle) {
            marker.unbindTooltip();
            return;
        }

        // Check cache first
        if (coordinateCache.has(coordKey)) {
            const cachedDMS = coordinateCache.get(coordKey);
            const tooltip = buildMarkerTooltipHTML(data, cachedDMS);
            bindMarkerTooltip(marker, tooltip);
            return;
        }

        try {
            // Fetch DMS coordinates from API
            const coords = await APIClient.convertCoordinates(data.lat, data.lng);

            // Cache the DMS result
            coordinateCache.set(coordKey, coords.dms);

            // Double-check for linked circle (async race condition)
            if (marker.linkedCircle) {
                marker.unbindTooltip();
                return;
            }

            // Create and bind tooltip
            const tooltip = buildMarkerTooltipHTML(data, coords.dms, coords.decimal);
            bindMarkerTooltip(marker, tooltip);

            console.log('✅ Tooltip updated with DMS coordinates:', coords.dms);

        } catch (error) {
            console.error('❌ Failed to get DMS coordinates for tooltip:', error);

            // Double-check for linked circle
            if (marker.linkedCircle) {
                marker.unbindTooltip();
                return;
            }

            // Fallback tooltip without DMS
            const fallbackTooltip = buildMarkerTooltipHTML(data, '(conversion failed)');
            bindMarkerTooltip(marker, fallbackTooltip);
        }
    }

    /**
     * Build marker tooltip HTML
     */
    function buildMarkerTooltipHTML(data, dms, decimal = null) {
        const decimalDisplay = decimal || `${data.lat}, ${data.lng}`;
        const label = data.type === 'imported' ? 'Imported Marker' : 'Manual Marker';

        return `
            <b>${label}</b><br>
            DecDeg: ${decimalDisplay}<br>
            DMS: ${dms}<br>
            Serial: ${data.serial}<br>
            Freq: ${data.frequency || 'N/A'}<br>
            Notes: ${data.notes || '(none)'}
        `;
    }

    /**
     * Bind tooltip to marker with standard options
     */
    function bindMarkerTooltip(marker, content) {
        marker.bindTooltip(content, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -15)
        }).openTooltip();
    }

    /**
     * Update circle tooltip with geometry information
     */
    function updateCircleTooltip(circle, coords) {
        // If coords not provided, fetch them
        if (!coords) {
            const center = circle.getLatLng();
            APIClient.convertCoordinates(center.lat, center.lng)
                .then(coords => {
                    createCircleTooltipContent(circle, coords);
                })
                .catch(error => {
                    console.error('Failed to get coordinates for circle tooltip:', error);
                    createCircleTooltipContent(circle, null);
                });
        } else {
            createCircleTooltipContent(circle, coords);
        }
    }

    /**
     * Create circle tooltip content with geometry data
     */
    function createCircleTooltipContent(circle, coords) {
        const data = circle.geometryData;

        // Calculate radius in both units for display
        const radiusKm = data.unit === 'nm' ? data.radius * 1.852 : data.radius;
        const radiusNm = data.unit === 'km' ? data.radius * 0.539957 : data.radius;

        // Calculate area
        const areaKm2 = Math.PI * radiusKm * radiusKm;
        const areaMiles = areaKm2 * 0.386102;

        const tooltip = `
            <div style="min-width: 200px;">
                <b style="color: #4ECDC4; font-size: 14px;">Authorization Circle</b><br>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Serial:</strong> ${data.serial}<br>
                    <strong>Center (Dec):</strong> ${coords ? coords.decimal : 'N/A'}<br>
                    <strong>Center (DMS):</strong> ${coords ? coords.dms : 'N/A'}<br>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Radius:</strong> ${data.radius.toFixed(2)} ${data.unit.toUpperCase()}<br>
                    <strong>Radius (km):</strong> ${radiusKm.toFixed(2)} km<br>
                    <strong>Radius (NM):</strong> ${radiusNm.toFixed(2)} NM<br>
                    <strong>Area:</strong> ${areaMiles.toFixed(2)} mi²<br>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
                    <em>Click circle to view/edit SFAF record</em><br>
                    <em>Field 306: ${Math.round(data.radius)}${data.unit === 'nm' ? 'T' : 'B'}</em>
                </div>
            </div>
        `;

        circle.bindTooltip(tooltip, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -10)
        });
    }

    /**
     * Update polygon tooltip with geometry information
     */
    function updatePolygonTooltip(polygon, coords) {
        // If coords not provided, fetch them
        if (!coords) {
            const points = polygon.getLatLngs()[0];
            const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
            const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

            APIClient.convertCoordinates(centerLat, centerLng)
                .then(coords => {
                    createPolygonTooltipContent(polygon, coords);
                })
                .catch(error => {
                    console.error('Failed to get coordinates for polygon tooltip:', error);
                    createPolygonTooltipContent(polygon, null);
                });
        } else {
            createPolygonTooltipContent(polygon, coords);
        }
    }

    /**
     * Create polygon tooltip content with geometry data
     */
    function createPolygonTooltipContent(polygon, coords) {
        const data = polygon.geometryData;
        const points = polygon.getLatLngs()[0];

        // Calculate area using Shoelace formula
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].lat * points[j].lng;
            area -= points[j].lat * points[i].lng;
        }
        area = Math.abs(area) / 2.0;
        const areaMiles = area * 3959; // Rough conversion to square miles

        const tooltip = `
            <div style="min-width: 200px;">
                <b style="color: #45B7D1; font-size: 14px;">Polygon Area</b><br>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Serial:</strong> ${data.serial}<br>
                    <strong>Center (Dec):</strong> ${coords ? coords.decimal : 'N/A'}<br>
                    <strong>Center (DMS):</strong> ${coords ? coords.dms : 'N/A'}<br>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Vertices:</strong> ${points.length}<br>
                    <strong>Area:</strong> ${areaMiles.toFixed(2)} mi²<br>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
                    <em>Click polygon to view/edit SFAF record</em>
                </div>
            </div>
        `;

        polygon.bindTooltip(tooltip, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -10)
        });
    }

    /**
     * Update rectangle tooltip with geometry information
     */
    function updateRectangleTooltip(rectangle, coords) {
        // If coords not provided, fetch them
        if (!coords) {
            const bounds = rectangle.getBounds();
            const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;
            const centerLng = (bounds.getEast() + bounds.getWest()) / 2;

            APIClient.convertCoordinates(centerLat, centerLng)
                .then(coords => {
                    createRectangleTooltipContent(rectangle, coords);
                })
                .catch(error => {
                    console.error('Failed to get coordinates for rectangle tooltip:', error);
                    createRectangleTooltipContent(rectangle, null);
                });
        } else {
            createRectangleTooltipContent(rectangle, coords);
        }
    }

    /**
     * Create rectangle tooltip content with geometry data
     */
    function createRectangleTooltipContent(rectangle, coords) {
        const data = rectangle.geometryData;
        const bounds = rectangle.getBounds();

        // Calculate dimensions
        const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth());
        const lngDiff = Math.abs(bounds.getEast() - bounds.getWest());
        const area = latDiff * lngDiff * 3959; // Rough conversion to square miles

        const tooltip = `
            <div style="min-width: 200px;">
                <b style="color: #96CEB4; font-size: 14px;">Rectangle Area</b><br>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Serial:</strong> ${data.serial}<br>
                    <strong>Center (Dec):</strong> ${coords ? coords.decimal : 'N/A'}<br>
                    <strong>Center (DMS):</strong> ${coords ? coords.dms : 'N/A'}<br>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Area:</strong> ${area.toFixed(2)} mi²<br>
                    <strong>Bounds:</strong><br>
                    N: ${bounds.getNorth().toFixed(4)}°<br>
                    S: ${bounds.getSouth().toFixed(4)}°<br>
                    E: ${bounds.getEast().toFixed(4)}°<br>
                    W: ${bounds.getWest().toFixed(4)}°
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
                    <em>Click rectangle to view/edit SFAF record</em>
                </div>
            </div>
        `;

        rectangle.bindTooltip(tooltip, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -10)
        });
    }

    /**
     * Hide marker tooltip
     */
    function hideMarkerTooltip(marker) {
        marker.unbindTooltip();
    }

    /**
     * Clear coordinate cache when it gets too large
     */
    function manageCacheSize() {
        if (coordinateCache.size > 1000) {
            // Clear oldest entries
            const entries = Array.from(coordinateCache.entries());
            const toKeep = entries.slice(-500); // Keep last 500 entries
            coordinateCache.clear();
            toKeep.forEach(([key, value]) => coordinateCache.set(key, value));
        }
    }

    /**
     * Get cache statistics
     */
    function getCacheStats() {
        return {
            size: coordinateCache.size,
            maxSize: 1000
        };
    }

    /**
     * Clear the entire coordinate cache
     */
    function clearCache() {
        coordinateCache.clear();
        console.log('✅ Coordinate cache cleared');
    }

    // Public API
    return {
        updateMarkerTooltip,
        updateCircleTooltip,
        updatePolygonTooltip,
        updateRectangleTooltip,
        createCircleTooltipContent,
        createPolygonTooltipContent,
        createRectangleTooltipContent,
        hideMarkerTooltip,
        manageCacheSize,
        getCacheStats,
        clearCache
    };
})();

// Make globally available
window.TooltipManager = TooltipManager;
