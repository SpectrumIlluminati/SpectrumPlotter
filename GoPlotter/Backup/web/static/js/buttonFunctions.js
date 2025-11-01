// buttonFunctions.js - MCEB Pub 7 Compliant Field Management (Standalone Version)

// ===== UTILITY FUNCTIONS =====

function showNotification(message, type = 'info') {
    // Check if external notification system exists
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
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
        notification.remove();
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
        showNotification('Maximum 20 emission characteristic occurrences allowed per MCEB Pub 7', 'error');
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
            <small class="field-help">Format: bandwidth + emission class (max 11 chars per MCEB Pub 7)</small>
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
        showNotification('Maximum 10 Transmitter occurrences allowed per MCEB Pub 7', 'error');
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
        showNotification('Maximum 10 Receiver occurrences allowed per MCEB Pub 7', 'error');
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

// 500 IRAC Notes Entry (MCEB Pub 7 Compliant)
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
        showNotification('Maximum 10 IRAC note occurrences allowed per MCEB Pub 7 field 500', 'error');
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
            <small class="field-help">Official IRAC coordination note codes (MCEB Pub 7 Annex E)</small>
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

// 501 Comments Entry (MCEB Pub 7 Compliant)
function addCommentsEntryManual() {
    const container = document.getElementById('comments-entries');
    if (!container) {
        showNotification('Comments container not found', 'error');
        return;
    }

    const entryCount = container.querySelectorAll('.comment-entry').length + 1;
    if (entryCount > 30) {
        showNotification('Maximum 30 comment occurrences allowed per MCEB Pub 7 field 501', 'error');
        return;
    }

    container.appendChild(newEntry);
    addValidationListeners(newEntry);
    console.log(`✅ Added emission characteristics entry #${entryCount} (MCEB Pub 7 compliant)`);
    showNotification(`Emission characteristics #${entryCount} added`, 'success')
};