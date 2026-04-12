/**
 * SFAF Plotter - Main Map Application
 *
 * Coordinates between modules to provide interactive map functionality
 * with SFAF form integration and MC4EB Publication 7, Change 1 compliance
 */

// ==================== Base Map Configuration ====================

const baseMaps = {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }),
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
    'Esri Topo': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    }),
    'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    })
};

// ==================== Overlay Layers ====================
// Boundary overlays — toggled independently of base layer
// GeoJSON-based overlays — drawn client-side for reliable black borders
// and country label markers at any zoom level on any base layer.
const overlayMaps = {};  // populated below after map init

// ==================== Load User Settings ====================

// Get saved settings (SettingsManager is loaded before this script)
const userSettings = SettingsManager.getSettings();

// Determine initial map configuration from settings
const initialBaseLayer = baseMaps[userSettings.map.baseLayer] || baseMaps['OpenStreetMap'];
const initialCenter = [userSettings.map.defaultCenter.lat, userSettings.map.defaultCenter.lng];
const initialZoom = userSettings.map.defaultZoom;

console.log('🗺️ Loading map with settings:', {
    baseLayer: userSettings.map.baseLayer,
    region: userSettings.map.region,
    center: initialCenter,
    zoom: initialZoom
});

// ==================== Map Initialization ====================

const map = L.map('map', {
    center: initialCenter,
    zoom: initialZoom,
    layers: [initialBaseLayer]
});

// Create layer group for drawn features
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Make globally available for modules
window.map = map;
window.drawnItems = drawnItems;
window.baseMaps = baseMaps;

// Force Leaflet to recalculate tile layout after the DOM has fully settled.
setTimeout(() => { map.invalidateSize(); }, 100);

// ==================== Country Layers + Sidebar ====================

// ISO 3166-1 numeric → English country name
const COUNTRY_NAMES = {
    4:'Afghanistan',8:'Albania',12:'Algeria',24:'Angola',32:'Argentina',
    36:'Australia',40:'Austria',50:'Bangladesh',56:'Belgium',64:'Bhutan',
    68:'Bolivia',76:'Brazil',100:'Bulgaria',116:'Cambodia',120:'Cameroon',
    124:'Canada',152:'Chile',156:'China',170:'Colombia',178:'Republic of Congo',
    180:'DR Congo',188:'Costa Rica',191:'Croatia',192:'Cuba',196:'Cyprus',
    203:'Czech Republic',208:'Denmark',214:'Dominican Republic',218:'Ecuador',
    818:'Egypt',222:'El Salvador',231:'Ethiopia',246:'Finland',250:'France',
    266:'Gabon',276:'Germany',288:'Ghana',300:'Greece',320:'Guatemala',
    324:'Guinea',332:'Haiti',340:'Honduras',348:'Hungary',356:'India',
    360:'Indonesia',364:'Iran',368:'Iraq',372:'Ireland',376:'Israel',
    380:'Italy',388:'Jamaica',392:'Japan',400:'Jordan',398:'Kazakhstan',
    404:'Kenya',408:'North Korea',410:'South Korea',414:'Kuwait',418:'Laos',
    422:'Lebanon',430:'Liberia',434:'Libya',440:'Lithuania',442:'Luxembourg',
    454:'Malawi',458:'Malaysia',466:'Mali',484:'Mexico',496:'Mongolia',
    504:'Morocco',508:'Mozambique',516:'Namibia',524:'Nepal',528:'Netherlands',
    554:'New Zealand',562:'Niger',566:'Nigeria',578:'Norway',512:'Oman',
    586:'Pakistan',591:'Panama',604:'Peru',608:'Philippines',616:'Poland',
    620:'Portugal',634:'Qatar',642:'Romania',643:'Russia',682:'Saudi Arabia',
    686:'Senegal',694:'Sierra Leone',703:'Slovakia',705:'Slovenia',
    706:'Somalia',710:'South Africa',728:'South Sudan',724:'Spain',
    144:'Sri Lanka',729:'Sudan',752:'Sweden',756:'Switzerland',
    760:'Syria',158:'Taiwan',762:'Tajikistan',764:'Thailand',
    780:'Trinidad and Tobago',788:'Tunisia',792:'Turkey',800:'Uganda',
    804:'Ukraine',784:'UAE',826:'United Kingdom',840:'United States',
    858:'Uruguay',860:'Uzbekistan',704:'Vietnam',887:'Yemen',
    894:'Zambia',716:'Zimbabwe'
};

