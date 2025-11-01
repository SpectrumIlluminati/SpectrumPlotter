const baseMaps = {
    'CARTO Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }),
    'CARTO Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }),
    'Esri Streets': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    }),
    'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    })
};

// Initialize map (same center as your original)
const map = L.map('map', {
    center: [30.43, -86.695],
    zoom: 13,
    layers: [baseMaps['Esri Satellite']]
});

// Add layer control
L.control.layers(baseMaps).addTo(map);

// Create layer group for drawn features (same as your original)
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Storage for markers
const markers = new Map();
let currentSelectedMarker = null;

// Marker icons (same as your original)
const manualIcon = L.icon({
    iconUrl: '/images/marker-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
});

const importedIcon = L.icon({
    iconUrl: '/images/marker-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
});

// Coordinate tooltip using Go API (matches your original structure)
const cursorTooltip = L.tooltip({
    permanent: false,
    direction: 'right',
    offset: L.point(0, -45),
    className: 'cursorTooltip'
});

// Add to map initialization
map.on('click', function (e) {
    // If clicking on empty map (not on a marker)
    if (!e.originalEvent.target.closest('.leaflet-marker-icon')) {
        manageObjectTabVisibility(false);
        window.currentSFAFMarker = null;
        currentSelectedMarker = null;
    }
});

// Show tooltip on map mousemove (same as your original logic)
map.on('mousemove', async (e) => {
    if (e.originalEvent.target.classList.contains('leaflet-container')) {
        try {
            const lat = e.latlng.lat.toFixed(4);
            const lng = e.latlng.lng.toFixed(4);

            // Use Go API for coordinate conversion
            const response = await fetch(`/api/convert-coords?lat=${lat}&lng=${lng}`);
            const coords = await response.json();

            cursorTooltip
                .setLatLng(e.latlng)
                .setContent(`<b>Cursor</b><br>DecDeg: ${coords.decimal}<br>DMS: ${coords.dms}`);
            if (!cursorTooltip._map) {
                cursorTooltip.addTo(map);
            }
        } catch (error) {
            console.error('Coordinate conversion failed:', error);
            if (cursorTooltip._map) {
                map.removeLayer(cursorTooltip);
            }
        }
    } else {
        if (cursorTooltip._map) {
            map.removeLayer(cursorTooltip);
        }
    }
});

// Hide tooltip when mouse leaves map (same as your original)
map.getContainer().addEventListener('mouseleave', () => {
    if (cursorTooltip._map) {
        map.removeLayer(cursorTooltip);
    }
});

// Load existing markers from Go backend
async function loadExistingMarkers() {
    try {
        const response = await fetch('/api/markers');
        const data = await response.json();

        if (data.markers) {
            data.markers.forEach(markerData => {
                createMarkerOnMap(markerData);
            });
        }
    } catch (error) {
        console.error('Failed to load existing markers:', error);
    }
}

// Create marker on map (matches your original createManualMarker function)
function createMarkerOnMap(markerData) {
    const icon = markerData.type === 'imported' ? importedIcon : manualIcon;
    const marker = L.marker([markerData.lat, markerData.lng], {
        icon: icon,
        draggable: markerData.is_draggable !== false
    });

    // Store marker data and ID
    marker.markerId = markerData.id;
    marker.markerData = {
        ...markerData,
        lat: parseFloat(markerData.lat).toFixed(4),
        lng: parseFloat(markerData.lng).toFixed(4)
    };

    // Add to map and storage
    map.addLayer(marker);
    drawnItems.addLayer(marker);
    markers.set(markerData.id, marker);

    // CRITICAL: Update tooltip with DMS coordinates
    updateMarkerTooltip(marker);

    // Click handler
    marker.on('click', async () => {
        currentSelectedMarker = marker;
        manageObjectTabVisibility(true);
        await openSidebar(marker.markerId);
    });

    // Drag handler with tooltip update
    let dragTimeout = null;
    marker.on('drag', async (e) => {
        const pos = e.target.getLatLng();
        marker.markerData.lat = pos.lat.toFixed(4);
        marker.markerData.lng = pos.lng.toFixed(4);

        // Update tooltip immediately with new coordinates
        updateMarkerTooltip(marker);

        // Debounce server update
        if (dragTimeout) {
            clearTimeout(dragTimeout);
        }
        dragTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/markers/${markerData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: parseFloat(pos.lat.toFixed(4)),
                        lng: parseFloat(pos.lng.toFixed(4))
                    })
                });
                if (response.ok) {
                    console.log('✅ Marker position saved to server');
                }
            } catch (error) {
                console.error('❌ Failed to update marker coordinates:', error);
            }
        }, 500);
    });

    return marker;
}

