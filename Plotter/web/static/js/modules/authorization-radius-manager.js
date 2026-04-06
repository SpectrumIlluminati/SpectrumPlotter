/**
 * Authorization Radius Manager Module
 *
 * Manages display of Field 306 authorization radius circles for SFAF records
 * Provides toggle controls for individual record circles
 */

const AuthorizationRadiusManager = (() => {
    // Storage for authorization circles
    const authRadiusCircles = new Map(); // marker_id -> circle object
    let isGloballyVisible = false; // OFF BY DEFAULT
    let map = null;
    let authRadiusLayer = null;
    const selectedRecords = new Set(); // Track selected marker IDs

    /**
     * Initialize the authorization radius manager
     */
    function init(leafletMap) {
        if (!leafletMap) {
            console.error('❌ AuthorizationRadiusManager: Map not provided');
            return;
        }

        map = leafletMap;

        // Create layer group for authorization radius circles
        authRadiusLayer = L.layerGroup();
        authRadiusLayer.addTo(map);

        console.log('✅ Authorization Radius Manager initialized');

        // Setup global toggle control
        setupGlobalToggle();
    }

    /**
     * Setup global toggle control in sidebar
     */
    function setupGlobalToggle() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Check if control already exists
        if (document.getElementById('auth-radius-global-toggle')) return;

        // Create control section
        const controlSection = document.createElement('div');
        controlSection.className = 'auth-radius-controls';
        controlSection.innerHTML = `
            <div style="
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                padding: 12px;
                margin: 12px 0;
            ">
                <h5 style="
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    📐 Authorization Radius
                </h5>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="auth-radius-global-toggle" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 6px 12px;
                        font-size: 12px;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        background-color: #28a745;
                        color: white;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        ⚪ Show All Radii
                    </button>
                    <button id="auth-radius-zoom-all" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 6px 12px;
                        font-size: 12px;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        background-color: white;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        🔍 Zoom to Radii
                    </button>
                </div>
                <div id="auth-radius-count" style="
                    font-size: 12px;
                    color: #666;
                    margin-top: 8px;
                    text-align: center;
                ">
                    Loading...
                </div>
            </div>
        `;

        // Insert after Field 530 controls or at beginning of sidebar
        const field530Controls = sidebar.querySelector('.field530-controls');
        if (field530Controls) {
            field530Controls.after(controlSection);
        } else {
            sidebar.prepend(controlSection);
        }

        // Setup event handlers
        document.getElementById('auth-radius-global-toggle').addEventListener('click', toggleGlobalVisibility);
        document.getElementById('auth-radius-zoom-all').addEventListener('click', zoomToAllRadii);

        updateControlsUI();
    }

    /**
     * Parse Field 306 value and return object with radius and authorization type
     * Format: ### or ###B or ###T
     * - Number: radius in kilometers
     * - B (optional): Basic/Both authorization (transmitter AND receiver)
     * - T (optional): Tactical/Transmitter authorization (transmitter only)
     * - No suffix: defaults to Both
     */
    function parseField306(field306Value) {
        if (!field306Value || typeof field306Value !== 'string') {
            return null;
        }

        const trimmed = field306Value.trim();
        if (trimmed.length === 0) {
            return null;
        }

        // Check if last character is B or T
        const lastChar = trimmed.slice(-1).toUpperCase();
        let authType = 'both'; // default
        let valueStr = trimmed;

        if (lastChar === 'B' || lastChar === 'T') {
            authType = lastChar === 'B' ? 'both' : 'transmit';
            valueStr = trimmed.slice(0, -1);
        }

        const radiusKm = parseFloat(valueStr);

        if (isNaN(radiusKm) || radiusKm <= 0) {
            return null;
        }

        return {
            radius: radiusKm,
            type: authType, // 'both' or 'transmit'
            rawValue: trimmed
        };
    }

    /**
     * Create authorization radius circle for a marker
     */
    function createAuthorizationCircle(markerId, markerData, sfafData) {
        if (!map || !authRadiusLayer) {
            console.warn('Map or layer not initialized');
            return null;
        }

        // Check if circle already exists
        if (authRadiusCircles.has(markerId)) {
            return authRadiusCircles.get(markerId);
        }

        // Get Field 306 value
        const field306 = sfafData?.sfaf_fields?.field306 || sfafData?.field306;
        if (!field306) {
            return null;
        }

        // Parse radius and authorization type
        const parsedField306 = parseField306(field306);
        if (!parsedField306) {
            console.warn(`Invalid Field 306 value for marker ${markerId}: ${field306}`);
            return null;
        }

        const radiusKm = parsedField306.radius;
        const authType = parsedField306.type;

        // Convert km to meters for Leaflet
        const radiusMeters = radiusKm * 1000;

        // Get marker coordinates
        const lat = parseFloat(markerData.lat);
        const lng = parseFloat(markerData.lng);

        if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Invalid coordinates for marker ${markerId}`);
            return null;
        }

        // Determine circle color based on authorization type
        // Match Field 530 color scheme: blue for transmit, green for receive, purple for both
        const colors = {
            'transmit': '#0066ff',  // Blue - transmit only (T)
            'both': '#9933ff'       // Purple - both transmit & receive (B or no suffix)
        };
        const circleColor = colors[authType] || colors['both'];

        // Create circle
        const circle = L.circle([lat, lng], {
            radius: radiusMeters,
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.6,
            className: 'auth-radius-circle'
        });

        // Add metadata
        circle.markerId = markerId;
        circle.radiusKm = radiusKm;
        circle.authType = authType;
        circle.field306 = field306;
        circle.serialNumber = sfafData?.serial_number || markerData.serial || 'Unknown';

        // Convert km to nautical miles (1 km = 0.539957 NM)
        const radiusNM = radiusKm * 0.539957;

        // Authorization type labels
        const authTypeLabels = {
            'transmit': 'Transmit Only (T)',
            'both': 'Both TX & RX (B)'
        };
        const authLabel = authTypeLabels[authType] || 'Both TX & RX';

        // Create popup
        const popupContent = `
            <div style="font-family: Arial, sans-serif;">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">
                    📐 Authorization Radius
                </h4>
                <table style="font-size: 12px;">
                    <tr>
                        <td style="padding: 2px 8px 2px 0; color: #666;"><strong>Serial:</strong></td>
                        <td style="padding: 2px 0;">${circle.serialNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 2px 8px 2px 0; color: #666;"><strong>Radius:</strong></td>
                        <td style="padding: 2px 0;">${radiusKm.toFixed(1)} km (${radiusNM.toFixed(1)} NM)</td>
                    </tr>
                    <tr>
                        <td style="padding: 2px 8px 2px 0; color: #666;"><strong>Type:</strong></td>
                        <td style="padding: 2px 0;">${authLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 2px 8px 2px 0; color: #666;"><strong>Field 306:</strong></td>
                        <td style="padding: 2px 0;"><code>${field306}</code></td>
                    </tr>
                </table>
                <button onclick="AuthorizationRadiusManager.toggleCircle('${markerId}')"
                        style="
                            margin-top: 8px;
                            padding: 4px 12px;
                            background-color: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 11px;
                        ">
                    Hide This Radius
                </button>
            </div>
        `;

        circle.bindPopup(popupContent);

        // Add tooltip with both km and NM
        circle.bindTooltip(`${circle.serialNumber} - ${radiusKm.toFixed(1)} km (${radiusNM.toFixed(1)} NM)`, {
            permanent: false,
            direction: 'center',
            className: 'auth-radius-tooltip'
        });

        // Do NOT add to layer automatically - wait for user selection
        // circle.addTo(authRadiusLayer);

        // Store circle
        authRadiusCircles.set(markerId, circle);

        console.log(`✅ Created auth radius circle for marker ${markerId}: ${radiusKm.toFixed(1)} km`);

        updateControlsUI();

        return circle;
    }

    /**
     * Load authorization circles for all markers with SFAF data
     */
    async function loadAllAuthorizationCircles() {
        try {
            console.log('📐 Loading authorization radius circles...');

            // Fetch all SFAF records
            const response = await fetch('/api/sfaf');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (!result.success || !result.data) {
                console.warn('No SFAF data returned');
                return;
            }

            const sfafRecords = result.data;
            console.log(`Found ${sfafRecords.length} SFAF records`);

            // Fetch all markers
            const markersResponse = await fetch('/api/markers');
            if (!markersResponse.ok) {
                throw new Error(`HTTP ${markersResponse.status} fetching markers`);
            }

            const markersResult = await markersResponse.json();
            const markers = markersResult.markers || [];

            // Create map of marker_id -> marker data
            const markerMap = new Map();
            markers.forEach(marker => {
                markerMap.set(marker.id, marker);
            });

            // Create circles for records with Field 306
            let createdCount = 0;
            sfafRecords.forEach(sfaf => {
                if (!sfaf.marker_id) return;

                const markerData = markerMap.get(sfaf.marker_id);
                if (!markerData) return;

                // Check if has Field 306
                const field306 = sfaf.sfaf_fields?.field306 || sfaf.field306;
                if (field306) {
                    const circle = createAuthorizationCircle(sfaf.marker_id, markerData, sfaf);
                    if (circle) {
                        createdCount++;
                    }
                }
            });

            console.log(`✅ Created ${createdCount} authorization radius circles`);
            updateControlsUI();

        } catch (error) {
            console.error('❌ Error loading authorization circles:', error);
        }
    }

    /**
     * Toggle visibility of a specific circle
     */
    function toggleCircle(markerId) {
        const circle = authRadiusCircles.get(markerId);
        if (!circle) {
            console.warn(`No circle found for marker ${markerId}`);
            return;
        }

        if (authRadiusLayer.hasLayer(circle)) {
            authRadiusLayer.removeLayer(circle);
            selectedRecords.delete(markerId);
            console.log(`Hidden circle for marker ${markerId}`);
        } else {
            circle.addTo(authRadiusLayer);
            selectedRecords.add(markerId);
            console.log(`Shown circle for marker ${markerId}`);
        }

        updateControlsUI();
    }

    /**
     * Show circles for specific marker IDs
     */
    function showCirclesForMarkers(markerIds) {
        if (!Array.isArray(markerIds)) {
            markerIds = [markerIds];
        }

        let shownCount = 0;
        markerIds.forEach(markerId => {
            const circle = authRadiusCircles.get(markerId);
            if (circle && !authRadiusLayer.hasLayer(circle)) {
                circle.addTo(authRadiusLayer);
                selectedRecords.add(markerId);
                shownCount++;
            }
        });

        console.log(`✅ Shown ${shownCount} authorization radius circles`);
        updateControlsUI();
        return shownCount;
    }

    /**
     * Hide circles for specific marker IDs
     */
    function hideCirclesForMarkers(markerIds) {
        if (!Array.isArray(markerIds)) {
            markerIds = [markerIds];
        }

        let hiddenCount = 0;
        markerIds.forEach(markerId => {
            const circle = authRadiusCircles.get(markerId);
            if (circle && authRadiusLayer.hasLayer(circle)) {
                authRadiusLayer.removeLayer(circle);
                selectedRecords.delete(markerId);
                hiddenCount++;
            }
        });

        console.log(`🔴 Hidden ${hiddenCount} authorization radius circles`);
        updateControlsUI();
        return hiddenCount;
    }

    /**
     * Show only selected circles (hide all others)
     */
    function showOnlySelectedCircles(markerIds) {
        if (!Array.isArray(markerIds)) {
            markerIds = [markerIds];
        }

        // Hide all circles first
        authRadiusLayer.clearLayers();
        selectedRecords.clear();

        // Show only the specified ones
        let shownCount = 0;
        markerIds.forEach(markerId => {
            const circle = authRadiusCircles.get(markerId);
            if (circle) {
                circle.addTo(authRadiusLayer);
                selectedRecords.add(markerId);
                shownCount++;
            }
        });

        console.log(`✅ Showing ${shownCount} selected authorization radius circles`);
        updateControlsUI();
        return shownCount;
    }

    /**
     * Toggle global visibility of all circles
     */
    function toggleGlobalVisibility() {
        isGloballyVisible = !isGloballyVisible;

        if (isGloballyVisible) {
            // Show all circles
            authRadiusCircles.forEach(circle => {
                circle.addTo(authRadiusLayer);
            });
            console.log('✅ Showing all authorization radius circles');
        } else {
            // Hide all circles
            authRadiusLayer.clearLayers();
            console.log('🔴 Hiding all authorization radius circles');
        }

        updateControlsUI();
    }

    /**
     * Zoom map to fit all authorization circles
     */
    function zoomToAllRadii() {
        if (authRadiusCircles.size === 0) {
            console.warn('No authorization circles to zoom to');
            return;
        }

        const bounds = L.latLngBounds();
        authRadiusCircles.forEach(circle => {
            bounds.extend(circle.getBounds());
        });

        map.fitBounds(bounds, { padding: [50, 50] });
        console.log('🔍 Zoomed to all authorization radii');
    }

    /**
     * Update UI controls with current state
     */
    function updateControlsUI() {
        const toggleBtn = document.getElementById('auth-radius-global-toggle');
        const countDiv = document.getElementById('auth-radius-count');

        if (toggleBtn) {
            if (isGloballyVisible) {
                toggleBtn.innerHTML = '🟢 Hide All Radii';
                toggleBtn.style.backgroundColor = '#dc3545';
            } else {
                toggleBtn.innerHTML = '⚪ Show All Radii';
                toggleBtn.style.backgroundColor = '#28a745';
            }
        }

        if (countDiv) {
            const visibleCount = Array.from(authRadiusCircles.values())
                .filter(circle => authRadiusLayer.hasLayer(circle)).length;
            countDiv.textContent = `${visibleCount} of ${authRadiusCircles.size} radii visible`;
        }
    }

    /**
     * Remove authorization circle for a specific marker
     */
    function removeCircle(markerId) {
        const circle = authRadiusCircles.get(markerId);
        if (circle) {
            authRadiusLayer.removeLayer(circle);
            authRadiusCircles.delete(markerId);
            console.log(`Removed circle for marker ${markerId}`);
            updateControlsUI();
        }
    }

    /**
     * Clear all authorization circles
     */
    function clearAllCircles() {
        authRadiusLayer.clearLayers();
        authRadiusCircles.clear();
        console.log('Cleared all authorization circles');
        updateControlsUI();
    }

    /**
     * Get circle for a specific marker
     */
    function getCircle(markerId) {
        return authRadiusCircles.get(markerId);
    }

    /**
     * Get count of circles
     */
    function getCircleCount() {
        return authRadiusCircles.size;
    }

    /**
     * Get list of selected marker IDs
     */
    function getSelectedRecords() {
        return Array.from(selectedRecords);
    }

    /**
     * Check if a circle is currently visible
     */
    function isCircleVisible(markerId) {
        const circle = authRadiusCircles.get(markerId);
        return circle && authRadiusLayer.hasLayer(circle);
    }

    // Public API
    return {
        init,
        createAuthorizationCircle,
        loadAllAuthorizationCircles,
        toggleCircle,
        showCirclesForMarkers,
        hideCirclesForMarkers,
        showOnlySelectedCircles,
        toggleGlobalVisibility,
        zoomToAllRadii,
        removeCircle,
        clearAllCircles,
        getCircle,
        getCircleCount,
        getSelectedRecords,
        isCircleVisible,
        parseField306
    };
})();

// Make globally accessible
window.AuthorizationRadiusManager = AuthorizationRadiusManager;
