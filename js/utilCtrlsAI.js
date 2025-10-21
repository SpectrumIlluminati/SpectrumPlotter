import { drawnItems, map, drawControl } from './shared.js';

export function attachHoverHandlers(layer) {
    layer.on("mouseover", () => {
        cursorTooltip.style.display = "none";
    });
    layer.on("mouseout", () => {
        cursorTooltip.style.display = "block";
    });
}

export function setupPanelToggle(idHeader, idPanel, collapsedText, expandedText) {
    const header = document.getElementById(idHeader);
    const panel = document.getElementById(idPanel);
    header.addEventListener("click", () => {
        panel.classList.toggle("collapsed");
        header.textContent = panel.classList.contains("collapsed") ? collapsedText : expandedText;
    });
}

export function toggleLockFeatures(isLocked) {
    drawnItems.eachLayer(layer => {
        if (layer.editing) {
            isLocked ? layer.editing.disable() : layer.editing.enable();
        }
        if (layer.dragging) {
            isLocked ? layer.dragging.disable() : layer.dragging.enable();
        }
    });

    if (isLocked) {
        map.removeControl(drawControl);
    } else {
        map.addControl(drawControl);
    }
}