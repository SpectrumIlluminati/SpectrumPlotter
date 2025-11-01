// validation.js - MCEB Publication 7 Compliant SFAF Field Validation System
// Consolidated validation for all SFAF data items per MCEB Pub 7 (1 November 2018)

class SFAFValidator {
    constructor(fieldSpecs, referenceData) {
        this.fieldSpecs = fieldSpecs || {};
        this.referenceData = referenceData || {};
        this.powerTypes = referenceData.powerTypes || {};
        this.equipmentManufacturers = referenceData.equipmentManufacturers || {};
        this.geographicCodes = referenceData.geographicCodes || {};
        this.iracNotes = referenceData.iracNotes || {};
        this.functionIdentifiers = referenceData.functionIdentifiers || [];
    }

    // ===== PRIMARY VALIDATION METHODS =====

    /**
     * Main validation entry point for any SFAF field
     * @param {HTMLElement} field - The form field to validate
     * @param {Object} spec - Field specification from MCEB Pub 7
     * @returns {boolean} - Validation result
     */
    validateField(field, spec = null) {
        if (!field) return false;

        // Clear existing errors
        this.clearFieldErrors(field);

        // Get field specification
        const fieldSpec = spec || this.getFieldSpec(field);
        if (!fieldSpec) return true;

        // Get field type from ID or data attribute
        const fieldType = this.getFieldType(field);

        // Perform validation based on field type
        switch (fieldType) {
            case '005': return this.validateSecurityClassification(field);
            case '010': return this.validateTypeOfAction(field);
            case '102': return this.validateAgencySerialNumber(field);
            case '110': return this.validateFrequency(field);
            case '113': return this.validateStationClass(field);
            case '114': return this.validateEmissionDesignator(field);
            case '115': return this.validateTransmitterPower(field);
            case '116': return this.validatePowerType(field);
            case '200': return this.validateAgency(field);
            case '300':
            case '400': return this.validateStateCountry(field);
            case '301':
            case '401': return this.validateAntennaLocation(field);
            case '303':
            case '403': return this.validateCoordinates(field);
            case '340':
            case '440': return this.validateEquipmentNomenclature(field);
            case '343':
            case '443': return this.validateEquipmentCertification(field);
            case '500': return this.validateIRACNotes(field);
            case '501': return this.validateComments(field);
            case '502': return this.validateDescriptionOfRequirement(field);
            case '511': return this.validateMajorFunctionIdentifier(field);
            case '512': return this.validateIntermediateFunctionIdentifier(field);
            case '513': return this.validateDetailedFunctionIdentifier(field);
            case '520': return this.validateSupplementaryDetails(field);
            default: return this.validateGenericField(field, fieldSpec);
        }
    }

    // ===== SPECIFIC FIELD VALIDATION METHODS =====

    /**
    // Validate Security Classification (Field 005) per MCEB Pub 7
     */
    validateSecurityClassification(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        const validClassifications = ['U', 'UE', 'C', 'S'];

        if (!validClassifications.includes(value)) {
            this.showFieldErrors(field, [
                'Invalid security classification per MCEB Pub 7',
                'Valid values: U (Unclassified), UE (For Official Use Only), C (Confidential), S (Secret)'
            ]);
            return false;
        }

        return true;
    }

    /**
    // Validate Type of Action (Field 010) per MCEB Pub 7
     */
    validateTypeOfAction(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        const validActions = ['A', 'D', 'E', 'F', 'M', 'N', 'R'];

        if (!validActions.includes(value)) {
            this.showFieldErrors(field, [
                'Invalid type of action per MCEB Pub 7',
                'Valid values: A (Administrative), D (Delete), M (Modification), N (New), R (Renewal)'
            ]);
            return false;
        }

        return true;
    }

    /**
    // Validate Agency Serial Number (Field 102) per MCEB Pub 7
     */
    validateAgencySerialNumber(field) {
        const value = field.value.trim();
        if (!value) return true;

        // Maximum 10 characters per MCEB Pub 7
        if (value.length > 10) {
            this.showFieldErrors(field, ['Maximum 10 characters per MCEB Pub 7 field 102']);
            return false;
        }

        // Alphanumeric format validation
        const validFormat = /^[A-Z0-9\s]+$/i;
        if (!validFormat.test(value)) {
            this.showFieldErrors(field, [
                'Invalid format for agency serial number',
                'Use alphanumeric characters only (e.g., AF 192345, N 773101)'
            ]);
            return false;
        }

        return true;
    }

