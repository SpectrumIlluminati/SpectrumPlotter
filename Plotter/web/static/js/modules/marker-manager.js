/**
 * Marker Manager Module
 *
 * Manages marker lifecycle: creation, updates, deletion, and state management
 */

const MarkerManager = (() => {
    // Storage for markers
    const markers = new Map();
    let currentSelectedMarker = null;

    // Marker icons (will be set from map.js)
    let manualIcon = null;
    let importedIcon = null;

    /**
     * Initialize marker icons
     */
    function setMarkerIcons(manual, imported) {
        manualIcon = manual;
        importedIcon = imported;
    }

    /**
     * Load existing markers from backend (with clustering for performance)
     */
    async function loadExistingMarkers() {
        try {
            if (!window.map) {
                console.warn('Map not initialized yet');
                return;
            }

            // Initialize marker cluster group for imported markers
            if (!window.markerClusterGroup) {
                window.markerClusterGroup = L.markerClusterGroup({
                    maxClusterRadius: 60,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    disableClusteringAtZoom: 15 // Show individual markers at zoom 15+
                });

                // Add click handler for markers within clusters
                window.markerClusterGroup.on('click', function(e) {
                    console.log('🎯 Cluster marker clicked:', e.layer);
                    if (e.layer && e.layer.markerId) {
                        console.log('🖱️ Marker clicked (from cluster):', e.layer.markerId, e.layer.markerData);
                        currentSelectedMarker = e.layer;
                        UIHelpers.manageObjectTabVisibility(true);

                        // Open sidebar if SFAFIntegration is available
                        if (window.SFAFIntegration && window.SFAFIntegration.openSidebar) {
                            console.log('✅ SFAFIntegration available, calling openSidebar');
                            window.SFAFIntegration.openSidebar(e.layer.markerId);
                        } else {
                            console.warn('⚠️ SFAFIntegration not available');
                        }
                    }
                });

                window.map.addLayer(window.markerClusterGroup);
            }

            // Fetch markers from API (LIMIT 500)
            const data = await APIClient.fetchMarkers();

            if (data.markers) {
                // Add markers to cluster group
                data.markers.forEach(markerData => {
                    createMarkerOnMap(markerData);
                });

                console.log(`✅ Loaded ${data.markers.length} markers (clustered)`);
            }
        } catch (error) {
            console.error('❌ Failed to load markers:', error);
        }
    }

    /**
     * Create marker on map with all event handlers
     */
    function createMarkerOnMap(markerData) {
        const icon = markerData.type === 'imported' ? importedIcon : manualIcon;
        const marker = L.marker([markerData.lat, markerData.lng], {
            icon: icon,
            draggable: markerData.is_draggable !== false
        });

        // Store marker data and ID
        marker.markerId = markerData.id;
        marker.markerData = {
            ...markerData,
            lat: parseFloat(markerData.lat).toFixed(4),
            lng: parseFloat(markerData.lng).toFixed(4)
        };

        // Add to cluster group or map directly
        if (window.markerClusterGroup && markerData.type === 'imported') {
            // Add imported markers to cluster group for performance
            window.markerClusterGroup.addLayer(marker);
        } else {
            // Add manual markers directly to map (not clustered)
            window.map.addLayer(marker);
            window.drawnItems.addLayer(marker);
        }
        markers.set(markerData.id, marker);

        // Update tooltip with DMS coordinates
        TooltipManager.updateMarkerTooltip(marker);

        // Click handler
        marker.on('click', async () => {
            console.log('🖱️ Marker clicked:', marker.markerId, marker.markerData);
            currentSelectedMarker = marker;
            UIHelpers.manageObjectTabVisibility(true);

            // Open sidebar if SFAFIntegration is available
            if (window.SFAFIntegration && window.SFAFIntegration.openSidebar) {
                console.log('✅ SFAFIntegration available, calling openSidebar');
                await window.SFAFIntegration.openSidebar(marker.markerId);
            } else {
                console.warn('⚠️ SFAFIntegration not available');
            }
        });

        // Drag handler with tooltip update
        let dragTimeout = null;
        marker.on('drag', async (e) => {
            const pos = e.target.getLatLng();
            marker.markerData.lat = pos.lat.toFixed(4);
            marker.markerData.lng = pos.lng.toFixed(4);

            // Update tooltip immediately with new coordinates
            TooltipManager.updateMarkerTooltip(marker);

            // Debounce server update
            if (dragTimeout) {
                clearTimeout(dragTimeout);
            }
            dragTimeout = setTimeout(async () => {
                try {
                    await APIClient.updateMarker(markerData.id, {
                        lat: parseFloat(pos.lat.toFixed(4)),
                        lng: parseFloat(pos.lng.toFixed(4))
                    });
                    console.log('✅ Marker position saved to server');
                } catch (error) {
                    console.error('❌ Failed to update marker coordinates:', error);
                }
            }, 500);
        });

        return marker;
    }

    /**
     * Delete marker from map and backend
     */
    async function deleteMarker(markerId) {
        try {
            await APIClient.deleteMarker(markerId);

            const marker = markers.get(markerId);
            if (marker) {
                window.map.removeLayer(marker);
                markers.delete(markerId);
            }

            console.log('✅ Marker deleted successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to delete marker:', error);
            return false;
        }
    }

    /**
     * Clear all markers from map and backend
     */
    async function clearAllMarkers() {
        try {
            // Show confirmation dialog
            if (!confirm('Delete all markers and associated SFAF data?\n\nThis action cannot be undone.')) {
                return false;
            }

            // Call backend bulk delete API
            const result = await APIClient.deleteAllMarkers();

            console.log('✅ Backend response:', result.message);

            // Clear markers Map
            markers.clear();
            console.log('✅ Markers Map cleared');

            // Clear drawnItems layer group
            if (window.drawnItems) {
                window.drawnItems.clearLayers();
                console.log('✅ DrawnItems layers cleared');
            }

            // Remove ALL marker layers directly from map
            window.map.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    window.map.removeLayer(layer);
                }
            });
            console.log('✅ All marker layers removed from map');

            // Clear current marker references
            currentSelectedMarker = null;
            if (window.currentSFAFMarker) {
                window.currentSFAFMarker = null;
            }
            console.log('✅ Current marker references cleared');

            // Close sidebar if open
            UIHelpers.closePersistentSidebar();

            // Force map redraw
            window.map.invalidateSize();

            // Show success notification
            UIHelpers.showNotification('✅ All markers cleared successfully', 'success');

            return true;

        } catch (error) {
            console.error('Failed to clear all markers:', error);
            UIHelpers.showNotification('❌ Failed to clear markers', 'error');
            return false;
        }
    }

    /**
     * Get marker by ID
     */
    function getMarkerById(id) {
        return markers.get(id);
    }

    /**
     * Get all markers
     */
    function getAllMarkers() {
        return Array.from(markers.values());
    }

    /**
     * Get current selected marker
     */
    function getCurrentSelectedMarker() {
        return currentSelectedMarker;
    }

    /**
     * Set current selected marker
     */
    function setCurrentSelectedMarker(marker) {
        currentSelectedMarker = marker;
    }

    /**
     * Get markers storage map
     */
    function getMarkersMap() {
        return markers;
    }

    // Public API
    return {
        // Initialization
        setMarkerIcons,
        loadExistingMarkers,

        // Marker operations
        createMarkerOnMap,
        deleteMarker,
        clearAllMarkers,

        // Getters
        getMarkerById,
        getAllMarkers,
        getCurrentSelectedMarker,
        setCurrentSelectedMarker,
        getMarkersMap
    };
})();

// Make globally available
window.MarkerManager = MarkerManager;

// Export markers and currentSelectedMarker for backward compatibility
Object.defineProperty(window, 'markers', {
    get: () => MarkerManager.getMarkersMap()
});

Object.defineProperty(window, 'currentSelectedMarker', {
    get: () => MarkerManager.getCurrentSelectedMarker(),
    set: (value) => MarkerManager.setCurrentSelectedMarker(value)
});
