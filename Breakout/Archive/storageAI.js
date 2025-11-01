let db;
export let isDBReady = false;

export async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MyMapDB", 1);
        request.onupgradeneeded = function (e) {
            db = e.target.result;
            db.createObjectStore("manual_markers", { keyPath: "serial" });
            db.createObjectStore("geometries", { keyPath: "id" });
        };
        request.onsuccess = function (e) {
            db = e.target.result;
            isDBReady = true;
            resolve();
        };
        request.onerror = reject;
    });
}

export function getObjectStore(storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
}

export function saveToStore(storeName, value) {
    const store = getObjectStore(storeName, "readwrite");
    store.put(value);
}

export async function saveManualMarkerToDB(markerData) {
    if (!isDBReady) await openDB();
    saveToStore("manual_markers", markerData);
}

export async function updateManualMarkerInDB(serial, updates) {
    if (!isDBReady) await openDB();
    const store = getObjectStore("manual_markers", "readwrite");
    const existing = await new Promise((resolve, reject) => {
        const req = store.get(serial);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    if (existing) {
        Object.assign(existing, updates);
        saveToStore("manual_markers", existing);
    }
}