    /**
    // Validate Frequency (Field 110) per MCEB Pub 7 - Single occurrence only
     */
    validateFrequency(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 11 characters per MCEB Pub 7
        if (value.length > 11) {
            this.showFieldErrors(field, ['Maximum 11 characters per MCEB Pub 7 field 110']);
            return false;
        }

        // MCEB Pub 7 frequency format patterns
        const frequencyPatterns = [
            /^[KM]\d{1,7}(\.\d{1,3})?(\(\d{1,7}(\.\d{1,3})?\))?$/, // K4726.5(4725) format
            /^\d{1,7}(\.\d{1,6})?$/, // Simple numeric format
            /^[HV]\d{1,7}(\.\d{1,3})?$/ // HF/VHF format
        ];

        const isValidFormat = frequencyPatterns.some(pattern => pattern.test(value));

        if (!isValidFormat) {
            this.showFieldErrors(field, [
                'Invalid frequency format per MCEB Pub 7',
                'Examples: K4726.5, M225.8, K4726.5(4725)',
                'Maximum 11 characters including reference frequency'
            ]);
            return false;
        }

        return true;
    }

    /**
    // Validate Station Class (Field 113) per MCEB Pub 7
     */
    validateStationClass(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 4 characters per MCEB Pub 7
        if (value.length > 4) {
            this.showFieldErrors(field, ['Maximum 4 characters per MCEB Pub 7 field 113']);
            return false;
        }

        // Common station class codes from MCEB Pub 7 Annex A
        const validStationClasses = [
            'FB', 'FB2', 'FB3', 'FB8', 'FX1', // Fixed Service
            'ML', 'MA', 'MO', 'MP', 'MR', 'MS', 'MT', // Mobile Service
            'BC', 'BT', // Broadcasting
            'AC', 'AD', 'AF', 'AG', 'AL', 'AR', 'AS', 'AT', // Aeronautical
            'CG', 'CP', 'CS', 'CT', // Maritime
            'HA', // Amateur
            'XE', 'XF', 'XM', 'XR', 'XT' // Experimental
        ];

        if (!validStationClasses.includes(value)) {
            this.showFieldWarning(field,
                'Station class not in common MCEB Pub 7 list. Verify against MCEB Pub 7 Annex A.'
            );
        }

        return true;
    }

    /**
    // Validate Emission Designator (Field 114) per MCEB Pub 7
     */
    validateEmissionDesignator(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 11 characters per MCEB Pub 7
        if (value.length > 11) {
            this.showFieldErrors(field, ['Maximum 11 characters per MCEB Pub 7 field 114']);
            return false;
        }

        // ITU emission designator format validation per MCEB Pub 7 Annex B
        const emissionPattern = /^(\d{1,4}[KMGHZ]?\d{0,2})?[NAHGRJFCPKLQVMWX][0-9X][NABCDEFWX]([ABCDEFGHJKLMNWX]([NCFTWX])?)?$/;

        if (!emissionPattern.test(value)) {
            this.showFieldErrors(field, [
                'Invalid emission designator format per MCEB Pub 7',
                'Examples: A3E, F3E, 16K0F3E, 2K70J3E',
                'Format: [bandwidth][emission class][information type]'
            ]);
            return false;
        }

        return true;
    }

    // Validate Transmitter Power (Field 115) per MCEB Pub 7
    validateTransmitterPower(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 9 characters per MCEB Pub 7
        if (value.length > 9) {
            this.showFieldErrors(field, ['Maximum 9 characters per MCEB Pub 7 field 115']);
            return false;
        }

        // Power format validation: numeric + unit
        const powerPattern = /^[KMWV]\d{1,7}(\.\d{1,3})?$/;

        if (!powerPattern.test(value)) {
            this.showFieldErrors(field, [
                'Invalid transmitter power format per MCEB Pub 7',
                'Examples: K10, W50, M5',
                'Format: [K=kW, W=watts, M=MW, V=microvolts] + numeric value'
            ]);
            return false;
        }

        return true;
    }

