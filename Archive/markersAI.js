// markers.js
import { map } from '../js/map.js';
import { convertToDMS, decimalToCompactDMS, generateSerial } from '../js/utils.js';
import { saveToStore } from '../../js/db.js';
import { sfafSidebar } from '../js/sidebar.js';

export const manualMarkers = [];
export const manualIcon = L.icon({
    iconUrl: 'marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
});

// Initialize marker data with all fields (UPDATED VERSION)
function initializeMarkerData(lat, lng, options = {}) {
    return {
        // Location
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        serial: options.serial || generateSerial(),
        
        // Legacy spectrum data (for backward compatibility)
        frequency: options.frequency || '',
        bandwidth: options.bandwidth || '',
        power: options.power || '',
        modulation: options.modulation || '',
        serviceType: options.serviceType || '',
        signalStrength: options.signalStrength || '',
        snr: options.snr || '',
        interference: options.interference || '',
        equipment: options.equipment || '',
        antenna: options.antenna || '',
        height: options.height || '',
        priority: options.priority || 'Medium',
        status: options.status || 'Active',
        notes: options.notes || '',
        timestamp: options.timestamp || new Date().toISOString().slice(0, 16),
        
        // SFAF data storage
        sfaf: options.sfaf || {},
        
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// Helper to update marker tooltip content
function updateTooltip(marker) {
    const data = marker.markerData;
    const tooltipContent = `
        <b>Spectrum Point</b><br>
        <b>Location:</b> ${convertToDMS(parseFloat(data.lat), false)}, ${convertToDMS(parseFloat(data.lng), true)}<br>
        <b>Serial:</b> ${data.serial}<br>
        <b>Frequency:</b> ${data.frequency ? data.frequency + ' MHz' : 'Not set'}<br>
        <b>Service:</b> ${data.serviceType || 'Not set'}<br>
        <b>Status:</b> ${data.status}<br>
        <b>Priority:</b> ${data.priority}
    `;
    
    marker.unbindTooltip();
    marker.bindTooltip(tooltipContent, {
        permanent: true,
        direction: 'top',
        offset: L.point(0, -15),
        className: 'spectrum-tooltip'
    }).openTooltip();
}

// Legacy export function (keeping for backward compatibility)
function exportSingleToSFAF() {
    console.warn('Legacy exportSingleToSFAF called - consider using sfafSidebar.exportToSFAF()');
    // This can be removed once you confirm the new sidebar is working
}

// Main function to create manual marker
export function createManualMarker(lat, lng, options = {}) {
    const markerData = initializeMarkerData(lat, lng, options);
    
    const marker = L.marker([lat, lng], {
        icon: manualIcon,
        draggable: true
    }).addTo(map);
    
    marker.markerData = markerData;
    updateTooltip(marker);
    
    // Update on drag
    marker.on('drag', (e) => {
        const pos = e.target.getLatLng();
        marker.markerData.lat = pos.lat.toFixed(6);
        marker.markerData.lng = pos.lng.toFixed(6);
        marker.markerData.updatedAt = new Date().toISOString();
        updateTooltip(marker);
        saveToStore('manual_markers', marker.markerData).catch(console.error);
    });
    
    // On marker click, open NEW SFAF sidebar
    marker.on('click', () => {
        sfafSidebar.open(marker);
    });
    
    manualMarkers.push(marker);
    return { marker, markerData };
}

// Export functions for use in other modules
export { updateTooltip };