// More efficient version with coordinate caching
const coordinateCache = new Map();

// Clear cache when it gets too large (optional optimization)
function manageCacheSize() {
    if (coordinateCache.size > 1000) {
        // Clear oldest entries
        const entries = Array.from(coordinateCache.entries());
        const toKeep = entries.slice(-500); // Keep last 500 entries
        coordinateCache.clear();
        toKeep.forEach(([key, value]) => coordinateCache.set(key, value));
    }
}

async function updateMarkerTooltip(marker) {
    const data = marker.markerData;
    const coordKey = `${data.lat},${data.lng}`;

    // Check cache first
    if (coordinateCache.has(coordKey)) {
        const cachedDMS = coordinateCache.get(coordKey);
        const tooltip = `
            <b>Manual Marker</b><br>
            DecDeg: ${data.lat}, ${data.lng}<br>
            DMS: ${cachedDMS}<br>
            Serial: ${data.serial}<br>
            Freq: ${data.frequency || 'N/A'}<br>
            Notes: ${data.notes || '(none)'}
        `;
        marker.bindTooltip(tooltip, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -15)
        }).openTooltip();
        return;
    }

    try {
        // CRITICAL: Make API call to get DMS coordinates
        const response = await fetch(`/api/convert-coords?lat=${data.lat}&lng=${data.lng}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const coords = await response.json();

        // Cache the DMS result for future use
        coordinateCache.set(coordKey, coords.dms);

        // Create tooltip with DMS coordinates
        const tooltip = `
            <b>Manual Marker</b><br>
            DecDeg: ${coords.decimal}<br>
            DMS: ${coords.dms}<br>
            Serial: ${data.serial}<br>
            Freq: ${data.frequency || 'N/A'}<br>
            Notes: ${data.notes || '(none)'}
        `;

        marker.bindTooltip(tooltip, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -15)
        }).openTooltip();

        console.log('✅ Tooltip updated with DMS coordinates:', coords.dms);

    } catch (error) {
        console.error('❌ Failed to get DMS coordinates for tooltip:', error);

        // Fallback tooltip without DMS
        const fallbackTooltip = `
            <b>Manual Marker</b><br>
            DecDeg: ${data.lat}, ${data.lng}<br>
            DMS: (conversion failed)<br>
            Serial: ${data.serial}<br>
            Freq: ${data.frequency || 'N/A'}<br>
            Notes: ${data.notes || '(none)'}
        `;

        marker.bindTooltip(fallbackTooltip, {
            permanent: true,
            direction: 'top',
            offset: L.point(0, -15)
        }).openTooltip();
    }
}

// Drawing controls (same as your original)
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: true
    },
    draw: {
        polygon: true,
        rectangle: true,
        circle: true,
        marker: true,
        polyline: false
    }
});
map.addControl(drawControl);

// Drawing event handlers that use Go APIs
map.on(L.Draw.Event.CREATED, async function (event) {
    const { layerType, layer } = event;

    try {
        let response;

        switch (layerType) {
            case 'marker':
                const latLng = layer.getLatLng();
                response = await fetch('/api/markers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: parseFloat(latLng.lat.toFixed(4)),
                        lng: parseFloat(latLng.lng.toFixed(4)),
                        type: 'manual'
                    })
                });
                if (response.ok) {
                    const markerResp = await response.json();
                    // Don't add the drawn layer to drawnItems since we're replacing it
                    map.removeLayer(layer);
                    createMarkerOnMap(markerResp.marker); // This will now add to drawnItems
                }
                break;

            case 'circle':
                const center = layer.getLatLng();
                const radius = layer.getRadius();
                response = await fetch('/api/geometry/circle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: center.lat,
                        lng: center.lng,
                        radius: radius / 1000, // Convert to km
                        unit: 'km'
                    })
                });

                if (response.ok) {
                    const geometryResp = await response.json();
                    drawnItems.addLayer(layer);

                    // Add center marker if geometry service returns one
                    if (geometryResp.geometry && geometryResp.geometry.center_marker) {
                        createMarkerOnMap(geometryResp.geometry.center_marker);
                    }
                }
                break;

            case 'polygon':
                const points = layer.getLatLngs()[0].map(point => ({
                    lat: point.lat,
                    lng: point.lng
                }));

                response = await fetch('/api/geometry/polygon', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ points: points })
                });

                if (response.ok) {
                    const geometryResp = await response.json();
                    drawnItems.addLayer(layer);

                    if (geometryResp.geometry && geometryResp.geometry.center_marker) {
                        createMarkerOnMap(geometryResp.geometry.center_marker);
                    }
                }
                break;

            case 'rectangle':
                const bounds = layer.getBounds();
                response = await fetch('/api/geometry/rectangle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        south_west: {
                            lat: bounds.getSouth(),
                            lng: bounds.getWest()
                        },
                        north_east: {
                            lat: bounds.getNorth(),
                            lng: bounds.getEast()
                        }
                    })
                });

                if (response.ok) {
                    const geometryResp = await response.json();
                    drawnItems.addLayer(layer);

                    if (geometryResp.geometry && geometryResp.geometry.center_marker) {
                        createMarkerOnMap(geometryResp.geometry.center_marker);
                    }
                }
                break;
        }
    } catch (error) {
        console.error(`Failed to create ${layerType}:`, error);
        // Still add to map locally if API fails
        drawnItems.addLayer(layer);
    }
});

// Helper functions for sidebar integration
function openPersistentSidebar() {
    const sidebar = document.getElementById('persistentSidebar');
    if (sidebar) {
        sidebar.classList.add('open');
    } else {
        console.error('❌ persistentSidebar element not found');
    }
}

function closePersistentSidebar() {
    const sidebar = document.getElementById('persistentSidebar');
    if (sidebar) {
        sidebar.classList.remove('open');

        // Hide Object tab when sidebar is closed
        manageObjectTabVisibility(false);

        // Clear current marker reference
        window.currentSFAFMarker = null;
    }
}

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

async function openSidebar(markerId) {
    try {
        console.log('🔍 Opening sidebar for marker:', markerId);

        // FIX: Use correct API endpoint
        const response = await fetch(`/api/sfaf/object-data/${markerId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📡 API Response:', data);

        if (data.success) {
            // CRITICAL: Open the sidebar FIRST
            openPersistentSidebar();

            // THEN show object tab
            manageObjectTabVisibility(true);

            // THEN switch to object tab
            switchTab('object');

            // FINALLY populate the form
            populateExistingSFAFForm(data);
        } else {
            console.error('API Error:', data.error);
            manageObjectTabVisibility(false);
        }
    } catch (error) {
        console.error('Failed to load SFAF data:', error);
        manageObjectTabVisibility(false);
    }
}

function populateExistingSFAFForm(data) {
    window.currentSFAFMarker = data.marker;
    // Complete official MCEB Pub 7 field mapping based on your HTML form structure
    const sfafFieldMapping = {
        // Administrative Data (Direct mappings)
        'field005': 'field005',    // Security Classification
        'field010': 'field010',    // Type of Action
        'field013': 'field013',    // Declassification Instruction Comment
        'field019': 'field019',    // Declassification Date
        'field102': 'field102',    // Agency Serial Number ✅ (works)
        'field701': 'field701',    // Frequency Action Officer
        'field702': 'field702',    // Control/Request Number (required for CENTCOM)

        // Emission Characteristics (Dynamic entries - map to _1 variants)
        'field110': 'field110_1',  // Frequency(ies) ✅ per MCEB Pub 7
        'field113': 'field113_1',  // Station Class ✅ per MCEB Pub 7
        'field114': 'field114_1',  // Emission Designator ✅ per MCEB Pub 7
        'field115': 'field115_1',  // Transmitter Power ✅ per MCEB Pub 7
        'field116': 'field116_1',  // Power Type (C/M/P) per MCEB Pub 7
        'field117': 'field117_1',  // Effective Radiated Power
        'field118': 'field118_1',  // Power/ERP Augmentation

        // Time/Date Information
        'field130': 'field130',    // Time ✅ (works) per MCEB Pub 7
        'field131': 'field131',    // Percent Time (required for EUCOM Germany)
        'field140': 'field140',    // Required Date (YYYYMMDD)
        'field141': 'field141',    // Expiration Date (required for CENTCOM)
        'field142': 'field142',    // Review Date
        'field143': 'field143',    // Revision Date
        'field144': 'field144',    // Approval Authority

        // Organizational Information
        'field200': 'field200',    // Agency (USAF, USA, USN, USMC, USCG)
        'field201': 'field201',    // Unified Command
        'field202': 'field202',    // Unified Command Service
        'field204': 'field204',    // Command
        'field205': 'field205',    // Subcommand
        'field206': 'field206',    // Installation Frequency Manager
        'field207': 'field207',    // Operating Unit
        'field209': 'field209',    // Area AFC/DoD AFC

        // Transmitter Location (Geographic codes A-Z per MCEB Pub 7 Annex E)
        'field300': 'field300',    // State/Country (A-Z geographic codes)
        'field301': 'field301',    // Antenna Location
        'field303': 'field303',    // Antenna Coordinates ✅ (auto-filled)
        'field306': 'field306',    // Authorized Radius

        // Transmitter Equipment (Dynamic entries per MCEB Pub 7 Annex D)
        'field340': 'field340_1',  // Equipment Nomenclature ✅
        'field343': 'field343_1',  // Equipment Certification ID ✅

        // Transmitter Antenna
        'field357': 'field357',    // Antenna Gain
        'field362': 'field362',    // Antenna Orientation
        'field363': 'field363',    // Antenna Polarization (V/H/C)
        'field373': 'field373',    // JSC Area Code (A-Z)

        // Receiver Location
        'field400': 'field400',    // State/Country (A-Z geographic codes)
        'field401': 'field401',    // Antenna Location
        'field403': 'field403',    // Antenna Coordinates ✅ (auto-filled)

        // Receiver Equipment (Dynamic entries)
        'field440': 'field440_1',  // Equipment Nomenclature ✅
        'field443': 'field443_1',  // Equipment Certification ID ✅

        // Receiver Antenna
        'field457': 'field457',    // Antenna Gain
        'field462': 'field462',    // Antenna Orientation
        'field463': 'field463',    // Antenna Polarization (V/H/C)
        'field473': 'field473',    // JSC Area Code (A/B/C/D)

        // Supplementary Details (Dynamic entries per MCEB Pub 7 Annex F & I)
        'field500': 'field500_1',  // IRAC Notes ✅ (C/E/L/P/S codes)
        'field501': 'field501_1',  // Notes/Comments ✅
        'field502': 'field502',    // Description of Requirement (required for CENTCOM)
        'field503': 'field503',    // Agency Free-text Comments
        'field511': 'field511',    // Major Function Identifier (Annex I)
        'field512': 'field512',    // Intermediate Function Identifier (Annex I)
        'field513': 'field513',    // Minor Function Identifier (new in 2005)
        'field520': 'field520',    // Supplementary Details

        // Other Assignment Identifiers
        'field716': 'field716',    // Usage Code
        'field801': 'field801',    // Coordination Data/Remarks
        'field803': 'field803',    // Requestor Data POC
        'field804': 'field804',    // Additional Assignment Data

        // Deprecated fields (no longer used by DoD per MCEB Pub 7)
        'field208': null,  // No longer required by Air Force
        'field407': null,  // No longer used by DoD
        'field470': null,  // No longer used by DoD
        'field471': null,  // No longer used by DoD
        'field472': null,  // No longer used by DoD
        'field903': null,  // No longer used by DoD

        // Fields that don't exist in SFAF standard
        'field101': null,  // Not in MCEB Pub 7 standard
        'field103': null,  // Additional serial numbers - not in form
        'field107': null,  // Date field - not in form
    };

    function setFieldValue(formFieldId, value) {
        if (!formFieldId || !value) return false;

        const field = document.getElementById(formFieldId);
        if (field) {
            field.value = value;
            field.dispatchEvent(new Event('change'));

            // // Trigger MCEB Pub 7 validation if field manager is available
            // if (window.sfafFieldManager) {
            //     window.sfafFieldManager.validateField(field);
            // }

            return true;
        }
        return false;
    }

    // Auto-populate coordinate fields from marker (field 303/403 per MCEB Pub 7)
    if (data.coordinates) {
        setFieldValue('field303', data.coordinates.compact);
        setFieldValue('field403', data.coordinates.compact);
    }

    // Populate SFAF fields using official MCEB Pub 7 mapping
    if (data.sfaf_fields) {
        let successCount = 0;
        let skippedCount = 0;
        let deprecatedCount = 0;
        let unknownCount = 0;

        Object.entries(data.sfaf_fields).forEach(([importedFieldId, value]) => {

            // Handle field500 variants (500/02, 500/03, etc.) per MCEB Pub 7 Annex F
            if (importedFieldId.startsWith('field500/')) {
                const parts = importedFieldId.split('/');
                if (parts.length === 2) {
                    const number = parseInt(parts[1]);
                    const targetFieldId = `field500_${number}`;

                    if (setFieldValue(targetFieldId, value)) {
                        successCount++;
                    }
                }
                return;
            }

            // Handle field103 variants (additional serial numbers per MCEB Pub 7)
            if (importedFieldId.startsWith('field103/')) {
                skippedCount++;
                return;
            }

            // Use official MCEB Pub 7 mapping
            const actualFieldId = sfafFieldMapping[importedFieldId];

            if (actualFieldId === null) {
                // Check if it's a deprecated field
                const deprecatedFields = ['field208', 'field407', 'field470', 'field471', 'field472', 'field903'];
                if (deprecatedFields.includes(importedFieldId)) {
                    deprecatedCount++;
                } else {
                    skippedCount++;
                }
            } else if (actualFieldId) {
                if (setFieldValue(actualFieldId, value)) {
                    successCount++;
                }
            } else {
                // Try the original field ID as fallback
                if (setFieldValue(importedFieldId, value)) {
                    successCount++;
                } else {
                    unknownCount++;
                }
            }
        });

        // Generate MCEB Pub 7 compliance summary
        console.log(`📊 MCEB Publication 7 Import Results:`);
        console.log(`  ✅ Successfully populated: ${successCount} fields`);
        console.log(`  ⚠️ Skipped (not in form): ${skippedCount} fields`);
        console.log(`  🔄 Deprecated (MCEB Pub 7): ${deprecatedCount} fields`);
        console.log(`  ❓ Unknown fields: ${unknownCount} fields`);
        console.log(`  📖 Reference: MCEB Publication 7, June 30, 2005`);

        // Show compliance notification
        if (successCount > 0) {
            showComplianceNotification(successCount, skippedCount + deprecatedCount + unknownCount);
        }
    }
}

// Show MCEB Pub 7 compliance notification
function showComplianceNotification(successCount, totalSkipped) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 500px;
        text-align: center;
    `;

    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">
            📖 MCEB Publication 7 Compliance
        </div>
        <div style="font-size: 0.9em; opacity: 0.95;">
            ${successCount} fields populated successfully<br>
            ${totalSkipped} fields skipped (deprecated/not applicable)<br>
            <strong>Standard: MCEB Pub 7, June 30, 2005</strong>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}



function setupAuthorizationRadius() {
    const field306 = document.getElementById('field306');
    if (!field306) return;

    // Remove existing event listeners to prevent duplicates
    const newField306 = field306.cloneNode(true);
    field306.parentNode.replaceChild(newField306, field306);

    // Add change listener to field 306
    newField306.addEventListener('input', async () => {
        const radiusValue = newField306.value.trim();

        if (radiusValue && window.currentSFAFMarker) {
            try {
                await createAuthorizationCircle(radiusValue);
            } catch (error) {
                console.error('Failed to create authorization circle:', error);
            }
        } else {
            removeAuthorizationCircle();
        }
    });
}

// if (!window.log) {
//     window.log = function (...args) {
//         console.log(...args);
//     };
// }

async function openPersistentSidebar() {
    const sidebar = document.getElementById('persistentSidebar');
    if (sidebar) {
        sidebar.classList.add('open');
        console.log('✅ Sidebar opened');
    } else {
        console.error('❌ persistentSidebar element not found');
    }
}

// Authorization circle management
let authorizationCircle = null;

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
        ).addTo(map);

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

function removeAuthorizationCircle() {
    if (authorizationCircle) {
        map.removeLayer(authorizationCircle);
        authorizationCircle = null;
    }
}

function setupCoordinateSync() {
    // This will be called when markers are dragged to update fields 303 and 403
    window.updateSidebarCoordinates = function (coordinates) {
        const field303 = document.getElementById('field303');
        const field403 = document.getElementById('field403');

        if (field303 && coordinates.compact) {
            field303.value = coordinates.compact;
        }
        if (field403 && coordinates.compact) {
            field403.value = coordinates.compact;
        }
    };
}

function wireUpActionButtons() {
    // Override your existing button handlers to use Go APIs
    const validateBtn = document.getElementById('validateSFAFBtn');
    const saveBtn = document.getElementById('saveSFAFBtn');
    const exportBtn = document.getElementById('exportSFAFBtn');
    const deleteBtn = document.getElementById('deleteSFAFBtn');

    if (validateBtn) {
        validateBtn.onclick = validateSFAFWithGo;
    }

    if (saveBtn) {
        saveBtn.onclick = saveSFAFWithGo;
    }

    if (exportBtn) {
        exportBtn.onclick = exportSFAFWithGo;
    }

    if (deleteBtn) {
        deleteBtn.onclick = deleteSFAFWithGo;
    }
}

// SFAF action functions that work with your existing form
async function validateSFAFWithGo() {
    const formData = collectSFAFFormData();

    try {
        const response = await fetch('/api/sfaf/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: formData })
        });

        const result = await response.json();

        if (result.success) {
            applySFAFValidationResults(result.validation);
            showSFAFStatusMessage(
                result.validation.is_valid ? '✅ Form validation passed!' : '❌ Form has validation errors',
                result.validation.is_valid ? 'success' : 'error'
            );
        }
    } catch (error) {
        console.error('Validation failed:', error);
        showSFAFStatusMessage('❌ Validation failed. Please try again.', 'error');
    }
}

async function saveSFAFWithGo() {
    if (!window.currentSFAFMarker) {
        showSFAFStatusMessage('❌ No marker selected', 'error');
        return;
    }

    const formData = collectSFAFFormData();

    try {
        const response = await fetch('/api/sfaf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                marker_id: window.currentSFAFMarker.id,
                fields: formData
            })
        });

        const result = await response.json();

        if (result.success) {
            showSFAFStatusMessage('✅ SFAF data saved successfully!', 'success');
        } else {
            showSFAFStatusMessage('❌ Failed to save: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Save failed:', error);
        showSFAFStatusMessage('❌ Save failed. Please try again.', 'error');
    }
}

async function exportSFAFWithGo() {
    if (!window.currentSFAFMarker) {
        showSFAFStatusMessage('❌ No marker selected', 'error');
        return;
    }

    const formData = collectSFAFFormData();

    const exportData = {
        marker: window.currentSFAFMarker,
        sfaf_fields: formData,
        exported_at: new Date().toISOString(),
        format: 'SFAF_JSON_v1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SFAF_${window.currentSFAFMarker.serial}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    showSFAFStatusMessage('📤 SFAF data exported successfully!', 'success');
}

async function deleteSFAFWithGo() {
    if (!window.currentSFAFMarker) {
        showSFAFStatusMessage('❌ No marker selected', 'error');
        return;
    }

    if (confirm(`Delete marker ${window.currentSFAFMarker.serial} and all associated SFAF data?\n\nThis action cannot be undone.`)) {
        try {
            const response = await fetch(`/api/markers/${window.currentSFAFMarker.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove marker from map
                const marker = markers.get(window.currentSFAFMarker.id);
                if (marker) {
                    map.removeLayer(marker);
                    markers.delete(window.currentSFAFMarker.id);
                }

                // Remove authorization circle
                removeAuthorizationCircle();

                // Close sidebar
                closePersistentSidebar();

                showSFAFStatusMessage('✅ Object deleted successfully!', 'success');

                // Clear current marker reference
                window.currentSFAFMarker = null;
            } else {
                showSFAFStatusMessage('❌ Failed to delete object', 'error');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            showSFAFStatusMessage('❌ Delete failed. Please try again.', 'error');
        }
    }
}

