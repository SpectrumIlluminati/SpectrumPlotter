// buttonFunctions.js - MC4EB Pub 7 CHG 1 Compliant Field Management (Standalone Version)

// ===== UTILITY FUNCTIONS =====

function showNotification(message, type = 'info') {
    // Check if external notification system exists (but exclude self-reference)
    if (window.showSFAFStatusMessage && typeof window.showSFAFStatusMessage === 'function') {
        window.showSFAFStatusMessage(message, type);
        return;
    }
    
    // Fallback notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#000';
            break;
        default:
            notification.style.backgroundColor = '#007bff';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

function addValidationListeners(container) {
    const inputs = container.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', (e) => {
            validateField(e.target);
        });
        if (input.maxLength) {
            input.addEventListener('input', (e) => {
                updateCharacterCounter(e.target);
            });
        }
    });
}

function updateCharacterCounter(field) {
    const maxLength = field.maxLength;
    if (!maxLength) return;

    let counter = field.parentNode.querySelector('.char-counter');
    if (!counter) {
        counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.style.cssText = `
            font-size: 0.8em;
            color: #666;
            text-align: right;
            margin-top: 2px;
        `;
        field.parentNode.appendChild(counter);
    }

    const remaining = maxLength - field.value.length;
    counter.textContent = `${field.value.length}/${maxLength}`;

    if (remaining < 5) {
        counter.style.color = '#dc3545';
    } else if (remaining < 10) {
        counter.style.color = '#ffc107';
    } else {
        counter.style.color = '#666';
    }
}

function validateField(field) {
    const fieldType = field.dataset.field;
    let isValid = true;

    // Clear existing errors
    clearFieldErrors(field);

    switch (fieldType) {
        case '114': // Emission Designator
            isValid = validateEmissionDesignator(field);
            break;
        case '113': // Station Class
            isValid = validateStationClass(field);
            break;
        case '115': // Transmitter Power
            isValid = validateTransmitterPower(field);
            break;
    }

    return isValid;
}

function clearFieldErrors(field) {
    field.style.borderColor = '';
    const existingErrors = field.parentNode.querySelectorAll('.field-error');
    existingErrors.forEach(error => error.remove());
}

// Placeholder validation functions (implement as needed)
function validateEmissionDesignator(field) {
    // Add emission designator validation logic
    return true;
}

function validateStationClass(field) {
    // Add station class validation logic
    return true;
}

function validateTransmitterPower(field) {
    // Add transmitter power validation logic
    return true;
}

// ===== MAIN FIELD CREATION FUNCTIONS =====
document.addEventListener('DOMContentLoaded', () => {
    // ✅ Connect to the correct button ID
    const addEmissionBtn = document.getElementById('addEmissionGroup');
    if (addEmissionBtn) {
        addEmissionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Add Emission Group button clicked');
            addEmissionCharacteristicsEntry();
        });
        console.log('✅ Add Emission Group button connected');
    } else {
        console.error('❌ addEmissionGroup button not found');
    }
});

function addEmissionCharacteristicsEntry() {
    const container = document.getElementById('emission-characteristics-entries');
    if (!container) {
        showNotification('Emission characteristics container not found', 'error');
        return;
    }

    const entryCount = container.querySelectorAll('.emission-entry').length + 1;

    // Skip creating base entry (already exists as protected)
    if (entryCount === 1) {
        showNotification('Base emission characteristics already exist', 'warning');
        return;
    }

    if (entryCount > 20) {
        showNotification('Maximum 20 emission characteristic occurrences allowed per MC4EB Pub 7 CHG 1', 'error');
        return;
    }

    const newEntry = document.createElement('div');
    newEntry.className = 'dynamic-entry emission-entry'; // Note: NOT protected-field
    newEntry.dataset.entry = entryCount;

    // Include remove button for additional entries only
    newEntry.innerHTML = `
        <div class="entry-header">
            <span class="entry-title">Emission Characteristics #${entryCount}</span>
            <button class="remove-entry-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        <div class="form-row">
            <label for="field113_${entryCount}">113 - Station Class:</label>
            <select id="field113_${entryCount}" class="form-control" data-field="113">
                <option value="">Select Station Class...</option>
                <option value="FB">FB - Fixed Base</option>
                <option value="FB2">FB2 - Fixed Base (Secondary)</option>
                <option value="ML">ML - Mobile Land</option>
                <option value="MA">MA - Mobile Aircraft</option>
                <option value="MO">MO - Mobile Other</option>
                <option value="BC">BC - Broadcasting</option>
                <option value="AC">AC - Aeronautical</option>
                <option value="AF">AF - Aeronautical Fixed</option>
                <option value="CG">CG - Coast Guard</option>
                <option value="HA">HA - Amateur</option>
                <option value="XE">XE - Experimental</option>
            </select>
        </div>
        <div class="form-row">
            <label for="field114_${entryCount}">114 - Emission Designator:</label>
            <input type="text" id="field114_${entryCount}" class="form-control" 
                   maxlength="11" placeholder="3K00J3E, 16K0F3E, 2K70J3E" data-field="114">
            <small class="field-help">Format: bandwidth + emission class (max 11 chars per MC4EB Pub 7 CHG 1)</small>
        </div>
        <div class="form-row">
            <label for="field115_${entryCount}">115 - Transmitter Power:</label>
            <input type="text" id="field115_${entryCount}" class="form-control" 
                   maxlength="9" placeholder="K10, W50, M5" data-field="115">
            <small class="field-help">Format: power value + unit (K=kW, W=watts, M=MW, max 9 chars)</small>
        </div>
        <div class="form-row">
            <label for="field116_${entryCount}">116 - Power Type:</label>
            <select id="field116_${entryCount}" class="form-control" data-field="116">
                <option value="">Select Power Type...</option>
                <option value="C">C - Carrier Power (N0N, A3E broadcasting)</option>
                <option value="M">M - Mean Power (A/A, A/G/A, FM emissions)</option>
                <option value="P">P - Peak Envelope Power (pulsed equipment)</option>
            </select>
        </div>
    `;

    container.appendChild(newEntry);
    addValidationListeners(newEntry);
    console.log(`✅ Added emission characteristics entry #${entryCount}`);
    showNotification(`Emission characteristics #${entryCount} added`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    // ✅ Connect Transmitter Button (using existing button from sidebar.txt)
    const addEquipBtn = document.getElementById('addTransmitterEntry');
    if (addEquipBtn) {
        addEquipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Add Transmitter Entry button clicked');
            addTransmitterEntry(); // Your renamed function
        });
        console.log('✅ Add Transmitter Entry button connected');
    } else {
        console.error('❌ addTransmitterEntry button not found');
    }
});

