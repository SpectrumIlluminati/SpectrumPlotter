// sfaf-export-import.js - SFAF Export/Import Functionality
// MCEB Publication 7 compliant export and import operations

class SFAFExportImport {
    constructor(fieldSpecs) {
        this.fieldSpecs = fieldSpecs;
    }

    // Export methods from sources
    exportCompleteFormattedSFAF() {
        const formData = this.collectFormData();
        const sfafLines = [];

        // MCEB Pub 7 standard header
        sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
        sfafLines.push('MCEB Publication 7, June 30, 2005');
        sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
        sfafLines.push(`System: SFAF Plotter - Go Edition v1.0`);
        sfafLines.push('');

        // Export all fields in proper MCEB order
        const fieldOrder = [
            '005', '010', '013', '019', '102', '701', '702',
            '110', '113', '114', '115', '116', '117', '118',
            '130', '131', '140', '141', '142', '143', '144',
            '200', '201', '202', '204', '205', '206', '207', '208', '209',
            '300', '301', '303', '306',
            '340', '343', '357', '362', '363', '373',
            '400', '401', '403', '407',
            '440', '443', '457', '462', '463', '470', '471', '472', '473',
            '500', '501', '502', '503', '511', '512', '513', '520',
            '716', '801', '803', '804', '903'
        ];

        fieldOrder.forEach(fieldNum => {
            const fieldId = `field${fieldNum}`;
            const data = formData[fieldId];

            if (data) {
                if (Array.isArray(data)) {
                    data.forEach((value, index) => {
                        if (index === 0) {
                            sfafLines.push(`${fieldNum}. ${value}`);
                        } else {
                            const occurrence = (index + 1).toString().padStart(2, '0');
                            sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                        }
                    });
                } else {
                    sfafLines.push(`${fieldNum}. ${data}`);
                }
            }
        });

        sfafLines.push('');
        sfafLines.push('***** END OF SFAF RECORD *****');

        return sfafLines.join('\n');
    }

    exportFinalSFAFRecord() {
        const formData = this.collectFormData();
        const sfafLines = [];

        // MCEB Pub 7 standard header
        sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
        sfafLines.push('MCEB Publication 7, June 30, 2005');
        sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);

        // Export in official MCEB field order
        const fieldOrder = [
            '005', '010', '013', '019', '102', '701', '702',
            '110', '113', '114', '115', '116', '117', '118',
            // ... complete field order
        ];

        // Handle multiple occurrences properly
        fieldOrder.forEach(fieldNum => {
            const data = formData[`field${fieldNum}`];
            if (Array.isArray(data)) {
                data.forEach((value, index) => {
                    if (index === 0) {
                        sfafLines.push(`${fieldNum}. ${value}`);
                    } else {
                        const occurrence = (index + 1).toString().padStart(2, '0');
                        sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                    }
                });
            }
        });