function collectSFAFFormData() {
    const formData = {};

    // Get the object tab container
    const objectTab = document.getElementById('tab-object');
    if (!objectTab) {
        console.warn('Object tab not found, collecting from entire document');
        // Fallback to collecting from entire document
        const allFields = document.querySelectorAll('input[id^="field"], select[id^="field"], textarea[id^="field"]');
        allFields.forEach(field => {
            if (field.value && field.value.trim() !== '') {
                formData[field.id] = field.value.trim();
            }
        });
        return formData;
    }

    // Collect from various field patterns in the object tab
    const patterns = [
        'input[id^="field"]',
        'select[id^="field"]',
        'textarea[id^="field"]',
        '[data-field]',
        'input[name^="field"]',
        'select[name^="field"]',
        'textarea[name^="field"]'
    ];

    patterns.forEach(pattern => {
        const fields = objectTab.querySelectorAll(pattern);
        fields.forEach(field => {
            let fieldId = field.id;

            // Handle data-field attributes
            if (field.dataset.field && !fieldId.startsWith('field')) {
                fieldId = 'field' + field.dataset.field;
            }

            // Handle name attributes
            if (!fieldId && field.name) {
                fieldId = field.name;
            }

            if (fieldId && field.value && field.value.trim() !== '') {
                formData[fieldId] = field.value.trim();
            }
        });
    });

    return formData;
}

