import { map, drawnItems } from '../js/map.js';
import { convertToDMS, getRandomColor } from '../js/utilAI.js';
import { createManualMarker, attachHoverHandlers } from '../js/markers.js';

const circleCenters = {};

map.on(L.Draw.Event.CREATED, function (event) {
    const layerType = event.layerType;
    const layer = event.layer;

    // === Marker Drawing ===
    if (layerType === 'marker') {
        const latLng = layer.getLatLng();
        createManualMarker(latLng.lat, latLng.lng);
        return;
    }

    // === Rectangle Drawing ===
    if (layerType === 'rectangle') {
        drawnItems.addLayer(layer);
        attachHoverHandlers(layer);

        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        const area_m2 = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        const area_sqmi = (area_m2 / 2.59e6).toFixed(2);

        const latDMS = convertToDMS(center.lat);
        const lngDMS = convertToDMS(center.lng);

        layer.bindTooltip(
            `<b>Rectangle</b><br>Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}<br>DMS: ${latDMS}, ${lngDMS}<br>Area: ${area_sqmi} sq mi`,
            { permanent: true, direction: 'top', offset: L.point(0, -55) }
        ).openTooltip();
        return;
    }

    // === Circle Drawing ===
    if (layerType === 'circle') {
        const dialog = document.getElementById("circleDialog");
        dialog.style.display = "block";

        const currentCircleLayer = layer;

        function updateCircleTooltip() {
            const center = currentCircleLayer.getLatLng();
            const area_m2 = Math.PI * Math.pow(currentCircleLayer.getRadius(), 2);
            const area_sqmi = (area_m2 / 2.59e6).toFixed(2);

            const radius_km = (currentCircleLayer.getRadius() / 1000).toFixed(2);
            const radius_nm = (currentCircleLayer.getRadius() / 1852).toFixed(2);

            const latDMS = convertToDMS(center.lat);
            const lngDMS = convertToDMS(center.lng);

            currentCircleLayer.bindTooltip(
                `<b>Circle</b><br>Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}<br>DMS: ${latDMS}, ${lngDMS}<br>Radius: ${radius_km} km / ${radius_nm} nm<br>Area: ${area_sqmi} sq mi`,
                { permanent: true, direction: 'top', offset: L.point(0, -38) }
            ).openTooltip();
        }

        function confirmRadius() {
            const radiusValue = parseFloat(document.getElementById("circleRadius").value) || 1;
            const unit = document.querySelector("input[name='circleUnit']:checked").value;
            const radiusMeters = unit === "km" ? radiusValue * 1000 : radiusValue * 1852;

            currentCircleLayer.setRadius(radiusMeters);

            const color = getRandomColor();
            currentCircleLayer.setStyle({ color, fillColor: color, fillOpacity: 0.3 });

            drawnItems.addLayer(currentCircleLayer);
            attachHoverHandlers(currentCircleLayer);

            updateCircleTooltip();

            // Create draggable center marker
            const centerMarker = L.marker(currentCircleLayer.getLatLng(), { draggable: true }).addTo(map);
            circleCenters[L.stamp(currentCircleLayer)] = centerMarker;

            centerMarker.on("drag", e => {
                currentCircleLayer.setLatLng(e.target.getLatLng());
                updateCircleTooltip();
            });

            dialog.style.display = "none";
        }

        // Remove old event listeners to prevent stacking
        const okButton = document.getElementById("circleOk");
        const newButton = okButton.cloneNode(true);
        okButton.parentNode.replaceChild(newButton, okButton);

        newButton.addEventListener("click", confirmRadius);
        return;
    }
});
