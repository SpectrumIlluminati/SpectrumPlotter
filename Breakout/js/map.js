// map.js
import { convertToDMS, decimalToCompactDMS } from './utils.js';  // import the utility function

const baseMaps = {
    "CARTO Light (English)": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }),
    "CARTO Dark (English)": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }),
    "Esri Streets (English)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri — Source: Esri, HERE, Garmin, FAO, NOAA, USGS',
        maxZoom: 19
    }),
    "Esri Satellite (Imagery)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
    })
};

export const map = L.map('map', {
    center: [30.43, -86.695],
    zoom: 13,
    layers: [baseMaps["Esri Satellite (Imagery)"]]
});

// Add Layer Control
L.control.layers(baseMaps).addTo(map);

// Create layer group for drawn features, aka Show Toolbar
export const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// --- Cursor Tooltip ---
export const cursorTooltip = L.tooltip({
    permanent: false,
    direction: 'right',
    offset: L.point(0, -45),
    className: 'cursorTooltip'
});


// Show tooltip only on map mousemove (excluding features)
map.on('mousemove', (e) => {
    // If the event target is the map container (not a marker or other layer)
    if (e.originalEvent.target.classList.contains('leaflet-container')) {
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);
        const latDMS = convertToDMS(e.latlng.lat);
        const lngDMS = convertToDMS(e.latlng.lng);

        cursorTooltip
            .setLatLng(e.latlng)
            .setContent(`<b>Cursor</b><br>DecDeg: ${lat}, ${lng}<br>DMS: ${latDMS}, ${lngDMS}`);

        if (!cursorTooltip._map) {
            cursorTooltip.addTo(map);
        }
    } else {
        // If hovering a feature or control, remove cursorTooltip
        if (cursorTooltip._map) {
            map.removeLayer(cursorTooltip);
        }
    }
});

// Also hide tooltip if mouse leaves the map container
map.getContainer().addEventListener('mouseleave', () => {
    if (cursorTooltip._map) {
        map.removeLayer(cursorTooltip);
    }
});