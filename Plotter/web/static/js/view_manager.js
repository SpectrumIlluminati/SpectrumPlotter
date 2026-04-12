// SFAF View Manager
// Standalone tool for managing custom SFAF database views

class ViewManager {
    constructor() {
        this.views = this.loadViews();
        this.editingViewId = null;
        this.defaultView = this.loadDefaultView();

        this.init();
    }

    init() {
        console.log('🚀 Initializing SFAF View Manager');
        this.renderViewsList();
        this.updateStats();
        this.updateDefaultViewSelect();
    }

    // ==================== Storage Methods ====================

    loadViews() {
        const stored = localStorage.getItem('sfaf_custom_views');
        return stored ? JSON.parse(stored) : [];
    }

    saveViews() {
        localStorage.setItem('sfaf_custom_views', JSON.stringify(this.views));
        this.updateStats();
    }

    loadDefaultView() {
        return localStorage.getItem('sfaf_default_view') || 'summary';
    }

    saveDefaultView(viewId) {
        localStorage.setItem('sfaf_default_view', viewId);
    }

    // ==================== View CRUD Operations ====================

    showCreateView() {
        this.editingViewId = null;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus"></i> Create New View';
        document.getElementById('saveViewBtn').innerHTML = '<i class="fas fa-save"></i> Save View';
        document.getElementById('viewName').value = '';
        document.getElementById('viewDescription').value = '';
        this.renderFieldSelector();
        this.clearAllFields();
        document.getElementById('viewModal').style.display = 'flex';
    }

