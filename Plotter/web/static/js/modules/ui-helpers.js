/**
 * UI Helpers Module
 *
 * Manages UI components: sidebar, tabs, notifications, and status messages
 */

const UIHelpers = (() => {

    // ==================== Sidebar Management ====================

    /**
     * Open the persistent sidebar
     */
    function openPersistentSidebar() {
        const sidebar = document.getElementById('persistentSidebar');
        if (sidebar) {
            sidebar.classList.add('open');
            console.log('✅ Sidebar opened');
        } else {
            console.error('❌ persistentSidebar element not found');
        }
    }

    /**
     * Close the persistent sidebar
     */
    function closePersistentSidebar() {
        const sidebar = document.getElementById('persistentSidebar');
        if (sidebar) {
            sidebar.classList.remove('open');

            // Hide Object tab when sidebar is closed
            manageObjectTabVisibility(false);

            // Clear current marker reference
            if (window.currentSFAFMarker) {
                window.currentSFAFMarker = null;
            }
        }
    }

    // ==================== Tab Management ====================

    /**
     * Switch between sidebar tabs
     */
    function switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const targetPanel = document.getElementById(`tab-${tabId}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    /**
     * Manage object tab visibility
     */
    function manageObjectTabVisibility(hasSelectedMarker = false) {
        const objectTab = document.getElementById('objectTab');
        const objectTabBtn = document.querySelector('[data-tab="object"]');

        console.log('🔍 Object tab element:', objectTab);
        console.log('🔍 Object tab button:', objectTabBtn);

        if (objectTab && objectTabBtn) {
            if (hasSelectedMarker) {
                objectTab.style.display = 'block';
                objectTabBtn.style.display = 'block';
                console.log('✅ Object tab shown');
            } else {
                objectTab.style.display = 'none';
                objectTabBtn.style.display = 'none';

                if (objectTabBtn.classList.contains('active')) {
                    switchTab('overview');
                }
                console.log('✅ Object tab hidden');
            }
        } else {
            console.error('❌ Object tab elements not found');
        }
    }

    // ==================== Notification System ====================

    /**
     * Show a general notification message
     */
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existing = document.querySelectorAll('.notification-message');
        existing.forEach(msg => msg.remove());

        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };

        const notification = document.createElement('div');
        notification.className = 'notification-message';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 25px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Show SFAF-specific status message
     */
    function showSFAFStatusMessage(message, type) {
        // Remove any existing status messages
        const existing = document.querySelectorAll('.sfaf-status-message');
        existing.forEach(msg => msg.remove());

        // Create status message
        const statusDiv = document.createElement('div');
        statusDiv.className = 'sfaf-status-message';
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 470px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 2000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
        `;
        statusDiv.textContent = message;
        document.body.appendChild(statusDiv);

        setTimeout(() => statusDiv.remove(), 4000);
    }

    /**
     * Show MC4EB Publication 7, Change 1 compliance notification
     */
    function showComplianceNotification(successCount, totalSkipped) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 500px;
            text-align: center;
        `;

        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">
                📖 MC4EB Publication 7, Change 1 Compliance
            </div>
            <div style="font-size: 0.9em; opacity: 0.95;">
                ${successCount} fields populated successfully<br>
                ${totalSkipped} fields skipped (deprecated/not applicable)<br>
                <strong>Standard: MC4EB Pub 7 CHG 1 (08 May 2025)</strong>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // ==================== Utility Functions ====================

    /**
     * Find a field by any means (id, data-field, name)
     */
    function findFieldByAnyMeans(fieldId) {
        // Try multiple strategies to find the field
        let field = document.getElementById(fieldId);

        if (!field) {
            const fieldNumber = fieldId.replace('field', '');
            field = document.querySelector(`[data-field="${fieldNumber}"]`);
        }

        if (!field) {
            field = document.querySelector(`[name="${fieldId}"]`);
        }

        if (!field) {
            // Try partial matches
            field = document.querySelector(`[id*="${fieldId}"]`);
        }

        return field;
    }

    // Public API
    return {
        // Sidebar
        openPersistentSidebar,
        closePersistentSidebar,

        // Tabs
        switchTab,
        manageObjectTabVisibility,

        // Notifications
        showNotification,
        showSFAFStatusMessage,
        showComplianceNotification,

        // Utilities
        findFieldByAnyMeans
    };
})();

// Make globally available
window.UIHelpers = UIHelpers;

// Add simple slide-in animation
if (!document.getElementById('ui-helpers-styles')) {
    const style = document.createElement('style');
    style.id = 'ui-helpers-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);
}
