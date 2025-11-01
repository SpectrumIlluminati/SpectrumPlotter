// db.js

import { drawnItems } from './map.js';  // If you want to add them to the map's drawnItems layer
import { createManualMarker } from './markers.js';

// *****1. Database Utilities*****
// IndexedDB utility module
const dbName = 'spectrumPlotter';
const dbVersion = 1;
let dbInstance = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('manual_markers')) {
                db.createObjectStore('manual_markers', { keyPath: 'serial' });
            }
            if (!db.objectStoreNames.contains('imported_markers')) {
                db.createObjectStore('imported_markers', { keyPath: 'serial' });
            }
            if (!db.objectStoreNames.contains('geometries')) {
                db.createObjectStore('geometries', { autoIncrement: true });
            }
        };
    });
}


async function getObjectStore(storeName, mode = 'readonly') {
    if (!dbInstance) {
        await openDB();
    }
    const tx = dbInstance.transaction(storeName, mode);
    return tx.objectStore(storeName);
}

async function saveToStore(storeName, data) {
    const store = await getObjectStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

async function getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
        const store = getObjectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteFromStore(storeName, key) {
    const store = getObjectStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

// --- New geometry save function ---
async function saveGeometryToDB(type, coords, meta = {}, color = "#000") {
    if (!dbInstance) await openDB();
    const store = getObjectStore('geometries', 'readwrite');
    const data = { type, coords, meta, color, timestamp: Date.now() };
    return new Promise((resolve, reject) => {
        const req = store.put(data);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

async function loadSavedGeometries() {
    if (!dbInstance) await openDB();
    const geometries = await getAllFromStore('geometries');
    geometries.forEach(({ type, coords, meta, color }) => {
        let layer;
        switch (type) {
            case 'circle':
                layer = L.circle(coords, { color });
                break;
            case 'rectangle':
                layer = L.rectangle(coords, { color });
                break;
            case 'polygon':
                layer = L.polygon(coords, { color });
                break;
            default:
                console.warn(`Unknown geometry type: ${type}`);
        }
        if (layer) {
            drawnItems.addLayer(layer);
            // optionally bind popup with meta data here
        }
    });
}


async function loadSavedMarkers() {
    if (!dbInstance) await openDB();

    const manualMarkers = await getAllFromStore('manual_markers');
    const importedMarkers = await getAllFromStore('imported_markers');

    // For example, add manual markers to drawnItems layer (adjust according to your marker format)
    manualMarkers.forEach(data => {
        const { marker } = createManualMarker(parseFloat(data.lat), parseFloat(data.lng), {
            draggable: true,
            serial: data.serial,
            frequency: data.frequency,
            notes: data.notes
        });
        drawnItems.addLayer(marker);
    });

    // Imported markers might be read-only (no dragging)
    importedMarkers.forEach(data => {
        const marker = L.marker([data.lat, data.lng], { draggable: false });
        drawnItems.addLayer(marker);
    });
}

export {
    openDB,
    saveToStore,
    getAllFromStore,
    deleteFromStore,
    loadSavedMarkers,
    loadSavedGeometries
};