import { createManualMarker } from "../js/markers";

createManualMarker(lat, lng);
const serial = generateSerial();
const markerData = {
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
    frequency: '',
    notes: '',
    serial
};

const latDMS = convertToDMS(lat);
const lngDMS = convertToDMS(lng);

const marker = L.marker([lat, lng], {
    icon: manualIcon,
    draggable: true
}).addTo(map);

marker.bindTooltip(
    `<b>Manual Marker</b><br>DecDeg: ${lat}, ${lng}<br>DMS: ${latDMS}, ${lngDMS}<br>Serial: ${serial}`,
    {
        permanent: true,
        direction: 'top',
        offset: L.point(0, -35)
    }
).openTooltip();

// Optional: update markerData when dragged
marker.on('dragend', function (e) {
    const newLatLng = e.target.getLatLng();
    markerData.lat = newLatLng.lat.toFixed(4);
    markerData.lng = newLatLng.lng.toFixed(4);

    // Optionally update tooltip
    const newLatDMS = convertToDMS(newLatLng.lat);
    const newLngDMS = convertToDMS(newLatLng.lng);
    marker.setTooltipContent(
        `<b>Manual Marker</b><br>DecDeg: ${markerData.lat}, ${markerData.lng}<br>DMS: ${newLatDMS}, ${newLngDMS}<br>Serial: ${serial}`
    );
});

manualMarkers.push(markerData);