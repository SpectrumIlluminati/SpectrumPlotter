// sfaf-compliance.js - MCEB Publication 7 Compliance Functions
// Compliance checking and validation per official standards

class SFAFCompliance {
    constructor(fieldSpecs, referenceData) {
        this.fieldSpecs = fieldSpecs;
        this.referenceData = referenceData;
    }

    /**
    // Validate occurrence limits for dynamic fields
     */
    validateOccurrenceLimits(baseFieldId) {
        const spec = this.fieldSpecs[baseFieldId];
        if (!spec || !spec.dynamic) return true;

        // Count existing occurrences
        const occurrences = document.querySelectorAll(`[id^="${baseFieldId}_"]`);
        const currentCount = occurrences.length;

        if (currentCount > spec.maxOccurrences) {
            const errorMsg = `Maximum ${spec.maxOccurrences} occurrences allowed for ${spec.title} per MCEB Pub 7`;
            console.error(errorMsg);
            return false;
        }

        return true;
    }

    /**
     * Validate required fields per MCEB Publication 7 standards
     * @returns {Object} Validation results with missing fields and status
     */
    validateRequiredFields() {
        const missingFields = [];
        const presentFields = [];

        // Required fields per MCEB Pub 7 (Source: MCEB Publication 7 (1 November 2018).pdf)
        const requiredFields = {
            // Administrative Data - Mandatory per MCEB Pub 7
            'field005': {
                title: 'Security Classification',
                description: 'Overall security classification of the frequency proposal',
                required: true,
                source: 'MCEB Pub 7 Data Item 005'
            },
            'field010': {
                title: 'Type of Action',
                description: 'Type of action required to process the frequency assignment',
                required: true,
                source: 'MCEB Pub 7 Data Item 010'
            },
            'field102': {
                title: 'Agency Serial Number',
                description: 'Primary FRRS record identifier',
                required: true,
                source: 'MCEB Pub 7 Data Item 102'
            },

            // Emission Characteristics - Required per MCEB Pub 7
            'field110': {
                title: 'Frequency(ies)',
                description: 'Frequency band or discrete frequency assigned',
                required: true,
                source: 'MCEB Pub 7 Data Item 110'
            },
            'field113': {
                title: 'Station Class',
                description: 'Station class designation per MCEB Pub 7 Annex A',
                required: true,
                source: 'MCEB Pub 7 Data Item 113'
            },
            'field114': {
                title: 'Emission Designator',
                description: 'ITU emission designator per MCEB Pub 7 Annex B',
                required: true,
                source: 'MCEB Pub 7 Data Item 114'
            },
            'field115': {
                title: 'Transmitter Power',
                description: 'Transmitter power in appropriate units',
                required: true,
                source: 'MCEB Pub 7 Data Item 115'
            },

            // Organizational Information - Required per MCEB Pub 7
            'field200': {
                title: 'Agency',
                description: 'Department of Defense agency identifier',
                required: true,
                source: 'MCEB Pub 7 Data Item 200'
            },

            // Transmitter Location - Required per MCEB Pub 7
            'field300': {
                title: 'State/Country (TX)',
                description: 'Transmitter state/country location',
                required: true,
                source: 'MCEB Pub 7 Data Item 300'
            },
            'field301': {
                title: 'Antenna Location (TX)',
                description: 'Transmitter antenna location name',
                required: true,
                source: 'MCEB Pub 7 Data Item 301'
            },
            'field303': {
                title: 'Antenna Coordinates (TX)',
                description: 'Transmitter antenna coordinates in MCEB format',
                required: true,
                source: 'MCEB Pub 7 Data Item 303'
            },

            // Receiver Location - Required per MCEB Pub 7
            'field400': {
                title: 'State/Country (RX)',
                description: 'Receiver state/country location',
                required: true,
                source: 'MCEB Pub 7 Data Item 400'
            },
            'field401': {
                title: 'Antenna Location (RX)',
                description: 'Receiver antenna location name',
                required: true,
                source: 'MCEB Pub 7 Data Item 401'
            },
            'field403': {
                title: 'Antenna Coordinates (RX)',
                description: 'Receiver antenna coordinates in MCEB format',
                required: true,
                source: 'MCEB Pub 7 Data Item 403'
            }
        };

        // Additional required fields for specific circumstances
        const conditionalRequiredFields = {
            // Required for Air Force assignments per MCEB Pub 7
            'field701': {
                title: 'Frequency Action Officer',
                description: 'MILDEP code identifying responsible person/group',
                condition: () => {
                    const agency = document.getElementById('field200')?.value;
                    return agency === 'USAF';
                },
                source: 'MCEB Pub 7 Data Item 701'
            },

            // Required for all DoD assignments per MCEB Pub 7
            'field716': {
                title: 'Usage Code',
                description: 'Coded entry denoting usage and category of circuits',
                condition: () => true, // Always required for DoD
                source: 'MCEB Pub 7 Data Item 716'
            },

            // Required field per MCEB Pub 7
            'field803': {
                title: 'Point of Contact',
                description: 'Person validating assignment data correctness',
                condition: () => true, // Always required
                source: 'MCEB Pub 7 Data Item 803'
            },

            // Required field per MCEB Pub 7
            'field144': {
                title: 'Approval Authority Indicator',
                description: 'Indicates whether assignment processed for IRAC approval',
                condition: () => true, // Required on all DoD transactions
                source: 'MCEB Pub 7 Data Item 144'
            }
        };

        // Check primary required fields
        Object.entries(requiredFields).forEach(([fieldId, fieldInfo]) => {
            // Handle dynamic fields (e.g., field110_1, field113_1)
            let field = document.getElementById(fieldId);
            if (!field && this.fieldSpecs[fieldId]?.dynamic) {
                field = document.getElementById(`${fieldId}_1`);
            }

            const value = field?.value?.trim();

            if (!value) {
                missingFields.push({
                    fieldId: fieldId,
                    title: fieldInfo.title,
                    description: fieldInfo.description,
                    source: fieldInfo.source,
                    severity: 'critical'
                });

                // Visual indication of missing required field
                if (field) {
                    field.style.borderColor = '#dc3545';
                    field.style.borderWidth = '2px';
                }
            } else {
                presentFields.push({
                    fieldId: fieldId,
                    title: fieldInfo.title,
                    value: value
                });

                // Clear error styling if field is now filled
                if (field) {
                    field.style.borderColor = '';
                    field.style.borderWidth = '';
                }
            }
        });

        // Check conditional required fields
        Object.entries(conditionalRequiredFields).forEach(([fieldId, fieldInfo]) => {
            if (fieldInfo.condition()) {
                const field = document.getElementById(fieldId);
                const value = field?.value?.trim();

                if (!value) {
                    missingFields.push({
                        fieldId: fieldId,
                        title: fieldInfo.title,
                        description: fieldInfo.description,
                        source: fieldInfo.source,
                        severity: 'required'
                    });

                    if (field) {
                        field.style.borderColor = '#ffc107';
                        field.style.borderWidth = '2px';
                    }
                } else {
                    presentFields.push({
                        fieldId: fieldId,
                        title: fieldInfo.title,
                        value: value
                    });
                }
            }
        });

        // Generate validation summary
        const validationResult = {
            isValid: missingFields.length === 0,
            totalRequired: Object.keys(requiredFields).length +
                Object.keys(conditionalRequiredFields).filter(id => conditionalRequiredFields[id].condition()).length,
            presentCount: presentFields.length,
            missingCount: missingFields.length,
            missingFields: missingFields,
            presentFields: presentFields,
            compliance: {
                mcebPub7: missingFields.length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT',
                timestamp: new Date().toISOString(),
                version: 'MCEB Publication 7 (1 November 2018)'
            }
        };

        console.log(`📋 Required Fields Validation: ${presentFields.length}/${validationResult.totalRequired} complete`);

        return validationResult;
    }
    /**
     * Generate detailed MCEB Publication 7 compliance report
     * @returns {string} Formatted compliance report text
     */
    /**
     * Generate detailed MCEB Publication 7 compliance report
     * @returns {string} Formatted compliance report text
     */
    generateComplianceReport() {
        const formData = this.collectFormData();
        const report = [];
        const timestamp = new Date();

        // Report Header
        report.push('═══════════════════════════════════════════════════════════════');
        report.push('              MCEB PUBLICATION 7 COMPLIANCE REPORT');
        report.push('           Standard Frequency Action Format (SFAF)');
        report.push('═══════════════════════════════════════════════════════════════');
        report.push(`Generated: ${timestamp.toLocaleString()}`);
        report.push(`Authority: MCEB Publication 7 (1 November 2018)`);
        report.push(`System: SFAF Field Manager - MCEB Pub 7 Compliant Edition`);
        report.push('');

        // Executive Summary
        const requiredValidation = this.validateRequiredFields();
        const formatValidation = this.checkFieldFormats();

        report.push('EXECUTIVE SUMMARY');
        report.push('═════════════════');
        report.push(`Overall Compliance Status: ${requiredValidation.isValid && formatValidation.isValid ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
        report.push(`Required Fields Status: ${requiredValidation.presentCount}/${requiredValidation.totalRequired} complete`);
        report.push(`Format Validation Status: ${formatValidation.validFields}/${formatValidation.totalFields} compliant`);
        report.push('');

        // Required Fields Analysis
        report.push('REQUIRED FIELDS ANALYSIS (MCEB Pub 7)');
        report.push('═════════════════════════════════════');

        if (requiredValidation.missingFields.length > 0) {
            report.push('❌ MISSING REQUIRED FIELDS:');
            requiredValidation.missingFields.forEach(field => {
                report.push(`   • ${field.fieldId} - ${field.title}`);
                report.push(`     Source: ${field.source}`);
                report.push(`     Severity: ${field.severity.toUpperCase()}`);
            });
            report.push('');
        }

        if (requiredValidation.presentFields.length > 0) {
            report.push('✅ PRESENT REQUIRED FIELDS:');
            requiredValidation.presentFields.forEach(field => {
                const truncatedValue = field.value.length > 30 ?
                    field.value.substring(0, 30) + '...' : field.value;
                report.push(`   • ${field.fieldId} - ${field.title}: "${truncatedValue}"`);
            });
            report.push('');
        }

        // Field Occurrence Limits Analysis (Corrected per MCEB Pub 7)
        report.push('FIELD OCCURRENCE LIMITS ANALYSIS');
        report.push('═════════════════════════════════');

        let occurrenceViolations = 0;
        const occurrenceLimits = {
            // Corrected per MCEB Pub 7 (1 November 2018)
            'field110': { max: 1, title: 'Frequency(ies)' }, // Single occurrence per MCEB Pub 7
            'field113': { max: 20, title: 'Station Class' },
            'field114': { max: 20, title: 'Emission Designator' },
            'field115': { max: 20, title: 'Transmitter Power' },
            'field116': { max: 20, title: 'Power Type' },
            'field340': { max: 10, title: 'TX Equipment Nomenclature' },
            'field343': { max: 10, title: 'TX Equipment Certification' },
            'field440': { max: 10, title: 'RX Equipment Nomenclature' },
            'field443': { max: 10, title: 'RX Equipment Certification' },
            'field500': { max: 10, title: 'IRAC Notes' },
            'field501': { max: 30, title: 'Notes/Comments' }
        };

        Object.entries(occurrenceLimits).forEach(([fieldId, limits]) => {
            // Check field110 specifically (single occurrence)
            if (fieldId === 'field110') {
                const field110 = document.getElementById('field110') || document.getElementById('field110_1');
                if (field110 && field110.value.trim()) {
                    report.push(`✅ ${fieldId} - ${limits.title}: 1/1 occurrences (MCEB Pub 7 compliant)`);
                }
            } else {
                // Check dynamic fields
                const occurrences = document.querySelectorAll(`[id^="${fieldId}_"]`);
                const actualCount = occurrences.length;

                if (actualCount > limits.max) {
                    occurrenceViolations++;
                    report.push(`❌ OCCURRENCE LIMIT EXCEEDED: ${fieldId}`);
                    report.push(`   Field: ${limits.title}`);
                    report.push(`   Actual: ${actualCount} occurrences`);
                    report.push(`   Maximum: ${limits.max} per MCEB Pub 7`);
                } else if (actualCount > 0) {
                    report.push(`✅ ${fieldId} - ${limits.title}: ${actualCount}/${limits.max} occurrences`);
                }
            }
        });

        if (occurrenceViolations === 0) {
            report.push('✅ All field occurrence limits compliant with MCEB Pub 7');
        }
        report.push('');

        // Format Validation Analysis
        report.push('FORMAT VALIDATION ANALYSIS');
        report.push('══════════════════════════');

        if (formatValidation.errors.length > 0) {
            report.push('❌ FORMAT VALIDATION ERRORS:');
            formatValidation.errors.forEach(error => {
                report.push(`   • ${error.fieldId} - ${error.title}`);
                report.push(`     Error: ${error.message}`);
                report.push(`     Expected: ${error.expectedFormat}`);
            });
            report.push('');
        }

        if (formatValidation.warnings.length > 0) {
            report.push('⚠️ FORMAT VALIDATION WARNINGS:');
            formatValidation.warnings.forEach(warning => {
                report.push(`   • ${warning.fieldId} - ${warning.title}`);
                report.push(`     Warning: ${warning.message}`);
            });
            report.push('');
        }

        // Agency-Specific Requirements
        const agency = formData['field200'];
        if (agency) {
            report.push(`AGENCY-SPECIFIC REQUIREMENTS (${agency})`);
            report.push('═══════════════════════════════════');

            switch (agency) {
                case 'USAF':
                    const fao = formData['field701'];
                    if (fao) {
                        report.push(`✅ Field 701 (Frequency Action Officer): ${fao}`);
                    } else {
                        report.push('❌ Field 701 (Frequency Action Officer) REQUIRED for Air Force assignments');
                    }
                    break;
                case 'USA':
                case 'USN':
                case 'USMC':
                case 'USCG':
                    report.push(`✅ Agency identification compliant: ${agency}`);
                    break;
                default:
                    report.push(`⚠️ Unknown agency code: ${agency}`);
            }
            report.push('');
        }

        // IRAC Submission Requirements
        report.push('IRAC SUBMISSION REQUIREMENTS');
        report.push('════════════════════════════');

        const approvalAuthority = formData['field144'];
        if (approvalAuthority) {
            if (approvalAuthority === 'Y') {
                report.push('✅ Field 144: Assignment processed for IRAC approval');
            } else if (approvalAuthority === 'N') {
                report.push('✅ Field 144: Assignment not requiring IRAC approval');
            } else {
                report.push(`⚠️ Field 144: Unknown approval authority indicator: ${approvalAuthority}`);
            }
        } else {
            report.push('❌ Field 144 (Approval Authority Indicator) REQUIRED per MCEB Pub 7');
        }

        // Security Classification Analysis
        const securityClass = formData['field005'];
        if (securityClass) {
            report.push(`✅ Security Classification: ${securityClass}`);

            // Check for classified data handling requirements
            if (['C', 'S', 'T'].includes(securityClass)) {
                const unclassifiedFields = formData['field015'];
                if (unclassifiedFields) {
                    report.push('✅ Unclassified data field indicator present for classified record');
                } else {
                    report.push('❌ Field 015 (Unclassified Data Fields) REQUIRED for classified records');
                }
            }
        }
        report.push('');

        // Emission Characteristics Coordination Analysis
        report.push('EMISSION CHARACTERISTICS COORDINATION');
        report.push('═══════════════════════════════════');

        // Check for coordinated emission groups (Fields 113-116 must be coordinated)
        const stationClasses = formData['field113'] || [];
        const emissionDesignators = formData['field114'] || [];
        const transmitterPowers = formData['field115'] || [];
        const powerTypes = formData['field116'] || [];

        const emissionCount = Math.max(
            Array.isArray(stationClasses) ? stationClasses.length : (stationClasses ? 1 : 0),
            Array.isArray(emissionDesignators) ? emissionDesignators.length : (emissionDesignators ? 1 : 0),
            Array.isArray(transmitterPowers) ? transmitterPowers.length : (transmitterPowers ? 1 : 0)
        );

        if (emissionCount > 0) {
            report.push(`✅ Emission characteristics groups: ${emissionCount} coordinated sets`);

            // Validate each emission group is complete
            for (let i = 0; i < emissionCount; i++) {
                const groupNum = i + 1;
                const hasStationClass = (Array.isArray(stationClasses) ? stationClasses[i] : stationClasses);
                const hasEmission = (Array.isArray(emissionDesignators) ? emissionDesignators[i] : emissionDesignators);
                const hasPower = (Array.isArray(transmitterPowers) ? transmitterPowers[i] : transmitterPowers);

                if (hasStationClass && hasEmission && hasPower) {
                    report.push(`   • Group ${groupNum}: Complete (113/114/115)`);
                } else {
                    report.push(`   • Group ${groupNum}: Incomplete - missing required emission data`);
                }
            }
        } else {
            report.push('❌ No emission characteristics defined - Field 113/114/115 required');
        }
        report.push('');

        // Geographic Coordination Analysis
        report.push('GEOGRAPHIC COORDINATION ANALYSIS');
        report.push('═══════════════════════════════');

        const txState = formData['field300'];
        const rxState = formData['field400'];
        const txCoords = formData['field303'];
        const rxCoords = formData['field403'];

        if (txState && rxState && txCoords && rxCoords) {
            report.push('✅ Complete geographic data for transmitter and receiver');
            report.push(`   TX Location: ${txState} - ${txCoords}`);
            report.push(`   RX Location: ${rxState} - ${rxCoords}`);

            // Check if outside US&P requires unified command data
            const outsideUSP = !['US', 'USA', 'USP'].includes(txState) || !['US', 'USA', 'USP'].includes(rxState);
            if (outsideUSP) {
                const unifiedCommand = formData['field201'];
                if (unifiedCommand) {
                    report.push(`✅ Unified Command specified for OUS&P assignment: ${unifiedCommand}`);
                } else {
                    report.push('❌ Field 201 (Unified Command) REQUIRED for assignments outside US&P');
                }
            }
        } else {
            report.push('❌ Incomplete geographic data - Fields 300/301/303 and 400/401/403 required');
        }
        report.push('');

        // Function Identifier Analysis
        report.push('FUNCTION IDENTIFIER ANALYSIS');
        report.push('════════════════════════════');

        const majorFunction = formData['field511'];
        const intermediateFunction = formData['field512'];

        if (majorFunction) {
            report.push(`✅ Major Function Identifier: ${majorFunction}`);

            if (intermediateFunction) {
                report.push(`✅ Intermediate Function Identifier: ${intermediateFunction}`);
            } else {
                report.push('⚠️ Field 512 (Intermediate Function Identifier) recommended for complete functional description');
            }
        } else {
            report.push('❌ Field 511 (Major Function Identifier) REQUIRED for all DoD assignments');
        }
        report.push('');

        // Final Compliance Summary
        report.push('FINAL COMPLIANCE ASSESSMENT');
        report.push('═══════════════════════════');

        const overallCompliant = requiredValidation.isValid &&
            formatValidation.isValid &&
            occurrenceViolations === 0;

        if (overallCompliant) {
            report.push('🎯 OVERALL STATUS: FULLY COMPLIANT WITH MCEB PUBLICATION 7');
            report.push('   ✅ All required fields present');
            report.push('   ✅ All field formats valid');
            report.push('   ✅ All occurrence limits respected');
            report.push('   ✅ Ready for IRAC submission');
        } else {
            report.push('❌ OVERALL STATUS: NON-COMPLIANT WITH MCEB PUBLICATION 7');
            report.push('   ⚠️ Corrections required before IRAC submission');

            if (!requiredValidation.isValid) {
                report.push(`   ❌ Missing ${requiredValidation.missingCount} required fields`);
            }
            if (!formatValidation.isValid) {
                report.push(`   ❌ ${formatValidation.errors.length} format validation errors`);
            }
            if (occurrenceViolations > 0) {
                report.push(`   ❌ ${occurrenceViolations} occurrence limit violations`);
            }
        }

        report.push('');
        report.push('═══════════════════════════════════════════════════════════════');
        report.push(`Report Generated: ${timestamp.toISOString()}`);
        report.push('Authority: MCEB Publication 7 (1 November 2018)');
        report.push('Classification: Report inherits classification of highest classified field');
        report.push('Distribution: For Official Use Only - Frequency Coordination Personnel');
        report.push('═══════════════════════════════════════════════════════════════');

        return report.join('\n');
    }

    /**
 * Check field formats against MCEB Publication 7 standards
 * @returns {Object} Format validation results with errors, warnings, and compliance status
 */
    checkFieldFormats() {
        const formatResults = {
            isValid: true,
            totalFields: 0,
            validFields: 0,
            invalidFields: 0,
            errors: [],
            warnings: [],
            compliance: {
                mcebPub7: 'COMPLIANT',
                timestamp: new Date().toISOString(),
                version: 'MCEB Publication 7 (1 November 2018)'
            }
        };

        // Get all form fields for validation
        const formFields = document.querySelectorAll('input, select, textarea');

        formFields.forEach(field => {
            const fieldType = this.getFieldType(field);
            if (!fieldType) return;

            formatResults.totalFields++;
            const fieldValue = field.value.trim();

            // Skip empty fields for format validation
            if (!fieldValue) return;

            let isFieldValid = true;
            const fieldSpec = this.fieldSpecs[`field${fieldType}`];
            const fieldTitle = fieldSpec?.title || `Field ${fieldType}`;

            // Validate based on specific field types
            switch (fieldType) {
                case '005': // Security Classification
                    isFieldValid = this.validateSecurityClassificationFormat(field, fieldValue, formatResults);
                    break;

                case '010': // Type of Action
                    isFieldValid = this.validateTypeOfActionFormat(field, fieldValue, formatResults);
                    break;

                case '102': // Agency Serial Number
                    isFieldValid = this.validateAgencySerialNumberFormat(field, fieldValue, formatResults);
                    break;

                case '110': // Frequency(ies) - Single occurrence per MCEB Pub 7
                    isFieldValid = this.validateFrequencyFormat(field, fieldValue, formatResults);
                    break;

                case '113': // Station Class
                    isFieldValid = this.validateStationClassFormat(field, fieldValue, formatResults);
                    break;

                case '114': // Emission Designator
                    isFieldValid = this.validateEmissionDesignatorFormat(field, fieldValue, formatResults);
                    break;

                case '115': // Transmitter Power
                    isFieldValid = this.validateTransmitterPowerFormat(field, fieldValue, formatResults);
                    break;

                case '116': // Power Type
                    isFieldValid = this.validatePowerTypeFormat(field, fieldValue, formatResults);
                    break;

                case '130': // Time Code
                    isFieldValid = this.validateTimeCodeFormat(field, fieldValue, formatResults);
                    break;

                case '131': // Percent Time
                    isFieldValid = this.validatePercentTimeFormat(field, fieldValue, formatResults);
                    break;

                case '140': case '141': case '142': case '143': // Date fields
                    isFieldValid = this.validateDateFieldFormat(field, fieldValue, formatResults);
                    break;

                case '144': // Approval Authority Indicator
                    isFieldValid = this.validateApprovalAuthorityFormat(field, fieldValue, formatResults);
                    break;

                case '200': // Agency
                    isFieldValid = this.validateAgencyFormat(field, fieldValue, formatResults);
                    break;

                case '300': case '400': // State/Country
                    isFieldValid = this.validateStateCountryFormat(field, fieldValue, formatResults);
                    break;

                case '301': case '401': // Antenna Location
                    isFieldValid = this.validateAntennaLocationFormat(field, fieldValue, formatResults);
                    break;

                case '303': case '403': // Antenna Coordinates
                    isFieldValid = this.validateCoordinateFormat(field, fieldValue, formatResults);
                    break;

                case '340': case '440': // Equipment Nomenclature
                    isFieldValid = this.validateEquipmentNomenclatureFormat(field, fieldValue, formatResults);
                    break;

                case '343': case '443': // Equipment Certification
                    isFieldValid = this.validateEquipmentCertificationFormat(field, fieldValue, formatResults);
                    break;

                case '357': case '457': // Antenna Gain
                    isFieldValid = this.validateAntennaGainFormat(field, fieldValue, formatResults);
                    break;

                case '362': case '462': // Antenna Orientation
                    isFieldValid = this.validateAntennaOrientationFormat(field, fieldValue, formatResults);
                    break;

                case '363': case '463': // Antenna Polarization
                    isFieldValid = this.validateAntennaPolarizationFormat(field, fieldValue, formatResults);
                    break;

                case '500': // IRAC Notes
                    isFieldValid = this.validateIRACNotesFormat(field, fieldValue, formatResults);
                    break;

                case '501': // Notes/Comments
                    isFieldValid = this.validateCommentsFormat(field, fieldValue, formatResults);
                    break;

                case '502': // Description of Requirement
                    isFieldValid = this.validateDescriptionFormat(field, fieldValue, formatResults);
                    break;

                case '511': case '512': case '513': // Function Identifiers
                    isFieldValid = this.validateFunctionIdentifierFormat(field, fieldValue, formatResults);
                    break;

                case '520': // Supplementary Details
                    isFieldValid = this.validateSupplementaryDetailsFormat(field, fieldValue, formatResults);
                    break;

                case '701': // Frequency Action Officer
                    isFieldValid = this.validateFrequencyActionOfficerFormat(field, fieldValue, formatResults);
                    break;

                case '702': // Control/Request Number
                    isFieldValid = this.validateControlRequestNumberFormat(field, fieldValue, formatResults);
                    break;

                case '716': // Usage Code
                    isFieldValid = this.validateUsageCodeFormat(field, fieldValue, formatResults);
                    break;

                case '801': case '803': // Coordination Data/POC
                    isFieldValid = this.validateCoordinationDataFormat(field, fieldValue, formatResults);
                    break;

                default:
                    // Generic format validation for other fields
                    isFieldValid = this.validateGenericFieldFormat(field, fieldValue, formatResults);
            }

            // Update counters
            if (isFieldValid) {
                formatResults.validFields++;
            } else {
                formatResults.invalidFields++;
                formatResults.isValid = false;
            }
        });

        // Update overall compliance status
        if (!formatResults.isValid) {
            formatResults.compliance.mcebPub7 = 'NON-COMPLIANT';
        }

        return formatResults;
    }

    // ===== FORMAT VALIDATION HELPER METHODS =====

    /**
     * Validate Security Classification format (Field 005)
     */
    validateSecurityClassificationFormat(field, value, results) {
        const upperValue = value.toUpperCase();
        const validClassifications = ['U', 'UE', 'C', 'S', 'T'];

        if (!validClassifications.includes(upperValue)) {
            results.errors.push({
                fieldId: 'field005',
                title: 'Security Classification',
                message: `Invalid security classification: ${value}`,
                expectedFormat: 'U, UE, C, S, or T per MCEB Pub 7'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Type of Action format (Field 010)
     */
    validateTypeOfActionFormat(field, value, results) {
        const upperValue = value.toUpperCase();
        const validActions = ['A', 'D', 'E', 'F', 'M', 'N', 'R'];

        if (!validActions.includes(upperValue)) {
            results.errors.push({
                fieldId: 'field010',
                title: 'Type of Action',
                message: `Invalid type of action: ${value}`,
                expectedFormat: 'A, D, E, F, M, N, or R per MCEB Pub 7'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Agency Serial Number format (Field 102)
     */
    validateAgencySerialNumberFormat(field, value, results) {
        // MCEB Pub 7 format: AAAAYYNNNN (Agency + Year + Number)
        const serialPattern = /^[A-Z\s]{1,4}\d{6}$/;

        if (value.length > 10) {
            results.errors.push({
                fieldId: 'field102',
                title: 'Agency Serial Number',
                message: 'Exceeds maximum 10 characters',
                expectedFormat: 'AAAAYYNNNN format per MCEB Pub 7'
            });
            return false;
        }

        if (!serialPattern.test(value.replace(/\s+/g, ''))) {
            results.warnings.push({
                fieldId: 'field102',
                title: 'Agency Serial Number',
                message: 'Format should follow AAAAYYNNNN pattern (Agency + Year + Sequential)'
            });
        }

        return true;
    }

    /**
     * Validate Frequency format (Field 110) - Single occurrence per MCEB Pub 7
     */
    validateFrequencyFormat(field, value, results) {
        const upperValue = value.toUpperCase();

        // MCEB Pub 7 frequency formats: K4551.5(4550), M225.8, etc.
        const frequencyPatterns = [
            /^[KMG]\d{1,7}(\.\d{1,3})?(\(\d{1,7}(\.\d{1,3})?\))?$/, // K4726.5(4725) format
            /^\d{1,7}(\.\d{1,6})?$/, // Simple numeric format
            /^[HV]\d{1,7}(\.\d{1,3})?$/ // HF/VHF format
        ];

        const isValidFormat = frequencyPatterns.some(pattern => pattern.test(upperValue));

        if (!isValidFormat) {
            results.errors.push({
                fieldId: 'field110',
                title: 'Frequency',
                message: `Invalid frequency format: ${value}`,
                expectedFormat: 'K4726.5, M225.8, K4726.5(4725) per MCEB Pub 7'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Emission Designator format (Field 114)
     */
    validateEmissionDesignatorFormat(field, value, results) {
        const upperValue = value.toUpperCase();

        // ITU emission designator pattern per MCEB Pub 7 Annex B
        const emissionPattern = /^(\d{1,4}[KMGHZ]?\d{0,2})?[NAHGRJFCPKLQVMWX][0-9X][NABCDEFWX]([ABCDEFGHJKLMNWX]([NCFTWX])?)?$/;

        if (!emissionPattern.test(upperValue)) {
            results.errors.push({
                fieldId: 'field114',
                title: 'Emission Designator',
                message: `Invalid emission designator format: ${value}`,
                expectedFormat: 'ITU format: bandwidth + emission class + info type (e.g., 16K0F3E, A3E)'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Transmitter Power format (Field 115)
     */
    validateTransmitterPowerFormat(field, value, results) {
        const upperValue = value.toUpperCase();

        // MCEB Pub 7 power format: W10, K5, M2.5, etc.
        const powerPattern = /^[WKMGV]\d{1,7}(\.\d{1,5})?$/;

        if (!powerPattern.test(upperValue)) {
            results.errors.push({
                fieldId: 'field115',
                title: 'Transmitter Power',
                message: `Invalid power format: ${value}`,
                expectedFormat: 'Unit + value: W10, K5, M2.5 (W=watts, K=kW, M=MW, V=μV)'
            });
            return false;
        }

        // Validate logical power ranges
        const unit = upperValue.charAt(0);
        const powerValue = parseFloat(upperValue.substring(1));

        switch (unit) {
            case 'W':
                if (powerValue >= 1000) {
                    results.warnings.push({
                        fieldId: 'field115',
                        title: 'Transmitter Power',
                        message: 'Power ≥1000W should use K prefix (e.g., K1.0)'
                    });
                }
                break;
            case 'K':
                if (powerValue < 1 || powerValue >= 1000) {
                    results.errors.push({
                        fieldId: 'field115',
                        title: 'Transmitter Power',
                        message: 'K prefix valid for 1-999.99999 kW range only',
                        expectedFormat: 'Use W for <1kW, M for ≥1000kW'
                    });
                    return false;
                }
                break;
            case 'M':
                if (powerValue < 1 || powerValue >= 1000) {
                    results.errors.push({
                        fieldId: 'field115',
                        title: 'Transmitter Power',
                        message: 'M prefix valid for 1-999.99999 MW range only',
                        expectedFormat: 'Use K for <1MW, G for ≥1000MW'
                    });
                    return false;
                }
                break;
        }

        return true;
    }

    /**
    * Validate Coordinate format (Fields 303/403) - Continued from previous
    */
    validateCoordinateFormat(field, value, results) {
        const upperValue = value.toUpperCase().replace(/\s/g, '');

        // MCEB Pub 7 coordinate formats
        const degMinSecPattern = /^(\d{2,3})(\d{2})(\d{2})(\.\d+)?([NSEW])(\d{3})(\d{2})(\d{2})(\.\d+)?([NSEW])$/;
        const decimalPattern = /^(\d{1,3})\.(\d{5,})([NSEW])(\d{1,3})\.(\d{5,})([NSEW])$/;

        let isValid = false;

        if (degMinSecPattern.test(upperValue)) {
            const match = upperValue.match(degMinSecPattern);
            const degrees1 = parseInt(match[1]);
            const minutes1 = parseInt(match[2]);
            const seconds1 = parseInt(match[3]);
            const hemisphere1 = match[5];
            const degrees2 = parseInt(match[6]);
            const minutes2 = parseInt(match[7]);
            const seconds2 = parseInt(match[8]);
            const hemisphere2 = match[10];

            // Validate coordinate ranges per MCEB Pub 7
            const maxDegrees1 = (hemisphere1 === 'N' || hemisphere1 === 'S') ? 90 : 180;
            const maxDegrees2 = (hemisphere2 === 'N' || hemisphere2 === 'S') ? 90 : 180;

            if (degrees1 <= maxDegrees1 && minutes1 < 60 && seconds1 < 60 &&
                degrees2 <= maxDegrees2 && minutes2 < 60 && seconds2 < 60) {
                isValid = true;
            } else {
                results.errors.push({
                    fieldId: field.id,
                    title: 'Antenna Coordinates',
                    message: 'Coordinate values exceed valid ranges',
                    expectedFormat: 'Latitude: 0-90°, Longitude: 0-180°, Minutes/Seconds: 0-59'
                });
                return false;
            }
        } else if (decimalPattern.test(upperValue)) {
            const match = upperValue.match(decimalPattern);
            const degrees1 = parseFloat(match[1] + '.' + match[2]);
            const hemisphere1 = match[3];
            const degrees2 = parseFloat(match[4] + '.' + match[5]);
            const hemisphere2 = match[6];

            const maxDegrees1 = (hemisphere1 === 'N' || hemisphere1 === 'S') ? 90 : 180;
            const maxDegrees2 = (hemisphere2 === 'N' || hemisphere2 === 'S') ? 90 : 180;

            if (degrees1 <= maxDegrees1 && degrees2 <= maxDegrees2) {
                isValid = true;
            } else {
                results.errors.push({
                    fieldId: field.id,
                    title: 'Antenna Coordinates',
                    message: 'Decimal coordinate values exceed valid ranges',
                    expectedFormat: 'Latitude: ±90.0, Longitude: ±180.0'
                });
                return false;
            }
        }

        if (!isValid) {
            results.errors.push({
                fieldId: field.id,
                title: 'Antenna Coordinates',
                message: `Invalid coordinate format: ${value}`,
                expectedFormat: 'DDMMSSNDDDMMSSW or DD.DDDDNDD.DDDDW per MCEB Pub 7'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Equipment Nomenclature format (Fields 340/440)
     */
    validateEquipmentNomenclatureFormat(field, value, results) {
        // Maximum 18 characters per MCEB Pub 7
        if (value.length > 18) {
            results.errors.push({
                fieldId: field.id,
                title: 'Equipment Nomenclature',
                message: 'Exceeds maximum 18 characters',
                expectedFormat: 'Military equipment format per MCEB Pub 7'
            });
            return false;
        }

        // Military equipment nomenclature pattern: G,AN/PRC-160(V)
        const equipmentPattern = /^[A-Z],AN\/[A-Z]{3}-\d+(\([A-Z]+\))?$/;

        if (!equipmentPattern.test(value)) {
            results.warnings.push({
                fieldId: field.id,
                title: 'Equipment Nomenclature',
                message: 'Should follow military format: Type,AN/XXX-NNN(Variant)'
            });
        }

        return true;
    }

    /**
     * Validate Equipment Certification format (Fields 343/443)
     */
    validateEquipmentCertificationFormat(field, value, results) {
        // Maximum 15 characters per MCEB Pub 7
        if (value.length > 15) {
            results.errors.push({
                fieldId: field.id,
                title: 'Equipment Certification',
                message: 'Exceeds maximum 15 characters',
                expectedFormat: 'Military certification format per MCEB Pub 7'
            });
            return false;
        }

        // Military certification pattern: J/F 12/11171
        const certPattern = /^[A-Z]\/[A-Z]\s\d{2}\/\d{5}$/;

        if (!certPattern.test(value)) {
            results.warnings.push({
                fieldId: field.id,
                title: 'Equipment Certification',
                message: 'Should follow military format: X/Y NN/NNNNN'
            });
        }

        return true;
    }

    /**
     * Validate Antenna Gain format (Fields 357/457)
     */
    validateAntennaGainFormat(field, value, results) {
        // Maximum 4 characters per MCEB Pub 7
        if (value.length > 4) {
            results.errors.push({
                fieldId: field.id,
                title: 'Antenna Gain',
                message: 'Exceeds maximum 4 characters',
                expectedFormat: 'Numeric value in dB per MCEB Pub 7'
            });
            return false;
        }

        // Antenna gain pattern: numeric value (can be negative)
        const gainPattern = /^-?\d{1,3}(\.\d)?$/;

        if (!gainPattern.test(value)) {
            results.errors.push({
                fieldId: field.id,
                title: 'Antenna Gain',
                message: `Invalid antenna gain format: ${value}`,
                expectedFormat: 'Numeric value in dB (e.g., 0, 3.5, -10)'
            });
            return false;
        }

        // Validate logical gain ranges
        const gainValue = parseFloat(value);
        if (gainValue < -50 || gainValue > 100) {
            results.warnings.push({
                fieldId: field.id,
                title: 'Antenna Gain',
                message: 'Antenna gain outside typical range (-50 to +100 dB)'
            });
        }

        return true;
    }

    /**
     * Validate Antenna Orientation format (Fields 362/462)
     */
    validateAntennaOrientationFormat(field, value, results) {
        const upperValue = value.toUpperCase();

        // Maximum 3 characters per MCEB Pub 7
        if (upperValue.length > 3) {
            results.errors.push({
                fieldId: field.id,
                title: 'Antenna Orientation',
                message: 'Exceeds maximum 3 characters',
                expectedFormat: 'NNN degrees or ND per MCEB Pub 7'
            });
            return false;
        }

        // Antenna orientation patterns
        const orientationPatterns = [
            /^ND$/,          // Non-directional
            /^\d{1,3}$/,     // Degrees (0-360)
            /^[NSEW]$/       // Cardinal directions
        ];

        const isValidFormat = orientationPatterns.some(pattern => pattern.test(upperValue));

        if (!isValidFormat) {
            results.errors.push({
                fieldId: field.id,
                title: 'Antenna Orientation',
                message: `Invalid orientation format: ${value}`,
                expectedFormat: 'ND (non-directional), NNN (degrees), or N/S/E/W'
            });
            return false;
        }

        // Validate degree range if numeric
        if (/^\d{1,3}$/.test(upperValue)) {
            const degrees = parseInt(upperValue);
            if (degrees > 360) {
                results.errors.push({
                    fieldId: field.id,
                    title: 'Antenna Orientation',
                    message: 'Degrees must be 0-360',
                    expectedFormat: '0-360 degrees from true north'
                });
                return false;
            }
        }

        return true;
    }

    /**
     * Validate Antenna Polarization format (Fields 363/463)
     */
    validateAntennaPolarizationFormat(field, value, results) {
        const upperValue = value.toUpperCase();
        const validPolarizations = ['V', 'H', 'C', 'L', 'R'];

        if (!validPolarizations.includes(upperValue)) {
            results.errors.push({
                fieldId: field.id,
                title: 'Antenna Polarization',
                message: `Invalid polarization: ${value}`,
                expectedFormat: 'V (Vertical), H (Horizontal), C (Circular), L (Left), R (Right)'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Time Code format (Field 130)
     */
    validateTimeCodeFormat(field, value, results) {
        const upperValue = value.toUpperCase();

        // Maximum 4 characters per MCEB Pub 7
        if (upperValue.length > 4) {
            results.errors.push({
                fieldId: field.id,
                title: 'Time Code',
                message: 'Exceeds maximum 4 characters',
                expectedFormat: 'MCEB Pub 7 time code format'
            });
            return false;
        }

        // Time code patterns from MCEB Pub 7 (Source: manager.txt)
        const timeCodePatterns = [
            /^[1-4]H(24|X|N|J|T)$/,  // Standard time codes: 1H24, 2HX, 3HN, etc.
            /^[1-4]$/,               // Basic codes: 1, 2, 3, 4
            /^[0-9]{3,4}$/          // Numeric time codes
        ];

        const isValidFormat = timeCodePatterns.some(pattern => pattern.test(upperValue));

        if (!isValidFormat) {
            results.errors.push({
                fieldId: field.id,
                title: 'Time Code',
                message: `Invalid time code format: ${value}`,
                expectedFormat: 'NHX format (e.g., 1H24, 2HX, 3HN) per MCEB Pub 7'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Percent Time format (Field 131)
     */
    validatePercentTimeFormat(field, value, results) {
        // Maximum 2 characters per MCEB Pub 7
        if (value.length > 2) {
            results.errors.push({
                fieldId: field.id,
                title: 'Percent Time',
                message: 'Exceeds maximum 2 characters',
                expectedFormat: 'Percentage value 1-99'
            });
            return false;
        }

        const percentValue = parseInt(value);

        if (isNaN(percentValue) || percentValue < 1 || percentValue > 99) {
            results.errors.push({
                fieldId: field.id,
                title: 'Percent Time',
                message: `Invalid percent time: ${value}`,
                expectedFormat: 'Numeric percentage 1-99'
            });
            return false;
        }

        return true;
    }

    /**
     * Validate Date Field format (Fields 140-143)
     */
    validateDateFieldFormat(field, value, results) {
        // MCEB Pub 7 date format: YYYYMMDD
        const datePattern = /^\d{8}$/;

        if (!datePattern.test(value)) {
            results.errors.push({
                fieldId: field.id,
                title: 'Date Field',
                message: `Invalid date format: ${value}`,
                expectedFormat: 'YYYYMMDD format per MCEB Pub 7'
            });
            return false;
        }

        // Validate actual date
        const year = parseInt(value.substring(0, 4));
        const month = parseInt(value.substring(4, 6));
        const day = parseInt(value.substring(6, 8));

        const date = new Date(year, month - 1, day);

        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            results.errors.push({
                fieldId: field.id,
                title: 'Date Field',
                message: `Invalid date: ${value}`,
                expectedFormat: 'Valid date in YYYYMMDD format'
            });
            return false;
        }

        // Validate reasonable date ranges
        const currentYear = new Date().getFullYear();
        if (year < 1990 || year > currentYear + 50) {
            results.warnings.push({
                fieldId: field.id,
                title: 'Date Field',
                message: `Date outside typical range: ${year}`
            });
        }

        return true;
    }

    /**
     * Validate Function Identifier format (Fields 511/512/513)
     */
    validateFunctionIdentifierFormat(field, value, results) {
        const upperValue = value.toUpperCase();
        const fieldType = this.getFieldType(field);
        const maxLength = fieldType === '511' || fieldType === '512' ? 30 : 50;

        if (upperValue.length > maxLength) {
            results.errors.push({
                fieldId: field.id,
                title: 'Function Identifier',
                message: `Exceeds maximum ${maxLength} characters`,
                expectedFormat: `MCEB Pub 7 function identifier (max ${maxLength} chars)`
            });
            return false;
        }

        // Maximum 30 characters per MCEB Pub 7
        if (value.length > 30) {
            this.showFieldErrors(field, ['Maximum 30 characters per MCEB Pub 7 field 511']);
            return false;
        }

        // Official major function identifiers from MCEB Pub 7 Annex G
        const majorFunctionIdentifiers = [
            'AIR OPERATIONS', 'TACTICAL OPERATIONS', 'TRAINING', 'COMMUNICATIONS',
            'INTELLIGENCE', 'MEDICAL', 'LAW ENFORCEMENT', 'RANGE OPERATIONS',
            'SUSTAINING OPERATIONS', 'SPACE OPERATIONS', 'EMERGENCY SERVICES',
            'COMMAND AND CONTROL', 'DATA LINK', 'SPECIAL OPERATIONS',
            'DOMESTIC SUPPORT OPERATIONS', 'OTHER OPERATIONS'
        ];

        if (!majorFunctionIdentifiers.includes(value)) {
            this.showFieldWarning(field,
                'Function identifier not in official MCEB Pub 7 Annex G list. Verify identifier is correct.'
            );
        }

        return true;
    }

    /**
    // Validate Intermediate Function Identifier (Field 512) per MCEB Pub 7
     */
    validateIntermediateFunctionIdentifier(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 30 characters per MCEB Pub 7
        if (value.length > 30) {
            this.showFieldErrors(field, ['Maximum 30 characters per MCEB Pub 7 field 512']);
            return false;
        }

        // Extensive list from MCEB Pub 7 Annex G
        const intermediateFunctionIdentifiers = [
            // Air Operations
            'FLIGHT OPERATIONS', 'FLIGHT TEST', 'FORWARD AIR CONTROL POST',
            'GCA', 'PILOT-TO-DISPATCHER', 'PILOT-TO-METRO', 'PILOT-TO-PILOT',
            'RAMP CONTROL', 'REFUELING', 'SHIP/AIR OPERATIONS', 'AIR DEFENSE',
            'AIR DEFENSE WARNING', 'AIR DEFENSE / INTERCEPT', 'AIR FORCE ONE',
            'AIR FORCE SPECIAL OPERATIONS', 'AIR ROUTE SURVEILLANCE RADAR',
            'AIR TRAFFIC CONTROL', 'AIR/AIR COMMUNICATIONS', 'AIR/GROUND/AIR COMMUNICATIONS',
            'AIRBORNE COMMAND CENTER', 'AIRCRAFT', 'AIRPORT SURVEILLANCE RADAR',
            'APPROACH CONTROL', 'ARMY AVIATION',

            // Training
            'TRAINING', 'INSTRUCTOR/STUDENT TRAINING', 'EXERCISE', 'EXPERIMENTAL',
            'SIMULATOR', 'AERO CLUB', 'EDUCATION',

            // Tactical Operations
            'TACTICAL OPERATIONS', 'GROUND OPERATIONS', 'SEA OPERATIONS',
            'SPECIAL OPERATIONS', 'PSYCHOLOGICAL OPERATIONS', 'FIRE SUPPORT',
            'INFANTRY', 'GROUND INTERDICTION', 'ARTILLERY', 'MISSILE',
            'SPECIAL FORCES', 'RANGER UNITS', 'NAVY SPECIAL OPERATIONS',
            'NAVAL GUNFIRE SUPPORT', 'TARGET ACQUISITION', 'TARGET SCORING', 'TARGET',

            // Communications
            'COMMUNICATIONS', 'SATELLITE COMMUNICATIONS', 'RADIO RELAY', 'MICROWAVE',
            'MILSTAR', 'FLTSATCOM', 'GLOBAL', 'MARS', 'AFSATCOM', 'DSCS',
            'LEASAT', 'SPITFIRE', 'TROJAN SPIRIT', 'MSE', 'TACTS',
            'IONOSPHERIC SOUNDER', 'ISYSCON', 'GCCS', 'MICROWAVE DATA LINK',

            // Intelligence
            'INTELLIGENCE', 'SURVEILLANCE', 'RECONNAISSANCE', 'SURVEILLANCE/RECONNAISSANCE',
            'ACS', 'AHFEWS', 'ARL', 'TRACKWOLF', 'TRAILBLAZER', 'TEAMMATE',

            // Security/Law Enforcement
            'LAW ENFORCEMENT', 'SECURITY FORCE', 'MILITARY POLICE', 'SHORE PATROL',
            'FIRE', 'HAZMAT', 'CID', 'DIS', 'NCIS', 'OSI', 'SCOPE SHIELD',
            'SPEED MEASUREMENT SYSTEMS', 'SURVEILLANCE SYSTEMS', 'TETHERED AEROSTAT RADAR',
            'WEAPONS STORAGE PROTECTION', 'ALARM SYSTEMS', 'DISASTER PLANNING', 'EOD',
            'ANTI-TERRORISM', 'CIVIL DISTURBANCES', 'COUNTER DRUG', 'PROJECT COTHEN',
            'SPECIAL SECURITY OPERATIONS',

            // Emergency Services
            'EMERGENCY SERVICES', 'WARNING SYSTEM', 'CONSEQUENCE MANAGEMENT', 'CBR',
            'CIVIL SUPPORT TEAM', 'ENVIRONMENTAL CLEANUP', 'FEMA',
            'HAZARDOUS MATERIAL RELEASE', 'TECHNICAL ESCORT UNIT', 'MUTUAL AID',

            // Weather/Environmental
            'WEATHER', 'WEATHER RADAR', 'WIND PROFILER', 'AMSS', 'ASOS', 'AWOS',
            'GOES', 'IMETS', 'NEXRAD', 'RADIOSONDE', 'SAWDS',

            // Range Operations
            'RANGE OPERATIONS', 'RANGE CONTROL', 'RDTE SUPPORT', 'TEST AND MEASUREMENT',
            'TEST RANGE TIMING', 'TEST RANGE', 'RDMS', 'OCCS SUPPORT',

            // Sustaining Operations
            'SUSTAINING OPERATIONS', 'FLEET SUPPORT', 'PUBLIC WORKS', 'NATURAL RESOURCES',
            'RESOURCES CONSERVATION', 'SAFETY', 'LOCKS AND DAMS', 'HYDROLOGIC',
            'METEOROLOGICAL', 'SEISMIC', 'NAVAIDS', 'NAVIGATION RADAR', 'CIVIL ENGINEERING',
            'CIVIL WORKS', 'CONSTRUCTION', 'INDUSTRIAL CONTROLS', 'PRIME BEEF',
            'RED HORSE', 'SEABEES', 'UTILITIES', 'WILDLIFE PRESERVATION',
            'NAVAIDS CONTROLS', 'REMOTE BARRIER CONTROL SYSTEMS', 'RUNWAY LIGHTING CONTROL',

            // Space Operations
            'SPACE OPERATIONS', 'SATELLITE COMMUNICATIONS', 'GPS', 'SHUTTLE', 'NASA',
            'SGLS', 'ARTS', 'TELEMETRY', 'TELECOMMAND', 'UAV',

            // Logistics
            'LOGISTICS', 'MAINTENANCE', 'MUNITIONS', 'POL', 'RESUPPLY',
            'INVENTORY/INVENTORY CONTROLS', 'SUPPLY AND LOGISTICS', 'SHIPYARD',
            'TRANSPORTATION', 'TAXI', 'AMPS', 'CSSCS', 'MTS', 'RF TAGS',

            // Global Operations
            'GLOBAL', 'WORLDWIDE', 'CONUS', 'NATO', 'OTHER OPERATIONS', 'SPECIAL PROJECTS',
            'HAARP', 'SURVEY', 'DTSS', 'ETRAC'
        ];

        if (!intermediateFunctionIdentifiers.includes(value)) {
            this.showFieldWarning(field,
                'Function identifier not in official MCEB Pub 7 list. Verify identifier is correct.'
            );
        }

        return true;
    }

    /**
    // Validate Equipment Certification ID (Fields 343/443) per MCEB Pub 7
     */
    validateEquipmentCertification(field) {
        const value = field.value.trim();
        if (!value) return true;

        // Maximum 15 characters per MCEB Pub 7
        if (value.length > 15) {
            this.showFieldErrors(field, ['Maximum 15 characters per MCEB Pub 7 equipment certification field']);
            return false;
        }

        // Military equipment certification pattern validation
        const certificationPattern = /^[A-Z]\/[A-Z]\s\d{2}\/\d{5}$/;

        if (!certificationPattern.test(value)) {
            this.showFieldWarning(field,
                'Equipment certification should follow military format (e.g., J/F 12/11171)'
            );
        }

        return true;
    }

    /**
    // Validate Agency (Field 200) per MCEB Pub 7
     */
    validateAgency(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        const validAgencies = ['USAF', 'USA', 'USN', 'USMC', 'USCG'];

        if (!validAgencies.includes(value)) {
            this.showFieldErrors(field, [
                'Invalid agency per MCEB Pub 7',
                'Valid values: USAF (Air Force), USA (Army), USN (Navy), USMC (Marines), USCG (Coast Guard)'
            ]);
            return false;
        }

        return true;
    }

    /**
    // Validate State/Country (Fields 300/400) per MCEB Pub 7
     */
    validateStateCountry(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 4 characters per MCEB Pub 7
        if (value.length > 4) {
            this.showFieldErrors(field, ['Maximum 4 characters per MCEB Pub 7 geographic field']);
            return false;
        }

        // US States and territories from MCEB Pub 7 Annex C
        const validGeographicCodes = [
            // 50 US States
            'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL',
            'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA',
            'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE',
            'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI',
            'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY',

            // US Territories
            'PR', 'VI', 'GUM', 'SMA', 'MRA', 'MDW', 'PLM', 'WAK', 'JON',

            // Common international codes
            'CAN', 'MEX', 'USA', 'GBR', 'FRA', 'DEU', 'JPN', 'AUS'
        ];

        if (!validGeographicCodes.includes(value)) {
            this.showFieldWarning(field,
                'Geographic code not in common MCEB Pub 7 Annex C list. Verify code is correct.'
            );
        }

        return true;
    }

    /**
    // Validate antenna location (Fields 301/401) per MCEB Pub 7
     */
    validateAntennaLocation(field) {
        const value = field.value.trim();
        if (!value) return true;

        // Maximum 24 characters per MCEB Pub 7
        if (value.length > 24) {
            this.showFieldErrors(field, ['Maximum 24 characters per MCEB Pub 7 antenna location field']);
            return false;
        }

        // Basic format validation for location names
        const locationPattern = /^[A-Za-z0-9\s\-\.]+$/;

        if (!locationPattern.test(value)) {
            this.showFieldErrors(field, [
                'Invalid characters in antenna location',
                'Use alphanumeric characters, spaces, hyphens, and periods only'
            ]);
            return false;
        }

        return true;
    }

    /**
     * Generic field validation for character limits and required fields
     */
    validateGenericField(field, fieldSpec) {
        const value = field.value.trim();

        // Check required fields
        if (fieldSpec.required && !value) {
            this.showFieldErrors(field, [`${fieldSpec.title} is required per MCEB Pub 7`]);
            return false;
        }

        // Check character limits
        if (fieldSpec.maxLength && value.length > fieldSpec.maxLength) {
            this.showFieldErrors(field, [
                `Maximum ${fieldSpec.maxLength} characters per MCEB Pub 7 ${fieldSpec.title}`
            ]);
            return false;
        }

        return true;
    }

    // ===== UTILITY METHODS =====

    /**
     * Get field type from ID or data attribute
     */
    getFieldType(field) {
        // Extract field number from ID (e.g., "field110_1" -> "110")
        const idMatch = field.id.match(/field(\d{3})/);
        if (idMatch) {
            return idMatch[1];
        }

        // Check data-field attribute
        return field.dataset.field || null;
    }

    /**
     * Get field specification from fieldSpecs
     */
    getFieldSpec(field) {
        const fieldType = this.getFieldType(field);
        if (!fieldType) return null;

        const baseFieldId = `field${fieldType}`;
        return this.fieldSpecs[baseFieldId] || null;
    }

    /**
     * Show field errors with MCEB Pub 7 styling
     */
    showFieldErrors(field, errors) {
        // Clear existing errors
        this.clearFieldErrors(field);

        // Set field border to error state
        field.style.borderColor = '#dc3545';
        field.style.borderWidth = '2px';

        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'field-errors';
        errorContainer.style.cssText = `
            color: #dc3545;
            font-size: 0.875em;
            margin-top: 4px;
            padding: 6px;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
        `;

        // Add error messages
        errors.forEach(error => {
            const errorMsg = document.createElement('div');
            errorMsg.textContent = error;
            errorContainer.appendChild(errorMsg);
        });

        // Insert after field
        field.parentNode.insertBefore(errorContainer, field.nextSibling);
    }

    /**
     * Show field warning (non-critical validation issues)
     */
    showFieldWarning(field, warning) {
        // Clear existing errors
        this.clearFieldErrors(field);

        // Set field border to warning state
        field.style.borderColor = '#ffc107';
        field.style.borderWidth = '2px';

        // Create warning container
        const warningContainer = document.createElement('div');
        warningContainer.className = 'field-warning';
        warningContainer.style.cssText = `
            color: #856404;
            font-size: 0.875em;
            margin-top: 4px;
            padding: 6px;
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
        `;

        warningContainer.textContent = warning;

        // Insert after field
        field.parentNode.insertBefore(warningContainer, field.nextSibling);
    }

    /**
     * Clear field errors and warnings
     */
    clearFieldErrors(field) {
        // Reset field styling
        field.style.borderColor = '';
        field.style.borderWidth = '';

        // Remove error and warning elements
        const errorElements = field.parentNode.querySelectorAll('.field-errors, .field-warning');
        errorElements.forEach(element => element.remove());
    }

    /**
    // Validate all fields in the form
     */
    validateAllFields() {
        let isAllValid = true;
        const fields = document.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            const fieldType = this.getFieldType(field);
            if (fieldType) {
                const spec = this.getFieldSpec(field);
                const isValid = this.validateField(field, spec);
                if (!isValid) {
                    isAllValid = false;
                }
            }
        });

        return isAllValid;
    }

    /**
     * Character counter update for MCEB Pub 7 compliance
     */
    updateCharacterCounter(field) {
        const spec = this.getFieldSpec(field);
        if (!spec || !spec.maxLength) return;

        let counter = field.parentNode.querySelector('.char-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.style.cssText = `
                font-size: 0.75em;
                color: #666;
                text-align: right;
                margin-top: 2px;
            `;
            field.parentNode.appendChild(counter);
        }

        const current = field.value.length;
        const max = spec.maxLength;
        const remaining = max - current;

        counter.textContent = `${current}/${max} characters`;

        // Color coding based on remaining characters
        if (remaining < 0) {
            counter.style.color = '#dc3545'; // Over limit - red
            field.style.borderColor = '#dc3545';
        } else if (remaining < 5) {
            counter.style.color = '#ffc107'; // Near limit - yellow
            field.style.borderColor = '#ffc107';
        } else if (remaining < 10) {
            counter.style.color = '#fd7e14'; // Getting close - orange
        } else {
            counter.style.color = '#666'; // Normal - gray
            field.style.borderColor = '';
        }
    }

    /**
     * Get summary of validation results
     */
    getValidationSummary() {
        const fields = document.querySelectorAll('input, select, textarea');
        const summary = {
            totalFields: 0,
            validFields: 0,
            invalidFields: 0,
            errors: [],
            warnings: []
        };

        fields.forEach(field => {
            const fieldType = this.getFieldType(field);
            if (fieldType) {
                summary.totalFields++;

                const spec = this.getFieldSpec(field);
                const isValid = this.validateField(field, spec);

                if (isValid) {
                    summary.validFields++;
                } else {
                    summary.invalidFields++;
                    summary.errors.push(`Field ${fieldType} (${spec?.title || 'Unknown'}): Validation failed`);
                }
            }
        });

        return summary;
    }
}

// ===== UTILITY FUNCTIONS FOR STANDALONE USE =====

/**
 * Initialize SFAF validation system
 * @param {Object} fieldSpecs - Field specifications from SFAF Field Manager
 * @param {Object} referenceData - Reference data (power types, equipment codes, etc.)
 * @returns {SFAFCompliance} - Validator instance
 */
function initializeSFAFValidation(fieldSpecs, referenceData) {
    return new SFAFCompliance(fieldSpecs, referenceData);
}

/**
 * Quick validation function for single field
 * @param {HTMLElement} field - Form field to validate
 * @param {Object} fieldSpecs - Field specifications
 * @returns {boolean} - Validation result
 */
function validateSFAFField(field, fieldSpecs) {
    const validator = new SFAFCompliance(fieldSpecs);
    return validator.validateField(field);
}

/**
 * Bulk validation function for all SFAF fields
 * @param {Object} fieldSpecs - Field specifications
 * @param {Object} referenceData - Reference data
 * @returns {Object} - Validation summary
 */
function validateAllSFAFFields(fieldSpecs, referenceData) {
    const validator = new SFAFCompliance(fieldSpecs, referenceData);
    const isValid = validator.validateAllFields();
    const summary = validator.getValidationSummary();

    return {
        isValid,
        summary
    };
}

// ===== EXPORT FOR MODULE SYSTEMS =====

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SFAFCompliance,
        initializeSFAFValidation,
        validateSFAFField,
        validateAllSFAFFields
    };
}

// For AMD/RequireJS
if (typeof define === 'function' && define.amd) {
    define([], function () {
        return {
            SFAFCompliance,
            initializeSFAFValidation,
            validateSFAFField,
            validateAllSFAFFields
        };
    });
}

// For global/browser use
if (typeof window !== 'undefined') {
    window.SFAFCompliance = SFAFCompliance;
    window.initializeSFAFValidation = initializeSFAFValidation;
    window.validateSFAFField = validateSFAFField;
    window.validateAllSFAFFields = validateAllSFAFFields;
}

// ===== INTEGRATION WITH EXISTING SFAF FIELD MANAGER =====

/**
 * Connect validation system to existing SFAF Field Manager
 */
document.addEventListener('DOMContentLoaded', () => {
    // Wait for SFAF Field Manager initialization
    setTimeout(() => {
        if (window.sfafFieldManager) {
            // Initialize validator with SFAF Field Manager data
            const validator = new SFAFCompliance(
                window.sfafFieldManager.fieldSpecs,
                {
                    powerTypes: window.sfafFieldManager.powerTypes,
                    equipmentManufacturers: window.sfafFieldManager.equipmentManufacturers,
                    geographicCodes: window.sfafFieldManager.geographicCodes,
                    iracNotes: window.sfafFieldManager.iracNotes,
                    functionIdentifiers: window.sfafFieldManager.functionIdentifiers
                }
            );

            // Attach validation to all form fields
            const fields = document.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                const fieldType = validator.getFieldType(field);
                if (fieldType) {
                    // Validation on blur
                    field.addEventListener('blur', () => {
                        validator.validateField(field);
                    });

                    // Character counter on input
                    field.addEventListener('input', () => {
                        validator.clearFieldErrors(field);
                        validator.updateCharacterCounter(field);
                    });
                }
            });

            // Make validator globally available
            window.SFAFCompliance = validator;

            console.log('✅ SFAF Validation system initialized with MCEB Pub 7 compliance');
        }
    }, 1500);
});