    // Validate Power Type (Field 116) per MCEB Pub 7
    validatePowerType(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        const validPowerTypes = ['C', 'M', 'P'];

        if (!validPowerTypes.includes(value)) {
            this.showFieldErrors(field, [
                'Invalid power type per MCEB Pub 7',
                'Valid values: C (Carrier), M (Mean), P (Peak Envelope)'
            ]);
            return false;
        }

        return true;
    }

    // Validate IRAC Notes (Field 500) per MCEB Pub 7 (continued)
    validateIRACNotes(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

        // Maximum 4 characters per MCEB Pub 7
        if (value.length > 4) {
            this.showFieldErrors(field, ['Maximum 4 characters per MCEB Pub 7 field 500']);
            return false;
        }

        // Check against official IRAC notes from MCEB Pub 7 Annex E
        const officialIRACNotes = {
            // Coordination Notes (C-Series)
            'C002': 'Western Area Frequency Coordinator coordination required',
            'C004': 'Eastern Area Frequency Coordinator coordination required',
            'C006': 'White Sands Missile Range coordination required',
            'C008': 'Arizona Area Frequency Coordinator coordination required',
            'C010': 'Gulf Area Frequency Coordinator coordination required',
            'C012': 'Pacific Joint Frequency Management Office coordination required',
            'C019': 'Army Frequency Management Office coordination required',
            'C060': 'Military installation commander coordination required',

            // Emission Notes (E-Series)
            'E028': 'Lower sideband transmission authorized',
            'E029': 'Upper sideband transmission authorized',
            'E035': 'Lower sideband transmission',
            'E036': 'Upper sideband transmission',

            // Limitation Notes (L-Series)
            'L012': 'Emergency use only - life/safety/property protection',
            'L116': 'Daytime use only',
            'L131': 'Nighttime use only',
            'L174': 'Army communications only',
            'L180': 'Coast Guard communications only',
            'L187': 'Military communications only',
            'L190': 'Navy communications only',
            'L282': 'Back-up use only when regular channels disrupted',

            // Special Notes (S-Series)
            'S063': 'Search and rescue communications',
            'S142': 'Drone control operations',
            'S148': 'National emergency communications'
        };

        if (!officialIRACNotes[value]) {
            this.showFieldWarning(field,
                'IRAC note not in official MCEB Pub 7 Annex E list. Verify code is correct.'
            );
        }

        return true;
    }

    /**
    // Validate Major Function Identifier (Field 511) per MCEB Pub 7
     */
    validateMajorFunctionIdentifier(field) {
        const value = field.value.trim().toUpperCase();
        if (!value) return true;

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
 * @returns {SFAFValidator} - Validator instance
 */
function initializeSFAFValidation(fieldSpecs, referenceData) {
    return new SFAFValidator(fieldSpecs, referenceData);
}

/**
 * Quick validation function for single field
 * @param {HTMLElement} field - Form field to validate
 * @param {Object} fieldSpecs - Field specifications
 * @returns {boolean} - Validation result
 */
function validateSFAFField(field, fieldSpecs) {
    const validator = new SFAFValidator(fieldSpecs);
    return validator.validateField(field);
}

/**
 * Bulk validation function for all SFAF fields
 * @param {Object} fieldSpecs - Field specifications
 * @param {Object} referenceData - Reference data
 * @returns {Object} - Validation summary
 */
function validateAllSFAFFields(fieldSpecs, referenceData) {
    const validator = new SFAFValidator(fieldSpecs, referenceData);
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
        SFAFValidator,
        initializeSFAFValidation,
        validateSFAFField,
        validateAllSFAFFields
    };
}

// For AMD/RequireJS
if (typeof define === 'function' && define.amd) {
    define([], function () {
        return {
            SFAFValidator,
            initializeSFAFValidation,
            validateSFAFField,
            validateAllSFAFFields
        };
    });
}

// For global/browser use
if (typeof window !== 'undefined') {
    window.SFAFValidator = SFAFValidator;
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
            const validator = new SFAFValidator(
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
            window.sfafValidator = validator;

            console.log('✅ SFAF Validation system initialized with MCEB Pub 7 compliance');
        }
    }, 1500);
});