/**
 * Settings Manager Module
 * Manages user preferences and default configurations for the map viewer
 */

const SettingsManager = (function() {
    'use strict';

    // Default settings configuration
    const DEFAULT_SETTINGS = {
        // Map Configuration
        map: {
            baseLayer: 'Esri Satellite',
            defaultCenter: { lat: 30.43, lng: -86.695 },
            defaultZoom: 13,
            region: 'CONUS', // CONUS, EUCOM, PACOM, AFRICOM, CENTCOM, SOUTHCOM
            customLocationName: '' // Name of custom location (if searched)
        },

        // UI Preferences
        ui: {
            theme: 'dark',
            sidebarDefaultOpen: false,
            showLegend: true,
            showCoordinateTooltip: true,
            showStatusIndicator: true
        },

        // Regional Presets (for SFAF record requirements)
        regions: {
            'CONUS': { lat: 39.8283, lng: -98.5795, zoom: 5 },      // Continental US
            'EUCOM': { lat: 50.1109, lng: 8.6821, zoom: 5 },        // Europe (Frankfurt)
            'PACOM': { lat: 35.6762, lng: 139.6503, zoom: 5 },      // Pacific (Tokyo)
            'AFRICOM': { lat: 9.0820, lng: 8.6753, zoom: 5 },       // Africa (Abuja)
            'CENTCOM': { lat: 25.2048, lng: 55.2708, zoom: 6 },     // Central (Dubai)
            'SOUTHCOM': { lat: -15.7801, lng: -47.9292, zoom: 5 }   // South America (Brasilia)
        },

        // Feature Toggles
        features: {
            enableDrawTools: true,
            enableMarkerClustering: false,
            enableMeasurementTools: true,
            autoSaveInterval: 300000 // 5 minutes in ms (0 = disabled)
        }
    };

    // Current settings (loaded from localStorage or defaults)
    let currentSettings = null;

    /**
     * Initialize settings manager
     */
    function init() {
        loadSettings();
        console.log('⚙️ Settings Manager initialized');
    }

    /**
     * Load settings from localStorage or use defaults
     */
    function loadSettings() {
        try {
            const saved = localStorage.getItem('sfaf_plotter_settings');
            if (saved) {
                currentSettings = JSON.parse(saved);
                // Merge with defaults to ensure new settings are present
                currentSettings = mergeWithDefaults(currentSettings);
                console.log('✅ Loaded saved settings:', currentSettings);
            } else {
                currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
                console.log('📋 Using default settings');
            }
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
    }

    /**
     * Merge saved settings with defaults to handle new settings
     */
    function mergeWithDefaults(saved) {
        const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

        // Deep merge
        if (saved.map) Object.assign(merged.map, saved.map);
        if (saved.ui) Object.assign(merged.ui, saved.ui);
        if (saved.features) Object.assign(merged.features, saved.features);

        // Preserve custom regions if they exist
        if (saved.regions && saved.regions.CUSTOM) {
            merged.regions.CUSTOM = saved.regions.CUSTOM;
        }

        return merged;
    }

    /**
     * Save settings to localStorage
     */
    function saveSettings(settings) {
        try {
            currentSettings = settings || currentSettings;
            localStorage.setItem('sfaf_plotter_settings', JSON.stringify(currentSettings));
            console.log('💾 Settings saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get current settings
     */
    function getSettings() {
        if (!currentSettings) {
            loadSettings();
        }
        return currentSettings;
    }

    /**
     * Get specific setting value
     */
    function getSetting(category, key) {
        const settings = getSettings();
        return settings[category]?.[key];
    }

    /**
     * Update a specific setting
     */
    function updateSetting(category, key, value) {
        if (!currentSettings) {
            loadSettings();
        }

        if (!currentSettings[category]) {
            currentSettings[category] = {};
        }

        currentSettings[category][key] = value;
        return saveSettings();
    }

    /**
     * Update multiple settings at once
     */
    function updateSettings(updates) {
        if (!currentSettings) {
            loadSettings();
        }

        Object.keys(updates).forEach(category => {
            if (!currentSettings[category]) {
                currentSettings[category] = {};
            }
            Object.assign(currentSettings[category], updates[category]);
        });

        return saveSettings();
    }

    /**
     * Reset settings to defaults
     */
    function resetSettings() {
        currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        return saveSettings();
    }

    /**
     * Export settings as JSON
     */
    function exportSettings() {
        return JSON.stringify(currentSettings, null, 2);
    }

    /**
     * Import settings from JSON
     */
    function importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            currentSettings = mergeWithDefaults(imported);
            return saveSettings();
        } catch (error) {
            console.error('❌ Error importing settings:', error);
            return false;
        }
    }

    /**
     * Get region coordinates
     */
    function getRegionCoordinates(regionName) {
        const settings = getSettings();
        return settings.regions[regionName] || settings.regions.CONUS;
    }

    /**
     * Set custom region coordinates
     */
    function setCustomRegion(lat, lng, zoom) {
        return updateSettings({
            regions: {
                CUSTOM: { lat, lng, zoom }
            }
        });
    }

    // Public API
    return {
        init,
        getSettings,
        getSetting,
        updateSetting,
        updateSettings,
        saveSettings,
        resetSettings,
        exportSettings,
        importSettings,
        getRegionCoordinates,
        setCustomRegion,
        DEFAULT_SETTINGS
    };
})();

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SettingsManager.init());
} else {
    SettingsManager.init();
}
