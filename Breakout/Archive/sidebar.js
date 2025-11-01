// js/sidebar.js
import { sfafFieldDefinitions, validateSFAFField } from './sfafFields.js';
import { decimalToCompactDMS } from '../js/utils.js';
import { saveToStore } from './db.js';

export class SFAFSidebar {
    constructor() {
        this.currentMarker = null;
        this.activeTab = 'basic';
        this.counters = {
            frequency: 1,
            equipment: 1,
            receiver: 1
        };
        this.init();
    }
    
    async init() {
        await this.loadTemplate();
        this.bindEvents();
        this.setupTabs();
    }

    async loadTemplate() {
        try {
            const response = await fetch('./templates/sidebarTemplate.html');
            const template = await response.text();
            
            // Insert template into existing sidebar or create new one
            const existingSidebar = document.getElementById('sidebar');
            if (existingSidebar) {
                existingSidebar.innerHTML = template;
            } else {
                const sidebar = document.createElement('div');
                sidebar.id = 'sidebar';
                sidebar.className = 'sfaf-sidebar';
                sidebar.innerHTML = template;
                document.body.appendChild(sidebar);
            }
        } catch (error) {
            console.error('Failed to load sidebar template:', error);
            this.createFallbackSidebar();
        }
    }

    bindEvents() {
        // Close button
        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Save button
        const saveBtn = document.getElementById('saveMetadataBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }

        // Delete button
        const deleteBtn = document.getElementById('deleteMarkerBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteMarker());
        }

        // Export button
        const exportBtn = document.getElementById('exportSingleBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToSFAF());
        }

        // Dynamic entry buttons
        this.bindDynamicEntryButtons();
    }

    bindDynamicEntryButtons() {
        // Add equipment entry
        const addEquipBtn = document.getElementById('addEquipmentBtn');
        if (addEquipBtn) {
            addEquipBtn.addEventListener('click', () => this.addEquipmentEntry());
        }

        // Add receiver entry
        const addReceiverBtn = document.getElementById('addReceiverBtn');
        if (addReceiverBtn) {
            addReceiverBtn.addEventListener('click', () => this.addReceiverEntry());
        }
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Remove active class from all tabs and panels
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                btn.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
                
                this.activeTab = tabId;
            });
        });
    }

    open(marker) {
        this.currentMarker = marker;
        this.populateFields(marker.markerData);
        
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.add('open');
        sidebar.style.right = '0';
    }

    close() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
        sidebar.style.right = '-500px';
        this.currentMarker = null;
    }

    populateFields(data) {
        // Auto-fill coordinates
        if (data.lat && data.lng) {
            const field303 = document.getElementById('field303');
            const field403 = document.getElementById('field403');
            const compactCoords = this.formatCoordinates(data.lat, data.lng);
            
            if (field303) field303.value = compactCoords;
            if (field403) field403.value = compactCoords;
        }

        // Populate all other fields from data
        Object.keys(data.sfaf || {}).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = data.sfaf[fieldId];
            }
        });
    }

    formatCoordinates(lat, lng) {
        const latDMS = decimalToCompactDMS(parseFloat(lat), false);
        const lngDMS = decimalToCompactDMS(parseFloat(lng), true);
        return `${latDMS}${lngDMS}`;
    }

    collectData() {
        const data = {};
        
        // Collect all SFAF fields
        Object.keys(sfafFieldDefinitions).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value) {
                data[fieldId] = field.value;
            }
        });

        // Collect dynamic entries
        data.frequencyEntries = this.collectFrequencyEntries();
        data.equipmentEntries = this.collectEquipmentEntries();
        data.receiverEntries = this.collectReceiverEntries();

        return data;
    }

    save() {
        if (!this.currentMarker) return;

        const sfafData = this.collectData();
        
        // Update marker data
        this.currentMarker.markerData.sfaf = sfafData;
        this.currentMarker.markerData.updatedAt = new Date().toISOString();

        // Save to database
        saveToStore('manual_markers', this.currentMarker.markerData)
            .then(() => {
                this.showSaveSuccess();
            })
            .catch(console.error);
    }

    showSaveSuccess() {
        const saveBtn = document.getElementById('saveMetadataBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#43a047';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '#4CAF50';
        }, 2000);
    }

    addFrequencyEntry() {
        this.counters.frequency++;
        const container = document.getElementById('frequency-entries');
        const entryHtml = this.createFrequencyEntryHTML(this.counters.frequency);
        container.insertAdjacentHTML('beforeend', entryHtml);
    }

    addEquipmentEntry() {
        this.counters.equipment++;
        const container = document.getElementById('equipment-entries');
        const entryHtml = this.createEquipmentEntryHTML(this.counters.equipment);
        container.insertAdjacentHTML('beforeend', entryHtml);
    }

    addReceiverEntry() {
        this.counters.receiver++;
        const container = document.getElementById('receiver-entries');
        const entryHtml = this.createReceiverEntryHTML(this.counters.receiver);
        container.insertAdjacentHTML('beforeend', entryHtml);
    }

    createFrequencyEntryHTML(entryNum) {
        return `
            <div class="frequency-entry" data-entry="${entryNum}">
                <div class="entry-header">
                    <span>Entry #${entryNum}</span>
                    <button class="remove-entry-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="form-row">
                    <label for="field110_${entryNum}">110 - Frequency(ies):</label>
                    <input type="text" id="field110_${entryNum}" placeholder="K4460.5(4459.15)">
                </div>
                <div class="form-row">
                    <label for="field113_${entryNum}">113 - Station Class:</label>
                    <input type="text" id="field113_${entryNum}" maxlength="4" placeholder="MO">
                </div>
                <div class="form-row">
                    <label for="field114_${entryNum}">114 - Emission Designator:</label>
                    <input type="text" id="field114_${entryNum}" maxlength="11" placeholder="2K70J3E">
                </div>
                <div class="form-row">
                    <label for="field115_${entryNum}">115 - Transmitter Power:</label>
                    <input type="text" id="field115_${entryNum}" maxlength="9" placeholder="W500">
                </div>
            </div>
        `;
    }

    createEquipmentEntryHTML(entryNum) {
        return `
            <div class="equipment-entry" data-entry="${entryNum}">
                <div class="entry-header">
                    <span>Equipment #${entryNum}</span>
                    <button class="remove-entry-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="form-row">
                    <label for="field340_${entryNum}">340 - Equipment Nomenclature:</label>
                    <input type="text" id="field340_${entryNum}" maxlength="18" placeholder="G,AN/PRC-160(V)">
                </div>
                <div class="form-row">
                    <label for="field343_${entryNum}">343 - Equipment Certification ID:</label>
                    <input type="text" id="field343_${entryNum}" maxlength="15" placeholder="J/F 12/11171">
                </div>
            </div>
        `;
    }

    exportToSFAF() {
        if (!this.currentMarker) return;

        const sfafData = this.collectData();
        const formatted = this.formatForSFAF(sfafData);
        
        // Copy to clipboard and show in console
        navigator.clipboard.writeText(formatted).then(() => {
            alert('SFAF data copied to clipboard!');
            console.log('SFAF Export:\n', formatted);
        });
    }

    formatForSFAF(data) {
        let output = '';
        Object.keys(data).forEach(fieldId => {
            if (data[fieldId] && typeof data[fieldId] === 'string') {
                output += `${fieldId}.     ${data[fieldId]}\n`;
            }
        });
        return output;
    }
}

// Export singleton instance
export const sfafSidebar = new SFAFSidebar();