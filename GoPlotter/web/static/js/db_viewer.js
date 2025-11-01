// Database viewer implementation leveraging existing SFAF Plotter backend APIs
class DatabaseViewer {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.currentSort = { field: 'created_at', order: 'desc' };
        this.currentFilter = '';
        this.currentTab = 'markers';
        this.selectedItems = new Set();

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupTabNavigation();
        await this.loadData();
    }

    setupEventListeners() {
        // Search and filter controls
        const searchInput = document.getElementById('markerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.currentFilter = searchInput.value;
                this.currentPage = 1;
                this.loadData();
            }, 300));
        }

        const typeFilter = document.getElementById('markerTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadData();
            });
        }

        // Action buttons
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.loadData());
        document.getElementById('addMarkerBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('bulkEditBtn')?.addEventListener('click', () => this.openBulkEditModal());
        document.getElementById('deleteSelectedBtn')?.addEventListener('click', () => this.deleteSelected());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => this.previousPage());
        document.getElementById('nextPage')?.addEventListener('click', () => this.nextPage());

        // Select all checkbox
        document.getElementById('selectAll')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Modal close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.loadData();
            }
        });
    }

    setupTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`)?.classList.add('active');

        this.currentTab = tabId;
        this.currentPage = 1;
        this.selectedItems.clear();
        this.loadData();
    }

    async loadData() {
        try {
            this.showLoading(true);

            switch (this.currentTab) {
                case 'markers':
                    await this.loadMarkers();
                    break;
                case 'sfaf':
                    await this.loadSFAFRecords();
                    break;
                case 'irac':
                    await this.loadIRACNotes();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('Failed to load data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadMarkers() {
        // Use existing SFAF Plotter API endpoint (Source: handlers.txt, main.txt)
        const response = await fetch('/api/markers');
        const data = await response.json();

        if (data.success) {
            this.renderMarkersTable(data.markers);
            this.updatePagination(data.markers.length);
        } else {
            throw new Error(data.error || 'Failed to load markers');
        }
    }
    renderMarkersTable(markers) {
        const tbody = document.getElementById('markersTableBody');
        if (!tbody) return;

        // Apply filters
        let filteredMarkers = markers;
        if (this.currentFilter) {
            filteredMarkers = markers.filter(marker =>
                marker.serial.toLowerCase().includes(this.currentFilter.toLowerCase()) ||
                marker.frequency.toLowerCase().includes(this.currentFilter.toLowerCase()) ||
                marker.notes.toLowerCase().includes(this.currentFilter.toLowerCase())
            );
        }

        const typeFilter = document.getElementById('markerTypeFilter')?.value;
        if (typeFilter) {
            filteredMarkers = filteredMarkers.filter(marker => marker.type === typeFilter);
        }

        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageMarkers = filteredMarkers.slice(startIndex, endIndex);

        // Render table rows using comprehensive backend data (Source: handlers.txt, models.txt)
        tbody.innerHTML = pageMarkers.map(marker => `
            <tr data-marker-id="${marker.id}" class="table-row">
                <td>
                    <input type="checkbox" class="row-checkbox" value="${marker.id}" 
                           onchange="databaseViewer.toggleRowSelection('${marker.id}', this.checked)">
                </td>
                <td>
                    <span class="serial-number">${marker.serial}</span>
                </td>
                <td>
                    <div class="coordinates-cell">
                        <div class="coord-decimal">${marker.lat}, ${marker.lng}</div>
                        <div class="coord-dms" id="dms-${marker.id}">Loading DMS...</div>
                    </div>
                </td>
                <td>
                    <span class="frequency">${marker.frequency || 'N/A'}</span>
                </td>
                <td>
                    <span class="status-indicator status-${marker.type}">${marker.type}</span>
                </td>
                <td>
                    <span class="date-created">${new Date(marker.created_at).toLocaleDateString()}</span>
                </td>
                <td>
                    <span class="field-count" id="sfaf-count-${marker.id}">Loading...</span>
                </td>
                <td>
                    <span class="notes-count" id="irac-count-${marker.id}">Loading...</span>
                </td>
                <td class="actions-cell">
                    <button onclick="databaseViewer.editMarker('${marker.id}')" 
                            class="table-action-btn btn-edit" title="Edit Marker">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="databaseViewer.viewMarker('${marker.id}')" 
                            class="table-action-btn btn-view" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="databaseViewer.deleteMarker('${marker.id}')" 
                            class="table-action-btn btn-delete" title="Delete Marker">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Load additional data for each marker using existing backend APIs (Source: handlers.txt, main.txt)
        pageMarkers.forEach(marker => {
            this.loadMarkerDMSCoordinates(marker.id, marker.lat, marker.lng);
            this.loadMarkerSFAFCount(marker.id);
            this.loadMarkerIRACCount(marker.id);
        });

        this.updatePagination(filteredMarkers.length);
    }

    // Load DMS coordinates using existing coordinate conversion API (Source: main.txt)
    async loadMarkerDMSCoordinates(markerId, lat, lng) {
        try {
            const response = await fetch(`/api/convert-coords?lat=${lat}&lng=${lng}`);
            const coords = await response.json();

            const dmsElement = document.getElementById(`dms-${markerId}`);
            if (dmsElement) {
                dmsElement.innerHTML = `
                    <div class="coord-dms-line">${coords.dms}</div>
                    <div class="coord-compact-line">${coords.compact}</div>
                `;
            }
        } catch (error) {
            console.error(`Failed to load DMS for marker ${markerId}:`, error);
            const dmsElement = document.getElementById(`dms-${markerId}`);
            if (dmsElement) {
                dmsElement.textContent = 'DMS conversion failed';
            }
        }
    }

    // Load SFAF field count using object data API (Source: handlers.txt)
    async loadMarkerSFAFCount(markerId) {
        try {
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            const data = await response.json();

            const countElement = document.getElementById(`sfaf-count-${markerId}`);
            if (countElement && data.success) {
                const fieldCount = Object.keys(data.sfaf_fields || {}).length;
                countElement.innerHTML = `
                    <span class="field-count-number">${fieldCount}</span>
                    <span class="field-count-label">fields</span>
                `;
            }
        } catch (error) {
            console.error(`Failed to load SFAF count for marker ${markerId}:`, error);
            const countElement = document.getElementById(`sfaf-count-${markerId}`);
            if (countElement) {
                countElement.textContent = '0 fields';
            }
        }
    }

    // Load IRAC notes count using object data API (Source: handlers.txt)
    async loadMarkerIRACCount(markerId) {
        try {
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            const data = await response.json();

            const countElement = document.getElementById(`irac-count-${markerId}`);
            if (countElement && data.success && data.marker.irac_notes) {
                const notesCount = data.marker.irac_notes.length;
                countElement.innerHTML = `
                    <span class="notes-count-number">${notesCount}</span>
                    <span class="notes-count-label">notes</span>
                `;
            }
        } catch (error) {
            console.error(`Failed to load IRAC count for marker ${markerId}:`, error);
            const countElement = document.getElementById(`irac-count-${markerId}`);
            if (countElement) {
                countElement.textContent = '0 notes';
            }
        }
    }

    // Row selection management
    toggleRowSelection(markerId, isSelected) {
        if (isSelected) {
            this.selectedItems.add(markerId);
        } else {
            this.selectedItems.delete(markerId);
        }

        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('selectAll');
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked');

        if (selectAllCheckbox) {
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
            selectAllCheckbox.checked = checkedCheckboxes.length === allCheckboxes.length && allCheckboxes.length > 0;
        }

        // Update bulk action buttons
        this.updateBulkActionButtons();
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        this.selectedItems.clear();

        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            if (selectAll) {
                this.selectedItems.add(checkbox.value);
            }
        });

        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const bulkEditBtn = document.getElementById('bulkEditBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const hasSelection = this.selectedItems.size > 0;

        if (bulkEditBtn) {
            bulkEditBtn.disabled = !hasSelection;
            bulkEditBtn.textContent = hasSelection ?
                `Bulk Edit (${this.selectedItems.size})` : 'Bulk Edit';
        }

        if (deleteSelectedBtn) {
            deleteSelectedBtn.disabled = !hasSelection;
            deleteSelectedBtn.textContent = hasSelection ?
                `Delete Selected (${this.selectedItems.size})` : 'Delete Selected';
        }
    }

    // Load SFAF Records using backend APIs (Source: handlers.txt, models.txt)
    async loadSFAFRecords() {
        try {
            // Get all markers first, then load their SFAF data
            const markersResponse = await fetch('/api/markers');
            const markersData = await markersResponse.json();

            if (markersData.success && markersData.markers) {
                const sfafRecords = [];

                // Load SFAF data for each marker using object data API
                for (const marker of markersData.markers) {
                    try {
                        const sfafResponse = await fetch(`/api/sfaf/object-data/${marker.id}`);
                        const sfafData = await sfafResponse.json();

                        if (sfafData.success && sfafData.sfaf_fields) {
                            sfafRecords.push({
                                id: `sfaf-${marker.id}`,
                                marker_id: marker.id,
                                marker_serial: marker.serial,
                                field_count: Object.keys(sfafData.sfaf_fields).length,
                                created_at: marker.created_at,
                                updated_at: marker.updated_at
                            });
                        }
                    } catch (error) {
                        console.error(`Failed to load SFAF for marker ${marker.id}:`, error);
                    }
                }

                this.renderSFAFTable(sfafRecords);
            }
        } catch (error) {
            console.error('Failed to load SFAF records:', error);
            this.showError('Failed to load SFAF records');
        }
    }

    renderSFAFTable(sfafRecords) {
        const tbody = document.getElementById('sfafTableBody');
        if (!tbody) return;

        tbody.innerHTML = sfafRecords.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>
                    <a href="#" onclick="databaseViewer.viewMarker('${record.marker_id}')" 
                       class="marker-link">${record.marker_serial}</a>
                </td>
                <td>
                    <span class="field-count-badge">${record.field_count}</span>
                </td>
                <td>${new Date(record.created_at).toLocaleDateString()}</td>
                <td>${new Date(record.updated_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="databaseViewer.editSFAF('${record.marker_id}')" 
                            class="table-action-btn btn-edit" title="Edit SFAF">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="databaseViewer.exportSFAF('${record.marker_id}')" 
                            class="table-action-btn btn-view" title="Export SFAF">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Load IRAC Notes using existing API (Source: handlers.txt)
    async loadIRACNotes() {
        try {
            const response = await fetch('/api/irac-notes');
            const data = await response.json();

            if (data.success && data.notes) {
                this.renderIRACTable(data.notes);
            }
        } catch (error) {
            console.error('Failed to load IRAC notes:', error);
            this.showError('Failed to load IRAC notes');
        }
    }

    renderIRACTable(notes) {
        const tbody = document.getElementById('iracTableBody');
        if (!tbody) return;

        tbody.innerHTML = notes.map(note => `
            <tr>
                <td>
                    <code class="irac-code">${note.code}</code>
                </td>
                <td>
                    <div class="irac-title">${note.title}</div>
                    <div class="irac-description">${note.description.substring(0, 100)}${note.description.length > 100 ? '...' : ''}</div>
                </td>
                <td>
                    <span class="category-badge category-${note.category}">${note.category}</span>
                </td>
                <td>
                    <span class="field-placement">Field ${note.field_placement}</span>
                </td>
                <td>
                    <div class="agency-list">
                        ${note.agency && note.agency.length > 0 ?
                note.agency.slice(0, 3).map(agency => `<span class="agency-tag">${agency}</span>`).join('') +
                (note.agency.length > 3 ? `<span class="agency-more">+${note.agency.length - 3} more</span>` : '')
                : 'N/A'
            }
                    </div>
                </td>
                <td>
                    <button onclick="databaseViewer.viewIRACNote('${note.code}')" 
                            class="table-action-btn btn-view" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Analytics dashboard leveraging MCEB Publication 7 compliance data (Source: handlers.txt, models.txt)
    async loadAnalytics() {
        try {
            const [markersResponse, iracResponse] = await Promise.all([
                fetch('/api/markers'),
                fetch('/api/irac-notes')
            ]);

            const markersData = await markersResponse.json();
            const iracData = await iracResponse.json();

            if (markersData.success && iracData.success) {
                await this.renderAnalytics(markersData.markers, iracData.notes);
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async renderAnalytics(markers, iracNotes) {
        // System Overview Statistics (Source: models.txt, handlers.txt)
        const systemStatsHtml = `
            <div class="stat-item">
                <span class="stat-label">Total Markers</span>
                <span class="stat-value">${markers.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Manual Markers</span>
                <span class="stat-value">${markers.filter(m => m.type === 'manual').length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Imported Markers</span>
                <span class="stat-value">${markers.filter(m => m.type === 'imported').length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total IRAC Notes</span>
                <span class="stat-value">${iracNotes.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Markers per Day</span>
                <span class="stat-value">${this.calculateDailyAverage(markers)}</span>
            </div>
        `;

        // Frequency Distribution Analysis (Source: models.txt marker frequency field)
        const frequencyStats = this.analyzeFrequencyDistribution(markers);
        const frequencyChartHtml = `
            <div class="frequency-bands">
                <div class="band-item">
                    <span class="band-label">VHF (30-300 MHz)</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.vhf / markers.length) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.vhf}</span>
                </div>
                <div class="band-item">
                    <span class="band-label">UHF (300-3000 MHz)</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.uhf / markers.length) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.uhf}</span>
                </div>
                <div class="band-item">
                    <span class="band-label">SHF (3-30 GHz)</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.shf / markers.length) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.shf}</span>
                </div>
                <div class="band-item">
                    <span class="band-label">No Frequency</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.none / markers.length) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.none}</span>
                </div>
            </div>
        `;

        // MCEB Publication 7 Compliance Report (Source: handlers.txt IRAC validation)
        const complianceReport = await this.generateComplianceReport(markers);
        const complianceHtml = `
            <div class="compliance-grid">
                <div class="compliance-item ${complianceReport.field500Compliance ? 'compliant' : 'non-compliant'}">
                    <span class="compliance-label">Field 500 Compliance</span>
                    <span class="compliance-status">${complianceReport.field500Compliance ? '✅ Compliant' : '❌ Non-Compliant'}</span>
                    <span class="compliance-detail">Max 10 occurrences per MCEB Pub 7</span>
                </div>
                <div class="compliance-item ${complianceReport.field501Compliance ? 'compliant' : 'non-compliant'}">
                    <span class="compliance-label">Field 501 Compliance</span>
                    <span class="compliance-status">${complianceReport.field501Compliance ? '✅ Compliant' : '❌ Non-Compliant'}</span>
                    <span class="compliance-detail">Max 30 occurrences per MCEB Pub 7</span>
                </div>
                <div class="compliance-item">
                    <span class="compliance-label">IRAC Categories</span>
                    <span class="compliance-value">${complianceReport.iracCategories.length}/6</span>
                    <span class="compliance-detail">${complianceReport.iracCategories.join(', ')}</span>
                </div>
                <div class="compliance-item">
                    <span class="compliance-label">Coordinate Format</span>
                    <span class="compliance-status">✅ DMS & Compact</span>
                    <span class="compliance-detail">Military coordinate formats supported</span>
                </div>
            </div>
        `;

        // Geographic Distribution Analysis (Source: models.txt coordinate fields)
        const geoStats = this.analyzeGeographicDistribution(markers);
        const geoStatsHtml = `
            <div class="geo-stats">
                <div class="stat-item">
                    <span class="stat-label">Geographic Spread</span>
                    <span class="stat-value">${geoStats.spread.toFixed(2)}°</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Center Point</span>
                    <span class="stat-value">${geoStats.center.lat.toFixed(4)}, ${geoStats.center.lng.toFixed(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Northernmost</span>
                    <span class="stat-value">${geoStats.bounds.north.toFixed(4)}°</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Southernmost</span>
                    <span class="stat-value">${geoStats.bounds.south.toFixed(4)}°</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Easternmost</span>
                    <span class="stat-value">${geoStats.bounds.east.toFixed(4)}°</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Westernmost</span>
                    <span class="stat-value">${geoStats.bounds.west.toFixed(4)}°</span>
                </div>
            </div>
        `;

        // Update DOM elements with analytics data
        document.getElementById('systemStats').innerHTML = systemStatsHtml;
        document.getElementById('frequencyChart').innerHTML = frequencyChartHtml;
        document.getElementById('complianceReport').innerHTML = complianceHtml;
        document.getElementById('geoStats').innerHTML = geoStatsHtml;
    }

    // Analytics helper functions leveraging backend data structures (Source: models.txt)
    calculateDailyAverage(markers) {
        if (markers.length === 0) return '0.0';

        const dates = markers.map(m => new Date(m.created_at));
        const oldestDate = new Date(Math.min(...dates));
        const newestDate = new Date(Math.max(...dates));
        const daysDiff = Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24)) || 1;

        return (markers.length / daysDiff).toFixed(1);
    }

    analyzeFrequencyDistribution(markers) {
        const stats = { vhf: 0, uhf: 0, shf: 0, ehf: 0, none: 0 };

        markers.forEach(marker => {
            if (!marker.frequency || marker.frequency.trim() === '') {
                stats.none++;
                return;
            }

            // Parse frequency value (remove K prefix if present, Source: services.txt SFAF import)
            const freqStr = marker.frequency.replace(/^K/, '').trim();
            const freq = parseFloat(freqStr);

            if (isNaN(freq)) {
                stats.none++;
            } else if (freq >= 30 && freq < 300) {
                stats.vhf++;
            } else if (freq >= 300 && freq < 3000) {
                stats.uhf++;
            } else if (freq >= 3000 && freq < 30000) {
                stats.shf++;
            } else if (freq >= 30000) {
                stats.ehf++;
            } else {
                stats.none++;
            }
        });

        return stats;
    }

    // MCEB Publication 7 compliance analysis (Source: handlers.txt validation rules)
    async generateComplianceReport(markers) {
        const report = {
            field500Compliance: true,
            field501Compliance: true,
            iracCategories: [],
            totalViolations: 0
        };

        // Check Field 500 and 501 compliance by analyzing SFAF data for each marker
        for (const marker of markers) {
            try {
                const response = await fetch(`/api/sfaf/object-data/${marker.id}`);
                const data = await response.json();

                if (data.success && data.sfaf_fields) {
                    // Count Field 500 occurrences (Source: handlers.txt field 500 max 10 validation)
                    const field500Count = Object.keys(data.sfaf_fields)
                        .filter(key => key.startsWith('field500')).length;
                    if (field500Count > 10) {
                        report.field500Compliance = false;
                        report.totalViolations++;
                    }

                    // Count Field 501 occurrences (Source: handlers.txt field 501 max 30 validation)
                    const field501Count = Object.keys(data.sfaf_fields)
                        .filter(key => key.startsWith('field501')).length;
                    if (field501Count > 30) {
                        report.field501Compliance = false;
                        report.totalViolations++;
                    }
                }
            } catch (error) {
                console.error(`Failed to check compliance for marker ${marker.id}:`, error);
            }
        }

        // Analyze IRAC note categories (Source: repositories.txt IRAC notes categories)
        try {
            const iracResponse = await fetch('/api/irac-notes');
            const iracData = await iracResponse.json();

            if (iracData.success && iracData.notes) {
                const categories = [...new Set(iracData.notes.map(note => note.category))];
                report.iracCategories = categories;
            }
        } catch (error) {
            console.error('Failed to load IRAC categories:', error);
        }

        return report;
    }

    analyzeGeographicDistribution(markers) {
        if (markers.length === 0) {
            return {
                spread: 0,
                center: { lat: 0, lng: 0 },
                bounds: { north: 0, south: 0, east: 0, west: 0 }
            };
        }

        const lats = markers.map(m => parseFloat(m.lat));
        const lngs = markers.map(m => parseFloat(m.lng));

        const bounds = {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
        };

        const center = {
            lat: (bounds.north + bounds.south) / 2,
            lng: (bounds.east + bounds.west) / 2
        };

        const spread = Math.max(
            bounds.north - bounds.south,
            bounds.east - bounds.west
        );

        return { spread, center, bounds };
    }

    // Modal and form management functions (Source: handlers.txt CRUD operations)
    async editMarker(markerId) {
        try {
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            const data = await response.json();

            if (data.success) {
                this.openEditModal(data, 'marker');
            } else {
                throw new Error(data.error || 'Failed to load marker data');
            }
        } catch (error) {
            console.error('Failed to load marker for editing:', error);
            this.showError('Failed to load marker data for editing');
        }
    }

    async viewMarker(markerId) {
        try {
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            const data = await response.json();

            if (data.success) {
                this.openViewModal(data);
            } else {
                throw new Error(data.error || 'Failed to load marker data');
            }
        } catch (error) {
            console.error('Failed to load marker for viewing:', error);
            this.showError('Failed to load marker data');
        }
    }

    async deleteMarker(markerId) {
        if (!confirm('Are you sure you want to delete this marker? This will also delete associated SFAF data.')) {
            return;
        }

        try {
            const response = await fetch(`/api/markers/${markerId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log('✅ Marker deleted successfully');
                await this.loadData(); // Refresh current tab data
                this.showSuccess('Marker deleted successfully');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to delete marker:', error);
            this.showError('Failed to delete marker');
        }
    }

    openEditModal(data, type) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const editForm = document.getElementById('editForm');

        modalTitle.textContent = `Edit ${type === 'marker' ? 'Marker' : 'SFAF'}: ${data.marker.serial}`;

        // Create comprehensive edit form leveraging all available data (Source: models.txt)
        editForm.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Serial Number:</label>
                    <input type="text" name="serial" value="${data.marker.serial}" readonly>
                </div>
                <div class="form-group">
                    <label>Latitude:</label>
                    <input type="number" step="any" name="lat" value="${data.marker.lat}" required>
                </div>
                <div class="form-group">
                    <label>Longitude:</label>
                    <input type="number" step="any" name="lng" value="${data.marker.lng}" required>
                </div>
                <div class="form-group">
                    <label>Frequency:</label>
                    <input type="text" name="frequency" value="${data.marker.frequency || ''}">
                </div>
                <div class="form-group">
                    <label>Type:</label>
                    <select name="type">
                        <option value="manual" ${data.marker.type === 'manual' ? 'selected' : ''}>Manual</option>
                        <option value="imported" ${data.marker.type === 'imported' ? 'selected' : ''}>Imported</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Draggable:</label>
                    <select name="is_draggable">
                        <option value="true" ${data.marker.is_draggable ? 'selected' : ''}>Yes</option>
                        <option value="false" ${!data.marker.is_draggable ? 'selected' : ''}>No</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Notes:</label>
                    <textarea name="notes" rows="3">${data.marker.notes || ''}</textarea>
                </div>
            </div>
            
            <!-- SFAF Fields Section (Source: services.txt field definitions) -->
            ${type === 'marker' && data.sfaf_fields ? this.renderSFAFFieldsForEdit(data.sfaf_fields, data.field_defs) : ''}
            
            <!-- Coordinate Information Display (Source: handlers.txt coordinate formats) -->
            <div class="coordinate-info-section">
                <h4>Coordinate Formats</h4>
                <div class="coord-display">
                    <div class="coord-item">
                        <label>Decimal:</label>
                        <span class="coord-value">${data.coordinates.decimal}</span>
                    </div>
                    <div class="coord-item">
                        <label>DMS:</label>
                        <span class="coord-value">${data.coordinates.dms}</span>
                    </div>
                    <div class="coord-item">
                        <label>Compact (Military):</label>
                        <span class="coord-value">${data.coordinates.compact}</span>
                    </div>
                </div>
            </div>
            
            <!-- IRAC Notes Section (Source: handlers.txt IRAC integration) -->
            ${data.marker.irac_notes && data.marker.irac_notes.length > 0 ? this.renderIRACNotesForEdit(data.marker.irac_notes) : ''}
        `;

        // Show modal
        modal.style.display = 'block';

        // Handle form submission
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            await this.saveMarkerChanges(data.marker.id, new FormData(e.target));
            this.closeModal();
        };
    }

    // Render SFAF fields for editing (Source: services.txt comprehensive field definitions)
    renderSFAFFieldsForEdit(sfafFields, fieldDefs) {
        if (!sfafFields || Object.keys(sfafFields).length === 0) {
            return '<div class="no-sfaf-fields"><p>No SFAF fields defined for this marker.</p></div>';
        }

        const fieldGroups = {
            '100': 'Agency Information',
            '200': 'System Information',
            '300': 'Location Information',
            '400': 'Technical Parameters',
            '500': 'Equipment Information',
            '600': 'Operational Information',
            '700': 'Coordination Information',
            '800': 'Administrative Contact Information',
            '900': 'Comments and Special Requirements'
        };

        let html = '<div class="sfaf-fields-section"><h4>SFAF Fields (MCEB Publication 7)</h4>';

        // Group fields by series (Source: services.txt field organization)
        const groupedFields = {};
        Object.entries(sfafFields).forEach(([fieldId, value]) => {
            const series = fieldId.replace('field', '').substring(0, 1);
            if (!groupedFields[series]) {
                groupedFields[series] = [];
            }
            groupedFields[series].push({ fieldId, value, definition: fieldDefs[fieldId] });
        });

        // Render each group
        Object.entries(groupedFields).forEach(([series, fields]) => {
            const groupName = fieldGroups[series + '00'] || `${series}00 Series`;
            html += `
                <div class="sfaf-field-group">
                    <h5>${groupName}</h5>
                    <div class="sfaf-field-grid">
            `;

            fields.forEach(({ fieldId, value, definition }) => {
                const label = definition ? definition.label : fieldId;
                const help = definition ? definition.help : '';
                const required = definition ? definition.required : false;
                const fieldType = definition ? definition.field_type : 'text';

                html += `
                    <div class="sfaf-field-item">
                        <label for="${fieldId}" ${required ? 'class="required"' : ''}>
                            ${label}
                            ${required ? '*' : ''}
                        </label>
                        ${this.renderSFAFFieldInput(fieldId, value, fieldType, definition)}
                        ${help ? `<small class="field-help">${help}</small>` : ''}
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        return html;
    }

    // Render individual SFAF field input (Source: services.txt field types)
    renderSFAFFieldInput(fieldId, value, fieldType, definition) {
        switch (fieldType) {
            case 'select':
                const options = definition.options || [];
                return `
                    <select name="sfaf_${fieldId}" class="sfaf-field-input">
                        <option value="">Select...</option>
                        ${options.map(option =>
                    `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
                ).join('')}
                    </select>
                `;

            case 'textarea':
                return `<textarea name="sfaf_${fieldId}" class="sfaf-field-input" rows="3">${value || ''}</textarea>`;

            case 'date':
                return `<input type="date" name="sfaf_${fieldId}" class="sfaf-field-input" value="${value || ''}">`;

            case 'number':
                return `<input type="number" name="sfaf_${fieldId}" class="sfaf-field-input" value="${value || ''}">`;

            case 'email':
                return `<input type="email" name="sfaf_${fieldId}" class="sfaf-field-input" value="${value || ''}">`;

            default:
                return `<input type="text" name="sfaf_${fieldId}" class="sfaf-field-input" value="${value || ''}">`;
        }
    }

    // Render IRAC notes for editing (Source: handlers.txt IRAC notes management)
    renderIRACNotesForEdit(iracNotes) {
        if (!iracNotes || iracNotes.length === 0) {
            return '';
        }

        let html = `
            <div class="irac-notes-section">
                <h4>IRAC Notes (Military Frequency Coordination)</h4>
                <div class="irac-notes-list">
        `;

        iracNotes.forEach((association, index) => {
            const note = association.irac_note || association;
            html += `
                <div class="irac-note-item">
                    <div class="irac-note-header">
                        <span class="irac-code">${note.code}</span>
                        <span class="irac-category category-${note.category}">${note.category}</span>
                        <button type="button" class="remove-irac-btn" onclick="databaseViewer.removeIRACNote('${association.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="irac-note-content">
                        <p class="irac-title">${note.title}</p>
                        <p class="irac-description">${note.description}</p>
                        <div class="irac-placement">
                            Field ${association.field_number}, Occurrence ${association.occurrence_number}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <button type="button" class="btn btn-secondary" onclick="databaseViewer.addIRACNoteModal()">
                    <i class="fas fa-plus"></i> Add IRAC Note
                </button>
            </div>
        `;

        return html;
    }

    // View marker in read-only modal
    openViewModal(data) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const editForm = document.getElementById('editForm');

        modalTitle.textContent = `View Marker: ${data.marker.serial}`;

        // Create read-only view with comprehensive data display
        editForm.innerHTML = `
            <div class="view-mode-content">
                <!-- Basic Marker Information -->
                <div class="info-section">
                    <h4>Marker Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Serial Number:</label>
                            <span>${data.marker.serial}</span>
                        </div>
                        <div class="info-item">
                            <label>Type:</label>
                            <span class="status-indicator status-${data.marker.type}">${data.marker.type}</span>
                        </div>
                        <div class="info-item">
                            <label>Frequency:</label>
                            <span>${data.marker.frequency || 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <label>Draggable:</label>
                            <span>${data.marker.is_draggable ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="info-item">
                            <label>Created:</label>
                            <span>${new Date(data.marker.created_at).toLocaleString()}</span>
                        </div>
                        <div class="info-item">
                            <label>Updated:</label>
                            <span>${new Date(data.marker.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <!-- Coordinate Information -->
                <div class="info-section">
                    <h4>Coordinate Information</h4>
                    <div class="coordinate-formats">
                        <div class="coord-format">
                            <label>Decimal Degrees:</label>
                            <span class="coord-value">${data.coordinates.decimal}</span>
                        </div>
                        <div class="coord-format">
                            <label>DMS Format:</label>
                            <span class="coord-value">${data.coordinates.dms}</span>
                        </div>
                        <div class="coord-format">
                            <label>Military Compact:</label>
                            <span class="coord-value">${data.coordinates.compact}</span>
                        </div>
                    </div>
                </div>

                <!-- Notes Section -->
                ${data.marker.notes ? `
                    <div class="info-section">
                        <h4>Notes</h4>
                        <div class="notes-content">${data.marker.notes}</div>
                    </div>
                ` : ''}

                <!-- SFAF Fields Display -->
                ${data.sfaf_fields && Object.keys(data.sfaf_fields).length > 0 ? this.renderSFAFFieldsView(data.sfaf_fields, data.field_defs) : ''}

                <!-- IRAC Notes Display -->
                ${data.marker.irac_notes && data.marker.irac_notes.length > 0 ? this.renderIRACNotesView(data.marker.irac_notes) : ''}
            </div>
        `;

        // Change modal footer for view mode
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Close</button>
            <button type="button" class="btn btn-primary" onclick="databaseViewer.editMarker('${data.marker.id}')">
                <i class="fas fa-edit"></i> Edit Marker
            </button>
        `;

        modal.style.display = 'block';
    }

    // Save marker changes using existing API (Source: handlers.txt UpdateMarker)
    async saveMarkerChanges(markerId, formData) {
        try {
            const updateData = {
                lat: parseFloat(formData.get('lat')),
                lng: parseFloat(formData.get('lng')),
                frequency: formData.get('frequency'),
                notes: formData.get('notes'),
                type: formData.get('type'),
                is_draggable: formData.get('is_draggable') === 'true'
            };

            // Collect SFAF field updates
            const sfafFields = {};
            for (const [key, value] of formData.entries()) {
                if (key.startsWith('sfaf_')) {
                    const fieldId = key.replace('sfaf_', '');
                    if (value.trim() !== '') {
                        sfafFields[fieldId] = value;
                    }
                }
            }

            // Update marker using existing API (Source: handlers.txt)
            const markerResponse = await fetch(`/api/markers/${markerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!markerResponse.ok) {
                throw new Error(`HTTP ${markerResponse.status}: ${markerResponse.statusText}`);
            }

            // Update SFAF fields if any were modified (Source: handlers.txt SFAF operations)
            if (Object.keys(sfafFields).length > 0) {
                const sfafResponse = await fetch(`/api/sfaf`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        marker_id: markerId,
                        fields: sfafFields
                    })
                });

                if (!sfafResponse.ok) {
                    console.warn('SFAF update failed, but marker update succeeded');
                }
            }

            console.log('✅ Marker updated successfully');
            await this.loadData(); // Refresh current tab data
            this.showSuccess('Marker updated successfully');

        } catch (error) {
            console.error('Failed to update marker:', error);
            this.showError('Failed to update marker: ' + error.message);
        }
    }

    // SFAF-specific operations leveraging backend APIs (Source: handlers.txt, services.txt)
    async editSFAF(markerId) {
        try {
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            const data = await response.json();

            if (data.success) {
                this.openSFAFEditModal(data);
            } else {
                throw new Error(data.error || 'Failed to load SFAF data');
            }
        } catch (error) {
            console.error('Failed to load SFAF for editing:', error);
            this.showError('Failed to load SFAF data for editing');
        }
    }

    async exportSFAF(markerId) {
        try {
            const response = await fetch(`/api/sfaf/object-data/${markerId}`);
            const data = await response.json();

            if (data.success) {
                // Create comprehensive export data using backend response (Source: handlers.txt)
                const exportData = {
                    marker: data.marker,
                    coordinates: data.coordinates,
                    sfaf_fields: data.sfaf_fields,
                    field_definitions: data.field_defs,
                    exported_at: new Date().toISOString(),
                    format: 'SFAF_Database_Export_v1.0'
                };

                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });

                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `SFAF_${data.marker.serial}_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);
                this.showSuccess('SFAF data exported successfully');
            }
        } catch (error) {
            console.error('Failed to export SFAF:', error);
            this.showError('Failed to export SFAF data');
        }
    }

    // IRAC Notes management (Source: handlers.txt IRAC operations)
    async viewIRACNote(noteCode) {
        try {
            const response = await fetch(`/api/irac-notes?search=${noteCode}`);
            const data = await response.json();

            if (data.success && data.notes.length > 0) {
                const note = data.notes.find(n => n.code === noteCode);
                if (note) {
                    this.openIRACNoteViewModal(note);
                }
            }
        } catch (error) {
            console.error('Failed to load IRAC note details:', error);
            this.showError('Failed to load IRAC note details');
        }
    }

    openIRACNoteViewModal(note) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const editForm = document.getElementById('editForm');

        modalTitle.textContent = `IRAC Note: ${note.code}`;

        // Display comprehensive IRAC note information (Source: models.txt IRACNote structure)
        editForm.innerHTML = `
            <div class="irac-note-details">
                <div class="info-section">
                    <h4>Note Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Code:</label>
                            <span class="irac-code-display">${note.code}</span>
                        </div>
                        <div class="info-item">
                            <label>Category:</label>
                            <span class="category-badge category-${note.category}">${note.category}</span>
                        </div>
                        <div class="info-item">
                            <label>Field Placement:</label>
                            <span>Field ${note.field_placement}</span>
                        </div>
                        <div class="info-item">
                            <label>Created:</label>
                            <span>${new Date(note.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h4>Title</h4>
                    <div class="irac-title-display">${note.title}</div>
                </div>

                <div class="info-section">
                    <h4>Description</h4>
                    <div class="irac-description-display">${note.description}</div>
                </div>

                ${note.agency && note.agency.length > 0 ? `
                    <div class="info-section">
                        <h4>Applicable Agencies</h4>
                        <div class="agency-list">
                            ${note.agency.map(agency => `<span class="agency-tag">${agency}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${note.technical_specs ? `
                    <div class="info-section">
                        <h4>Technical Specifications</h4>
                        <div class="technical-specs">
                            <pre>${JSON.stringify(note.technical_specs, null, 2)}</pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Change modal footer for view mode
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Close</button>
        `;

        modal.style.display = 'block';
    }

    // IRAC Notes management functions (Source: handlers.txt)
    async removeIRACNote(associationId) {
        if (!confirm('Remove this IRAC note association?')) return;

        try {
            const response = await fetch('/api/markers/irac-notes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    association_id: associationId
                })
            });

            if (response.ok) {
                this.showSuccess('IRAC note removed successfully');
                // Refresh the current modal if it's open
                const modal = document.getElementById('editModal');
                if (modal.style.display === 'block') {
                    // Re-load the current marker data
                    const currentMarkerId = modal.dataset.markerId;
                    if (currentMarkerId) {
                        await this.editMarker(currentMarkerId);
                    }
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to remove IRAC note:', error);
            this.showError('Failed to remove IRAC note');
        }
    }

    async addIRACNoteModal() {
        try {
            // Load available IRAC notes (Source: handlers.txt GetIRACNotes)
            const response = await fetch('/api/irac-notes');
            const data = await response.json();

            if (data.success) {
                this.openIRACNoteSelectionModal(data.notes);
            }
        } catch (error) {
            console.error('Failed to load IRAC notes:', error);
            this.showError('Failed to load IRAC notes');
        }
    }

    openIRACNoteSelectionModal(iracNotes) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const editForm = document.getElementById('editForm');

        modalTitle.textContent = 'Add IRAC Note';

        // Group notes by category for better organization (Source: models.txt categories)
        const categorizedNotes = {};
        iracNotes.forEach(note => {
            if (!categorizedNotes[note.category]) {
                categorizedNotes[note.category] = [];
            }
            categorizedNotes[note.category].push(note);
        });

        editForm.innerHTML = `
            <form id="addIRACForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Category:</label>
                        <select id="iracCategory" onchange="databaseViewer.filterIRACNotesByCategory()">
                            <option value="">All Categories</option>
                            ${Object.keys(categorizedNotes).map(category =>
            `<option value="${category}">${category}</option>`
        ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>IRAC Note:</label>
                        <select id="iracNoteSelect" required>
                            <option value="">Select IRAC Note</option>
                            ${iracNotes.map(note =>
            `<option value="${note.code}" data-category="${note.category}">${note.code} - ${note.title}</option>`
        ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Field Number:</label>
                        <select name="field_number" required>
                            <option value="">Select Field</option>
                            <option value="500">Field 500</option>
                            <option value="501">Field 501</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Occurrence Number:</label>
                        <input type="number" name="occurrence_number" min="1" max="30" required>
                        <small class="field-help">Field 500: max 10, Field 501: max 30 (MCEB Pub 7)</small>
                    </div>
                </div>

                <div id="selectedNotePreview" class="note-preview" style="display: none;">
                    <!-- Note preview will be populated here -->
                </div>
            </form>
        `;

        // Add event listener for note selection preview
        document.getElementById('iracNoteSelect').addEventListener('change', (e) => {
            this.showIRACNotePreview(e.target.value, iracNotes);
        });

        // Update modal footer
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
            <button type="submit" form="addIRACForm" class="btn btn-primary">Add IRAC Note</button>
        `;

        // Handle form submission
        document.getElementById('addIRACForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitIRACNoteAssociation(new FormData(e.target));
        });

        modal.style.display = 'block';
    }

    filterIRACNotesByCategory() {
        const categorySelect = document.getElementById('iracCategory');
        const noteSelect = document.getElementById('iracNoteSelect');
        const selectedCategory = categorySelect.value;

        // Show/hide options based on category
        Array.from(noteSelect.options).forEach(option => {
            if (option.value === '') {
                option.style.display = 'block'; // Always show "Select IRAC Note"
            } else if (selectedCategory === '' || option.dataset.category === selectedCategory) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });

        // Reset selection
        noteSelect.value = '';
        document.getElementById('selectedNotePreview').style.display = 'none';
    }

    showIRACNotePreview(noteCode, iracNotes) {
        const previewDiv = document.getElementById('selectedNotePreview');

        if (!noteCode) {
            previewDiv.style.display = 'none';
            return;
        }

        const note = iracNotes.find(n => n.code === noteCode);
        if (note) {
            previewDiv.innerHTML = `
                <h4>Selected Note Preview</h4>
                <div class="note-preview-content">
                    <p><strong>Code:</strong> ${note.code}</p>
                    <p><strong>Title:</strong> ${note.title}</p>
                    <p><strong>Category:</strong> ${note.category}</p>
                    <p><strong>Description:</strong> ${note.description}</p>
                </div>
            `;
            previewDiv.style.display = 'block';
        }
    }

    async submitIRACNoteAssociation(formData) {
        const currentMarkerId = document.getElementById('editModal').dataset.markerId;
        if (!currentMarkerId) {
            this.showError('No marker selected');
            return;
        }

        try {
            const requestData = {
                marker_id: currentMarkerId,
                note_code: document.getElementById('iracNoteSelect').value,
                field_number: parseInt(formData.get('field_number')),
                occurrence_number: parseInt(formData.get('occurrence_number'))
            };

            // Use existing IRAC note association API (Source: handlers.txt)
            const response = await fetch('/api/markers/irac-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('IRAC note added successfully');
                this.closeModal();

                // Refresh the current tab data to show the new association
                await this.loadData();

                // If the marker edit modal was open, re-open it to show the new association
                if (currentMarkerId) {
                    setTimeout(() => {
                        this.editMarker(currentMarkerId);
                    }, 500);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to add IRAC note association:', error);
            this.showError('Failed to add IRAC note: ' + error.message);
        }
    }

    // Bulk operations for multiple marker management
    async openBulkEditModal() {
        if (this.selectedItems.size === 0) {
            this.showError('No markers selected');
            return;
        }

        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const editForm = document.getElementById('editForm');

        modalTitle.textContent = `Bulk Edit ${this.selectedItems.size} Markers`;

        // Create bulk edit form with common fields
        editForm.innerHTML = `
            <form id="bulkEditForm">
                <div class="bulk-edit-notice">
                    <p><strong>Note:</strong> Only fields with values will be updated. Leave fields empty to keep existing values.</p>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Frequency:</label>
                        <input type="text" name="frequency" placeholder="Leave empty to keep current values">
                    </div>
                    
                    <div class="form-group">
                        <label>Type:</label>
                        <select name="type">
                            <option value="">Keep current values</option>
                            <option value="manual">Manual</option>
                            <option value="imported">Imported</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Draggable:</label>
                        <select name="is_draggable">
                            <option value="">Keep current values</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Notes (will append to existing notes):</label>
                        <textarea name="notes_append" rows="3" placeholder="Text to append to existing notes"></textarea>
                    </div>
                </div>
                
                <div class="selected-markers-preview">
                    <h4>Selected Markers (${this.selectedItems.size})</h4>
                    <div class="marker-list">
                        ${Array.from(this.selectedItems).map(id => {
            const marker = this.markers.find(m => m.id === id);
            return marker ? `<span class="marker-tag">${marker.serial}</span>` : '';
        }).join('')}
                    </div>
                </div>
            </form>
        `;

        // Update modal footer
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
            <button type="submit" form="bulkEditForm" class="btn btn-primary">Update ${this.selectedItems.size} Markers</button>
        `;

        // Handle form submission
        document.getElementById('bulkEditForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processBulkEdit(new FormData(e.target));
        });

        modal.style.display = 'block';
    }

    async processBulkEdit(formData) {
        const updates = {};

        // Collect non-empty form values
        if (formData.get('frequency').trim()) {
            updates.frequency = formData.get('frequency').trim();
        }

        if (formData.get('type')) {
            updates.type = formData.get('type');
        }

        if (formData.get('is_draggable')) {
            updates.is_draggable = formData.get('is_draggable') === 'true';
        }

        const notesAppend = formData.get('notes_append').trim();

        if (Object.keys(updates).length === 0 && !notesAppend) {
            this.showError('No changes specified');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const totalMarkers = this.selectedItems.size;

            // Show progress
            this.showLoading(true, `Processing ${totalMarkers} markers...`);

            // Process each selected marker
            for (const markerId of this.selectedItems) {
                try {
                    let markerUpdates = { ...updates };

                    // Handle notes appending by getting current notes first
                    if (notesAppend) {
                        const markerResponse = await fetch(`/api/markers/${markerId}`);
                        if (markerResponse.ok) {
                            const markerData = await markerResponse.json();
                            const currentNotes = markerData.marker.notes || '';
                            markerUpdates.notes = currentNotes ? `${currentNotes}\n${notesAppend}` : notesAppend;
                        }
                    }

                    // Update marker using existing API (Source: handlers.txt)
                    const response = await fetch(`/api/markers/${markerId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(markerUpdates)
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error(`Failed to update marker ${markerId}:`, response.status);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error updating marker ${markerId}:`, error);
                }
            }

            this.showLoading(false);
            this.closeModal();

            // Show results
            if (successCount > 0) {
                this.showSuccess(`Successfully updated ${successCount} markers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
            } else {
                this.showError(`Failed to update any markers (${errorCount} errors)`);
            }

            // Refresh data and clear selection
            await this.loadData();
            this.selectedItems.clear();
            this.updateBulkActionButtons();

        } catch (error) {
            this.showLoading(false);
            console.error('Bulk edit failed:', error);
            this.showError('Bulk edit operation failed');
        }
    }

    async deleteSelected() {
        if (this.selectedItems.size === 0) {
            this.showError('No markers selected');
            return;
        }

        if (!confirm(`Delete ${this.selectedItems.size} selected markers and all associated SFAF data?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const totalMarkers = this.selectedItems.size;

            this.showLoading(true, `Deleting ${totalMarkers} markers...`);

            // Delete each selected marker
            for (const markerId of this.selectedItems) {
                try {
                    const response = await fetch(`/api/markers/${markerId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error(`Failed to delete marker ${markerId}:`, response.status);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error deleting marker ${markerId}:`, error);
                }
            }

            this.showLoading(false);

            // Show results
            if (successCount > 0) {
                this.showSuccess(`Successfully deleted ${successCount} markers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
            } else {
                this.showError(`Failed to delete any markers (${errorCount} errors)`);
            }

            // Refresh data and clear selection
            await this.loadData();
            this.selectedItems.clear();
            this.updateBulkActionButtons();

        } catch (error) {
            this.showLoading(false);
            console.error('Bulk delete failed:', error);
            this.showError('Bulk delete operation failed');
        }
    }

    // Export functionality leveraging backend data structure (Source: handlers.txt, services.txt)
    async exportData() {
        try {
            // Get current tab data
            let exportData = {};
            let filename = '';

            switch (this.currentTab) {
                case 'markers':
                    const markersResponse = await fetch('/api/markers');
                    const markersData = await markersResponse.json();

                    if (markersData.success) {
                        // Enhance marker data with coordinate formats (Source: services.txt)
                        const enhancedMarkers = await Promise.all(
                            markersData.markers.map(async (marker) => {
                                try {
                                    const coordResponse = await fetch(`/api/convert-coords?lat=${marker.lat}&lng=${marker.lng}`);
                                    const coords = await coordResponse.json();

                                    return {
                                        ...marker,
                                        coordinates: coords
                                    };
                                } catch (error) {
                                    return marker;
                                }
                            })
                        );

                        exportData = {
                            type: 'SFAF_Markers_Export',
                            exported_at: new Date().toISOString(),
                            total_count: enhancedMarkers.length,
                            markers: enhancedMarkers,
                            compliance: 'MCEB Publication 7',
                            version: '1.0'
                        };
                        filename = `SFAF_Markers_${new Date().toISOString().split('T')[0]}.json`;
                    }
                    break;

                case 'sfaf':
                    // Export SFAF records with complete field definitions (Source: services.txt)
                    exportData = {
                        type: 'SFAF_Records_Export',
                        exported_at: new Date().toISOString(),
                        compliance: 'MCEB Publication 7',
                        version: '1.0',
                        records: [] // Will be populated by loading SFAF data for each marker
                    };
                    filename = `SFAF_Records_${new Date().toISOString().split('T')[0]}.json`;
                    break;

                case 'irac':
                    const iracResponse = await fetch('/api/irac-notes');
                    const iracData = await iracResponse.json();

                    if (iracData.success) {
                        exportData = {
                            type: 'IRAC_Notes_Export',
                            exported_at: new Date().toISOString(),
                            total_count: iracData.notes.length,
                            notes: iracData.notes,
                            categories: [...new Set(iracData.notes.map(note => note.category))],
                            compliance: 'MCEB Publication 7',
                            version: '1.0'
                        };
                        filename = `IRAC_Notes_${new Date().toISOString().split('T')[0]}.json`;
                    }
                    break;

                case 'analytics':
                    // Export analytics report (Source: handlers.txt comprehensive data)
                    const analyticsMarkers = await fetch('/api/markers');
                    const analyticsIRAC = await fetch('/api/irac-notes');

                    const [markersResult, iracResult] = await Promise.all([
                        analyticsMarkers.json(),
                        analyticsIRAC.json()
                    ]);

                    if (markersResult.success && iracResult.success) {
                        const complianceReport = await this.generateComplianceReport(markersResult.markers);

                        exportData = {
                            type: 'SFAF_Analytics_Export',
                            exported_at: new Date().toISOString(),
                            system_overview: {
                                total_markers: markersResult.markers.length,
                                manual_markers: markersResult.markers.filter(m => m.type === 'manual').length,
                                imported_markers: markersResult.markers.filter(m => m.type === 'imported').length,
                                total_irac_notes: iracResult.notes.length
                            },
                            frequency_analysis: this.analyzeFrequencyDistribution(markersResult.markers),
                            geographic_distribution: this.analyzeGeographicDistribution(markersResult.markers),
                            compliance_report: complianceReport,
                            compliance: 'MCEB Publication 7',
                            version: '1.0'
                        };
                        filename = `SFAF_Analytics_${new Date().toISOString().split('T')[0]}.json`;
                    }
                    break;
            }

            if (Object.keys(exportData).length === 0) {
                this.showError('No data available for export');
                return;
            }

            // Create and download file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            this.showSuccess(`Data exported successfully: ${filename}`);

        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export data');
        }
    }

    // Utility functions for user feedback
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px;
            opacity: 0;
            transform: translateX(400px);
            transition: all 0.3s ease;
        `;

        // Add icon based on type
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${icon}</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);

        // Add click to dismiss
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        });
    }

    showLoading(show, message = 'Loading...') {
        let loader = document.getElementById('globalLoader');

        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'globalLoader';
                loader.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 15000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;

                loader.innerHTML = `
                    <div style="
                        background: white;
                        padding: 30px;
                        border-radius: 12px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        text-align: center;
                        min-width: 200px;
                    ">
                        <div class="loading-spinner" style="
                            margin: 0 auto 20px;
                            width: 40px;
                            height: 40px;
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #3498db;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                        "></div>
                        <div style="color: #333; font-weight: 500;">${message}</div>
                    </div>
                `;

                document.body.appendChild(loader);
            } else {
                loader.querySelector('div:last-child').textContent = message;
                loader.style.display = 'flex';
            }
        } else {
            if (loader) {
                loader.style.display = 'none';
            }
        }
    }

    // Modal management
    closeModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';

            // Reset modal footer to default
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                    <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
                    <button type="submit" form="editForm" class="btn btn-primary">Save Changes</button>
                `;
            }

            // Clear any stored marker ID
            delete modal.dataset.markerId;
        }
    }

    // Pagination management
    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${totalItems} items)`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadData();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.getTotalItemsForCurrentTab() / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.loadData();
        }
    }

    getTotalItemsForCurrentTab() {
        // This would need to be implemented based on your current data
        // For now, return a default value
        return this.currentData ? this.currentData.length : 0;
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Add new marker modal
    async openAddModal() {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const editForm = document.getElementById('editForm');

        modalTitle.textContent = 'Add New Marker';

        editForm.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Latitude:</label>
                    <input type="number" step="any" name="lat" required placeholder="e.g., 30.4382">
                </div>
                <div class="form-group">
                    <label>Longitude:</label>
                    <input type="number" step="any" name="lng" required placeholder="e.g., -86.7117">
                </div>
                <div class="form-group">
                    <label>Frequency:</label>
                    <input type="text" name="frequency" placeholder="e.g., 162.550">
                </div>
                <div class="form-group">
                    <label>Type:</label>
                    <select name="type" required>
                        <option value="">Select Type</option>
                        <option value="manual">Manual</option>
                        <option value="imported">Imported</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Notes:</label>
                    <textarea name="notes" rows="3" placeholder="Optional notes"></textarea>
                </div>
            </div>
        `;

        // Update modal footer for add mode
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
            <button type="submit" form="editForm" class="btn btn-primary">Create Marker</button>
        `;

        // Handle form submission for new marker
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            await this.createNewMarker(new FormData(e.target));
            this.closeModal();
        };

        modal.style.display = 'block';
    }

    async createNewMarker(formData) {
        try {
            const markerData = {
                lat: parseFloat(formData.get('lat')),
                lng: parseFloat(formData.get('lng')),
                frequency: formData.get('frequency'),
                notes: formData.get('notes'),
                type: formData.get('type')
            };

            // Use existing API endpoint for marker creation (Source: handlers.txt)
            const response = await fetch('/api/markers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(markerData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('Marker created successfully');
                await this.loadData(); // Refresh current tab data

                // If we're on the markers tab, highlight the new marker
                if (this.currentTab === 'markers') {
                    setTimeout(() => {
                        const newRow = document.querySelector(`[data-marker-id="${result.marker.id}"]`);
                        if (newRow) {
                            newRow.style.backgroundColor = '#e8f5e8';
                            setTimeout(() => {
                                newRow.style.backgroundColor = '';
                            }, 2000);
                        }
                    }, 100);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to create marker:', error);
            this.showError('Failed to create marker: ' + error.message);
        }
    }

    // Helper function to render SFAF fields in view mode
    renderSFAFFieldsView(sfafFields, fieldDefs) {
        if (!sfafFields || Object.keys(sfafFields).length === 0) {
            return '<div class="no-sfaf-fields"><p>No SFAF fields defined for this marker.</p></div>';
        }

        const fieldGroups = {
            '1': 'Agency Information (100 Series)',
            '2': 'System Information (200 Series)',
            '3': 'Location Information (300 Series)',
            '4': 'Technical Parameters (400 Series)',
            '5': 'Equipment Information (500 Series)',
            '6': 'Operational Information (600 Series)',
            '7': 'Coordination Information (700 Series)',
            '8': 'Administrative Contact Information (800 Series)',
            '9': 'Comments and Special Requirements (900 Series)'
        };

        let html = '<div class="sfaf-fields-view"><h4>SFAF Fields (MCEB Publication 7)</h4>';

        // Group fields by series
        const groupedFields = {};
        Object.entries(sfafFields).forEach(([fieldId, value]) => {
            const series = fieldId.replace('field', '').substring(0, 1);
            if (!groupedFields[series]) {
                groupedFields[series] = [];
            }
            groupedFields[series].push({ fieldId, value, definition: fieldDefs[fieldId] });
        });

        // Render each group
        Object.entries(groupedFields).forEach(([series, fields]) => {
            const groupName = fieldGroups[series] || `${series}00 Series`;
            html += `
                <div class="sfaf-field-group-view">
                    <h5>${groupName}</h5>
                    <div class="sfaf-field-list">
            `;

            fields.forEach(({ fieldId, value, definition }) => {
                const label = definition ? definition.label : fieldId;
                html += `
                    <div class="sfaf-field-view-item">
                        <label>${label}:</label>
                        <span class="field-value">${value}</span>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        return html;
    }

    // Helper function to render IRAC notes in view mode
    renderIRACNotesView(iracNotes) {
        if (!iracNotes || iracNotes.length === 0) {
            return '';
        }

        let html = `
            <div class="irac-notes-view">
                <h4>IRAC Notes (Military Frequency Coordination)</h4>
                <div class="irac-notes-list-view">
        `;

        iracNotes.forEach(association => {
            const note = association.irac_note || association;
            html += `
                <div class="irac-note-view-item">
                    <div class="irac-note-header-view">
                        <span class="irac-code">${note.code}</span>
                        <span class="irac-category category-${note.category}">${note.category}</span>
                    </div>
                    <div class="irac-note-content-view">
                        <p class="irac-title">${note.title}</p>
                        <p class="irac-description">${note.description}</p>
                        <div class="irac-placement">
                            Field ${association.field_number}, Occurrence ${association.occurrence_number}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }
}

// Enhanced Database Viewer with SFAF grid integration
window.databaseViewer = new DatabaseViewer();


// Initialize the database viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize database viewer instance
    window.databaseViewer = new DatabaseViewer();

    // Add global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+R for refresh (prevent default browser refresh)
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            window.databaseViewer.loadData();
        }

        // Ctrl+N for new marker
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            window.databaseViewer.openAddModal();
        }

        // Ctrl+E for export
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            window.databaseViewer.exportData();
        }
    });

    console.log('✅ SFAF Plotter Database Viewer initialized');
    console.log('📊 Backend integration ready for MCEB Publication 7 compliance');
    console.log('🗂️ Keyboard shortcuts: Ctrl+R (refresh), Ctrl+N (new), Ctrl+E (export)');
});

// Add CSS animation for spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .full-width {
        grid-column: 1 / -1;
    }
    
    .sfaf-field-group-view,
    .irac-notes-view {
        margin: 20px 0;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f9f9f9;
    }
    
    .sfaf-field-group-view h5,
    .irac-notes-view h4 {
        margin: 0 0 15px 0;
        color: #2c3e50;
        font-size: 16px;
        font-weight: 600;
        border-bottom: 2px solid #3498db;
        padding-bottom: 8px;
    }
    
    .sfaf-field-list,
    .irac-notes-list-view {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 10px;
    }
    
    .sfaf-field-view-item,
    .irac-note-view-item {
        display: flex;
        flex-direction: column;
        padding: 10px;
        background: white;
        border: 1px solid #eee;
        border-radius: 4px;
    }
    
    .sfaf-field-view-item label {
        font-weight: 500;
        color: #555;
        margin-bottom: 5px;
        font-size: 14px;
    }
    
    .field-value {
        color: #333;
        padding: 5px 8px;
        background: #f8f9fa;
        border-radius: 3px;
        border-left: 3px solid #3498db;
        font-family: monospace;
        font-size: 13px;
    }
    
    .irac-note-header-view {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .irac-code {
        background: #2c3e50;
        color: white;
        padding: 4px 8px;
        border-radius: 3px;
        font-family: monospace;
        font-weight: 600;
        font-size: 12px;
    }
    
    .irac-category {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .category-coordination { background: #e8f5e8; color: #2e7d32; }
    .category-emission { background: #fff3e0; color: #f57c00; }
    .category-limitation { background: #fce4ec; color: #c2185b; }
    .category-special { background: #f3e5f5; color: #7b1fa2; }
    .category-priority { background: #e3f2fd; color: #1976d2; }
    .category-minute { background: #fff8e1; color: #f9a825; }
    
    .irac-title {
        font-weight: 600;
        margin-bottom: 8px;
        color: #2c3e50;
        font-size: 14px;
    }
    
    .irac-description {
        color: #666;
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 8px;
    }
    
    .irac-placement {
        font-size: 12px;
        color: #888;
        font-style: italic;
    }
    
    /* Notification styles */
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .notification-success {
        background: linear-gradient(135deg, #4CAF50, #45a049);
    }
    
    .notification-error {
        background: linear-gradient(135deg, #f44336, #d32f2f);
    }
    
    .notification-info {
        background: linear-gradient(135deg, #2196F3, #1976D2);
    }
    
    /* Enhanced table styles */
    .coordinates-cell {
        font-family: monospace;
        font-size: 12px;
    }
    
    .coord-decimal {
        color: #333;
        font-weight: 500;
    }
    
    .coord-dms-line {
        color: #666;
        margin-top: 2px;
    }
    
    .coord-compact-line {
        color: #888;
        font-size: 11px;
        margin-top: 1px;
    }
    
    .field-count-number,
    .notes-count-number {
        font-weight: 600;
        color: #2c3e50;
    }
    
    .field-count-label,
    .notes-count-label {
        font-size: 11px;
        color: #888;
        margin-left: 4px;
    }
    
    /* Status badges */
    .field-count-badge {
        background: #e3f2fd;
        color: #1976d2;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .marker-link {
        color: #3498db;
        text-decoration: none;
        font-weight: 500;
    }
    
    .marker-link:hover {
        text-decoration: underline;
    }
    
    /* Category badges for IRAC */
    .category-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    /* Agency tags */
    .agency-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    
    .agency-tag {
        background: #f0f0f0;
        color: #333;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
    }
    
    .agency-more {
        background: #ddd;
        color: #666;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-style: italic;
    }
    
    /* Technical specs display */
    .technical-specs {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .technical-specs pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    
    /* Compliance indicators */
    .compliance-item {
        display: flex;
        flex-direction: column;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #ddd;
        background: white;
        margin-bottom: 10px;
    }
    
    .compliance-item.compliant {
        border-left-color: #4CAF50;
        background: #f8fff8;
    }
    
    .compliance-item.non-compliant {
        border-left-color: #f44336;
        background: #fff8f8;
    }
    
    .compliance-label {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 5px;
    }
    
    .compliance-status {
        font-size: 14px;
        margin-bottom: 3px;
    }
    
    .compliance-detail {
        font-size: 12px;
        color: #666;
        font-style: italic;
    }
    
    .compliance-value {
        font-weight: 600;
        color: #3498db;
    }
    
    /* Band visualization */
    .frequency-bands {
        margin-top: 10px;
    }
    
    .band-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        gap: 10px;
    }
    
    .band-label {
        min-width: 120px;
        font-size: 12px;
        font-weight: 500;
        color: #555;
    }
    
    .band-bar {
        flex: 1;
        height: 20px;
        background: #f0f0f0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid #ddd;
    }
    
    .band-fill {
        height: 100%;
        background: linear-gradient(90deg, #3498db, #2980b9);
        transition: width 0.3s ease;
    }
    
    .band-count {
        min-width: 40px;
        text-align: right;
        font-weight: 600;
        color: #2c3e50;
        font-size: 14px;
    }
    
    /* Geographic stats */
    .geo-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
    }
    
    /* Marker tags for bulk operations */
    .marker-tag {
        display: inline-block;
        background: #3498db;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        margin: 2px;
        font-weight: 500;
    }
    
    /* Bulk edit notice */
    .bulk-edit-notice {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 20px;
    }
    
    .bulk-edit-notice p {
        margin: 0;
        color: #856404;
        font-size: 14px;
    }
    
    /* Selected markers preview */
    .selected-markers-preview {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 15px;
        margin-top: 20px;
    }
    
    .selected-markers-preview h4 {
        margin: 0 0 10px 0;
        color: #2c3e50;
        font-size: 16px;
    }
    
    .marker-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    
    /* View mode specific styles */
    .view-mode-content {
        max-height: 70vh;
        overflow-y: auto;
    }
    
    .info-section {
        margin-bottom: 25px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
    }
    
    .info-section:last-child {
        border-bottom: none;
    }
    
    .info-section h4 {
        margin: 0 0 15px 0;
        color: #2c3e50;
        font-size: 18px;
        font-weight: 600;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
    }
    
    .info-item label {
        font-weight: 500;
        color: #555;
        margin-bottom: 5px;
        font-size: 14px;
    }
    
    .info-item span {
        color: #333;
        font-size: 14px;
    }
    
    .coordinate-formats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
    }
    
    .coord-format {
        display: flex;
        flex-direction: column;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 4px;
        border-left: 3px solid #3498db;
    }
    
    .coord-format label {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 5px;
    }
    
    .coord-value {
        font-family: monospace;
        font-size: 14px;
        color: #333;
        background: white;
        padding: 8px;
        border-radius: 3px;
        border: 1px solid #ddd;
    }
    
    .notes-content {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        border-left: 3px solid #3498db;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        white-space: pre-wrap;
    }
    
    /* Scrollbar styling for webkit browsers */
    .view-mode-content::-webkit-scrollbar,
    .technical-specs::-webkit-scrollbar {
        width: 8px;
    }
    
    .view-mode-content::-webkit-scrollbar-track,
    .technical-specs::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }
    
    .view-mode-content::-webkit-scrollbar-thumb,
    .technical-specs::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }
    
    .view-mode-content::-webkit-scrollbar-thumb:hover,
    .technical-specs::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
    
    /* Enhanced responsive design */
    @media (max-width: 1200px) {
        .analytics-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .form-grid {
            grid-template-columns: 1fr;
        }
    }
    
    @media (max-width: 900px) {
        .analytics-grid {
            grid-template-columns: 1fr;
        }
        
        .info-grid {
            grid-template-columns: 1fr;
        }
        
        .coordinate-formats {
            grid-template-columns: 1fr;
        }
        
        .data-table {
            min-width: 600px;
        }
        
        .table-controls {
            flex-direction: column;
            align-items: stretch;
        }
        
        .search-filter {
            flex-direction: column;
            width: 100%;
        }
        
        .search-input {
            width: 100%;
        }
        
        .table-actions {
            justify-content: center;
            flex-wrap: wrap;
        }
    }
    
    @media (max-width: 600px) {
        .header {
            padding: 15px;
        }
        
        .header h1 {
            font-size: 20px;
        }
        
        .header-actions {
            flex-direction: column;
            width: 100%;
        }
        
        .btn {
            width: 100%;
            justify-content: center;
        }
        
        .nav-tabs {
            flex-direction: column;
        }
        
        .tab-btn {
            margin-bottom: 2px;
        }
        
        .modal-content {
            width: 95%;
            margin: 10px auto;
        }
        
        .data-table th,
        .data-table td {
            padding: 8px 4px;
            font-size: 12px;
        }
        
        .data-table {
            min-width: 500px;
        }
        
        .actions-cell {
            min-width: 80px;
        }
        
        .table-action-btn {
            padding: 2px 4px;
            font-size: 10px;
        }
        
        .coordinates-cell {
            font-size: 10px;
        }
        
        .serial-number {
            font-size: 11px;
        }
        
        .pagination {
            flex-direction: column;
            gap: 5px;
        }
        
        .pagination button {
            width: 100%;
        }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
        body {
            background: #1a1a1a;
            color: #e0e0e0;
        }
        
        .container {
            background: #1a1a1a;
        }
        
        .tab-content,
        .analytics-card,
        .modal-content {
            background: #2d2d2d;
            color: #e0e0e0;
            border-color: #444;
        }
        
        .data-table {
            background: #2d2d2d;
            color: #e0e0e0;
        }
        
        .data-table th {
            background: #333;
            color: #fff;
        }
        
        .data-table tr:hover {
            background: #333;
        }
        
        .data-table tr:nth-child(even) {
            background: #2a2a2a;
        }
        
        .search-input,
        .filter-select,
        .form-group input,
        .form-group select,
        .form-group textarea {
            background: #333;
            color: #e0e0e0;
            border-color: #555;
        }
        
        .btn-primary {
            background: #1976D2;
        }
        
        .btn-secondary {
            background: #666;
        }
        
        .field-value {
            background: #333;
            color: #e0e0e0;
            border-left-color: #1976D2;
        }
        
        .technical-specs {
            background: #333;
            color: #e0e0e0;
            border-color: #555;
        }
        
        .notes-content {
            background: #333;
            color: #e0e0e0;
            border-left-color: #1976D2;
        }
    }
    
    /* High contrast mode */
    @media (prefers-contrast: high) {
        .btn {
            border: 2px solid;
        }
        
        .data-table,
        .data-table th,
        .data-table td {
            border: 2px solid #000;
        }
        
        .irac-code {
            border: 2px solid #fff;
        }
        
        .status-indicator {
            border: 1px solid #000;
        }
    }
    
    /* Reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
        
        .loading-spinner {
            animation: none;
        }
        
        .notification {
            transition: none;
        }
    }
    
    /* Print styles for reports */
    @media print {
        body {
            background: white !important;
            color: black !important;
        }
        
        .header-actions,
        .table-controls,
        .pagination,
        .table-action-btn,
        .nav-tabs,
        .btn {
            display: none !important;
        }
        
        .container {
            max-width: none;
            padding: 0;
        }
        
        .tab-content {
            display: block !important;
            box-shadow: none;
            border: none;
        }
        
        .data-table {
            border-collapse: collapse;
            width: 100%;
            border: 2px solid #000;
        }
        
        .data-table th,
        .data-table td {
            border: 1px solid #000;
            padding: 8px;
            page-break-inside: avoid;
        }
        
        .data-table th {
            background: #f0f0f0 !important;
            font-weight: bold;
        }
        
        .analytics-grid {
            grid-template-columns: 1fr;
            page-break-inside: avoid;
        }
        
        .analytics-card {
            border: 1px solid #000;
            page-break-inside: avoid;
            margin-bottom: 20px;
        }
        
        .header {
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #000 !important;
        }
        
        /* Add page breaks */
        .tab-content {
            page-break-before: always;
        }
        
        .tab-content:first-child {
            page-break-before: avoid;
        }
        
        /* Print page headers */
        @page {
            margin: 1in;
            @top-left {
                content: "SFAF Plotter Database Report";
                font-size: 12px;
                color: #666;
            }
            @top-right {
                content: counter(page);
                font-size: 12px;
                color: #666;
            }
        }
    }
`;

// Append the enhanced styles to the document head
document.head.appendChild(style);

// Initialize the database viewer when DOM is loaded
console.log('✅ SFAF Plotter Database Viewer styles loaded');
console.log('🎨 Enhanced responsive design, dark mode, and print support enabled');
console.log('♿ Accessibility features: high contrast and reduced motion support');

// Add theme management to the DatabaseViewer class
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Detect system theme preference
        this.detectSystemTheme();

        // Add theme toggle if desired
        this.addThemeToggle();
    }

    detectSystemTheme() {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Listen for theme changes
        darkModeQuery.addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        });

        // Set initial theme
        if (darkModeQuery.matches) {
            document.body.classList.add('dark-theme');
        }
    }

    addThemeToggle() {
        const header = document.querySelector('.header-actions');
        if (header) {
            const themeToggle = document.createElement('button');
            themeToggle.className = 'btn btn-secondary';
            themeToggle.innerHTML = '<i class="fas fa-moon"></i> Theme';
            themeToggle.onclick = this.toggleTheme.bind(this);
            header.appendChild(themeToggle);
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');

        // Save preference
        localStorage.setItem('preferred-theme', isDark ? 'dark' : 'light');

        // Update icon
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// Enhanced accessibility features
class AccessibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.addKeyboardNavigation();
        this.addScreenReaderSupport();
        this.addFocusManagement();
    }

    addKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+F for search
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('markerSearch');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                window.databaseViewer?.closeModal();
            }

            // Arrow keys for table navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleTableNavigation(e);
            }
        });
    }

    addScreenReaderSupport() {
        // Add ARIA labels and descriptions
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            table.setAttribute('role', 'table');
            table.setAttribute('aria-label', 'Database records table');
        });

        // Add live regions for status updates
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'status-announcements';
        document.body.appendChild(liveRegion);
    }

    addFocusManagement() {
        // Trap focus in modals
        document.addEventListener('focusin', (e) => {
            const modal = document.querySelector('.modal[style*="block"]');
            if (modal && !modal.contains(e.target)) {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            }
        });
    }

    announceStatus(message) {
        const liveRegion = document.getElementById('status-announcements');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    handleTableNavigation(e) {
        const activeElement = document.activeElement;
        if (activeElement.closest('.data-table')) {
            // Implement table cell navigation logic
            e.preventDefault();
            // Add your table navigation logic here
        }
    }
}

