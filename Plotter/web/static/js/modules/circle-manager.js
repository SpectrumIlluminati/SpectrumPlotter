/**
 * Circle Manager Module
 *
 * Manages circle/geometry lifecycle: creation, editing, deletion, and authorization radius
 */

const CircleManager = (() => {
    // Storage for geometries
    const geometries = new Map();
    let authorizationCircle = null;

    /**
     * Prompt user for circle radius and unit
     */
    function promptCircleRadius(coords) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(3px);
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #2a2a2a;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                max-width: 500px;
                width: 90%;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            modal.innerHTML = `
                <h3 style="margin-top: 0; color: #4ECDC4; font-size: 24px; font-weight: 600;">
                    🎯 Authorization Circle
                </h3>

                <div style="background: #3a3a3a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-size: 13px; color: #999; margin-bottom: 8px;">Center Coordinates</div>
                    <div style="font-size: 14px; line-height: 1.6;">
                        <strong>Decimal:</strong> ${coords.decimal}<br>
                        <strong>DMS:</strong> ${coords.dms}
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #ddd;">
                        Radius
                    </label>
                    <input
                        type="number"
                        id="circleRadius"
                        placeholder="Enter radius value"
                        style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #3a3a3a;
                            border-radius: 6px;
                            background: #1a1a1a;
                            color: white;
                            font-size: 16px;
                            box-sizing: border-box;
                        "
                        min="0.1"
                        step="0.1"
                    />
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 12px; font-weight: 500; color: #ddd;">
                        Unit
                    </label>
                    <div style="display: flex; gap: 15px;">
                        <label style="flex: 1; display: flex; align-items: center; cursor: pointer;">
                            <input type="radio" name="unit" value="km" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 15px;">Kilometers (km)</span>
                        </label>
                        <label style="flex: 1; display: flex; align-items: center; cursor: pointer;">
                            <input type="radio" name="unit" value="nm" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 15px;">Nautical Miles (NM)</span>
                        </label>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 30px;">
                    <button id="cancelCircle" style="
                        flex: 1;
                        padding: 12px;
                        border: 2px solid #555;
                        border-radius: 6px;
                        background: #3a3a3a;
                        color: white;
                        font-size: 15px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        Cancel
                    </button>
                    <button id="createCircle" style="
                        flex: 1;
                        padding: 12px;
                        border: none;
                        border-radius: 6px;
                        background: #4ECDC4;
                        color: white;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        Create Circle
                    </button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Button hover effects
            const cancelBtn = modal.querySelector('#cancelCircle');
            const createBtn = modal.querySelector('#createCircle');

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = '#555';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = '#4a4a4a';
            });

            createBtn.addEventListener('mouseenter', () => {
                createBtn.style.background = '#45b8ad';
            });
            createBtn.addEventListener('mouseleave', () => {
                createBtn.style.background = '#4ECDC4';
            });

            // Focus on radius input with focus styling
            const radiusInput = modal.querySelector('#circleRadius');
            radiusInput.addEventListener('focus', () => {
                radiusInput.style.borderColor = '#4ECDC4';
                radiusInput.style.outline = 'none';
            });
            radiusInput.addEventListener('blur', () => {
                radiusInput.style.borderColor = '#3a3a3a';
            });
            setTimeout(() => radiusInput.focus(), 100);

            // Handle Create button
            modal.querySelector('#createCircle').onclick = () => {
                const radius = parseFloat(radiusInput.value);
                const unit = modal.querySelector('input[name="unit"]:checked').value;

                if (!radius || radius <= 0) {
                    radiusInput.style.borderColor = 'red';
                    return;
                }

                document.body.removeChild(overlay);
                resolve({ radius, unit });
            };

            // Handle Cancel button
            modal.querySelector('#cancelCircle').onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };

            // Handle Enter key
            radiusInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    modal.querySelector('#createCircle').click();
                }
            });

            // Handle Escape key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.querySelector('#cancelCircle').click();
                }
            });
        });
    }

    /**
     * Create a circle on the map with proper metadata
     */
    async function createCircle(center, radius, unit, geometryData) {
        const radiusMeters = unit === 'nm' ? radius * 1852 : radius * 1000;

        const circle = L.circle([center.lat, center.lng], {
            radius: radiusMeters,
            color: geometryData.color || '#4ECDC4',
            fillColor: geometryData.color || '#4ECDC4',
            fillOpacity: 0.2,
            weight: 2
        });

        // Store geometry metadata
        circle.geometryId = geometryData.id;
        circle.geometryData = {
            id: geometryData.id,
            marker_id: geometryData.marker_id,
            type: 'circle',
            radius: radius,
            unit: unit,
            center: { lat: center.lat, lng: center.lng },
            serial: geometryData.serial || 'N/A'
        };

        // Store in geometries map
        geometries.set(geometryData.id, circle);

        // Add to map
        window.drawnItems.addLayer(circle);

        return circle;
    }

    /**
     * Update circle from Field 306 value
     */
    async function updateCircleFromField306(circle, radiusValue) {
        // Parse radius (remove B/T suffixes and extract numeric value)
        const cleanValue = radiusValue.replace(/[BT]/gi, '');
        const numericRadius = parseFloat(cleanValue);

        if (isNaN(numericRadius) || numericRadius <= 0) return;

        // Determine unit from suffix (B = km, T = nautical miles)
        const unit = radiusValue.toUpperCase().includes('T') ? 'nm' : 'km';

        // Convert to meters for Leaflet
        const radiusMeters = unit === 'nm' ? numericRadius * 1852 : numericRadius * 1000;

        // Update circle radius
        circle.setRadius(radiusMeters);

        // Update geometry data
        circle.geometryData.radius = numericRadius;
        circle.geometryData.unit = unit;

        // Update tooltip
        TooltipManager.updateCircleTooltip(circle);

        // Sync to backend
        if (circle.geometryId) {
            try {
                const center = circle.getLatLng();
                await APIClient.updateCircle(circle.geometryId, {
                    lat: center.lat,
                    lng: center.lng,
                    radius: numericRadius,
                    unit: unit
                });
                console.log(`✅ Circle updated from Field 306: ${numericRadius} ${unit}`);
            } catch (error) {
                console.error('❌ Failed to update circle from Field 306:', error);
            }
        }
    }

    /**
     * Link a circle to a marker
     */
    function linkCircleToMarker(circle, marker) {
        circle.centerMarker = marker;
        marker.linkedCircle = circle;

        // Hide marker tooltip since circle tooltip is now showing
        marker.unbindTooltip();

        console.log('✅ Circle linked to marker');
    }

    /**
     * Delete a circle from map and backend
     */
    async function deleteCircle(circleId) {
        try {
            await APIClient.deleteGeometry(circleId);

            const circle = geometries.get(circleId);
            if (circle) {
                window.map.removeLayer(circle);
                geometries.delete(circleId);

                // Unlink marker if present
                if (circle.centerMarker) {
                    circle.centerMarker.linkedCircle = null;
                    TooltipManager.updateMarkerTooltip(circle.centerMarker);
                }
            }

            console.log('✅ Circle deleted successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to delete circle:', error);
            return false;
        }
    }

    /**
     * Create authorization circle preview (temporary, not saved)
     */
    async function createAuthorizationCircle(radiusValue) {
        if (!window.currentSFAFMarker) return;

        // Remove existing circle
        removeAuthorizationCircle();

        try {
            // Parse radius (remove B/T suffixes)
            const numericRadius = parseFloat(radiusValue.replace(/[BT]/gi, ''));
            if (isNaN(numericRadius) || numericRadius <= 0) return;

            // Create circle
            authorizationCircle = L.circle(
                [window.currentSFAFMarker.lat, window.currentSFAFMarker.lng],
                {
                    radius: numericRadius * 1000, // Convert km to meters
                    color: '#ff6b6b',
                    fillColor: '#ff6b6b',
                    fillOpacity: 0.1,
                    opacity: 0.6,
                    weight: 2,
                    dashArray: '5, 5'
                }
            ).addTo(window.map);

            authorizationCircle.bindTooltip(
                `<b>Authorization Radius</b><br>
                 Radius: ${numericRadius} km<br>
                 Field 306: ${radiusValue}`,
                { permanent: false }
            );

        } catch (error) {
            console.error('Failed to create authorization circle:', error);
        }
    }

    /**
     * Remove authorization circle preview
     */
    function removeAuthorizationCircle() {
        if (authorizationCircle) {
            window.map.removeLayer(authorizationCircle);
            authorizationCircle = null;
        }
    }

    /**
     * Get circle by ID
     */
    function getCircleById(id) {
        return geometries.get(id);
    }

    /**
     * Get all circles
     */
    function getAllCircles() {
        return Array.from(geometries.values());
    }

    /**
     * Get geometries storage map
     */
    function getGeometriesMap() {
        return geometries;
    }

    /**
     * Load existing geometries from backend and render them on the map
     */
    async function loadExistingGeometries() {
        try {
            const data = await APIClient.fetchGeometries();

            if (data.geometries && data.geometries.length > 0) {
                for (const geom of data.geometries) {
                    await renderGeometry(geom);
                }
                console.log(`✅ Loaded ${data.geometries.length} geometries from backend`);
            }
        } catch (error) {
            console.error('❌ Failed to load geometries:', error);
        }
    }

    /**
     * Render a geometry object on the map
     */
    async function renderGeometry(geom) {
        try {
            switch (geom.type) {
                case 'circle':
                    if (geom.circle_props) {
                        const circle = await createCircle(
                            { lat: geom.latitude, lng: geom.longitude },
                            geom.circle_props.radius_km || geom.circle_props.radius_nm,
                            geom.circle_props.unit || 'km',
                            {
                                id: geom.id,
                                marker_id: geom.marker_id,
                                serial: geom.serial || 'N/A',
                                color: geom.color || '#4ECDC4'
                            }
                        );

                        // Get coords and add tooltip
                        const coords = await APIClient.convertCoordinates(geom.latitude, geom.longitude);
                        TooltipManager.updateCircleTooltip(circle, coords);

                        // Link to marker if it exists
                        const centerMarker = MarkerManager.getMarkerById(geom.marker_id);
                        if (centerMarker) {
                            linkCircleToMarker(circle, centerMarker);

                            // Add click handler
                            circle.on('click', async () => {
                                MarkerManager.setCurrentSelectedMarker(centerMarker);
                                UIHelpers.manageObjectTabVisibility(true);
                                await SFAFIntegration.openSidebar(geom.marker_id);
                            });
                        }
                    }
                    break;

                case 'polygon':
                    if (geom.polygon_props && geom.polygon_props.points) {
                        const points = geom.polygon_props.points.map(p => [p.lat, p.lng]);
                        const polygon = L.polygon(points, {
                            color: geom.color || '#45B7D1',
                            fillColor: geom.color || '#45B7D1',
                            fillOpacity: 0.2,
                            weight: 2
                        });

                        polygon.geometryId = geom.id;
                        polygon.geometryData = {
                            id: geom.id,
                            marker_id: geom.marker_id,
                            type: 'polygon',
                            points: geom.polygon_props.points,
                            serial: geom.serial || 'N/A'
                        };

                        window.drawnItems.addLayer(polygon);
                        geometries.set(geom.id, polygon);

                        // Link to marker if it exists
                        const centerMarker = MarkerManager.getMarkerById(geom.marker_id);
                        if (centerMarker) {
                            polygon.centerMarker = centerMarker;
                            centerMarker.linkedPolygon = polygon;

                            // Add tooltip and click handler
                            const coords = await APIClient.convertCoordinates(geom.latitude, geom.longitude);
                            TooltipManager.updatePolygonTooltip(polygon, coords);

                            polygon.on('click', async () => {
                                MarkerManager.setCurrentSelectedMarker(centerMarker);
                                UIHelpers.manageObjectTabVisibility(true);
                                await SFAFIntegration.openSidebar(geom.marker_id);
                            });
                        }
                    }
                    break;

                case 'rectangle':
                    if (geom.rectangle_props && geom.rectangle_props.bounds) {
                        const bounds = geom.rectangle_props.bounds;
                        const rectangle = L.rectangle([
                            [bounds[0].lat, bounds[0].lng],
                            [bounds[1].lat, bounds[1].lng]
                        ], {
                            color: geom.color || '#96CEB4',
                            fillColor: geom.color || '#96CEB4',
                            fillOpacity: 0.2,
                            weight: 2
                        });

                        rectangle.geometryId = geom.id;
                        rectangle.geometryData = {
                            id: geom.id,
                            marker_id: geom.marker_id,
                            type: 'rectangle',
                            bounds: {
                                south: bounds[0].lat,
                                north: bounds[1].lat,
                                west: bounds[0].lng,
                                east: bounds[1].lng
                            },
                            serial: geom.serial || 'N/A'
                        };

                        window.drawnItems.addLayer(rectangle);
                        geometries.set(geom.id, rectangle);

                        // Link to marker if it exists
                        const centerMarker = MarkerManager.getMarkerById(geom.marker_id);
                        if (centerMarker) {
                            rectangle.centerMarker = centerMarker;
                            centerMarker.linkedRectangle = rectangle;

                            // Add tooltip and click handler
                            const coords = await APIClient.convertCoordinates(geom.latitude, geom.longitude);
                            TooltipManager.updateRectangleTooltip(rectangle, coords);

                            rectangle.on('click', async () => {
                                MarkerManager.setCurrentSelectedMarker(centerMarker);
                                UIHelpers.manageObjectTabVisibility(true);
                                await SFAFIntegration.openSidebar(geom.marker_id);
                            });
                        }
                    }
                    break;

                default:
                    console.warn(`Unknown geometry type: ${geom.type}`);
            }
        } catch (error) {
            console.error(`Failed to render geometry ${geom.id}:`, error);
        }
    }

    // Public API
    return {
        // Circle operations
        promptCircleRadius,
        createCircle,
        updateCircleFromField306,
        linkCircleToMarker,
        deleteCircle,

        // Authorization circle (preview)
        createAuthorizationCircle,
        removeAuthorizationCircle,

        // Geometry loading
        loadExistingGeometries,

        // Getters
        getCircleById,
        getAllCircles,
        getGeometriesMap
    };
})();

// Make globally available
window.CircleManager = CircleManager;

// Export geometries for backward compatibility
Object.defineProperty(window, 'geometries', {
    get: () => CircleManager.getGeometriesMap()
});
