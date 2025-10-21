// geometry.js
import { map, drawnItems } from './map.js';
import { convertToDMS } from './utils.js';
import { getRandomColor } from './utilAI.js';
import { createManualMarker, updateCircleTooltip, attachHoverHandlers } from './markers.js';

const circleCenters = {};
const circleData = new Map(); // Store circle metadata

// === CIRCLE HANDLER ===
function handleCircleCreation(layer) {
    const dialog = document.getElementById("circleDialog");
    if (!dialog) {
        console.error('Circle dialog not found');
        return;
    }

    dialog.style.display = "block";
    const circleId = L.stamp(layer);
    let centerMarker = null; // Store reference for use in nested functions

    function updateCircleTooltipLocal() {
        if (centerMarker) {
            updateCircleTooltip(layer, centerMarker);
        }

        // Update stored circle data
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const radius_km = (radius / 1000).toFixed(2);
        const radius_nm = (radius / 1852).toFixed(2);
        const area_m2 = Math.PI * Math.pow(radius, 2);
        const area_sqmi = (area_m2 / 2.59e6).toFixed(2);

        circleData.set(circleId, {
            center: center,
            radius: radius,
            radiusKm: radius_km,
            radiusNm: radius_nm,
            area: area_sqmi
        });
    }

    function confirmRadius() {
        const radiusInput = document.getElementById("circleRadius");
        const unitRadios = document.querySelectorAll("input[name='circleUnit']");

        if (!radiusInput || !unitRadios.length) {
            console.error('Circle dialog elements not found');
            return;
        }

        const radiusValue = parseFloat(radiusInput.value) || 1;
        const selectedUnit = document.querySelector("input[name='circleUnit']:checked");
        const unit = selectedUnit ? selectedUnit.value : 'km';

        // Convert to meters
        const radiusMeters = unit === "km" ? radiusValue * 1000 : radiusValue * 1852;

        // Set circle properties FIRST
        layer.setRadius(radiusMeters);
        const color = getRandomColor();
        layer.setStyle({
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2
        });

        // Add to map BEFORE creating marker
        drawnItems.addLayer(layer);

        // Create center marker with circle properties
        const centerLatLng = layer.getLatLng();

        const markerData = createManualMarker(centerLatLng.lat, centerLatLng.lng, {
            type: 'circle-center',
            circleId: circleId,
            isDraggable: true,
            circleProperties: {
                radius: radiusValue,
                unit: unit,
                color: color,
                layer: layer
            }
        });

        centerMarker = markerData.marker; // Store reference
        circleCenters[circleId] = centerMarker;

        // NOW update the circle's tooltip with marker reference
        updateCircleTooltipLocal();

        // Sync marker and circle dragging
        centerMarker.on("drag", (e) => {
            const newPos = e.target.getLatLng();
            layer.setLatLng(newPos);
            centerMarker.markerData.lat = newPos.lat.toFixed(4);
            centerMarker.markerData.lng = newPos.lng.toFixed(4);
            updateCircleTooltipLocal();
        });

        // Make circle draggable and sync with marker
        layer.on('drag', (e) => {
            const newPos = e.target.getLatLng();
            centerMarker.setLatLng(newPos);
            centerMarker.markerData.lat = newPos.lat.toFixed(4);
            centerMarker.markerData.lng = newPos.lng.toFixed(4);
            updateCircleTooltipLocal();
        });

        // Add radius update functionality
        addRadiusUpdateHandlers(layer, centerMarker, circleId);

        dialog.style.display = "none";

        // Reset dialog for next use
        radiusInput.value = '';
        if (unitRadios[0]) unitRadios[0].checked = true;
    }

    // Remove old event listeners and add new one
    const okButton = document.getElementById("circleOk");
    if (okButton) {
        const newButton = okButton.cloneNode(true);
        okButton.parentNode.replaceChild(newButton, okButton);
        newButton.addEventListener("click", confirmRadius);
    }

    // Cancel button handler
    const cancelButton = document.getElementById("circleCancel");
    if (cancelButton) {
        const newCancelButton = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
        newCancelButton.addEventListener("click", () => {
            dialog.style.display = "none";
            map.removeLayer(layer); // Remove the temporary circle
        });
    }
}

// === RECTANGLE HANDLER ===
function handleRectangleCreation(layer) {
    drawnItems.addLayer(layer);

    const bounds = layer.getBounds();
    const center = bounds.getCenter();

    // Safe area calculation - avoid GeometryUtil errors
    let area_sqmi = 'N/A';
    try {
        // Simple bounding box area calculation
        const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth());
        const lngDiff = Math.abs(bounds.getEast() - bounds.getWest());

        // Convert degrees to approximate area (very rough)
        const area_deg = latDiff * lngDiff;
        area_sqmi = (area_deg * 3959).toFixed(2); // Rough conversion

    } catch (error) {
        console.warn('Area calculation failed:', error);
        area_sqmi = 'Error';
    }

    // Assign random color
    const color = getRandomColor();
    layer.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: 0.3,
        weight: 2
    });

    // Create center marker for rectangle WITH tooltip
    const markerData = createManualMarker(center.lat, center.lng, {
        type: 'rectangle-center',
        isDraggable: true,
        rectangleProperties: {
            area: area_sqmi,
            color: color,
            layer: layer
        }
    });

    const centerMarker = markerData.marker;

    // Bind rectangle and marker movement
    centerMarker.on("drag", (e) => {
        const newPos = e.target.getLatLng();
        const offset = [
            newPos.lat - center.lat,
            newPos.lng - center.lng
        ];

        // Move rectangle bounds
        const newBounds = L.latLngBounds([
            [bounds.getSouth() + offset[0], bounds.getWest() + offset[1]],
            [bounds.getNorth() + offset[0], bounds.getEast() + offset[1]]
        ]);

        layer.setBounds(newBounds);
        centerMarker.markerData.lat = newPos.lat.toFixed(4);
        centerMarker.markerData.lng = newPos.lng.toFixed(4);

        // Update marker tooltip with new position
        updateRectangleTooltip(centerMarker);
    });

    // DON'T add tooltip to the rectangle layer itself
    // The marker tooltip will handle this

    attachHoverHandlers(layer);
}

