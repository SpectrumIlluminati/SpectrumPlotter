

(function () {
    'use strict';

    // Prevent multiple initializations
    if (window.sfafFieldManager) {
        this.log('⚠️ SFAF Manager already exists');
        return;
    }

    class SFAFFieldManager {
        constructor() {
            this.fieldSpecs = this.initializeFieldSpecs();
            this.geographicCodes = {};
            this.iracNotes = {};
            this.functionIdentifiers = [];
            this.equipmentManufacturers = {};
            this.timeCodeDefinitions = {};
            this.powerTypes = {};

            // Initialize with MCEB compliance
            this.initializeWithMCEBCompliance();
        }

        // Initialize field specifications
        initializeFieldSpecs() {
            return {
                'field005': { title: 'Security Classification', maxLength: 15, required: true },
                'field010': { title: 'Type of Action', maxLength: 3, required: true },
                'field013': { title: 'Priority Indicator', maxLength: 1 },
                'field019': { title: 'Coordination Required', maxLength: 1 },
                'field102': { title: 'Agency Serial Number', maxLength: 20, required: true },
                'field110': { title: 'Frequency', maxLength: 14, maxOccurrences: 300, required: true },
                'field113': { title: 'Station Class', maxLength: 3, maxOccurrences: 300, required: true },
                'field114': { title: 'Emission Designator', maxLength: 11, maxOccurrences: 300, required: true },
                'field115': { title: 'Transmitter Power', maxLength: 11, maxOccurrences: 300, required: true },
                'field116': { title: 'Power Type', maxLength: 1, maxOccurrences: 300 },
                'field117': { title: 'Antenna Gain', maxLength: 7, maxOccurrences: 300 },
                'field118': { title: 'Antenna Pattern', maxLength: 3, maxOccurrences: 300 },
                'field130': { title: 'Time Code', maxLength: 4 },
                'field131': { title: 'Percent Time', maxLength: 2 },
                'field140': { title: 'Start Date', maxLength: 8 },
                'field141': { title: 'Stop Date', maxLength: 8 },
                'field142': { title: 'Repetitive Start Date', maxLength: 8 },
                'field143': { title: 'Repetitive Stop Date', maxLength: 8 },
                'field144': { title: 'Years of Repetition', maxLength: 2 },
                'field200': { title: 'Agency', maxLength: 4, required: true },
                'field201': { title: 'Station Serial Number', maxLength: 20 },
                'field202': { title: 'Net Identifier', maxLength: 20 },
                'field204': { title: 'Station Call Sign', maxLength: 10 },
                'field205': { title: 'Circuit Identifier', maxLength: 20 },
                'field206': { title: 'Geographic Code', maxLength: 1 },
                'field207': { title: 'Function Identifier', maxLength: 50 },
                'field208': { title: 'Equipment Designation', maxLength: 40, maxOccurrences: 50 },
                'field209': { title: 'Supplementary Details', maxLength: 200, maxOccurrences: 50 },
                'field300': { title: 'State/Country (TX)', maxLength: 2, required: true },
                'field301': { title: 'Antenna Location (TX)', maxLength: 30, required: true },
                'field303': { title: 'Antenna Coordinates (TX)', maxLength: 15, required: true },
                'field306': { title: 'Geographic Area (TX)', maxLength: 1 },
                'field340': { title: 'TX Equipment Class', maxLength: 20, maxOccurrences: 50 },
                'field343': { title: 'TX Equipment Manufacturer', maxLength: 3, maxOccurrences: 50 },
                'field357': { title: 'TX Antenna Height AGL', maxLength: 6 },
                'field362': { title: 'TX Antenna Azimuth', maxLength: 3 },
                'field363': { title: 'TX Antenna Elevation', maxLength: 4 },
                'field373': { title: 'TX Antenna Polarization', maxLength: 1 },
                'field400': { title: 'State/Country (RX)', maxLength: 2, required: true },
                'field401': { title: 'Antenna Location (RX)', maxLength: 30, required: true },
                'field403': { title: 'Antenna Coordinates (RX)', maxLength: 15, required: true },
                'field407': { title: 'Geographic Area (RX)', maxLength: 1 },
                'field440': { title: 'RX Equipment Class', maxLength: 20, maxOccurrences: 50 },
                'field443': { title: 'RX Equipment Manufacturer', maxLength: 3, maxOccurrences: 50 },
                'field457': { title: 'RX Antenna Height AGL', maxLength: 6 },
                'field462': { title: 'RX Antenna Azimuth', maxLength: 3 },
                'field463': { title: 'RX Antenna Elevation', maxLength: 4 },
                'field470': { title: 'RX Antenna Beamwidth H', maxLength: 3 },
                'field471': { title: 'RX Antenna Beamwidth V', maxLength: 3 },
                'field472': { title: 'RX Antenna Front-to-Back', maxLength: 3 },
                'field473': { title: 'RX Antenna Polarization', maxLength: 1 },
                'field500': { title: 'IRAC Coordination Notes', maxLength: 3, maxOccurrences: 100 },
                'field501': { title: 'Coordination Comments', maxLength: 200, maxOccurrences: 100 },
                'field502': { title: 'Justification', maxLength: 200 },
                'field503': { title: 'Additional Information', maxLength: 200 },
                'field511': { title: 'Link Budget', maxLength: 200 },
                'field512': { title: 'Bandwidth Justification', maxLength: 200 },
                'field513': { title: 'RF Exposure Analysis', maxLength: 200 },
                'field520': { title: 'Technical Contact', maxLength: 50 },
                'field701': { title: 'Host Nation Frequency', maxLength: 14 },
                'field702': { title: 'NTIA Identifier', maxLength: 9 },
                'field716': { title: 'Previous Assignment ID', maxLength: 20 },
                'field801': { title: 'ITU Region', maxLength: 1 },
                'field803': { title: 'ITU Notification Number', maxLength: 20 },
                'field804': { title: 'ITU Notification Date', maxLength: 8 },
                'field903': { title: 'Coordination Status', maxLength: 20 }
            };
        }

        // Initialize with MCEB Pub 7 compliance
        initializeWithMCEBCompliance() {
            console.log('✅ SFAF Field Manager initialized with MCEB Pub 7 compliance');

            // Load all official MCEB Pub 7 reference data
            this.geographicCodes = this.loadOfficialGeographicCodes();
            this.iracNotes = this.loadOfficialIRACNotes();
            this.functionIdentifiers = this.loadOfficialFunctionIdentifiers();
            this.equipmentManufacturers = this.loadOfficialEquipmentCodes();
            this.timeCodeDefinitions = this.loadOfficialTimeCodes();
            this.powerTypes = this.loadOfficialPowerTypes();

            // Initialize validation and dynamic entry management
            this.initializeValidation();
            this.initializeDynamicEntries();
            this.addFieldCounters();
            this.enableAutoSave();
            this.initializeExistingButtons();

            this.log('📊 Loaded official MCEB Pub 7 reference data:');
            this.log(`  - Geographic codes: ${Object.keys(this.geographicCodes).length} regions`);
            this.log(`  - IRAC coordination notes: ${Object.keys(this.iracNotes).length} notes`);
            this.log(`  - Function identifiers: ${this.functionIdentifiers.length} functions`);
            this.log(`  - Equipment manufacturer codes: ${Object.keys(this.equipmentManufacturers).length} codes`)

            // ADD DEBUG CALLS:
            setTimeout(() => {
                this.debugDOMStructure();
                this.testDynamicFieldMethods();
                this.debugButtonEvents();
            }, 1000);;
        }

        // ADD this debug method to SFAFFieldManager class:
        debugDOMStructure() {
            console.log('🔍 DOM STRUCTURE DEBUG:');

            // Check for frequency fields
            const freqFields = document.querySelectorAll('[id*="110"], [id*="frequency"], [name*="frequency"]');
            console.log('Frequency fields found:', freqFields.length, Array.from(freqFields).map(f => f.id));

            // Check for add buttons
            const addButtons = document.querySelectorAll('[id*="add"], [class*="add"], button:contains("Add")');
            console.log('Add buttons found:', addButtons.length, Array.from(addButtons).map(b => ({ id: b.id, class: b.className, text: b.textContent })));

            // Check for Object Sidebar tab content
            const objectTab = document.querySelector('[data-tab="object"], .object-tab, #object-tab');
            console.log('Object tab found:', !!objectTab, objectTab?.innerHTML?.substring(0, 200));

            // Check for form groups
            const formGroups = document.querySelectorAll('.form-group, .field-group, .input-group');
            console.log('Form groups found:', formGroups.length);

            return {
                freqFields: freqFields.length,
                addButtons: addButtons.length,
                objectTab: !!objectTab,
                formGroups: formGroups.length
            };
        }

        // ADD this method to debug button events:
        debugButtonEvents() {
            console.log('🔍 BUTTON EVENT DEBUG:');

            // Find the specific add frequency button
            const addFreqBtn = document.getElementById('addFrequencyEntry');
            console.log('Add frequency button found:', !!addFreqBtn);

            if (addFreqBtn) {
                console.log('Button details:', {
                    id: addFreqBtn.id,
                    className: addFreqBtn.className,
                    onclick: !!addFreqBtn.onclick,
                    listeners: getEventListeners ? getEventListeners(addFreqBtn) : 'Use dev tools'
                });

                // Add temporary test handler
                addFreqBtn.addEventListener('click', (e) => {
                    console.log('🔥 BUTTON CLICKED!', e);
                    e.preventDefault();

                    // Test direct method call
                    try {
                        this.addFieldOccurrence('field110', this.fieldSpecs['field110']);
                        console.log('✅ Direct method call succeeded');
                    } catch (error) {
                        console.error('❌ Direct method call failed:', error);
                    }
                });
            }

            // Check all buttons in Object tab
            const allButtons = document.querySelectorAll('button');
            console.log('All buttons found:', allButtons.length);
            allButtons.forEach((btn, i) => {
                if (btn.textContent.includes('Add') || btn.id.includes('add')) {
                    console.log(`Button ${i}:`, {
                        id: btn.id,
                        text: btn.textContent.trim(),
                        hasClickHandler: !!btn.onclick
                    });
                }
            });
        }

        // ADD this to SFAFFieldManager class:
        testDynamicFieldMethods() {
            console.log('🧪 TESTING DYNAMIC FIELD METHODS:');

            // Test 1: Check field specs
            const field110Spec = this.fieldSpecs['field110'];
            console.log('Field110 spec:', field110Spec);

            // Test 2: Try to find first field
            const firstField = document.getElementById('field110_1');
            console.log('First field found:', !!firstField, firstField?.outerHTML);

            // Test 3: Test method existence
            const methods = ['setupDynamicField', 'addFieldOccurrence', 'createFieldOccurrence'];
            methods.forEach(method => {
                console.log(`Method ${method}:`, typeof this[method]);
            });

            // Test 4: Try manual field creation
            try {
                if (field110Spec) {
                    console.log('Attempting manual field creation...');
                    const newField = this.createFieldOccurrence('field110_test', field110Spec, 2);
                    console.log('Field created successfully:', !!newField);
                }
            } catch (error) {
                console.error('Field creation failed:', error);
            }

            return {
                hasSpec: !!field110Spec,
                hasFirstField: !!firstField,
                methodsExist: methods.every(m => typeof this[m] === 'function')
            };
        }

        // ADD this method to debug button events:
        debugButtonEvents() {
            console.log('🔍 BUTTON EVENT DEBUG:');

            // Find the specific add frequency button
            const addFreqBtn = document.getElementById('addFrequencyEntry');
            console.log('Add frequency button found:', !!addFreqBtn);

            if (addFreqBtn) {
                console.log('Button details:', {
                    id: addFreqBtn.id,
                    className: addFreqBtn.className,
                    onclick: !!addFreqBtn.onclick,
                    listeners: getEventListeners ? getEventListeners(addFreqBtn) : 'Use dev tools'
                });

                // Add temporary test handler
                addFreqBtn.addEventListener('click', (e) => {
                    console.log('🔥 BUTTON CLICKED!', e);
                    e.preventDefault();

                    // Test direct method call
                    try {
                        this.addFieldOccurrence('field110', this.fieldSpecs['field110']);
                        console.log('✅ Direct method call succeeded');
                    } catch (error) {
                        console.error('❌ Direct method call failed:', error);
                    }
                });
            }

            // Check all buttons in Object tab
            const allButtons = document.querySelectorAll('button');
            console.log('All buttons found:', allButtons.length);
            allButtons.forEach((btn, i) => {
                if (btn.textContent.includes('Add') || btn.id.includes('add')) {
                    console.log(`Button ${i}:`, {
                        id: btn.id,
                        text: btn.textContent.trim(),
                        hasClickHandler: !!btn.onclick
                    });
                }
            });
        }

        // Load official power type codes from MCEB Pub 7 field 116
        loadOfficial
            };
        }


            };
        }

        // Load official IRAC coordination notes
        loadOfficial

        


        // Helper method for identifying computer-generated content
        isComputerGenerated(line) {
            const computerGeneratedPatterns = [
                /^\*{5}.*\*{5}$/,           // Header/footer asterisk lines
                /^MCEB Publication/,        // Publication reference
                /^Generated:/,              // Generation timestamp
                /^System:/,                 // System identifier
                /^[✅📊💾🔄❌]/,          // Emoji status indicators
                /^\s*$/,                    // Empty lines
                /^Loaded official/,         // Status messages
                /^Auto-save enabled/        // System messages
            ];

            return computerGeneratedPatterns.some(pattern => pattern.test(line));
        }

        // Complete the missing validation methods
        validateEmissionDesignator(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // MCEB Pub 7 emission designator format: up to 11 characters
            if (value.length > 11) {
                this.showFieldErrors(field, ['Maximum 11 characters per MCEB Pub 7 field 114']);
                return false;
            }

            // Basic format validation for emission designators
            const validEmissionPattern = /^[0-9]*[A-Z]*[0-9]*[A-Z]*$/;

            if (!validEmissionPattern.test(value)) {
                this.showFieldErrors(field, [
                    'Invalid emission designator format',
                    'Examples: A3E, F3E, 16K0F3E, 2K70J3E per MCEB Pub 7'
                ]);
                return false;
            }

            return true;
        }

        // Complete the missing utility methods
        clearFieldErrors(field) {
            field.style.borderColor = '';

            // Remove existing error messages
            const existingErrors = field.parentNode.querySelectorAll('.field-errors, .field-warning');
            existingErrors.forEach(error => error.remove());
        }

        getBaseFieldId(fieldId) {
            // Remove occurrence suffix (e.g., "field110_1" -> "field110")
            return fieldId.split('_')[0];
        }

        // Complete the export formatting method


        // Complete the missing initialization methods
        

        // Add debounce utility for auto-save
        

        // Complete the populateFormFromData method


        // Complete the missing initialization methods
        initializeValidation() {
            // Add validation event listeners to all form fields
            document.addEventListener('DOMContentLoaded', () => {
                Object.keys(this.fieldSpecs).forEach(fieldId => {
                    this.attachFieldValidation(fieldId);
                });
            });
        }

        initializeDynamicEntries() {
            // Initialize dynamic field management
            Object.keys(this.fieldSpecs).forEach(fieldId => {
                const spec = this.fieldSpecs[fieldId];
                if (spec.dynamic) {
                    this.setupDynamicField(fieldId, spec);
                }
            });
        }

        addFieldCounters() {
            // Add character counters to all text fields
            Object.keys(this.fieldSpecs).forEach(fieldId => {
                const spec = this.fieldSpecs[fieldId];
                if (spec.maxLength) {
                    this.addCharacterCounter(fieldId, spec.maxLength);
                }
            });
        }

        // Setup dynamic field management
        setupDynamicField(baseFieldId, spec) {
            // Create the first instance
            const firstField = document.getElementById(`${baseFieldId}_1`);
            if (firstField) {
                this.addDynamicFieldControls(firstField, baseFieldId, spec);
            }
        }

        // Add dynamic field controls (add/remove buttons)
        addDynamicFieldControls(field, baseFieldId, spec) {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'dynamic-controls';
            controlsDiv.style.cssText = `
        margin-top: 5px;
        display: flex;
        gap: 10px;
    `;

            // Add occurrence button
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.textContent = '+ Add Another';
            addButton.className = 'btn btn-sm btn-outline-primary';
            addButton.onclick = () => this.addFieldOccurrence(baseFieldId, spec);

            // Remove occurrence button
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.textContent = '- Remove';
            removeButton.className = 'btn btn-sm btn-outline-danger';
            removeButton.onclick = () => this.removeFieldOccurrence(baseFieldId);

            controlsDiv.appendChild(addButton);
            controlsDiv.appendChild(removeButton);

            // Add occurrence counter
            const counter = document.createElement('span');
            counter.className = 'occurrence-counter';
            counter.style.cssText = 'font-size: 0.8em; color: #666; margin-left: auto;';
            counter.textContent = `1 of ${spec.maxOccurrences} max`;
            controlsDiv.appendChild(counter);

            field.parentNode.appendChild(controlsDiv);
        }

        // Add field occurrence
        // DEBUGGING VERSION - Add this to see what's happening:
        addFieldOccurrence(baseFieldId, spec) {
            const currentCount = this.getFieldOccurrenceCount(baseFieldId);

            if (currentCount >= spec.maxOccurrences) {
                alert(`Maximum ${spec.maxOccurrences} occurrences allowed for ${spec.title}`);
                return;
            }

            const newFieldId = `${baseFieldId}_${currentCount + 1}`;
            const firstField = document.getElementById(`${baseFieldId}_1`);

            if (firstField) {
                const newFieldContainer = this.createFieldOccurrence(newFieldId, spec, currentCount + 1);

                // SAFE PARENT SELECTION WITH FALLBACKS:
                const parentContainer = firstField.closest('.form-group') ||
                    firstField.closest('div') ||
                    firstField.parentElement ||
                    document.body;

                parentContainer.appendChild(newFieldContainer);
                this.updateOccurrenceCounters(baseFieldId, spec);
            }
        }

        if(firstField) {
            const newFieldContainer = this.createFieldOccurrence(newFieldId, spec, currentCount + 1)
            console.log('🔍 firstField found:', firstField);
            console.log('🔍 firstField.parentElement:', firstField.parentElement);
            console.log('🔍 firstField.closest(\'.form-group\'):', firstField.closest('.form-group'));
            console.log('🔍 firstField HTML structure:', firstField.outerHTML);

            // Try multiple parent selection strategies
            let parentContainer = firstField.closest('.form-group');

            if (!parentContainer) {
                this.log('⚠️ No .form-group found, trying alternatives...');
                parentContainer = firstField.closest('div') || firstField.parentElement;
            }

            if (parentContainer) {
                parentContainer.appendChild(newFieldContainer);
                this.updateOccurrenceCounters(baseFieldId, spec);
                this.log('✅ Field added successfully');
            } else {
                this.error(`❌ No suitable parent container found for ${baseFieldId}`);
            }
        }

        // Remove field occurrence
        removeFieldOccurrence(baseFieldId) {
            const currentCount = this.getFieldOccurrenceCount(baseFieldId);

            if (currentCount <= 1) {
                alert('At least one occurrence is required');
                return;
            }

            const lastFieldId = `${baseFieldId}_${currentCount}`;
            const lastField = document.getElementById(lastFieldId);

            if (lastField) {
                lastField.closest('.field-occurrence').remove();
                this.updateOccurrenceCounters(baseFieldId, this.fieldSpecs[baseFieldId]);
            }
        }

        // Get current field occurrence count
        getFieldOccurrenceCount(baseFieldId) {
            let count = 0;
            for (let i = 1; i <= 300; i++) {
                const field = document.getElementById(`${baseFieldId}_${i}`);
                if (field) count++;
                else break;
            }
            return count;
        }

        // Update occurrence counters
        updateOccurrenceCounters(baseFieldId, spec) {
            const count = this.getFieldOccurrenceCount(baseFieldId);
            const counters = document.querySelectorAll(`[id^="${baseFieldId}"] ~ .dynamic-controls .occurrence-counter`);

            counters.forEach(counter => {
                counter.textContent = `${count} of ${spec.maxOccurrences} max`;
            });
        }

        // Create field occurrence for dynamic fields
        createFieldOccurrence(fieldId, spec, occurrenceNumber) {
            const container = document.createElement('div');
            container.className = 'field-occurrence';
            container.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background-color: #f9f9f9;
    `;

            const label = document.createElement('label');
            label.textContent = `${spec.title} #${occurrenceNumber}`;
            label.style.cssText = 'font-weight: bold; margin-bottom: 5px; display: block;';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = fieldId;
            input.className = 'form-control';
            input.maxLength = spec.maxLength;
            input.style.cssText = 'width: 100%; margin-bottom: 5px;';

            // Add validation
            this.attachFieldValidation(fieldId);

            container.appendChild(label);
            container.appendChild(input);

            return container;
        }

        // End of SFAFFieldManager class



        // Add character counter to field
        addCharacterCounter(fieldId, maxLength) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            field.addEventListener('input', () => {
                this.updateCharacterCounter(field, maxLength);
            });
        }



        // Add character counter with visual feedback
        addCharacterCounter(fieldId, maxLength) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            // Create counter element
            const counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.style.cssText = `
        font-size: 0.8em;
        color: #666;
        text-align: right;
        margin-top: 2px;
        font-family: monospace;
        transition: color 0.3s ease;
    `;

            field.parentNode.appendChild(counter);

            // Update counter on input
            field.addEventListener('input', () => {
                this.updateCharacterCounter(field, maxLength);
            });

            // Initial update
            this.updateCharacterCounter(field, maxLength);
        }

        // Enhanced field occurrence creation with validation
        createFieldOccurrence(fieldId, spec, occurrenceNumber) {
            const container = document.createElement('div');
            container.className = 'field-occurrence';
            container.setAttribute('data-occurrence', occurrenceNumber);
            container.style.cssText = `
        margin-top: 10px;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background-color: #f9f9f9;
        position: relative;
    `;

            // Add occurrence label
            const label = document.createElement('label');
            label.textContent = `${spec.title} #${occurrenceNumber}`;
            label.setAttribute('for', fieldId);
            label.style.cssText = `
        font-weight: bold; 
        margin-bottom: 8px; 
        display: block;
        color: #495057;
    `;

            // Create input field with proper attributes
            const input = document.createElement('input');
            input.type = 'text';
            input.id = fieldId;
            input.className = 'form-control';
            input.maxLength = spec.maxLength;
            input.setAttribute('data-field-spec', JSON.stringify(spec));
            input.style.cssText = 'width: 100%; margin-bottom: 5px;';

            // Add validation and character counter
            this.attachFieldValidation(fieldId);
            if (spec.maxLength) {
                this.addCharacterCounter(fieldId, spec.maxLength);
            }

            // Add remove button for occurrences > 1
            if (occurrenceNumber > 1) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'btn btn-sm btn-outline-danger';
                removeBtn.textContent = '×';
                removeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            width: 25px;
            height: 25px;
            padding: 0;
            border-radius: 50%;
        `;
                removeBtn.onclick = () => {
                    container.remove();
                    this.updateOccurrenceCounters(this.getBaseFieldId(fieldId), spec);
                };
                container.appendChild(removeBtn);
            }

            container.appendChild(label);
            container.appendChild(input);

            return container;
        }

        // Validate equipment manufacturer codes against official MCEB Pub 7 list
        validateEquipmentManufacturer(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            const validManufacturers = Object.keys(this.equipmentManufacturers);

            if (!validManufacturers.includes(value)) {
                this.showFieldWarning(field,
                    'Manufacturer code not in official MCEB Pub 7 list. Verify code accuracy.'
                );
            }

            return true;
        }

        // Complete frequency validation with band plan checking
        validateFrequency(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // Basic format validation
            const frequencyPattern = /^(\d+(\.\d{1,9})?)(HZ|KHZ|MHZ|GHZ)$/;

            if (!frequencyPattern.test(value)) {
                this.showFieldErrors(field, [
                    'Invalid frequency format per MCEB Pub 7',
                    'Use: 123.456MHZ, 14.25GHZ, etc.'
                ]);
                return false;
            }

            // Convert to Hz for band plan validation
            const match = value.match(frequencyPattern);
            const numValue = parseFloat(match[1]);
            const unit = match[3];

            let frequencyHz;
            switch (unit) {
                case 'HZ': frequencyHz = numValue; break;
                case 'KHZ': frequencyHz = numValue * 1000; break;
                case 'MHZ': frequencyHz = numValue * 1000000; break;
                case 'GHZ': frequencyHz = numValue * 1000000000; break;
            }

            // Validate against spectrum limits
            if (frequencyHz < 3 || frequencyHz > 300000000000) {
                this.showFieldErrors(field, ['Frequency out of valid range (3 Hz - 300 GHz)']);
                return false;
            }

            // Check common DoD frequency bands
            this.validateFrequencyBand(field, frequencyHz);

            return true;
        }

        // Export SFAF data to CSV format for analysis
        exportToCSV() {
            const formData = this.collectFormData();
            const csvRows = [];

            // CSV header
            csvRows.push(['Field ID', 'Field Name', 'Value', 'Occurrence']);

            // Process all fields
            Object.entries(formData).forEach(([fieldId, value]) => {
                const spec = this.fieldSpecs[fieldId];
                const fieldName = spec ? spec.title : fieldId;

                if (Array.isArray(value)) {
                    value.forEach((val, index) => {
                        csvRows.push([fieldId, fieldName, val, index + 1]);
                    });
                } else {
                    csvRows.push([fieldId, fieldName, value, 1]);
                }
            });

            // Convert to CSV string
            const csvContent = csvRows.map(row =>
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sfaf_export.csv';
            a.click();
            URL.revokeObjectURL(url);
        }



        // Add contextual help for MCEB Pub 7 fields
        addFieldHelp(fieldId, helpText) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            const helpIcon = document.createElement('span');
            helpIcon.innerHTML = '❓';
            helpIcon.style.cssText = `
        margin-left: 5px;
        cursor: help;
        color: #007bff;
        font-size: 0.9em;
    `;

            helpIcon.title = helpText;
            helpIcon.onclick = () => this.showFieldHelpModal(fieldId, helpText);

            field.parentNode.querySelector('label').appendChild(helpIcon);
        }

        // Show detailed field help modal
        showFieldHelpModal(fieldId, helpText) {
            const modal = document.createElement('div');
            modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

            const content = document.createElement('div');
            content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

            const spec = this.fieldSpecs[fieldId];
            content.innerHTML = `
        <h3>${spec.title} (${fieldId})</h3>
        <p><strong>MCEB Pub 7 Requirements:</strong></p>
        <p>${helpText}</p>
        <p><strong>Max Length:</strong> ${spec.maxLength} characters</p>
        ${spec.maxOccurrences ? `<p><strong>Max Occurrences:</strong> ${spec.maxOccurrences}</p>` : ''}
        <button onclick="this.closest('[style*=fixed]').remove()" 
                style="margin-top: 15px; padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
            Close
        </button>
    `;

            modal.appendChild(content);
            document.body.appendChild(modal);
        }



        // Validate entire form against MCEB Pub 7 standards
        validateEntireForm() {
            const errors = [];
            let isValid = true;

            // Required fields per MCEB Pub 7
            const requiredFields = [
                'field005', 'field010', 'field102', 'field110_1', 'field113_1',
                'field114_1', 'field115_1', 'field200', 'field300', 'field301',
                'field303', 'field400', 'field401', 'field403'
            ];

            // Check required fields
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!field || !field.value.trim()) {
                    errors.push(`Required field missing: ${fieldId} - ${this.getFieldTitle(fieldId)}`);
                    isValid = false;

                    if (field) {
                        field.style.borderColor = '#ff6b6b';
                    }
                }
            });

            // Validate field occurrence limits
            this.validateOccurrenceLimits(errors);

            // Check for classification consistency
            this.validateClassificationConsistency(errors);

            // Display validation results
            this.displayValidationResults(errors, isValid);

            return isValid;
        }

        // Update character counter with visual feedback
        

        // Complete station class validation per MCEB Pub 7
        validateStationClass(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // Valid station classes from MCEB Pub 7
            const validStationClasses = [
                // Fixed Service
                'FB', 'FB2', 'FB3', 'FB8', 'FX1',
                // Mobile Service
                'ML', 'MA', 'MO', 'MP', 'MR', 'MS', 'MT',
                // Broadcasting
                'BC', 'BT',
                // Aeronautical
                'AC', 'AD', 'AF', 'AG', 'AL', 'AR', 'AS', 'AT',
                // Maritime
                'CG', 'CP', 'CS', 'CT',
                // Amateur
                'HA',
                // Experimental
                'XE', 'XF', 'XM', 'XR', 'XT'
            ];

            if (!validStationClasses.includes(value)) {
                this.showFieldWarning(field,
                    'Station class may not be standard. Verify against MCEB Pub 7 Annex B'
                );
            }

            return true;
        }

        // Display validation results with enhanced UI
        displayValidationResults(errors, isValid) {
            // Remove existing validation summary
            const existingSummary = document.querySelector('.validation-summary');
            if (existingSummary) {
                existingSummary.remove();
            }

            // Create enhanced validation summary
            const summary = document.createElement('div');
            summary.className = 'validation-summary';
            summary.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

            if (isValid) {
                summary.style.backgroundColor = '#d4edda';
                summary.style.borderLeft = '4px solid #28a745';
                summary.style.color = '#155724';
                summary.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">✅ SFAF Validation Passed</h4>
            <p style="margin: 0;">Form complies with MCEB Pub 7 standards</p>
        `;
            } else {
                summary.style.backgroundColor = '#f8d7da';
                summary.style.borderLeft = '4px solid #dc3545';
                summary.style.color = '#721c24';

                const errorList = errors.map(error => `<li>${error}</li>`).join('');
                summary.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">❌ SFAF Validation Failed</h4>
            <p style="margin: 0 0 10px 0;">${errors.length} error(s) found:</p>
            <ul style="margin: 0; padding-left: 20px; max-height: 200px; overflow-y: auto;">
                ${errorList}
            </ul>
        `;
            }

            document.body.appendChild(summary);

            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (summary.parentNode) {
                    summary.remove();
                }
            }, 10000);
        }

        // Show field errors
        showFieldErrors(field, errors) {
            field.style.borderColor = '#dc3545';

            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-errors';
            errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.8em;
        margin-top: 5px;
        padding: 5px;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
    `;

            errorDiv.innerHTML = errors.map(error => `• ${error}`).join('<br>');
            field.parentNode.appendChild(errorDiv);
        }

        // Show field warning
        showFieldWarning(field, warning) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'field-warning';
            warningDiv.style.cssText = `
        color: #856404;
        font-size: 0.8em;
        margin-top: 5px;
        padding: 5px;
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
    `;

            warningDiv.innerHTML = `⚠️ ${warning}`;
            field.parentNode.appendChild(warningDiv);
        }

        // Collect all form data


        // Export complete SFAF record
        exportCompleteFormattedSFAF() {
            const formData = this.collectFormData();
            const sfafLines = [];

            // MCEB Pub 7 standard header
            sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
            sfafLines.push('MCEB Publication 7, June 30, 2005');
            sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
            sfafLines.push(`System: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push('');

            // Export all fields in official MCEB Pub 7 field order
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
                        // Handle multiple occurrences for dynamic fields
                        data.forEach((value, index) => {
                            if (index === 0) {
                                sfafLines.push(`${fieldNum}. ${value}`);
                            } else {
                                const occurrence = (index + 1).toString().padStart(2, '0');
                                sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                            }
                        });
                    } else {
                        // Handle single occurrence fields
                        sfafLines.push(`${fieldNum}. ${data}`);
                    }
                }
            });

            // Add MCEB Pub 7 compliant footer
            sfafLines.push('');
            sfafLines.push('***** END OF SFAF RECORD *****');
            sfafLines.push(`Record Format: MCEB Publication 7 Standard`);
            sfafLines.push(`Generated by: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push(`Timestamp: ${new Date().toISOString()}`);

            return sfafLines.join('\n');
        }

        // Export dynamic fields with proper occurrence numbering
        exportDynamicFields(sfafLines, formData, fieldIds) {
            fieldIds.forEach(baseFieldId => {
                const values = formData[baseFieldId];
                if (values) {
                    const fieldNumber = baseFieldId.replace('field', '');
                    if (Array.isArray(values)) {
                        values.forEach((value, index) => {
                            if (index === 0) {
                                sfafLines.push(`${fieldNumber}. ${value}`);
                            } else {
                                sfafLines.push(`${fieldNumber}/${(index + 1).toString().padStart(2, '0')}. ${value}`);
                            }
                        });
                    } else {
                        sfafLines.push(`${fieldNumber}. ${values}`);
                    }
                }
            });
        }

        // Generate compliance report


        exportFinalSFAFRecord() {
            const formData = this.collectFormData();
            const sfafLines = [];

            // MCEB Pub 7 standard header
            sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
            sfafLines.push('MCEB Publication 7, June 30, 2005');
            sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
            sfafLines.push(`System: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push('');

            // Export logic from source files...
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

        // Add all other missing methods from source files...
        


        // initializeFieldSpecs() { /* from sources */ }
        // loadOfficialGeographicCodes() { /* from sources */ }
        // loadOfficialIRACNotes() { /* from sources */ }
        // loadOfficialFunctionIdentifiers() { /* from sources */ }
        // loadOfficialEquipmentCodes() { /* from sources */ }
        // loadOfficialTimeCodes() { /* from sources */ }
        // saveFormState() { /* from sources */ }
        // restoreFormState() { /* from sources */ }
        // validateEntireForm() { /* from sources */ }
        // exportFinalSFAFRecord() { /* from sources */ }
        // ... etc.
    }
    // Single initialization
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.sfafFieldManager = new SFAFFieldManager();

            // DEBUG: Verify class initialization
            console.log('🔍 SFAF Manager Status:', {
                instance: !!window.sfafFieldManager,
                methods: Object.getOwnPropertyNames(Object.getPrototypeOf(window.sfafFieldManager)),
                fieldSpecs: !!window.sfafFieldManager.fieldSpecs,
                powerTypes: !!window.sfafFieldManager.powerTypes
            });

            console.log('🎯 SFAF Field Manager fully operational');
        } catch (error) {
            console.error('❌ Error initializing SFAF Field Manager:', error);
        }
    });

    window.SFAFFieldManager = SFAFFieldManager;

})(); // ← CRITICAL: Proper IIFE closure

// 2. THEN: Utility functions (from newfile.txt)
function setFieldValue(formFieldId, value) {
    // Implementation from newfile.txt
}

function downloadSFAF(sfafData, filename = 'sfaf_record.txt') {
    // Implementation from newfile.txt  
}

function showNotification(message, type = 'info') {
    // Implementation from newfile.txt
}

// // NOW the initialization code goes OUTSIDE the class:
// let sfafFieldManager;
// document.addEventListener('DOMContentLoaded', () => {
//     try {
//         sfafFieldManager = new SFAFFieldManager();

//         // Restore any saved form state
//         sfafFieldManager.restoreFormState();

//         this.log('🎯 SFAF Field Manager fully operational');
//         this.log('📖 Based on MCEB Publication 7, June 30, 2005');
//         this.log('✅ All official MCEB Pub 7 standards implemented');

//     } catch (error) {
//         this.error('❌ Error initializing SFAF Field Manager:', error);
//     }
// });

// Additional utility functions can go here


// Global utility function for downloading SFAF records
function downloadSFAF(sfafData, filename = 'sfaf_record.txt') {
    const blob = new Blob([sfafData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('SFAF record downloaded', 'success');
}

// Global notification system
function 

// Map imported field IDs to SFAF field IDs
function 

// Handle field500 variants and dynamic field processing
function 

// Export for module systems (Node.js, etc.)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SFAFFieldManager,
        setFieldValue,
        downloadSFAF,
        showNotification,
        setupKeyboardShortcuts,
        mapImportedFieldId
    };
}

// AMD/RequireJS support
if (typeof define === 'function' && define.amd) {
    define([], function () {
        return {
            SFAFFieldManager,
            setFieldValue,
            downloadSFAF,
            showNotification
        };
    });
}

// Initialize map integration if available
if (typeof initializeMap === 'function') {
    initializeMap();
    this.log('🗺️ Map integration initialized');
}

// Auto-populate coordinate fields from marker data
function populateCoordinatesFromMap(data) {
    if (data.coordinates) {
        setFieldValue('field303', data.coordinates.compact);
        setFieldValue('field403', data.coordinates.compact);
        this.log('📍 Coordinates populated from map data');
    }
}