    editView(viewId) {
        const view = this.views.find(v => v.id === viewId);
        if (!view) {
            alert('View not found');
            return;
        }

        this.editingViewId = viewId;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit View';
        document.getElementById('saveViewBtn').innerHTML = '<i class="fas fa-save"></i> Update View';
        document.getElementById('viewName').value = view.name;
        document.getElementById('viewDescription').value = view.description || '';

        this.renderFieldSelector();

        // Pre-check fields
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('#fieldSelector input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = view.fields.some(f => f.key === cb.value);
            });
        }, 50);

        document.getElementById('viewModal').style.display = 'flex';
    }

    saveView() {
        const name = document.getElementById('viewName').value.trim();
        const description = document.getElementById('viewDescription').value.trim();

        if (!name) {
            alert('Please enter a view name');
            return;
        }

        const checkboxes = document.querySelectorAll('#fieldSelector input[type="checkbox"]:checked');
        const fields = Array.from(checkboxes).map(cb => ({
            key: cb.value,
            label: cb.dataset.label
        }));

        if (fields.length === 0) {
            alert('Please select at least one field');
            return;
        }

        if (this.editingViewId) {
            // Update existing view
            const viewIndex = this.views.findIndex(v => v.id === this.editingViewId);
            if (viewIndex !== -1) {
                this.views[viewIndex] = {
                    ...this.views[viewIndex],
                    name: name,
                    description: description,
                    fields: fields,
                    updatedAt: new Date().toISOString()
                };
                alert(`View "${name}" updated successfully!`);
            }
        } else {
            // Create new view
            const newView = {
                id: Date.now().toString(),
                name: name,
                description: description,
                fields: fields,
                createdAt: new Date().toISOString()
            };
            this.views.push(newView);
            alert(`View "${name}" created successfully!`);
        }

        this.saveViews();
        this.closeModal();
        this.renderViewsList();
    }

    deleteView(viewId) {
        const view = this.views.find(v => v.id === viewId);
        if (!view) return;

        if (!confirm(`Are you sure you want to delete "${view.name}"?`)) {
            return;
        }

        this.views = this.views.filter(v => v.id !== viewId);
        this.saveViews();
        this.renderViewsList();
    }

    duplicateView(viewId) {
        const view = this.views.find(v => v.id === viewId);
        if (!view) return;

        const duplicate = {
            id: Date.now().toString(),
            name: `${view.name} (Copy)`,
            description: view.description,
            fields: [...view.fields],
            createdAt: new Date().toISOString()
        };

        this.views.push(duplicate);
        this.saveViews();
        this.renderViewsList();
    }

    previewView(viewId) {
        const view = this.views.find(v => v.id === viewId);
        if (!view) return;

        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 16px; color: #1f2937;">${view.name}</h3>
                ${view.description ? `<p style="color: #6b7280; margin-bottom: 20px;">${view.description}</p>` : ''}
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                    <h4 style="margin-bottom: 12px; color: #374151;">Selected Fields (${view.fields.length})</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
                        ${view.fields.map(f => `
                            <div style="background: white; padding: 8px 12px; border-radius: 6px; font-size: 13px; border-left: 3px solid #667eea;">
                                ${f.label}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <p style="font-size: 13px; color: #1e40af;">
                        <i class="fas fa-info-circle"></i>
                        This is a preview of the fields that will be displayed when this view is applied to the database viewer.
                    </p>
                </div>
            </div>
        `;

        document.getElementById('previewModal').style.display = 'flex';
    }

    // ==================== Render Methods ====================

    renderViewsList() {
        const container = document.getElementById('viewsList');
        const emptyState = document.getElementById('emptyState');

        // Check if elements exist (may not exist on all pages)
        if (!container || !emptyState) {
            return;
        }

        if (this.views.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        emptyState.style.display = 'none';

        container.innerHTML = this.views.map(view => {
            const createdDate = new Date(view.createdAt).toLocaleDateString();
            const updatedDate = view.updatedAt ? new Date(view.updatedAt).toLocaleDateString() : null;

            return `
                <div class="view-card">
                    <div class="view-card-header">
                        <div>
                            <div class="view-name">
                                <i class="fas fa-table"></i>
                                ${view.name}
                            </div>
                            <div class="view-meta">Created: ${createdDate}</div>
                            ${updatedDate ? `<div class="view-meta">Updated: ${updatedDate}</div>` : ''}
                        </div>
                    </div>
                    <div class="view-description">
                        ${view.description || '<em>No description</em>'}
                    </div>
                    <div class="view-stats">
                        <div class="view-stat">
                            <i class="fas fa-list"></i>
                            <strong>${view.fields.length}</strong> fields
                        </div>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-sm btn-primary" onclick="viewManager.previewView('${view.id}')" title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewManager.editView('${view.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewManager.duplicateView('${view.id}')" title="Duplicate">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="viewManager.deleteView('${view.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderFieldSelector() {
        const container = document.getElementById('fieldSelector');
        const groups = this.getFieldGroups();

        container.innerHTML = groups.map((group, idx) => `
            <div class="field-group">
                <div class="field-group-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                    <div class="field-group-title">
                        <i class="${group.icon}"></i>
                        ${group.title}
                    </div>
                    <div class="field-group-actions" onclick="event.stopPropagation()">
                        <button type="button" class="btn-group-select" onclick="viewManager.selectGroupFields(${idx})">Select All</button>
                        <button type="button" class="btn-group-clear" onclick="viewManager.clearGroupFields(${idx})">Clear</button>
                        <div class="field-count">${group.fields.length} fields</div>
                    </div>
                </div>
                <div class="field-group-items" data-group-idx="${idx}">
                    ${group.fields.map(field => `
                        <label class="field-checkbox">
                            <input type="checkbox" value="${field.key}" data-label="${field.label}">
                            <span>${field.label}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    selectGroupFields(idx) {
        document.querySelectorAll(`#fieldSelector .field-group-items[data-group-idx="${idx}"] input[type="checkbox"]`)
            .forEach(cb => cb.checked = true);
    }

    clearGroupFields(idx) {
        document.querySelectorAll(`#fieldSelector .field-group-items[data-group-idx="${idx}"] input[type="checkbox"]`)
            .forEach(cb => cb.checked = false);
    }

    getFieldGroups() {
        return [
            {
                title: 'Administrative Information',
                icon: 'fas fa-file-alt',
                fields: [
                    { key: 'field005', label: '005 - Security Classification' },
                    { key: 'field006', label: '006 - Agency Code' },
                    { key: 'field007', label: '007 - Record Type' },
                    { key: 'field010', label: '010 - Type of Action' },
                    { key: 'field102', label: '102 - Agency Serial Number' },
                    { key: 'field151', label: '151 - Status Flag' },
                    { key: 'field152', label: '152 - Notes' }
                ]
            },
            {
                title: 'Frequency Information',
                icon: 'fas fa-broadcast-tower',
                fields: [
                    { key: 'field110', label: '110 - Frequency' },
                    { key: 'field111', label: '111 - Channel Number' },
                    { key: 'field112', label: '112 - Channel Spacing' }
                ]
            },
            {
                title: 'Emission Characteristics (113-116)',
                icon: 'fas fa-signal',
                fields: [
                    { key: 'field113', label: '113 - Station Class' },
                    { key: 'field114', label: '114 - Emission Designator' },
                    { key: 'field115', label: '115 - Transmitter Power' },
                    { key: 'field116', label: '116 - Antenna Height/Type' }
                ]
            },
            {
                title: 'Time/Date Information',
                icon: 'fas fa-calendar',
                fields: [
                    { key: 'field130', label: '130 - Time' },
                    { key: 'field142', label: '142 - Review Date' },
                    { key: 'field143', label: '143 - Revision Date' },
                    { key: 'field144', label: '144 - Approval Authority' }
                ]
            },
            {
                title: 'Organizational Information',
                icon: 'fas fa-building',
                fields: [
                    { key: 'field200', label: '200 - Agency' },
                    { key: 'field201', label: '201 - Unified Command' },
                    { key: 'field202', label: '202 - Unified Command Service' },
                    { key: 'field204', label: '204 - Command' },
                    { key: 'field205', label: '205 - Subcommand' },
                    { key: 'field206', label: '206 - Installation Frequency Manager' },
                    { key: 'field207', label: '207 - Operating Unit' }
                ]
            },
            {
                title: 'Transmitter Location',
                icon: 'fas fa-map-marker-alt',
                fields: [
                    { key: 'field300', label: '300 - State/Country' },
                    { key: 'field301', label: '301 - Antenna Location' },
                    { key: 'field303', label: '303 - Antenna Coordinates' },
                    { key: 'field306', label: '306 - Authorized Radius' }
                ]
            },
            {
                title: 'Transmitter Equipment',
                icon: 'fas fa-server',
                fields: [
                    { key: 'field340', label: '340 - Transmitter Nomenclature' },
                    { key: 'field343', label: '343 - Transmitter Certification ID' },
                    { key: 'field357', label: '357 - Antenna Gain' },
                    { key: 'field362', label: '362 - Antenna Orientation' },
                    { key: 'field363', label: '363 - Antenna Polarization' }
                ]
            },
            {
                title: 'FAO & Control',
                icon: 'fas fa-user-tie',
                fields: [
                    { key: 'field701', label: '701 - Frequency Action Officer' },
                    { key: 'field702', label: '702 - Control/Request Number' }
                ]
            },
            {
                title: 'Computed Fields',
                icon: 'fas fa-calculator',
                fields: [
                    { key: 'serial', label: 'Serial Number (Field 102)' },
                    { key: 'frequency', label: 'Frequency (Field 110)' },
                    { key: 'location', label: 'Location (Field 301)' },
                    { key: 'agency', label: 'Agency (Field 200)' },
                    { key: 'status', label: 'SFAF Completion Status' },
                    { key: 'created_at', label: 'Record Created Date' },
                    { key: 'updated_at', label: 'Record Updated Date' }
                ]
            }
        ];
    }

    // ==================== Modal Methods ====================

    closeModal() {
        document.getElementById('viewModal').style.display = 'none';
        this.editingViewId = null;
    }

    closePreviewModal() {
        document.getElementById('previewModal').style.display = 'none';
    }

    // ==================== Field Selection Methods ====================

    selectAllFields() {
        const checkboxes = document.querySelectorAll('#fieldSelector input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    clearAllFields() {
        const checkboxes = document.querySelectorAll('#fieldSelector input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    // ==================== Settings Methods ====================

    setDefaultView() {
        const select = document.getElementById('defaultViewSelect');
        if (!select) return;

        this.saveDefaultView(select.value);
        alert('Default view updated successfully!');
    }

    updateDefaultViewSelect() {
        const select = document.getElementById('defaultViewSelect');
        if (!select) return;

        select.value = this.defaultView;

        // Add custom views to dropdown
        const customOptions = this.views.map(view =>
            `<option value="custom_${view.id}">${view.name} (Custom)</option>`
        ).join('');

        if (customOptions) {
            const builtInOptions = Array.from(select.querySelectorAll('option:not([data-custom])'));
            select.innerHTML = builtInOptions.map(opt => opt.outerHTML).join('') + customOptions;
        }

        select.value = this.defaultView;
    }

    updateStats() {
        const statsElement = document.getElementById('totalViewsCount');
        if (statsElement) {
            statsElement.textContent = this.views.length;
        }
        this.updateDefaultViewSelect();
    }

    // ==================== Bulk Operations ====================

    clearAllViews() {
        if (!confirm('Are you sure you want to delete ALL custom views? This cannot be undone!')) {
            return;
        }

        this.views = [];
        this.saveViews();
        this.renderViewsList();
    }

    resetToDefaults() {
        if (!confirm('Reset to default settings? This will clear all custom views and reset your default view preference.')) {
            return;
        }

        this.views = [];
        this.saveViews();
        this.saveDefaultView('summary');
        this.defaultView = 'summary';
        this.renderViewsList();
        this.updateDefaultViewSelect();
        alert('Settings reset to defaults');
    }

    // ==================== Import/Export ====================

    exportViews() {
        if (this.views.length === 0) {
            alert('No views to export');
            return;
        }

        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            views: this.views
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sfaf-views-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importViews() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    if (!data.views || !Array.isArray(data.views)) {
                        alert('Invalid view file format');
                        return;
                    }

                    const imported = data.views.length;
                    this.views = [...this.views, ...data.views];
                    this.saveViews();
                    this.renderViewsList();
                    alert(`Successfully imported ${imported} view(s)`);
                } catch (error) {
                    alert('Error importing views: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

// Initialize on page load
let viewManager;
window.addEventListener('DOMContentLoaded', () => {
    viewManager = new ViewManager();
});
