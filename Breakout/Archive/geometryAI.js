// shapes.js (new file or extend markers.js)

import { map, drawnItems } from '../js/map.js';
import { saveToStore } from './db.js';
import { convertToDMS, generateSerial } from '../js/utils.js';

// Store your shapes data, similar to manualMarkers
export const manualShapes = [];

/**
 * Create editable metadata popup content for any shape.
 * @param {Object} data - Shape metadata
 */
function getShapePopupContent(data) {
  return `
    <b>Edit Shape</b><br>
    <label>Frequency:</label><br>
    <input type="text" id="freq-${data.serial}" value="${data.frequency || ''}" /><br>
    <label>Notes:</label><br>
    <textarea id="notes-${data.serial}">${data.notes || ''}</textarea><br>
    <button id="save-btn-${data.serial}">Save</button>
  `;
}

/**
 * Create and handle metadata and tooltip for a shape layer.
 * @param {L.Layer} layer - Leaflet shape layer (Polygon, Circle, Rectangle)
 * @param {Object} options - Optional metadata (frequency, notes, serial)
 */
export function createManualShape(layer, options = {}) {
  const serial = options.serial || generateSerial();

  // Default metadata
  const shapeData = {
    serial,
    frequency: options.frequency || '',
    notes: options.notes || ''
  };

  // Store metadata on the layer
  layer.shapeData = shapeData;

  // Add to drawnItems so it appears in the editing toolbar
  drawnItems.addLayer(layer);

  // Function to generate tooltip content depending on shape type
  function updateTooltip() {
    let info = '';
    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      info = `
        <b>Circle</b><br>
        Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}<br>
        Radius: ${radius.toFixed(2)} meters<br>
      `;
    } else if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0]; // For polygons, first ring
      info = '<b>Polygon</b><br>Vertices:<br>';
      latlngs.forEach((latlng, i) => {
        info += `${i + 1}: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}<br>`;
      });
    }
    // Add serial and metadata
    info += `
      Serial: ${serial}<br>
      Frequency: ${shapeData.frequency}<br>
      Notes: ${shapeData.notes}
    `;

    layer.bindTooltip(info, { permanent: true, direction: 'top', offset: L.point(0, -15) }).openTooltip();
  }

  updateTooltip();

  // Open editable popup on click
  layer.on('click', () => {
    layer.bindPopup(getShapePopupContent(layer.shapeData)).openPopup();
  });

  // On popup open, add save button listener
  layer.on('popupopen', () => {
    const saveBtn = document.getElementById(`save-btn-${layer.shapeData.serial}`);
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
      const newFreq = document.getElementById(`freq-${layer.shapeData.serial}`).value;
      const newNotes = document.getElementById(`notes-${layer.shapeData.serial}`).value;

      layer.shapeData.frequency = newFreq;
      layer.shapeData.notes = newNotes;

      updateTooltip();

      saveToStore('manual_shapes', layer.shapeData)
        .then(() => {
          layer.closePopup();
        })
        .catch(console.error);
    });
  });

  // Update tooltip on geometry change (edit)
  layer.on('edit', () => {
    updateTooltip();
    // Optional: update lat/lng in shapeData if you want
    saveToStore('manual_shapes', layer.shapeData).catch(console.error);
  });

  manualShapes.push({
    ...shapeData,
    layer
  });

  return { layer, shapeData };
}
