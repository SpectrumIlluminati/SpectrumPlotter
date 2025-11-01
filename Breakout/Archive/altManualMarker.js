//Only if you want createManualMarker to accept an existing serial instead of generating a new one
async function createManualMarker(lat, lng, extraData = {}) {
    const serial = extraData.serial || generateSerial();

    const markerData = {
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        frequency: extraData.frequency || '',
        notes: extraData.notes || '',
        serial: serial,
    };

    manualMarkers.push(markerData);
    saveManualMarkerToDB(markerData);

    const marker = L.marker([lat, lng], { icon: manualIcon, draggable: true }).addTo(map);
    attachHoverHandlers(marker);
    drawnItems.addLayer(marker);

    marker.bindPopup(createMetadataForm(markerData), { closeOnClick: false });
    marker.bindTooltip(
        `<b>Manual Marker</b><br>DecDeg: ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>DMS: ${convertToDMS(lat)}, ${convertToDMS(lng)}<br>Serial: ${serial}`,
        { permanent: true, direction: 'top', offset: L.point(0, -35) }
    ).openTooltip();

    marker.on("drag", e => {
        const pos = e.target.getLatLng();
        const m = manualMarkers.find(mm => mm.serial === serial);
        if (m) {
            m.lat = pos.lat.toFixed(4);
            m.lng = pos.lng.toFixed(4);
            updateManualMarkerInDB(serial, { lat: pos.lat, lng: pos.lng });
            e.target.setTooltipContent(
                `<b>Manual Marker</b><br>DecDeg: ${m.lat}, ${m.lng}<br>DMS: ${convertToDMS(pos.lat)}, ${convertToDMS(pos.lng)}<br>Serial: ${serial}`
            );
        }
    });
}
