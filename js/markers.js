// markers.js - Complete file with circle serial support
import { persistentSidebar } from './persistentSidebar.js';
import { map } from './map.js';
import { convertToDMS, generateSerial } from './utils.js';

export const manualMarkers = [];

export const manualIcon = L.icon({
    iconUrl: './images/marker-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
});

// Keep track of the marker currently being edited in the sidebar
let currentEditingMarker = null;

export function createManualMarker(lat, lng, options = {}) {
    const serial = options.serial || generateSerial();
    const markerData = {
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        frequency: options.frequency || '',
        notes: options.notes || '',
        serial,
        type: options.type || 'manual'
    };

    const marker = L.marker([lat, lng], {
        icon: manualIcon,
        draggable: options.isDraggable !== false
    }).addTo(map);

    marker.markerData = markerData;

    // Add geometry properties if provided
    if (options.circleProperties) {
        marker.markerData.circleProperties = options.circleProperties;
    }
    if (options.polygonProperties) {
        marker.markerData.polygonProperties = options.polygonProperties;
    }
    if (options.rectangleProperties) {
        marker.markerData.rectangleProperties = options.rectangleProperties;
    }

    // Conditional tooltip based on geometry type
    if (options.circleProperties) {
        // Circle center marker - NO tooltip (circle itself has tooltip)
        // Don't create any tooltip for circle center markers
    } else if (options.polygonProperties) {
        // Polygon marker - geometry-specific tooltip
        updatePolygonTooltip(marker);
    } else if (options.rectangleProperties) {
        // Rectangle marker - geometry-specific tooltip  
        updateRectangleTooltip(marker);
    } else {
        // Regular manual marker - standard tooltip
        updateTooltip(marker);
    }

    // Drag handler
    marker.on('drag', (e) => {
        const pos = e.target.getLatLng();
        marker.markerData.lat = pos.lat.toFixed(4);
        marker.markerData.lng = pos.lng.toFixed(4);

        // Update appropriate tooltip type
        if (options.circleProperties) {
            // Update circle position and its tooltip
            options.circleProperties.layer.setLatLng(pos);
            updateCircleTooltip(options.circleProperties.layer, marker); // Pass marker for serial
        } else if (options.polygonProperties) {
            updatePolygonTooltip(marker);
        } else if (options.rectangleProperties) {
            updateRectangleTooltip(marker);
        } else {
            updateTooltip(marker);
        }
    });

    // Click handler - same for all types (opens sidebar)
    marker.on('click', () => {
        currentEditingMarker = marker;
        if (persistentSidebar && persistentSidebar.showObjectTab) {
            persistentSidebar.showObjectTab(marker.markerData);
        }
    });

    manualMarkers.push(marker);
    return { marker, markerData };
}

// Standard marker tooltip
function updateTooltip(marker) {
    marker.unbindTooltip();
    marker.bindTooltip(
        `<b>Manual Marker</b><br>
         DecDeg: ${marker.markerData.lat}, ${marker.markerData.lng}<br>
         DMS: ${convertToDMS(parseFloat(marker.markerData.lat), false)}, ${convertToDMS(parseFloat(marker.markerData.lng), true)}<br>
         Serial: ${marker.markerData.serial}<br>
         Freq: ${marker.markerData.frequency}<br>
         Notes: ${marker.markerData.notes || '(none)'}`,
        { permanent: true, direction: 'top', offset: L.point(0, -15) }
    ).openTooltip();
}

// Polygon-specific tooltip
function updatePolygonTooltip(marker) {
    const props = marker.markerData.polygonProperties;
    marker.unbindTooltip();
    marker.bindTooltip(
        `<b>Polygon Center</b><br>
         DecDeg: ${marker.markerData.lat}, ${marker.markerData.lng}<br>
         DMS: ${convertToDMS(parseFloat(marker.markerData.lat), false)}, ${convertToDMS(parseFloat(marker.markerData.lng), true)}<br>
         Vertices: ${props?.vertices || 'N/A'}<br>
         Area: ${props?.area || 'N/A'} sq mi<br>
         Serial: ${marker.markerData.serial}`,
        { permanent: true, direction: 'top', offset: L.point(0, -15) }
    ).openTooltip();
}

// Rectangle-specific tooltip
function updateRectangleTooltip(marker) {
    const props = marker.markerData.rectangleProperties;
    marker.unbindTooltip();
    marker.bindTooltip(
        `<b>Rectangle Center</b><br>
         DecDeg: ${marker.markerData.lat}, ${marker.markerData.lng}<br>
         DMS: ${convertToDMS(parseFloat(marker.markerData.lat), false)}, ${convertToDMS(parseFloat(marker.markerData.lng), true)}<br>
         Area: ${props?.area || 'N/A'} sq mi<br>
         Serial: ${marker.markerData.serial}`,
        { permanent: true, direction: 'top', offset: L.point(0, -15) }
    ).openTooltip();
}

// Circle tooltip update function (for the circle itself, not marker)
function updateCircleTooltip(circleLayer, centerMarker = null) {
    // Safety check
    if (!circleLayer || typeof circleLayer.getLatLng !== 'function') {
        console.error('Invalid circle layer passed to updateCircleTooltip');
        return;
    }

    const center = circleLayer.getLatLng();
    const radius = circleLayer.getRadius();

    if (!center || typeof radius !== 'number') {
        console.error('Circle layer missing required properties');
        return;
    }

    const area_m2 = Math.PI * Math.pow(radius, 2);
    const area_sqmi = (area_m2 / 2.59e6).toFixed(2);
    const radius_km = (radius / 1000).toFixed(2);
    const radius_nm = (radius / 1852).toFixed(2);
    const latDMS = convertToDMS(center.lat, false);
    const lngDMS = convertToDMS(center.lng, true);

    // Include serial if marker is provided
    const serialText = centerMarker?.markerData?.serial ? `<br>Serial: ${centerMarker.markerData.serial}` : '';

    circleLayer.bindTooltip(
        `<b>Circle</b><br>
         Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}<br>
         DMS: ${latDMS}${lngDMS}${serialText}<br>
         Radius: ${radius_km} km / ${radius_nm} nm<br>
         Area: ${area_sqmi} sq mi`,
        { permanent: true, direction: 'top', offset: L.point(0, -38) }
    ).openTooltip();
}

// Sidebar functions
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.right = '0';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.right = '-300px';
    }
    currentEditingMarker = null;
}

// Attach hover handlers for geometry
function attachHoverHandlers(layer) {
    layer.on('mouseover', function () {
        layer.setStyle({
            weight: 4,
            opacity: 0.8
        });
    });

    layer.on('mouseout', function () {
        layer.setStyle({
            weight: 2,
            opacity: 0.6
        });
    });
}

// Export functions
export {
    updateCircleTooltip,
    currentEditingMarker,
    openSidebar,
    closeSidebar,
    attachHoverHandlers
};