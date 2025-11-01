const xmtrs = L.layerGroup();
const radii = L.layerGroup();
const LMRtower = L.marker([30.422508,-86.706060]).bindPopup('LMR Tower').addTo(xmtrs);



// add tile layer
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 20
});

const map = L.map('map', {
    center: [30.43, -86.695],
    zoom: 14,
    layers: [osm, xmtrs, radii]
});

const baseLayers = {'OpenstreetMap': osm};

const overlays = {'Transmitters': xmtrs,
    'Radius': radii};

const layerControl = L.control.layers(baseLayers, overlays).addTo(map);