function applySFAFValidationResults(validation) {
    // Clear previous validation styles
    const objectTab = document.getElementById('tab-object');
    const fieldsToCheck = objectTab ?
        objectTab.querySelectorAll('input, select, textarea') :
        document.querySelectorAll('input[id^="field"], select[id^="field"], textarea[id^="field"]');

    fieldsToCheck.forEach(field => {
        field.style.borderColor = '';
        field.classList.remove('validation-error', 'validation-success');

        // Remove any existing validation messages
        const existingMsg = field.parentNode?.querySelector('.validation-message');
        if (existingMsg) {
            existingMsg.remove();
        }
    });

    // Apply validation results
    if (validation.fields) {
        Object.entries(validation.fields).forEach(([fieldId, fieldData]) => {
            const field = findFieldByAnyMeans(fieldId);

            if (field) {
                const hasError = validation.errors && validation.errors[fieldId];
                const hasValue = fieldData.value && fieldData.value.trim() !== '';

                if (hasError) {
                    field.style.borderColor = '#f44336';
                    field.classList.add('validation-error');

                    // Add error message
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'validation-message';
                    errorMsg.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 2px;';
                    errorMsg.textContent = validation.errors[fieldId];
                    if (field.parentNode) {
                        field.parentNode.appendChild(errorMsg);
                    }

                } else if (hasValue) {
                    field.style.borderColor = '#4CAF50';
                    field.classList.add('validation-success');
                }
            }
        });
    }
}

