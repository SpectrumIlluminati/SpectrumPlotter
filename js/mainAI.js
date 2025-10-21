window.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize the map (function from map.js)
    initializeMap();

    // 2. Open IndexedDB
    await openDB();

    // 3. Load saved markers from DB
    await loadSavedMarkers(); // You must define this in db.js or map.js

    // 4. Add draw controls (assumes drawControl is defined globally)
    map.addControl(drawControl);
});