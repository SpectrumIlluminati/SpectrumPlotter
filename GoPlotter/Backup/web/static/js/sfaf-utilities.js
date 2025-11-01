// sfaf-utilities.js - SFAF Utility Functions
// Helper functions and utilities for SFAF Field Manager

// Notification system from sources
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };

    const color = colors[type];
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        color: ${color.text};
        border: 1px solid ${color.border};
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 10000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

function setFieldValue(formFieldId, value) {
    if (!formFieldId || !value) return false;

    const field = document.getElementById(formFieldId);
    if (field) {
        this.log(`✅ Setting ${formFieldId} = ${value}`);
        field.value = value;
        field.dispatchEvent(new Event('change'));

        // Trigger MCEB Pub 7 validation if field manager is available
        if (window.sfafFieldManager) {
            window.sfafFieldManager.validateField(field);
        }

        return true;
    }
    return false;
}

// Setup global keyboard shortcuts for SFAF operations
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S: Save form state
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            sfafFieldManager.saveFormState();
            showNotification('Form state saved', 'success');
        }

        // Ctrl+E: Export SFAF
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            const sfafData = sfafFieldManager.exportFinalSFAFRecord();
            downloadSFAF(sfafData);
        }

        // Ctrl+V: Validate form
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            sfafFieldManager.validateEntireForm();
        }
    });

    // Show initialization errors
    function showInitializationError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
        z-index: 10000;
        font-family: monospace;
    `;
        errorDiv.innerHTML = `
        <strong>❌ SFAF Manager Initialization Failed</strong><br>
        ${error.message}<br>
        <small>Check console for details</small>
    `;
        document.body.appendChild(errorDiv);
    }

    function updateCharacterCounter(field, maxLength) {
        let counter = field.parentNode.querySelector('.char-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.style.cssText = `
            font-size: 0.8em;
            color: #666;
            text-align: right;
            margin-top: 2px;
            font-family: monospace;
        `;
            field.parentNode.appendChild(counter);
        }

        const remaining = maxLength - field.value.length;
        counter.textContent = `${field.value.length}/${maxLength}`;

        // Color coding based on remaining characters
        if (remaining < 5) {
            counter.style.color = '#dc3545';  // Red when near limit
        } else if (remaining < 20) {
            counter.style.color = '#ffc107';  // Yellow when approaching limit
        } else {
            counter.style.color = '#666';     // Gray when safe
        }
    }

    // clearAllFields function (missing from sources - needs to be implemented)
    function clearAllFields() {
        // Clear all SFAF fields based on fieldSpecs
        Object.keys(this.fieldSpecs).forEach(baseFieldId => {
            const spec = this.fieldSpecs[baseFieldId];

            if (spec.dynamic) {
                // Clear dynamic fields (multiple occurrences)
                for (let i = 1; i <= spec.maxOccurrences; i++) {
                    const field = document.getElementById(`${baseFieldId}_${i}`);
                    if (field) {
                        field.value = '';
                        this.clearFieldErrors(field);
                    }
                }
            } else {
                // Clear single occurrence fields
                const field = document.getElementById(baseFieldId);
                if (field) {
                    field.value = '';
                    this.clearFieldErrors(field);
                }
            }
        });

        // Clear any validation summaries
        const validationSummaries = document.querySelectorAll('.validation-summary');
        validationSummaries.forEach(summary => summary.remove());

        console.log('✅ All SFAF fields cleared');
    }
}