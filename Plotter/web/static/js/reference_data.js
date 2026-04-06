// reference_data.js - Reference Data Management for View Manager

const referenceData = {
    currentTab: 'views',
    units: [],
    iracNotes: [],
    manufacturers: [],
    installations: [],
    systemConfig: [],
    sfafLookup: [],
    currentUserInstallationID: null,

    async init() {
        this.setupTabs();
        await this._loadCurrentUserInstallation();
        this.loadUnits();
        this.loadIRACNotes();
    },

    async _loadCurrentUserInstallation() {
        try {
            const res = await fetch('/api/auth/session');
            const data = await res.json();
            if (data.valid && data.user?.installation_id) {
                this.currentUserInstallationID = data.user.installation_id;
                // Do not pre-set the filter — unit management shows all units by default
            }
        } catch (e) {
            // non-fatal
        }
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');

        // Update active tab panel
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tabName}-tab`)?.classList.add('active');

        this.currentTab = tabName;

        // Load data for the tab
        if (tabName === 'units' && this.units.length === 0) {
            this.loadUnits();
        } else if (tabName === 'irac-notes' && this.iracNotes.length === 0) {
            this.loadIRACNotes();
        } else if (tabName === 'manufacturers' && this.manufacturers.length === 0) {
            this.loadManufacturers();
        } else if (tabName === 'installations' && this.installations.length === 0) {
            this.loadInstallations();
        } else if (tabName === 'system-config' && this.systemConfig.length === 0) {
            this.loadSystemConfig();
        } else if (tabName === 'sfaf-codes' && this.sfafLookup.length === 0) {
            this.loadLookup(this._currentLookupField);
        }
    },

    // ============================================
    // Units Management
    // ============================================

    async loadUnits() {
        try {
            const [unitsRes, instRes] = await Promise.all([
                fetch('/api/frequency/units'),
                this.installations.length === 0 ? fetch('/api/installations') : Promise.resolve(null)
            ]);

            const data = await unitsRes.json();
            if (data.units) {
                this.units = data.units.map(u => u.unit);
            }

            if (instRes) {
                const instData = await instRes.json();
                this.installations = instData.installations || [];
            }

            this._populateInstallationFilterDropdown();
            this.renderUnits();
        } catch (error) {
            console.error('Error loading units:', error);
            this.showError('unitsTableBody', 'Failed to load units');
        }
    },

    _populateInstallationFilterDropdown() {
        const sel = document.getElementById('unitsInstallationFilter');
        if (!sel) return;
        const current = this._installationFilter || '';
        sel.innerHTML = '<option value="">All Installations</option>' +
            this.installations.filter(i => i.is_active).map(i =>
                `<option value="${i.id}"${i.id === current ? ' selected' : ''}>${i.name}</option>`
            ).join('');
    },

    filterUnits(q) {
        this._unitFilter = q.toLowerCase();
        this.renderUnits();
    },

    filterUnitsByInstallation(installationId) {
        this._installationFilter = installationId;
        this.renderUnits();
    },

    renderUnits() {
        const tbody = document.getElementById('unitsTableBody');
        if (!tbody) return;

        const q = this._unitFilter || '';
        const instFilter = this._installationFilter || '';
        let list = this.units;
        if (instFilter) {
            list = list.filter(u => u.installation_id === instFilter);
        }
        if (q) {
            list = list.filter(u =>
                (u.unit_code || '').toLowerCase().includes(q) ||
                (u.organization || '').toLowerCase().includes(q) ||
                (u.location || '').toLowerCase().includes(q)
            );
        }

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5" style="text-align: center;">
                        <i class="fas fa-inbox"></i> ${q || instFilter ? 'No units match your filters' : 'No units found'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(unit => `
            <tr>
                <td><strong>${unit.unit_code}</strong></td>
                <td>${unit.organization || '-'}</td>
                <td>${unit.location || '-'}</td>
                <td>
                    <span class="status-badge ${unit.is_active ? 'status-active' : 'status-inactive'}">
                        ${unit.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="referenceData.viewUnitFrequencies('${unit.id}')" title="View Frequencies">
                        <i class="fas fa-broadcast-tower"></i>
                    </button>
                    <button class="btn btn-sm btn-icon" onclick="referenceData.editUnit('${unit.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="referenceData.deleteUnit('${unit.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async _populateUnitInstallationDropdown(selectedId) {
        const sel = document.getElementById('unitInstallation');
        if (!sel) return;
        if (this.installations.length === 0) {
            try {
                const res = await fetch('/api/installations');
                const data = await res.json();
                this.installations = data.installations || [];
            } catch { /* ignore */ }
        }
        sel.innerHTML = '<option value="">— Select Installation —</option>';
        this.installations.filter(i => i.is_active).forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst.id;
            opt.textContent = inst.name + (inst.code ? ' (' + inst.code + ')' : '');
            if (inst.id === selectedId) opt.selected = true;
            sel.appendChild(opt);
        });
    },

    showAddUnit() {
        document.getElementById('unitModalTitle').innerHTML = '<i class="fas fa-users"></i> Add Unit';
        document.getElementById('unitForm').reset();
        document.getElementById('unitId').value = '';
        document.getElementById('unitIsActive').checked = true;
        this._populateUnitInstallationDropdown(null);
        document.getElementById('unitModal').style.display = 'block';
    },

    editUnit(unitId) {
        const unit = this.units.find(u => u.id === unitId);
        if (!unit) return;

        document.getElementById('unitModalTitle').innerHTML = '<i class="fas fa-users"></i> Edit Unit';
        document.getElementById('unitId').value = unit.id;
        document.getElementById('unitCode').value = unit.unit_code;
        document.getElementById('unitOrganization').value = unit.organization || '';
        document.getElementById('unitLocation').value = unit.location || '';
        document.getElementById('commanderName').value = unit.commander_name || '';
        document.getElementById('commanderEmail').value = unit.commander_email || '';
        document.getElementById('commPocName').value = unit.comm_poc_name || '';
        document.getElementById('commPocEmail').value = unit.comm_poc_email || '';
        document.getElementById('commPocPhone').value = unit.comm_poc_phone || '';
        document.getElementById('unitIsActive').checked = unit.is_active;
        this._populateUnitInstallationDropdown(unit.installation_id || null);
        document.getElementById('unitModal').style.display = 'block';
    },

    async saveUnit() {
        const unitId = document.getElementById('unitId').value;
        const instVal = document.getElementById('unitInstallation').value;
        const unitData = {
            unit_code: document.getElementById('unitCode').value,
            name: document.getElementById('unitCode').value, // Use unit_code as name for backend compatibility
            organization: document.getElementById('unitOrganization').value,
            location: document.getElementById('unitLocation').value,
            commander_name: document.getElementById('commanderName').value,
            commander_email: document.getElementById('commanderEmail').value,
            comm_poc_name: document.getElementById('commPocName').value,
            comm_poc_email: document.getElementById('commPocEmail').value,
            comm_poc_phone: document.getElementById('commPocPhone').value,
            installation_id: instVal || null,
            is_active: document.getElementById('unitIsActive').checked
        };

        if (!unitData.unit_code) {
            alert('Please fill in required field: Unit Designator');
            return;
        }

        try {
            const method = unitId ? 'PUT' : 'POST';
            const url = unitId ? `/api/frequency/units/${unitId}` : '/api/frequency/units';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(unitData)
            });

            if (response.ok) {
                this.showToast('Unit saved successfully', 'success');
                this.closeUnitModal();
                this.loadUnits();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to save unit'), 'error');
            }
        } catch (error) {
            console.error('Error saving unit:', error);
            this.showToast('Error saving unit: ' + error.message, 'error');
        }
    },

    async deleteUnit(unitId) {
        if (!confirm('Are you sure you want to delete this unit?')) {
            return;
        }

        try {
            const response = await fetch(`/api/frequency/units/${unitId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('Unit deleted successfully', 'success');
                this.loadUnits();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to delete unit'), 'error');
            }
        } catch (error) {
            console.error('Error deleting unit:', error);
            this.showToast('Error deleting unit: ' + error.message, 'error');
        }
    },

    async viewUnitFrequencies(unitId) {
        try {
            // Fetch fresh unit data with assignments
            const response = await fetch(`/api/frequency/units`);
            if (!response.ok) {
                throw new Error('Failed to fetch unit data');
            }

            const data = await response.json();
            const unitWithAssignments = data.units.find(u => u.unit.id === unitId);

            if (!unitWithAssignments) {
                this.showToast('Unit not found', 'error');
                return;
            }

            // Show modal with frequencies
            this.showFrequenciesModal(unitWithAssignments.unit, unitWithAssignments.frequency_assignments || []);
        } catch (error) {
            console.error('Error loading unit frequencies:', error);
            this.showToast('Error loading frequencies: ' + error.message, 'error');
        }
    },

    showFrequenciesModal(unit, assignments) {
        const modal = document.getElementById('unitFrequenciesModal');
        if (!modal) {
            console.error('Unit frequencies modal not found');
            return;
        }

        // Store current unit data and assignments for navigation to database
        this.currentViewingUnitId = unit.id;
        this.currentViewingUnitCode = unit.unit_code;
        this.currentViewingAssignments = assignments;

        document.getElementById('unitFrequenciesTitle').innerHTML =
            `<i class="fas fa-broadcast-tower"></i> Frequencies for ${unit.unit_code}`;

        const tbody = document.getElementById('unitFrequenciesTableBody');

        if (assignments.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #666; display: block; margin-bottom: 10px;"></i>
                        <p style="color: #999;">No frequency assignments found for this unit</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = assignments.map((assignment, index) => {
                const startDate = new Date(assignment.assignment_date).toLocaleDateString();
                const endDate = assignment.expiration_date ? new Date(assignment.expiration_date).toLocaleDateString() : 'Indefinite';
                const daysRemaining = assignment.expiration_date ?
                    Math.ceil((new Date(assignment.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

                let statusClass = 'status-active';
                let statusText = 'Active';
                if (daysRemaining !== null) {
                    if (daysRemaining < 0) {
                        statusClass = 'status-inactive';
                        statusText = 'Expired';
                    } else if (daysRemaining <= 30) {
                        statusClass = 'status-warning';
                        statusText = `Expires in ${daysRemaining}d`;
                    }
                }

                return `
                    <tr>
                        <td><strong>${assignment.serial || '-'}</strong></td>
                        <td><strong>${assignment.frequency_mhz.toFixed(6)} MHz</strong></td>
                        <td>${assignment.emission_designator || '-'}</td>
                        <td>${assignment.power_watts ? assignment.power_watts + ' W' : '-'}</td>
                        <td>${startDate}</td>
                        <td>${endDate}</td>
                        <td>
                            <span class="status-badge ${statusClass}">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        modal.style.display = 'block';
    },

    async refreshFrequenciesModal() {
        // Re-fetch the unit data to get latest frequencies
        try {
            const response = await fetch(`/api/frequency/units`);
            if (!response.ok) {
                throw new Error('Failed to refresh frequencies');
            }

            const data = await response.json();
            const unitWithAssignments = data.units.find(u => u.unit.id === this.currentViewingUnitId);

            if (!unitWithAssignments) {
                this.showToast('Unit not found', 'error');
                return;
            }

            // Update the modal with fresh data
            this.currentViewingAssignments = unitWithAssignments.frequency_assignments || [];
            this.showFrequenciesModal(unitWithAssignments.unit, unitWithAssignments.frequency_assignments || []);
            this.showToast('Frequencies refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing frequencies:', error);
            this.showToast('Error refreshing frequencies: ' + error.message, 'error');
        }
    },

    viewUnitInDatabase() {
        // Extract serial numbers from assignments
        const serials = this.currentViewingAssignments.map(assignment => assignment.serial).filter(serial => serial);

        // Store in sessionStorage for db_viewer to pick up
        sessionStorage.setItem('dbFilterSerials', JSON.stringify({
            unitCode: this.currentViewingUnitCode,
            serials: serials
        }));

        // Navigate to database viewer
        window.location.href = '/database';
    },

    closeFrequenciesModal() {
        document.getElementById('unitFrequenciesModal').style.display = 'none';
    },

    closeUnitModal() {
        document.getElementById('unitModal').style.display = 'none';
    },

    async cleanupOrphanedAssignments() {
        if (!confirm('This will delete all frequency assignments that don\'t have corresponding SFAF records. Continue?')) {
            return;
        }

        try {
            const response = await fetch('/api/frequency/cleanup-orphaned', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cleanup orphaned assignments');
            }

            const data = await response.json();
            this.showToast(`Successfully deleted ${data.deleted} orphaned frequency assignment(s)`, 'success');

            // Reload units to refresh the display
            this.loadUnits();
        } catch (error) {
            console.error('Error cleaning up orphaned assignments:', error);
            this.showToast('Error cleaning up orphaned assignments: ' + error.message, 'error');
        }
    },

    // ============================================
    // IRAC Notes Management
    // ============================================

    async loadIRACNotes() {
        try {
            const response = await fetch('/api/irac-notes');
            const data = await response.json();

            if (data.notes) {
                this.iracNotes = data.notes;
                this.renderIRACNotes();
            } else {
                this.iracNotes = [];
                this.renderIRACNotes();
            }
        } catch (error) {
            console.error('Error loading IRAC notes:', error);
            this.showError('iracNotesTableBody', 'Failed to load IRAC notes');
        }
    },

    filterIRACNotes(q) {
        this._iracFilter = q.toLowerCase();
        this.renderIRACNotes();
    },

    renderIRACNotes() {
        const tbody = document.getElementById('iracNotesTableBody');
        if (!tbody) return;

        const q = this._iracFilter || '';
        const notes = q ? this.iracNotes.filter(n =>
            n.code.toLowerCase().includes(q) ||
            (n.title || '').toLowerCase().includes(q) ||
            (n.description || '').toLowerCase().includes(q)
        ) : this.iracNotes;

        if (notes.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4" style="text-align: center;">
                        <i class="fas fa-inbox"></i> ${q ? 'No notes match your search' : 'No IRAC notes found'}
                    </td>
                </tr>
            `;
            return;
        }

        // Pub 7 category order
        const categoryOrder = ['Coordination', 'Emission', 'Limitation', 'Minute', 'Priority', 'Special'];

        // Group notes by category
        const grouped = {};
        for (const note of notes) {
            const cat = note.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(note);
        }

        // Sort within each category by numeric portion of code
        const codeNum = code => parseInt(code.replace(/\D+/, ''), 10) || 0;
        for (const cat of Object.keys(grouped)) {
            grouped[cat].sort((a, b) => codeNum(a.code) - codeNum(b.code));
        }

        // Render in Pub 7 order, then any remaining categories
        const orderedCats = [...categoryOrder, ...Object.keys(grouped).filter(c => !categoryOrder.includes(c))];
        if (!this._iracCollapsed) this._iracCollapsed = new Set();

        let rows = '';
        for (const cat of orderedCats) {
            if (!grouped[cat] || grouped[cat].length === 0) continue;
            const catId = 'irac-cat-' + cat.toLowerCase();
            // Auto-expand when searching; otherwise respect manual collapse state
            const collapsed = q ? false : this._iracCollapsed.has(cat);
            rows += `
                <tr class="category-header-row" style="cursor:pointer;" onclick="referenceData.toggleIRACCategory('${cat}')">
                    <td colspan="4" style="background:#2a3a4a;color:#7eb8d4;font-weight:600;padding:6px 12px;font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;user-select:none;">
                        <i class="fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-down'}" id="${catId}-icon" style="margin-right:6px;font-size:0.7rem;"></i>${cat} <span style="opacity:0.6;">(${grouped[cat].length})</span>
                    </td>
                </tr>`;
            for (const note of grouped[cat]) {
                rows += `
                <tr data-irac-cat="${cat}"${collapsed ? ' style="display:none;"' : ''}>
                    <td><strong>${note.code}</strong></td>
                    <td>${note.title || '-'}</td>
                    <td>${this.truncateText(note.description, 120)}</td>
                    <td>
                        <button class="btn btn-sm btn-icon" onclick="referenceData.editIRACNote('${note.code}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-icon btn-danger" onclick="referenceData.deleteIRACNote('${note.code}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            }
        }
        tbody.innerHTML = rows;
    },

    toggleIRACCategory(cat) {
        if (!this._iracCollapsed) this._iracCollapsed = new Set();
        const collapsed = this._iracCollapsed.has(cat);
        if (collapsed) {
            this._iracCollapsed.delete(cat);
        } else {
            this._iracCollapsed.add(cat);
        }
        const catId = 'irac-cat-' + cat.toLowerCase();
        const icon = document.getElementById(catId + '-icon');
        if (icon) {
            icon.classList.toggle('fa-chevron-down', collapsed);
            icon.classList.toggle('fa-chevron-right', !collapsed);
        }
        document.querySelectorAll(`tr[data-irac-cat="${cat}"]`).forEach(row => {
            row.style.display = collapsed ? '' : 'none';
        });
    },

    showAddIRACNote() {
        document.getElementById('iracNoteModalTitle').innerHTML = '<i class="fas fa-sticky-note"></i> Add IRAC Note';
        document.getElementById('iracNoteForm').reset();
        document.getElementById('iracNoteId').value = '';
        document.getElementById('iracNoteModal').style.display = 'block';
    },

    editIRACNote(noteCode) {
        const note = this.iracNotes.find(n => n.code === noteCode);
        if (!note) return;

        document.getElementById('iracNoteModalTitle').innerHTML = '<i class="fas fa-sticky-note"></i> Edit IRAC Note';
        document.getElementById('iracNoteId').value = note.code;
        document.getElementById('iracNoteNumber').value = note.code;
        document.getElementById('iracCategory').value = note.category || '';
        document.getElementById('iracNoteText').value = note.description || '';
        document.getElementById('iracNoteModal').style.display = 'block';
    },

    async saveIRACNote() {
        const noteCode = document.getElementById('iracNoteId').value;
        const noteData = {
            code: document.getElementById('iracNoteNumber').value,
            category: document.getElementById('iracCategory').value,
            description: document.getElementById('iracNoteText').value,
            title: document.getElementById('iracNoteNumber').value
        };

        if (!noteData.code || !noteData.description) {
            alert('Please fill in required fields (Code and Description)');
            return;
        }

        try {
            const method = noteCode ? 'PUT' : 'POST';
            const url = noteCode ? `/api/irac-notes/${noteCode}` : '/api/irac-notes';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            if (response.ok) {
                this.showToast('IRAC note saved successfully', 'success');
                this.closeIRACNoteModal();
                this.loadIRACNotes();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to save IRAC note'), 'error');
            }
        } catch (error) {
            console.error('Error saving IRAC note:', error);
            this.showToast('Error saving IRAC note: ' + error.message, 'error');
        }
    },

    async deleteIRACNote(noteId) {
        if (!confirm('Are you sure you want to delete this IRAC note?')) {
            return;
        }

        try {
            const response = await fetch(`/api/irac-notes/${noteId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('IRAC note deleted successfully', 'success');
                this.loadIRACNotes();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to delete IRAC note'), 'error');
            }
        } catch (error) {
            console.error('Error deleting IRAC note:', error);
            this.showToast('Error deleting IRAC note: ' + error.message, 'error');
        }
    },

    closeIRACNoteModal() {
        document.getElementById('iracNoteModal').style.display = 'none';
    },

    // ============================================
    // Manufacturers Management
    // ============================================

    async loadManufacturers() {
        try {
            const response = await fetch('/api/manufacturers');
            const data = await response.json();

            if (data.manufacturers) {
                this.manufacturers = data.manufacturers;
                this.renderManufacturers();
            }
        } catch (error) {
            console.error('Error loading manufacturers:', error);
            this.showError('manufacturersTableBody', 'Failed to load manufacturers');
        }
    },

    filterManufacturers(q) {
        this._mfrFilter = q.toLowerCase();
        this.renderManufacturers();
    },

    renderManufacturers() {
        const tbody = document.getElementById('manufacturersTableBody');
        if (!tbody) return;

        const q = this._mfrFilter || '';
        const list = q ? this.manufacturers.filter(m =>
            m.code.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            (m.country || '').toLowerCase().includes(q)
        ) : this.manufacturers;

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5" style="text-align: center;">
                        <i class="fas fa-inbox"></i> ${q ? 'No manufacturers match your search' : 'No manufacturers found'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(m => `
            <tr>
                <td><strong>${m.code}</strong></td>
                <td>${m.name}</td>
                <td>${m.country || '-'}</td>
                <td>
                    <span class="status-badge ${m.is_active ? 'status-active' : 'status-inactive'}">
                        ${m.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="referenceData.editManufacturer('${m.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="referenceData.deleteManufacturer('${m.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showAddManufacturer() {
        document.getElementById('manufacturerModalTitle').innerHTML = '<i class="fas fa-industry"></i> Add Manufacturer';
        document.getElementById('manufacturerForm').reset();
        document.getElementById('manufacturerId').value = '';
        document.getElementById('manufacturerIsActive').checked = true;
        document.getElementById('manufacturerModal').style.display = 'block';
    },

    editManufacturer(id) {
        const m = this.manufacturers.find(m => m.id === id);
        if (!m) return;

        document.getElementById('manufacturerModalTitle').innerHTML = '<i class="fas fa-industry"></i> Edit Manufacturer';
        document.getElementById('manufacturerId').value = m.id;
        document.getElementById('manufacturerCode').value = m.code;
        document.getElementById('manufacturerName').value = m.name;
        document.getElementById('manufacturerCountry').value = m.country || '';
        document.getElementById('manufacturerIsActive').checked = m.is_active;
        document.getElementById('manufacturerModal').style.display = 'block';
    },

    async saveManufacturer() {
        const id = document.getElementById('manufacturerId').value;
        const data = {
            code: document.getElementById('manufacturerCode').value.toUpperCase(),
            name: document.getElementById('manufacturerName').value,
            country: document.getElementById('manufacturerCountry').value || null,
            is_active: document.getElementById('manufacturerIsActive').checked
        };

        if (!data.code || !data.name) {
            alert('Please fill in required fields: Code and Manufacturer Name');
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/manufacturers/${id}` : '/api/manufacturers';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showToast('Manufacturer saved successfully', 'success');
                this.closeManufacturerModal();
                this.manufacturers = [];
                this.loadManufacturers();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to save manufacturer'), 'error');
            }
        } catch (error) {
            console.error('Error saving manufacturer:', error);
            this.showToast('Error saving manufacturer: ' + error.message, 'error');
        }
    },

    async deleteManufacturer(id) {
        if (!confirm('Are you sure you want to delete this manufacturer?')) return;

        try {
            const response = await fetch(`/api/manufacturers/${id}`, { method: 'DELETE' });

            if (response.ok) {
                this.showToast('Manufacturer deleted successfully', 'success');
                this.manufacturers = [];
                this.loadManufacturers();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to delete manufacturer'), 'error');
            }
        } catch (error) {
            console.error('Error deleting manufacturer:', error);
            this.showToast('Error deleting manufacturer: ' + error.message, 'error');
        }
    },

    closeManufacturerModal() {
        document.getElementById('manufacturerModal').style.display = 'none';
    },

    // ============================================
    // Installations Management
    // ============================================

    async loadInstallations() {
        try {
            const response = await fetch('/api/installations');
            const data = await response.json();
            this.installations = data.installations || [];
            this.renderInstallations();
        } catch (error) {
            console.error('Error loading installations:', error);
            this.showError('installationsTableBody', 'Failed to load installations');
        }
    },

    filterInstallations(q) {
        this._instFilter = q.toLowerCase();
        this.renderInstallations();
    },

    renderInstallations() {
        const tbody = document.getElementById('installationsTableBody');
        if (!tbody) return;

        const q = this._instFilter || '';
        const list = q ? this.installations.filter(i =>
            i.name.toLowerCase().includes(q) ||
            (i.code || '').toLowerCase().includes(q) ||
            (i.organization || '').toLowerCase().includes(q) ||
            (i.state || '').toLowerCase().includes(q)
        ) : this.installations;

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7" style="text-align: center;">
                        <i class="fas fa-inbox"></i> ${q ? 'No installations match your search' : 'No installations found'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(inst => `
            <tr>
                <td><strong>${inst.name}</strong></td>
                <td>${inst.code || '-'}</td>
                <td>${inst.organization || '-'}</td>
                <td>${inst.state || '-'}</td>
                <td>${inst.country || 'USA'}</td>
                <td>
                    <span class="status-badge ${inst.is_active ? 'status-active' : 'status-inactive'}">
                        ${inst.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="referenceData.editInstallation('${inst.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="referenceData.deleteInstallation('${inst.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showAddInstallation() {
        document.getElementById('installationModalTitle').innerHTML = '<i class="fas fa-map-marker-alt"></i> Add Installation';
        document.getElementById('installationForm').reset();
        document.getElementById('installationId').value = '';
        document.getElementById('installationCountry').value = 'USA';
        document.getElementById('installationIsActive').checked = true;
        document.getElementById('installationModal').style.display = 'block';
    },

    editInstallation(id) {
        const inst = this.installations.find(i => i.id === id);
        if (!inst) return;

        document.getElementById('installationModalTitle').innerHTML = '<i class="fas fa-map-marker-alt"></i> Edit Installation';
        document.getElementById('installationId').value = inst.id;
        document.getElementById('installationName').value = inst.name;
        document.getElementById('installationCode').value = inst.code || '';
        document.getElementById('installationOrganization').value = inst.organization || '';
        document.getElementById('installationState').value = inst.state || '';
        document.getElementById('installationCountry').value = inst.country || 'USA';
        document.getElementById('installationIsActive').checked = inst.is_active;
        document.getElementById('installationModal').style.display = 'block';
    },

    async saveInstallation() {
        const id = document.getElementById('installationId').value;
        const name = document.getElementById('installationName').value.trim();
        if (!name) {
            alert('Installation Name is required');
            return;
        }

        const data = {
            name,
            code: document.getElementById('installationCode').value.trim() || null,
            organization: document.getElementById('installationOrganization').value || null,
            state: document.getElementById('installationState').value.trim() || null,
            country: document.getElementById('installationCountry').value.trim() || 'USA',
            is_active: document.getElementById('installationIsActive').checked
        };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/installations/${id}` : '/api/installations';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showToast('Installation saved successfully', 'success');
                this.closeInstallationModal();
                this.installations = [];
                this.loadInstallations();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to save installation'), 'error');
            }
        } catch (error) {
            this.showToast('Error saving installation: ' + error.message, 'error');
        }
    },

    async deleteInstallation(id) {
        if (!confirm('Are you sure you want to delete this installation?')) return;

        try {
            const response = await fetch(`/api/installations/${id}`, { method: 'DELETE' });

            if (response.ok) {
                this.showToast('Installation deleted successfully', 'success');
                this.installations = [];
                this.loadInstallations();
            } else {
                const error = await response.json();
                this.showToast('Error: ' + (error.error || 'Failed to delete installation'), 'error');
            }
        } catch (error) {
            this.showToast('Error deleting installation: ' + error.message, 'error');
        }
    },

    closeInstallationModal() {
        document.getElementById('installationModal').style.display = 'none';
    },

    // ============================================
    // System Config Management
    // ============================================

    async loadSystemConfig() {
        try {
            const response = await fetch('/api/system-config');
            const data = await response.json();
            if (data.configs) {
                this.systemConfig = data.configs;
                this.renderSystemConfig();
            }
        } catch (error) {
            console.error('Error loading system config:', error);
            this.showError('systemConfigTableBody', 'Failed to load system configuration');
        }
    },

    filterSystemConfig(q) {
        this._configFilter = q.toLowerCase();
        this.renderSystemConfig();
    },

    renderSystemConfig() {
        const tbody = document.getElementById('systemConfigTableBody');
        if (!tbody) return;

        const q = this._configFilter || '';
        const list = q ? this.systemConfig.filter(c =>
            c.key.toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q) ||
            c.value.toLowerCase().includes(q)
        ) : this.systemConfig;

        if (list.length === 0) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="4" style="text-align:center;">
                <i class="fas fa-inbox"></i> ${q ? 'No settings match your search' : 'No configuration found'}
            </td></tr>`;
            return;
        }

        // Group by category
        const grouped = {};
        for (const cfg of list) {
            const cat = cfg.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(cfg);
        }

        let rows = '';
        for (const cat of Object.keys(grouped).sort()) {
            rows += `<tr class="category-header-row">
                <td colspan="4" style="background:#2a3a4a;color:#7eb8d4;font-weight:600;padding:6px 12px;font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;">
                    ${cat}
                </td>
            </tr>`;
            for (const cfg of grouped[cat]) {
                rows += `<tr>
                    <td style="font-family:monospace;font-size:0.85rem;">${cfg.key}</td>
                    <td>${this._configInputHtml(cfg)}</td>
                    <td style="color:#aaa;font-size:0.85rem;">${cfg.description || ''}</td>
                    <td>
                        ${cfg.is_readonly
                            ? '<span style="color:#555;font-size:0.8rem;">read-only</span>'
                            : `<button class="btn btn-sm btn-primary" onclick="referenceData.saveConfig('${cfg.key}')" title="Save"><i class="fas fa-check"></i></button>`
                        }
                    </td>
                </tr>`;
            }
        }
        tbody.innerHTML = rows;
    },

    _configInputHtml(cfg) {
        if (cfg.is_readonly) {
            return `<span style="font-family:monospace;">${cfg.value}</span>`;
        }
        if (cfg.type === 'boolean') {
            const checked = cfg.value === 'true' ? 'checked' : '';
            return `<input type="checkbox" id="cfg-${cfg.key}" ${checked} style="width:18px;height:18px;cursor:pointer;">`;
        }
        if (cfg.type === 'integer' || cfg.type === 'float') {
            const step = cfg.type === 'float' ? 'any' : '1';
            return `<input type="number" id="cfg-${cfg.key}" value="${cfg.value}" step="${step}"
                style="width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(100,150,255,0.25);border-radius:4px;color:#e0e0e0;padding:4px 8px;font-size:0.88rem;">`;
        }
        return `<input type="text" id="cfg-${cfg.key}" value="${cfg.value}"
            style="width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(100,150,255,0.25);border-radius:4px;color:#e0e0e0;padding:4px 8px;font-size:0.88rem;">`;
    },

    async saveConfig(key) {
        const el = document.getElementById('cfg-' + key);
        if (!el) return;
        const value = el.type === 'checkbox' ? String(el.checked) : el.value;
        try {
            const response = await fetch(`/api/system-config/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });
            if (response.ok) {
                const cfg = this.systemConfig.find(c => c.key === key);
                if (cfg) cfg.value = value;
                this.showToast('Setting saved', 'success');
            } else {
                const err = await response.json();
                this.showToast('Error: ' + (err.error || 'Failed to save'), 'error');
            }
        } catch (error) {
            this.showToast('Error saving setting: ' + error.message, 'error');
        }
    },

    // ============================================
    // SFAF Codes (Field Lookup) Management
    // ============================================

    _currentLookupField: '010',
    _fieldTitles: {
        '010': 'Field 010 — Type of Action',
        '144': 'Field 144 — Approval Authority Indicator',
        '151': 'Field 151 — Coordination Indicator',
        '200': 'Field 200 — Agency',
        '201': 'Field 201 — Combatant Command',
        '202': 'Field 202 — MAJCOM',
        '203': 'Field 203 — Bureau',
        '204': 'Field 204 — Sub-MAJCOM',
        '205': 'Field 205 — NAF / Wing',
        '206': 'Field 206 — ISM Office',
        '209': 'Field 209 — Area AFC / Other Organizations',
        '300': 'Field 300 — State / Area',
        '400': 'Field 400 — Country',
        '354': 'Field 354/454 — Antenna Name',
        '363': 'Field 363/463 — Antenna Polarization',
        '704': 'Field 704 — Type of Service',
        '716': 'Field 716 — Usage Code',
    },

    async loadLookup(fieldCode) {
        this._currentLookupField = fieldCode;
        try {
            const res = await fetch(`/api/sfaf-lookup?field=${fieldCode}`);
            const data = await res.json();
            this.sfafLookup = data.entries || [];
            this.renderLookup();
        } catch (err) {
            this.showError('sfafCodesTableBody', 'Failed to load entries');
        }
    },

    selectLookupField(fieldCode) {
        this._currentLookupField = fieldCode;
        this.sfafLookup = [];
        document.getElementById('sfafCodesSearch').value = '';
        this._lookupFilter = '';
        // Update sidebar active state
        document.querySelectorAll('.sfaf-field-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.field === fieldCode);
        });
        // Update title
        const title = this._fieldTitles[fieldCode] || `Field ${fieldCode}`;
        document.getElementById('sfafCodesTitle').innerHTML = `<i class="fas fa-list-ol"></i> ${title}`;
        this.loadLookup(fieldCode);
    },

    filterLookup(q) {
        this._lookupFilter = q.toLowerCase();
        this.renderLookup();
    },

    renderLookup() {
        const tbody = document.getElementById('sfafCodesTableBody');
        if (!tbody) return;
        const q = this._lookupFilter || '';
        const list = q
            ? this.sfafLookup.filter(e =>
                e.value.toLowerCase().includes(q) ||
                (e.label || '').toLowerCase().includes(q))
            : this.sfafLookup;

        if (list.length === 0) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="5" style="text-align:center;">
                <i class="fas fa-inbox"></i> ${q ? 'No entries match your search' : 'No entries found'}
            </td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(e => `
            <tr>
                <td><strong>${e.value}</strong></td>
                <td>${e.label || '-'}</td>
                <td style="text-align:center;">${e.sort_order}</td>
                <td>
                    <span class="status-badge ${e.is_active ? 'status-active' : 'status-inactive'}">
                        ${e.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="referenceData.editLookup('${e.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="referenceData.deleteLookup('${e.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showAddLookup() {
        const title = this._fieldTitles[this._currentLookupField] || `Field ${this._currentLookupField}`;
        document.getElementById('sfafLookupModalTitle').innerHTML = `<i class="fas fa-list-ol"></i> Add Entry — ${title}`;
        document.getElementById('sfafLookupForm').reset();
        document.getElementById('sfafLookupId').value = '';
        document.getElementById('sfafLookupFieldCode').value = this._currentLookupField;
        document.getElementById('sfafLookupIsActive').checked = true;
        document.getElementById('sfafLookupSortOrder').value = '0';
        document.getElementById('sfafLookupModal').style.display = 'block';
    },

    editLookup(id) {
        const e = this.sfafLookup.find(x => x.id === id);
        if (!e) return;
        const title = this._fieldTitles[e.field_code] || `Field ${e.field_code}`;
        document.getElementById('sfafLookupModalTitle').innerHTML = `<i class="fas fa-list-ol"></i> Edit Entry — ${title}`;
        document.getElementById('sfafLookupId').value = e.id;
        document.getElementById('sfafLookupFieldCode').value = e.field_code;
        document.getElementById('sfafLookupValue').value = e.value;
        document.getElementById('sfafLookupLabel').value = e.label || '';
        document.getElementById('sfafLookupSortOrder').value = e.sort_order;
        document.getElementById('sfafLookupIsActive').checked = e.is_active;
        document.getElementById('sfafLookupModal').style.display = 'block';
    },

    async saveLookup() {
        const id = document.getElementById('sfafLookupId').value;
        const fieldCode = document.getElementById('sfafLookupFieldCode').value;
        const value = document.getElementById('sfafLookupValue').value.trim();
        const label = document.getElementById('sfafLookupLabel').value.trim() || null;
        const sortOrder = parseInt(document.getElementById('sfafLookupSortOrder').value, 10) || 0;
        const isActive = document.getElementById('sfafLookupIsActive').checked;

        if (!value) { alert('Value is required'); return; }

        const body = id
            ? { value, label, sort_order: sortOrder, is_active: isActive }
            : { field_code: fieldCode, value, label, sort_order: sortOrder };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/sfaf-lookup/${id}` : '/api/sfaf-lookup';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                this.showToast('Entry saved', 'success');
                this.closeLookupModal();
                this.sfafLookup = [];
                this.loadLookup(this._currentLookupField);
            } else {
                const err = await res.json();
                this.showToast('Error: ' + (err.error || 'Failed to save'), 'error');
            }
        } catch (err) {
            this.showToast('Error: ' + err.message, 'error');
        }
    },

    async deleteLookup(id) {
        if (!confirm('Delete this entry?')) return;
        try {
            const res = await fetch(`/api/sfaf-lookup/${id}`, { method: 'DELETE' });
            if (res.ok) {
                this.showToast('Entry deleted', 'success');
                this.sfafLookup = [];
                this.loadLookup(this._currentLookupField);
            } else {
                const err = await res.json();
                this.showToast('Error: ' + (err.error || 'Failed to delete'), 'error');
            }
        } catch (err) {
            this.showToast('Error: ' + err.message, 'error');
        }
    },

    closeLookupModal() {
        document.getElementById('sfafLookupModal').style.display = 'none';
    },

    // ============================================
    // Helper Functions
    // ============================================

    truncateText(text, maxLength) {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <tr class="error-row">
                    <td colspan="10" style="text-align: center; color: #ef5350;">
                        <i class="fas fa-exclamation-circle"></i> ${message}
                    </td>
                </tr>
            `;
        }
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#ef5350' : '#2196f3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i> ${message}`;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    referenceData.init();
});
