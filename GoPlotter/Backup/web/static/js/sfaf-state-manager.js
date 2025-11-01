// sfaf-state-manager.js - SFAF Form State Management
// Auto-save, restore, and state management functionality

class SFAFStateManager {
    constructor() {
        this.autoSaveInterval = null;
        this.debounceTimeout = null;
    }

    // State management methods from sources
    saveFormState() {
        const formData = this.collectFormData();
        const stateData = {
            formData: formData,
            timestamp: new Date().toISOString(),
            version: 'MCEB_PUB_7_2005'
        };
        localStorage.setItem('sfafFormState', JSON.stringify(stateData));
        this.log('💾 SFAF form state saved');
    }

    restoreFormState() {
        const savedState = localStorage.getItem('sfafFormState');
        if (savedState) {
            try {
                const stateData = JSON.parse(savedState);
                this.populateFormFromData(stateData.formData);
                this.log('🔄 SFAF form state restored from', stateData.timestamp);
                return true;
            } catch (error) {
                this.error('❌ Error restoring form state:', error);
                return false;
            }
        }
        return false;
    }

    enableAutoSave(intervalMinutes = 5) {
        setInterval(() => {
            this.saveFormState();
        }, intervalMinutes * 60000);

        // Save on form changes
        document.addEventListener('input', this.debounce(() => {
            this.saveFormState();
        }, 2000));

        this.log(`💾 Auto-save enabled every ${intervalMinutes} minutes`); // Fixed line
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    collectFormData() {
        const formData = {};

        Object.keys(this.fieldSpecs).forEach(baseFieldId => {
            const spec = this.fieldSpecs[baseFieldId];

            if (spec.dynamic) {
                // Collect dynamic field data
                const values = [];
                for (let i = 1; i <= spec.maxOccurrences; i++) {
                    const field = document.getElementById(`${baseFieldId}_${i}`);
                    if (field && field.value.trim()) {
                        values.push(field.value.trim());
                    }
                }
                if (values.length > 0) {
                    formData[baseFieldId] = values;
                }
            } else {
                // Collect single field data
                const field = document.getElementById(baseFieldId);
                if (field && field.value.trim()) {
                    formData[baseFieldId] = field.value.trim();
                }
            }
        });

        return formData;
    }
}