        return sfafLines.join('\n');
    }

    generateComplianceReport() {
        const formData = this.collectFormData();
        const report = [];

        report.push('MCEB Publication 7 Compliance Report');
        report.push('====================================');
        report.push(`Generated: ${new Date().toLocaleString()}`);
        report.push('');

        // Check required fields per MCEB Pub 7
        const requiredFields = {
            'field005': 'Security Classification',
            'field010': 'Type of Action',
            'field102': 'Agency Serial Number',
            'field110': 'Frequency(ies)',
            'field113': 'Station Class',
            'field114': 'Emission Designator',
            'field115': 'Transmitter Power',
            'field200': 'Agency',
            'field300': 'State/Country (TX)',
            'field301': 'Antenna Location (TX)',
            'field303': 'Antenna Coordinates (TX)',
            'field400': 'State/Country (RX)',
            'field401': 'Antenna Location (RX)',
            'field403': 'Antenna Coordinates (RX)'
        };

        let missingRequired = 0;
        let presentRequired = 0;

        Object.entries(requiredFields).forEach(([fieldId, title]) => {
            const value = formData[fieldId] || (Array.isArray(formData[fieldId]) ? formData[fieldId][0] : null);
            if (value) {
                presentRequired++;
            } else {
                missingRequired++;
                report.push(`❌ MISSING REQUIRED: ${fieldId} - ${title}`);
            }
        });

        report.push('');
        report.push(`Required Fields Status: ${presentRequired}/${presentRequired + missingRequired} complete`);
        report.push('');

        // Check field occurrence limits
        let exceedsLimits = 0;
        Object.keys(this.fieldSpecs).forEach(baseFieldId => {
            const spec = this.fieldSpecs[baseFieldId];
            if (spec.dynamic) {
                const values = formData[baseFieldId];
                if (Array.isArray(values) && values.length > spec.maxOccurrences) {
                    exceedsLimits++;
                    report.push(`⚠️ EXCEEDS LIMIT: ${baseFieldId} has ${values.length} occurrences (max: ${spec.maxOccurrences})`);
                }
            }
        });

        if (exceedsLimits === 0) {
            report.push('✅ All field occurrence limits compliant with MCEB Pub 7');
        }

        report.push('');
        report.push(`Overall Compliance: ${missingRequired === 0 && exceedsLimits === 0 ? 'COMPLIANT' : 'NON-COMPLIANT'}`);

        return report.join('\n');
    }

    // Import methods
    parseImportedSFAF(importText) {
        const lines = importText.split('\n');
        const fieldData = {};

        // Define auto-generated fields to skip during import
        const autoGeneratedFields = [
            '103', '107', '117', '118', '373', '402', '473', '901', '904', '911', '924', '927', '928', '956'
        ];

        lines.forEach(line => {
            // Ignore computer-generated content
            if (this.isComputerGenerated(line)) {
                return;
            }

            // Parse field data
            const fieldMatch = line.match(/^(\d{3})(?:\/\d{2})?\.?\s*(.+)$/);
            if (fieldMatch) {
                const fieldNum = fieldMatch[1];
                const fieldValue = fieldMatch[2].trim();

                // Skip auto-generated fields
                if (autoGeneratedFields.includes(fieldNum)) {
                    this.log(`⚠️ Skipping auto-generated field ${fieldNum}: ${fieldValue}`);
                    return;
                }

                // Store only manually-entered field data
                if (!fieldData[`field${fieldNum}`]) {
                    fieldData[`field${fieldNum}`] = [];
                }
                fieldData[`field${fieldNum}`].push(fieldValue);
            }
        });

        return fieldData;
    }
    populateFormFromData(formData) {
        Object.keys(formData).forEach(fieldId => {
            const value = formData[fieldId];

            if (Array.isArray(value)) {
                // Handle dynamic fields
                value.forEach((val, index) => {
                    const field = document.getElementById(`${fieldId}_${index + 1}`);
                    if (field) {
                        field.value = val;
                    } else if (index > 0) {
                        // Create additional occurrences if needed
                        this.addFieldOccurrence(fieldId, this.fieldSpecs[fieldId]);
                        const newField = document.getElementById(`${fieldId}_${index + 1}`);
                        if (newField) newField.value = val;
                    }
                });
            } else {
                // Handle single fields
                const field = document.getElementById(fieldId);
                if (field) field.value = value;
            }
        });
    }

    mapImportedFieldId(importedFieldId) {
        const fieldMappings = {
            'security_classification': 'field005',
            'type_of_action': 'field010',
            'agency_serial': 'field102',
            'frequency': 'field110_1',
            'station_class': 'field113_1',
            'emission': 'field114_1',
            'power': 'field115_1',
            'agency': 'field200',
            'tx_state': 'field300',
            'tx_location': 'field301',
            'tx_coordinates': 'field303',
            'rx_state': 'field400',
            'rx_location': 'field401',
            'rx_coordinates': 'field403'
        };

        return fieldMappings[importedFieldId] || null;
    }

    processField500Variants(importedFieldId, value) {
        if (importedFieldId.startsWith('500/')) {
            const occurrence = importedFieldId.split('/')[1];
            const targetFieldId = `field500_${parseInt(occurrence)}`;

            if (setFieldValue(targetFieldId, value)) {
                return { success: true };
            } else {
                // Create dynamic occurrence if needed
                sfafFieldManager.addFieldOccurrence('field500', sfafFieldManager.fieldSpecs['field500']);
                return { success: setFieldValue(targetFieldId, value) };
            }
        }
        return { success: false };
    }
}

// Utility functions from sources
function downloadSFAF(sfafData, filename = 'sfaf_record.txt') {
    // Implementation from sources
}

function populateCoordinatesFromMap(data) {
    // Implementation from sources
}