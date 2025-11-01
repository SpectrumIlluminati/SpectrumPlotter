// UI: Panel toggle logic
function setupPanelToggle(idHeader, idPanel, collapsedText, expandedText) {
    const header = document.getElementById(idHeader);
    const panel = document.getElementById(idPanel);
    header.addEventListener("click", () => {
        panel.classList.toggle("collapsed");
        header.textContent = panel.classList.contains("collapsed") ? collapsedText : expandedText;
    });
}

// Initialize collapsible panels
setupPanelToggle("legend-header", "legend", "Legend ▸", "Legend ▾");
setupPanelToggle("export-header", "exportOptions", "Data ▸", "Data ▾");
setupPanelToggle("inputPanel-header", "inputPanel", "Add Geometry by Text ▸", "Add Geometry by Text ▾");

// Lock features toggle
document.getElementById("lockFeatures").addEventListener("change", (e) => {
    const locked = e.target.checked;
    toggleLockFeatures(locked); // Function from map.js
});

// Upload CSV button
document.getElementById("uploadButton").addEventListener("click", () => {
    document.getElementById("csvFileInput").click();
});

// Handle actual file input
document.getElementById("csvFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            processCSVData(results.data); // Function from map.js
        },
        error: (err) => alert("CSV Parse Error: " + err.message)
    });
});

// Export CSV
document.getElementById("exportButton").addEventListener("click", () => {
    exportMarkersToCSV(); // You must have this in map.js
});