function addTransmitterEntry() {
    const container = document.getElementById('transmitter-entries');
    if (!container) {
        showNotification('Transmitter container not found', 'error');
        return;
    }

    const entryCount = container.querySelectorAll('.transmitter-entry').length + 1;

    // Skip creating base entry (already exists as protected)
    if (entryCount === 1) {
        showNotification('Base Transmitter entry already exists', 'warning');
        return;
    }

    if (entryCount > 10) {
        showNotification('Maximum 10 Transmitter occurrences allowed per MC4EB Pub 7 CHG 1', 'error');
        return;
    }

    const newEntry = document.createElement('div');
    newEntry.className = 'dynamic-entry transmitter-entry';
    newEntry.dataset.entry = entryCount;
    newEntry.innerHTML = `
        <div class="entry-header">
            <span class="entry-title">Transmitter #${entryCount}</span>
            <button class="remove-entry-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        <div class="form-row">
            <label for="field340_${entryCount}">340 - Transmitter Nomenclature:</label>
            <input type="text" id="field340_${entryCount}" class="form-control" 
                   maxlength="18" placeholder="G,AN/PRC-160(V)" data-field="340">
            <small class="field-help">Format: Transmitter type + nomenclature (max 18 chars)</small>
        </div>
        <div class="form-row">
            <label for="field343_${entryCount}">343 - Transmitter Certification ID:</label>
            <input type="text" id="field343_${entryCount}" class="form-control" 
                   maxlength="15" placeholder="J/F 12/11171" data-field="343">
            <small class="field-help">Military Transmitter certification number (max 15 chars)</small>
        </div>
    `;

    container.appendChild(newEntry);
    addValidationListeners(newEntry);
    console.log(`✅ Added Transmitter entry #${entryCount}`);
    showNotification(`Transmitter #${entryCount} added`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    // ✅ Connect Receiver Button (using existing button from sidebar.txt)
    const addEquipBtn = document.getElementById('addReceiverEntry');
    if (addEquipBtn) {
        addEquipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Add Receiver Entry button clicked');
            addReceiverEntry(); // Your renamed function
        });
        console.log('✅ Add Receiver Entry button connected');
    } else {
        console.error('❌ addReceiverEntry button not found');
    }
});

function addReceiverEntry() {
    const container = document.getElementById('receiver-entries') ||
        document.querySelector('[data-section="Receiver"] .section-content #receiver-entries');

    if (!container) {
        showNotification('Receiver container not found', 'error');
        return;
    }

    const entryCount = container.querySelectorAll('.receiver-entry').length + 1;

    // Skip creating base entry (already exists as protected)
    if (entryCount === 1) {
        showNotification('Base Receiver entry already exists', 'warning');
        return;
    }

    if (entryCount > 10) {
        showNotification('Maximum 10 Receiver occurrences allowed per MC4EB Pub 7 CHG 1', 'error');
        return;
    }

    const newEntry = document.createElement('div');
    newEntry.className = 'dynamic-entry receiver-entry';
    newEntry.dataset.entry = entryCount;
    newEntry.innerHTML = `
        <div class="entry-header">
            <span class="entry-title">Receiver #${entryCount}</span>
            <button class="remove-entry-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        <div class="form-row">
            <label for="field440_${entryCount}">440 - Equipment Nomenclature:</label>
            <input type="text" id="field440_${entryCount}" class="form-control" 
                   maxlength="18" placeholder="G,AN/PRC-160(V)" data-field="440">
            <small class="field-help">Format: Equipment type + nomenclature (max 18 chars)</small>
        </div>
        <div class="form-row">
            <label for="field443_${entryCount}">443 - Equipment Certification ID:</label>
            <input type="text" id="field443_${entryCount}" class="form-control" 
                   maxlength="15" placeholder="J/F 12/11171" data-field="443">
            <small class="field-help">Military equipment certification number (max 15 chars)</small>
        </div>
    `;

    container.appendChild(newEntry);
    addValidationListeners(newEntry);
    console.log(`✅ Added Receiver entry #${entryCount}`);
    showNotification(`Receiver #${entryCount} added`, 'success');
}

