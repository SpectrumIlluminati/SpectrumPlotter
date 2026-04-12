/**
 * Settings Applier Module
 * Applies user settings to the UI on page load
 */

const SettingsApplier = (function() {
    'use strict';

    /**
     * Apply all settings on page load
     */
    function applySettings() {
        const settings = SettingsManager.getSettings();
        console.log('⚙️ Applying user settings...', settings);

        applyThemeSettings(settings.ui.theme);
        applyUISettings(settings.ui);
        applyFeatureSettings(settings.features);
    }

    /**
     * Apply theme settings
     */
    function applyThemeSettings(theme) {
        const htmlElement = document.documentElement;
        htmlElement.setAttribute('data-theme', theme);
        console.log(`🎨 Applied theme: ${theme}`);
    }

    /**
     * Apply UI visibility settings
     */
    function applyUISettings(uiSettings) {
        // Apply sidebar default state
        if (uiSettings.sidebarDefaultOpen) {
            // Wait for sidebar to be available
            setTimeout(() => {
                if (typeof UIHelpers !== 'undefined' && UIHelpers.openPersistentSidebar) {
                    UIHelpers.openPersistentSidebar();
                    console.log('📂 Sidebar opened by default');
                }
            }, 500);
        }

        // Apply legend visibility
        const legend = document.getElementById('legend');
        if (legend) {
            legend.style.display = uiSettings.showLegend ? 'block' : 'none';
            console.log(`🗺️ Legend visibility: ${uiSettings.showLegend ? 'visible' : 'hidden'}`);
        }

        // Apply coordinate tooltip setting (this affects the mousemove handler)
        if (!uiSettings.showCoordinateTooltip && window.map) {
            // Note: The actual tooltip is created in map.js, this just sets a flag
            window.SETTINGS_SHOW_COORDINATE_TOOLTIP = uiSettings.showCoordinateTooltip;
        }

        // Apply status indicator visibility
        const statusIndicator = document.querySelector('[style*="Go Backend Active"]')?.parentElement;
        if (statusIndicator) {
            statusIndicator.style.display = uiSettings.showStatusIndicator ? 'block' : 'none';
            console.log(`📡 Status indicator: ${uiSettings.showStatusIndicator ? 'visible' : 'hidden'}`);
        }
    }

    /**
     * Apply feature toggle settings
     */
    function applyFeatureSettings(featureSettings) {
        // Store feature settings globally for access by other modules
        window.SETTINGS_FEATURES = featureSettings;

        // Note: Draw tools visibility is controlled by Leaflet.draw initialization
        // This would need to be implemented in the draw initialization code

        console.log('🔧 Feature settings applied:', featureSettings);

        // Set up auto-save if enabled
        if (featureSettings.autoSaveInterval > 0) {
            setupAutoSave(featureSettings.autoSaveInterval);
        }
    }

    /**
     * Set up auto-save functionality
     */
    function setupAutoSave(interval) {
        console.log(`💾 Auto-save enabled: every ${interval / 60000} minutes`);

        setInterval(() => {
            console.log('💾 Auto-save triggered...');
            // This would trigger actual save functionality
            // For now, just log the action
            if (typeof MarkerManager !== 'undefined') {
                console.log('💾 Auto-saving marker states...');
                // MarkerManager could implement an auto-save method here
            }
        }, interval);
    }

    /**
     * Get current applied settings
     */
    function getCurrentSettings() {
        return SettingsManager.getSettings();
    }

    // Public API
    return {
        applySettings,
        getCurrentSettings
    };
})();

// Apply settings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for other modules to initialize
        setTimeout(() => SettingsApplier.applySettings(), 100);
    });
} else {
    setTimeout(() => SettingsApplier.applySettings(), 100);
}