// === POLYGON HANDLER ===
function handlePolygonCreation(layer) {
    drawnItems.addLayer(layer);

    const latLngs = layer.getLatLngs()[0];

    // Skip complex area calculation for now to avoid errors
    const area_sqmi = 'N/A';

    // Calculate centroid
    const center = layer.getBounds().getCenter();

    // Assign random color
    const color = getRandomColor();
    layer.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: 0.3,
        weight: 2
    });

    // Create center marker for polygon WITH tooltip
    const markerData = createManualMarker(center.lat, center.lng, {
        type: 'polygon-center',
        isDraggable: true,
        polygonProperties: {
            vertices: latLngs.length,
            area: area_sqmi,
            color: color,
            layer: layer
        }
    });

    const centerMarker = markerData.marker;

    // Bind polygon and marker movement
    centerMarker.on("drag", (e) => {
        const newPos = e.target.getLatLng();
        const offset = [
            newPos.lat - center.lat,
            newPos.lng - center.lng
        ];

        // Move all polygon vertices
        const newLatLngs = latLngs.map(point => [
            point.lat + offset[0],
            point.lng + offset[1]
        ]);

        layer.setLatLngs([newLatLngs]);
        centerMarker.markerData.lat = newPos.lat.toFixed(4);
        centerMarker.markerData.lng = newPos.lng.toFixed(4);

        // Update marker tooltip with new position
        updatePolygonTooltip(centerMarker);
    });

    // DON'T add tooltip to the polygon layer itself
    // The marker tooltip will handle this

    attachHoverHandlers(layer);
}

// === RADIUS UPDATE HANDLERS ===
function addRadiusUpdateHandlers(circle, marker, circleId) {
    // Add context menu for radius editing (right-click on circle)
    circle.on('contextmenu', function (e) {
        e.originalEvent.preventDefault(); // Prevent browser context menu

        const currentData = circleData.get(circleId);
        const newRadius = prompt('Enter new radius:', currentData?.radiusKm || '1');
        if (newRadius && !isNaN(newRadius)) {
            const unit = prompt('Unit (km/nm):', 'km');
            const radiusMeters = unit === 'nm' ? newRadius * 1852 : newRadius * 1000;
            circle.setRadius(radiusMeters);

            // Update tooltip with marker reference
            updateCircleTooltip(circle, marker);

            // Update stored data
            const center = circle.getLatLng();
            const radius = circle.getRadius();
            const radius_km = (radius / 1000).toFixed(2);
            const radius_nm = (radius / 1852).toFixed(2);
            const area_m2 = Math.PI * Math.pow(radius, 2);
            const area_sqmi = (area_m2 / 2.59e6).toFixed(2);

            circleData.set(circleId, {
                center: center,
                radius: radius,
                radiusKm: radius_km,
                radiusNm: radius_nm,
                area: area_sqmi
            });
        }
    });
}

// === MAIN DRAW EVENT HANDLER ===
function initializeDrawHandlers(mapInstance) {
    mapInstance.on(L.Draw.Event.CREATED, function (event) {
        const { layerType, layer } = event;

        switch (layerType) {
            case 'marker':
                const latLng = layer.getLatLng();
                createManualMarker(latLng.lat, latLng.lng);
                break;
            case 'rectangle':
                handleRectangleCreation(layer);
                break;
            case 'circle':
                handleCircleCreation(layer);
                break;
            case 'polygon':
                handlePolygonCreation(layer);
                break;
            default:
                drawnItems.addLayer(layer);
                break;
        }
    });
}

// === UTILITY FUNCTIONS ===
function getCircleData(circleId) {
    return circleData.get(circleId);
}

function updateCircleRadius(circleId, newRadius, unit = 'km') {
    const circle = drawnItems.getLayers().find(layer => L.stamp(layer) === circleId);
    const marker = circleCenters[circleId];

    if (circle && circle.setRadius) {
        const radiusMeters = unit === 'nm' ? newRadius * 1852 : newRadius * 1000;
        circle.setRadius(radiusMeters);

        // Update tooltip with marker reference
        if (marker) {
            updateCircleTooltip(circle, marker);
        }

        console.log('Circle radius updated:', newRadius, unit);
    }
}

// Export functions
export {
    initializeDrawHandlers,
    handleCircleCreation,
    handleRectangleCreation,
    handlePolygonCreation,
    circleCenters,
    getCircleData,
    updateCircleRadius
};

// Make functions available globally for sidebar
window.handleCircleCreation = handleCircleCreation;
window.handleRectangleCreation = handleRectangleCreation;
window.handlePolygonCreation = handlePolygonCreation;
window.createManualMarker = createManualMarker;
window.drawnItems = drawnItems;
window.map = map;