async function populateIracNotesSelect(selectElement) {
    try {
        // Ensure IRAC notes are loaded and flattened
        if (!window.iracNotesManager.loaded) {
            await window.iracNotesManager.loadNotes();
        }

        selectElement.innerHTML = '<option value="">Select IRAC Note...</option>';

        // Categories for Field 500 (IRAC coordination notes only)
        const field500Categories = [
            { key: 'coordination', label: 'Coordination Notes (C-series)' },
            { key: 'emission', label: 'Emission Notes (E-series)' },
            { key: 'limitation', label: 'Limitation Notes (L-series)' },
            { key: 'special', label: 'Special Notes (S-series)' },
            { key: 'priority', label: 'Priority Notes (P-series)' }
            // Note: M-series notes go in field 501, not field 500
        ];

        field500Categories.forEach(category => {
            const notes = window.iracNotesManager.getNotesByCategory(category.key);
            if (notes.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${category.label} (${notes.length} entries)`;

                notes.forEach(note => {
                    const option = document.createElement('option');
                    option.value = note.code;
                    option.textContent = `${note.code} - ${note.title}`;

                    // Add tooltip with full description if available
                    if (note.description) {
                        option.title = note.description;
                    }

                    optgroup.appendChild(option);
                });

                selectElement.appendChild(optgroup);
            }
        });

        console.log('✅ IRAC notes select populated with', Object.keys(window.iracNotesManager.notes).length, 'total notes');

    } catch (error) {
        console.error('Error populating IRAC notes select:', error);
        selectElement.innerHTML = '<option value="">Error loading notes</option>';
    }
}

// 500 IRAC Notes Entry (MC4EB Pub 7 CHG 1 Compliant)
document.addEventListener('DOMContentLoaded', async () => {
    // ✅ Connect Notes Button (using existing button from sidebar.txt)
    const addIracBtn = document.getElementById('addIRACNotesEntry');
    if (addIracBtn) {
        addIracBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Add Notes Entry button clicked');
            addIRACNotesEntry(); // Your renamed function
        });
        console.log('✅ Add Notes Entry button connected');
    } else {
        console.error('❌ addIRACNotesEntry button not found');
    }

    // 🆕 ADD THIS: Initialize existing IRAC notes dropdown
    const existingSelect = document.querySelector('#field500_1.irac-notes-select');
    if (existingSelect) {
        await populateIracNotesSelect(existingSelect);
        console.log('✅ Initial IRAC notes dropdown populated');
    }
});

async function addIRACNotesEntry() {
    const container = document.getElementById('irac-notes-entries') ||
        document.querySelector('[data-section="supplementary"] .section-content #irac-notes-entries');
    if (!container) {
        showNotification('IRAC notes container not found', 'error');
        return;
    }

    const entryCount = container.querySelectorAll('.notes-entry').length + 1;

    if (entryCount > 10) {
        showNotification('Maximum 10 IRAC note occurrences allowed per MC4EB Pub 7 CHG 1 field 500', 'error');
        return;
    }

    const newEntry = document.createElement('div');
    newEntry.className = 'dynamic-entry notes-entry';
    newEntry.dataset.entry = entryCount;

    newEntry.innerHTML = `
        <div class="entry-header">
            <span class="entry-title">IRAC Note #${entryCount}</span>
            <button class="remove-entry-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        <div class="form-row">
            <label for="field500_${entryCount}">500 - IRAC Notes:</label>
            <select id="field500_${entryCount}" class="form-control irac-notes-select" data-field="500">
                <option value="">Loading IRAC notes...</option>
            </select>
            <small class="field-help">Official IRAC coordination note codes (MC4EB Pub 7 CHG 1 Annex E)</small>
        </div>
        <div class="irac-note-details" style="display:none;">
            <small class="note-description"></small>
        </div>
    `;

    // Add to container first
    container.appendChild(newEntry);

    // Then populate the select
    const selectElement = newEntry.querySelector('.irac-notes-select');
    await populateIracNotesSelect(selectElement);

    addValidationListeners(newEntry);
    console.log(`✅ Added IRAC note entry #${entryCount}`);
    showNotification(`IRAC note #${entryCount} added`, 'success');
}

// Add marker creation to sidebar (similar to existing entry functions)
function addMarkerFromSidebar() {
    // Create marker input form
    const markerForm = document.createElement('div');
    markerForm.className = 'dynamic-entry marker-entry';
    markerForm.innerHTML = `
        <div class="form-row">
            <label for="marker-lat">Latitude:</label>
            <input type="number" id="marker-lat" class="form-control" 
                   step="0.0001" placeholder="30.4300">
        </div>
        <div class="form-row">
            <label for="marker-lng">Longitude:</label>
            <input type="number" id="marker-lng" class="form-control" 
                   step="0.0001" placeholder="-86.6950">
        </div>
        <button onclick="createMarkerFromCoords()">Create Marker</button>
    `;
}

window.iracNotesManager = {
    loaded: false,
    notes: {},
    categorizedNotes: {},
    metadata: {},

    async loadNotes() {
        try {
            console.log('🔄 Loading IRAC notes from external reference file...');

            const response = await fetch('/references/irac-notes-reference.json');

            if (response.ok) {
                const referenceData = await response.json();

                // ✅ STEP 1: Extract categorized notes from your structured format
                this.categorizedNotes = {
                    coordination: referenceData.coordination || {},
                    emission: referenceData.emission || {},
                    limitation: referenceData.limitation || {},
                    special: referenceData.special || {},
                    priority: referenceData.priority || {},
                    minute: referenceData.minute || {}
                };

                // Extract metadata for compliance checking
                this.metadata = referenceData.metadata || {};

                // ✅ STEP 2: FLATTEN ALL NOTES INTO SINGLE OBJECT
                this.notes = {};

                // Process each category
                Object.entries(this.categorizedNotes).forEach(([categoryName, categoryNotes]) => {
                    console.log(`📊 Processing ${categoryName} category...`);

                    Object.entries(categoryNotes).forEach(([code, noteData]) => {
                        // Handle different data structures in your JSON
                        if (typeof noteData === 'string') {
                            // Simple string value
                            this.notes[code] = noteData;
                        } else if (noteData && typeof noteData === 'object') {
                            // Complex object with title/description
                            this.notes[code] = noteData.title || noteData.description || code;
                        } else {
                            // Fallback to code itself
                            this.notes[code] = code;
                        }
                    });
                });

                console.log('✅ IRAC Notes loaded from external file:', Object.keys(this.notes).length, 'entries');
                console.log('📊 Categories processed:', Object.keys(this.categorizedNotes));
                console.log('📊 Flattened notes sample:', Object.keys(this.notes).slice(0, 10));

            } else {
                throw new Error(`HTTP ${response.status}: Failed to load external reference file`);
            }

        } catch (error) {
            console.warn('⚠️ Failed to load external IRAC notes reference, using fallback:', error.message);

            // ✅ FALLBACK: Create both categorized and flattened structures
            this.categorizedNotes = {
                coordination: {
                    "C010": { title: "Gulf Area Frequency Coordinator" },
                    "C019": { title: "Army Frequency Management Office" }
                },
                emission: {
                    "E029": { title: "Upper sideband transmission" }
                },
                limitation: {
                    "L012": { title: "Emergency use only" }
                },
                special: {
                    "S063": { title: "Search and rescue communications" },
                    "S142": { title: "Drone Control" },
                    "S148": { title: "National emergency communications" }
                },
                priority: {},
                minute: {}
            };

            // Flatten fallback data
            this.notes = {};
            Object.values(this.categorizedNotes).forEach(category => {
                Object.entries(category).forEach(([code, noteData]) => {
                    this.notes[code] = noteData.title || code;
                });
            });

            console.log('✅ IRAC Notes loaded from fallback data:', Object.keys(this.notes).length, 'entries');
        } finally {
            this.loaded = true;
        }
    },

    // ✅ ENHANCED METHOD that works with both flattened and categorized data
    getNotesByCategory(category) {
        const categoryMap = {
            'coordination': 'coordination',
            'emission': 'emission',
            'limitation': 'limitation',
            'special': 'special',
            'priority': 'priority',
            'minute': 'minute',
        };

        const mappedCategory = categoryMap[category];
        if (!mappedCategory) {
            console.warn(`Category '${category}' not found`);
            return [];
        }

        // Use categorized data if available, otherwise filter flattened data
        if (this.categorizedNotes[mappedCategory]) {
            return Object.entries(this.categorizedNotes[mappedCategory]).map(([code, noteData]) => ({
                code,
                title: noteData.title || noteData.description || noteData || code,
                description: noteData.description || noteData.title || noteData || '',
                agency: noteData.agency || [],
                category: noteData.category || mappedCategory
            }));
        } else {
            // Fallback: filter flattened notes by prefix
            const categoryPrefixes = {
                'coordination': 'C',
                'emission': 'E',
                'limitation': 'L',
                'special': 'S',
                'priority': 'P',
                'minute': 'M'
            };

            const prefix = categoryPrefixes[category];
            if (!prefix) return [];

            return Object.entries(this.notes)
                .filter(([code]) => code.startsWith(prefix))
                .map(([code, title]) => ({
                    code,
                    title: title || code
                }));
        }
    },

    // Get all notes in flattened format
    getAllNotes() {
        return Object.entries(this.notes).map(([code, title]) => ({
            code,
            title: title || code
        }));
    }
};

// Add this to buttonFunctions.txt after the existing IRAC Notes section
document.addEventListener('DOMContentLoaded', () => {
    // Apply Filters Button
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            console.log('🔍 Applying SFAF filters...');
            applyFilters();
        });
    }

    // Clear Filters Button  
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            console.log('🗑️ Clearing all filters...');
            clearAllFilters();
        });
    }

    // Frequency Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = e.target.dataset.range;
            console.log(`📡 Setting frequency filter to: ${range}`);
            setFrequencyFilter(range);
        });
    });
});

