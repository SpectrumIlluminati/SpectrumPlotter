import { drawnItems, manualIcon, importedIcon, map } from './shared.js';
import { attachHoverHandlers } from './ui-controls.js';
import { convertToDMS } from './utils.js';
import { saveManualMarkerToDB, updateManualMarkerInDB } from './storage.js';
import { createMetadataForm } from './markers.js';

export function initMapAndDrawTools(L, drawControl) {
    map.on(L.Draw.Event.CREATED, async function (event) {
        const { layerType, layer } = event;

        if (layerType === 'marker') {
            const latLng = layer.getLatLng();
            const lat = latLng.lat.toFixed(4);
            const lng = latLng.lng.toFixed(4);
            const latDMS = convertToDMS(latLng.lat);
            const lngDMS = convertToDMS(latLng.lng);
            const serial = generateSerial();

            const markerData = { lat, lng, frequency: "", notes: "", serial };
            manualMarkers.push(markerData);
            await saveManualMarkerToDB(markerData);

            const markerLayer = L.marker([lat, lng], { icon: manualIcon, draggable: true }).addTo(map);
            drawnItems.addLayer(markerLayer);
            attachHoverHandlers(markerLayer);

            markerLayer.bindPopup(createMetadataForm(markerData), { closeOnClick: false });
            markerLayer.bindTooltip(
                `<b>Manual Marker</b><br>DecDeg: ${lat}, ${lng}<br>DMS: ${latDMS}, ${lngDMS}<br>Serial: ${serial}`,
                { permanent: true, direction: 'top', offset: L.point(0, -35) }
            ).openTooltip();

            markerLayer.on("drag", e => {
                const pos = e.target.getLatLng();
                const lat = pos.lat.toFixed(4);
                const lng = pos.lng.toFixed(4);
                const latDMS = convertToDMS(pos.lat);
                const lngDMS = convertToDMS(pos.lng);

                e.target.setTooltipContent(
                    `<b>Manual Marker</b><br>DecDeg: ${lat}, ${lng}<br>DMS: ${latDMS}, ${lngDMS}<br>Serial: ${serial}`
                );

                const marker = manualMarkers.find(m => m.serial === serial);
                if (marker) {
                    marker.lat = lat;
                    marker.lng = lng;
                }
                updateManualMarkerInDB(serial, { lat: pos.lat, lng: pos.lng });
            });
        }

        // Handle other shapes (circle, polygon, rectangle)...
    });
}