function getCountryName(numericId) {
    return COUNTRY_NAMES[+numericId] || ('Country ' + numericId);
}

(function loadCountryLayers() {
    const borderLayer = L.layerGroup();
    overlayMaps['Country Borders'] = borderLayer;
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);
    borderLayer.addTo(map);

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(topo => {
            if (typeof topojson === 'undefined') return;

            // Black border mesh (visual)
            const mesh = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
            L.geoJSON(mesh, {
                style: { color:'#000', weight:1.5, opacity:0.85, fill:false }
            }).addTo(borderLayer);

            // Transparent click-target polygons
            const features = topojson.feature(topo, topo.objects.countries);
            L.geoJSON(features, {
                style: { fillOpacity:0, color:'transparent', weight:0 },
                onEachFeature(feat, lyr) {
                    lyr.on('click', e => {
                        L.DomEvent.stopPropagation(e);
                        openCountrySidebar(getCountryName(feat.id));
                    });
                    lyr.on('mouseover', function() {
                        this.setStyle({ fillColor:'#667eea', fillOpacity:0.12 });
                    });
                    lyr.on('mouseout', function() {
                        this.setStyle({ fillOpacity:0 });
                    });
                }
            }).addTo(map);
        })
        .catch(e => console.warn('Country borders unavailable:', e));
})();

// ==================== Country Capability Sidebar ====================

let _csCountry = null;
let _csTab     = 'civilian';
let _csAdmin   = false;

// Detect admin role once on load
(async function detectAdmin() {
    try {
        const token = localStorage.getItem('sfaf_token') || '';
        const res = await fetch('/api/auth/session',
            { headers: token ? { Authorization: token } : {} });
        if (res.ok) {
            const d = await res.json();
            _csAdmin = d.valid && d.user && d.user.role === 'admin';
        }
    } catch(_) {}
})();

function openCountrySidebar(countryName) {
    _csCountry = countryName;
    _csTab = 'civilian';
    const sb = document.getElementById('countrySidebar');
    if (!sb) return;
    document.getElementById('csSidebarTitle').textContent = countryName;
    document.querySelectorAll('.cs-tab-btn').forEach(b =>
        b.classList.toggle('cs-tab-active', b.dataset.tab === 'civilian'));
    sb.classList.add('cs-open');
    csLoadTab('civilian');
}

function closeCountrySidebar() {
    document.getElementById('countrySidebar').classList.remove('cs-open');
}

function csSelectTab(tab) {
    _csTab = tab;
    document.querySelectorAll('.cs-tab-btn').forEach(b =>
        b.classList.toggle('cs-tab-active', b.dataset.tab === tab));
    csLoadTab(tab);
}

async function csLoadTab(tab) {
    const body = document.getElementById('csSidebarBody');
    if (!body) return;
    body.innerHTML = '<div class="cs-loading"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
        const token = localStorage.getItem('sfaf_token') || '';
        const res = await fetch(
            `/api/country-capabilities?country=${encodeURIComponent(_csCountry)}`,
            { headers: token ? { Authorization: token } : {} });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const items = (data.capabilities || []).filter(c => c.category === tab);
        csRenderTab(items, tab, body);
    } catch(e) {
        body.innerHTML = `<p class="cs-error"><i class="fas fa-exclamation-triangle"></i> ${e.message}</p>`;
    }
}

function csRenderTab(items, tab, container) {
    let html = '';

    // ── Existing entries ──────────────────────────────────────────────────
    if (!items.length) {
        html += `<p class="cs-empty">No ${tab} entries for ${_csCountry}.</p>`;
    } else {
        items.forEach(item => {
            html += `<div class="cs-entry" data-id="${item.id}">
                <div class="cs-row"><span class="cs-lbl">Equipment</span><span class="cs-val">${item.equipment||'—'}</span></div>
                <div class="cs-row"><span class="cs-lbl">Usage</span><span class="cs-val">${item.usage||'—'}</span></div>
                <div class="cs-row"><span class="cs-lbl">Freq Range</span><span class="cs-val">${item.freq_range||'—'}</span></div>
                <div class="cs-row"><span class="cs-lbl">Wattage</span><span class="cs-val">${item.wattage||'—'}</span></div>
                ${_csAdmin ? `<button class="cs-del-btn" onclick="csDelete('${item.id}')"><i class="fas fa-trash-alt"></i></button>` : ''}
            </div>`;
        });
    }

    // ── Add Entry form — always visible at the bottom of each tab ────────
    html += `
    <div class="cs-add-section">
        <div class="cs-add-header"><i class="fas fa-plus-circle"></i> Add Entry</div>
        <div class="cs-form cs-form-inline">
            <input class="cs-input" id="csEq"   placeholder="Equipment"       />
            <input class="cs-input" id="csUse"  placeholder="Usage"           />
            <input class="cs-input" id="csFreq" placeholder="Frequency Range" />
            <input class="cs-input" id="csWat"  placeholder="Wattage"         />
            <button class="cs-save-btn" onclick="csSave('${tab}')">
                <i class="fas fa-check"></i> Save Entry
            </button>
        </div>
    </div>`;

    container.innerHTML = html;
}