// Clear All button
document.addEventListener('DOMContentLoaded', () => {
    // ✅ Connect Clear All Markers Button (Overview tab)
    const clearAllBtn = document.getElementById('clearAllMarkers');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Clear All Markers button clicked');

            // Call clearAllMarkers function from map.txt
            if (window.clearAllMarkers && typeof window.clearAllMarkers === 'function') {
                window.clearAllMarkers();
            } else {
                console.error('clearAllMarkers function not found');
                showNotification('❌ Clear all function not available', 'error');
            }
        });
        console.log('✅ Clear All Markers button connected');
    } else {
        console.error('❌ clearAllMarkers button not found - check button ID in Overview tab');
    }
});

// Delete Object button
document.addEventListener('DOMContentLoaded', () => {
    // Connect Object tab delete button
    const objectDeleteBtn = document.getElementById('deleteObjectBtn');
    if (objectDeleteBtn) {
        objectDeleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Object delete button clicked');

            // Confirm deletion with user
            if (confirm('Delete this object and all associated SFAF data?\n\nThis action cannot be undone.')) {
                deleteCurrentObject();
            }
        });
        console.log('✅ Object delete button connected');
    } else {
        console.error('❌ Object delete button not found');
    }
});

// Export All Data
document.addEventListener('DOMContentLoaded', () => {
    const exportAllBtn = document.getElementById('exportAllData');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', async () => {
            console.log('📤 Exporting all data...');
            await exportAllMapData();
        });
    }

    // Import CSV Data
    const importDataBtn = document.getElementById('importData');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', () => {
            console.log('📂 Opening CSV import dialog...');
            document.getElementById('csvFileInput').click();
        });
    }
});

// Settings Tab Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Tooltip display setting
    const showTooltipsCheckbox = document.getElementById('showTooltips');
    if (showTooltipsCheckbox) {
        showTooltipsCheckbox.addEventListener('change', (e) => {
            console.log(`🏷️ Tooltips ${e.target.checked ? 'enabled' : 'disabled'}`);
            toggleTooltipDisplay(e.target.checked);
        });
    }

    // Coordinate format setting
    const coordFormatSelect = document.getElementById('coordFormat');
    if (coordFormatSelect) {
        coordFormatSelect.addEventListener('change', (e) => {
            console.log(`🗺️ Coordinate format changed to: ${e.target.value}`);
            updateCoordinateFormat(e.target.value);
        });
    }
});

