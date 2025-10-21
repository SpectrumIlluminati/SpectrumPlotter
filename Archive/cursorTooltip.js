import { map } from './map.js';
import { convertToDMS } from './utils.js';

const cursorTooltip = L.tooltip({
    permanent: false,
    direction: 'right',
    offset: L.point(0, -45),
    className: 'cursorTooltip'
});

map.on('mousemove', e => {
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
});

map.on('mouseout', () => {
    map.removeLayer(cursorTooltip);
});