function manageObjectTabVisibility(hasSelectedMarker = false) {
    const objectTab = document.getElementById('objectTab');
    const objectTabBtn = document.querySelector('[data-tab="object"]');

    console.log('🔍 Object tab element:', objectTab);
    console.log('🔍 Object tab button:', objectTabBtn);

    if (objectTab && objectTabBtn) {
        if (hasSelectedMarker) {
            objectTab.style.display = 'block';
            objectTabBtn.style.display = 'block';
            console.log('✅ Object tab shown');
        } else {
            objectTab.style.display = 'none';
            objectTabBtn.style.display = 'none';

            if (objectTabBtn.classList.contains('active')) {
                switchTab('overview');
            }
            console.log('✅ Object tab hidden');
        }
    } else {
        console.error('❌ Object tab elements not found');
    }
}


function findFieldByAnyMeans(fieldId) {
    // Try multiple strategies to find the field
    let field = document.getElementById(fieldId);

    if (!field) {
        const fieldNumber = fieldId.replace('field', '');
        field = document.querySelector(`[data-field="${fieldNumber}"]`);
    }

    if (!field) {
        field = document.querySelector(`[name="${fieldId}"]`);
    }

    if (!field) {
        // Try partial matches
        field = document.querySelector(`[id*="${fieldId}"]`);
    }

    return field;
}