async function deleteCurrentObject() {
    try {
        const currentObjectId = window.currentSFAFMarker?.id;
        if (!currentObjectId) {
            showNotification('❌ No object selected for deletion', 'error');
            return;
        }
        
        console.log('🔄 Attempting to delete marker:', currentObjectId);
        
        // IMMEDIATE: Start visual cleanup before backend call
        const targetMarker = window.markers?.get(currentObjectId);
        if (targetMarker && typeof targetMarker.setOpacity === 'function') {
            targetMarker.setOpacity(0.3); // Make marker semi-transparent immediately
        }
        
        // Call backend delete API
        const response = await fetch(`/api/markers/${currentObjectId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('✅ Backend deletion successful');
            
            // IMMEDIATE: Clear object tab state first
            clearObjectTabState();
            
            // IMMEDIATE: Remove marker from all frontend systems
            removeMarkerFromMap(currentObjectId);
            
            // IMMEDIATE: Close sidebar
            if (typeof closePersistentSidebar === 'function') {
                closePersistentSidebar();
            }
            
            // IMMEDIATE: Additional cleanup with shorter delays
            setTimeout(() => {
                // Final cleanup sweep
                const remainingElements = document.querySelectorAll('.leaflet-marker-icon, .leaflet-marker-shadow');
                remainingElements.forEach(element => {
                    if (!element.offsetParent) {
                        element.remove();
                    }
                });
                
                // Force map refresh
                if (window.map && typeof window.map.invalidateSize === 'function') {
                    window.map.invalidateSize();
                }
            }, 50);
            
            showNotification('✅ Object deleted successfully', 'success');
            
        } else {
            // Restore marker opacity if deletion failed
            if (targetMarker && typeof targetMarker.setOpacity === 'function') {
                targetMarker.setOpacity(1.0);
            }
            
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ Delete operation failed:', error);
        showNotification(`❌ Failed to delete object: ${error.message}`, 'error');
    }
}

function clearObjectTabState() {
    console.log('🔄 Clearing Object tab state');
    
    // Clear current object references
    window.currentSFAFMarker = null;
    window.currentSelectedMarker = null;
    
    // Clear all form fields in Object tab (excluding IRAC-specific fields)
    document.querySelectorAll('#tab-object input, #tab-object select, #tab-object textarea').forEach(field => {
        // Skip IRAC notes fields
        if (!field.classList.contains('irac-notes-select') && 
            !field.closest('.irac-note-details')) {
            
            if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = false;
            } else {
                field.value = '';
            }
        }
    });
    
    console.log('✅ Object tab state cleared');
}

function removeMarkerFromMap(markerId) {
    try {
        console.log('🔄 Removing marker from map:', markerId);
        
        // 1. Remove from markers Map storage (primary cleanup)
        if (window.markers && window.markers.has(markerId)) {
            const marker = window.markers.get(markerId);
            if (marker) {
                // Try multiple removal methods
                if (typeof marker.remove === 'function') {
                    marker.remove();
                    console.log('✅ Marker removed via marker.remove()');
                } else if (window.map && typeof window.map.removeLayer === 'function') {
                    window.map.removeLayer(marker);
                    console.log('✅ Marker removed via map.removeLayer()');
                }
                
                // Force immediate removal from map if still attached
                if (marker._map) {
                    marker._map.removeLayer(marker);
                    console.log('✅ Marker force removed from _map');
                }
            }
            window.markers.delete(markerId);
            console.log('✅ Marker removed from markers Map');
        }
        
        // 2. Remove from drawnItems layer group
        if (window.drawnItems && typeof window.drawnItems.eachLayer === 'function') {
            const layersToRemove = [];
            window.drawnItems.eachLayer(function(layer) {
                if (layer.markerData && layer.markerData.id === markerId) {
                    layersToRemove.push(layer);
                }
            });
            layersToRemove.forEach(layer => {
                window.drawnItems.removeLayer(layer);
            });
            console.log('✅ Marker removed from drawnItems');
        }
        
        // 3. ENHANCED: Aggressive DOM cleanup - multiple approaches
        const cleanupMarkerDOM = () => {
            // Approach 1: Target all potential marker elements
            const allMarkerElements = document.querySelectorAll(`
                .leaflet-marker-icon, 
                .leaflet-marker-shadow,
                .leaflet-marker-pane img,
                .leaflet-marker-pane div,
                [data-marker-id="${markerId}"]
            `);
            
            let elementsRemoved = 0;
            allMarkerElements.forEach(element => {
                let shouldRemove = false;
                
                // Check multiple attributes for marker ID
                if (element.alt && element.alt.includes(markerId)) {
                    shouldRemove = true;
                } else if (element.src && element.src.includes(markerId)) {
                    shouldRemove = true;
                } else if (element.dataset && element.dataset.markerId === markerId) {
                    shouldRemove = true;
                } else if (element.title && element.title.includes(markerId)) {
                    shouldRemove = true;
                }
                
                if (shouldRemove) {
                    const parent = element.parentElement;
                    if (parent) {
                        parent.remove();
                    } else {
                        element.remove();
                    }
                    elementsRemoved++;
                }
            });
            
            // Approach 2: Remove orphaned marker elements (no valid parent or invisible)
            const orphanedElements = document.querySelectorAll('.leaflet-marker-icon, .leaflet-marker-shadow');
            orphanedElements.forEach(element => {
                if (!element.offsetParent || !element.isConnected) {
                    element.remove();
                    elementsRemoved++;
                }
            });
            
            console.log(`✅ DOM cleanup removed ${elementsRemoved} elements`);
        };
        
        // Run cleanup immediately and with delays to catch dynamic elements
        cleanupMarkerDOM();
        setTimeout(cleanupMarkerDOM, 50);
        setTimeout(cleanupMarkerDOM, 150);
        setTimeout(cleanupMarkerDOM, 300);
        
        // 4. Clear coordinate cache entries
        if (window.coordinateCache) {
            const keysToDelete = [];
            window.coordinateCache.forEach((value, key) => {
                if (key.includes(markerId)) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach(key => window.coordinateCache.delete(key));
            console.log('✅ Coordinate cache cleared');
        }
        
        // 5. Force map redraw to ensure visual synchronization
        if (window.map) {
            setTimeout(() => {
                if (typeof window.map.invalidateSize === 'function') {
                    window.map.invalidateSize();
                }
                if (typeof window.map._resetView === 'function') {
                    window.map._resetView(window.map.getCenter(), window.map.getZoom());
                }
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Error removing marker from map:', error);
        
        // Fallback: Force removal from markers Map
        if (window.markers && window.markers.has(markerId)) {
            window.markers.delete(markerId);
            console.log('✅ Marker removed from markers Map (fallback)');
        }
    }
}

// 501 Comments Entry (MC4EB Pub 7 CHG 1 Compliant)
function addCommentsEntryManual() {
    const container = document.getElementById('comments-entries');
    if (!container) {
        showNotification('Comments container not found', 'error');
        return;
    }

    const entryCount = container.querySelectorAll('.comment-entry').length + 1;
    if (entryCount > 30) {
        showNotification('Maximum 30 comment occurrences allowed per MC4EB Pub 7 CHG 1 field 501', 'error');
        return;
    }

    container.appendChild(newEntry);
    addValidationListeners(newEntry);
    console.log(`✅ Added emission characteristics entry #${entryCount} (MC4EB Pub 7 CHG 1 compliant)`);
    showNotification(`Emission characteristics #${entryCount} added`, 'success')
};

// SFAF Export functions
// Generate SFAF format content with blank lines between records
async function generateSFAFContent() {
    const sfafRecords = [];
    
    // Iterate through all markers (Source: markers.txt marker iteration)
    for (const [markerId, marker] of window.MarkerSystem.markers) {
        const markerData = marker.markerData;
        
        try {
            // Get SFAF data from backend (Source: map.txt SFAF integration)
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            
            if (response.ok) {
                const sfafData = await response.json();
                
                if (sfafData.success && sfafData.sfaf_fields) {
                    const sfafRecord = formatSFAFRecord(sfafData.sfaf_fields, markerData);
                    sfafRecords.push(sfafRecord);
                }
            }
        } catch (error) {
            console.warn(`Could not load SFAF data for marker ${markerId}:`, error);
        }
    }
    
    // ⭐ JOIN WITH BLANK LINES between each 005. entry
    return sfafRecords.join('\n\n');  // Double newline creates blank line
}

// Format individual SFAF record (Source: sfaf_example.txt structure)
function formatSFAFRecord(sfafFields, markerData) {
    const lines = [];
    
    // Standard MC4EB Publication 7, Change 1 field order (Source: map.txt field mapping)
    const fieldOrder = [
        '005', '010', '102', '103', '107', '110', '113', '114', '115', '116',
        '130', '142', '143', '144', '200', '201', '202', '204', '205', '206',
        '207', '209', '300', '301', '303', '306', '340', '343', '357', '362',
        '363', '373', '400', '401', '403', '440', '443', '457', '462', '463',
        '473', '500', '501', '502', '503', '511', '512', '520', '701', '702',
        '716', '801', '803'
    ];
    
    // Process fields in order with proper formatting
    fieldOrder.forEach(fieldNum => {
        // Handle base fields
        const baseField = `field${fieldNum}`;
        if (sfafFields[baseField]) {
            lines.push(`${fieldNum}.     ${sfafFields[baseField]}`);
        }
        
        // Handle numbered variants (e.g., field110_1, field110_2)
        for (let i = 1; i <= 10; i++) {
            const variantField = `field${fieldNum}_${i}`;
            if (sfafFields[variantField]) {
                const suffix = i === 1 ? '' : `/0${i}`;
                lines.push(`${fieldNum}${suffix}.     ${sfafFields[variantField]}`);
            }
        }
        
        // Handle slash variants (e.g., field500/02, field500/03)
        for (let i = 2; i <= 10; i++) {
            const slashField = `field${fieldNum}/${i.toString().padStart(2, '0')}`;
            if (sfafFields[slashField]) {
                lines.push(`${fieldNum}/${i.toString().padStart(2, '0')}.     ${sfafFields[slashField]}`);
            }
        }
    });
    
    // Add coordinates if not in SFAF fields (Source: map.txt coordinate sync)
    if (!sfafFields.field303 && markerData.lat && markerData.lng) {
        const militaryCoords = window.MarkerSystem.formatMilitaryCoordinates(markerData.lat, markerData.lng);
        lines.push(`303.     ${militaryCoords}`);
        lines.push(`403.     ${militaryCoords}`);
    }
    
    return lines.join('\n');
}

async function exportAllMapData() {
    try {
        if (!window.MarkerSystem) {
            throw new Error('Marker system not initialized');
        }
        
        const stats = window.MarkerSystem.getMarkerStats();
        if (stats.total === 0) {
            showNotification('❌ No data to export', 'error');
            return;
        }
        
        // Use existing MarkerSystem export method
        window.MarkerSystem.exportMarkersToCSV();
        showNotification('✅ Export completed', 'success');
        
    } catch (error) {
        console.error('❌ Export failed:', error);
        showNotification(`❌ Export failed: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing button connections...');
    
    // 1. SFAF Management Buttons
    connectSFAFButtons();
    
    // 2. Marker Management Buttons  
    connectMarkerButtons();
    
    // 3. Geometry Buttons
    connectGeometryButtons();

    // 4. Import/Export Buttons
    // connectImportExportButtons(); // TODO: Function not defined

    // 5. Tab Navigation Buttons
    // connectTabButtons(); // TODO: Function not defined

    // 6. Settings and Filter Buttons
    // connectUtilityButtons(); // TODO: Function not defined

    console.log('✅ All button connections initialized');
});

function connectSFAFButtons() {
    // NOTE: SFAF buttons are now wired up by SFAFIntegration.wireUpActionButtons()
    // in map.js initialization. This function is kept for backward compatibility.
    console.log('ℹ️ SFAF buttons handled by SFAFIntegration module');

    // Only handle objectDelete button if it's not already handled
    const deleteBtn = document.getElementById('deleteObjectBtn');
    if (deleteBtn && typeof handleObjectDelete === 'function') {
        deleteBtn.addEventListener('click', handleObjectDelete);
        console.log('✅ Connected: deleteObjectBtn');
    }
}

function connectMarkerButtons() {
    const clearAllBtn = document.getElementById('clearAllMarkers');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (window.MarkerSystem && window.MarkerSystem.clearAllMarkers) {
                window.MarkerSystem.clearAllMarkers();
            }
        });
    }
}

function connectGeometryButtons() {
    const addEmissionBtn = document.getElementById('addEmissionGroup');
    if (addEmissionBtn) {
        addEmissionBtn.addEventListener('click', addEmissionCharacteristicsEntry);
    }
}

function showSFAFStatusMessage(message, type) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'sfaf-status-message';

    const colors = {
        'success': '#4CAF50',
        'error': '#f44336',
        'info': '#2196F3'
    };

    statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 470px;
        background: ${colors[type] || '#666'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 2000;
    `;

    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);

    setTimeout(() => statusDiv.remove(), 4000);
}

// ===== MARKER FILTERING FUNCTIONS =====

/**
 * Apply filters to markers based on SFAF field values
 */
async function applyFilters() {
    try {
        console.log('🔍 Applying filters...');

        // Get filter input values
        const filters = {
            location: document.getElementById('filterLocation')?.value.trim().toLowerCase() || '',
            frequency: document.getElementById('filterFrequency')?.value.trim() || '',
            power: document.getElementById('filterPower')?.value.trim() || '',
            equipment: document.getElementById('filterEquipment')?.value.trim().toLowerCase() || '',
            emission: document.getElementById('filterEmission')?.value.trim().toUpperCase() || ''
        };

        console.log('📋 Active filters:', filters);

        // Check if any filters are active
        const hasActiveFilters = Object.values(filters).some(val => val !== '');

        if (!hasActiveFilters) {
            showNotification('ℹ️ No filters specified', 'info');
            return;
        }

        // Get all markers
        let allMarkers = [];
        if (window.MarkerManager && typeof window.MarkerManager.getAllMarkers === 'function') {
            allMarkers = window.MarkerManager.getAllMarkers();
        } else if (window.MarkerSystem && window.MarkerSystem.markers) {
            allMarkers = Array.from(window.MarkerSystem.markers.values());
        } else {
            console.error('❌ Marker system not found');
            showNotification('❌ Unable to access markers', 'error');
            return;
        }

        console.log(`📍 Total markers to filter: ${allMarkers.length}`);

        if (allMarkers.length === 0) {
            showNotification('ℹ️ No markers on map', 'info');
            return;
        }

        // Apply filters to each marker
        let visibleCount = 0;
        let hiddenCount = 0;

        for (const marker of allMarkers) {
            const shouldShow = await checkMarkerAgainstFilters(marker, filters);

            if (shouldShow) {
                // Show marker
                if (!window.map.hasLayer(marker)) {
                    window.map.addLayer(marker);
                }
                marker.setOpacity(1);
                visibleCount++;
            } else {
                // Hide marker by reducing opacity or removing from map
                marker.setOpacity(0.2);
                hiddenCount++;
            }
        }

        // Update counts in sidebar
        updateFilterCounts(visibleCount, hiddenCount);

        // Show notification
        showNotification(`✅ Filter applied: ${visibleCount} visible, ${hiddenCount} hidden`, 'success');
        console.log(`✅ Filter complete: ${visibleCount} visible, ${hiddenCount} hidden`);

    } catch (error) {
        console.error('❌ Filter error:', error);
        showNotification(`❌ Filter failed: ${error.message}`, 'error');
    }
}

/**
 * Check if a marker matches the current filters
 */
async function checkMarkerAgainstFilters(marker, filters) {
    try {
        // Get SFAF data for this marker
        let sfafData = null;

        // Try to get SFAF data from marker object
        if (marker.markerData && marker.markerData.sfaf_id) {
            // Fetch SFAF data from API
            const response = await fetch(`/api/sfaf/${marker.markerData.sfaf_id}`);
            if (response.ok) {
                const result = await response.json();
                sfafData = result.sfaf;
            }
        }

        // If no SFAF data, marker is visible only if no filters are active
        if (!sfafData) {
            console.log(`⚠️ No SFAF data for marker ${marker.markerId || 'unknown'}`);
            return false; // Hide markers without SFAF data when filtering
        }

        // Check each filter

        // Location filter (field300, field301, field303)
        if (filters.location) {
            const field300 = (sfafData.field300 || '').toLowerCase();
            const field301 = (sfafData.field301 || '').toLowerCase();
            const field303 = (sfafData.field303 || '').toLowerCase();

            const locationMatch =
                field300.includes(filters.location) ||
                field301.includes(filters.location) ||
                field303.includes(filters.location);

            if (!locationMatch) {
                return false;
            }
        }

        // Frequency filter (field110_1)
        if (filters.frequency) {
            const field110 = parseFloat(sfafData.field110_1);

            // Check if it's a range query (e.g., "30-300" or "3-30")
            if (filters.frequency.includes('-')) {
                const [minStr, maxStr] = filters.frequency.split('-').map(s => s.trim());
                const minFreq = parseFloat(minStr);
                const maxFreq = parseFloat(maxStr);

                if (!isNaN(minFreq) && !isNaN(maxFreq) && !isNaN(field110)) {
                    if (field110 < minFreq || field110 > maxFreq) {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                // Single value or pattern match
                const freqValue = parseFloat(filters.frequency);
                if (!isNaN(freqValue)) {
                    if (isNaN(field110) || Math.abs(field110 - freqValue) > 0.001) {
                        return false;
                    }
                } else {
                    // String match for frequency pattern
                    const field110Str = (sfafData.field110_1 || '').toLowerCase();
                    if (!field110Str.includes(filters.frequency.toLowerCase())) {
                        return false;
                    }
                }
            }
        }

        // Power filter (field115_1)
        if (filters.power) {
            const powerValue = parseFloat(filters.power);
            if (!isNaN(powerValue)) {
                const field115 = parseFloat(sfafData.field115_1);
                if (isNaN(field115) || field115 < powerValue) {
                    return false;
                }
            }
        }

        // Equipment filter (field340_1)
        if (filters.equipment) {
            const field340 = (sfafData.field340_1 || '').toLowerCase();
            if (!field340.includes(filters.equipment)) {
                return false;
            }
        }

        // Emission filter (field114_1)
        if (filters.emission) {
            const field114 = (sfafData.field114_1 || '').toUpperCase();
            if (!field114.includes(filters.emission)) {
                return false;
            }
        }

        // All filters passed
        return true;

    } catch (error) {
        console.error('❌ Error checking marker filters:', error);
        return false; // Hide markers with errors
    }
}

/**
 * Clear all filters and show all markers
 */
function clearAllFilters() {
    try {
        console.log('🗑️ Clearing all filters...');

        // Clear filter input fields
        const filterInputs = [
            'filterLocation',
            'filterFrequency',
            'filterPower',
            'filterEquipment',
            'filterEmission'
        ];

        filterInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = '';
            }
        });

        // Remove active state from preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show all markers
        let allMarkers = [];
        if (window.MarkerManager && typeof window.MarkerManager.getAllMarkers === 'function') {
            allMarkers = window.MarkerManager.getAllMarkers();
        } else if (window.MarkerSystem && window.MarkerSystem.markers) {
            allMarkers = Array.from(window.MarkerSystem.markers.values());
        }

        allMarkers.forEach(marker => {
            if (!window.map.hasLayer(marker)) {
                window.map.addLayer(marker);
            }
            marker.setOpacity(1);
        });

        // Update counts
        updateFilterCounts(allMarkers.length, 0);

        showNotification('✅ All filters cleared', 'success');
        console.log('✅ Filters cleared, all markers visible');

    } catch (error) {
        console.error('❌ Clear filters error:', error);
        showNotification(`❌ Clear failed: ${error.message}`, 'error');
    }
}

/**
 * Set frequency filter based on preset range (HF, VHF, UHF)
 */
function setFrequencyFilter(range) {
    try {
        console.log(`📡 Setting frequency filter to: ${range}`);

        const freqInput = document.getElementById('filterFrequency');
        if (!freqInput) {
            console.error('❌ Frequency input not found');
            return;
        }

        // Define frequency ranges
        const ranges = {
            'HF': '3-30',      // HF: 3-30 MHz
            'VHF': '30-300',   // VHF: 30-300 MHz
            'UHF': '300-3000'  // UHF: 300-3000 MHz
        };

        const rangeValue = ranges[range];
        if (rangeValue) {
            freqInput.value = rangeValue;

            // Update preset button active states
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            showNotification(`📡 Frequency range set to ${range} (${rangeValue} MHz)`, 'info');
        } else {
            console.error(`❌ Unknown frequency range: ${range}`);
        }

    } catch (error) {
        console.error('❌ Set frequency filter error:', error);
        showNotification(`❌ Failed to set frequency: ${error.message}`, 'error');
    }
}

/**
 * Update filter count displays in sidebar
 */
function updateFilterCounts(visible, hidden) {
    const visibleCountEl = document.getElementById('visibleCount');
    const hiddenCountEl = document.getElementById('hiddenCount');
    const totalCountEl = document.getElementById('totalCount');

    if (visibleCountEl) {
        visibleCountEl.textContent = visible;
    }

    if (hiddenCountEl) {
        hiddenCountEl.textContent = hidden;
    }

    if (totalCountEl) {
        totalCountEl.textContent = visible + hidden;
    }

    console.log(`📊 Updated counts: ${visible} visible, ${hidden} hidden, ${visible + hidden} total`);
}

/**
 * Initialize filter counts on page load
 */
function initializeFilterCounts() {
    // Get all markers
    let allMarkers = [];
    if (window.MarkerManager && typeof window.MarkerManager.getAllMarkers === 'function') {
        allMarkers = window.MarkerManager.getAllMarkers();
    } else if (window.MarkerSystem && window.MarkerSystem.markers) {
        allMarkers = Array.from(window.MarkerSystem.markers.values());
    }

    // Set initial counts (all visible, none hidden)
    updateFilterCounts(allMarkers.length, 0);
}

// Expose initializeFilterCounts globally so it can be called when markers are loaded
window.initializeFilterCounts = initializeFilterCounts;