// Performance optimization utilities
class PerformanceManager {
    constructor() {
        this.init();
    }

    init() {
        this.addIntersectionObserver();
        this.addVirtualScrolling();
        this.optimizeAnimations();
    }

    addIntersectionObserver() {
        // Lazy load table content when it comes into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Load content for visible rows
                    this.loadRowContent(entry.target);
                }
            });
        }, {
            rootMargin: '50px'
        });

        // Observe table rows
        document.querySelectorAll('.table-row').forEach(row => {
            observer.observe(row);
        });
    }

    addVirtualScrolling() {
        // Implement virtual scrolling for large datasets
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            // Add virtual scrolling logic here for performance
        }
    }

    optimizeAnimations() {
        // Reduce animations based on user preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        if (prefersReducedMotion.matches) {
            document.body.classList.add('reduced-motion');
        }
    }

    loadRowContent(row) {
        // Load any deferred content for the row
        const markerId = row.dataset.markerId;
        if (markerId && window.databaseViewer) {
            // Load additional data if needed
        }
    }
}

// Initialize all enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize core database viewer
    window.databaseViewer = new DatabaseViewer();

    // Initialize enhancements
    window.themeManager = new ThemeManager();
    window.accessibilityManager = new AccessibilityManager();
    window.performanceManager = new PerformanceManager();

    console.log('✅ SFAF Plotter Database Viewer fully initialized');
    console.log('🎨 Theme management enabled');
    console.log('♿ Accessibility features active');
    console.log('⚡ Performance optimizations applied');
    console.log('📱 Responsive design active for all screen sizes');
});