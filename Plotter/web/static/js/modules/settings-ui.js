/**
 * Settings UI Module
 * Handles the settings modal interface and user interactions
 */

const SettingsUI = (function() {
    'use strict';

    let modalElement = null;
    let isOpen = false;

    /**
     * Initialize the settings UI
     */
    function init() {
        createModal();
        // Settings button is now in the navigation bar, not floating
        attachEventListeners();
        console.log('⚙️ Settings UI initialized');
    }

    /**
     * Create the settings modal HTML
     */
    function createModal() {
        const modalHTML = `
            <div id="settingsModal" class="settings-modal">
                <div class="settings-dialog">
                    <div class="settings-header">
                        <h2><i class="fas fa-sliders-h"></i> Map Viewer Settings</h2>
                        <button class="settings-close" onclick="SettingsUI.closeModal()">&times;</button>
                    </div>

                    <div class="settings-body">
                        <!-- Map Configuration Section -->
                        <div class="settings-section">
                            <h3><i class="fas fa-map"></i> Map Configuration</h3>
                            <div class="settings-grid-balanced">
                                <!-- Left Column: Base Layer & SFAF Region -->
                                <div class="settings-column">
                                    <div class="setting-item">
                                        <label class="setting-label">
                                            <i class="fas fa-layer-group"></i> Default Base Layer
                                        </label>
                                        <select id="setting_baseLayer" class="setting-select">
                                            <option value="CARTO Light">CARTO Light</option>
                                            <option value="CARTO Dark">CARTO Dark</option>
                                            <option value="Esri Streets">Esri Streets</option>
                                            <option value="Esri Satellite">Esri Satellite</option>
                                        </select>
                                    </div>

                                    <div class="setting-item">
                                        <label class="setting-label">
                                            <i class="fas fa-globe-americas"></i> SFAF Region
                                        </label>
                                        <p class="setting-description">Determines required SFAF record fields</p>
                                        <select id="setting_region" class="setting-select">
                                            <option value="CONUS">CONUS (Continental US)</option>
                                            <option value="EUCOM">EUCOM (Europe)</option>
                                            <option value="PACOM">PACOM (Pacific)</option>
                                            <option value="AFRICOM">AFRICOM (Africa)</option>
                                            <option value="CENTCOM">CENTCOM (Central)</option>
                                            <option value="SOUTHCOM">SOUTHCOM (South America)</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Right Column: Default Map View Location -->
                                <div class="settings-column">
                                    <div class="setting-item">
                                        <label class="setting-label">
                                            <i class="fas fa-map-pin"></i> Default Map View Location
                                        </label>
                                        <p class="setting-description">Set where the map centers on page load (independent of SFAF region)</p>

                                        <!-- Location Search -->
                                        <div style="margin-bottom: 12px;">
                                            <div style="display: flex; gap: 8px;">
                                                <input type="text" id="setting_locationSearch" class="setting-input" placeholder="e.g., Fort Walton Beach, FL" style="flex: 1;" onkeypress="if(event.key === 'Enter') SettingsUI.searchLocation()">
                                                <button class="settings-btn-secondary" onclick="SettingsUI.searchLocation()" style="padding: 10px 16px; white-space: nowrap;">
                                                    <i class="fas fa-search"></i> Search
                                                </button>
                                            </div>
                                            <small style="display: block; color: #94a3b8; font-size: 11px; margin-top: 4px; font-style: italic;">
                                                <i class="fas fa-info-circle"></i> Try: "City, State" or "City, Country"
                                            </small>
                                            <div id="locationSearchResult" style="margin-top: 6px; font-size: 12px; color: #94a3b8;"></div>
                                        </div>

                                        <!-- Manual Coordinates -->
                                        <label class="setting-label" style="margin-top: 8px; font-size: 12px;">
                                            <i class="fas fa-crosshairs"></i> Or Enter Coordinates Manually
                                        </label>
                                        <div class="coord-inputs">
                                            <input type="number" id="setting_customLat" class="setting-input" placeholder="Latitude" step="0.0001" min="-90" max="90">
                                            <input type="number" id="setting_customLng" class="setting-input" placeholder="Longitude" step="0.0001" min="-180" max="180">
                                            <input type="number" id="setting_customZoom" class="setting-input" placeholder="Zoom" min="1" max="19">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- UI Preferences Section -->
                        <div class="settings-section">
                            <h3><i class="fas fa-palette"></i> Interface Preferences</h3>
                            <div class="settings-grid-balanced">
                                <!-- Left Column -->
                                <div class="settings-column">
                                    <div class="setting-item">
                                        <label class="setting-label">
                                            <i class="fas fa-moon"></i> Theme
                                        </label>
                                        <select id="setting_theme" class="setting-select">
                                            <option value="dark">Dark Theme</option>
                                            <option value="light">Light Theme</option>
                                        </select>
                                    </div>

                                    <div class="setting-item">
                                        <label class="setting-toggle">
                                            <input type="checkbox" id="setting_showLegend" class="setting-checkbox">
                                            <span class="toggle-switch"></span>
                                            <span class="toggle-label">Show Legend</span>
                                        </label>
                                        <p class="setting-description">Display marker legend on map</p>
                                    </div>

                                    <div class="setting-item">
                                        <label class="setting-toggle">
                                            <input type="checkbox" id="setting_showCoordinates" class="setting-checkbox">
                                            <span class="toggle-switch"></span>
                                            <span class="toggle-label">Show Coordinate Tooltip</span>
                                        </label>
                                        <p class="setting-description">Display cursor coordinates on map hover</p>
                                    </div>
                                </div>

                                <!-- Right Column -->
                                <div class="settings-column">
                                    <div class="setting-item">
                                        <label class="setting-toggle">
                                            <input type="checkbox" id="setting_sidebarOpen" class="setting-checkbox">
                                            <span class="toggle-switch"></span>
                                            <span class="toggle-label">Sidebar Open by Default</span>
                                        </label>
                                        <p class="setting-description">Start with the sidebar panel opened</p>
                                    </div>

                                    <div class="setting-item">
                                        <label class="setting-toggle">
                                            <input type="checkbox" id="setting_showStatus" class="setting-checkbox">
                                            <span class="toggle-switch"></span>
                                            <span class="toggle-label">Show Status Indicator</span>
                                        </label>
                                        <p class="setting-description">Display backend connection status</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Feature Toggles Section -->
                        <div class="settings-section">
                            <h3><i class="fas fa-toggle-on"></i> Features</h3>
                            <div class="settings-grid-balanced">
                                <!-- Left Column -->
                                <div class="settings-column">
                                    <div class="setting-item">
                                        <label class="setting-toggle">
                                            <input type="checkbox" id="setting_drawTools" class="setting-checkbox">
                                            <span class="toggle-switch"></span>
                                            <span class="toggle-label">Enable Draw Tools</span>
                                        </label>
                                        <p class="setting-description">Show drawing and measurement tools</p>
                                    </div>

                                    <div class="setting-item">
                                        <label class="setting-toggle">
                                            <input type="checkbox" id="setting_markerClustering" class="setting-checkbox">
                                            <span class="toggle-switch"></span>
                                            <span class="toggle-label">Marker Clustering</span>
                                        </label>
                                        <p class="setting-description">Group nearby markers when zoomed out</p>
                                    </div>
                                </div>

                                <!-- Right Column -->
                                <div class="settings-column">
                                    <div class="setting-item">
                                        <label class="setting-label">
                                            <i class="fas fa-save"></i> Auto-Save Interval
                                        </label>
                                        <select id="setting_autoSave" class="setting-select">
                                            <option value="0">Disabled</option>
                                            <option value="60000">1 minute</option>
                                            <option value="300000">5 minutes</option>
                                            <option value="600000">10 minutes</option>
                                            <option value="1800000">30 minutes</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Info Box -->
                        <div class="setting-info">
                            <i class="fas fa-info-circle"></i>
                            <div class="setting-info-content">
                                <h4>Settings Information</h4>
                                <p>These settings are saved locally in your browser. Changes will apply on your next page load. You can reset to defaults at any time.</p>
                            </div>
                        </div>
                    </div>

                    <div class="settings-footer">
                        <div class="settings-actions">
                            <button class="settings-btn-danger" onclick="SettingsUI.resetToDefaults()">
                                <i class="fas fa-undo"></i> Reset to Defaults
                            </button>
                        </div>
                        <div class="settings-actions">
                            <button class="settings-btn-secondary" onclick="SettingsUI.closeModal()">
                                Cancel
                            </button>
                            <button class="settings-btn-primary" onclick="SettingsUI.saveSettings()">
                                <i class="fas fa-save"></i> Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modalElement = document.getElementById('settingsModal');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Close on background click
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeModal();
            }
        });
    }

    /**
     * Open the settings modal
     */
    function openModal() {
        loadCurrentSettings();
        modalElement.classList.add('active');
        isOpen = true;
    }

    /**
     * Close the settings modal
     */
    function closeModal() {
        modalElement.classList.remove('active');
        isOpen = false;
    }

    /**
     * Load current settings into the form
     */
    function loadCurrentSettings() {
        const settings = SettingsManager.getSettings();

        // Map settings
        document.getElementById('setting_baseLayer').value = settings.map.baseLayer;
        document.getElementById('setting_region').value = settings.map.region;

        // Load default map view location (always shown)
        document.getElementById('setting_customLat').value = settings.map.defaultCenter.lat;
        document.getElementById('setting_customLng').value = settings.map.defaultCenter.lng;
        document.getElementById('setting_customZoom').value = settings.map.defaultZoom;

        // Show saved location name if available
        if (settings.map.customLocationName) {
            const resultDiv = document.getElementById('locationSearchResult');
            if (resultDiv) {
                resultDiv.innerHTML = `<span style="color: #94a3b8;"><i class="fas fa-map-marker-alt"></i> Current: ${settings.map.customLocationName}</span>`;
            }
        }

        // UI settings
        document.getElementById('setting_theme').value = settings.ui.theme;
        document.getElementById('setting_sidebarOpen').checked = settings.ui.sidebarDefaultOpen;
        document.getElementById('setting_showLegend').checked = settings.ui.showLegend;
        document.getElementById('setting_showCoordinates').checked = settings.ui.showCoordinateTooltip;
        document.getElementById('setting_showStatus').checked = settings.ui.showStatusIndicator;

        // Feature settings
        document.getElementById('setting_drawTools').checked = settings.features.enableDrawTools;
        document.getElementById('setting_markerClustering').checked = settings.features.enableMarkerClustering;
        document.getElementById('setting_autoSave').value = settings.features.autoSaveInterval.toString();
    }

    /**
     * Save settings
     */
    function saveSettings() {
        const region = document.getElementById('setting_region').value;

        // Map view location (independent of SFAF region)
        const defaultCenter = {
            lat: parseFloat(document.getElementById('setting_customLat').value) || 30.43,
            lng: parseFloat(document.getElementById('setting_customLng').value) || -86.695
        };
        const defaultZoom = parseInt(document.getElementById('setting_customZoom').value) || 13;

        const updates = {
            map: {
                baseLayer: document.getElementById('setting_baseLayer').value,
                defaultCenter: defaultCenter,
                defaultZoom: defaultZoom,
                region: region,
                customLocationName: window._lastSearchedLocation || ''
            },
            ui: {
                theme: document.getElementById('setting_theme').value,
                sidebarDefaultOpen: document.getElementById('setting_sidebarOpen').checked,
                showLegend: document.getElementById('setting_showLegend').checked,
                showCoordinateTooltip: document.getElementById('setting_showCoordinates').checked,
                showStatusIndicator: document.getElementById('setting_showStatus').checked
            },
            features: {
                enableDrawTools: document.getElementById('setting_drawTools').checked,
                enableMarkerClustering: document.getElementById('setting_markerClustering').checked,
                autoSaveInterval: parseInt(document.getElementById('setting_autoSave').value)
            }
        };

        if (SettingsManager.updateSettings(updates)) {
            showNotification('Settings saved successfully! Refresh the page to apply changes.', 'success');
            closeModal();
        } else {
            showNotification('Failed to save settings. Please try again.', 'error');
        }
    }

    /**
     * Reset settings to defaults
     */
    function resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            if (SettingsManager.resetSettings()) {
                showNotification('Settings reset to defaults. Refresh the page to apply changes.', 'success');
                loadCurrentSettings();
            } else {
                showNotification('Failed to reset settings. Please try again.', 'error');
            }
        }
    }

    /**
     * Search for location by city/state using Nominatim (OpenStreetMap)
     */
    async function searchLocation() {
        const searchInput = document.getElementById('setting_locationSearch');
        const resultDiv = document.getElementById('locationSearchResult');
        const query = searchInput.value.trim();

        if (!query) {
            resultDiv.innerHTML = '<span style="color: #ef4444;">Please enter a city and state</span>';
            return;
        }

        resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

        try {
            // Use Nominatim (OpenStreetMap) geocoding API
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'SFAF-Plotter-Map-Viewer'
                }
            });

            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);

                // Set the coordinate inputs
                document.getElementById('setting_customLat').value = lat.toFixed(4);
                document.getElementById('setting_customLng').value = lng.toFixed(4);
                document.getElementById('setting_customZoom').value = 13;

                // Store the location name for future reference
                window._lastSearchedLocation = result.display_name || query;

                // Show success message
                const displayName = result.display_name || query;
                resultDiv.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Found: ${displayName}</span>`;
            } else {
                resultDiv.innerHTML = '<span style="color: #ef4444;"><i class="fas fa-exclamation-circle"></i> Location not found. Try: "City, State" format</span>';
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            resultDiv.innerHTML = '<span style="color: #ef4444;"><i class="fas fa-exclamation-circle"></i> Search failed. Please try again or enter coordinates manually.</span>';
        }
    }

    /**
     * Show notification message
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;

        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            notification.style.color = 'white';
            notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            notification.style.color = 'white';
            notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        } else {
            notification.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            notification.style.color = 'white';
            notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        }

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Toggle settings modal (for navigation button)
     */
    function toggleSettings() {
        if (isOpen) {
            closeModal();
        } else {
            openModal();
        }
    }

    // Public API
    return {
        init,
        openModal,
        closeModal,
        toggleSettings,
        saveSettings,
        resetToDefaults,
        searchLocation
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SettingsUI.init());
} else {
    SettingsUI.init();
}
