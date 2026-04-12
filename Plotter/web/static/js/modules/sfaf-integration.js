/**
 * SFAF Integration Module
 *
 * Manages SFAF form integration, validation, and MC4EB Publication 7, Change 1 compliance
 */

const SFAFIntegration = (() => {

    // MC4EB Publication 7, Change 1 field mapping (June 30, 2005)
    const SFAF_FIELD_MAPPING = {
        // Administrative Data
        'field005': 'field005',    // Security Classification
        'field010': 'field010',    // Type of Action
        'field013': 'field013',    // Declassification Instruction Comment
        'field019': 'field019',    // Declassification Date
        'field102': 'field102',    // Agency Serial Number
        'field701': 'field701',    // Frequency Action Officer
        'field702': 'field702',    // Control/Request Number

        // Emission Characteristics (map to _1 variants)
        'field110': 'field110_1',  // Frequency(ies)
        'field113': 'field113_1',  // Station Class
        'field114': 'field114_1',  // Emission Designator
        'field115': 'field115_1',  // Transmitter Power
        'field116': 'field116_1',  // Power Type (C/M/P)
        'field117': 'field117_1',  // Effective Radiated Power
        'field118': 'field118_1',  // Power/ERP Augmentation

        // Time/Date Information
        'field130': 'field130',    // Time
        'field131': 'field131',    // Percent Time
        'field142': 'field142',    // Review Date
        'field143': 'field143',    // Revision Date
        'field144': 'field144',    // Approval Authority

        // Organizational Information
        'field200': 'field200',    // Agency (USAF, USA, USN, USMC, USCG)
        'field201': 'field201',    // Unified Command
        'field202': 'field202',    // Unified Command Service
        'field204': 'field204',    // Command
        'field205': 'field205',    // Subcommand
        'field206': 'field206',    // Installation Frequency Manager
        'field207': 'field207',    // Operating Unit
        'field209': 'field209',    // Area AFC/DoD AFC

        // Transmitter Location
        'field300': 'field300',    // State/Country (A-Z geographic codes)
        'field301': 'field301',    // Antenna Location
        'field303': 'field303',    // Antenna Coordinates
        'field306': 'field306',    // Authorized Radius

        // Transmitter Equipment
        'field340': 'field340_1',  // Equipment Nomenclature
        'field343': 'field343_1',  // Equipment Certification ID

        // Transmitter Antenna
        'field357': 'field357',    // Antenna Gain
        'field362': 'field362',    // Antenna Orientation
        'field363': 'field363',    // Antenna Polarization (V/H/C)
        'field373': 'field373',    // JSC Area Code (A-Z)

        // Receiver Location
        'field400': 'field400',    // State/Country
        'field401': 'field401',    // Antenna Location
        'field403': 'field403',    // Antenna Coordinates

        // Receiver Equipment
        'field440': 'field440_1',  // Equipment Nomenclature
        'field443': 'field443_1',  // Equipment Certification ID

        // Receiver Antenna
        'field457': 'field457',    // Antenna Gain
        'field462': 'field462',    // Antenna Orientation
        'field463': 'field463',    // Antenna Polarization (V/H/C)
        'field473': 'field473',    // JSC Area Code (A/B/C/D)

        // Supplementary Details
        'field500': 'field500_1',  // IRAC Notes (C/E/L/P/S codes)
        'field501': 'field501_1',  // Notes/Comments
        'field502': 'field502',    // Description of Requirement
        'field503': 'field503',    // Agency Free-text Comments
        'field511': 'field511',    // Major Function Identifier
        'field512': 'field512',    // Intermediate Function Identifier
        'field513': 'field513',    // Minor Function Identifier
        'field520': 'field520',    // Supplementary Details

        // Other Assignment Identifiers
        'field716': 'field716',    // Usage Code
        'field801': 'field801',    // Coordination Data/Remarks
        'field803': 'field803',    // Requestor Data POC
        'field804': 'field804',    // Additional Assignment Data

        // Deprecated fields (no longer used per MC4EB Pub 7 CHG 1)
        'field208': null,
        'field407': null,
        'field470': null,
        'field471': null,
        'field472': null,
        'field903': null,
        'field101': null,
        'field103': null,
        'field107': null
    };

    /**
     * Open sidebar and load SFAF data for a marker
     */
    async function openSidebar(markerId) {
        try {
            console.log('🔍 Opening sidebar for marker:', markerId);
            console.log('🔍 About to fetch SFAF data from API...');

            const data = await APIClient.fetchSFAFData(markerId);
            console.log('📡 API Response:', data);

            if (data.success) {
                // Open sidebar, show object tab, switch to it, then populate
                UIHelpers.openPersistentSidebar();
                UIHelpers.manageObjectTabVisibility(true);
                UIHelpers.switchTab('object');
                populateSFAFForm(data);
            } else {
                console.error('❌ API returned error:', data.error);
                UIHelpers.manageObjectTabVisibility(false);
            }
        } catch (error) {
            console.error('❌ Failed to load SFAF data:', error);
            console.error('❌ Error details:', error.message, error.stack);
            UIHelpers.manageObjectTabVisibility(false);
        }
    }

    /**
     * Populate SFAF form with data from backend
     */
    function populateSFAFForm(data) {
        window.currentSFAFMarker = data.marker;

        // Store SFAF ID if it exists (for updates vs creates)
        window.currentSFAFMarker.sfaf_id = data.sfaf ? data.sfaf.id : null;
        window.currentSFAFMarker.sfaf_exists = data.sfaf_exists || false;

        console.log('📝 SFAF form populated:', {
            marker_id: window.currentSFAFMarker.id,
            sfaf_id: window.currentSFAFMarker.sfaf_id,
            sfaf_exists: window.currentSFAFMarker.sfaf_exists,
            has_sfaf_data: !!data.sfaf
        });

        // Auto-populate coordinate fields (field 303/403 per MC4EB Pub 7 CHG 1)
        if (data.coordinates) {
            setFieldValue('field303', data.coordinates.compact);
            setFieldValue('field403', data.coordinates.compact);
        }

        // Auto-populate field 306 (Authorization Radius) if marker has linked circle
        const marker = MarkerManager.getMarkerById(window.currentSFAFMarker.id);
        if (marker && marker.linkedCircle && marker.linkedCircle.geometryData) {
            const circleData = marker.linkedCircle.geometryData;
            const field306Value = `${Math.round(circleData.radius)}${circleData.unit === 'nm' ? 'T' : 'B'}`;
            setFieldValue('field306', field306Value);
        }

        // Populate SFAF fields using official MC4EB Pub 7 CHG 1 mapping
        // Backend returns "fields" when SFAF exists, "auto_populated_fields" when it doesn't
        const fieldsData = data.fields || data.auto_populated_fields;

        console.log('📋 Fields data source:', data.fields ? 'data.fields' : data.auto_populated_fields ? 'data.auto_populated_fields' : 'none');
        console.log('📋 Fields data:', fieldsData);

        if (fieldsData) {
            let successCount = 0;
            let skippedCount = 0;
            let deprecatedCount = 0;
            let unknownCount = 0;

            Object.entries(fieldsData).forEach(([importedFieldId, value]) => {

                // Handle field500 variants (500/02, 500/03, etc.) per MC4EB Pub 7 CHG 1 Annex F
                if (importedFieldId.startsWith('field500/')) {
                    const parts = importedFieldId.split('/');
                    if (parts.length === 2) {
                        const number = parseInt(parts[1]);
                        const targetFieldId = `field500_${number}`;
                        if (setFieldValue(targetFieldId, value)) {
                            successCount++;
                        }
                    }
                    return;
                }

                // Handle field103 variants (additional serial numbers per MC4EB Pub 7 CHG 1)
                if (importedFieldId.startsWith('field103/')) {
                    skippedCount++;
                    return;
                }

                // Use official MC4EB Pub 7 CHG 1 mapping
                const actualFieldId = SFAF_FIELD_MAPPING[importedFieldId];

                if (actualFieldId === null) {
                    // Deprecated field
                    const deprecatedFields = ['field208', 'field407', 'field470', 'field471', 'field472', 'field903'];
                    if (deprecatedFields.includes(importedFieldId)) {
                        deprecatedCount++;
                    } else {
                        skippedCount++;
                    }
                } else if (actualFieldId) {
                    if (setFieldValue(actualFieldId, value)) {
                        successCount++;
                    }
                } else {
                    // Try the original field ID as fallback
                    if (setFieldValue(importedFieldId, value)) {
                        successCount++;
                    } else {
                        unknownCount++;
                    }
                }
            });

            // Generate MC4EB Pub 7 CHG 1 compliance summary
            console.log(`📊 MC4EB Publication 7, Change 1 Import Results:`);
            console.log(`  ✅ Successfully populated: ${successCount} fields`);
            console.log(`  ⚠️ Skipped (not in form): ${skippedCount} fields`);
            console.log(`  🔄 Deprecated (MC4EB Pub 7 CHG 1): ${deprecatedCount} fields`);
            console.log(`  ❓ Unknown fields: ${unknownCount} fields`);
            console.log(`  📖 Reference: MC4EB Publication 7, Change 1 (08 May 2025)`);

            // Show compliance notification
            if (successCount > 0) {
                UIHelpers.showComplianceNotification(successCount, skippedCount + deprecatedCount + unknownCount);
            }
        }
    }

    /**
     * Set a field value in the form
     */
    function setFieldValue(formFieldId, value) {
        if (!formFieldId || !value) return false;

        const field = document.getElementById(formFieldId);
        if (field) {
            field.value = value;
            field.dispatchEvent(new Event('change'));
            return true;
        }
        return false;
    }

    /**
     * Collect all SFAF form data
     */
    function collectSFAFFormData() {
        const formData = {};

        // Get the object tab container
        const objectTab = document.getElementById('tab-object');
        if (!objectTab) {
            console.warn('Object tab not found, collecting from entire document');
            const allFields = document.querySelectorAll('input[id^="field"], select[id^="field"], textarea[id^="field"]');
            allFields.forEach(field => {
                if (field.value && field.value.trim() !== '') {
                    formData[field.id] = field.value.trim();
                }
            });
            return formData;
        }

        // Collect from various field patterns in the object tab
        const patterns = [
            'input[id^="field"]',
            'select[id^="field"]',
            'textarea[id^="field"]',
            '[data-field]',
            'input[name^="field"]',
            'select[name^="field"]',
            'textarea[name^="field"]'
        ];

        patterns.forEach(pattern => {
            const fields = objectTab.querySelectorAll(pattern);
            fields.forEach(field => {
                let fieldId = field.id;

                // Handle data-field attributes
                if (field.dataset.field && !fieldId.startsWith('field')) {
                    fieldId = 'field' + field.dataset.field;
                }

                // Handle name attributes
                if (!fieldId && field.name) {
                    fieldId = field.name;
                }

                if (fieldId && field.value && field.value.trim() !== '') {
                    formData[fieldId] = field.value.trim();
                }
            });
        });

        return formData;
    }

    /**
     * Validate SFAF form
     */
    async function validateSFAF() {
        const formData = collectSFAFFormData();

        try {
            const result = await APIClient.validateSFAFFields(formData);

            if (result.success) {
                applySFAFValidationResults(result.validation);
                UIHelpers.showSFAFStatusMessage(
                    result.validation.is_valid ? '✅ Form validation passed!' : '❌ Form has validation errors',
                    result.validation.is_valid ? 'success' : 'error'
                );
            }
        } catch (error) {
            console.error('Validation failed:', error);
            UIHelpers.showSFAFStatusMessage('❌ Validation failed. Please try again.', 'error');
        }
    }

    /**
     * Apply validation results to form fields
     */
    function applySFAFValidationResults(validation) {
        // Clear previous validation styles
        const objectTab = document.getElementById('tab-object');
        const fieldsToCheck = objectTab ?
            objectTab.querySelectorAll('input, select, textarea') :
            document.querySelectorAll('input[id^="field"], select[id^="field"], textarea[id^="field"]');

        fieldsToCheck.forEach(field => {
            field.style.borderColor = '';
            field.classList.remove('validation-error', 'validation-success');

            // Remove any existing validation messages
            const existingMsg = field.parentNode?.querySelector('.validation-message');
            if (existingMsg) {
                existingMsg.remove();
            }
        });

        // Apply validation results
        if (validation.fields) {
            Object.entries(validation.fields).forEach(([fieldId, fieldData]) => {
                const field = UIHelpers.findFieldByAnyMeans(fieldId);

                if (field) {
                    const hasError = validation.errors && validation.errors[fieldId];
                    const hasValue = fieldData.value && fieldData.value.trim() !== '';

                    if (hasError) {
                        field.style.borderColor = '#f44336';
                        field.classList.add('validation-error');

                        // Add error message
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'validation-message';
                        errorMsg.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 2px;';
                        errorMsg.textContent = validation.errors[fieldId];
                        if (field.parentNode) {
                            field.parentNode.appendChild(errorMsg);
                        }

                    } else if (hasValue) {
                        field.style.borderColor = '#4CAF50';
                        field.classList.add('validation-success');
                    }
                }
            });
        }
    }

    /**
     * Save SFAF data to backend
     */
    async function saveSFAF() {
        if (!window.currentSFAFMarker) {
            UIHelpers.showSFAFStatusMessage('❌ No marker selected', 'error');
            return;
        }

        console.log('💾 Saving SFAF for marker:', window.currentSFAFMarker);
        const formData = collectSFAFFormData();
        console.log('📋 Form data collected:', formData);

        // Validate required MC4EB fields before saving
        const requiredFields = {
            'field005': '005 - Security Classification',
            'field010': '010 - Type of Action',
            'field102': '102 - Agency Serial Number',
            'field110': '110 - Frequency',
            'field200': '200 - Agency Code'
        };

        const missingFields = [];
        for (const [fieldKey, fieldLabel] of Object.entries(requiredFields)) {
            if (!formData[fieldKey] || formData[fieldKey].trim() === '') {
                missingFields.push(fieldLabel);
            }
        }

        if (missingFields.length > 0) {
            const errorMsg = `Cannot save SFAF record. The following required MC4EB fields are missing:\n\n${missingFields.join('\n')}`;
            UIHelpers.showSFAFStatusMessage('❌ ' + errorMsg, 'error');
            alert(errorMsg);
            return;
        }

        try {
            let result;
            if (window.currentSFAFMarker.sfaf_id) {
                // Update existing SFAF record
                console.log('🔄 Updating existing SFAF record:', window.currentSFAFMarker.sfaf_id);
                result = await APIClient.updateSFAFData(
                    window.currentSFAFMarker.sfaf_id,
                    formData
                );
            } else {
                // Create new SFAF record
                console.log('➕ Creating new SFAF record');
                result = await APIClient.saveSFAFData(window.currentSFAFMarker.id, formData);

                // Store the new SFAF ID for future updates
                if (result.success && result.sfaf && result.sfaf.id) {
                    window.currentSFAFMarker.sfaf_id = result.sfaf.id;
                    window.currentSFAFMarker.sfaf_exists = true;
                }
            }

            if (result.success) {
                UIHelpers.showSFAFStatusMessage('✅ SFAF data saved successfully!', 'success');
            } else {
                UIHelpers.showSFAFStatusMessage('❌ Failed to save: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Save failed:', error);
            // Show specific error message if available
            const errorMessage = error.message || error.toString();
            UIHelpers.showSFAFStatusMessage('❌ Save failed: ' + errorMessage, 'error');
        }
    }

    /**
     * Export SFAF data to JSON file
     */
    async function exportSFAF() {
        if (!window.currentSFAFMarker) {
            UIHelpers.showSFAFStatusMessage('❌ No marker selected', 'error');
            return;
        }

        const formData = collectSFAFFormData();

        const exportData = {
            marker: window.currentSFAFMarker,
            sfaf_fields: formData,
            exported_at: new Date().toISOString(),
            format: 'SFAF_JSON_v1.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SFAF_${window.currentSFAFMarker.serial}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        UIHelpers.showSFAFStatusMessage('📤 SFAF data exported successfully!', 'success');
    }

    /**
     * Delete SFAF record and marker
     */
    async function deleteSFAF() {
        if (!window.currentSFAFMarker) {
            UIHelpers.showSFAFStatusMessage('❌ No marker selected', 'error');
            return;
        }

        if (confirm(`Delete marker ${window.currentSFAFMarker.serial} and all associated SFAF data?\n\nThis action cannot be undone.`)) {
            try {
                const success = await MarkerManager.deleteMarker(window.currentSFAFMarker.id);

                if (success) {
                    // Remove authorization circle
                    CircleManager.removeAuthorizationCircle();

                    // Close sidebar
                    UIHelpers.closePersistentSidebar();

                    UIHelpers.showSFAFStatusMessage('✅ Object deleted successfully!', 'success');

                    // Clear current marker reference
                    window.currentSFAFMarker = null;
                } else {
                    UIHelpers.showSFAFStatusMessage('❌ Failed to delete object', 'error');
                }
            } catch (error) {
                console.error('Delete failed:', error);
                UIHelpers.showSFAFStatusMessage('❌ Delete failed. Please try again.', 'error');
            }
        }
    }

    /**
     * Setup authorization radius integration with Field 306
     */
    function setupAuthorizationRadius() {
        const field306 = document.getElementById('field306');
        if (!field306) return;

        // Remove existing event listeners to prevent duplicates
        const newField306 = field306.cloneNode(true);
        field306.parentNode.replaceChild(newField306, field306);

        // Add change listener to field 306
        newField306.addEventListener('input', async () => {
            const radiusValue = newField306.value.trim();

            if (radiusValue && window.currentSFAFMarker) {
                try {
                    await CircleManager.createAuthorizationCircle(radiusValue);

                    // Update existing linked circle if it exists
                    const marker = MarkerManager.getMarkerById(window.currentSFAFMarker.id);
                    if (marker && marker.linkedCircle) {
                        CircleManager.updateCircleFromField306(marker.linkedCircle, radiusValue);
                    }
                } catch (error) {
                    console.error('Failed to create authorization circle:', error);
                }
            } else {
                CircleManager.removeAuthorizationCircle();
            }
        });
    }

    /**
     * Wire up SFAF action buttons
     */
    function wireUpActionButtons() {
        const validateBtn = document.getElementById('validateSFAFBtn');
        const saveBtn = document.getElementById('saveSFAFBtn');
        const exportBtn = document.getElementById('exportSFAFBtn');
        const deleteBtn = document.getElementById('deleteSFAFBtn');

        if (validateBtn) {
            validateBtn.onclick = validateSFAF;
        }

        if (saveBtn) {
            saveBtn.onclick = saveSFAF;
        }

        if (exportBtn) {
            exportBtn.onclick = exportSFAF;
        }

        if (deleteBtn) {
            deleteBtn.onclick = deleteSFAF;
        }
    }

    // Public API
    return {
        // Sidebar
        openSidebar,

        // Form operations
        populateSFAFForm,
        collectSFAFFormData,

        // Actions
        validateSFAF,
        saveSFAF,
        exportSFAF,
        deleteSFAF,

        // Setup
        setupAuthorizationRadius,
        wireUpActionButtons
    };
})();

// Make globally available
window.SFAFIntegration = SFAFIntegration;