// Add to Overview tab functionality
async function clearAllMarkers() {
    try {
        // Show confirmation dialog
        if (!confirm('Delete all markers and associated SFAF data?\n\nThis action cannot be undone.')) {
            return;
        }

        // Call backend bulk delete API
        const response = await fetch('/api/markers', {
            method: 'DELETE'
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Backend response:', result.message);

            // ===== COMPREHENSIVE FRONTEND STATE CLEANUP =====

            // 1. Clear markers Map (Source: map.txt pattern)
            if (window.markers) {
                window.markers.clear();
                console.log('✅ Markers Map cleared');
            }

            // 2. Clear drawnItems layer group (Source: map.txt pattern)
            if (window.drawnItems) {
                window.drawnItems.clearLayers();
                console.log('✅ DrawnItems layers cleared');
            }

            // 3. Remove ALL marker layers directly from map
            map.eachLayer(function (layer) {
                // Remove all marker instances (manual and imported)
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
            console.log('✅ All marker layers removed from map');

            // 4. Clear coordinate cache (Source: map.txt)
            if (window.coordinateCache) {
                window.coordinateCache.clear();
                console.log('✅ Coordinate cache cleared');
            }

            // 5. Clear current marker references
            window.currentSelectedMarker = null;
            if (window.currentSFAFMarker) {
                window.currentSFAFMarker = null;
            }
            console.log('✅ Current marker references cleared');

            // 6. Close sidebar if open (Source: map.txt)
            closePersistentSidebar();

            // 7. Force map redraw
            map.invalidateSize();

            // 8. Show success notification (Source: buttonFunctions.txt pattern)
            showNotification('✅ All markers cleared successfully', 'success');

            return true;

        } else {
            throw new Error(`HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('Failed to clear all markers:', error);
        showNotification('❌ Failed to clear markers', 'error');
        return false;
    }
}

function showSFAFStatusMessage(message, type) {
    // Remove any existing status messages
    const existing = document.querySelectorAll('.sfaf-status-message');
    existing.forEach(msg => msg.remove());

    // Create status message
    const statusDiv = document.createElement('div');
    statusDiv.className = 'sfaf-status-message';
    statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 470px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 2000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
    `;
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);

    setTimeout(() => statusDiv.remove(), 4000);
}

async function openSidebar(markerId) {
    try {
        console.log('🔍 Opening sidebar for marker:', markerId);

        // FIX: Use correct API endpoint
        const response = await fetch(`/api/sfaf/object-data/${markerId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📡 API Response:', data);

        if (data.success) {
            // CRITICAL: Open the sidebar FIRST
            console.log('🔧 Opening persistent sidebar...');
            openPersistentSidebar();

            // THEN show object tab
            console.log('🔧 Managing object tab visibility...');
            manageObjectTabVisibility(true);

            // THEN switch to object tab
            console.log('🔧 Switching to object tab...');
            switchTab('object');

            // FINALLY populate the form
            console.log('🔧 Populating SFAF form...');
            populateExistingSFAFForm(data);
        } else {
            console.error('API Error:', data.error);
            manageObjectTabVisibility(false);
        }
    } catch (error) {
        console.error('Failed to load SFAF data:', error);
        manageObjectTabVisibility(false);
    }
}


// Load existing markers when page loads
document.addEventListener('DOMContentLoaded', function () {
    loadExistingMarkers();
});

// Make functions globally available
window.openSidebar = openSidebar;
window.openPersistentSidebar = openPersistentSidebar;
window.closePersistentSidebar = closePersistentSidebar;
window.switchTab = switchTab;
window.clearAllMarkers = clearAllMarkers;