async function csSave(tab) {
    const token = localStorage.getItem('sfaf_token') || '';
    try {
        const res = await fetch('/api/country-capabilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                       ...(token ? { Authorization: token } : {}) },
            body: JSON.stringify({
                country:    _csCountry, category: tab,
                equipment:  document.getElementById('csEq').value,
                usage:      document.getElementById('csUse').value,
                freq_range: document.getElementById('csFreq').value,
                wattage:    document.getElementById('csWat').value
            })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        csLoadTab(tab);
    } catch(e) { alert('Save failed: ' + e.message); }
}

async function csDelete(id) {
    if (!confirm('Delete this entry?')) return;
    const token = localStorage.getItem('sfaf_token') || '';
    try {
        const res = await fetch(`/api/country-capabilities/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: token } : {}
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        csLoadTab(_csTab);
    } catch(e) { alert('Delete failed: ' + e.message); }
}

map.on('click', () => {
    if (document.getElementById('countrySidebar')?.classList.contains('cs-open'))
        closeCountrySidebar();
});

// ==================== Marker Icons ====================

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

// Set marker icons in MarkerManager
MarkerManager.setMarkerIcons(manualIcon, importedIcon);

// ==================== Cursor Coordinate Tooltip ====================

const cursorTooltip = L.tooltip({
    permanent: false,
    direction: 'right',
    offset: L.point(0, -45),
    className: 'cursorTooltip'
});

// Show tooltip on map mousemove
map.on('mousemove', async (e) => {
    if (e.originalEvent.target.classList.contains('leaflet-container')) {
        try {
            const lat = e.latlng.lat.toFixed(4);
            const lng = e.latlng.lng.toFixed(4);

            const coords = await APIClient.convertCoordinates(lat, lng);

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

// Hide tooltip when mouse leaves map
map.getContainer().addEventListener('mouseleave', () => {
    if (cursorTooltip._map) {
        map.removeLayer(cursorTooltip);
    }
});

// ==================== Map Click Handler ====================

// Clear selection when clicking empty map
map.on('click', function (e) {
    if (!e.originalEvent.target.closest('.leaflet-marker-icon')) {
        UIHelpers.manageObjectTabVisibility(false);
        window.currentSFAFMarker = null;
        MarkerManager.setCurrentSelectedMarker(null);
    }
});

// ==================== Drawing Controls ====================

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

// ==================== Drawing Event Handlers ====================

// Handle creation of new features
map.on(L.Draw.Event.CREATED, async function (event) {
    const { layerType, layer } = event;

    try {
        let response;

        switch (layerType) {
            case 'marker':
                const latLng = layer.getLatLng();
                response = await APIClient.createMarker({
                    lat: parseFloat(latLng.lat.toFixed(4)),
                    lng: parseFloat(latLng.lng.toFixed(4)),
                    type: 'manual'
                });

                if (response.marker) {
                    map.removeLayer(layer);
                    MarkerManager.createMarkerOnMap(response.marker);
                }
                break;

            case 'circle':
                const center = layer.getLatLng();

                // Get coordinate formats for display
                const coords = await APIClient.convertCoordinates(center.lat, center.lng);

                // Prompt user for radius and unit
                const userInput = await CircleManager.promptCircleRadius(coords);

                if (!userInput) {
                    map.removeLayer(layer);
                    break;
                }

                response = await APIClient.createCircle({
                    lat: center.lat,
                    lng: center.lng,
                    radius: userInput.radius,
                    unit: userInput.unit
                });

                if (response.geometry) {
                    map.removeLayer(layer);

                    console.log('🔵 Circle geometry created:', response.geometry);

                    const actualCircle = await CircleManager.createCircle(
                        { lat: center.lat, lng: center.lng },
                        userInput.radius,
                        userInput.unit,
                        {
                            id: response.geometry.id,
                            marker_id: response.geometry.marker_id,
                            serial: response.geometry.serial || 'N/A',
                            color: response.geometry.color || '#4ECDC4'
                        }
                    );

                    // Add tooltip to circle
                    TooltipManager.updateCircleTooltip(actualCircle, coords);

                    // Create center marker FIRST (backend creates it automatically)
                    if (response.geometry.marker_id) {
                        const markerData = {
                            id: response.geometry.marker_id,
                            lat: center.lat,
                            lng: center.lng,
                            type: 'circle-center',
                            serial: response.geometry.serial,
                            is_draggable: true
                        };
                        const centerMarker = MarkerManager.createMarkerOnMap(markerData);

                        // Link circle and marker
                        CircleManager.linkCircleToMarker(actualCircle, centerMarker);

                        // THEN set up click handler (after centerMarker is available)
                        actualCircle.on('click', async () => {
                            console.log('🔵 Circle clicked, opening SFAF for marker:', actualCircle.geometryData.marker_id);
                            MarkerManager.setCurrentSelectedMarker(centerMarker);
                            UIHelpers.manageObjectTabVisibility(true);
                            await SFAFIntegration.openSidebar(actualCircle.geometryData.marker_id);
                        });
                    } else {
                        console.error('❌ No marker_id in geometry response:', response.geometry);
                    }
                }
                break;

            case 'polygon':
                const points = layer.getLatLngs()[0].map(point => ({
                    lat: point.lat,
                    lng: point.lng
                }));

                response = await APIClient.createPolygon({ points: points });

                if (response.geometry) {
                    // Store geometry metadata on polygon layer
                    layer.geometryId = response.geometry.id;
                    layer.geometryData = {
                        id: response.geometry.id,
                        marker_id: response.geometry.marker_id,
                        type: 'polygon',
                        points: points,
                        serial: response.geometry.serial || 'N/A'
                    };

                    drawnItems.addLayer(layer);

                    // Create center marker and link to polygon
                    if (response.geometry.marker_id) {
                        const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
                        const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

                        const markerData = {
                            id: response.geometry.marker_id,
                            lat: centerLat,
                            lng: centerLng,
                            type: 'polygon-center',
                            serial: response.geometry.serial,
                            is_draggable: true
                        };
                        const centerMarker = MarkerManager.createMarkerOnMap(markerData);

                        // Link polygon and marker
                        layer.centerMarker = centerMarker;
                        centerMarker.linkedPolygon = layer;

                        // Add tooltip to polygon
                        const centerCoords = await APIClient.convertCoordinates(centerLat, centerLng);
                        TooltipManager.updatePolygonTooltip(layer, centerCoords);

                        // Make polygon clickable to open SFAF
                        layer.on('click', async () => {
                            console.log('🔷 Polygon clicked, opening SFAF for marker:', layer.geometryData.marker_id);
                            MarkerManager.setCurrentSelectedMarker(centerMarker);
                            UIHelpers.manageObjectTabVisibility(true);
                            await SFAFIntegration.openSidebar(layer.geometryData.marker_id);
                        });
                    }
                }
                break;

            case 'rectangle':
                const bounds = layer.getBounds();
                const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;
                const centerLng = (bounds.getEast() + bounds.getWest()) / 2;

                response = await APIClient.createRectangle({
                    south_west: {
                        lat: bounds.getSouth(),
                        lng: bounds.getWest()
                    },
                    north_east: {
                        lat: bounds.getNorth(),
                        lng: bounds.getEast()
                    }
                });

                if (response.geometry) {
                    // Store geometry metadata on rectangle layer
                    layer.geometryId = response.geometry.id;
                    layer.geometryData = {
                        id: response.geometry.id,
                        marker_id: response.geometry.marker_id,
                        type: 'rectangle',
                        bounds: {
                            south: bounds.getSouth(),
                            north: bounds.getNorth(),
                            west: bounds.getWest(),
                            east: bounds.getEast()
                        },
                        serial: response.geometry.serial || 'N/A'
                    };

                    drawnItems.addLayer(layer);

                    // Create center marker and link to rectangle
                    if (response.geometry.marker_id) {
                        const markerData = {
                            id: response.geometry.marker_id,
                            lat: centerLat,
                            lng: centerLng,
                            type: 'rectangle-center',
                            serial: response.geometry.serial,
                            is_draggable: true
                        };
                        const centerMarker = MarkerManager.createMarkerOnMap(markerData);

                        // Link rectangle and marker
                        layer.centerMarker = centerMarker;
                        centerMarker.linkedRectangle = layer;

                        // Add tooltip to rectangle
                        const centerCoords = await APIClient.convertCoordinates(centerLat, centerLng);
                        TooltipManager.updateRectangleTooltip(layer, centerCoords);

                        // Make rectangle clickable to open SFAF
                        layer.on('click', async () => {
                            console.log('🟦 Rectangle clicked, opening SFAF for marker:', layer.geometryData.marker_id);
                            MarkerManager.setCurrentSelectedMarker(centerMarker);
                            UIHelpers.manageObjectTabVisibility(true);
                            await SFAFIntegration.openSidebar(layer.geometryData.marker_id);
                        });
                    }
                }
                break;
        }
    } catch (error) {
        console.error(`Failed to create ${layerType}:`, error);
        drawnItems.addLayer(layer);
    }
});

// Handle editing of existing features
map.on(L.Draw.Event.EDITED, async function (event) {
    const layers = event.layers;

    layers.eachLayer(async function (layer) {
        // Handle circle edits
        if (layer instanceof L.Circle && layer.geometryData) {
            const newCenter = layer.getLatLng();
            const newRadius = layer.getRadius();

            // Calculate radius in the original unit
            const radiusKm = newRadius / 1000;
            const radiusNm = radiusKm * 0.539957;
            const originalRadius = layer.geometryData.unit === 'nm' ? radiusNm : radiusKm;

            // Update geometry data
            layer.geometryData.center = { lat: newCenter.lat, lng: newCenter.lng };
            layer.geometryData.radius = originalRadius;

            // Update center marker if it exists
            if (layer.centerMarker) {
                layer.centerMarker.setLatLng(newCenter);

                // Update marker in backend
                if (layer.geometryData.marker_id) {
                    try {
                        await APIClient.updateMarker(layer.geometryData.marker_id, {
                            lat: parseFloat(newCenter.lat.toFixed(4)),
                            lng: parseFloat(newCenter.lng.toFixed(4))
                        });
                        console.log('✅ Circle center marker updated');
                    } catch (error) {
                        console.error('❌ Failed to update center marker:', error);
                    }
                }

                // Update tooltip
                TooltipManager.updateMarkerTooltip(layer.centerMarker);
            }

            // Update tooltip with new coordinates
            TooltipManager.updateCircleTooltip(layer);

            // Update geometry in backend
            try {
                await APIClient.updateCircle(layer.geometryId, {
                    lat: newCenter.lat,
                    lng: newCenter.lng,
                    radius: originalRadius,
                    unit: layer.geometryData.unit
                });
                console.log(`✅ Circle updated - Radius: ${originalRadius.toFixed(2)} ${layer.geometryData.unit}`);
            } catch (error) {
                console.error('❌ Failed to update circle:', error);
            }
        }

        // Handle polygon edits
        if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle) && layer.geometryData) {
            const newPoints = layer.getLatLngs()[0].map(point => ({
                lat: point.lat,
                lng: point.lng
            }));

            layer.geometryData.points = newPoints;

            try {
                await APIClient.updatePolygon(layer.geometryId, { points: newPoints });
                console.log('✅ Polygon updated');
            } catch (error) {
                console.error('❌ Failed to update polygon:', error);
            }
        }

        // Handle rectangle edits
        if (layer instanceof L.Rectangle && layer.geometryData) {
            const bounds = layer.getBounds();

            try {
                await APIClient.updateRectangle(layer.geometryId, {
                    south_west: {
                        lat: bounds.getSouth(),
                        lng: bounds.getWest()
                    },
                    north_east: {
                        lat: bounds.getNorth(),
                        lng: bounds.getEast()
                    }
                });
                console.log('✅ Rectangle updated');
            } catch (error) {
                console.error('❌ Failed to update rectangle:', error);
            }
        }
    });
});

// ==================== Selected Records Display ====================

/**
 * Display selected records from Database Viewer with Field 306/530 visualizations
 */
async function displaySelectedRecords(markerIds) {
    if (!markerIds || markerIds.length === 0) return;

    console.log(`📍 Loading ${markerIds.length} selected records...`);

    const bounds = L.latLngBounds();
    let displayedCount = 0;

    for (const markerId of markerIds) {
        try {
            // Fetch marker data
            const markerResponse = await fetch(`/api/markers/${markerId}`);
            if (!markerResponse.ok) {
                console.warn(`⚠️ Could not fetch marker ${markerId}`);
                continue;
            }
            const markerData = await markerResponse.json();

            // Get marker from MarkerManager
            let marker = MarkerManager.getMarkerById(markerId);

            if (marker) {
                // Highlight the marker
                marker.setZIndexOffset(1000);
                bounds.extend(marker.getLatLng());
                displayedCount++;

                // Fetch SFAF data for Field 306 and 530
                try {
                    const sfafResponse = await fetch(`/api/sfaf/marker/${markerId}`);
                    if (sfafResponse.ok) {
                        const sfafData = await sfafResponse.json();

                        // Display Field 306 (Authorization Radius) if present
                        if (sfafData.marker?.sfafFields?.field306 && typeof AuthorizationRadiusManager !== 'undefined') {
                            const field306Value = sfafData.marker.sfafFields.field306;
                            console.log(`📐 Creating Field 306 radius for marker ${markerId}: ${field306Value}`);

                            // Show the specific authorization radius for this marker
                            await AuthorizationRadiusManager.createAuthorizationCircle(
                                marker,
                                field306Value,
                                sfafData.marker.serial
                            );
                            AuthorizationRadiusManager.showAuthorizationRadii([markerId]);
                        }

                        // Display Field 530 (Polygon) if present
                        if (sfafData.marker?.sfafFields?.field530 && typeof field530Manager !== 'undefined') {
                            console.log(`📐 Loading Field 530 polygon for marker ${markerId}`);

                            const polygonData = await field530Manager.fetchPolygonByMarker(markerId);
                            if (polygonData) {
                                field530Manager.displayPolygon(polygonData);
                                // Extend bounds to include polygon
                                const polygon = field530Manager.polygons.get(markerId);
                                if (polygon) {
                                    bounds.extend(polygon.getBounds());
                                }
                            }
                        }
                    }
                } catch (sfafError) {
                    console.warn(`⚠️ Could not fetch SFAF data for marker ${markerId}:`, sfafError);
                }
            }
        } catch (error) {
            console.error(`❌ Error displaying record ${markerId}:`, error);
        }
    }

    // Zoom map to fit all selected markers and their visualizations
    if (displayedCount > 0 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        console.log(`✅ Displayed ${displayedCount} records with Field 306/530 visualizations`);

        // Show notification
        UIHelpers.showNotification(
            `Displaying ${displayedCount} selected record${displayedCount !== 1 ? 's' : ''} with Field 306/530 visualizations`,
            'success'
        );
    } else {
        UIHelpers.showNotification('No records could be displayed on the map', 'warning');
    }
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🗺️ Initializing SFAF Plotter...');

    // Load existing markers from backend
    await MarkerManager.loadExistingMarkers();
    console.log('✅ Markers loaded');

    // Load existing geometries from backend
    await CircleManager.loadExistingGeometries();
    console.log('✅ Geometries loaded');

    // Wire up SFAF action buttons
    SFAFIntegration.wireUpActionButtons();
    console.log('✅ SFAF buttons configured');

    // Setup authorization radius integration
    SFAFIntegration.setupAuthorizationRadius();
    console.log('✅ Authorization radius integration enabled');

    // Initialize Authorization Radius Manager
    if (typeof AuthorizationRadiusManager !== 'undefined') {
        AuthorizationRadiusManager.init(map);
        // Load all authorization radius circles from SFAF records with Field 306
        await AuthorizationRadiusManager.loadAllAuthorizationCircles();
        console.log('✅ Authorization Radius Manager initialized');
    }

    // Check for selected records from Database Viewer
    const selectedRecordsJSON = sessionStorage.getItem('selectedRecordsForMap');
    if (selectedRecordsJSON) {
        try {
            const selectedIds = JSON.parse(selectedRecordsJSON);
            console.log(`📍 Displaying ${selectedIds.length} selected records on map...`);

            // Clear session storage
            sessionStorage.removeItem('selectedRecordsForMap');

            // Display selected records with Field 306/530 visualizations
            await displaySelectedRecords(selectedIds);
        } catch (error) {
            console.error('❌ Error displaying selected records:', error);
        }
    }

    // Setup close button for persistent sidebar
    const closeBtn = document.querySelector('.close-persistent-sidebar');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            UIHelpers.closePersistentSidebar();
        });
    }

    // Setup clear all markers button
    const clearAllBtn = document.getElementById('clearAllMarkersBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            await MarkerManager.clearAllMarkers();
        });
    }

    console.log('✅ SFAF Plotter initialized successfully');
});
