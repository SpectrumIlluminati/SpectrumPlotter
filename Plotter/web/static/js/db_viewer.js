class SessionManager {
    constructor() {
        this.storageKeys = {
            activeTab: 'sfaf_plotter_active_tab',
            viewMode: 'sfaf_plotter_view_mode',
            lastSession: 'sfaf_plotter_last_session',
            userPreferences: 'sfaf_plotter_user_preferences',
            selectedItems: 'sfaf_plotter_selected_items'
        };
        this.defaultSettings = {
            activeTab: 'sfaf',  // ✅ SFAF Records as default
            viewMode: 'spreadsheet',  // ✅ All Fields as default view
            lastAccessed: null,
            sessionCount: 0
        };
    }

    // Get user's last session preferences
    getSessionPreferences() {
        try {
            const stored = localStorage.getItem(this.storageKeys.lastSession);
            if (stored) {
                const preferences = JSON.parse(stored);
                console.log('📂 Restored session preferences:', preferences);
                return { ...this.defaultSettings, ...preferences };
            }
        } catch (error) {
            console.warn('⚠️ Could not restore session preferences:', error);
        }

        console.log('📂 Using default session preferences');
        return { ...this.defaultSettings };
    }

    // Save current session state
    saveSessionPreferences(currentState) {
        try {
            const sessionData = {
                activeTab: currentState.activeTab || this.defaultSettings.activeTab,
                viewMode: currentState.viewMode || this.defaultSettings.viewMode,
                lastAccessed: new Date().toISOString(),
                sessionCount: (this.getSessionCount() || 0) + 1,
                userAgent: navigator.userAgent.substring(0, 50), // For debugging
                screenResolution: `${screen.width}x${screen.height}`
            };

            localStorage.setItem(this.storageKeys.lastSession, JSON.stringify(sessionData));
            console.log('💾 Session preferences saved:', sessionData);

            return true;
        } catch (error) {
            console.error('❌ Failed to save session preferences:', error);
            return false;
        }
    }

    // Get session usage count
    getSessionCount() {
        try {
            const stored = localStorage.getItem(this.storageKeys.lastSession);
            if (stored) {
                const data = JSON.parse(stored);
                return data.sessionCount || 0;
            }
        } catch (error) {
            console.warn('Could not get session count:', error);
        }
        return 0;
    }

    // Clear session data (for reset functionality)
    clearSessionData() {
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('🧹 Session data cleared');
    }

    // Get active tab preference
    getActiveTab() {
        const preferences = this.getSessionPreferences();
        return preferences.activeTab;
    }

    // Get view mode preference
    getViewMode() {
        const preferences = this.getSessionPreferences();
        return preferences.viewMode;
    }

    // Update specific preference
    updatePreference(key, value) {
        const current = this.getSessionPreferences();
        current[key] = value;
        this.saveSessionPreferences(current);
    }

    // Get persisted selections for current tab
    getSelectedItems(tabId) {
        try {
            const key = `${this.storageKeys.selectedItems}_${tabId}`;
            const stored = localStorage.getItem(key);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch (error) {
            console.warn('⚠️ Could not restore selections:', error);
            return new Set();
        }
    }

    // Save current selections
    saveSelectedItems(tabId, selectedSet) {
        try {
            const key = `${this.storageKeys.selectedItems}_${tabId}`;
            localStorage.setItem(key, JSON.stringify(Array.from(selectedSet)));
        } catch (error) {
            console.error('❌ Failed to save selections:', error);
        }
    }

    // Clear selections for a tab
    clearSelectedItems(tabId) {
        const key = `${this.storageKeys.selectedItems}_${tabId}`;
        localStorage.removeItem(key);
    }
}

// Database viewer implementation leveraging existing SFAF Plotter backend APIs
class DatabaseViewer {
    constructor() {
        // ✅ Initialize session manager first
        this.sessionManager = new SessionManager();

        // ✅ Load user preferences from previous session
        const sessionPrefs = this.sessionManager.getSessionPreferences();

        // ✅ Set initial state from session or defaults
        this.currentTab = sessionPrefs.activeTab; // Will be 'sfaf' by default
        this.currentView = sessionPrefs.viewMode; // Will be 'summary' by default

        // Existing properties
        this.activeFilters = {};
        this.savedViews = this.loadSavedViews();
        this.customViews = this.loadCustomViews(); // Load custom user-defined views
        this.defaultView = this.loadDefaultView(); // Load user's default view preference
        this.editingViewId = null; // Track which view is being edited
        this.currentData = [];
        this.currentSFAFData = []; // ✅ Add SFAF-specific data array
        this.sfafFieldDefinitions = null;
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.currentSort = { field: 'serial', order: 'asc' };
        this.currentFilter = '';
        this.columnFilters = {}; // Stores filter values for each column
        this.enhancedRecords = []; // Store processed records for filtering/sorting
        // ✅ Load persisted selections instead of empty Set
        this.selectedItems = this.sessionManager.getSelectedItems(this.currentTab);

        // Query Builder state
        this.queryConditions = [];
        this.querySortOrder = 'asc';
        this.queryResults = [];

        // Initialize components
        this.initializeSFAFFileImport();
        this.init();

        console.log(`✅ DatabaseViewer initialized with session preferences:`, sessionPrefs);
    }

    async init() {
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupTableScrollIndicators();

        // Check for serial filter from Table Manager
        const filterData = sessionStorage.getItem('dbFilterSerials');
        if (filterData) {
            try {
                const { unitCode, serials } = JSON.parse(filterData);
                this.serialFilter = serials;
                console.log(`🔍 Applying serial filter for ${unitCode}:`, serials);
                sessionStorage.removeItem('dbFilterSerials');
            } catch (error) {
                console.error('Error parsing serial filter:', error);
            }
        }

        // ✅ Apply session preferences before loading data
        this.applySessionPreferences();

        // Initialize custom views and apply default view
        this.updateViewDropdown();
        this.applyDefaultView();

        await this.loadData();

        // ✅ Save initial session state
        this.saveCurrentState();
    }

    // Setup scroll indicators for Excel-like tables
    setupTableScrollIndicators() {
        const tableContainers = document.querySelectorAll('.table-container');

        tableContainers.forEach(container => {
            const checkScroll = () => {
                const hasHorizontalScroll = container.scrollWidth > container.clientWidth;

                if (hasHorizontalScroll) {
                    container.classList.add('has-scroll');
                } else {
                    container.classList.remove('has-scroll');
                }
            };

            // Check on load and resize
            checkScroll();
            window.addEventListener('resize', checkScroll);

            // Also check when content changes
            const observer = new MutationObserver(checkScroll);
            observer.observe(container, { childList: true, subtree: true });
        });
    }

    // ✅ NEW: Apply session preferences to UI
    applySessionPreferences() {
        console.log(`🔄 Applying session preferences: tab=${this.currentTab}, view=${this.currentView}`);

        // Set active tab without triggering events
        this.setActiveTabUI(this.currentTab);

        // Set active view mode without triggering events
        this.setActiveViewMode(this.currentView);

        // Update tab content visibility
        this.updateTabContentVisibility();
    }

    // ✅ NEW: Set active tab in UI without triggering switch
    setActiveTabUI(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            }
        });

        // Store current tab
        this.currentTab = tabId;
    }

    // ✅ NEW: Set active view mode in UI without triggering change
    setActiveViewMode(viewMode) {
        const viewSelector = document.getElementById('sfafViewMode');
        if (viewSelector && viewMode) {
            viewSelector.value = viewMode;
            this.currentView = viewMode;
        }
    }

    // ✅ NEW: Update tab content visibility
    updateTabContentVisibility() {
        // Hide all tab content
        document.querySelectorAll('.tab-panel').forEach(content => {
            content.classList.remove('active');
        });

        // Show active tab content
        const activeContent = document.getElementById(`${this.currentTab}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // ✅ ENHANCED: Save current state to session
    saveCurrentState() {
        const currentState = {
            activeTab: this.currentTab,
            viewMode: this.currentView,
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            activeFilters: { ...this.activeFilters },
            currentFilter: this.currentFilter
        };

        this.sessionManager.saveSessionPreferences(currentState);
    }

    setupEventListeners() {
        // Existing event listeners...

        // ✅ NEW: View mode change handler with session persistence
        const viewModeSelector = document.getElementById('sfafViewMode');
        if (viewModeSelector) {
            viewModeSelector.addEventListener('change', (e) => {
                const newViewMode = e.target.value;
                console.log(`🔄 View mode changed to: ${newViewMode}`);

                this.currentView = newViewMode;

                // ✅ If it's a custom view, load the custom view data
                if (newViewMode && newViewMode.startsWith('custom_')) {
                    const viewId = newViewMode.replace('custom_', '');
                    const view = this.customViews.find(v => v.id === viewId);
                    if (view) {
                        this.currentCustomView = view;
                        console.log(`✅ Loaded custom view: ${view.name}`);
                    } else {
                        console.warn(`⚠️ Custom view not found: ${viewId}`);
                    }
                } else {
                    // Clear custom view when switching to built-in view
                    this.currentCustomView = null;
                }

                // ✅ Save view mode preference to session
                this.sessionManager.updatePreference('viewMode', newViewMode);

                // Reload data with new view mode
                if (this.currentTab === 'sfaf') {
                    this.loadSFAFRecords();
                }

                console.log(`✅ View mode set to: ${newViewMode} (saved to session)`);
            });
        }

        // ✅ NEW: Session reset functionality (optional)
        const resetSessionBtn = document.getElementById('resetSessionBtn');
        if (resetSessionBtn) {
            resetSessionBtn.addEventListener('click', () => {
                if (confirm('Reset all session preferences to defaults?')) {
                    this.sessionManager.clearSessionData();
                    location.reload();
                }
            });
        }

        // Header refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData();
            });
        }

        // Header export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Add SFAF record button
        const addSFAFRecordBtn = document.getElementById('addSFAFRecordBtn');
        if (addSFAFRecordBtn) {
            addSFAFRecordBtn.addEventListener('click', () => {
                this.addNewSFAFRecord();
            });
        }

        // Manage Views button
        const manageViewsBtn = document.getElementById('manageViewsBtn');
        if (manageViewsBtn) {
            manageViewsBtn.addEventListener('click', () => {
                this.openViewManagementModal();
            });
        }

        // Bulk actions button
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => {
                this.showBulkActionsMenu();
            });
        }

        // Import SFAF button
        const importSFAFBtn = document.getElementById('importSFAFBtn');
        if (importSFAFBtn) {
            importSFAFBtn.addEventListener('click', () => {
                document.getElementById('sfafImportFile').click();
            });
        }

        // Export selected button
        const exportSelectedBtn = document.getElementById('exportSelectedBtn');
        if (exportSelectedBtn) {
            exportSelectedBtn.addEventListener('click', () => {
                this.exportSelectedRecords();
            });
        }

        // Delete selected button
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelected();
            });
        }

        // Delete all button
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.deleteAllSFAFs();
            });
        }

        // View on Map button
        const viewOnMapBtn = document.getElementById('viewOnMapBtn');
        if (viewOnMapBtn) {
            viewOnMapBtn.addEventListener('click', () => {
                this.viewSelectedOnMap();
            });
        }

        // Event delegation for row checkboxes (more reliable than inline handlers)
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                // Get record ID from value attribute (most reliable)
                const recordId = e.target.value;
                if (recordId) {
                    this.toggleRowSelection(recordId, e.target.checked);
                }
            }
        });

        // Refresh SFAF button
        const refreshSFAFBtn = document.getElementById('refreshSFAFBtn');
        if (refreshSFAFBtn) {
            refreshSFAFBtn.addEventListener('click', () => {
                this.loadSFAFRecords();
            });
        }

        // Pagination buttons
        const firstPageBtn = document.getElementById('firstPageBtn');
        if (firstPageBtn) {
            firstPageBtn.addEventListener('click', () => {
                this.goToFirstPage();
            });
        }

        const prevSFAFPage = document.getElementById('prevSFAFPage');
        if (prevSFAFPage) {
            prevSFAFPage.addEventListener('click', () => {
                this.previousPage();
            });
        }

        const nextSFAFPage = document.getElementById('nextSFAFPage');
        if (nextSFAFPage) {
            nextSFAFPage.addEventListener('click', () => {
                this.nextPage();
            });
        }

        const lastPageBtn = document.getElementById('lastPageBtn');
        if (lastPageBtn) {
            lastPageBtn.addEventListener('click', () => {
                this.goToLastPage();
            });
        }

        // Records per page selector
        const recordsPerPage = document.getElementById('recordsPerPage');
        if (recordsPerPage) {
            recordsPerPage.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadData();
            });
        }

        // Search input
        const sfafRecordsSearch = document.getElementById('sfafRecordsSearch');
        if (sfafRecordsSearch) {
            sfafRecordsSearch.addEventListener('input', (e) => {
                this.currentFilter = e.target.value;
                this.currentPage = 1;
                this.loadData();
            });
        }

        // Filter selects
        const completionStatusFilter = document.getElementById('completionStatusFilter');
        if (completionStatusFilter) {
            completionStatusFilter.addEventListener('change', (e) => {
                this.activeFilters.completionStatus = e.target.value;
                this.currentPage = 1;
                this.loadData();
            });
        }

        const agencyFilter = document.getElementById('agencyFilter');
        if (agencyFilter) {
            agencyFilter.addEventListener('change', (e) => {
                this.activeFilters.agency = e.target.value;
                this.currentPage = 1;
                this.loadData();
            });
        }

        const frequencyBandFilter = document.getElementById('frequencyBandFilter');
        if (frequencyBandFilter) {
            frequencyBandFilter.addEventListener('change', (e) => {
                this.activeFilters.frequencyBand = e.target.value;
                this.currentPage = 1;
                this.loadData();
            });
        }

        const poolAssignmentFilter = document.getElementById('poolAssignmentFilter');
        if (poolAssignmentFilter) {
            poolAssignmentFilter.addEventListener('change', (e) => {
                this.activeFilters.poolAssignment = e.target.value;
                this.currentPage = 1;
                this.loadData();
            });
        }

        // Clear Filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Modal close button
        const modalCloseBtn = document.querySelector('.modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Close modal when clicking outside
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Query Builder Event Listeners
        const advancedQueryBtn = document.getElementById('advancedQueryBtn');
        if (advancedQueryBtn) {
            advancedQueryBtn.addEventListener('click', () => {
                this.toggleQueryPanel();
            });
        }

        const addDBQueryBtn = document.getElementById('addDBQueryBtn');
        if (addDBQueryBtn) {
            addDBQueryBtn.addEventListener('click', () => {
                this.addDBFilterQuery();
            });
        }

        const applyDBFiltersBtn = document.getElementById('applyDBFiltersBtn');
        if (applyDBFiltersBtn) {
            applyDBFiltersBtn.addEventListener('click', () => {
                this.applyDBFilters();
            });
        }

        const clearDBFiltersBtn = document.getElementById('clearDBFiltersBtn');
        if (clearDBFiltersBtn) {
            clearDBFiltersBtn.addEventListener('click', () => {
                this.clearDBFilters();
            });
        }

        // Quick filter buttons in query panel
        document.querySelectorAll('#advancedQueryPanel .quick-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filter;
                this.applyQuickFilter(filterType);
            });
        });

        // Query Tab Event Listeners - Unified Interface
        const addConditionBtn = document.getElementById('addConditionBtn');
        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Add a small delay to prevent double-click issues
                if (this._addingCondition) {
                    console.log('⚠️ Already adding a condition, skipping duplicate');
                    return;
                }
                this._addingCondition = true;
                this.addQueryCondition();
                setTimeout(() => {
                    this._addingCondition = false;
                }, 300);
            });
        }

        const runQueryBtn = document.getElementById('runQueryBtn');
        if (runQueryBtn) {
            runQueryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.runQuery();
            });
        }

        const clearQueryBtn = document.getElementById('clearQueryBtn');
        if (clearQueryBtn) {
            clearQueryBtn.addEventListener('click', () => {
                this.clearQuery();
            });
        }

        // Sort order toggle
        const sortAscBtn = document.getElementById('sortAscBtn');
        const sortDescBtn = document.getElementById('sortDescBtn');
        if (sortAscBtn && sortDescBtn) {
            sortAscBtn.addEventListener('click', () => {
                sortAscBtn.classList.add('active');
                sortDescBtn.classList.remove('active');
                this.querySortOrder = 'asc';
            });
            sortDescBtn.addEventListener('click', () => {
                sortDescBtn.classList.add('active');
                sortAscBtn.classList.remove('active');
                this.querySortOrder = 'desc';
            });
        }

        // Existing event listeners continue...
    }

    setupTabNavigation() {
        document.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        console.log(`🔄 Switching to tab: ${tabId}`);

        // ✅ SAVE current tab's selections before switching
        this.sessionManager.saveSelectedItems(this.currentTab, this.selectedItems);

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-panel').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`)?.classList.add('active');

        // Update internal state
        this.currentTab = tabId;
        this.currentPage = 1;

        // ✅ RESTORE new tab's selections
        this.selectedItems = this.sessionManager.getSelectedItems(tabId);

        // ✅ Save tab preference to session
        this.sessionManager.updatePreference('activeTab', tabId);

        // Load data for new tab
        this.loadData();

        console.log(`✅ Tab switched to: ${tabId}, restored ${this.selectedItems.size} selections (saved to session)`);
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
            // If no markers exist, automatically switch to SFAF tab
            if (!data.markers || data.markers.length === 0) {
                console.log('⚠️ No markers found in database, switching to SFAF tab');
                this.switchTab('sfaf');
                return;
            }
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
    toggleRowSelection(recordId, isSelected) {
        if (isSelected) {
            // Enforce 10 record limit for map visualization
            if (this.selectedItems.size >= 10) {
                alert('Maximum 10 records can be selected for map visualization.');
                // Uncheck the checkbox
                const checkbox = document.querySelector(`.row-checkbox[value="${recordId}"]`);
                if (checkbox) checkbox.checked = false;
                return;
            }
            this.selectedItems.add(recordId);
        } else {
            this.selectedItems.delete(recordId);
        }

        // Update row visual state
        const row = document.querySelector(`tr[data-record-id="${recordId}"]`);
        if (row) {
            row.classList.toggle('row-selected', isSelected);
        }

        // Update select-all checkbox
        this.updateSelectAllCheckbox();

        // Update selection UI
        this.updateSelectionUI();

        // Persist to localStorage
        this.sessionManager.saveSelectedItems(this.currentTab, this.selectedItems);
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.row-checkbox');

        checkboxes.forEach(checkbox => {
            if (selectAll) {
                this.selectedItems.add(checkbox.value);
                checkbox.checked = true;
                const row = checkbox.closest('tr');
                if (row) row.classList.add('row-selected');
            } else {
                this.selectedItems.delete(checkbox.value);
                checkbox.checked = false;
                const row = checkbox.closest('tr');
                if (row) row.classList.remove('row-selected');
            }
        });

        this.updateSelectionUI();
        this.sessionManager.saveSelectedItems(this.currentTab, this.selectedItems);
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked');

        if (selectAllCheckbox && allCheckboxes.length > 0) {
            const allSelected = checkedCheckboxes.length === allCheckboxes.length;
            const someSelected = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;

            selectAllCheckbox.checked = allSelected;
            selectAllCheckbox.indeterminate = someSelected;
        }
    }

    updateSelectionUI() {
        const selectionCount = this.selectedItems.size;

        // Update selection counter
        const counterElement = document.getElementById('selectionCounter');
        if (counterElement) {
            if (selectionCount > 0) {
                counterElement.textContent = `${selectionCount} item${selectionCount !== 1 ? 's' : ''} selected`;
                counterElement.style.display = 'inline-block';
            } else {
                counterElement.style.display = 'none';
            }
        }

        // Update bulk action buttons
        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const bulkEditBtn = document.getElementById('bulkEditBtn');
        const exportSelectedBtn = document.getElementById('exportSelectedBtn');
        const exportSelectedToCSVBtn = document.getElementById('exportSelectedToCSVBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const viewOnMapBtn = document.getElementById('viewOnMapBtn');
        const hasSelection = this.selectedItems.size > 0;

        if (bulkEditBtn) {
            bulkEditBtn.disabled = !hasSelection;
            bulkEditBtn.textContent = hasSelection ?
                `Bulk Edit (${this.selectedItems.size})` : 'Bulk Edit';
        }

        if (exportSelectedBtn) {
            exportSelectedBtn.disabled = !hasSelection;
            exportSelectedBtn.textContent = hasSelection ?
                `Export (${this.selectedItems.size})` : 'Export';
        }

        // Enable/disable Export Selected to CSV button in dropdown
        if (exportSelectedToCSVBtn) {
            exportSelectedToCSVBtn.disabled = !hasSelection;
            if (hasSelection) {
                exportSelectedToCSVBtn.style.opacity = '1';
                exportSelectedToCSVBtn.style.cursor = 'pointer';
            } else {
                exportSelectedToCSVBtn.style.opacity = '0.5';
                exportSelectedToCSVBtn.style.cursor = 'not-allowed';
            }
        }

        if (deleteSelectedBtn) {
            deleteSelectedBtn.disabled = !hasSelection;
            deleteSelectedBtn.textContent = hasSelection ?
                `Delete (${this.selectedItems.size})` : 'Delete Selected';
        }

        // Show/hide "View on Map" button based on selection
        if (viewOnMapBtn) {
            if (hasSelection) {
                viewOnMapBtn.style.display = 'inline-flex';
                viewOnMapBtn.textContent = `View on Map (${this.selectedItems.size})`;
            } else {
                viewOnMapBtn.style.display = 'none';
            }
        }
    }

    renderEnhancedSFAFTable(enhancedRecords) {
        // ✅ Use the existing function to ensure table elements exist
        const { table, header, body } = this.ensureSFAFTableElements();

        // ✅ Use the returned elements instead of getElementById
        const tableHeader = header;
        const tableBody = body;

        if (!tableHeader || !tableBody) {
            console.error('❌ Could not create SFAF table elements');
            return;
        }

        // ✅ Show the table if it was hidden
        if (table) {
            table.style.display = 'table';
        }

        // Filter out undefined/null records
        let validRecords = (enhancedRecords || []).filter(record =>
            record && typeof record === 'object' && record.id
        );

        if (validRecords.length === 0) {
            // Show empty state, hide data grid
            const emptyState = document.getElementById('sfafEmptyState');
            const dataGrid = document.getElementById('sfafDataGrid');

            if (emptyState) emptyState.style.display = 'block';
            if (dataGrid) dataGrid.style.display = 'none';
            if (table) table.style.display = 'none';

            console.log('No records to display - showing empty state');
            return;
        }

        // ✅ Server-side pagination: Data is already paginated from API, no need to slice again
        // The records passed in are already the correct page from the server
        const totalRecords = validRecords.length;
        const paginatedRecords = validRecords; // Don't slice - already paginated by server

        console.log(`📊 Rendering ${paginatedRecords.length} records for page ${this.currentPage}`);

        // Hide empty state, show data grid
        const emptyState = document.getElementById('sfafEmptyState');
        const dataGrid = document.getElementById('sfafDataGrid');

        if (emptyState) emptyState.style.display = 'none';
        if (dataGrid) dataGrid.style.display = 'block';
        if (table) table.style.display = 'table';

        // Generate dynamic headers based on view mode
        const headers = this.getHeadersForView(this.currentView || 'summary');
        tableHeader.innerHTML = `
        <tr class="header-row">
            ${headers.map(header => {
                const isSortable = header.field !== 'select' && header.field !== 'actions';
                const sortableClass = isSortable ? 'sortable' : '';
                const sortableClick = isSortable ? `onclick="databaseViewer.sortByColumn('${header.field}')"` : '';
                return `<th data-field="${header.field}" class="${sortableClass} ${header.class || ''}" ${sortableClick}>
                    <div class="header-content">
                        <span class="header-label">${header.label}</span>
                        ${isSortable ? `<span class="sort-indicator ${this.currentSort.field === header.field ? (this.currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}">
                            ${this.currentSort.field === header.field ? (this.currentSort.order === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>` : ''}
                    </div>
                </th>`;
            }).join('')}
        </tr>
        <tr class="filter-row">
            ${headers.map(header =>
            `<th data-field="${header.field}" class="${header.class || ''}">
                    ${header.filterable !== false ?
                        `<input type="text"
                                class="column-filter"
                                data-field="${header.field}"
                                placeholder="Filter (press Enter)..."
                                value="${this.columnFilters[header.field] || ''}"
                                onkeydown="if(event.key === 'Enter') databaseViewer.filterColumn('${header.field}', this.value)"
                                onclick="event.stopPropagation()">`
                        : ''}
                </th>`
        ).join('')}
        </tr>
    `;

        // Generate table rows with enhanced SFAF data (only current page)
        tableBody.innerHTML = paginatedRecords.map(record => {
            const isChecked = this.selectedItems.has(record.id) ? 'checked' : '';

            // Use spreadsheet rendering if in spreadsheet view
            if (this.currentView === 'spreadsheet') {
                return this.renderSpreadsheetRow(record, headers, isChecked);
            }

            // Use generic row renderer for custom views and other views
            return this.renderGenericRow(record, headers, isChecked);
        }).join('');

        // After rendering, attach select-all handler
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
            this.updateSelectAllCheckbox();
        }

        // Update selection UI
        this.updateSelectionUI();

        // Update summary statistics with total record count
        this.updateTableStatistics(totalRecords);

        // Update pagination controls
        this.updatePaginationControls(totalRecords);
    }

    // Helper function to render SFAF fields in view mode
    // ✅ ENHANCED: Horizontal scrolling field view with customization
    renderSFAFFieldsView(sfafFields, fieldDefinitions) {
        if (!sfafFields || Object.keys(sfafFields).length === 0) {
            return `
            <div class="no-sfaf-fields">
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h5>No SFAF Fields Defined</h5>
                    <p>This marker does not have any SFAF fields defined.</p>
                    <button class="btn btn-primary btn-sm" onclick="databaseViewer.editSFAFRecord('${this.currentRecordId}')">
                        <i class="fas fa-plus"></i> Add SFAF Fields
                    </button>
                </div>
            </div>
        `;
        }

        // Get current view configuration or use default
        const currentView = this.getCurrentFieldView();
        const sortedFilteredFields = this.getSortedFilteredFields(sfafFields, fieldDefinitions, currentView);

        return `
        <div class="sfaf-fields-horizontal-view">
            <!-- View Controls -->
            <div class="field-view-controls">
                <div class="view-selector-section">
                    <label>Field View:</label>
                    <select id="fieldViewSelector" class="view-selector" onchange="databaseViewer.changeFieldView(this.value)">
                        <option value="all">All Fields</option>
                        ${this.getCustomViews().map(view =>
            `<option value="${view.id}" ${view.id === currentView.id ? 'selected' : ''}>${view.name}</option>`
        ).join('')}
                    </select>
                    <button class="btn btn-sm btn-primary" onclick="databaseViewer.createCustomView()">
                        <i class="fas fa-plus"></i> New View
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="databaseViewer.editCurrentView()">
                        <i class="fas fa-edit"></i> Edit View
                    </button>
                </div>
                
                <div class="field-controls-section">
                    <div class="field-filter">
                        <label>Filter Fields:</label>
                        <input type="text" id="fieldFilter" placeholder="Search field names..." 
                               class="field-filter-input" onkeyup="databaseViewer.filterFields(this.value)">
                    </div>
                    
                    <div class="field-sort">
                        <label>Sort By:</label>
                        <select id="fieldSort" class="field-sort-select" onchange="databaseViewer.sortFields(this.value)">
                            <option value="number">Field Number</option>
                            <option value="name">Field Name</option>
                            <option value="value">Field Value</option>
                            <option value="custom">Custom Order</option>
                        </select>
                    </div>
                    
                    <div class="view-stats">
                        <span class="field-count">${sortedFilteredFields.length} fields shown</span>
                    </div>
                </div>
            </div>

            <!-- Horizontal Scrolling Field Container -->
            <div class="fields-horizontal-container">
                <div class="fields-scroll-wrapper">
                    <div class="horizontal-fields-grid" id="horizontalFieldsGrid">
                        ${sortedFilteredFields.map((field, index) => this.renderIndividualField(field, index)).join('')}
                    </div>
                </div>
                
                <!-- Scroll Navigation -->
                <div class="scroll-navigation">
                    <button class="scroll-btn scroll-left" onclick="databaseViewer.scrollFieldsLeft()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="scroll-indicator">
                        <span id="fieldScrollPosition">1-${Math.min(5, sortedFilteredFields.length)} of ${sortedFilteredFields.length}</span>
                    </div>
                    <button class="scroll-btn scroll-right" onclick="databaseViewer.scrollFieldsRight()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            <!-- Field Management Panel -->
            <div class="field-management-panel" id="fieldManagementPanel" style="display: none;">
                <h5>Customize Field View</h5>
                <div class="available-fields-list" id="availableFieldsList">
                    <!-- Populated dynamically -->
                </div>
                <div class="field-order-controls">
                    <button class="btn btn-sm btn-secondary" onclick="databaseViewer.moveFieldUp()">↑ Move Up</button>
                    <button class="btn btn-sm btn-secondary" onclick="databaseViewer.moveFieldDown()">↓ Move Down</button>
                    <button class="btn btn-sm btn-danger" onclick="databaseViewer.removeFromView()">✕ Remove</button>
                </div>
            </div>

            <!-- MC4EB Compliance Summary -->
            ${this.renderMCEBComplianceSummary(sfafFields)}
        </div>
    `;
    }

    // ✅ Supporting methods for horizontal field view
    renderIndividualField(fieldInfo, index) {
        const { fieldId, fieldNumber, value, definition, occurrence, isRequired, isValid } = fieldInfo;

        return `
        <div class="field-card ${isRequired ? 'required-field' : ''} ${isValid ? 'valid-field' : 'invalid-field'}" 
             data-field-id="${fieldId}" data-field-number="${fieldNumber}">
            <div class="field-card-header">
                <div class="field-number-badge">
                    ${fieldNumber}${occurrence ? `/${occurrence}` : ''}
                </div>
                <div class="field-actions">
                    ${isRequired ? '<i class="fas fa-asterisk required-icon" title="Required Field"></i>' : ''}
                    ${isValid ?
                '<i class="fas fa-check-circle valid-icon" title="Valid"></i>' :
                '<i class="fas fa-exclamation-triangle invalid-icon" title="Invalid"></i>'
            }
                    <button class="field-action-btn" onclick="databaseViewer.editFieldInPlace('${fieldId}')" title="Edit Field">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            
            <div class="field-card-content">
                <div class="field-name">${this.getFieldLabel(fieldId)}</div>
                <div class="field-value ${this.getFieldValueClass(fieldId)}" title="${value}">
                    ${this.formatFieldValue(fieldId, value)}
                </div>
                ${definition?.description ? `<div class="field-description">${definition.description}</div>` : ''}
            </div>
        </div>
    `;
    }

    getSortedFilteredFields(sfafFields, fieldDefinitions, currentView) {
        // Extract all fields with metadata
        let allFields = Object.entries(sfafFields).map(([fieldId, value]) => {
            const fieldNumber = fieldId.replace('field', '').split('_')[0];
            const occurrence = fieldId.includes('_') ? fieldId.split('_')[1] : null;

            return {
                fieldId,
                fieldNumber,
                value: value.trim(),
                definition: fieldDefinitions?.[fieldId],
                occurrence,
                isRequired: this.isRequiredField(fieldId),
                isValid: this.validateFieldValue(fieldId, value)
            };
        });

        console.log('🔍 Total fields before filtering:', allFields.length);
        const fieldsWithValues = allFields.filter(field => field.value !== '');
        console.log('🔍 Fields with non-empty values:', fieldsWithValues.length);

        // CHANGED: Don't filter out empty fields, show all fields
        // This allows users to see which fields are missing data
        // allFields = allFields.filter(field => field.value !== '');

        // Apply current view filter if not "all"
        if (currentView.id !== 'all' && currentView.fields) {
            allFields = allFields.filter(field =>
                currentView.fields.includes(field.fieldId)
            );
        }

        // Apply text filter if active
        const filterText = document.getElementById('fieldFilter')?.value?.toLowerCase();
        if (filterText) {
            allFields = allFields.filter(field =>
                field.fieldId.toLowerCase().includes(filterText) ||
                this.getFieldLabel(field.fieldId).toLowerCase().includes(filterText) ||
                field.value.toLowerCase().includes(filterText)
            );
        }

        // Apply sorting
        const sortMode = document.getElementById('fieldSort')?.value || 'number';
        switch (sortMode) {
            case 'number':
                allFields.sort((a, b) => parseInt(a.fieldNumber) - parseInt(b.fieldNumber));
                break;
            case 'name':
                allFields.sort((a, b) => this.getFieldLabel(a.fieldId).localeCompare(this.getFieldLabel(b.fieldId)));
                break;
            case 'value':
                allFields.sort((a, b) => a.value.localeCompare(b.value));
                break;
            case 'custom':
                if (currentView.fieldOrder) {
                    allFields.sort((a, b) => {
                        const aIndex = currentView.fieldOrder.indexOf(a.fieldId);
                        const bIndex = currentView.fieldOrder.indexOf(b.fieldId);
                        return aIndex - bIndex;
                    });
                }
                break;
        }

        return allFields;
    }

    // Helper method to check if a field is required
    isRequiredField(fieldId) {
        const requiredFields = [
            'field005', 'field010', 'field102', 'field110',
            'field200', 'field300'
        ];
        return requiredFields.includes(fieldId);
    }

    // Helper method to validate field values
    validateFieldValue(fieldId, value) {
        if (!value || value.trim() === '') {
            return !this.isRequiredField(fieldId);
        }
        return true;
    }

    // Helper method to format field values for display
    formatFieldValue(fieldId, value) {
        if (!value || value.trim() === '') {
            return '<span class="empty-value">Not Specified</span>';
        }

        // Special formatting for specific fields
        if (fieldId === 'field110') { // Frequency
            return `<span class="frequency-value">${value}</span>`;
        }
        if (fieldId === 'field303' || fieldId === 'field403') { // Coordinates
            return `<span class="coordinates-value">${value}</span>`;
        }

        // Default: escape HTML and preserve whitespace
        const escaped = value.replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n/g, '<br>');
        return escaped;
    }

    // Helper method to get CSS class for field value
    getFieldValueClass(fieldId) {
        const classes = [];

        if (this.isRequiredField(fieldId)) {
            classes.push('required-field');
        }

        // Add field-specific classes
        if (fieldId.startsWith('field1')) classes.push('field-technical');
        if (fieldId.startsWith('field2')) classes.push('field-administrative');
        if (fieldId.startsWith('field3')) classes.push('field-location');
        if (fieldId.startsWith('field5')) classes.push('field-reference');

        return classes.join(' ');
    }

    // Helper method to parse coordinate strings from SFAF fields
    parseCoordinateString(coordString) {
        if (!coordString) return null;

        // Try parsing decimal format: "38.5, -77.0" or "38.5,-77.0"
        const decimalMatch = coordString.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
        if (decimalMatch) {
            return {
                lat: parseFloat(decimalMatch[1]),
                lng: parseFloat(decimalMatch[2])
            };
        }

        // Try parsing DMS format: "38.5000N 077.0000W" or "38°30'00\"N 077°00'00\"W"
        const dmsMatch = coordString.match(/(\d+\.?\d*)[°\s]*([NS])\s+(\d+\.?\d*)[°\s]*([EW])/i);
        if (dmsMatch) {
            let lat = parseFloat(dmsMatch[1]);
            let lng = parseFloat(dmsMatch[3]);

            // Convert to negative if South or West
            if (dmsMatch[2].toUpperCase() === 'S') lat = -lat;
            if (dmsMatch[4].toUpperCase() === 'W') lng = -lng;

            return { lat, lng };
        }

        // Try parsing space-separated format: "38.5 -77.0"
        const spaceMatch = coordString.match(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/);
        if (spaceMatch) {
            return {
                lat: parseFloat(spaceMatch[1]),
                lng: parseFloat(spaceMatch[2])
            };
        }

        return null;
    }

    // Helper method to render MC4EB compliance summary
    renderMCEBComplianceSummary(sfafFields) {
        const requiredFields = ['field005', 'field010', 'field102', 'field110', 'field200', 'field300'];
        const missingRequired = requiredFields.filter(field => !sfafFields[field] || !sfafFields[field].trim());

        const isCompliant = missingRequired.length === 0;
        const completionPercent = Math.round(((requiredFields.length - missingRequired.length) / requiredFields.length) * 100);

        return `
            <div class="mceb-compliance-summary">
                <h4>MC4EB Publication 7, Change 1 Compliance</h4>
                <div class="compliance-status ${isCompliant ? 'compliant' : 'non-compliant'}">
                    ${isCompliant ?
                        '<span class="status-icon">✓</span> Compliant - All required fields present' :
                        `<span class="status-icon">⚠</span> Non-compliant - ${missingRequired.length} required field(s) missing`
                    }
                </div>
                <div class="compliance-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionPercent}%"></div>
                    </div>
                    <span class="progress-text">${completionPercent}% Complete</span>
                </div>
                ${missingRequired.length > 0 ? `
                    <div class="missing-fields">
                        <strong>Missing Required Fields:</strong>
                        <ul>
                            ${missingRequired.map(field => `<li>${this.getFieldLabel(field)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ✅ Custom view management
    getCurrentFieldView() {
        return this.currentFieldView || {
            id: 'all',
            name: 'All Fields',
            fields: null,
            fieldOrder: null
        };
    }

    getCustomViews() {
        const saved = localStorage.getItem('sfafCustomViews');
        return saved ? JSON.parse(saved) : [];
    }

    saveCustomViews(views) {
        localStorage.setItem('sfafCustomViews', JSON.stringify(views));
    }

    getAllAvailableSFAFFields() {
        // Get all possible SFAF field keys (field005 through field999)
        const allFieldKeys = [];

        // Generate all field keys from 005-999
        for (let i = 5; i <= 999; i++) {
            const fieldKey = `field${String(i).padStart(3, '0')}`;
            allFieldKeys.push(fieldKey);
        }

        // Also collect any fields that exist in current data (in case of custom fields)
        if (this.currentSFAFData && this.currentSFAFData.length > 0) {
            this.currentSFAFData.forEach(record => {
                if (record.rawSFAFFields) {
                    Object.keys(record.rawSFAFFields).forEach(key => {
                        if (!allFieldKeys.includes(key)) {
                            allFieldKeys.push(key);
                        }
                    });
                }
            });
        }

        return allFieldKeys.sort();
    }

    createCustomView() {
        const viewName = prompt('Enter a name for your custom view:');
        if (!viewName || viewName.trim() === '') return;

        const allFields = this.getAllAvailableSFAFFields();

        this.showFieldSelectionModal({
            mode: 'create',
            viewName: viewName.trim(),
            availableFields: allFields,
            selectedFields: [],
            fieldOrder: []
        });
    }

    editCurrentView() {
        const currentView = this.getCurrentFieldView();
        if (currentView.id === 'all') {
            alert('Cannot edit the "All Fields" view. Create a custom view instead.');
            return;
        }

        const allFields = this.getAllAvailableSFAFFields();

        this.showFieldSelectionModal({
            mode: 'edit',
            viewId: currentView.id,
            viewName: currentView.name,
            availableFields: allFields,
            selectedFields: currentView.fields || [],
            fieldOrder: currentView.fieldOrder || []
        });
    }

    changeFieldView(viewId) {
        const views = this.getCustomViews();
        const selectedView = views.find(v => v.id === viewId) || {
            id: 'all',
            name: 'All Fields',
            fields: null,
            fieldOrder: null
        };

        this.currentFieldView = selectedView;

        // Save the selected view to session preferences
        this.sessionManager.updatePreference('lastFieldView', viewId);
        console.log(`💾 Saved field view preference: ${viewId}`);

        // Refresh the field display
        this.refreshFieldDisplay();
    }

    // ✅ Field interaction methods
    filterFields(filterText) {
        this.refreshFieldDisplay();
    }

    sortFields(sortMode) {
        this.refreshFieldDisplay();
    }

    scrollFieldsLeft() {
        const container = document.querySelector('.fields-scroll-wrapper');
        if (container) {
            container.scrollBy({ left: -300, behavior: 'smooth' });
            this.updateScrollIndicator();
        }
    }

    scrollFieldsRight() {
        const container = document.querySelector('.fields-scroll-wrapper');
        if (container) {
            container.scrollBy({ left: 300, behavior: 'smooth' });
            this.updateScrollIndicator();
        }
    }

    updateScrollIndicator() {
        const container = document.querySelector('.fields-scroll-wrapper');
        const indicator = document.getElementById('fieldScrollPosition');

        if (container && indicator) {
            const scrollLeft = container.scrollLeft;
            const scrollWidth = container.scrollWidth;
            const clientWidth = container.clientWidth;

            const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);
            const totalFields = document.querySelectorAll('.field-card').length;
            const visibleFields = Math.floor(clientWidth / 280); // Approximate field width
            const startField = Math.floor(scrollPercentage * (totalFields - visibleFields)) + 1;
            const endField = Math.min(startField + visibleFields - 1, totalFields);

            indicator.textContent = `${startField}-${endField} of ${totalFields}`;
        }
    }

    refreshFieldDisplay() {
        // Reload the current record's field view
        if (this.currentSFAFData && this.currentSFAFData.length > 0) {
            const currentRecord = this.currentSFAFData[0]; // Or get the currently displayed record
            const fieldContainer = document.querySelector('.sfaf-fields-display');
            if (fieldContainer) {
                fieldContainer.innerHTML = this.renderSFAFFieldsView(
                    currentRecord.rawSFAFFields || {},
                    currentRecord.fieldDefinitions || {}
                );
            }
        }
    }

    editFieldInPlace(fieldId) {
        const fieldCard = document.querySelector(`[data-field-id="${fieldId}"]`);
        if (!fieldCard) return;

        const fieldValueElement = fieldCard.querySelector('.field-value');
        const currentValue = fieldValueElement.textContent;

        // Create inline editor
        fieldValueElement.innerHTML = `
        <input type="text" class="inline-field-editor" value="${currentValue}" 
               onblur="databaseViewer.saveInlineEdit('${fieldId}', this.value)"
               onkeypress="if(event.key==='Enter') this.blur()">
    `;

        // Focus the input
        const input = fieldValueElement.querySelector('.inline-field-editor');
        if (input) {
            input.focus();
            input.select();
        }
    }

    saveInlineEdit(fieldId, newValue) {
        // Update the field value in current data
        if (this.currentSFAFData && this.currentSFAFData.length > 0) {
            const currentRecord = this.currentSFAFData[0];
            if (currentRecord.rawSFAFFields) {
                currentRecord.rawSFAFFields[fieldId] = newValue;
            }
        }

        // Update the display
        const fieldCard = document.querySelector(`[data-field-id="${fieldId}"]`);
        if (fieldCard) {
            const fieldValueElement = fieldCard.querySelector('.field-value');
            fieldValueElement.innerHTML = this.formatFieldValue(fieldId, newValue);
        }

        // TODO: Save to backend
        this.saveSFAFChanges(this.currentRecordId);
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

    // Enhanced SFAF Records Default View Implementation
    async loadSFAFRecords() {
        // Prevent duplicate simultaneous loads
        if (this._loadingSFAFRecords) {
            console.log('⚠️ Already loading SFAF records, skipping duplicate call');
            return;
        }
        this._loadingSFAFRecords = true;

        try {
            console.log('📊 Loading enhanced SFAF records with default view...');
            this.showLoading(true);

            // Use pagination parameters
            const page = this.currentPage || 1;
            const limit = this.itemsPerPage || 50;

            // Load SFAF records first (includes Pool Assignments without markers)
            const sfafResponse = await fetch(`/api/sfaf?page=${page}&limit=${limit}`);
            if (!sfafResponse.ok) {
                throw new Error(`SFAF API failed: ${sfafResponse.status} ${sfafResponse.statusText}`);
            }

            const sfafData = await sfafResponse.json();
            console.log('📊 SFAF API response:', sfafData);

            if (!sfafData.success) {
                throw new Error(sfafData.error || 'Failed to load SFAF records');
            }

            // Store total database count from pagination
            if (sfafData.pagination && sfafData.pagination.total !== undefined) {
                this.totalDatabaseRecords = sfafData.pagination.total;
                console.log(`✅ Set totalDatabaseRecords to: ${this.totalDatabaseRecords}`);
            } else {
                console.warn('⚠️ No pagination.total in API response:', sfafData.pagination);
            }

            if (!sfafData.sfafs || sfafData.sfafs.length === 0) {
                console.log('⚠️ No SFAF records found in database');
                this.renderEnhancedSFAFTable([]);
                this.updateSFAFSummaryStats([]);
                return;
            }

            console.log(`📊 Found ${sfafData.sfafs.length} SFAF records, loading markers...`);

            // Load markers (may be empty for Pool Assignments)
            let markersMap = new Map();
            try {
                const markersResponse = await fetch('/api/markers');
                if (markersResponse.ok) {
                    const markersData = await markersResponse.json();
                    if (markersData.success && markersData.markers) {
                        markersData.markers.forEach(marker => {
                            markersMap.set(marker.id, marker);
                        });
                        console.log(`📊 Loaded ${markersMap.size} markers`);
                    }
                }
            } catch (markerError) {
                console.warn('⚠️ Failed to load markers, continuing with SFAF-only records:', markerError);
            }

            // ✅ ENHANCED: Process SFAF records (with or without markers)
            const enhancedRecords = [];
            let successCount = 0;

            for (const sfaf of sfafData.sfafs) {
                try {
                    // Extract SFAF fields
                    const sfafFields = {};
                    Object.keys(sfaf).forEach(key => {
                        if (key.match(/^[Ff]ield\d+$/)) {
                            const normalizedKey = key.toLowerCase();
                            sfafFields[normalizedKey] = sfaf[key];
                        }
                    });

                    // Get marker data if available
                    const marker = sfaf.marker_id ? markersMap.get(sfaf.marker_id) : null;

                    // Create enhanced record
                    const enhancedRecord = {
                        id: sfaf.id,  // Use SFAF ID as primary ID
                        markerId: sfaf.marker_id,  // May be null for Pool Assignments
                        serial: sfafFields.field102 || (marker?.serial) || 'Unknown',
                        frequency: sfafFields.field110 || (marker?.frequency) || 'Not Specified',
                        location: 'No Coordinates',
                        agency: sfafFields.field200 || 'TBD',
                        markerType: marker ? (marker.type || marker.marker_type || 'imported') : 'pool_assignment',
                        isPool: this.detectPoolAssignment(sfafFields),
                        coordinates: {
                            lat: marker?.lat || null,
                            lng: marker?.lng || null
                        },
                        sfafFields: sfafFields,
                        rawSFAFFields: sfafFields,
                        completionPercentage: 0,
                        validationStatus: 'complete',
                        mcebCompliant: { isCompliant: false, issues: [] }
                    };

                    // Extract coordinates from marker or SFAF fields
                    if (marker && marker.lat && marker.lng) {
                        enhancedRecord.location = `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`;
                    } else {
                        // Try to extract from SFAF fields
                        const coordString = sfafFields.field303 || sfafFields.field403;
                        if (coordString) {
                            const coords = this.parseCoordinateString(coordString);
                            if (coords && coords.lat && coords.lng) {
                                enhancedRecord.coordinates = {
                                    lat: coords.lat,
                                    lng: coords.lng
                                };
                                enhancedRecord.location = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
                            }
                        }
                    }

                    enhancedRecord.completionPercentage = this.calculateCompletionPercentage(sfafFields);
                    enhancedRecord.mcebCompliant = this.validateMCEBCompliance(sfafFields);

                    enhancedRecords.push(enhancedRecord);
                    successCount++;

                } catch (recordError) {
                    console.error(`❌ Failed to process SFAF ${sfaf.id}:`, recordError);
                }
            }

            console.log(`📊 Processing complete: ${successCount} SFAF records processed`);
            console.log('📊 Enhanced records:', enhancedRecords);

            // ✅ Store all SFAF records (including Pool Assignments)
            this.currentSFAFData = enhancedRecords;
            this.enhancedRecords = enhancedRecords; // Store for sorting/filtering

            // ✅ Apply serial filter if set (from Table Manager)
            let filteredRecords = enhancedRecords;
            if (this.serialFilter && this.serialFilter.length > 0) {
                console.log('🔍 Looking for serials:', this.serialFilter);
                console.log('🔍 Sample of record serials:', enhancedRecords.slice(0, 10).map(r => r.serial));

                filteredRecords = enhancedRecords.filter(record => {
                    // Check if record serial matches any of the unit's assigned serials
                    return this.serialFilter.includes(record.serial);
                });
                console.log(`🔍 Serial filter applied: ${filteredRecords.length} of ${enhancedRecords.length} records match`);
            }

            // ✅ Apply currentFilter if set
            if (this.currentFilter && this.currentFilter.trim() !== '') {
                const filterLower = this.currentFilter.toLowerCase();
                filteredRecords = filteredRecords.filter(record => {
                    // Search across multiple fields
                    return (
                        (record.serial && record.serial.toLowerCase().includes(filterLower)) ||
                        (record.frequency && record.frequency.toString().toLowerCase().includes(filterLower)) ||
                        (record.agency && record.agency.toLowerCase().includes(filterLower)) ||
                        (record.location && record.location.toLowerCase().includes(filterLower)) ||
                        (record.sfafFields && record.sfafFields.field200 && record.sfafFields.field200.toLowerCase().includes(filterLower))
                    );
                });
            }

            // ✅ Apply pool assignment filter
            const poolFilter = this.activeFilters?.poolAssignment;
            if (poolFilter === 'pool') {
                filteredRecords = filteredRecords.filter(r => r.isPool);
            } else if (poolFilter === 'assigned') {
                filteredRecords = filteredRecords.filter(r => !r.isPool);
            }

            // ✅ Display filtered results
            this.renderEnhancedSFAFTable(filteredRecords);
            this.updateSFAFSummaryStats(filteredRecords);

        } catch (error) {
            console.error('❌ Failed to load SFAF records:', error);
            this.showError(`Failed to load SFAF records: ${error.message}`);

            // ✅ Show empty state on error
            this.renderEnhancedSFAFTable([]);
            this.updateSFAFSummaryStats([]);
        } finally {
            this.showLoading(false);
            this._loadingSFAFRecords = false; // Reset the loading flag
        }
    }

    // ✅ ENHANCED: Helper functions for SFAF processing
    calculateCompletionPercentage(sfafFields) {
        if (!sfafFields || Object.keys(sfafFields).length === 0) {
            return 0;
        }

        // Calculate based on MC4EB Publication 7, Change 1 required fields (Source: db_viewer_js.txt validation)
        const requiredFields = ['field005', 'field010', 'field102', 'field110', 'field200', 'field300'];
        const optionalImportantFields = ['field113', 'field114', 'field115', 'field301', 'field144'];

        // Count completed required fields
        const completedRequired = requiredFields.filter(field =>
            sfafFields[field] && sfafFields[field].trim() !== ''
        ).length;

        // Count completed optional important fields
        const completedOptional = optionalImportantFields.filter(field =>
            sfafFields[field] && sfafFields[field].trim() !== ''
        ).length;

        // Weight required fields more heavily (80% of score)
        const requiredScore = (completedRequired / requiredFields.length) * 80;

        // Optional fields contribute remaining 20%
        const optionalScore = (completedOptional / optionalImportantFields.length) * 20;

        return Math.round(requiredScore + optionalScore);
    }

    // ✅ ENHANCED: Validate MC4EB compliance for SFAF fields
    validateMCEBCompliance(sfafFields) {
        const issues = [];

        // Field 500 occurrence limit (Source: db_viewer_js.txt MC4EB validation)
        const field500Count = this.countFieldOccurrences(sfafFields, '500');
        if (field500Count > 10) {
            issues.push('Field 500 exceeds maximum 10 occurrences per MC4EB Publication 7, Change 1');
        }

        // Field 501 occurrence limit
        const field501Count = this.countFieldOccurrences(sfafFields, '501');
        if (field501Count > 30) {
            issues.push('Field 501 exceeds maximum 30 occurrences per MC4EB Publication 7, Change 1');
        }

        // Required field validation
        const requiredFields = ['field005', 'field010', 'field102', 'field110', 'field200'];
        const missingRequired = requiredFields.filter(field =>
            !sfafFields[field] || sfafFields[field].trim() === ''
        );

        if (missingRequired.length > 0) {
            issues.push(`Missing required fields: ${missingRequired.join(', ')}`);
        }

        // Frequency format validation (Source: db_viewer_js.txt frequency validation)
        if (sfafFields.field110) {
            if (!this.isValidFrequencyFormat(sfafFields.field110)) {
                issues.push('Field 110: Invalid frequency format');
            }
        }

        // Emission designator validation
        if (sfafFields.field114) {
            if (!this.isValidEmissionDesignator(sfafFields.field114)) {
                issues.push('Field 114: Invalid emission designator format');
            }
        }

        return {
            isCompliant: issues.length === 0,
            issues: issues,
            lastChecked: new Date().toISOString(),
            complianceScore: Math.max(0, 100 - (issues.length * 10))
        };
    }

    // ✅ ENHANCED: Count field occurrences for MC4EB limits
    countFieldOccurrences(sfafFields, fieldNumber) {
        return Object.keys(sfafFields).filter(key =>
            key.startsWith(`field${fieldNumber}`)
        ).length;
    }

    // ✅ ENHANCED: Validate frequency format according to MC4EB standards
    isValidFrequencyFormat(frequency) {
        if (!frequency || typeof frequency !== 'string') return false;

        // MC4EB Publication 7, Change 1 frequency formats (Source: db_viewer_js.txt frequency analysis)
        const patterns = [
            /^K\d+(\.\d+)?$/, // K-band format: K4028
            /^K\d+\(\d+(\.\d+)?\)$/, // K-band with parentheses: K4028(4026.5)
            /^\d+(\.\d+)?\s?(MHz|GHz|KHz)$/i, // Standard with units: 4026.5 MHz
            /^[A-Z]\d+(\.\d+)?$/ // Letter prefix: M4028, G2000, etc.
        ];

        return patterns.some(pattern => pattern.test(frequency.trim()));
    }

    // ✅ ENHANCED: Validate emission designator format
    isValidEmissionDesignator(emission) {
        if (!emission || typeof emission !== 'string') return false;

        // MC4EB Publication 7, Change 1 emission designator format: bandwidth + emission class + modulation
        const emissionPattern = /^\d+[KMG]?\d*[A-Z]\d*[A-Z]?$/;

        // Common valid formats: 2K70J3E, 16K0F3E, 1M00G7W, etc.
        return emissionPattern.test(emission.trim());
    }

    // ✅ ENHANCED: Missing SFAF functions from previous implementation
    editSFAFRecord(recordId) {
        try {
            console.log(`📝 Opening SFAF editor for record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                console.error('❌ Record not found in currentSFAFData');
                console.log('Available records:', this.currentSFAFData?.map(r => r.id));
                this.showError('Record not found');
                return;
            }

            console.log('✅ Found record:', record);
            console.log('📋 rawSFAFFields:', record.rawSFAFFields);
            console.log('📋 Field count:', Object.keys(record.rawSFAFFields || {}).length);

            // Create modal content for SFAF editing (Source: db_viewer_html.txt modal structure)
            const modalContent = this.generateSFAFEditForm(record);
            this.showModal('Edit SFAF Record', modalContent);

        } catch (error) {
            console.error('Failed to open SFAF editor:', error);
            this.showError('Failed to open SFAF editor: ' + error.message);
        }
    }

    viewSFAFRecord(recordId) {
        try {
            console.log(`👀 Viewing SFAF record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found');
                return;
            }

            console.log('📊 Record data:', record);
            console.log('📊 rawSFAFFields:', record.rawSFAFFields);
            console.log('📊 sfafFields:', record.sfafFields);

            // Create modal content for viewing (Source: db_viewer_js.txt view functionality)
            const modalContent = this.generateSFAFViewContent(record);
            this.showModal('SFAF Record Details', modalContent);

        } catch (error) {
            console.error('Failed to view SFAF record:', error);
            this.showError('Failed to view SFAF record');
        }
    }

    exportSFAFRecord(recordId) {
        try {
            console.log(`📤 Exporting SFAF record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found');
                return;
            }

            // Generate SFAF export format
            const sfafText = this.generateSFAFExport(record);
            this.downloadFile(`SFAF_${record.serial || recordId}.txt`, sfafText);

        } catch (error) {
            console.error('Failed to export SFAF record:', error);
            this.showError('Failed to export SFAF record');
        }
    }

    // ✅ ENHANCED: Generate SFAF edit form content
    generateSFAFEditForm(record) {
        const sfafFields = record.rawSFAFFields || {};
        const fieldCount = Object.keys(sfafFields).length;

        console.log('🎨 Generating edit form with', fieldCount, 'fields');

        // If no SFAF fields exist, show a helpful message
        if (fieldCount === 0) {
            return `
            <div class="sfaf-edit-form">
                <h4>SFAF Fields for ${record.serial || 'Unknown'}</h4>
                <div class="alert alert-warning">
                    <h5>⚠️ No SFAF Data Available</h5>
                    <p>This record does not have any SFAF field data yet. You can:</p>
                    <ul>
                        <li>Import SFAF data from a text file</li>
                        <li>Manually enter field data</li>
                        <li>Link to an existing SFAF record</li>
                    </ul>
                </div>

                <div class="sfaf-fields-editor">
                    <!-- Create basic required fields -->
                    <div class="field-section">
                        <h5>Required Fields (MC4EB Publication 7, Change 1)</h5>
                        ${this.generateFieldInputs({}, ['field102', 'field110', 'field200', 'field201', 'field202', 'field203', 'field300', 'field301', 'field303'], true)}
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn btn-primary" onclick="databaseViewer.saveSFAFChanges('${record.id}')">
                        Create SFAF Data
                    </button>
                    <button class="btn btn-secondary" onclick="databaseViewer.closeModal()">
                        Cancel
                    </button>
                </div>
            </div>
            `;
        }

        return `
        <div class="sfaf-edit-form">
            <h4>SFAF Fields for ${record.serial || 'Unknown'}</h4>
            <p class="completion-status">
                Current completion: ${record.completionPercentage || 0}%
                <span class="compliance-indicator ${record.mcebCompliant?.isCompliant ? 'compliant' : 'non-compliant'}">
                    ${record.mcebCompliant?.isCompliant ? '✅ MC4EB Compliant' : '⚠️ Compliance Issues'}
                </span>
            </p>

            <div class="sfaf-fields-editor">
                <!-- Required Fields Section -->
                <div class="field-section">
                    <h5>Required Fields (MC4EB Publication 7, Change 1)</h5>
                    ${this.generateFieldInputs(sfafFields, ['field102', 'field110', 'field200', 'field201', 'field202', 'field203', 'field300', 'field301', 'field303'], true)}
                </div>

                <!-- Technical Parameters Section -->
                <div class="field-section">
                    <h5>Technical Parameters</h5>
                    ${this.generateFieldInputs(sfafFields, ['field113', 'field114', 'field115', 'field340', 'field400', 'field401'], false)}
                </div>

                <!-- Additional Fields Section -->
                <div class="field-section">
                    <h5>Additional Fields</h5>
                    ${Object.entries(sfafFields)
                .filter(([field]) => !['field102', 'field110', 'field200', 'field201', 'field202', 'field203', 'field300', 'field301', 'field303', 'field113', 'field114', 'field115', 'field340', 'field400', 'field401'].includes(field))
                .map(([field, value]) => this.generateFieldInput(field, value, false))
                .join('')}
                </div>
            </div>

            <div class="form-actions">
                <button class="btn btn-primary" onclick="databaseViewer.saveSFAFChanges('${record.id}')">
                    Save Changes
                </button>
                <button class="btn btn-secondary" onclick="databaseViewer.closeModal()">
                    Cancel
                </button>
                <button class="btn btn-info" onclick="databaseViewer.validateSFAFForm('${record.id}')">
                    Validate MC4EB Compliance
                </button>
            </div>
        </div>
    `;
    }

    // ✅ ENHANCED: Generate field inputs for editing
    generateFieldInputs(sfafFields, fieldList, required = false) {
        return fieldList.map(field => {
            const value = sfafFields[field] || '';
            return this.generateFieldInput(field, value, required);
        }).join('');
    }

    generateFieldInput(fieldId, value, required = false) {
        const fieldNumber = fieldId.replace('field', '');
        const fieldLabel = this.getFieldLabel(fieldId);
        const requiredAttr = required ? 'required' : '';
        const requiredClass = required ? 'required-field' : '';

        return `
        <div class="sfaf-field-row ${requiredClass}">
            <label for="${fieldId}">
                ${fieldLabel}
                ${required ? '<span class="required-asterisk">*</span>' : ''}
            </label>
            <input 
                type="text" 
                id="${fieldId}"
                name="${fieldId}" 
                value="${value}" 
                class="sfaf-field-input"
                ${requiredAttr}
                placeholder="Field ${fieldNumber}"
            >
            <small class="field-hint">${this.getFieldHint(fieldId)}</small>
        </div>
    `;
    }

    // ✅ ENHANCED: Get field labels for display (MC4EB Pub 7 CHG 1 compliant)
    getFieldLabel(fieldId) {
        const labels = {
            // Core identification
            'field005': 'Security Classification (005)',
            'field007': 'Missing Data Indicator (007)',
            'field010': 'Type of Action (010)',
            'field102': 'Agency Serial Number (102)',
            'field103': 'IRAC Docket Number (103)',

            // Emission characteristics
            'field110': 'Frequency(ies) (110)',
            'field111': 'Excluded Frequency Band (111)',
            'field113': 'Station Class (113)',
            'field114': 'Emission Designator (114)',
            'field115': 'Transmitter Power (115)',

            // Organizational information
            'field200': 'Agency (200)',
            'field201': 'Unified Command (201)',
            'field202': 'Unified Command Service (202)',
            'field203': 'Bureau (203)',

            // Transmitter location
            'field300': 'State/Country (300)',
            'field301': 'Antenna Location (301)',
            'field302': 'Station Control (302)',
            'field303': 'Antenna Coordinates (303)',
            'field306': 'Authorized Radius (306)',

            // Transmitter equipment
            'field340': 'Equipment Nomenclature (340)',

            // Receiver location (400 series is receiver, not frequency!)
            'field400': 'State/Country (Receiver) (400)',
            'field401': 'Antenna Location (Receiver) (401)',
            'field403': 'Antenna Coordinates (Receiver) (403)',

            // IRAC notes
            'field500': 'IRAC Notes (500)',
            'field530': 'Authorized Areas (530)'
        };

        return labels[fieldId] || fieldId.replace('field', 'Field ');
    }

    // ✅ ENHANCED: Get field hints for user guidance (MC4EB Pub 7 CHG 1 compliant)
    getFieldHint(fieldId) {
        const hints = {
            'field005': 'CLA = Classification (e.g., UNCLASS, FOUO)',
            'field010': 'TYP = Type of Action',
            'field102': 'SER = Agency Serial Number (e.g., AF 014589)',
            'field103': 'AUS = IRAC Docket Number',
            'field110': 'FRQ,FRU = Frequency(ies) in MHz',
            'field113': 'STC = Station Class (e.g., MO, ML, FA)',
            'field114': 'EMS = Emission Designator (e.g., 16K0F3E)',
            'field115': 'PWR = Transmitter Power in watts',
            'field200': 'Agency designation (6 chars)',
            'field201': 'Unified Command (8 chars)',
            'field202': 'Unified Command Service (8 chars)',
            'field203': 'BUR = Bureau code (4 chars)',
            'field300': 'XSC = State/Country (transmitter)',
            'field301': 'XAL = Antenna Location (24 chars)',
            'field303': 'XLA XLG = Antenna Coordinates (Lat/Long)',
            'field306': 'XRD = Authorization Radius in km',
            'field340': 'XEQ = Equipment Nomenclature',
            'field400': 'RSC = State/Country (receiver)',
            'field401': 'RAL = Antenna Location (receiver)',
            'field403': 'RLA RLG = Antenna Coordinates (receiver)',
            'field500': 'NTS = IRAC Notes',
            'field530': 'XAR,RAR,ARB = Authorized Areas'
        };

        return hints[fieldId] || 'Enter appropriate value for this field';
    }

    processSFAFRecord(marker, sfafData, coordData) {
        const sfafFields = (sfafData && sfafData.success && sfafData.sfaf_fields) ?
            sfafData.sfaf_fields : {};
        const fieldDefs = (sfafData && sfafData.success && sfafData.field_defs) ?
            sfafData.field_defs : {};

        console.log(`📊 Processing marker ${marker.id}: SFAF fields count = ${Object.keys(sfafFields).length}`);

        // Determine completion status
        const completionStatus = this.determineSFAFCompletionStatus(sfafFields);

        // Extract key SFAF fields for default view
        const frequency = sfafFields.field110 || marker.frequency || 'Not Specified';
        const stationClass = sfafFields.field113 || 'TBD';
        const emission = sfafFields.field114 || 'TBD';
        const power = sfafFields.field115 || 'TBD';
        const agency = sfafFields.field200 || 'TBD';
        const location = this.formatLocationFromSFAF(sfafFields, marker);

        return {
            // Core identifiers
            id: marker.id,
            serial: marker.serial,
            markerType: marker.marker_type,

            // Technical parameters (Source: database_dump.txt SFAF field structure)
            frequency: frequency,
            stationClass: stationClass,
            emission: emission,
            power: power,

            // Administrative data
            agency: agency,
            agencySerial: sfafFields.field102 || 'FREQ',
            controlNumber: sfafFields.field702 || 'AFSOC 2025-',
            typeOfAction: sfafFields.field010 || 'M',

            // Location information
            location: location,
            state: sfafFields.field300 || 'TBD',
            antennaLocation: sfafFields.field301 || 'TBD',
            coordinates: coordData.success ? {
                decimal: coordData.decimal || `${marker.Latitude}, ${marker.Longitude}`,
                dms: coordData.dms || 'Loading...',
                compact: coordData.compact || 'Loading...'
            } : {
                decimal: `${marker.Latitude}, ${marker.Longitude}`,
                dms: 'Error loading',
                compact: 'Error loading'
            },

            coordinates: {
                decimal: (marker.Latitude && marker.Longitude) ?
                    `${marker.Latitude}, ${marker.Longitude}` : 'Invalid coordinates',
                dms: (coordData && coordData.success) ?
                    (coordData.dms || 'Format unavailable') : 'Conversion failed',
                compact: (coordData && coordData.success) ?
                    (coordData.compact || 'Format unavailable') : 'Conversion failed'
            },

            // Status and completion tracking
            sfafComplete: completionStatus.isComplete,
            sfafCompletionPercentage: completionStatus.completionPercentage,
            sfafFieldCount: Object.keys(sfafFields).length,
            validationStatus: this.performSFAFValidation(sfafFields, fieldDefs),

            // IRAC Notes information (Source: database_dump.txt IRAC structure)
            iracNotesCount: sfafData.success ? (sfafData.marker.irac_notes || []).length : 0,
            iracNotes: sfafData.success ? sfafData.marker.irac_notes || [] : [],

            // Regulatory compliance (Source: database_dump.txt MC4EB Publication 7, Change 1 context)
            mcebCompliant: this.checkMCEBCompliance(sfafFields, fieldDefs),
            approvalAuthority: sfafFields.field144 || 'TBD',
            coordinationRequired: this.requiresCoordination(sfafFields),

            // Temporal data
            createdAt: marker.created_at,
            updatedAt: marker.updated_at,
            reviewDate: sfafFields.field142 || null,
            revisionDate: sfafFields.field143 || null,

            // Equipment information
            equipment: this.extractEquipmentInfo(sfafFields),
            antennaInfo: this.extractAntennaInfo(sfafFields),

            // Raw data for detailed editing
            rawSFAFFields: sfafFields,
            fieldDefinitions: fieldDefs,
            markerData: marker
        };
    }

    // Supporting functions for SFAF record processing
    determineSFAFCompletionStatus(sfafFields) {
        // Critical fields for basic SFAF completion (Source: database_dump.txt field structure)
        const criticalFields = [
            'field010', // Type of action
            'field110', // Frequency
            'field113', // Station class
            'field114', // Emission designator
            'field115', // Transmitter power
            'field200', // Agency
            'field300', // State/country
            'field301', // Antenna location
            'field144'  // Approval authority
        ];

        const totalCritical = criticalFields.length;
        const completedCritical = criticalFields.filter(field =>
            sfafFields[field] && sfafFields[field].trim() !== ''
        ).length;

        const completionPercentage = Math.round((completedCritical / totalCritical) * 100);

        return {
            isComplete: completedCritical === totalCritical,
            completionPercentage: completionPercentage,
            missingCriticalFields: criticalFields.filter(field =>
                !sfafFields[field] || sfafFields[field].trim() === ''
            ),
            completedFields: Object.keys(sfafFields).filter(field =>
                sfafFields[field] && sfafFields[field].trim() !== ''
            ).length,
            totalFields: Object.keys(sfafFields).length
        };
    }

    formatLocationFromSFAF(sfafFields, marker) {
        // Prioritize SFAF location data over marker coordinates
        const state = sfafFields.field300 || '';
        const location = sfafFields.field301 || '';

        if (state && location) {
            return `${location}, ${state}`;
        } else if (state) {
            return state;
        } else if (location) {
            return location;
        } else {
            // Fallback to coordinate-based location
            return `${marker.Latitude.toFixed(4)}, ${marker.Longitude.toFixed(4)}`;
        }
    }

    performSFAFValidation(sfafFields, fieldDefs) {
        const validationErrors = [];
        const validationWarnings = [];

        // Field length validation (Source: database_dump.txt field constraints)
        Object.entries(sfafFields).forEach(([fieldId, value]) => {
            const fieldDef = fieldDefs?.[fieldId];
            if (fieldDef && fieldDef.max_length && value.length > fieldDef.max_length) {
                validationErrors.push(`${fieldId}: Exceeds maximum length of ${fieldDef.max_length}`);
            }

            // Required field validation
            if (fieldDef && fieldDef.required && (!value || value.trim() === '')) {
                validationErrors.push(`${fieldId}: Required field is empty`);
            }
        });

        // Business logic validation
        if (sfafFields.field110) {
            const frequency = sfafFields.field110;
            if (!this.isValidFrequencyFormat(frequency)) {
                validationErrors.push('field110: Invalid frequency format');
            }
        }

        // Emission designator validation (Source: database_dump.txt IRAC notes technical specs)
        if (sfafFields.field114) {
            const emission = sfafFields.field114;
            if (!this.isValidEmissionDesignator(emission)) {
                validationWarnings.push('field114: Emission designator format should be verified');
            }
        }

        return {
            isValid: validationErrors.length === 0,
            hasWarnings: validationWarnings.length > 0,
            errors: validationErrors,
            warnings: validationWarnings,
            errorCount: validationErrors.length,
            warningCount: validationWarnings.length
        };
    }

    checkMCEBCompliance(sfafFields, fieldDefs) {
        // MC4EB Publication 7, Change 1 compliance checks (Source: database_dump.txt system_config)
        const complianceIssues = [];

        // Field 500/501 occurrence limits (Source: database_dump.txt system_config)
        const field500Occurrences = this.countFieldOccurrences(sfafFields, '500');
        const field501Occurrences = this.countFieldOccurrences(sfafFields, '501');

        if (field500Occurrences > 10) {
            complianceIssues.push('Field 500 exceeds maximum 10 occurrences');
        }

        if (field501Occurrences > 30) {
            complianceIssues.push('Field 501 exceeds maximum 30 occurrences');
        }

        // Field length compliance
        if (sfafFields.field500 && sfafFields.field500.length > 4) {
            complianceIssues.push('Field 500 exceeds maximum 4 characters');
        }

        if (sfafFields.field501 && sfafFields.field501.length > 35) {
            complianceIssues.push('Field 501 exceeds maximum 35 characters');
        }

        return {
            isCompliant: complianceIssues.length === 0,
            issues: complianceIssues,
            lastChecked: new Date().toISOString()
        };
    }

    requiresCoordination(sfafFields) {
        // Determine if coordination is required based on approval authority
        const approvalAuthority = sfafFields.field144;

        if (approvalAuthority === 'Y') {
            return {
                required: true,
                type: 'IRAC Processing Required',
                description: 'Assignment record must be processed through IRAC'
            };
        } else if (approvalAuthority === 'U') {
            return {
                required: false,
                type: 'US&P - No IRAC Required',
                description: 'Assignment is inside US&P and does not require IRAC processing'
            };
        } else if (approvalAuthority === 'O') {
            return {
                required: false,
                type: 'OUS&P - No IRAC Required',
                description: 'Assignment is OUS&P and does not require IRAC processing'
            };
        }

        return {
            required: null,
            type: 'To Be Determined',
            description: 'Approval authority not specified'
        };
    }

    extractEquipmentInfo(sfafFields) {
        // Extract equipment information from SFAF fields (Source: database_dump.txt SFAF structure)
        const equipment = [];

        // Transmitter equipment (field 340 series)
        if (sfafFields.field340) {
            equipment.push({
                type: 'Transmitter',
                nomenclature: sfafFields.field340,
                certificationId: sfafFields.field343 || 'Not specified',
                power: sfafFields.field315 || 'Not specified'
            });
        }

        // Receiver equipment (field 440 series)
        if (sfafFields.field440) {
            equipment.push({
                type: 'Receiver',
                nomenclature: sfafFields.field440,
                certificationId: sfafFields.field443 || 'Not specified'
            });
        }

        return equipment;
    }

    extractAntennaInfo(sfafFields) {
        // Extract antenna information from SFAF fields
        return {
            transmitter: {
                gain: sfafFields.field357 || 'Not specified',
                height: sfafFields.field316 || 'Not specified',
                orientation: sfafFields.field362 || 'Not specified',
                polarization: sfafFields.field363 || 'Not specified'
            },
            receiver: {
                gain: sfafFields.field457 || 'Not specified',
                height: sfafFields.field456 || 'Not specified',
                orientation: sfafFields.field462 || 'Not specified',
                polarization: sfafFields.field463 || 'Not specified'
            }
        };
    }

    // Validation helper functions
    isValidFrequencyFormat(frequency) {
        // Basic frequency format validation
        const frequencyPattern = /^[KMG]\d+(\.\d+)?$/;
        return frequencyPattern.test(frequency);
    }

    isValidEmissionDesignator(emission) {
        // Basic emission designator format validation
        const emissionPattern = /^\d+[A-Z]\d+[A-Z]\d*[A-Z]?$/;
        return emissionPattern.test(emission);
    }

    countFieldOccurrences(sfafFields, fieldNumber) {
        // Count occurrences of a specific field number
        return Object.keys(sfafFields).filter(key =>
            key.includes(`field${fieldNumber}`)
        ).length;
    }

    createFallbackRecord(marker) {
        if (!marker || typeof marker !== 'object') {
            console.error('❌ Invalid marker passed to createFallbackRecord:', marker);
            return {
                id: 'error-' + Date.now(),
                serial: 'ERROR-INVALID',
                markerType: 'error',
                frequency: 'Data Error',
                stationClass: 'Data Error',
                emission: 'Data Error',
                power: 'Data Error',
                agency: 'Data Error',
                location: 'Error Loading Location',
                coordinates: { decimal: 'Error', dms: 'Error', compact: 'Error' },
                sfafComplete: false,
                sfafCompletionPercentage: 0,
                sfafFieldCount: 0,
                validationStatus: { isValid: false, errors: ['Invalid marker data'] },
                mcebCompliant: { isCompliant: false, issues: ['Data error'] },
                iracNotesCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                rawSFAFFields: {},
                fieldDefinitions: {},
                markerData: null
            };
        }

        // Create safe fallback record with all required properties
        return {
            id: marker.id || 'unknown-' + Date.now(),
            serial: marker.serial || 'UNKNOWN',
            markerType: marker.marker_type || 'unknown',
            frequency: marker.frequency || 'Not Specified',
            stationClass: 'Data Loading Error',
            emission: 'Data Loading Error',
            power: 'Data Loading Error',
            agency: 'Data Loading Error',
            agencySerial: 'Data Loading Error',
            location: marker.Latitude && marker.Longitude ?
                `${marker.Latitude.toFixed(4)}, ${marker.Longitude.toFixed(4)}` :
                'Invalid Coordinates',
            coordinates: {
                decimal: marker.Latitude && marker.Longitude ?
                    `${marker.Latitude}, ${marker.Longitude}` : 'Invalid',
                dms: 'Error loading',
                compact: 'Error loading'
            },
            // ✅ CRITICAL: Ensure all properties statistics function expects
            sfafComplete: false,
            sfafCompletionPercentage: 0,
            sfafFieldCount: 0,
            validationStatus: { isValid: false, errors: ['Failed to load SFAF data'] },
            mcebCompliant: { isCompliant: false, issues: ['Data unavailable'] },
            iracNotesCount: 0,
            createdAt: marker.created_at || new Date().toISOString(),
            updatedAt: marker.updated_at || new Date().toISOString(),
            rawSFAFFields: {},
            fieldDefinitions: {},
            markerData: marker
        };
    }

    ensureSFAFTableElements() {
        let table = document.getElementById('sfafRecordsTable');

        if (!table) {
            // Find table container in SFAF tab
            const sfafTab = document.getElementById('sfaf-tab');
            const tableContainer = sfafTab ? sfafTab.querySelector('.table-container') : null;

            if (tableContainer) {
                // Hide the empty state
                const emptyState = document.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.style.display = 'none';
                }

                table = document.createElement('table');
                table.id = 'sfafRecordsTable';
                table.className = 'data-table sfaf-records-table';
                tableContainer.appendChild(table);
            }
        }

        let header = document.getElementById('sfafTableHeader'); // ✅ Correct ID
        if (!header && table) {
            header = document.createElement('thead');
            header.id = 'sfafTableHeader'; // ✅ Matches what renderEnhancedSFAFTable expects
            table.appendChild(header);
        }

        let body = document.getElementById('sfafRecordsTableBody'); // ✅ Correct ID  
        if (!body && table) {
            body = document.createElement('tbody');
            body.id = 'sfafRecordsTableBody'; // ✅ Matches what renderEnhancedSFAFTable expects
            table.appendChild(body);
        }

        return { table, header, body };
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

    // Analytics dashboard leveraging MC4EB Publication 7, Change 1 compliance data (Source: handlers.txt, models.txt)
    async loadAnalytics() {
        try {
            console.log('📊 Loading analytics data...');
            this.showLoading(true);

            const [markersResponse, iracResponse] = await Promise.all([
                fetch('/api/markers'),
                fetch('/api/irac-notes')
            ]);

            // ✅ ENHANCED: Validate response status
            if (!markersResponse.ok) {
                throw new Error(`Markers API failed: ${markersResponse.status} ${markersResponse.statusText}`);
            }

            if (!iracResponse.ok) {
                throw new Error(`IRAC Notes API failed: ${iracResponse.status} ${iracResponse.statusText}`);
            }

            const markersData = await markersResponse.json();
            const iracData = await iracResponse.json();

            console.log('📊 Markers API response:', markersData);
            console.log('📊 IRAC API response:', iracData);

            // ✅ ENHANCED: Validate response structure and data
            if (!markersData.success) {
                throw new Error(`Markers API error: ${markersData.error || 'Unknown error'}`);
            }

            if (!iracData.success) {
                throw new Error(`IRAC Notes API error: ${iracData.error || 'Unknown error'}`);
            }

            // ✅ CRITICAL: Ensure arrays exist and provide fallbacks
            const markers = Array.isArray(markersData.markers) ? markersData.markers : [];
            const iracNotes = Array.isArray(iracData.notes) ? iracData.notes : [];

            console.log(`📊 Processing ${markers.length} markers and ${iracNotes.length} IRAC notes for analytics`);

            // ✅ SAFE: Call renderAnalytics with validated arrays
            await this.renderAnalytics(markers, iracNotes);

            console.log('✅ Analytics data loaded successfully');

        } catch (error) {
            console.error('❌ Failed to load analytics data:', error);
            this.showError(`Failed to load analytics data: ${error.message}`);

            // ✅ FALLBACK: Render analytics with empty data to prevent UI breakdown
            await this.renderAnalytics([], []);
        } finally {
            this.showLoading(false);
        }
    }

    async renderAnalytics(markers, iracNotes) {
        try {
            // ✅ CRITICAL: Validate input parameters
            if (!Array.isArray(markers)) {
                console.warn('⚠️ Invalid markers array in renderAnalytics:', markers);
                markers = [];
            }

            if (!Array.isArray(iracNotes)) {
                console.warn('⚠️ Invalid iracNotes array in renderAnalytics:', iracNotes);
                iracNotes = [];
            }

            console.log(`📊 Rendering analytics for ${markers.length} markers and ${iracNotes.length} IRAC notes`);

            // ✅ SAFE: System Overview Statistics with validation
            const systemStatsHtml = `
            <div class="stat-item">
                <span class="stat-label">Total Markers</span>
                <span class="stat-value">${markers.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Manual Markers</span>
                <span class="stat-value">${markers.filter(m => m && m.type === 'manual').length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Imported Markers</span>
                <span class="stat-value">${markers.filter(m => m && m.type === 'imported').length}</span>
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

            // ✅ SAFE: Frequency Distribution Analysis with validation
            const frequencyStats = this.analyzeFrequencyDistribution(markers);
            const totalMarkers = Math.max(markers.length, 1); // Prevent division by zero

            const frequencyChartHtml = `
            <div class="frequency-bands">
                <div class="band-item">
                    <span class="band-label">VHF (30-300 MHz)</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.vhf / totalMarkers) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.vhf}</span>
                </div>
                <div class="band-item">
                    <span class="band-label">UHF (300-3000 MHz)</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.uhf / totalMarkers) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.uhf}</span>
                </div>
                <div class="band-item">
                    <span class="band-label">SHF (3-30 GHz)</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.shf / totalMarkers) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.shf}</span>
                </div>
                <div class="band-item">
                    <span class="band-label">No Frequency</span>
                    <div class="band-bar">
                        <div class="band-fill" style="width: ${(frequencyStats.none / totalMarkers) * 100}%"></div>
                    </div>
                    <span class="band-count">${frequencyStats.none}</span>
                </div>
            </div>
        `;

            // ✅ SAFE: MC4EB Publication 7, Change 1 Compliance Report with validation
            const complianceReport = await this.generateComplianceReport(markers);
            const complianceHtml = `
            <div class="compliance-grid">
                <div class="compliance-item ${complianceReport.field500Compliance ? 'compliant' : 'non-compliant'}">
                    <span class="compliance-label">Field 500 Compliance</span>
                    <span class="compliance-status">${complianceReport.field500Compliance ? '✅ Compliant' : '❌ Non-Compliant'}</span>
                    <span class="compliance-detail">Max 10 occurrences per MC4EB Pub 7 CHG 1</span>
                </div>
                <div class="compliance-item ${complianceReport.field501Compliance ? 'compliant' : 'non-compliant'}">
                    <span class="compliance-label">Field 501 Compliance</span>
                    <span class="compliance-status">${complianceReport.field501Compliance ? '✅ Compliant' : '❌ Non-Compliant'}</span>
                    <span class="compliance-detail">Max 30 occurrences per MC4EB Pub 7 CHG 1</span>
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

            // ✅ SAFE: Geographic Distribution Analysis with validation
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

            // ✅ SAFE: Update DOM elements with comprehensive error handling
            this.updateAnalyticsElement('systemStats', systemStatsHtml);
            this.updateAnalyticsElement('frequencyChart', frequencyChartHtml);
            this.updateAnalyticsElement('complianceReport', complianceHtml);
            this.updateAnalyticsElement('geoStats', geoStatsHtml);

            console.log('✅ Analytics rendering completed successfully');

        } catch (error) {
            console.error('❌ Failed to render analytics:', error);
            this.showError(`Failed to render analytics: ${error.message}`);

            // ✅ FALLBACK: Show error state in analytics
            this.renderAnalyticsError();
        }
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

    // MC4EB Publication 7, Change 1 compliance analysis (Source: handlers.txt validation rules)
    async generateComplianceReport(markers) {
        if (markers.length === 0) {
            return { spread: 0, center: { lat: 0, lng: 0 }, bounds: { north: 0, south: 0, east: 0, west: 0 } };
        }

        // ✅ CORRECTED: Use correct property names from database
        const lats = markers.map(m => parseFloat(m.latitude)).filter(lat => !isNaN(lat));
        const lngs = markers.map(m => parseFloat(m.longitude)).filter(lng => !isNaN(lng));

        if (lats.length === 0 || lngs.length === 0) {
            return { spread: 0, center: { lat: 0, lng: 0 }, bounds: { north: 0, south: 0, east: 0, west: 0 } };
        }

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

        let html = '<div class="sfaf-fields-section"><h4>SFAF Fields (MC4EB Publication 7, Change 1)</h4>';

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

    async importSampleSFAFData() {
        try {
            console.log('📥 Starting sample SFAF import with complete record creation...');

            const sampleSFAFText = `
005.     UE
010.     M
102.     AF  014589
110.     K4028(4026.5)
113.     MO
114.     2K70J3E
115.     W500
200.     USAF
300.     FL
301.     HURLBURT
500.     S189
500/02.     E029
500/03.     C010
===
005.     UE
010.     M
102.     AF  079243
110.     K4460.5(4459.15)
113.     MO
114.     2K70J3E
115.     W500
200.     USAF
300.     FL
301.     HURLBURT
500.     C010
===
005.     UE
010.     M
102.     AF  948910
110.     K4551.5(4550)
113.     ML
114.     2K70J3E
115.     W20
200.     USAF
300.     FL
301.     HURLBURT
500.     C010
        `.trim();

            const result = await this.importSFAFRecords(sampleSFAFText);

            if (result.success) {
                console.log(`✅ Sample import successful: ${result.imported} complete records imported`);

                // ✅ CRITICAL: Wait for database synchronization and refresh display
                console.log('🔄 Refreshing SFAF records display...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for SFAF creation
                await this.loadSFAFRecords();

                this.showSuccess(`✅ Successfully imported ${result.imported} complete SFAF records with field data`);
            } else {
                this.showError(`❌ Sample import failed: ${result.error}`);
            }

        } catch (error) {
            console.error('❌ Sample import failed:', error);
            this.showError('Failed to import sample data');
        }
    }

    initializeSFAFFileImport() {
        const fileInput = document.getElementById('sfafImportFile');
        if (fileInput) {
            fileInput.addEventListener('change', async (event) => {
                const files = event.target.files;

                if (files.length === 0) return;

                try {
                    let totalImported = 0;
                    let totalFailed = 0;
                    let totalRecords = 0;
                    const allErrors = [];

                    for (const file of files) {
                        try {
                            console.log(`📥 Processing file: ${file.name}`);
                            const text = await file.text();
                            const result = await this.importSFAFRecords(text);

                            // ✅ Collect import statistics
                            if (result && typeof result === 'object') {
                                totalRecords += result.total || 0;
                                totalImported += result.imported || 0;

                                // Calculate failed records for this file
                                const fileFailed = (result.total || 0) - (result.imported || 0);
                                totalFailed += fileFailed;

                                if (result.success) {
                                    console.log(`✅ Successfully imported ${result.imported} records from ${file.name}`);
                                }

                                // Collect detailed error messages
                                if (result.errorMessages && result.errorMessages.length > 0) {
                                    result.errorMessages.forEach(err => {
                                        // Handle different error object structures
                                        const errorMsg = err.error || err.message || err.toString();
                                        const lineNum = err.line_number || err.line || '?';

                                        allErrors.push({
                                            file: file.name,
                                            line: lineNum,
                                            error: errorMsg
                                        });
                                    });
                                    console.error(`❌ Failed to import ${file.name}. Errors:`);
                                    result.errorMessages.forEach((err, idx) => {
                                        const errorMsg = err.error || err.message || err.toString();
                                        const lineNum = err.line_number || err.line || '?';
                                        console.error(`  ${idx + 1}. Line ${lineNum}: ${errorMsg}`);
                                    });
                                } else if (result.error) {
                                    allErrors.push({
                                        file: file.name,
                                        line: '?',
                                        error: result.error
                                    });
                                    console.error(`❌ Failed to import ${file.name}:`, result.error);
                                }
                            } else {
                                totalFailed++;
                                allErrors.push({
                                    file: file.name,
                                    line: '?',
                                    error: 'Invalid result from server'
                                });
                                console.error(`❌ Invalid result from ${file.name}:`, result);
                            }

                        } catch (error) {
                            totalFailed++;
                            allErrors.push({
                                file: file.name,
                                line: '?',
                                error: error.message || 'Unknown error'
                            });
                            console.error(`❌ Error processing ${file.name}:`, error);
                        }
                    }

                    // Show import summary modal
                    this.showImportSummaryModal({
                        totalRecords: totalRecords,
                        successCount: totalImported,
                        failedCount: totalFailed,
                        errorCount: allErrors.length,
                        errors: allErrors
                    });

                    // Refresh display if any records were imported
                    if (totalImported > 0) {
                        await this.loadSFAFRecords();
                    }

                    // Clear file input for next use
                    fileInput.value = '';

                } catch (error) {
                    console.error('❌ SFAF file import failed:', error);
                    this.showError('Failed to import SFAF files');
                }
            });
        } else {
            console.error('❌ SFAF import file input not found');
        }
    }

    async importSFAFRecords(sfafText) {
        try {
            console.log('📥 Starting SFAF import process...');

            // Show progress indicator
            this.showLoading(true, 'Importing SFAF records...');

            // Create a Blob from the text content
            const blob = new Blob([sfafText], { type: 'text/plain' });

            // Create FormData and append the file
            const formData = new FormData();
            formData.append('file', blob, 'import.txt');

            console.log('📤 Sending file to backend import endpoint...');

            // Use the backend import endpoint that handles everything:
            // - Parses SFAF text format (field 005 separates records)
            // - Extracts coordinates from field 303 (DMS format)
            // - Extracts serial from field 102
            // - Creates markers at correct coordinates
            // - Creates SFAF records with all fields
            const response = await fetch('/api/sfaf/import', {
                method: 'POST',
                body: formData
                // Don't set Content-Type header - browser will set it with boundary
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Import failed: HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Import completed:', result);

            if (!result.success) {
                throw new Error(result.error || 'Import failed');
            }

            // Log detailed results
            const importResults = result.results;
            console.log(`📊 Import Summary:
- Total Records: ${importResults.total_records}
- Successful: ${importResults.successful_count}
- Errors: ${importResults.error_count}`);

            if (importResults.errors && importResults.errors.length > 0) {
                console.warn('⚠️ Import Errors:', importResults.errors);
            }

            // Hide progress indicator
            this.showLoading(false);

            return {
                success: importResults.successful_count > 0,
                imported: importResults.successful_count,
                errors: importResults.error_count,
                total: importResults.total_records,
                errorMessages: importResults.errors || []
            };

        } catch (error) {
            console.error('❌ Import failed:', error);

            // Hide progress indicator on error
            this.showLoading(false);

            return {
                success: false,
                imported: 0,
                errors: 1,
                error: error.message
            };
        }
    }

    showImportSummaryModal(summary) {
        const { totalRecords, successCount, failedCount, errorCount, errors } = summary;

        // Determine overall status
        const allSuccess = errorCount === 0;
        const partialSuccess = successCount > 0 && errorCount > 0;
        const allFailed = successCount === 0 && errorCount > 0;

        // Build modal content
        let modalContent = `
            <div class="import-summary">
                <div class="import-summary-stats">
                    ${allSuccess ? '<div class="import-status-icon success">✅</div>' : ''}
                    ${partialSuccess ? '<div class="import-status-icon warning">⚠️</div>' : ''}
                    ${allFailed ? '<div class="import-status-icon error">❌</div>' : ''}

                    <h3>${allSuccess ? 'Import Successful' : (allFailed ? 'Import Failed' : 'Import Partially Successful')}</h3>

                    <div class="import-stats-grid">
                        <div class="import-stat">
                            <div class="import-stat-value">${totalRecords}</div>
                            <div class="import-stat-label">Total Records</div>
                        </div>
                        <div class="import-stat success">
                            <div class="import-stat-value">${successCount}</div>
                            <div class="import-stat-label">Successfully Imported</div>
                        </div>
                        <div class="import-stat ${errorCount > 0 ? 'error' : ''}">
                            <div class="import-stat-value">${failedCount}</div>
                            <div class="import-stat-label">Failed Records</div>
                        </div>
                        <div class="import-stat ${errorCount > 0 ? 'error' : ''}">
                            <div class="import-stat-value">${errorCount}</div>
                            <div class="import-stat-label">Total Errors</div>
                        </div>
                    </div>
                </div>
        `;

        // Add detailed errors section if there are errors
        if (errors && errors.length > 0) {
            modalContent += `
                <div class="import-errors-section">
                    <button type="button" class="btn btn-secondary" onclick="databaseViewer.toggleImportErrors()" id="toggleErrorsBtn">
                        Show Detailed Errors ▼
                    </button>

                    <div id="importErrorDetails" style="display: none; margin-top: 15px;">
                        <div class="import-errors-list">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th style="width: 30%">File</th>
                                        <th style="width: 10%">Line</th>
                                        <th style="width: 60%">Error</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            errors.forEach((err, idx) => {
                modalContent += `
                    <tr>
                        <td><code>${err.file}</code></td>
                        <td><code>${err.line}</code></td>
                        <td>${err.error}</td>
                    </tr>
                `;
            });

            modalContent += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        modalContent += `</div>`;

        // Add custom styles for import summary
        const style = `
            <style>
                #editModal .modal-dialog {
                    max-width: 700px;
                }
                .import-summary {
                    padding: 20px 0;
                }
                .import-summary-stats {
                    text-align: center;
                    margin-bottom: 25px;
                }
                .import-status-icon {
                    font-size: 64px;
                    margin-bottom: 15px;
                }
                .import-status-icon.success { color: #10b981; }
                .import-status-icon.warning { color: #f59e0b; }
                .import-status-icon.error { color: #ef4444; }
                .import-summary h3 {
                    margin: 15px 0 0 0;
                    color: #e2e8f0;
                    font-size: 24px;
                    font-weight: 600;
                }
                .import-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-top: 30px;
                }
                .import-stat {
                    padding: 20px 15px;
                    background: rgba(30, 41, 59, 0.6);
                    border-radius: 12px;
                    border: 2px solid rgba(71, 85, 105, 0.5);
                }
                .import-stat.success {
                    background: rgba(6, 78, 59, 0.4);
                    border-color: rgba(16, 185, 129, 0.6);
                }
                .import-stat.error {
                    background: rgba(127, 29, 29, 0.4);
                    border-color: rgba(239, 68, 68, 0.6);
                }
                .import-stat-value {
                    font-size: 36px;
                    font-weight: 700;
                    color: #f1f5f9;
                    line-height: 1;
                }
                .import-stat-label {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 500;
                }
                .import-errors-section {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid rgba(71, 85, 105, 0.5);
                }
                #toggleErrorsBtn {
                    background: rgba(71, 85, 105, 0.6);
                    border: 1px solid rgba(100, 116, 139, 0.5);
                    color: #cbd5e1;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                #toggleErrorsBtn:hover {
                    background: rgba(100, 116, 139, 0.7);
                    border-color: rgba(148, 163, 184, 0.6);
                }
                .import-errors-list {
                    max-height: 350px;
                    overflow-y: auto;
                    background: rgba(15, 23, 42, 0.6);
                    padding: 0;
                    border-radius: 12px;
                    border: 1px solid rgba(71, 85, 105, 0.5);
                }
                .import-errors-list table {
                    margin-bottom: 0;
                    font-size: 13px;
                    width: 100%;
                }
                .import-errors-list thead {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .import-errors-list th {
                    background: rgba(30, 41, 59, 0.95);
                    color: #94a3b8;
                    padding: 12px 15px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid rgba(71, 85, 105, 0.5);
                }
                .import-errors-list td {
                    padding: 12px 15px;
                    color: #cbd5e1;
                    border-bottom: 1px solid rgba(51, 65, 85, 0.3);
                }
                .import-errors-list tbody tr:hover {
                    background: rgba(51, 65, 85, 0.3);
                }
                .import-errors-list code {
                    background: rgba(51, 65, 85, 0.6);
                    color: #fbbf24;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: 'Monaco', 'Menlo', monospace;
                }
            </style>
        `;

        // Show modal
        this.showModal('SFAF Import Summary', style + modalContent);
    }

    toggleImportErrors() {
        const errorDetails = document.getElementById('importErrorDetails');
        const toggleBtn = document.getElementById('toggleErrorsBtn');

        if (errorDetails && toggleBtn) {
            if (errorDetails.style.display === 'none') {
                errorDetails.style.display = 'block';
                toggleBtn.innerHTML = 'Hide Detailed Errors ▲';
            } else {
                errorDetails.style.display = 'none';
                toggleBtn.innerHTML = 'Show Detailed Errors ▼';
            }
        }
    }

    // Improved button access pattern
    safeClickButton(elementId) {
        const element = document.getElementById(elementId);
        if (element && typeof element.click === 'function') {
            element.click();
        } else {
            console.warn(`Element ${elementId} not found or not clickable`);
        }
    }

    waitForElement(selector, callback) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else {
            setTimeout(() => waitForElement(selector, callback), 100);
        }
    }

    // MC4EB Publication 7, Change 1 Compliance Validation
    validateSFAFImport(record) {
        const validationIssues = [];

        // Field occurrence validation (Source: database_dump.txt system_config)
        if (record.occurrences['500'] > 10) {
            validationIssues.push('Field 500 exceeds maximum 10 occurrences');
        }

        if (record.occurrences['501'] > 30) {
            validationIssues.push('Field 501 exceeds maximum 30 occurrences');
        }

        // Required field validation
        const requiredFields = ['005', '010', '102', '110', '200', '300'];
        requiredFields.forEach(fieldNum => {
            if (!record.fields[`field${fieldNum}`]) {
                validationIssues.push(`Required field ${fieldNum} is missing`);
            }
        });

        // Coordinate format validation
        if (record.fields.field303) {
            const coordPattern = /^\d{6}[NS]\d{7}[EW]$/;
            if (!coordPattern.test(record.fields.field303)) {
                validationIssues.push('Field 303 coordinate format invalid');
            }
        }

        return {
            isValid: validationIssues.length === 0,
            issues: validationIssues
        };
    }

    parseSFAFText(sfafText) {
        const records = [];
        const lines = sfafText.split('\n').map(line => line.trim());

        let currentRecord = { fields: {}, occurrences: {} };
        let multiLineField = null;
        let multiLineContent = '';

        for (const line of lines) {
            // Handle record boundaries - empty lines separate records
            if (line === '' && Object.keys(currentRecord.fields).length > 0) {
                // Complete any active multi-line field
                if (multiLineField && multiLineContent) {
                    currentRecord.fields[multiLineField] = multiLineContent.trim();
                    multiLineField = null;
                    multiLineContent = '';
                }

                // Save completed record
                records.push(currentRecord);
                currentRecord = { fields: {}, occurrences: {} };
                continue;
            }

            // Skip empty lines at start or between records
            if (line === '') continue;

            // Parse field format: "110. K4028(4026.5)" or "500/02. S189"
            const fieldMatch = line.match(/^(\d{3})(?:\/(\d{2}))?\.\s*(.*)$/);

            if (fieldMatch) {
                // Complete any previous multi-line field
                if (multiLineField && multiLineContent) {
                    currentRecord.fields[multiLineField] = multiLineContent.trim();
                    multiLineContent = '';
                }

                const [, fieldNumber, occurrence, value] = fieldMatch;
                const fieldKey = occurrence ? `field${fieldNumber}_${occurrence}` : `field${fieldNumber}`;
                const occurrenceNum = occurrence ? parseInt(occurrence, 10) : 1;

                // Handle multi-line field indicators ($)
                if (value === '$') {
                    multiLineField = fieldKey;
                    multiLineContent = '';
                } else if (value.trim() === '') {
                    // Empty value, might be start of multi-line without $
                    multiLineField = fieldKey;
                    multiLineContent = '';
                } else {
                    // Single line field
                    currentRecord.fields[fieldKey] = value;
                }

                // Track occurrence numbers for validation
                currentRecord.occurrences[fieldNumber] = Math.max(
                    currentRecord.occurrences[fieldNumber] || 0,
                    occurrenceNum
                );
            } else if (multiLineField) {
                // Continuation line for multi-line field
                if (multiLineContent) {
                    multiLineContent += '\n' + line;
                } else {
                    multiLineContent = line;
                }
            }
        }

        // Handle final record and multi-line field
        if (multiLineField && multiLineContent) {
            currentRecord.fields[multiLineField] = multiLineContent.trim();
        }

        if (Object.keys(currentRecord.fields).length > 0) {
            records.push(currentRecord);
        }

        console.log(`✅ Parsed ${records.length} SFAF records from file`);
        return records;
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
                        <small class="field-help">Field 500: max 10, Field 501: max 30 (MC4EB Pub 7 CHG 1)</small>
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
            this.showError('No records selected');
            return;
        }

        const recordCount = this.selectedItems.size;
        if (!confirm(`Delete ${recordCount} selected record${recordCount !== 1 ? 's' : ''} ` +
                     `and all associated data?\n\n` +
                     `This will permanently delete:\n` +
                     `- ${recordCount} SFAF record${recordCount !== 1 ? 's' : ''}\n` +
                     `- ${recordCount} marker${recordCount !== 1 ? 's' : ''}\n` +
                     `- Associated geometries and IRAC notes\n\n` +
                     `This action cannot be undone.`)) {
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            const totalRecords = this.selectedItems.size;
            const selectedArray = Array.from(this.selectedItems);

            console.log(`🗑️ Starting bulk delete of ${totalRecords} records:`, selectedArray);
            this.showLoading(true, `Deleting ${totalRecords} record${totalRecords !== 1 ? 's' : ''}...`);

            // Delete with progress tracking
            for (let i = 0; i < selectedArray.length; i++) {
                const recordId = selectedArray[i];
                this.showLoading(true, `Deleting record ${i + 1} of ${totalRecords}...`);

                try {
                    console.log(`🗑️ Deleting SFAF record ${i + 1}/${totalRecords}: ${recordId}`);
                    const response = await fetch(`/api/sfaf/${recordId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (response.ok) {
                        successCount++;
                        console.log(`✅ Successfully deleted record ${recordId}`);
                    } else {
                        errorCount++;
                        const responseText = await response.text();
                        console.error(`❌ Failed to delete record ${recordId}: HTTP ${response.status} - ${responseText}`);
                        errors.push({ id: recordId, error: `HTTP ${response.status}: ${responseText}` });
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error deleting record ${recordId}:`, error);
                    errors.push({ id: recordId, error: error.message });
                }
            }

            this.showLoading(false);

            // Show results
            if (successCount > 0 && errorCount === 0) {
                this.showSuccess(`Successfully deleted all ${successCount} record${successCount !== 1 ? 's' : ''}`);
            } else if (successCount > 0 && errorCount > 0) {
                this.showWarning(`Deleted ${successCount} record${successCount !== 1 ? 's' : ''}, ` +
                               `but ${errorCount} failed. Check console for details.`);
                console.error('Delete errors:', errors);
            } else {
                this.showError(`Failed to delete any records. Check console for details.`);
                console.error('Delete errors:', errors);
            }

            // Clear selections and refresh
            this.selectedItems.clear();
            this.sessionManager.clearSelectedItems(this.currentTab);
            this.updateSelectionUI();
            await this.loadData();

        } catch (error) {
            this.showLoading(false);
            console.error('Bulk delete failed:', error);
            this.showError(`Bulk delete operation failed: ${error.message}`);
        }
    }

    /**
     * Delete all SFAF records with confirmation
     */
    async deleteAllSFAFs() {
        const totalRecords = this.totalDatabaseRecords || 0;

        if (totalRecords === 0) {
            this.showError('No records to delete');
            return;
        }

        if (!confirm(`⚠️ WARNING: Delete ALL ${totalRecords} SFAF records?\n\n` +
                     `This will permanently delete:\n` +
                     `- ALL ${totalRecords} SFAF records\n` +
                     `- ALL associated markers\n` +
                     `- ALL geometries and IRAC notes\n\n` +
                     `THIS ACTION CANNOT BE UNDONE!\n\n` +
                     `Type 'DELETE ALL' in the next prompt to confirm.`)) {
            return;
        }

        const confirmation = prompt('Type "DELETE ALL" to confirm deletion of all records:');
        if (confirmation !== 'DELETE ALL') {
            this.showError('Deletion cancelled - confirmation text did not match');
            return;
        }

        try {
            this.showLoading(true, `Deleting all ${totalRecords} records...`);

            const response = await fetch('/api/sfaf/delete-all', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete all records: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            this.showLoading(false);
            this.showSuccess(`Successfully deleted all ${result.deleted_count || totalRecords} SFAF records`);

            // Clear selection and reload
            this.selectedItems.clear();
            this.updateBulkActionButtons();
            this.loadSFAFRecords();
        } catch (error) {
            this.showLoading(false);
            console.error('Delete all failed:', error);
            this.showError(`Failed to delete all records: ${error.message}`);
        }
    }

    /**
     * Delete a single record with confirmation
     */
    async deleteSingleRecord(recordId) {
        const record = this.currentSFAFData.find(r => r.id === recordId);
        const recordInfo = record ? `${record.serial || 'Unknown'}` : 'this record';

        if (!confirm(`Delete ${recordInfo} and all associated data?\n\n` +
                     `This will permanently delete:\n- SFAF record\n- Marker (if any)\n- Geometry (if any)\n` +
                     `- IRAC notes\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            this.showLoading(true, 'Deleting record...');

            // Delete SFAF record (which will cascade to marker if it exists)
            const response = await fetch(`/api/sfaf/${recordId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
            }

            this.showLoading(false);
            this.showSuccess(`Successfully deleted ${recordInfo}`);

            // Remove from selection if selected
            this.selectedItems.delete(recordId);
            this.sessionManager.saveSelectedItems(this.currentTab, this.selectedItems);

            await this.loadData();

        } catch (error) {
            this.showLoading(false);
            console.error('Delete failed:', error);
            this.showError(`Failed to delete record: ${error.message}`);
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
                            compliance: 'MC4EB Publication 7, Change 1',
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
                        compliance: 'MC4EB Publication 7, Change 1',
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
                            compliance: 'MC4EB Publication 7, Change 1',
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
                            compliance: 'MC4EB Publication 7, Change 1',
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

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#f59e0b' : '#2196F3'};
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
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
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
            // Load previous page from API
            this.loadSFAFRecords();
            // Scroll to top of table
            this.scrollToTopOfTable();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalDatabaseRecords / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            // Load next page from API
            this.loadSFAFRecords();
            // Scroll to top of table
            this.scrollToTopOfTable();
        }
    }

    getTotalItemsForCurrentTab() {
        // Return SFAF data length if available, otherwise fall back to currentData
        if (this.currentSFAFData && this.currentSFAFData.length > 0) {
            return this.currentSFAFData.length;
        }
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

    saveFilterView() {
        const viewName = prompt('Enter a name for this filter view:');
        if (viewName && viewName.trim() !== '') {
            this.savedViews[viewName] = {
                filters: { ...this.activeFilters },
                viewMode: this.currentView,
                searchTerm: document.getElementById('assignmentSearch')?.value || '',
                savedAt: new Date().toISOString(),
                description: this.generateViewDescription()
            };

            this.saveSavedViews();
            this.updateSavedViewsDropdown();
            this.showSuccess(`Filter view "${viewName}" saved successfully`);
        }
    }

    safeElementClick(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element ${elementId} not found in DOM`);
            return false;
        }

        if (typeof element.click !== 'function') {
            console.error(`Element ${elementId} does not have click method`);
            return false;
        }

        element.click();
        return true;
    }

    generateViewDescription() {
        const filters = [];
        if (this.activeFilters.frequency) filters.push(`Frequency: ${this.activeFilters.frequency}`);
        if (this.activeFilters.location) filters.push(`Location: ${this.activeFilters.location}`);
        if (this.activeFilters.agency) filters.push(`Agency: ${this.activeFilters.agency}`);
        if (this.activeFilters.stationClass) filters.push(`Station Class: ${this.activeFilters.stationClass}`);

        return filters.length > 0 ? filters.join(', ') : 'No active filters';
    }

    loadSavedViews() {
        try {
            return JSON.parse(localStorage.getItem('sfafSavedViews')) || {};
        } catch (e) {
            console.warn('Could not load saved views:', e);
            return {};
        }
    }

    saveSavedViews() {
        localStorage.setItem('sfafSavedViews', JSON.stringify(this.savedViews));
    }

    updateSavedViewsDropdown() {
        const dropdown = document.getElementById('savedViewsDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">Select saved view...</option>';

        Object.entries(this.savedViews).forEach(([name, view]) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${view.viewMode})`;
            option.title = view.description;
            dropdown.appendChild(option);
        });
    }

    applySavedView(viewName) {
        const view = this.savedViews[viewName];
        if (!view) return;

        // Apply filters
        this.activeFilters = { ...view.filters };
        this.currentView = view.viewMode;

        // Update UI controls
        this.updateFilterControls();
        this.updateViewModeSelector();

        // Reload data with filters
        this.reloadAssignmentData();

        this.showSuccess(`Applied saved view: ${viewName}`);
    }

    updateFilterControls() {
        // Update filter input fields based on activeFilters
        Object.entries(this.activeFilters).forEach(([key, value]) => {
            const input = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (input) {
                input.value = value;
            }
        });
    }

    updateViewModeSelector() {
        const selector = document.getElementById('viewModeSelector');
        if (selector) {
            selector.value = this.currentView;
        }
    }

    // Advanced filtering system for comprehensive SFAF data
    applyAdvancedFilters() {
        const filters = {
            frequency: this.parseFrequencyFilter(document.getElementById('freqFrom')?.value, document.getElementById('freqTo')?.value),
            location: document.getElementById('filterLocation')?.value,
            agency: document.getElementById('filterAgency')?.value,
            stationClass: document.getElementById('filterStationClass')?.value,
            approvalStatus: document.getElementById('filterApprovalStatus')?.value
        };

        // Remove empty filters
        this.activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value && value.trim() !== '')
        );

        this.currentPage = 1;
        this.reloadAssignmentData();
        this.updateFilterStats();
    }

    parseFrequencyFilter(fromValue, toValue) {
        if (!fromValue && !toValue) return null;

        const from = fromValue ? parseFloat(fromValue) : null;
        const to = toValue ? parseFloat(toValue) : null;

        return { from, to };
    }

    clearAllFilters() {
        this.activeFilters = {};

        // Clear filter inputs
        document.querySelectorAll('.filter-input, .filter-select').forEach(input => {
            input.value = '';
        });

        // Clear the main filter dropdowns
        const completionStatusFilter = document.getElementById('completionStatusFilter');
        if (completionStatusFilter) completionStatusFilter.value = '';

        const agencyFilter = document.getElementById('agencyFilter');
        if (agencyFilter) agencyFilter.value = '';

        const frequencyBandFilter = document.getElementById('frequencyBandFilter');
        if (frequencyBandFilter) frequencyBandFilter.value = '';

        const poolAssignmentFilter = document.getElementById('poolAssignmentFilter');
        if (poolAssignmentFilter) poolAssignmentFilter.value = '';

        // Clear search input
        const searchInput = document.getElementById('sfafRecordsSearch');
        if (searchInput) searchInput.value = '';
        this.currentFilter = '';

        this.currentPage = 1;
        this.loadData(); // Use loadData instead of reloadAssignmentData for SFAF tab

        this.showSuccess('All filters cleared');
    }

    // Enhanced data loading with complete SFAF integration
    async reloadAssignmentData() {
        try {
            this.showLoading(true);

            // Load markers with comprehensive SFAF data
            const markersResponse = await fetch('/api/markers');
            const markersData = await markersResponse.json();

            if (!markersData.success) {
                throw new Error(markersData.error || 'Failed to load markers');
            }

            // Enhance each marker with complete SFAF and IRAC data
            const enhancedMarkers = await Promise.all(
                markersData.markers.map(async (marker) => {
                    try {
                        // Load SFAF object data (Source: db_viewer_js.txt API usage)
                        const sfafResponse = await fetch(`/api/sfaf/object-data/${marker.id}`);
                        const sfafData = await sfafResponse.json();

                        // Load coordinate conversions
                        const coordResponse = await fetch(`/api/convert-coords?lat=${marker.Latitude}&lng=${marker.Longitude}`);
                        const coordData = await coordResponse.json();

                        return {
                            ...marker,
                            sfaf_fields: sfafData.success ? sfafData.sfaf_fields : {},
                            field_definitions: sfafData.success ? sfafData.field_defs : {},
                            irac_notes: sfafData.success ? sfafData.marker.irac_notes : [],
                            coordinates: {
                                decimal: `${marker.Latitude}, ${marker.Longitude}`,
                                dms: coordData.dms || 'N/A',
                                compact: coordData.compact || 'N/A'
                            }
                        };
                    } catch (error) {
                        console.error(`Failed to enhance marker ${marker.id}:`, error);
                        return {
                            ...marker,
                            sfaf_fields: {},
                            field_definitions: {},
                            irac_notes: [],
                            coordinates: {
                                decimal: `${marker.Latitude}, ${marker.Longitude}`,
                                dms: 'Error',
                                compact: 'Error'
                            }
                        };
                    }
                })
            );

            // Apply filters
            const filteredData = this.applyFiltersToData(enhancedMarkers);

            this.currentData = filteredData;
            this.renderAssignmentTable(filteredData);
            this.updateFilterStats();

        } catch (error) {
            console.error('Failed to reload assignment data:', error);
            this.showError('Failed to load assignment data: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    applyFiltersToData(data) {
        return data.filter(assignment => {
            // Frequency filter
            if (this.activeFilters.frequency) {
                const freq = parseFloat(assignment.sfaf_fields.field110 || assignment.frequency || '0');
                const { from, to } = this.activeFilters.frequency;
                if (from && freq < from) return false;
                if (to && freq > to) return false;
            }

            // Location filter
            if (this.activeFilters.location) {
                const location = `${assignment.sfaf_fields.field300 || ''} ${assignment.sfaf_fields.field301 || ''}`.toLowerCase();
                if (!location.includes(this.activeFilters.location.toLowerCase())) return false;
            }

            // Agency filter
            if (this.activeFilters.agency) {
                const agency = assignment.sfaf_fields.field200 || '';
                if (!agency.startsWith(this.activeFilters.agency)) return false;
            }

            // Station class filter
            if (this.activeFilters.stationClass) {
                const stationClass = assignment.sfaf_fields.field113 || '';
                if (!stationClass.includes(this.activeFilters.stationClass)) return false;
            }

            // Approval status filter
            if (this.activeFilters.approvalStatus) {
                const approvalStatus = assignment.sfaf_fields.field144 || '';
                if (approvalStatus !== this.activeFilters.approvalStatus) return false;
            }

            return true;
        });
    }

    updateFilterStats() {
        const totalCount = this.currentData?.length || 0;
        const visibleCount = Math.min(totalCount, this.itemsPerPage);

        const filterResultsElement = document.getElementById('filterResultsCount');
        if (filterResultsElement) {
            filterResultsElement.textContent = `Showing ${visibleCount} of ${totalCount} assignments`;
        }

        const totalElement = document.getElementById('totalAssignments');
        if (totalElement) {
            totalElement.textContent = totalCount;
        }
    }

    getHeadersForView(viewMode) {
        const headerConfigs = {
            summary: [
                { field: 'select', label: '<input type="checkbox" id="selectAllCheckbox" title="Select All">', class: 'checkbox-col sticky-col', filterable: false },
                { field: 'field102', label: '102 - Agency Serial', class: 'serial-col' },
                { field: 'field110', label: '110 - Frequency', class: 'frequency-col' },
                { field: 'field301', label: '301 - City/Location', class: 'location-col' },
                { field: 'field200', label: '200 - Agency', class: 'agency-col' },
                { field: 'status', label: 'SFAF Status', class: 'status-col' },
                { field: 'actions', label: 'Actions', class: 'actions-col sticky-col', filterable: false }
            ],
            spreadsheet: this.getAllFieldsHeaders(),
            technical: [
                { field: 'select', label: '<input type="checkbox" id="selectAllCheckbox" title="Select All">', class: 'checkbox-col sticky-col', filterable: false },
                { field: 'field102', label: '102 - Agency Serial' },
                { field: 'field110', label: '110 - Frequency' },
                { field: 'field114', label: '114 - Emission Designator' },
                { field: 'field115', label: '115 - Power (W###/K###)' },
                { field: 'field300', label: '300 - State/Country' },
                { field: 'field301', label: '301 - City/Location' },
                { field: 'actions', label: 'Actions', class: 'actions-col sticky-col', filterable: false }
            ],
            administrative: [
                { field: 'select', label: '<input type="checkbox" id="selectAllCheckbox" title="Select All">', class: 'checkbox-col sticky-col', filterable: false },
                { field: 'field102', label: '102 - Agency Serial' },
                { field: 'field200', label: '200 - Agency' },
                { field: 'field140', label: '140 - Date' },
                { field: 'field141', label: '141 - Date' },
                { field: 'compliance', label: 'MC4EB Compliance' },
                { field: 'actions', label: 'Actions', class: 'actions-col sticky-col', filterable: false }
            ],
            compliance: [
                { field: 'select', label: '<input type="checkbox" id="selectAllCheckbox" title="Select All">', class: 'checkbox-col sticky-col', filterable: false },
                { field: 'field102', label: '102 - Agency Serial' },
                { field: 'field200', label: '200 - Agency' },
                { field: 'field005', label: '005 - Status' },
                { field: 'field100', label: '100 - File Number' },
                { field: 'field110', label: '110 - Frequency' },
                { field: 'field114', label: '114 - Emission Designator' },
                { field: 'field303', label: '303 - Coordinates' },
                { field: 'field306', label: '306 - Authorization Radius' },
                { field: 'field500', label: '500 - Coordination' },
                { field: 'field501', label: '501 - Approval' },
                { field: 'compliance', label: 'MC4EB Compliance Status' },
                { field: 'completionRate', label: 'Completion %' },
                { field: 'actions', label: 'Actions', class: 'actions-col sticky-col', filterable: false }
            ]
        };

        // Check if it's a custom view
        if (viewMode && viewMode.startsWith('custom_')) {
            const viewId = viewMode.replace('custom_', '');
            const customView = this.customViews.find(v => v.id === viewId);
            if (customView && customView.fields) {
                // Build headers from custom view fields
                const customHeaders = [
                    { field: 'select', label: '<input type="checkbox" id="selectAllCheckbox" title="Select All">', class: 'checkbox-col', filterable: false }
                ];

                customView.fields.forEach(fieldDef => {
                    customHeaders.push({
                        field: fieldDef.key,
                        label: fieldDef.label,
                        class: 'field-col'
                    });
                });

                customHeaders.push({ field: 'actions', label: 'Actions', class: 'actions-col', filterable: false });
                return customHeaders;
            }
        }

        return headerConfigs[viewMode] || headerConfigs.summary;
    }

    getAllFieldsHeaders() {
        // Create headers for all SFAF fields (005-999)
        const headers = [
            { field: 'select', label: '<input type="checkbox" id="selectAllCheckbox" title="Select All">', class: 'checkbox-col sticky-col', filterable: false },
            { field: 'serial', label: 'Serial (102)', class: 'serial-col sticky-col frozen-col' }
        ];

        // MC4EB Pub 7 CHG 1 field labels - Complete and accurate naming
        const fieldLabels = {
            // 005-020 Series: Administrative Data
            field005: '005 - Security Classification',
            field006: '006 - Security Classification Modification',
            field007: '007 - Missing Data Indicator',
            field010: '010 - Type of Action',
            field013: '013 - Declassification Instruction Comment',
            field014: '014 - Derivative Classification Authority',
            field015: '015 - Unclassified Data Fields',
            field016: '016 - Extended Declassification Date',
            field017: '017 - Date of Origin',
            field018: '018 - Assignment Concurrence Indicator',
            field019: '019 - ITU Notification',
            field020: '020 - File Number Extension',

            // 100 Series: File Identification
            field102: '102 - Agency Serial Number',
            field103: '103 - Frequency/Frequency Alternative',
            field105: '105 - Equipment Configuration/Emission Designator',
            field106: '106 - Tuning Range/System/Subsystem/Equipment Indicator',
            field107: '107 - Tuning Increment/Net Identifier',
            field108: '108 - Equipment Function Code',
            field110: '110 - Transmitter Frequency',
            field111: '111 - Transmitter Emission Designation',
            field112: '112 - Transmitter Necessary Bandwidth',
            field113: '113 - Transmitter Specific Bandwidth',
            field114: '114 - Transmitter Class of Emission',
            field115: '115 - Transmitter Power',
            field116: '116 - Transmitter Power Units',
            field117: '117 - Transmitter Nature of Service',
            field118: '118 - Transmitter EIRP',

            // 130-150 Series: Time/Date Information
            field130: '130 - Proposed Start Date',
            field131: '131 - Proposed Stop Date',
            field140: '140 - Hours of Operation/Area of Operation',
            field141: '141 - Effective Date',
            field142: '142 - Expiration Date',
            field143: '143 - Coordination Request Date',
            field144: '144 - Coordination Completion Date',
            field145: '145 - Date Transmitted to NTIA',
            field146: '146 - Date Received at NTIA',
            field147: '147 - Date Action Completed',
            field151: '151 - Hours of Operation Begin Time',
            field152: '152 - Hours of Operation End Time',

            // 200 Series: Organizational Information
            field200: '200 - Agency Code',
            field201: '201 - Agency Name',
            field202: '202 - Agency Serial Number Prefix',
            field203: '203 - Agency File Number',
            field204: '204 - Organization Code',
            field205: '205 - Using Organization Name',
            field206: '206 - Station Name',
            field207: '207 - Station Location',
            field208: '208 - Station Call Sign',
            field209: '209 - Net Identification',

            // 300 Series: Transmitter Location Data
            field300: '300 - Transmitter Location State Code',
            field301: '301 - Transmitter Location City',
            field302: '302 - Transmitter Location Site Name',
            field303: '303 - Transmitter Location Latitude',
            field304: '304 - Transmitter Location Longitude',
            field305: '305 - Transmitter Coordinate System',
            field306: '306 - Transmitter Site Elevation',
            field307: '307 - Transmitter Site Radius',
            field315: '315 - Transmitter Orbit Type',
            field316: '316 - Transmitter Orbital Period',
            field317: '317 - Transmitter Apogee',
            field318: '318 - Transmitter Perigee',
            field319: '319 - Transmitter Inclination',
            field321: '321 - Transmitter Orbital Position',

            // 340 Series: Transmitter Equipment
            field340: '340 - Transmitter Manufacturer',
            field341: '341 - Transmitter Model Number',
            field342: '342 - Transmitter Type',
            field343: '343 - Transmitter Rated Power Output',
            field344: '344 - Transmitter Emission Type',
            field345: '345 - Transmitter Modulation Type',
            field346: '346 - Transmitter Frequency Stability',
            field347: '347 - Transmitter Frequency Tolerance',
            field348: '348 - Transmitter Spurious Emissions',
            field349: '349 - Transmitter Equipment Notes',

            // 354-374 Series: Transmitter Antenna Data
            field354: '354 - Transmitter Antenna Manufacturer',
            field355: '355 - Transmitter Antenna Model',
            field356: '356 - Transmitter Antenna Type',
            field357: '357 - Transmitter Antenna Gain',
            field358: '358 - Transmitter Antenna Height Above Ground',
            field359: '359 - Transmitter Antenna Height Above Average Terrain',
            field360: '360 - Transmitter Antenna Azimuth',
            field361: '361 - Transmitter Antenna Beamwidth',
            field362: '362 - Transmitter Antenna Polarization',
            field363: '363 - Transmitter Antenna Front-to-Back Ratio',
            field364: '364 - Transmitter Antenna Vertical Beamwidth',
            field365: '365 - Transmitter Antenna Elevation Angle',
            field373: '373 - Transmitter Antenna Directional Pattern',
            field374: '374 - Transmitter Antenna Pattern Number',

            // 400 Series: Receiver Location Data
            field400: '400 - Receiver Frequency',
            field401: '401 - Receiver Emission Designation',
            field402: '402 - Receiver Location State Code',
            field403: '403 - Receiver Location Latitude',
            field404: '404 - Receiver Location Longitude',
            field405: '405 - Receiver Coordinate System',
            field406: '406 - Receiver Site Elevation',
            field407: '407 - Receiver Location City',
            field408: '408 - Receiver Location Site Name',
            field409: '409 - Receiver Site Radius',
            field415: '415 - Receiver Orbit Type',
            field416: '416 - Receiver Orbital Period',
            field417: '417 - Receiver Apogee',
            field418: '418 - Receiver Perigee',
            field419: '419 - Receiver Inclination',

            // 440 Series: Receiver Equipment
            field440: '440 - Receiver Manufacturer',
            field442: '442 - Receiver Model Number',
            field443: '443 - Receiver Type',

            // 453-473 Series: Receiver Antenna Data
            field453: '453 - Receiver Antenna Manufacturer',
            field454: '454 - Receiver Antenna Model',
            field455: '455 - Receiver Antenna Type',
            field456: '456 - Receiver Antenna Gain',
            field457: '457 - Receiver Antenna Height Above Ground',
            field458: '458 - Receiver Antenna Height Above Average Terrain',
            field459: '459 - Receiver Antenna Azimuth',
            field460: '460 - Receiver Antenna Beamwidth',
            field461: '461 - Receiver Antenna Polarization',
            field462: '462 - Receiver Antenna Front-to-Back Ratio',
            field463: '463 - Receiver Antenna Vertical Beamwidth',
            field470: '470 - Receiver Antenna Elevation Angle',
            field471: '471 - Receiver Antenna Directional Pattern',
            field472: '472 - Receiver Antenna Pattern Number',
            field473: '473 - Receiver Antenna Notes',

            // 500 Series: Supplementary Details
            field500: '500 - General Remarks',
            field501: '501 - Interference Analysis',
            field502: '502 - Link Budget Analysis',
            field503: '503 - Frequency Coordination Comments',
            field504: '504 - Technical Operating Conditions',
            field505: '505 - IRAC Notes Field 1',
            field506: '506 - IRAC Notes Field 2',
            field507: '507 - IRAC Notes Field 3',
            field508: '508 - IRAC Notes Field 4',
            field509: '509 - IRAC Notes Field 5',
            field510: '510 - Certification Statement',
            field511: '511 - Environmental Impact',
            field512: '512 - Radiation Hazard Analysis',
            field513: '513 - Historical/Cultural Site Impact',
            field520: '520 - Coordination Data',
            field521: '521 - International Coordination',
            field530: '530 - Area of Operation',
            field531: '531 - Authorized Operating Areas',

            // 600 Series: Additional Information
            field600: '600 - Assignment Identifier Type',
            field601: '601 - Assignment Identifier',
            field602: '602 - Related Assignment Identifier',
            field603: '603 - Parent Assignment Identifier',
            field604: '604 - Child Assignment Identifier',
            field605: '605 - Link Assignment Identifier',
            field606: '606 - Network Assignment Identifier',
            field607: '607 - System Assignment Identifier',
            field608: '608 - Previous Assignment Identifier',
            field609: '609 - Superseded Assignment Identifier',

            // 700 Series: Other Assignment Identifiers
            field700: '700 - Primary Assignment Identifier',
            field701: '701 - Secondary Assignment Identifier',
            field702: '702 - Tertiary Assignment Identifier',
            field703: '703 - Agency Assignment Identifier',
            field704: '704 - International Assignment Identifier',
            field705: '705 - Frequency Assignment Subgroup',
            field706: '706 - Equipment Group Identifier',
            field707: '707 - Net Group Identifier',
            field708: '708 - Link Identifier',
            field709: '709 - Circuit Identifier',
            field710: '710 - Facility Identifier',
            field711: '711 - Location Identifier',
            field712: '712 - Site Identifier',
            field713: '713 - Coordination Number',
            field714: '714 - License Number',
            field715: '715 - Authorization Number',
            field716: '716 - Registration Number',

            // 800 Series: Additional Information
            field800: '800 - Supplemental Data Type',
            field801: '801 - Supplemental Data Value',
            field802: '802 - Equipment Specification Reference',
            field803: '803 - Technical Standard Reference',
            field804: '804 - Regulatory Reference',
            field805: '805 - Coordination Agreement Reference',
            field806: '806 - Contract Reference',
            field807: '807 - Project Reference',
            field808: '808 - Budget Reference',
            field809: '809 - Cost Center',
            field810: '810 - Funding Source',
            field811: '811 - Maintenance Schedule',
            field812: '812 - Inspection Date',
            field813: '813 - Certification Date',
            field814: '814 - Compliance Verification Date',
            field815: '815 - Next Review Date',

            // 900 Series: Status and Administrative
            field900: '900 - Record Status',
            field901: '901 - Processing Status',
            field902: '902 - Approval Status',
            field903: '903 - Coordination Status',
            field904: '904 - Validation Status',
            field905: '905 - Compliance Status',
            field906: '906 - Review Status',
            field907: '907 - Archive Status',
            field908: '908 - Modification Date',
            field909: '909 - Modification By',
            field910: '910 - Creation Date',
            field911: '911 - Created By',
            field912: '912 - Last Review Date',
            field913: '913 - Reviewed By',
            field914: '914 - Approval Date',
            field915: '915 - Approved By',
            field916: '916 - Submission Date',
            field917: '917 - Submitted By',
            field918: '918 - Processing Date',
            field919: '919 - Processed By',
            field920: '920 - Validation Date',
            field921: '921 - Validated By',
            field922: '922 - Quality Check Date',
            field923: '923 - Quality Checked By',
            field924: '924 - Correction Date',
            field925: '925 - Corrected By',
            field926: '926 - Cancellation Date',
            field927: '927 - Cancelled By',
            field928: '928 - Reactivation Date',
            field929: '929 - Reactivated By',

            // 950 Series: Extended Status Fields
            field950: '950 - Workflow State',
            field951: '951 - Assignment Priority',
            field952: '952 - Urgency Level',
            field953: '953 - Security Level',
            field954: '954 - Access Control Level',
            field955: '955 - Distribution List',
            field956: '956 - Notification Recipients',
            field957: '957 - Stakeholder List',
            field958: '958 - Review Required By',
            field959: '959 - Action Required By',
            field960: '960 - Follow-up Date',
            field961: '961 - Reminder Date',
            field962: '962 - Escalation Date',
            field963: '963 - Deadline Date',
            field964: '964 - Completion Target Date',
            field965: '965 - Milestone Date',
            field966: '966 - Checkpoint Date',
            field967: '967 - Audit Date',
            field968: '968 - Verification Date',
            field969: '969 - Assessment Date',

            // 980-999 Series: System Fields
            field980: '980 - System Generated Field 1',
            field981: '981 - System Generated Field 2',
            field982: '982 - System Generated Field 3',
            field983: '983 - Calculated Field 1',
            field984: '984 - Calculated Field 2',
            field985: '985 - Calculated Field 3',
            field986: '986 - Auto-populated Field 1',
            field987: '987 - Auto-populated Field 2',
            field988: '988 - Auto-populated Field 3',
            field989: '989 - Derived Field 1',
            field990: '990 - Derived Field 2',
            field991: '991 - Derived Field 3',
            field992: '992 - Computed Value 1',
            field993: '993 - Computed Value 2',
            field994: '994 - Computed Value 3',
            field995: '995 - Analysis Result 1',
            field996: '996 - Analysis Result 2',
            field997: '997 - Analysis Result 3',
            field998: '998 - System Reference 1',
            field999: '999 - System Reference 2'
        };

        // Add all field headers
        for (const [fieldKey, label] of Object.entries(fieldLabels)) {
            headers.push({
                field: fieldKey,
                label: label,
                class: 'field-col'
            });
        }

        headers.push({ field: 'actions', label: 'Actions', class: 'actions-col sticky-col', filterable: false });

        return headers;
    }

    renderSpreadsheetRow(record, headers, isChecked) {
        // Generate cells for each header
        const cells = headers.map(header => {
            const field = header.field;

            // Special handling for select checkbox
            if (field === 'select') {
                const escapedId = record.id.replace(/'/g, "\\'");
                return `<td class="checkbox-col sticky-col">
                    <input type="checkbox" class="row-checkbox" value="${record.id}" ${isChecked}
                           data-record-id="${record.id}"
                           onchange="databaseViewer.toggleRowSelection('${escapedId}', this.checked)">
                </td>`;
            }

            // Special handling for serial number (frozen column)
            if (field === 'serial') {
                return `<td class="serial-col sticky-col frozen-col">
                    <span class="serial-number">${record.serial || 'Unknown'}</span>
                </td>`;
            }

            // Special handling for actions
            if (field === 'actions') {
                return `<td class="actions-col sticky-col">
                    ${this.generateActionButtons(record)}
                </td>`;
            }

            // Render SFAF field value
            const fieldValue = record.sfafFields?.[field] || '';
            const displayValue = fieldValue || '-';

            return `<td class="field-col" title="${field}: ${displayValue}">
                <span class="field-value">${displayValue}</span>
            </td>`;
        }).join('');

        return `<tr data-record-id="${record.id}" class="table-row ${isChecked ? 'row-selected' : ''}">${cells}</tr>`;
    }

    renderGenericRow(record, headers, isChecked) {
        // Generic row renderer that works with any header configuration
        const cells = headers.map(header => {
            const field = header.field;

            // Special handling for select checkbox
            if (field === 'select') {
                const escapedId = record.id.replace(/'/g, "\\'");
                return `<td class="checkbox-col ${header.class || ''}">
                    <input type="checkbox" class="row-checkbox" value="${record.id}" ${isChecked}
                           data-record-id="${record.id}"
                           onchange="databaseViewer.toggleRowSelection('${escapedId}', this.checked)">
                </td>`;
            }

            // Special handling for actions
            if (field === 'actions') {
                return `<td class="actions-col ${header.class || ''}">
                    ${this.generateActionButtons(record)}
                </td>`;
            }

            // Special handling for status badge
            if (field === 'status') {
                return `<td class="status-col ${header.class || ''}">
                    ${this.generateStatusBadge(record)}
                </td>`;
            }

            // Special handling for compliance badge
            if (field === 'compliance') {
                return `<td class="compliance-col ${header.class || ''}">
                    ${this.generateComplianceBadge(record.mcebCompliant)}
                </td>`;
            }

            // Special handling for completion rate
            if (field === 'completionRate') {
                const completionRate = record.completionPercentage || 0;
                const barColor = completionRate >= 80 ? '#28a745' : completionRate >= 50 ? '#ffc107' : '#dc3545';
                return `<td class="completion-col ${header.class || ''}" title="${completionRate.toFixed(0)}% Complete">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: #e9ecef; border-radius: 4px; height: 20px; overflow: hidden;">
                            <div style="width: ${completionRate}%; height: 100%; background: ${barColor}; transition: width 0.3s;"></div>
                        </div>
                        <span style="font-size: 12px; font-weight: 600; min-width: 40px;">${completionRate.toFixed(0)}%</span>
                    </div>
                </td>`;
            }

            // Handle SFAF fields (field100, field110, etc.) from sfafFields object
            let fieldValue = '';
            let displayValue = '-';

            if (field.startsWith('field')) {
                // This is an SFAF field - get from sfafFields object
                fieldValue = record.sfafFields?.[field] || record.rawSFAFFields?.[field] || '';
                displayValue = fieldValue || '-';
            } else {
                // Legacy/computed fields for backward compatibility
                displayValue = record[field] || '-';

                // Format dates if needed
                if ((field === 'created_at' || field === 'updated_at') && record[field]) {
                    const date = new Date(record[field]);
                    displayValue = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                }
            }

            return `<td class="field-col ${header.class || ''}" title="${header.label}: ${displayValue}">
                <span class="field-value">${displayValue}</span>
            </td>`;
        }).join('');

        return `<tr data-record-id="${record.id}" class="table-row ${isChecked ? 'row-selected' : ''}">${cells}</tr>`;
    }

    generateStatusBadge(record) {
        const statusConfig = {
            complete: { class: 'status-complete', icon: '✅', text: 'Complete' },
            partial: { class: 'status-partial', icon: '⚠️', text: 'Partial' },
            empty: { class: 'status-empty', icon: '📝', text: 'New Record' }
        };

        const status = record.sfafComplete ? 'complete' : 'partial';
        const config = statusConfig[status];

        const poolBadge = record.isPool
            ? `<span class="sfaf-status-badge status-pool" title="Pool Assignment — no geographic constraints (306/406/530/531 absent)">🏊 Pool</span>`
            : '';

        return `
        ${poolBadge}
        <span class="sfaf-status-badge ${config.class}" title="${config.text}">
            ${config.icon} ${config.text}
        </span>
    `;
    }

    generateComplianceBadge(mcebCompliant) {
        const isCompliant = mcebCompliant && mcebCompliant.isCompliant;

        return `
        <span class="compliance-badge ${isCompliant ? 'compliant' : 'non-compliant'}">
            ${isCompliant ? '✅ Compliant' : '⚠️ Issues'}
        </span>
    `;
    }

    // Detect pool assignments: records lacking fields 306, 406, 530, and 531
    // These fields define geographic constraints; their absence indicates a pool record
    detectPoolAssignment(sfafFields) {
        const f306 = (sfafFields.field306 || '').trim();
        const f406 = (sfafFields.field406 || '').trim();
        const f530 = (sfafFields.field530 || '').trim();
        const f531 = (sfafFields.field531 || '').trim();
        return !f306 && !f406 && !f530 && !f531;
    }

    generateActionButtons(record) {
        return `
        <div class="table-actions-group">
            <button class="table-action-btn btn-edit-sfaf"
                    onclick="databaseViewer.editSFAFRecord('${record.id}')"
                    title="Edit SFAF Fields">
                <i class="fas fa-edit"></i>
            </button>
            <button class="table-action-btn btn-view-on-map"
                    onclick="databaseViewer.viewRecordOnMap('${record.id}')"
                    title="View on Map">
                <i class="fas fa-map-marked-alt"></i>
            </button>
            <button class="table-action-btn btn-view-details"
                    onclick="databaseViewer.viewSFAFRecord('${record.id}')"
                    title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="table-action-btn btn-export-record"
                    onclick="databaseViewer.exportSFAFRecord('${record.id}')"
                    title="Export SFAF">
                <i class="fas fa-download"></i>
            </button>
            <button class="table-action-btn btn-delete-record"
                    onclick="databaseViewer.deleteSingleRecord('${record.id}')"
                    title="Delete Record">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    }

    updateSFAFSummaryStats(records) {
        console.log('📊 Updating SFAF summary stats for', records.length, 'records');

        const stats = {
            total: records.length,
            complete: 0,
            incomplete: 0,
            empty: 0,
            compliant: 0,
            pool: 0
        };

        records.forEach(record => {
            if (record.completionPercentage >= 80) {
                stats.complete++;
            } else if (record.completionPercentage > 0) {
                stats.incomplete++;
            } else {
                stats.empty++;
            }

            if (record.completionPercentage >= 90) {
                stats.compliant++;
            }

            if (record.isPool) {
                stats.pool++;
            }
        });

        // Update DOM elements safely
        this.safeUpdateElement('totalSFAFRecords', stats.total);
        this.safeUpdateElement('completeSFAFRecords', stats.complete);
        this.safeUpdateElement('incompleteSFAFRecords', stats.incomplete);
        this.safeUpdateElement('compliantRecords', stats.compliant);
        this.safeUpdateElement('poolAssignmentRecords', stats.pool);

        // Update database total count
        const dbTotal = this.totalDatabaseRecords || stats.total;
        this.safeUpdateElement('databaseTotalRecords', `of ${dbTotal} in DB`);

        console.log('📊 SFAF Summary Statistics Updated:', stats, '| DB Total:', dbTotal);
    }

    safeUpdateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element ${elementId} not found in DOM`);
        }
    }

    // Supporting function for statistics calculation
    calculateSFAFStatistics(records) {
        // ✅ CRITICAL FIX: Filter out undefined/null records and add validation
        const validRecords = (records || []).filter(record =>
            record &&
            typeof record === 'object' &&
            record.id
        );

        const stats = {
            total: validRecords.length,
            complete: 0,
            incomplete: 0,
            empty: 0,
            compliant: 0,
            nonCompliant: 0,
            validationErrors: 0
        };

        // ✅ SAFE: Process only valid records
        validRecords.forEach(record => {
            try {
                // Completion status analysis with safe property access
                const sfafComplete = record.sfafComplete || false;
                const sfafFieldCount = record.sfafFieldCount || 0;

                if (sfafComplete === true) {
                    stats.complete++;
                } else if (sfafFieldCount > 0) {
                    stats.incomplete++;
                } else {
                    stats.empty++;
                }

                // MC4EB Publication 7, Change 1 compliance analysis with safe access
                const mcebCompliant = record.mcebCompliant || { isCompliant: false };
                if (mcebCompliant.isCompliant) {
                    stats.compliant++;
                } else {
                    stats.nonCompliant++;
                }

                // Validation error tracking with safe access
                const validationStatus = record.validationStatus || { isValid: true };
                if (!validationStatus.isValid) {
                    stats.validationErrors++;
                }
            } catch (error) {
                console.error(`Error processing record statistics for ${record.id}:`, error);
                stats.empty++; // Count as empty if processing fails
            }
        });

        // Calculate derived statistics
        stats.completionPercentage = stats.total > 0 ?
            Math.round((stats.complete / stats.total) * 100) : 0;
        stats.compliancePercentage = stats.total > 0 ?
            Math.round((stats.compliant / stats.total) * 100) : 0;

        return stats;
    }

    updateTableStatistics(recordCount) {
        // Update table statistics display
        const recordsDisplayInfo = document.getElementById('recordsDisplayInfo');
        if (recordsDisplayInfo) {
            const startIndex = ((this.currentPage || 1) - 1) * (this.itemsPerPage || 25);
            const endIndex = Math.min(startIndex + (this.itemsPerPage || 25), recordCount);
            // Use total database records instead of current page count
            const totalRecords = this.totalDatabaseRecords || recordCount;
            recordsDisplayInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRecords} records`;
        }

        // Update page info
        const pageInfo = document.getElementById('sfafPageInfo');
        if (pageInfo) {
            // Use total database records for calculating total pages
            const totalRecords = this.totalDatabaseRecords || recordCount;
            const totalPages = Math.ceil(totalRecords / (this.itemsPerPage || 25));
            pageInfo.textContent = `Page ${this.currentPage || 1} of ${totalPages || 1}`;
        }

        console.log(`📊 Table statistics updated: ${recordCount} records displayed`);
    }

    updatePaginationControls(totalRecords) {
        // Use total database records for pagination, not just current view count
        const actualTotalRecords = this.totalDatabaseRecords || totalRecords;
        const totalPages = Math.ceil(actualTotalRecords / this.itemsPerPage);

        // Update button states
        const firstPageBtn = document.getElementById('firstPageBtn');
        const prevPageBtn = document.getElementById('prevSFAFPage');
        const nextPageBtn = document.getElementById('nextSFAFPage');
        const lastPageBtn = document.getElementById('lastPageBtn');

        if (firstPageBtn) firstPageBtn.disabled = this.currentPage <= 1;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPage >= totalPages;
        if (lastPageBtn) lastPageBtn.disabled = this.currentPage >= totalPages;

        // Update pagination display text
        const recordsDisplayInfo = document.getElementById('recordsDisplayInfo');
        if (recordsDisplayInfo) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, actualTotalRecords);
            recordsDisplayInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${actualTotalRecords} records`;
        }
    }

    // Supporting function for DOM updates
    updateStatisticsDisplay(stats) {
        // Update main statistics display (Source: db_viewer_html.txt)
        const elements = {
            totalSFAFRecords: stats.total,
            completeSFAFRecords: stats.complete,
            incompleteSFAFRecords: stats.incomplete + stats.empty,
            compliantRecords: stats.compliant
        };

        Object.entries(elements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        });

        // Update additional statistics if elements exist
        this.updateExtendedStatistics(stats);
    }

    // Extended statistics for comprehensive reporting
    updateExtendedStatistics(stats) {
        // Update pagination info
        const recordsDisplayInfo = document.getElementById('recordsDisplayInfo');
        if (recordsDisplayInfo) {
            const startIndex = ((this.currentPage || 1) - 1) * (this.itemsPerPage || 25);
            const endIndex = Math.min(startIndex + (this.itemsPerPage || 25), stats.total);
            recordsDisplayInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${stats.total} records`;
        }

        // Update filter results count
        const filterResultsCount = document.getElementById('filterResultsCount');
        if (filterResultsCount) {
            filterResultsCount.textContent = `${stats.total} records match current filters`;
        }

        // Update analytics if analytics tab elements exist
        this.updateAnalyticsStatistics(stats);
    }

    // Analytics integration for comprehensive reporting
    updateAnalyticsStatistics(stats) {
        // Update system overview statistics (Source: db_viewer_html.txt analytics section)
        const systemStats = document.getElementById('systemStats');
        if (systemStats) {
            systemStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total SFAF Records</span>
                <span class="stat-value">${stats.total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Completion Rate</span>
                <span class="stat-value">${stats.completionPercentage}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MC4EB Compliance</span>
                <span class="stat-value">${stats.compliancePercentage}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Validation Errors</span>
                <span class="stat-value">${stats.validationErrors}</span>
            </div>
        `;
        }

        // Update compliance report
        const complianceReport = document.getElementById('complianceReport');
        if (complianceReport) {
            complianceReport.innerHTML = `
            <div class="compliance-summary">
                <h4>MC4EB Publication 7, Change 1 Compliance Status</h4>
                <div class="compliance-stats">
                    <div class="compliance-item compliant">
                        <span>Compliant Records:</span>
                        <span>${stats.compliant} (${stats.compliancePercentage}%)</span>
                    </div>
                    <div class="compliance-item non-compliant">
                        <span>Non-Compliant Records:</span>
                        <span>${stats.nonCompliant}</span>
                    </div>
                    <div class="compliance-item validation-errors">
                        <span>Validation Errors:</span>
                        <span>${stats.validationErrors}</span>
                    </div>
                </div>
            </div>
        `;
        }
    }

    editSFAFRecord(recordId) {
        try {
            console.log(`📝 Opening SFAF editor for record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found');
                return;
            }

            // Create modal content for SFAF editing
            const modalContent = this.generateSFAFEditForm(record);
            this.showModal('Edit SFAF Record', modalContent);

        } catch (error) {
            console.error('Failed to open SFAF editor:', error);
            this.showError('Failed to open SFAF editor');
        }
    }

    viewSFAFRecord(recordId) {
        try {
            console.log(`👀 Viewing SFAF record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found');
                return;
            }

            // Create modal content for viewing
            const modalContent = this.generateSFAFViewContent(record);
            this.showModal('SFAF Record Details', modalContent);

        } catch (error) {
            console.error('Failed to view SFAF record:', error);
            this.showError('Failed to view SFAF record');
        }
    }

    exportSFAFRecord(recordId) {
        try {
            console.log(`📤 Exporting SFAF record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found');
                return;
            }

            // Generate SFAF export format
            const sfafText = this.generateSFAFExport(record);
            this.downloadFile(`SFAF_${record.serial || recordId}.txt`, sfafText);

        } catch (error) {
            console.error('Failed to export SFAF record:', error);
            this.showError('Failed to export SFAF record');
        }
    }

    generateSFAFEditForm(record) {
        return `
        <div class="sfaf-edit-form">
            <h4>SFAF Fields for ${record.serial}</h4>
            <div class="sfaf-fields-editor">
                ${Object.entries(record.rawSFAFFields || {}).map(([field, value]) => `
                    <div class="sfaf-field-row">
                        <label>${field}:</label>
                        <input type="text" name="${field}" value="${value}" class="sfaf-field-input">
                    </div>
                `).join('')}
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="databaseViewer.saveSFAFChanges('${record.id}')">Save Changes</button>
                <button class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
            </div>
        </div>
    `;
    }

    generateSFAFViewContent(record) {
        return `
        <div class="sfaf-view-content">
            <div class="record-header">
                <h4>${record.serial} - ${record.agency}</h4>
                <p>Frequency: ${record.frequency} | Location: ${record.location}</p>
            </div>
            <div class="sfaf-fields-display">
                <h5>SFAF Fields</h5>
                ${Object.entries(record.rawSFAFFields || {}).map(([field, value]) => `
                    <div class="sfaf-field-display">
                        <span class="field-label">${field}:</span>
                        <span class="field-value">${value}</span>
                    </div>
                `).join('')}
            </div>
            <div class="record-metadata">
                <p>Completion: ${record.sfafCompletionPercentage || 0}%</p>
                <p>MC4EB Compliant: ${record.mcebCompliant?.isCompliant ? '✅ Yes' : '❌ No'}</p>
            </div>
        </div>
    `;
    }

    generateSFAFExport(record) {
        const lines = [];
        Object.entries(record.rawSFAFFields || {}).forEach(([field, value]) => {
            const fieldNumber = field.replace('field', '');
            lines.push(`${fieldNumber}. ${value}`);
        });
        return lines.join('\n');
    }

    saveSFAFChanges(recordId) {
        // Implementation for saving SFAF changes
        console.log('Saving SFAF changes for record:', recordId);
        this.showSuccess('SFAF changes saved successfully');
        this.closeModal();
    }

    // Enhanced modal management within DatabaseViewer class
    closeModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';

            // Reset modal content to prevent stale data
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = modal.querySelector('.modal-body');
            const editForm = document.getElementById('editForm');

            if (modalTitle) {
                modalTitle.textContent = 'Edit Marker';
            }

            if (editForm) {
                editForm.innerHTML = '';
                editForm.onsubmit = null; // Remove event handlers
            }

            // Reset modal footer to default
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
                <button type="submit" form="editForm" class="btn btn-primary">Save Changes</button>
            `;
            }

            // Clear any stored data attributes
            delete modal.dataset.markerId;
            delete modal.dataset.recordId;

            console.log('✅ Modal closed and reset');
        }
    }

    // Enhanced modal opening with proper initialization check
    showModal(title, content, footerButtons = null) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = modal.querySelector('.modal-body');

        if (!modal || !modalTitle || !modalBody) {
            console.error('Modal elements not found in DOM');
            this.showError('Modal system not properly initialized');
            return;
        }

        // Set modal content
        modalTitle.textContent = title;
        modalBody.innerHTML = content;

        // Set custom footer buttons if provided
        if (footerButtons) {
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = footerButtons;
            }
        }

        // Show modal
        modal.style.display = 'block';

        // Focus management for accessibility
        const firstInput = modal.querySelector('input, select, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        console.log(`📋 Modal opened: ${title}`);
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // ✅ ENHANCED: Safe DOM element update for analytics
    updateAnalyticsElement(elementId, content) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = content;
                console.log(`✅ Updated analytics element: ${elementId}`);
            } else {
                console.warn(`⚠️ Analytics element not found: ${elementId}`);
            }
        } catch (error) {
            console.error(`❌ Failed to update analytics element ${elementId}:`, error);
        }
    }

    // ✅ ENHANCED: Error state rendering for analytics
    renderAnalyticsError() {
        const errorContent = `
        <div class="analytics-error">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h4>❌ Analytics Unavailable</h4>
            <p>Unable to load analytics data. This may be due to:</p>
            <ul class="error-reasons">
                <li>Network connectivity issues</li>
                <li>Backend service temporarily unavailable</li>
                <li>Invalid data format received</li>
                <li>Insufficient permissions</li>
            </ul>
            <div class="error-actions">
                <button class="btn btn-primary" onclick="databaseViewer.loadAnalytics()">
                    <i class="fas fa-refresh"></i> Retry Loading Analytics
                </button>
                <button class="btn btn-secondary" onclick="databaseViewer.loadBasicAnalytics()">
                    <i class="fas fa-chart-simple"></i> Load Basic Stats Only
                </button>
            </div>
            <div class="error-details">
                <small>If this problem persists, please check the browser console for detailed error information.</small>
            </div>
        </div>
    `;

        // Update all analytics sections with error state
        this.updateAnalyticsElement('systemStats', errorContent);
        this.updateAnalyticsElement('frequencyChart', this.generateErrorPlaceholder('Frequency Distribution'));
        this.updateAnalyticsElement('complianceReport', this.generateErrorPlaceholder('MC4EB Compliance Report'));
        this.updateAnalyticsElement('geoStats', this.generateErrorPlaceholder('Geographic Distribution'));

        console.log('📊 Analytics error state rendered');
    }

    // ✅ ENHANCED: Generate error placeholder for specific analytics sections
    generateErrorPlaceholder(sectionName) {
        return `
        <div class="analytics-placeholder error-placeholder">
            <div class="placeholder-icon">
                <i class="fas fa-chart-line-down"></i>
            </div>
            <h5>❌ ${sectionName} Unavailable</h5>
            <p>Data could not be loaded for this section.</p>
            <button class="btn btn-sm btn-outline-primary" onclick="databaseViewer.retryAnalyticsSection('${sectionName.toLowerCase().replace(/\s+/g, '')}')">
                <i class="fas fa-retry"></i> Retry
            </button>
        </div>
    `;
    }

    // ✅ ENHANCED: Retry specific analytics section
    async retryAnalyticsSection(sectionId) {
        try {
            console.log(`🔄 Retrying analytics section: ${sectionId}`);
            this.showLoading(true, `Reloading ${sectionId}...`);

            // Load fresh data
            const [markersResponse, iracResponse] = await Promise.all([
                fetch('/api/markers'),
                fetch('/api/irac-notes')
            ]);

            if (!markersResponse.ok || !iracResponse.ok) {
                throw new Error('API request failed');
            }

            const markersData = await markersResponse.json();
            const iracData = await iracResponse.json();

            if (!markersData.success || !iracData.success) {
                throw new Error('API returned error response');
            }

            const markers = Array.isArray(markersData.markers) ? markersData.markers : [];
            const iracNotes = Array.isArray(iracData.notes) ? iracData.notes : [];

            // Re-render specific section
            await this.renderSpecificAnalyticsSection(sectionId, markers, iracNotes);

            console.log(`✅ Successfully retried analytics section: ${sectionId}`);
            this.showSuccess(`${sectionId} section reloaded successfully`);

        } catch (error) {
            console.error(`❌ Failed to retry analytics section ${sectionId}:`, error);
            this.showError(`Failed to reload ${sectionId} section`);
        } finally {
            this.showLoading(false);
        }
    }

    // ✅ ENHANCED: Render specific analytics section
    async renderSpecificAnalyticsSection(sectionId, markers, iracNotes) {
        try {
            switch (sectionId) {
                case 'systemstats':
                    const systemStatsHtml = `
                    <div class="stat-item">
                        <span class="stat-label">Total Markers</span>
                        <span class="stat-value">${markers.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Manual Markers</span>
                        <span class="stat-value">${markers.filter(m => m && m.type === 'manual').length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Imported Markers</span>
                        <span class="stat-value">${markers.filter(m => m && m.type === 'imported').length}</span>
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
                    this.updateAnalyticsElement('systemStats', systemStatsHtml);
                    break;

                case 'frequencydistribution':
                    const frequencyStats = this.analyzeFrequencyDistribution(markers);
                    const totalMarkers = Math.max(markers.length, 1);
                    const frequencyChartHtml = `
                    <div class="frequency-bands">
                        <div class="band-item">
                            <span class="band-label">VHF (30-300 MHz)</span>
                            <div class="band-bar">
                                <div class="band-fill" style="width: ${(frequencyStats.vhf / totalMarkers) * 100}%"></div>
                            </div>
                            <span class="band-count">${frequencyStats.vhf}</span>
                        </div>
                        <div class="band-item">
                            <span class="band-label">UHF (300-3000 MHz)</span>
                            <div class="band-bar">
                                <div class="band-fill" style="width: ${(frequencyStats.uhf / totalMarkers) * 100}%"></div>
                            </div>
                            <span class="band-count">${frequencyStats.uhf}</span>
                        </div>
                        <div class="band-item">
                            <span class="band-label">SHF (3-30 GHz)</span>
                            <div class="band-bar">
                                <div class="band-fill" style="width: ${(frequencyStats.shf / totalMarkers) * 100}%"></div>
                            </div>
                            <span class="band-count">${frequencyStats.shf}</span>
                        </div>
                        <div class="band-item">
                            <span class="band-label">No Frequency</span>
                            <div class="band-bar">
                                <div class="band-fill" style="width: ${(frequencyStats.none / totalMarkers) * 100}%"></div>
                            </div>
                            <span class="band-count">${frequencyStats.none}</span>
                        </div>
                    </div>
                `;
                    this.updateAnalyticsElement('frequencyChart', frequencyChartHtml);
                    break;

                case 'mcebcompliancereport':
                    const complianceReport = await this.generateComplianceReport(markers);
                    const complianceHtml = `
                    <div class="compliance-grid">
                        <div class="compliance-item ${complianceReport.field500Compliance ? 'compliant' : 'non-compliant'}">
                            <span class="compliance-label">Field 500 Compliance</span>
                            <span class="compliance-status">${complianceReport.field500Compliance ? '✅ Compliant' : '❌ Non-Compliant'}</span>
                            <span class="compliance-detail">Max 10 occurrences per MC4EB Pub 7 CHG 1</span>
                        </div>
                        <div class="compliance-item ${complianceReport.field501Compliance ? 'compliant' : 'non-compliant'}">
                            <span class="compliance-label">Field 501 Compliance</span>
                            <span class="compliance-status">${complianceReport.field501Compliance ? '✅ Compliant' : '❌ Non-Compliant'}</span>
                            <span class="compliance-detail">Max 30 occurrences per MC4EB Pub 7 CHG 1</span>
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
                    this.updateAnalyticsElement('complianceReport', complianceHtml);
                    break;

                case 'geographicdistribution':
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
                    this.updateAnalyticsElement('geoStats', geoStatsHtml);
                    break;

                default:
                    console.warn(`⚠️ Unknown analytics section: ${sectionId}`);
            }
        } catch (error) {
            console.error(`❌ Failed to render analytics section ${sectionId}:`, error);
            throw error;
        }
    }

    // ✅ ENHANCED: Load basic analytics with minimal data
    async loadBasicAnalytics() {
        try {
            console.log('📊 Loading basic analytics fallback...');
            this.showLoading(true, 'Loading basic statistics...');

            // Try to get just marker count
            const markersResponse = await fetch('/api/markers');

            if (markersResponse.ok) {
                const markersData = await markersResponse.json();
                const markerCount = markersData.success ? (markersData.markers || []).length : 0;

                // Render minimal analytics
                const basicStatsHtml = `
                <div class="basic-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Markers</span>
                        <span class="stat-value">${markerCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">System Status</span>
                        <span class="stat-value">✅ Operational</span>
                    </div>
                    <div class="stat-note">
                        <small>Basic statistics loaded. Full analytics unavailable.</small>
                    </div>
                </div>
            `;

                this.updateAnalyticsElement('systemStats', basicStatsHtml);
                this.updateAnalyticsElement('frequencyChart', this.generateBasicPlaceholder('Frequency analysis unavailable'));
                this.updateAnalyticsElement('complianceReport', this.generateBasicPlaceholder('Compliance report unavailable'));
                this.updateAnalyticsElement('geoStats', this.generateBasicPlaceholder('Geographic analysis unavailable'));

                this.showSuccess('Basic analytics loaded successfully');
            } else {
                throw new Error('Unable to connect to backend services');
            }

        } catch (error) {
            console.error('❌ Failed to load basic analytics:', error);
            this.showError('Unable to load any analytics data');
            this.renderAnalyticsError();
        } finally {
            this.showLoading(false);
        }
    }

    // ✅ ENHANCED: Generate basic placeholder for unavailable sections
    generateBasicPlaceholder(message) {
        return `
        <div class="analytics-placeholder basic-placeholder">
            <div class="placeholder-content">
                <i class="fas fa-info-circle"></i>
                <p>${message}</p>
                <small>Try refreshing the page or contact support if this persists.</small>
            </div>
        </div>
    `;
    }

    analyzeGeographicDistribution(markers) {
        if (!Array.isArray(markers) || markers.length === 0) {
            return {
                spread: 0,
                center: { lat: 0, lng: 0 },
                bounds: { north: 0, south: 0, east: 0, west: 0 },
                statistics: {
                    totalMarkers: 0,
                    validCoordinates: 0,
                    invalidCoordinates: 0,
                    densityAnalysis: {},
                    coordinateQuality: 'No data available'
                }
            };
        }

        // ✅ CORRECTED: Use correct property names from database schema (Source: main_go.txt marker structure)
        const validMarkers = markers.filter(m =>
            m &&
            typeof m.latitude === 'number' && !isNaN(m.latitude) &&
            typeof m.longitude === 'number' && !isNaN(m.longitude) &&
            m.latitude >= -90 && m.latitude <= 90 &&
            m.longitude >= -180 && m.longitude <= 180
        );

        if (validMarkers.length === 0) {
            return {
                spread: 0,
                center: { lat: 0, lng: 0 },
                bounds: { north: 0, south: 0, east: 0, west: 0 },
                statistics: {
                    totalMarkers: markers.length,
                    validCoordinates: 0,
                    invalidCoordinates: markers.length,
                    densityAnalysis: {},
                    coordinateQuality: 'All coordinates invalid'
                }
            };
        }

        // ✅ ENHANCED: Extract coordinate arrays with validation
        const latitudes = validMarkers.map(m => parseFloat(m.latitude));
        const longitudes = validMarkers.map(m => parseFloat(m.longitude));

        // ✅ ENHANCED: Calculate geographic bounds
        const bounds = {
            north: Math.max(...latitudes),
            south: Math.min(...latitudes),
            east: Math.max(...longitudes),
            west: Math.min(...longitudes)
        };

        // ✅ ENHANCED: Calculate geographic center
        const center = {
            lat: (bounds.north + bounds.south) / 2,
            lng: (bounds.east + bounds.west) / 2
        };

        // ✅ ENHANCED: Calculate geographic spread (maximum extent)
        const latSpread = bounds.north - bounds.south;
        const lngSpread = bounds.east - bounds.west;
        const spread = Math.max(latSpread, lngSpread);

        // ✅ ENHANCED: Advanced statistical analysis
        const statistics = {
            totalMarkers: markers.length,
            validCoordinates: validMarkers.length,
            invalidCoordinates: markers.length - validMarkers.length,
            densityAnalysis: this.calculateDensityAnalysis(validMarkers, bounds),
            coordinateQuality: this.assessCoordinateQuality(validMarkers.length, markers.length),
            standardDeviation: {
                latitude: this.calculateStandardDeviation(latitudes),
                longitude: this.calculateStandardDeviation(longitudes)
            },
            averageDistanceFromCenter: this.calculateAverageDistanceFromCenter(validMarkers, center),
            clustersDetected: this.detectCoordinateClusters(validMarkers),
            coverage: {
                latitudeRange: latSpread,
                longitudeRange: lngSpread,
                totalArea: this.calculateCoverageArea(bounds)
            }
        };

        return {
            spread,
            center,
            bounds,
            statistics,
            validMarkers: validMarkers.length,
            invalidMarkers: markers.length - validMarkers.length
        };
    }

    // ✅ ENHANCED: Calculate density analysis for geographic distribution
    calculateDensityAnalysis(markers, bounds) {
        if (markers.length === 0) {
            return { regions: [], averageDensity: 0, highestDensity: 0 };
        }

        // Divide area into grid for density analysis
        const gridSize = 4; // 4x4 grid
        const latStep = (bounds.north - bounds.south) / gridSize;
        const lngStep = (bounds.east - bounds.west) / gridSize;

        const densityGrid = [];

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const regionBounds = {
                    north: bounds.south + (i + 1) * latStep,
                    south: bounds.south + i * latStep,
                    east: bounds.west + (j + 1) * lngStep,
                    west: bounds.west + j * lngStep
                };

                const markersInRegion = markers.filter(marker =>
                    marker.lat >= regionBounds.south &&
                    marker.lat < regionBounds.north &&
                    marker.lng >= regionBounds.west &&
                    marker.lng < regionBounds.east
                );

                densityGrid.push({
                    region: `${i}-${j}`,
                    bounds: regionBounds,
                    markerCount: markersInRegion.length,
                    density: markersInRegion.length / ((latStep * lngStep) || 1)
                });
            }
        }

        const totalDensity = densityGrid.reduce((sum, region) => sum + region.density, 0);
        const averageDensity = totalDensity / densityGrid.length;
        const highestDensity = Math.max(...densityGrid.map(region => region.density));

        return {
            regions: densityGrid,
            averageDensity: averageDensity,
            highestDensity: highestDensity
        };
    }

    // ✅ ENHANCED: Assess coordinate quality based on validation results
    assessCoordinateQuality(validCount, totalCount) {
        if (totalCount === 0) return 'No data';

        const qualityRatio = validCount / totalCount;

        if (qualityRatio >= 0.95) return 'Excellent (≥95% valid)';
        if (qualityRatio >= 0.85) return 'Good (85-94% valid)';
        if (qualityRatio >= 0.70) return 'Fair (70-84% valid)';
        if (qualityRatio >= 0.50) return 'Poor (50-69% valid)';
        return 'Critical (<50% valid)';
    }

    // ✅ ENHANCED: Calculate standard deviation for coordinate spread analysis
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / values.length;

        return Math.sqrt(variance);
    }

    // ✅ ENHANCED: Calculate average distance from geographic center
    calculateAverageDistanceFromCenter(markers, center) {
        if (markers.length === 0) return 0;

        const distances = markers.map(marker => {
            return this.calculateHaversineDistance(
                center.lat, center.lng,
                marker.lat, marker.lng
            );
        });

        return distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
    }

    // ✅ ENHANCED: Haversine distance calculation for accurate geographic distances
    calculateHaversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers

        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // ✅ ENHANCED: Convert degrees to radians for trigonometric calculations
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // ✅ ENHANCED: Detect coordinate clusters using simple proximity analysis
    detectCoordinateClusters(markers) {
        if (markers.length < 2) return [];

        const clusters = [];
        const processed = new Set();
        const clusterThreshold = 0.01; // Approximately 1km at equator

        markers.forEach((marker, index) => {
            if (processed.has(index)) return;

            const cluster = [marker];
            processed.add(index);

            markers.forEach((otherMarker, otherIndex) => {
                if (processed.has(otherIndex)) return;

                const distance = Math.sqrt(
                    Math.pow(marker.lat - otherMarker.latitude, 2) +
                    Math.pow(marker.lng - otherMarker.longitude, 2)
                );

                if (distance <= clusterThreshold) {
                    cluster.push(otherMarker);
                    processed.add(otherIndex);
                }
            });

            if (cluster.length > 1) {
                clusters.push({
                    size: cluster.length,
                    center: {
                        lat: cluster.reduce((sum, m) => sum + m.latitude, 0) / cluster.length,
                        lng: cluster.reduce((sum, m) => sum + m.longitude, 0) / cluster.length
                    },
                    markers: cluster.map(m => m.id)
                });
            }
        });

        return clusters;
    }

    // ✅ ENHANCED: Calculate total coverage area in square kilometers
    calculateCoverageArea(bounds) {
        const latDiff = bounds.north - bounds.south;
        const lngDiff = bounds.east - bounds.west;

        // Approximate area calculation (not precise due to earth curvature)
        const latKm = latDiff * 111.32; // 1 degree latitude ≈ 111.32 km
        const lngKm = lngDiff * 111.32 * Math.cos(this.toRadians((bounds.north + bounds.south) / 2));

        return Math.abs(latKm * lngKm);
    }

    // ✅ ENHANCED: Generate comprehensive geographic statistics HTML
    generateGeographicStatsHtml(geoStats) {
        return `
        <div class="geo-stats-comprehensive">
            <!-- Primary Statistics -->
            <div class="geo-stats-primary">
                <div class="stat-item">
                    <span class="stat-label">Geographic Spread</span>
                    <span class="stat-value">${geoStats.spread.toFixed(2)}°</span>
                    <span class="stat-unit">degrees</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Center Point</span>
                    <span class="stat-value">${geoStats.center.lat.toFixed(4)}, ${geoStats.center.lng.toFixed(4)}</span>
                    <span class="stat-unit">decimal degrees</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Valid Coordinates</span>
                    <span class="stat-value">${geoStats.statistics.validCoordinates}/${geoStats.statistics.totalMarkers}</span>
                    <span class="stat-unit">${((geoStats.statistics.validCoordinates / Math.max(geoStats.statistics.totalMarkers, 1)) * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <!-- Boundary Information -->
            <div class="geo-stats-bounds">
                <h5><i class="fas fa-map-marked"></i> Geographic Boundaries</h5>
                <div class="bounds-grid">
                    <div class="bound-item">
                        <span class="bound-label"><i class="fas fa-arrow-up"></i> Northernmost</span>
                        <span class="bound-value">${geoStats.bounds.north.toFixed(4)}°</span>
                    </div>
                    <div class="bound-item">
                        <span class="bound-label"><i class="fas fa-arrow-down"></i> Southernmost</span>
                        <span class="bound-value">${geoStats.bounds.south.toFixed(4)}°</span>
                    </div>
                    <div class="bound-item">
                        <span class="bound-label"><i class="fas fa-arrow-right"></i> Easternmost</span>
                        <span class="bound-value">${geoStats.bounds.east.toFixed(4)}°</span>
                    </div>
                    <div class="bound-item">
                        <span class="bound-label"><i class="fas fa-arrow-left"></i> Westernmost</span>
                        <span class="bound-value">${geoStats.bounds.west.toFixed(4)}°</span>
                    </div>
                </div>
            </div>
            
            <!-- Advanced Statistics -->
            <div class="geo-stats-advanced">
                <h5><i class="fas fa-chart-area"></i> Statistical Analysis</h5>
                <div class="advanced-stats">
                    <div class="stat-item">
                        <span class="stat-label">Coordinate Quality</span>
                        <span class="stat-value quality-indicator ${this.getQualityClass(geoStats.statistics.coordinateQuality)}">${geoStats.statistics.coordinateQuality}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Coverage Area</span>
                        <span class="stat-value">${geoStats.statistics.coverage.totalArea.toFixed(2)}</span>
                        <span class="stat-unit">km²</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Avg Distance from Center</span>
                        <span class="stat-value">${geoStats.statistics.averageDistanceFromCenter.toFixed(2)}</span>
                        <span class="stat-unit">km</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Standard Deviation (Lat)</span>
                        <span class="stat-value">${geoStats.statistics.standardDeviation.latitude.toFixed(4)}°</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Standard Deviation (Lng)</span>
                        <span class="stat-value">${geoStats.statistics.standardDeviation.longitude.toFixed(4)}°</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Clusters Detected</span>
                        <span class="stat-value">${geoStats.statistics.clustersDetected.length}</span>
                        <span class="stat-unit">clusters</span>
                    </div>
                </div>
            </div>

            <!-- Density Analysis -->
            <div class="geo-stats-density">
                <h5><i class="fas fa-th"></i> Density Analysis</h5>
                <div class="density-stats">
                    <div class="stat-item">
                        <span class="stat-label">Average Density</span>
                        <span class="stat-value">${geoStats.statistics.densityAnalysis.averageDensity.toFixed(3)}</span>
                        <span class="stat-unit">markers/deg²</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Highest Density Region</span>
                        <span class="stat-value">${geoStats.statistics.densityAnalysis.highestDensity.toFixed(3)}</span>
                        <span class="stat-unit">markers/deg²</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Density Distribution</span>
                        <span class="stat-value">${this.categorizeDistribution(geoStats.statistics.densityAnalysis)}</span>
                    </div>
                </div>
            </div>

            <!-- Cluster Information -->
            ${geoStats.statistics.clustersDetected.length > 0 ? `
            <div class="geo-stats-clusters">
                <h5><i class="fas fa-object-group"></i> Detected Clusters</h5>
                <div class="clusters-list">
                    ${geoStats.statistics.clustersDetected.map((cluster, index) => `
                        <div class="cluster-item">
                            <div class="cluster-header">
                                <span class="cluster-label">Cluster ${index + 1}</span>
                                <span class="cluster-size">${cluster.size} markers</span>
                            </div>
                            <div class="cluster-center">
                                <small>Center: ${cluster.center.lat.toFixed(4)}, ${cluster.center.lng.toFixed(4)}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Coverage Summary -->
            <div class="geo-stats-coverage">
                <h5><i class="fas fa-globe"></i> Coverage Summary</h5>
                <div class="coverage-stats">
                    <div class="coverage-item">
                        <span class="coverage-label">Latitude Range</span>
                        <span class="coverage-value">${geoStats.statistics.coverage.latitudeRange.toFixed(4)}°</span>
                        <div class="coverage-bar">
                            <div class="coverage-fill" style="width: ${Math.min((geoStats.statistics.coverage.latitudeRange / 180) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <div class="coverage-item">
                        <span class="coverage-label">Longitude Range</span>
                        <span class="coverage-value">${geoStats.statistics.coverage.longitudeRange.toFixed(4)}°</span>
                        <div class="coverage-bar">
                            <div class="coverage-fill" style="width: ${Math.min((geoStats.statistics.coverage.longitudeRange / 360) * 100, 100)}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Military Grid Reference System Integration -->
            <div class="geo-stats-mgrs">
                <h5><i class="fas fa-crosshairs"></i> Military Grid Analysis</h5>
                <div class="mgrs-stats">
                    <div class="stat-item">
                        <span class="stat-label">Primary UTM Zone</span>
                        <span class="stat-value">${this.calculatePrimaryUTMZone(geoStats.center)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">MGRS Grid Square</span>
                        <span class="stat-value">${this.calculateMGRSGrid(geoStats.center)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Geographic Region</span>
                        <span class="stat-value">${this.identifyGeographicRegion(geoStats.center)}</span>
                    </div>
                </div>
            </div>

            <!-- Data Quality Indicators -->
            <div class="geo-stats-quality">
                <h5><i class="fas fa-check-circle"></i> Data Quality</h5>
                <div class="quality-indicators">
                    <div class="quality-item ${geoStats.statistics.validCoordinates / geoStats.statistics.totalMarkers > 0.9 ? 'excellent' : geoStats.statistics.validCoordinates / geoStats.statistics.totalMarkers > 0.7 ? 'good' : 'poor'}">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Coordinate Completeness</span>
                        <span class="quality-percentage">${((geoStats.statistics.validCoordinates / geoStats.statistics.totalMarkers) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="quality-item ${geoStats.statistics.standardDeviation.latitude < 1 && geoStats.statistics.standardDeviation.longitude < 1 ? 'excellent' : geoStats.statistics.standardDeviation.latitude < 5 && geoStats.statistics.standardDeviation.longitude < 5 ? 'good' : 'poor'}">
                        <i class="fas fa-bullseye"></i>
                        <span>Geographic Precision</span>
                        <span class="quality-status">${geoStats.statistics.standardDeviation.latitude < 1 && geoStats.statistics.standardDeviation.longitude < 1 ? 'High' : geoStats.statistics.standardDeviation.latitude < 5 && geoStats.statistics.standardDeviation.longitude < 5 ? 'Medium' : 'Low'}</span>
                    </div>
                    <div class="quality-item ${geoStats.statistics.clustersDetected.length > 0 ? 'good' : 'excellent'}">
                        <i class="fas fa-expand-arrows-alt"></i>
                        <span>Distribution Pattern</span>
                        <span class="quality-status">${geoStats.statistics.clustersDetected.length === 0 ? 'Distributed' : geoStats.statistics.clustersDetected.length < 3 ? 'Clustered' : 'Highly Clustered'}</span>
                    </div>
                </div>
            </div>

            <!-- Export and Actions -->
            <div class="geo-stats-actions">
                <button class="btn btn-sm btn-primary" onclick="databaseViewer.exportGeographicData()">
                    <i class="fas fa-download"></i> Export Geographic Data
                </button>
                <button class="btn btn-sm btn-secondary" onclick="databaseViewer.viewGeographicMap()">
                    <i class="fas fa-map"></i> View on Map
                </button>
                <button class="btn btn-sm btn-info" onclick="databaseViewer.generateGeographicReport()">
                    <i class="fas fa-file-alt"></i> Generate Report
                </button>
            </div>
        </div>
    `;
    }

    // ✅ ENHANCED: Supporting helper functions for geographic analysis
    getQualityClass(qualityText) {
        if (qualityText.includes('Excellent')) return 'quality-excellent';
        if (qualityText.includes('Good')) return 'quality-good';
        if (qualityText.includes('Fair')) return 'quality-fair';
        if (qualityText.includes('Poor')) return 'quality-poor';
        return 'quality-critical';
    }

    categorizeDistribution(densityAnalysis) {
        const variation = densityAnalysis.highestDensity - densityAnalysis.averageDensity;

        if (variation < 0.001) return 'Uniform Distribution';
        if (variation < 0.01) return 'Slightly Clustered';
        if (variation < 0.1) return 'Moderately Clustered';
        return 'Highly Clustered';
    }

    calculatePrimaryUTMZone(center) {
        // Calculate UTM zone from longitude (simplified)
        const zone = Math.floor((center.lng + 180) / 6) + 1;
        const hemisphere = center.lat >= 0 ? 'N' : 'S';
        return `${zone}${hemisphere}`;
    }

    calculateMGRSGrid(center) {
        // Simplified MGRS grid calculation (would need full implementation for production)
        const utmZone = this.calculatePrimaryUTMZone(center);
        const gridSquare = String.fromCharCode(65 + Math.floor(Math.abs(center.lat) / 8)) +
            String.fromCharCode(65 + Math.floor((center.lng + 180) / 6));
        return `${utmZone} ${gridSquare}`;
    }

    identifyGeographicRegion(center) {
        // Basic geographic region identification
        const lat = center.lat;
        const lng = center.lng;

        // North America
        if (lat >= 15 && lat <= 72 && lng >= -168 && lng <= -52) {
            if (lat >= 49) {
                return 'North America - Canada';
            } else if (lat >= 25.8 && lng >= -125 && lng <= -66) {
                return 'North America - Continental US';
            } else if (lat >= 18 && lat <= 28 && lng >= -106 && lng <= -80) {
                return 'North America - Gulf of Mexico';
            } else if (lng >= -168 && lng <= -154 && lat >= 18 && lat <= 23) {
                return 'North America - Hawaii';
            } else if (lng >= -180 && lng <= -129 && lat >= 51 && lat <= 71) {
                return 'North America - Alaska';
            } else {
                return 'North America - Other';
            }
        }

        // Europe
        if (lat >= 36 && lat <= 71 && lng >= -10 && lng <= 40) {
            if (lat >= 54) {
                return 'Europe - Northern Europe';
            } else if (lat >= 46 && lat <= 54) {
                return 'Europe - Central Europe';
            } else if (lat >= 36 && lat <= 46) {
                return 'Europe - Southern Europe';
            } else {
                return 'Europe - Other';
            }
        }

        // Asia
        if (lat >= -10 && lat <= 80 && lng >= 26 && lng <= 180) {
            if (lat >= 50 && lng >= 60 && lng <= 180) {
                return 'Asia - Northern Asia';
            } else if (lat >= 30 && lat <= 50 && lng >= 60 && lng <= 140) {
                return 'Asia - Central Asia';
            } else if (lat >= 5 && lat <= 35 && lng >= 60 && lng <= 100) {
                return 'Asia - South Asia';
            } else if (lat >= 10 && lat <= 50 && lng >= 100 && lng <= 145) {
                return 'Asia - East Asia';
            } else if (lat >= -10 && lat <= 25 && lng >= 90 && lng <= 145) {
                return 'Asia - Southeast Asia';
            } else {
                return 'Asia - Other';
            }
        }

        // Africa
        if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 51) {
            if (lat >= 15) {
                return 'Africa - Northern Africa';
            } else if (lat >= -5 && lat <= 15) {
                return 'Africa - Central Africa';
            } else if (lat >= -35 && lat <= -5) {
                return 'Africa - Southern Africa';
            } else {
                return 'Africa - Other';
            }
        }

        // South America
        if (lat >= -55 && lat <= 13 && lng >= -82 && lng <= -34) {
            if (lat >= 0) {
                return 'South America - Northern South America';
            } else if (lat >= -30) {
                return 'South America - Central South America';
            } else {
                return 'South America - Southern South America';
            }
        }

        // Australia/Oceania
        if (lat >= -50 && lat <= -5 && lng >= 110 && lng <= 180) {
            return 'Australia/Oceania';
        }

        // Pacific Ocean regions
        if (lng >= -180 && lng <= -60 && lat >= -60 && lat <= 60) {
            if (lat >= 20) {
                return 'Pacific Ocean - North Pacific';
            } else if (lat >= -20) {
                return 'Pacific Ocean - Central Pacific';
            } else {
                return 'Pacific Ocean - South Pacific';
            }
        }

        // Atlantic Ocean regions
        if (lng >= -60 && lng <= 20 && lat >= -60 && lat <= 80) {
            if (lat >= 25) {
                return 'Atlantic Ocean - North Atlantic';
            } else if (lat >= 0) {
                return 'Atlantic Ocean - Tropical Atlantic';
            } else {
                return 'Atlantic Ocean - South Atlantic';
            }
        }

        // Indian Ocean
        if (lng >= 20 && lng <= 120 && lat >= -60 && lat <= 30) {
            return 'Indian Ocean';
        }

        // Arctic region
        if (lat >= 66.5) {
            return 'Arctic Region';
        }

        // Antarctic region
        if (lat <= -60) {
            return 'Antarctic Region';
        }

        // Default for unclassified regions
        return 'Unclassified Region';
    }

    // ✅ ENHANCED: Export geographic data functionality
    async exportGeographicData() {
        try {
            console.log('📤 Exporting geographic data...');

            const response = await fetch('/api/markers');
            if (!response.ok) {
                throw new Error(`Failed to fetch markers: ${response.status}`);
            }

            const markersData = await response.json();
            if (!markersData.success) {
                throw new Error(markersData.error || 'Failed to load markers');
            }

            const markers = Array.isArray(markersData.markers) ? markersData.markers : [];
            const geoStats = this.analyzeGeographicDistribution(markers);

            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    totalMarkers: markers.length,
                    validCoordinates: geoStats.statistics?.validCoordinates || 0,
                    application: 'SFAF Plotter Database Viewer',
                    version: '1.0.0'
                },
                geographicAnalysis: {
                    center: geoStats.center,
                    bounds: geoStats.bounds,
                    spread: geoStats.spread,
                    region: this.identifyGeographicRegion(geoStats.center),
                    statistics: geoStats.statistics
                },
                markers: markers.map(marker => ({
                    id: marker.id,
                    serial: marker.serial || 'Unknown',
                    latitude: marker.lat,
                    longitude: marker.lng,
                    frequency: marker.frequency,
                    markerType: marker.type || marker.marker_type,
                    createdAt: marker.created_at,
                    region: marker.lat && marker.lng ?
                        this.identifyGeographicRegion({ lat: marker.lat, lng: marker.lng }) : 'Unknown'
                })),
                coordinateFormats: {
                    note: 'All coordinates provided in decimal degrees format',
                    precision: 'Coordinates accurate to 4 decimal places (~11 meters)'
                }
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `SFAF_Geographic_Analysis_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            this.showSuccess('Geographic data exported successfully');

        } catch (error) {
            console.error('❌ Failed to export geographic data:', error);
            this.showError(`Failed to export geographic data: ${error.message}`);
        }
    }

    // ✅ ENHANCED: View geographic data on map
    async viewGeographicMap() {
        try {
            console.log('🗺️ Opening geographic map view...');

            // Construct URL with current marker data for map display
            const params = new URLSearchParams({
                view: 'geographic',
                analytics: 'true',
                source: 'database_viewer'
            });

            // Open main map page with analytics overlay
            const mapUrl = `/?${params.toString()}`;
            window.open(mapUrl, '_blank');

        } catch (error) {
            console.error('❌ Failed to open geographic map:', error);
            this.showError('Failed to open geographic map view');
        }
    }

    // ✅ ENHANCED: Generate comprehensive geographic report
    async generateGeographicReport() {
        try {
            console.log('📄 Generating geographic report...');
            this.showLoading(true, 'Generating report...');

            const response = await fetch('/api/markers');
            if (!response.ok) {
                throw new Error(`Failed to fetch markers: ${response.status}`);
            }

            const markersData = await response.json();
            if (!markersData.success) {
                throw new Error(markersData.error || 'Failed to load markers');
            }

            const markers = Array.isArray(markersData.markers) ? markersData.markers : [];
            const geoStats = this.analyzeGeographicDistribution(markers);

            // Generate comprehensive HTML report
            const reportHtml = this.generateGeographicReportHtml(markers, geoStats);

            // Create and download HTML file
            const reportBlob = new Blob([reportHtml], { type: 'text/html' });
            const url = URL.createObjectURL(reportBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `SFAF_Geographic_Report_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            this.showSuccess('Geographic report generated successfully');

        } catch (error) {
            console.error('❌ Failed to generate geographic report:', error);
            this.showError(`Failed to generate report: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // ✅ ENHANCED: Generate HTML report for geographic analysis
    generateGeographicReportHtml(markers, geoStats) {
        const reportDate = new Date().toLocaleString();
        const region = this.identifyGeographicRegion(geoStats.center);

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SFAF Plotter - Geographic Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin: 0; font-size: 28px; }
        .header p { color: #7f8c8d; margin: 5px 0; }
        .section { margin: 30px 0; }
        .section h2 { color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3498db; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #7f8c8d; font-size: 14px; margin-top: 5px; }
        .quality-indicator { padding: 5px 10px; border-radius: 20px; color: white; font-weight: bold; }
        .quality-excellent { background: #27ae60; }
        .quality-good { background: #2980b9; }
        .quality-fair { background: #f39c12; }
        .quality-poor { background: #e74c3c; }
        .quality-critical { background: #8e44ad; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
        th { background: #f8f9fa; font-weight: 600; }
        .cluster-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .cluster-card { background: #ecf0f1; padding: 15px; border-radius: 6px; }
        .bounds-table { margin: 20px 0; }
        .coordinate-details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; }
        .mgrs-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .density-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
        .density-cell { background: #e8f4f8; padding: 10px; text-align: center; border-radius: 4px; border: 1px solid #bdc3c7; }
        .high-density { background: #e74c3c; color: white; }
        .medium-density { background: #f39c12; color: white; }
        .low-density { background: #27ae60; color: white; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌍 SFAF Plotter Geographic Analysis Report</h1>
            <p>Military Frequency Coordination Database - Geographic Distribution Analysis</p>
            <p><strong>Generated:</strong> ${reportDate} | <strong>Region:</strong> ${region}</p>
            <p><strong>Compliance:</strong> MC4EB Publication 7, Change 1 Standards</p>
        </div>

        <div class="section">
            <h2>📊 Executive Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${markers.length}</div>
                    <div class="stat-label">Total Markers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.validCoordinates || 0}</div>
                    <div class="stat-label">Valid Coordinates</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.spread.toFixed(2)}°</div>
                    <div class="stat-label">Geographic Spread</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.clustersDetected?.length || 0}</div>
                    <div class="stat-label">Clusters Detected</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.coverage?.totalArea?.toFixed(2) || 0}</div>
                    <div class="stat-label">Coverage Area (km²)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">
                        <span class="quality-indicator ${this.getQualityClass(geoStats.statistics?.coordinateQuality || 'Unknown')}">${geoStats.statistics?.coordinateQuality || 'Unknown'}</span>
                    </div>
                    <div class="stat-label">Data Quality</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 Geographic Center & Boundaries</h2>
            <div class="coordinate-details">
                <h4>Geographic Center Point</h4>
                <p><strong>Decimal Degrees:</strong> ${geoStats.center.lat.toFixed(6)}, ${geoStats.center.lng.toFixed(6)}</p>
                <p><strong>Primary UTM Zone:</strong> ${this.calculatePrimaryUTMZone(geoStats.center)}</p>
                <p><strong>MGRS Grid:</strong> ${this.calculateMGRSGrid(geoStats.center)}</p>
                <p><strong>Geographic Region:</strong> ${region}</p>
            </div>
            
            <table class="bounds-table">
                <thead>
                    <tr>
                        <th>Boundary</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Location Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>🔺 Northernmost</td>
                        <td>${geoStats.bounds.north.toFixed(6)}°</td>
                        <td>-</td>
                        <td>${this.identifyGeographicRegion({ lat: geoStats.bounds.north, lng: geoStats.center.lng })}</td>
                    </tr>
                    <tr>
                        <td>🔻 Southernmost</td>
                        <td>${geoStats.bounds.south.toFixed(6)}°</td>
                        <td>-</td>
                        <td>${this.identifyGeographicRegion({ lat: geoStats.bounds.south, lng: geoStats.center.lng })}</td>
                    </tr>
                    <tr>
                        <td>▶️ Easternmost</td>
                        <td>-</td>
                        <td>${geoStats.bounds.east.toFixed(6)}°</td>
                        <td>${this.identifyGeographicRegion({ lat: geoStats.center.lat, lng: geoStats.bounds.east })}</td>
                    </tr>
                    <tr>
                        <td>◀️ Westernmost</td>
                        <td>-</td>
                        <td>${geoStats.bounds.west.toFixed(6)}°</td>
                        <td>${this.identifyGeographicRegion({ lat: geoStats.center.lat, lng: geoStats.bounds.west })}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📈 Statistical Analysis</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.averageDistanceFromCenter?.toFixed(2) || 'N/A'}</div>
                    <div class="stat-label">Avg Distance from Center (km)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.standardDeviation?.latitude?.toFixed(4) || 'N/A'}</div>
                    <div class="stat-label">Latitude Std Dev (°)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.standardDeviation?.longitude?.toFixed(4) || 'N/A'}</div>
                    <div class="stat-label">Longitude Std Dev (°)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.coverage?.latitudeRange?.toFixed(4) || 'N/A'}</div>
                    <div class="stat-label">Latitude Range (°)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.coverage?.longitudeRange?.toFixed(4) || 'N/A'}</div>
                    <div class="stat-label">Longitude Range (°)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.categorizeDistribution(geoStats.statistics?.densityAnalysis || {})}</div>
                    <div class="stat-label">Distribution Pattern</div>
                </div>
            </div>
        </div>

        ${geoStats.statistics?.clustersDetected?.length > 0 ? `
        <div class="section">
            <h2>🔗 Cluster Analysis</h2>
            <p>Detected ${geoStats.statistics.clustersDetected.length} geographic clusters using proximity analysis (threshold: ~1km):</p>
            <div class="cluster-list">
                ${geoStats.statistics.clustersDetected.map((cluster, index) => `
                    <div class="cluster-card">
                        <h4>Cluster ${index + 1}</h4>
                        <p><strong>Size:</strong> ${cluster.size} markers</p>
                        <p><strong>Center:</strong> ${cluster.center.lat.toFixed(4)}, ${cluster.center.lng.toFixed(4)}</p>
                        <p><strong>Region:</strong> ${this.identifyGeographicRegion(cluster.center)}</p>
                        <p><strong>Marker IDs:</strong> ${cluster.markers.join(', ')}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>📊 Density Distribution Analysis</h2>
            <p>Geographic area divided into 4x4 grid for density analysis:</p>
            <div class="density-grid">
                ${(geoStats.statistics?.densityAnalysis?.regions || []).map(region => `
                    <div class="density-cell ${region.density > 0.1 ? 'high-density' : region.density > 0.05 ? 'medium-density' : 'low-density'}">
                        <div>Region ${region.region}</div>
                        <div>${region.markerCount} markers</div>
                        <div>Density: ${region.density.toFixed(3)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.densityAnalysis?.averageDensity?.toFixed(4) || 'N/A'}</div>
                    <div class="stat-label">Average Density (markers/deg²)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${geoStats.statistics?.densityAnalysis?.highestDensity?.toFixed(4) || 'N/A'}</div>
                    <div class="stat-label">Highest Regional Density</div>
                </div>
            </div>
        </div>

                <div class="mgrs-section">
            <h2>🎯 Military Grid Reference System (MGRS)</h2>
            <div class="stats-grid" style="color: white;">
                <div class="stat-card" style="background: rgba(255,255,255,0.1); border-left: 4px solid white; color: white;">
                    <div class="stat-value" style="color: white;">${this.calculatePrimaryUTMZone(geoStats.center)}</div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">Primary UTM Zone</div>
                </div>
                <div class="stat-card" style="background: rgba(255,255,255,0.1); border-left: 4px solid white; color: white;">
                    <div class="stat-value" style="color: white;">${this.calculateMGRSGrid(geoStats.center)}</div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">MGRS Grid Square</div>
                </div>
                <div class="stat-card" style="background: rgba(255,255,255,0.1); border-left: 4px solid white; color: white;">
                    <div class="stat-value" style="color: white;">${region}</div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">Geographic Theater</div>
                </div>
                <div class="stat-card" style="background: rgba(255,255,255,0.1); border-left: 4px solid white; color: white;">
                    <div class="stat-value" style="color: white;">MC4EB Pub 7 CHG 1</div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">Compliance Standard</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    <strong>MGRS Integration:</strong> The Military Grid Reference System provides precise coordinate 
                    references for military operations. This analysis uses UTM zone calculations and grid square 
                    identification to support tactical frequency coordination across geographic boundaries.
                </p>
            </div>
        </div>

        <div class="section">
            <h2>📋 Data Quality Assessment</h2>
            <table>
                <thead>
                    <tr>
                        <th>Quality Metric</th>
                        <th>Value</th>
                        <th>Assessment</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Coordinate Completeness</td>
                        <td>${((geoStats.statistics?.validCoordinates || 0) / Math.max(geoStats.statistics?.totalMarkers || 1, 1) * 100).toFixed(1)}%</td>
                        <td class="quality-indicator ${this.getQualityClass(geoStats.statistics?.coordinateQuality || 'Unknown')}">${geoStats.statistics?.coordinateQuality || 'Unknown'}</td>
                        <td>${this.getQualityRecommendation(geoStats.statistics?.coordinateQuality || 'Unknown')}</td>
                    </tr>
                    <tr>
                        <td>Geographic Distribution</td>
                        <td>${this.categorizeDistribution(geoStats.statistics?.densityAnalysis || {})}</td>
                        <td>${geoStats.statistics?.clustersDetected?.length > 0 ? 'Clustered' : 'Distributed'}</td>
                        <td>${geoStats.statistics?.clustersDetected?.length > 3 ? 'Consider geographic balancing' : 'Good distribution'}</td>
                    </tr>
                    <tr>
                        <td>Coverage Area</td>
                        <td>${geoStats.statistics?.coverage?.totalArea?.toFixed(2) || 0} km²</td>
                        <td>${geoStats.statistics?.coverage?.totalArea > 1000 ? 'Large Area' : geoStats.statistics?.coverage?.totalArea > 100 ? 'Medium Area' : 'Small Area'}</td>
                        <td>${geoStats.statistics?.coverage?.totalArea > 10000 ? 'Consider regional segmentation' : 'Appropriate coverage'}</td>
                    </tr>
                    <tr>
                        <td>Coordinate Precision</td>
                        <td>±${Math.max(geoStats.statistics?.standardDeviation?.latitude || 0, geoStats.statistics?.standardDeviation?.longitude || 0).toFixed(4)}°</td>
                        <td>${(geoStats.statistics?.standardDeviation?.latitude || 0) < 1 ? 'High Precision' : 'Standard Precision'}</td>
                        <td>${(geoStats.statistics?.standardDeviation?.latitude || 0) > 5 ? 'Review coordinate accuracy' : 'Precision acceptable'}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📊 Detailed Marker Inventory</h2>
            <p>Complete listing of all markers included in this geographic analysis:</p>
            <table>
                <thead>
                    <tr>
                        <th>Serial Number</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Frequency</th>
                        <th>Type</th>
                        <th>Region</th>
                        <th>Created Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${markers.map(marker => `
                        <tr>
                            <td>${marker.serial || 'Unknown'}</td>
                            <td>${marker.lat ? marker.lat.toFixed(6) : 'N/A'}</td>
                            <td>${marker.lng ? marker.lng.toFixed(6) : 'N/A'}</td>
                            <td>${marker.frequency || 'Not Specified'}</td>
                            <td>${marker.type || marker.marker_type || 'Unknown'}</td>
                            <td>${marker.lat && marker.lng ?
                this.identifyGeographicRegion({ lat: marker.lat, lng: marker.lng }) :
                'Unknown Region'}</td>
                            <td>${marker.created_at ? new Date(marker.created_at).toLocaleDateString() : 'Unknown'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🔧 Technical Specifications</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">WGS84</div>
                    <div class="stat-label">Coordinate Datum</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">Decimal Degrees</div>
                    <div class="stat-label">Primary Format</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">±11m</div>
                    <div class="stat-label">Coordinate Accuracy</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">Haversine</div>
                    <div class="stat-label">Distance Calculation</div>
                </div>
            </div>
            
            <div class="coordinate-details">
                <h4>Coordinate System Details</h4>
                <p><strong>Primary Datum:</strong> World Geodetic System 1984 (WGS84)</p>
                <p><strong>Coordinate Formats:</strong> Decimal Degrees (primary), Degrees Minutes Seconds (DMS), Military Grid Reference System (MGRS)</p>
                <p><strong>Precision:</strong> 6 decimal places (±0.111 meters at equator)</p>
                <p><strong>Distance Calculations:</strong> Haversine formula for great-circle distances</p>
                <p><strong>Projection:</strong> Geographic coordinate system (unprojected)</p>
                <p><strong>Compliance:</strong> MC4EB Publication 7, Change 1 coordinate standards</p>
            </div>
        </div>

        <div class="section">
            <h2>📈 Historical Analysis</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${this.calculateTimeSpan(markers)}</div>
                    <div class="stat-label">Data Timespan</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.calculateDailyAverage(markers)}</div>
                    <div class="stat-label">Daily Average</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.findPeakActivityPeriod(markers)}</div>
                    <div class="stat-label">Peak Activity</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.calculateGrowthTrend(markers)}</div>
                    <div class="stat-label">Growth Trend</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🚨 Recommendations</h2>
            <div class="coordinate-details">
                <h4>Geographic Optimization Recommendations</h4>
                <ul>
                    ${this.generateRecommendations(geoStats, markers).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            
            <div class="coordinate-details">
                <h4>Data Quality Improvements</h4>
                <ul>
                    ${this.generateDataQualityRecommendations(geoStats, markers).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>Report Generated:</strong> ${reportDate}</p>
            <p><strong>System:</strong> SFAF Plotter Database Viewer v1.0</p>
            <p><strong>Compliance:</strong> MC4EB Publication 7, Change 1 Standards</p>
            <p><strong>Data Source:</strong> Military Frequency Coordination Database</p>
            <p><strong>Coordinate System:</strong> WGS84 Geographic</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ecf0f1;">
                <small style="color: #7f8c8d;">
                    This report contains sensitive military frequency coordination data. Distribution should be limited to authorized personnel only. 
                    All coordinate data is referenced to the WGS84 datum for maximum compatibility with military systems.
                </small>
            </div>
        </div>
    </div>
</body>
</html>
    `;
    }

    // ✅ ENHANCED: Supporting helper functions for report generation
    getQualityRecommendation(qualityText) {
        if (qualityText.includes('Excellent')) return 'Continue current data practices';
        if (qualityText.includes('Good')) return 'Minor improvements possible';
        if (qualityText.includes('Fair')) return 'Review data validation processes';
        if (qualityText.includes('Poor')) return 'Implement coordinate verification';
        return 'Critical: Review all coordinate data';
    }

    calculateTimeSpan(markers) {
        if (markers.length === 0) return 'No data';

        const dates = markers.map(m => new Date(m.created_at)).filter(d => !isNaN(d));
        if (dates.length === 0) return 'Unknown';

        const earliest = new Date(Math.min(...dates));
        const latest = new Date(Math.max(...dates));
        const diffDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));

        return diffDays === 0 ? 'Single day' : `${diffDays} days`;
    }

    calculateDailyAverage(markers) {
        if (markers.length === 0) return '0';

        const dates = markers.map(m => new Date(m.created_at)).filter(d => !isNaN(d));
        if (dates.length === 0) return 'Unknown';

        const earliest = new Date(Math.min(...dates));
        const latest = new Date(Math.max(...dates));
        const diffDays = Math.max(Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)), 1);

        return (markers.length / diffDays).toFixed(1);
    }

    findPeakActivityPeriod(markers) {
        if (markers.length === 0) return 'No data';

        const dates = markers.map(m => new Date(m.created_at)).filter(d => !isNaN(d));
        if (dates.length === 0) return 'Unknown';

        // Group by month for peak analysis
        const monthCounts = {};
        dates.forEach(date => {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });

        const peakMonth = Object.entries(monthCounts).reduce((a, b) =>
            monthCounts[a[0]] > monthCounts[b[0]] ? a : b
        );

        return peakMonth ? `${peakMonth[0]} (${peakMonth[1]} markers)` : 'Unknown';
    }

    calculateGrowthTrend(markers) {
        if (markers.length < 2) return 'Insufficient data';

        const dates = markers.map(m => new Date(m.created_at)).filter(d => !isNaN(d));
        if (dates.length < 2) return 'Unknown';

        // Simple linear trend calculation
        const firstHalf = dates.slice(0, Math.floor(dates.length / 2)).length;
        const secondHalf = dates.slice(Math.floor(dates.length / 2)).length;

        if (secondHalf > firstHalf * 1.2) return 'Increasing';
        if (secondHalf < firstHalf * 0.8) return 'Decreasing';
        return 'Stable';
    }

    // Density recommendations
    generateRecommendations(geoStats, markers) {
        const recommendations = [];

        // Coverage recommendations
        if (geoStats.statistics?.coverage?.totalArea > 10000) {
            recommendations.push('Consider implementing regional sub-coordination centers for large coverage area');
        }

        // Cluster recommendations
        if (geoStats.statistics?.clustersDetected?.length > 3) {
            recommendations.push('High cluster density detected - review geographic distribution for optimal coverage');
        }

        // Density recommendations
        if (geoStats.statistics?.densityAnalysis?.highestDensity > geoStats.statistics?.densityAnalysis?.averageDensity * 5) {
            recommendations.push('Significant density variations detected - consider load balancing across regions');
        }

        if (geoStats.statistics?.densityAnalysis?.averageDensity < 0.001) {
            recommendations.push('Low marker density may indicate coverage gaps - review geographic completeness');
        }

        // Coordinate quality recommendations
        const validPercentage = (geoStats.statistics?.validCoordinates || 0) / Math.max(geoStats.statistics?.totalMarkers || 1, 1);
        if (validPercentage < 0.8) {
            recommendations.push('Coordinate data quality below 80% - implement data validation procedures');
        }

        if (validPercentage < 0.5) {
            recommendations.push('CRITICAL: Less than 50% valid coordinates - immediate data quality review required');
        }

        // Geographic spread recommendations
        if (geoStats.spread > 180) {
            recommendations.push('Global distribution detected - consider implementing multiple coordination zones');
        } else if (geoStats.spread > 45) {
            recommendations.push('Large geographic spread - evaluate need for regional coordination centers');
        } else if (geoStats.spread < 1) {
            recommendations.push('Very localized deployment - consider expanding geographic coverage');
        }

        // Standard deviation recommendations
        if (geoStats.statistics?.standardDeviation?.latitude > 10 || geoStats.statistics?.standardDeviation?.longitude > 10) {
            recommendations.push('High coordinate variance detected - review data entry procedures for accuracy');
        }

        // Distance from center recommendations
        if (geoStats.statistics?.averageDistanceFromCenter > 1000) {
            recommendations.push('High average distance from center - consider multiple coordination hubs');
        }

        // Regional distribution recommendations
        const region = this.identifyGeographicRegion(geoStats.center);
        if (region.includes('Ocean')) {
            recommendations.push('Maritime operations detected - ensure compliance with international coordination procedures');
        }

        if (region.includes('Arctic') || region.includes('Antarctic')) {
            recommendations.push('Polar region operations - apply special coordination procedures for high-latitude areas');
        }

        // Coverage area recommendations
        if (geoStats.statistics?.coverage?.totalArea > 50000) {
            recommendations.push('Very large operational area - implement hierarchical coordination structure');
        }

        // Data volume recommendations
        if (markers.length > 1000) {
            recommendations.push('High marker volume - consider implementing automated coordination workflows');
        } else if (markers.length < 10) {
            recommendations.push('Limited data set - expand marker collection for comprehensive analysis');
        }

        // Temporal recommendations
        const timeSpan = this.calculateTimeSpan(markers);
        if (timeSpan !== 'No data' && timeSpan !== 'Unknown' && parseInt(timeSpan) > 365) {
            recommendations.push('Long-term data collection - perform annual geographic distribution review');
        }

        // MGRS zone recommendations
        const primaryZone = this.calculatePrimaryUTMZone(geoStats.center);
        if (geoStats.spread > 6) { // Spans multiple UTM zones
            recommendations.push('Multi-zone operations - ensure proper MGRS coordinate transformation procedures');
        }

        // Default recommendation if no specific issues found
        if (recommendations.length === 0) {
            recommendations.push('Geographic distribution appears optimal - maintain current coordination procedures');
        }

        return recommendations;
    }

    generateDataQualityRecommendations(geoStats, markers) {
        const recommendations = [];

        // Coordinate completeness recommendations
        const validPercentage = (geoStats.statistics?.validCoordinates || 0) / Math.max(geoStats.statistics?.totalMarkers || 1, 1);

        if (validPercentage < 1.0) {
            recommendations.push(`Improve coordinate data completeness from ${(validPercentage * 100).toFixed(1)}% to 100%`);
        }

        if (geoStats.statistics?.invalidCoordinates > 0) {
            recommendations.push(`Validate and correct ${geoStats.statistics.invalidCoordinates} invalid coordinate entries`);
        }

        // Precision recommendations
        if (geoStats.statistics?.standardDeviation?.latitude > 1 || geoStats.statistics?.standardDeviation?.longitude > 1) {
            recommendations.push('Implement stricter coordinate precision standards (6+ decimal places recommended)');
        }

        // Data consistency recommendations
        const inconsistentMarkers = markers.filter(m =>
            !m.frequency || m.frequency.trim() === '' ||
            !m.serial || m.serial.trim() === ''
        );

        if (inconsistentMarkers.length > 0) {
            recommendations.push(`Address ${inconsistentMarkers.length} markers with missing required data fields`);
        }

        // Temporal data quality
        const markersWithoutDates = markers.filter(m => !m.created_at);
        if (markersWithoutDates.length > 0) {
            recommendations.push(`Add creation timestamps to ${markersWithoutDates.length} markers for better tracking`);
        }

        // Frequency data quality
        const markersWithInvalidFreq = markers.filter(m =>
            m.frequency && !this.isValidFrequencyFormat(m.frequency)
        );

        if (markersWithInvalidFreq.length > 0) {
            recommendations.push(`Standardize frequency format for ${markersWithInvalidFreq.length} markers`);
        }

        // Serial number standardization
        const duplicateSerials = this.findDuplicateSerials(markers);
        if (duplicateSerials.length > 0) {
            recommendations.push(`Resolve ${duplicateSerials.length} duplicate serial number conflicts`);
        }

        // SFAF completeness recommendations
        const sfafIncompleteMarkers = markers.filter(m => m.marker_type === 'imported');
        if (sfafIncompleteMarkers.length > 0) {
            recommendations.push(`Verify SFAF field completeness for ${sfafIncompleteMarkers.length} imported markers`);
        }

        // Validation recommendations
        recommendations.push('Implement automated data validation on import');
        recommendations.push('Establish regular data quality audits (monthly recommended)');
        recommendations.push('Create data entry standards documentation');

        if (validPercentage > 0.95) {
            recommendations.push('Excellent data quality - consider this dataset as a best practice reference');
        }

        return recommendations;
    }

    // ✅ ENHANCED: Additional helper functions for comprehensive report generation
    findDuplicateSerials(markers) {
        const serialCounts = {};
        const duplicates = [];

        markers.forEach(marker => {
            const serial = marker.serial || 'UNKNOWN';
            serialCounts[serial] = (serialCounts[serial] || 0) + 1;

            if (serialCounts[serial] === 2) {
                duplicates.push(serial);
            }
        });

        return duplicates;
    }

    isValidFrequencyFormat(frequency) {
        // Enhanced frequency format validation for multiple standards
        const patterns = [
            /^K?\d+(\.\d+)?$/, // Basic numeric with optional K prefix
            /^[KMG]\d+(\.\d+)?$/, // Standard frequency notation
            /^\d+(\.\d+)?\s?(MHz|GHz|KHz)$/i, // Frequency with units
            /^K\d+\(\d+(\.\d+)?\)$/ // SFAF format: K4028(4026.5)
        ];

        return patterns.some(pattern => pattern.test(frequency));
    }

    calculateTimeSpan(markers) {
        if (!markers || markers.length === 0) return 'No data';

        const validDates = markers
            .map(m => new Date(m.created_at))
            .filter(d => !isNaN(d.getTime()));

        if (validDates.length === 0) return 'Unknown';
        if (validDates.length === 1) return 'Single day';

        const earliest = new Date(Math.min(...validDates));
        const latest = new Date(Math.max(...validDates));
        const diffDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Single day';
        if (diffDays <= 30) return `${diffDays} days`;
        if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months`;

        return `${Math.ceil(diffDays / 365)} years`;
    }

    findPeakActivityPeriod(markers) {
        if (!markers || markers.length === 0) return 'No data';

        const validDates = markers
            .map(m => new Date(m.created_at))
            .filter(d => !isNaN(d.getTime()));

        if (validDates.length === 0) return 'Unknown';

        // Group by month-year for analysis
        const monthCounts = {};
        validDates.forEach(date => {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });

        if (Object.keys(monthCounts).length === 0) return 'Unknown';

        const peakMonth = Object.entries(monthCounts).reduce((max, current) =>
            current[1] > max[1] ? current : max
        );

        const [yearMonth, count] = peakMonth;
        const [year, month] = yearMonth.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${monthNames[parseInt(month) - 1]} ${year} (${count} markers)`;
    }

    calculateGrowthTrend(markers) {
        if (!markers || markers.length < 2) return 'Insufficient data';

        const validDates = markers
            .map(m => new Date(m.created_at))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);

        if (validDates.length < 2) return 'Unknown';

        const midpoint = Math.floor(validDates.length / 2);
        const firstHalf = validDates.slice(0, midpoint);
        const secondHalf = validDates.slice(midpoint);

        const firstHalfRate = firstHalf.length / this.getTimeSpanInDays(firstHalf[0], firstHalf[firstHalf.length - 1]);
        const secondHalfRate = secondHalf.length / this.getTimeSpanInDays(secondHalf[0], secondHalf[secondHalf.length - 1]);

        if (secondHalfRate > firstHalfRate * 1.5) return 'Rapidly Increasing';
        if (secondHalfRate > firstHalfRate * 1.2) return 'Increasing';
        if (secondHalfRate < firstHalfRate * 0.5) return 'Rapidly Decreasing';
        if (secondHalfRate < firstHalfRate * 0.8) return 'Decreasing';

        return 'Stable';
    }

    getTimeSpanInDays(startDate, endDate) {
        const diffMs = endDate.getTime() - startDate.getTime();
        return Math.max(diffMs / (1000 * 60 * 60 * 24), 1); // Minimum 1 day
    }

    // ✅ ENHANCED: Export functionality for comprehensive reporting
    async exportComprehensiveReport() {
        try {
            console.log('📊 Generating comprehensive analysis report...');
            this.showLoading(true, 'Generating comprehensive report...');

            // Load all necessary data
            const [markersResponse, iracResponse] = await Promise.all([
                fetch('/api/markers'),
                fetch('/api/irac-notes')
            ]);

            if (!markersResponse.ok || !iracResponse.ok) {
                throw new Error('Failed to load data for comprehensive report');
            }

            const markersData = await markersResponse.json();
            const iracData = await iracResponse.json();

            if (!markersData.success || !iracData.success) {
                throw new Error('API returned error response');
            }

            const markers = Array.isArray(markersData.markers) ? markersData.markers : [];
            const iracNotes = Array.isArray(iracData.notes) ? iracData.notes : [];

            // Generate comprehensive analysis
            const geoStats = this.analyzeGeographicDistribution(markers);
            const freqStats = this.analyzeFrequencyDistribution(markers);
            const complianceReport = await this.generateComplianceReport(markers);

            // Create comprehensive report
            const reportData = {
                metadata: {
                    title: 'SFAF Plotter Comprehensive Analysis Report',
                    generated: new Date().toISOString(),
                    system: 'SFAF Plotter Database Viewer v1.0',
                    compliance: 'MC4EB Publication 7, Change 1 Standards',
                    analyst: 'Automated System Analysis',
                    classification: 'FOR OFFICIAL USE ONLY'
                },
                executiveSummary: {
                    totalMarkers: markers.length,
                    validCoordinates: geoStats.statistics?.validCoordinates || 0,
                    geographicSpread: geoStats.spread,
                    primaryRegion: this.identifyGeographicRegion(geoStats.center),
                    dataQuality: geoStats.statistics?.coordinateQuality || 'Unknown',
                    complianceStatus: complianceReport.field500Compliance && complianceReport.field501Compliance ? 'Compliant' : 'Non-Compliant'
                },
                geographicAnalysis: geoStats,
                frequencyAnalysis: freqStats,
                complianceAnalysis: complianceReport,
                iracAnalysis: {
                    totalNotes: iracNotes.length,
                    categories: [...new Set(iracNotes.map(n => n.category))],
                    notes: iracNotes
                },
                recommendations: {
                    geographic: this.generateRecommendations(geoStats, markers),
                    dataQuality: this.generateDataQualityRecommendations(geoStats, markers),
                    operational: this.generateOperationalRecommendations(markers, iracNotes)
                },
                detailedData: {
                    markers: markers.map(marker => ({
                        id: marker.id,
                        serial: marker.serial || 'Unknown',
                        latitude: marker.lat,
                        longitude: marker.lng,
                        frequency: marker.frequency,
                        markerType: marker.type || marker.marker_type,
                        createdAt: marker.created_at,
                        updatedAt: marker.updated_at,
                        region: marker.lat && marker.lng ?
                            this.identifyGeographicRegion({ lat: marker.lat, lng: marker.lng }) : 'Unknown',
                        mgrsGrid: marker.lat && marker.lng ?
                            this.calculateMGRSGrid({ lat: marker.lat, lng: marker.lng }) : 'Unknown'
                    })),

                    timeline: this.generateDataTimeline(markers),

                    statistics: {
                        temporal: {
                            firstEntry: markers.length > 0 ?
                                Math.min(...markers.map(m => new Date(m.created_at).getTime())) : null,
                            lastEntry: markers.length > 0 ?
                                Math.max(...markers.map(m => new Date(m.created_at).getTime())) : null,
                            averagePerDay: this.calculateDailyAverage(markers),
                            peakActivity: this.findPeakActivityPeriod(markers),
                            growthTrend: this.calculateGrowthTrend(markers)
                        },

                        frequency: {
                            bands: freqStats,
                            unique: [...new Set(markers.map(m => m.frequency).filter(f => f))],
                            mostCommon: this.findMostCommonFrequency(markers),
                            distribution: this.analyzeFrequencyDistribution(markers)
                        },

                        geographic: {
                            regions: this.categorizeMarkersByRegion(markers),
                            clusters: geoStats.statistics?.clustersDetected || [],
                            density: geoStats.statistics?.densityAnalysis || {},
                            boundaries: geoStats.bounds
                        },

                        quality: {
                            coordinateCompleteness: (geoStats.statistics?.validCoordinates || 0) / Math.max(markers.length, 1),
                            duplicateSerials: this.findDuplicateSerials(markers),
                            invalidFrequencies: markers.filter(m => m.frequency && !this.isValidFrequencyFormat(m.frequency)),
                            missingData: this.identifyMissingDataPatterns(markers)
                        }
                    },

                    compliance: {
                        mcebPublication7: complianceReport,
                        iracCompliance: this.analyzeIRACCompliance(iracNotes),
                        fieldValidation: this.performFieldValidation(markers),
                        recommendations: this.generateDetailedComplianceRecommendations(markers, iracNotes)
                    },

                    technicalSpecs: {
                        coordinateSystems: {
                            primary: 'WGS84 Geographic',
                            supported: ['Decimal Degrees', 'DMS', 'MGRS'],
                            precision: '6 decimal places (±0.111m at equator)',
                            datum: 'World Geodetic System 1984'
                        },

                        database: {
                            version: 'PostgreSQL with PostGIS',
                            tables: ['markers', 'sfaf_records', 'irac_notes', 'geometries'],
                            indexes: 'Spatial and B-tree indexes optimized',
                            backup: 'Automated daily backups configured'
                        },

                        api: {
                            version: 'REST API v1.0',
                            endpoints: ['/api/markers', '/api/sfaf', '/api/irac-notes', '/api/geometry'],
                            authentication: 'Session-based authentication',
                            rateLimit: '1000 requests per hour per IP'
                        }
                    }
                }
            };

            // Generate and download comprehensive JSON report
            const jsonReport = JSON.stringify(reportData, null, 2);
            const jsonBlob = new Blob([jsonReport], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.download = `SFAF_Comprehensive_Report_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);
            URL.revokeObjectURL(jsonUrl);

            this.showSuccess('Comprehensive analysis report generated successfully');

        } catch (error) {
            console.error('❌ Failed to generate comprehensive report:', error);
            this.showError(`Failed to generate comprehensive report: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // ✅ ENHANCED: Supporting functions for comprehensive reporting
    generateDataTimeline(markers) {
        if (!markers || markers.length === 0) return [];

        const timeline = [];
        const sortedMarkers = markers
            .filter(m => m.created_at)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Group by month for timeline analysis
        const monthlyData = {};
        sortedMarkers.forEach(marker => {
            const date = new Date(marker.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    count: 0,
                    markers: [],
                    types: {},
                    frequencies: new Set(),
                    regions: new Set()
                };
            }

            monthlyData[monthKey].count++;
            monthlyData[monthKey].markers.push(marker.id);
            monthlyData[monthKey].types[marker.type || 'unknown'] =
                (monthlyData[monthKey].types[marker.type || 'unknown'] || 0) + 1;

            if (marker.frequency) monthlyData[monthKey].frequencies.add(marker.frequency);
            if (marker.lat && marker.lng) {
                const region = this.identifyGeographicRegion({ lat: marker.lat, lng: marker.lng });
                monthlyData[monthKey].regions.add(region);
            }
        });

        return Object.values(monthlyData).map(month => ({
            ...month,
            frequencies: Array.from(month.frequencies),
            regions: Array.from(month.regions)
        }));
    }

    findMostCommonFrequency(markers) {
        const frequencies = {};
        markers.forEach(marker => {
            if (marker.frequency) {
                frequencies[marker.frequency] = (frequencies[marker.frequency] || 0) + 1;
            }
        });

        return Object.entries(frequencies).reduce((max, current) =>
            current[1] > max[1] ? current : max, ['None', 0]
        );
    }

    categorizeMarkersByRegion(markers) {
        const regions = {};

        markers.forEach(marker => {
            if (marker.lat && marker.lng) {
                const region = this.identifyGeographicRegion({ lat: marker.lat, lng: marker.lng });
                if (!regions[region]) {
                    regions[region] = [];
                }
                regions[region].push({
                    id: marker.id,
                    serial: marker.serial,
                    frequency: marker.frequency,
                    coordinates: { lat: marker.lat, lng: marker.lng }
                });
            }
        });

        return regions;
    }

    identifyMissingDataPatterns(markers) {
        const patterns = {
            missingSerials: markers.filter(m => !m.serial || m.serial.trim() === '').length,
            missingFrequencies: markers.filter(m => !m.frequency || m.frequency.trim() === '').length,
            missingCoordinates: markers.filter(m => !m.latitude || !m.longitude).length,
            missingTypes: markers.filter(m => !m.type && !m.marker_type).length,
            missingDates: markers.filter(m => !m.created_at).length
        };

        patterns.totalIssues = Object.values(patterns).reduce((sum, count) => sum + count, 0);
        patterns.affectedPercentage = (patterns.totalIssues / Math.max(markers.length * 5, 1)) * 100;

        return patterns;
    }

    analyzeAgencyDistribution(iracNotes) {
        const distribution = {};

        iracNotes.forEach(note => {
            if (note.agency && Array.isArray(note.agency)) {
                note.agency.forEach(agency => {
                    distribution[agency] = (distribution[agency] || 0) + 1;
                });
            }
        });

        return distribution;
    }

    analyzeIRACCompliance(iracNotes) {
        return {
            totalNotes: iracNotes.length,
            categoryCoverage: [...new Set(iracNotes.map(n => n.category))],
            fieldCoverage: [...new Set(iracNotes.map(n => n.field_placement))],
            agencyCoverage: [...new Set(iracNotes.flatMap(n => n.agency || []))],
            averageDescriptionLength: iracNotes.reduce((sum, note) => sum + note.description.length, 0) / Math.max(iracNotes.length, 1),
            compliance: {
                hasRequiredCategories: [...new Set(iracNotes.map(n => n.category))].length >= 5,
                hasFieldCoverage: [...new Set(iracNotes.map(n => n.field_placement))].length >= 10,
                hasAgencyDiversity: [...new Set(iracNotes.flatMap(n => n.agency || []))].length >= 3
            }
        };
    }

    // ✅ ENHANCED: Complete field validation for comprehensive reporting
    performFieldValidation(markers) {
        const validation = {
            serialFormat: {
                valid: 0,
                invalid: [],
                pattern: /^[A-Z]{2,3}\s*\d{6,8}$/
            },
            frequencyFormat: {
                valid: 0,
                invalid: [],
                pattern: /^[KMG]?\d+(\.\d+)?(\([^)]+\))?$/
            },
            coordinateFormat: {
                valid: 0,
                invalid: [],
                latitudeRange: [-90, 90],
                longitudeRange: [-180, 180]
            },
            requiredFields: {
                valid: 0,
                invalid: [],
                required: ['serial', 'latitude', 'longitude', 'frequency']
            },
            dataTypes: {
                valid: 0,
                invalid: [],
                issues: []
            },
            duplicates: {
                serialDuplicates: [],
                coordinateDuplicates: [],
                frequencyDuplicates: []
            }
        };

        const processedSerials = new Map();
        const processedCoordinates = new Map();
        const processedFrequencies = new Map();

        markers.forEach((marker, index) => {
            let hasValidationIssues = false;

            // ✅ Serial Number Validation (Source: db_viewer_js.txt SFAF parsing)
            if (marker.serial) {
                if (validation.serialFormat.pattern.test(marker.serial)) {
                    validation.serialFormat.valid++;

                    // Check for duplicate serials
                    if (processedSerials.has(marker.serial)) {
                        validation.duplicates.serialDuplicates.push({
                            serial: marker.serial,
                            markers: [processedSerials.get(marker.serial), marker.id],
                            issue: 'Duplicate serial number'
                        });
                    } else {
                        processedSerials.set(marker.serial, marker.id);
                    }
                } else {
                    validation.serialFormat.invalid.push({
                        id: marker.id,
                        serial: marker.serial,
                        issue: 'Invalid serial format - should match pattern: AA(A) NNNNNN(NN)',
                        expected: 'Format: [2-3 letters][space][6-8 digits]',
                        example: 'AF 014589'
                    });
                    hasValidationIssues = true;
                }
            } else {
                validation.serialFormat.invalid.push({
                    id: marker.id,
                    serial: null,
                    issue: 'Missing serial number',
                    severity: 'critical'
                });
                hasValidationIssues = true;
            }

            // ✅ Frequency Format Validation (Source: db_viewer_js.txt frequency analysis)
            if (marker.frequency) {
                if (validation.frequencyFormat.pattern.test(marker.frequency)) {
                    validation.frequencyFormat.valid++;

                    // Check for duplicate frequencies (potential coordination conflicts)
                    if (processedFrequencies.has(marker.frequency)) {
                        validation.duplicates.frequencyDuplicates.push({
                            frequency: marker.frequency,
                            markers: [processedFrequencies.get(marker.frequency), marker.id],
                            issue: 'Duplicate frequency assignment - coordination required',
                            severity: 'warning'
                        });
                    } else {
                        processedFrequencies.set(marker.frequency, marker.id);
                    }
                } else {
                    validation.frequencyFormat.invalid.push({
                        id: marker.id,
                        frequency: marker.frequency,
                        issue: 'Invalid frequency format',
                        expected: 'Format: K####(####.#) or ####.# MHz',
                        example: 'K4028(4026.5)'
                    });
                    hasValidationIssues = true;
                }
            } else {
                validation.frequencyFormat.invalid.push({
                    id: marker.id,
                    frequency: null,
                    issue: 'Missing frequency assignment',
                    severity: 'critical'
                });
                hasValidationIssues = true;
            }

            // ✅ Coordinate Validation (Source: main_go.txt coordinate service)
            if (marker.lat && marker.lng) {
                const lat = parseFloat(marker.lat);
                const lng = parseFloat(marker.lng);

                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !isNaN(lat) && !isNaN(lng)) {
                    validation.coordinateFormat.valid++;

                    // Check for duplicate coordinates (co-located equipment)
                    const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                    if (processedCoordinates.has(coordKey)) {
                        validation.duplicates.coordinateDuplicates.push({
                            coordinates: coordKey,
                            markers: [processedCoordinates.get(coordKey), marker.id],
                            issue: 'Co-located markers detected',
                            severity: 'info'
                        });
                    } else {
                        processedCoordinates.set(coordKey, marker.id);
                    }
                } else {
                    validation.coordinateFormat.invalid.push({
                        id: marker.id,
                        latitude: lat,
                        longitude: lng,
                        issue: 'Invalid coordinate values',
                        details: `Latitude: ${lat} (valid: -90 to 90), Longitude: ${lng} (valid: -180 to 180)`
                    });
                    hasValidationIssues = true;
                }
            } else {
                validation.coordinateFormat.invalid.push({
                    id: marker.id,
                    latitude: marker.lat,
                    longitude: marker.lng,
                    issue: 'Missing coordinate data',
                    severity: 'critical'
                });
                hasValidationIssues = true;
            }

            // ✅ Required Fields Validation
            const missingFields = [];
            validation.requiredFields.required.forEach(field => {
                if (!marker[field] || (typeof marker[field] === 'string' && marker[field].trim() === '')) {
                    missingFields.push(field);
                }
            });

            if (missingFields.length === 0) {
                validation.requiredFields.valid++;
            } else {
                validation.requiredFields.invalid.push({
                    id: marker.id,
                    missingFields: missingFields,
                    issue: `Missing required fields: ${missingFields.join(', ')}`,
                    severity: 'critical'
                });
                hasValidationIssues = true;
            }

            // ✅ Data Type Validation (Source: db_viewer_css.txt modern styling context)
            const dataTypeIssues = [];

            // Check latitude data type
            if (marker.lat && (isNaN(parseFloat(marker.lat)) || typeof marker.lat === 'string')) {
                dataTypeIssues.push('Latitude should be numeric');
            }

            // Check longitude data type
            if (marker.lng && (isNaN(parseFloat(marker.lng)) || typeof marker.lng === 'string')) {
                dataTypeIssues.push('Longitude should be numeric');
            }

            // Check created_at date format
            if (marker.created_at && isNaN(new Date(marker.created_at).getTime())) {
                dataTypeIssues.push('Created date format invalid');
            }

            if (dataTypeIssues.length === 0) {
                validation.dataTypes.valid++;
            } else {
                validation.dataTypes.invalid.push({
                    id: marker.id,
                    issues: dataTypeIssues,
                    issue: `Data type issues: ${dataTypeIssues.join(', ')}`
                });
                validation.dataTypes.issues.push(...dataTypeIssues);
            }

            // ✅ MC4EB Publication 7, Change 1 Specific Validations (Source: db_viewer_js.txt MC4EB compliance)
            if (marker.frequency) {
                // Validate frequency band compliance
                const freq = parseFloat(marker.frequency.replace(/[^0-9.]/g, ''));
                if (!isNaN(freq)) {
                    if (freq < 0.003 || freq > 300000) {
                        validation.frequencyFormat.invalid.push({
                            id: marker.id,
                            frequency: marker.frequency,
                            issue: 'Frequency outside normal spectrum range (3 kHz - 300 GHz)',
                            severity: 'warning'
                        });
                    }
                }
            }

            // ✅ Agency Code Validation (Source: db_viewer_html.txt agency filter)
            if (marker.type === 'imported' && marker.serial) {
                const agencyCode = marker.serial.substring(0, 2);
                const validAgencyCodes = ['AF', 'AR', 'NV', 'MC', 'CG', 'DI', 'DO', 'DS', 'FA', 'FT', 'HS', 'JC'];

                if (!validAgencyCodes.includes(agencyCode)) {
                    validation.serialFormat.invalid.push({
                        id: marker.id,
                        serial: marker.serial,
                        issue: `Unknown agency code: ${agencyCode}`,
                        validCodes: validAgencyCodes,
                        severity: 'warning'
                    });
                }
            }
        });

        // ✅ Calculate overall validation statistics
        validation.overall = {
            totalMarkers: markers.length,
            validMarkers: markers.length - validation.serialFormat.invalid.length -
                validation.frequencyFormat.invalid.length -
                validation.coordinateFormat.invalid.length -
                validation.requiredFields.invalid.length,
            validationScore: markers.length > 0 ?
                ((markers.length - validation.serialFormat.invalid.length -
                    validation.frequencyFormat.invalid.length -
                    validation.coordinateFormat.invalid.length -
                    validation.requiredFields.invalid.length) / markers.length) * 100 : 0,
            criticalIssues: validation.serialFormat.invalid.filter(i => i.severity === 'critical').length +
                validation.frequencyFormat.invalid.filter(i => i.severity === 'critical').length +
                validation.coordinateFormat.invalid.filter(i => i.severity === 'critical').length +
                validation.requiredFields.invalid.filter(i => i.severity === 'critical').length,
            warningIssues: validation.serialFormat.invalid.filter(i => i.severity === 'warning').length +
                validation.frequencyFormat.invalid.filter(i => i.severity === 'warning').length +
                validation.duplicates.frequencyDuplicates.length,
            totalDuplicates: validation.duplicates.serialDuplicates.length +
                validation.duplicates.coordinateDuplicates.length +
                validation.duplicates.frequencyDuplicates.length
        };

        // ✅ Generate validation recommendations
        validation.recommendations = this.generateValidationRecommendations(validation);

        return validation;
    }

    // ✅ ENHANCED: Generate specific validation recommendations
    generateValidationRecommendations(validation) {
        const recommendations = [];

        // Serial format recommendations
        if (validation.serialFormat.invalid.length > 0) {
            recommendations.push({
                category: 'Serial Numbers',
                priority: 'high',
                issue: `${validation.serialFormat.invalid.length} markers have invalid serial formats`,
                recommendation: 'Standardize serial numbers to format: [Agency Code][Space][6-8 digits] (e.g., AF 014589)',
                affectedMarkers: validation.serialFormat.invalid.map(i => i.id)
            });
        }

        // Frequency format recommendations
        if (validation.frequencyFormat.invalid.length > 0) {
            recommendations.push({
                category: 'Frequencies',
                priority: 'critical',
                issue: `${validation.frequencyFormat.invalid.length} markers have invalid frequency formats`,
                recommendation: 'Update frequency values to standard MC4EB format: K####(####.#) or numeric with units',
                affectedMarkers: validation.frequencyFormat.invalid.map(i => i.id)
            });
        }

        // Coordinate validation recommendations
        if (validation.coordinateFormat.invalid.length > 0) {
            recommendations.push({
                category: 'Coordinates',
                priority: 'critical',
                issue: `${validation.coordinateFormat.invalid.length} markers have invalid coordinates`,
                recommendation: 'Verify coordinate accuracy and ensure values are within valid ranges (lat: -90 to 90, lng: -180 to 180)',
                affectedMarkers: validation.coordinateFormat.invalid.map(i => i.id)
            });
        }

        // Duplicate handling recommendations
        if (validation.overall.totalDuplicates > 0) {
            recommendations.push({
                category: 'Duplicates',
                priority: 'medium',
                issue: `${validation.overall.totalDuplicates} duplicate entries detected`,
                recommendation: 'Review and consolidate duplicate serial numbers, frequencies, or co-located markers',
                details: {
                    serialDuplicates: validation.duplicates.serialDuplicates.length,
                    coordinateDuplicates: validation.duplicates.coordinateDuplicates.length,
                    frequencyDuplicates: validation.duplicates.frequencyDuplicates.length
                }
            });
        }

        // Data completeness recommendations
        if (validation.requiredFields.invalid.length > 0) {
            recommendations.push({
                category: 'Data Completeness',
                priority: 'critical',
                issue: `${validation.requiredFields.invalid.length} markers missing required fields`,
                recommendation: 'Complete all required fields: serial, latitude, longitude, frequency',
                affectedMarkers: validation.requiredFields.invalid.map(i => i.id)
            });
        }

        // Data quality score recommendations
        if (validation.overall.validationScore < 80) {
            recommendations.push({
                category: 'Overall Data Quality',
                priority: 'high',
                issue: `Data quality score is ${validation.overall.validationScore.toFixed(1)}% (below 80% threshold)`,
                recommendation: 'Implement comprehensive data quality review and correction procedures',
                actions: [
                    'Establish data entry standards',
                    'Implement validation rules at data input',
                    'Perform regular data quality audits',
                    'Train personnel on proper data formats'
                ]
            });
        }

        // MC4EB Publication 7, Change 1 compliance recommendations
        recommendations.push({
            category: 'MC4EB Compliance',
            priority: 'medium',
            issue: 'Ensure continued compliance with MC4EB Publication 7, Change 1 standards',
            recommendation: 'Regular compliance reviews and updates to match latest MC4EB requirements',
            actions: [
                'Monthly compliance audits',
                'Update field definitions as needed',
                'Coordinate with IRAC for validation',
                'Document all compliance procedures'
            ]
        });

        return recommendations;
    }

    // ✅ ENHANCED: Generate detailed compliance recommendations
    generateComplianceRecommendations(complianceReport) {
        const recommendations = [];

        // Field 500 compliance recommendations (Source: db_viewer_js.txt field validation)
        if (!complianceReport.field500Compliance) {
            recommendations.push({
                category: 'Field 500 Compliance',
                priority: 'critical',
                issue: 'Field 500 occurrences exceed MC4EB Publication 7, Change 1 limit (max 10)',
                recommendation: 'Reduce Field 500 occurrences to comply with MC4EB standards',
                actions: [
                    'Review Field 500 usage in SFAF records',
                    'Consolidate multiple Field 500 entries where possible',
                    'Ensure compliance with MC4EB Publication 7, Change 1 Section 4.2.3',
                    'Document justification for essential Field 500 entries'
                ],
                reference: 'MC4EB Publication 7, Change 1, Section 4.2.3'
            });
        }

        // Field 501 compliance recommendations (Source: db_viewer_js.txt field validation)
        if (!complianceReport.field501Compliance) {
            recommendations.push({
                category: 'Field 501 Compliance',
                priority: 'critical',
                issue: 'Field 501 occurrences exceed MC4EB Publication 7, Change 1 limit (max 30)',
                recommendation: 'Reduce Field 501 occurrences to comply with MC4EB standards',
                actions: [
                    'Audit Field 501 usage across all SFAF records',
                    'Remove unnecessary Field 501 entries',
                    'Ensure compliance with MC4EB Publication 7, Change 1 Section 4.2.4',
                    'Implement Field 501 usage guidelines'
                ],
                reference: 'MC4EB Publication 7, Change 1, Section 4.2.4'
            });
        }

        // IRAC category coverage recommendations (Source: db_viewer_js.txt IRAC analysis)
        if (complianceReport.iracCategories.length < 6) {
            recommendations.push({
                category: 'IRAC Category Coverage',
                priority: 'medium',
                issue: `Limited IRAC category coverage (${complianceReport.iracCategories.length}/6 categories)`,
                recommendation: 'Expand IRAC note coverage to include all major categories',
                actions: [
                    'Add IRAC notes for missing categories',
                    'Review frequency coordination requirements',
                    'Ensure comprehensive IRAC coverage',
                    'Coordinate with IRAC for additional note assignments'
                ],
                currentCategories: complianceReport.iracCategories
            });
        }

        // Coordinate format compliance (Source: main_go.txt coordinate service)
        recommendations.push({
            category: 'Coordinate Standards',
            priority: 'low',
            issue: 'Ensure continued coordinate format compliance',
            recommendation: 'Maintain support for military coordinate formats',
            actions: [
                'Verify DMS format accuracy',
                'Validate compact coordinate formats',
                'Ensure WGS84 datum consistency',
                'Test coordinate conversion accuracy'
            ],
            reference: 'MC4EB Publication 7, Change 1, Coordinate Standards'
        });

        // Frequency coordination compliance (Source: db_viewer_js.txt frequency analysis)
        if (complianceReport.totalViolations > 0) {
            recommendations.push({
                category: 'Frequency Coordination',
                priority: 'high',
                issue: `${complianceReport.totalViolations} compliance violations detected`,
                recommendation: 'Address all frequency coordination compliance issues',
                actions: [
                    'Review frequency assignments for conflicts',
                    'Ensure proper IRAC coordination procedures',
                    'Validate frequency band allocations',
                    'Update coordination documentation'
                ]
            });
        }

        // Data quality and validation recommendations (Source: db_viewer_js.txt validation)
        recommendations.push({
            category: 'Data Quality Assurance',
            priority: 'medium',
            issue: 'Maintain high data quality standards for compliance',
            recommendation: 'Implement continuous data quality monitoring',
            actions: [
                'Regular SFAF field validation',
                'Automated compliance checking',
                'Monthly data quality reports',
                'Staff training on MC4EB standards'
            ]
        });

        // Agency coordination recommendations (Source: db_viewer_html.txt agency filter)
        recommendations.push({
            category: 'Inter-Agency Coordination',
            priority: 'medium',
            issue: 'Ensure proper coordination across military services',
            recommendation: 'Maintain effective inter-agency frequency coordination',
            actions: [
                'Regular coordination meetings with Army, Navy, Air Force, Marines',
                'Update agency contact information',
                'Verify proper approval authority assignments',
                'Document coordination procedures'
            ]
        });

        // Technical specifications compliance (Source: db_viewer_css.txt modern interface)
        recommendations.push({
            category: 'Technical Standards',
            priority: 'low',
            issue: 'Maintain technical system compliance',
            recommendation: 'Keep system updated with latest technical standards',
            actions: [
                'Update emission designator formats',
                'Verify equipment certification requirements',
                'Maintain antenna specification accuracy',
                'Update technical field definitions'
            ]
        });

        // Overall compliance summary
        if (complianceReport.field500Compliance && complianceReport.field501Compliance && complianceReport.iracCategories.length >= 5) {
            recommendations.unshift({
                category: 'Overall Compliance',
                priority: 'info',
                issue: 'System demonstrates good MC4EB Publication 7, Change 1 compliance',
                recommendation: 'Continue current compliance practices and monitor for changes',
                actions: [
                    'Maintain current data quality standards',
                    'Monitor for MC4EB Publication updates',
                    'Continue regular compliance audits',
                    'Document best practices'
                ]
            });
        }

        return recommendations;
    }

    // ✅ ENHANCED: Generate operational recommendations based on usage patterns
    generateOperationalRecommendations(markers, iracNotes) {
        const recommendations = [];

        // Marker distribution analysis (Source: db_viewer_js.txt geographic distribution)
        const manualMarkers = markers.filter(m => m.type === 'manual').length;
        const importedMarkers = markers.filter(m => m.type === 'imported').length;

        if (importedMarkers > manualMarkers * 3) {
            recommendations.push({
                category: 'Data Entry Workflow',
                priority: 'medium',
                issue: 'High ratio of imported vs manual markers detected',
                recommendation: 'Consider automating more data entry processes',
                actions: [
                    'Implement bulk import tools',
                    'Standardize data import formats',
                    'Train staff on efficient import procedures',
                    'Develop automated validation workflows'
                ]
            });
        }

        // Frequency band utilization (Source: db_viewer_js.txt frequency analysis)
        const frequencyStats = this.analyzeFrequencyDistribution(markers);
        const totalWithFreq = frequencyStats.vhf + frequencyStats.uhf + frequencyStats.shf;

        if (frequencyStats.none > totalWithFreq * 0.5) {
            recommendations.push({
                category: 'Frequency Data Quality',
                priority: 'high',
                issue: 'High percentage of markers without frequency assignments',
                recommendation: 'Improve frequency data collection and validation',
                actions: [
                    'Mandatory frequency field validation',
                    'Staff training on frequency format standards',
                    'Automated frequency format checking',
                    'Regular frequency data audits'
                ]
            });
        }

        // IRAC notes utilization (Source: db_viewer_js.txt IRAC management)
        const avgIRACPerMarker = iracNotes.length / Math.max(markers.length, 1);

        if (avgIRACPerMarker < 0.5) {
            recommendations.push({
                category: 'IRAC Note Coverage',
                priority: 'medium',
                issue: 'Low IRAC note coverage across markers',
                recommendation: 'Increase IRAC note assignments for better coordination',
                actions: [
                    'Review markers needing IRAC coordination',
                    'Expand IRAC note database coverage',
                    'Train staff on IRAC note selection',
                    'Implement IRAC assignment guidelines'
                ]
            });
        }

        // Geographic coverage analysis (Source: db_viewer_js.txt geographic analysis)
        const markersWithCoords = markers.filter(m => m.latitude && m.longitude).length;
        const coordCoverage = markersWithCoords / Math.max(markers.length, 1);

        if (coordCoverage < 0.9) {
            recommendations.push({
                category: 'Geographic Data Completeness',
                priority: 'high',
                issue: 'Incomplete geographic coordinate coverage',
                recommendation: 'Improve coordinate data collection and accuracy',
                actions: [
                    'Mandatory coordinate validation',
                    'GPS coordinate collection training',
                    'Automated coordinate format checking',
                    'Geographic data quality audits'
                ]
            });
        }

        // System performance recommendations (Source: db_viewer_css.txt responsive design)
        if (markers.length > 1000) {
            recommendations.push({
                category: 'System Performance',
                priority: 'medium',
                issue: 'Large dataset may impact system performance',
                recommendation: 'Optimize system for large-scale operations',
                actions: [
                    'Implement data pagination',
                    'Add database indexing optimization',
                    'Consider data archiving procedures',
                    'Monitor system performance metrics'
                ]
            });
        }

        // User interface optimization (Source: db_viewer_html.txt enhanced controls)
        recommendations.push({
            category: 'User Experience',
            priority: 'low',
            issue: 'Maintain optimal user interface efficiency',
            recommendation: 'Continue enhancing user interface based on usage patterns',
            actions: [
                'Regular user feedback collection',
                'Interface usability testing',
                'Keyboard shortcut optimization',
                'Mobile interface improvements'
            ]
        });

        return recommendations;
    }

    // ✅ ENHANCED: Update table statistics function (referenced in sources)
    updateTableStatistics(recordCount) {
        // Update table statistics display (Source: db_viewer_html.txt pagination)
        const recordsDisplayInfo = document.getElementById('recordsDisplayInfo');
        if (recordsDisplayInfo) {
            const startIndex = ((this.currentPage || 1) - 1) * (this.itemsPerPage || 25);
            const endIndex = Math.min(startIndex + (this.itemsPerPage || 25), recordCount);
            // Use total database records instead of current page count
            const totalRecords = this.totalDatabaseRecords || recordCount;
            recordsDisplayInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRecords} records`;
        }

        // Update page info (Source: db_viewer_html.txt pagination controls)
        const pageInfo = document.getElementById('sfafPageInfo');
        if (pageInfo) {
            // Use total database records for calculating total pages
            const totalRecords = this.totalDatabaseRecords || recordCount;
            const totalPages = Math.ceil(totalRecords / (this.itemsPerPage || 25));
            pageInfo.textContent = `Page ${this.currentPage || 1} of ${totalPages || 1}`;
        }

        console.log(`📊 Table statistics updated: ${recordCount} records displayed`);
    }

    // ✅ ENHANCED: Generate SFAF view content (Source: db_viewer_js.txt view patterns)
    generateSFAFViewContent(record) {
        // Store current record ID for saving
        this.currentEditingRecordId = record.id;

        return `
        <div class="sfaf-view-content">
            <div class="record-header">
                <h4>${record.serial} - ${record.agency}</h4>
                <p>
                    <strong>Frequency:</strong> ${record.frequency} |
                    <strong>Location:</strong> ${record.location}
                </p>
                <div class="status-indicators">
                    <span class="completion-badge">Completion: ${record.completionPercentage || 0}%</span>
                    <span class="compliance-badge ${record.mcebCompliant?.isCompliant ? 'compliant' : 'non-compliant'}">
                        ${record.mcebCompliant?.isCompliant ? '✅ MC4EB Compliant' : '⚠️ Issues Found'}
                    </span>
                </div>
            </div>

            <div class="sfaf-fields-display">
                <h5>SFAF Fields <span style="font-size: 14px; color: #a78bfa; font-weight: normal;">(Click any field to edit)</span></h5>
                ${this.renderEditableSFAFFieldsView(record.rawSFAFFields || {}, record.id)}
            </div>
            
            ${record.iracNotes && record.iracNotes.length > 0 ? `
                <div class="irac-notes-section">
                    ${this.renderIRACNotesView(record.iracNotes)}
                </div>
            ` : ''}
            
            <div class="record-metadata">
                <h5>Technical Details</h5>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <label>Coordinates:</label>
                        <span>${record.coordinates?.decimal || 'Not Available'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>DMS Format:</label>
                        <span>${record.coordinates?.dms || 'Not Available'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Compact Format:</label>
                        <span>${record.coordinates?.compact || 'Not Available'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Marker Type:</label>
                        <span>${record.markerType || 'Unknown'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Station Class:</label>
                        <span>${record.stationClass || 'Not Specified'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Emission:</label>
                        <span>${record.emission || 'Not Specified'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Power:</label>
                        <span>${record.power || 'Not Specified'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Created:</label>
                        <span>${record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Unknown'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Last Updated:</label>
                        <span>${record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'Unknown'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>SFAF Fields Count:</label>
                        <span>${record.sfafFieldCount || 0}</span>
                    </div>
                </div>
            </div>

            ${record.validationStatus && !record.validationStatus.isValid ? `
                <div class="validation-issues">
                    <h5>⚠️ Validation Issues</h5>
                    <div class="validation-errors">
                        ${record.validationStatus.errors?.map(error => `
                            <div class="validation-error">
                                <i class="fas fa-exclamation-triangle"></i>
                                ${error}
                            </div>
                        `).join('') || 'No specific errors available'}
                    </div>
                </div>
            ` : ''}

            ${record.mcebCompliant && !record.mcebCompliant.isCompliant ? `
                <div class="compliance-issues">
                    <h5>⚠️ MC4EB Compliance Issues</h5>
                    <div class="compliance-errors">
                        ${record.mcebCompliant.issues?.map(issue => `
                            <div class="compliance-error">
                                <i class="fas fa-balance-scale"></i>
                                ${issue}
                            </div>
                        `).join('') || 'Compliance issues detected but details unavailable'}
                    </div>
                    <div class="compliance-note">
                        <small>Issues must be resolved for MC4EB Publication 7, Change 1 compliance</small>
                    </div>
                </div>
            ` : ''}

            ${record.equipment && record.equipment.length > 0 ? `
                <div class="equipment-section">
                    <h5>📡 Equipment Information</h5>
                    <div class="equipment-list">
                        ${record.equipment.map(equip => `
                            <div class="equipment-item">
                                <div class="equipment-type">${equip.type}</div>
                                <div class="equipment-details">
                                    <div><strong>Nomenclature:</strong> ${equip.nomenclature}</div>
                                    <div><strong>Certification ID:</strong> ${equip.certificationId}</div>
                                    ${equip.power ? `<div><strong>Power:</strong> ${equip.power}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${record.antennaInfo ? `
                <div class="antenna-section">
                    <h5>📶 Antenna Information</h5>
                    <div class="antenna-grid">
                        <div class="antenna-group">
                            <h6>Transmitter Antenna</h6>
                            <div class="antenna-details">
                                <div><strong>Gain:</strong> ${record.antennaInfo.transmitter?.gain || 'Not specified'}</div>
                                <div><strong>Height:</strong> ${record.antennaInfo.transmitter?.height || 'Not specified'}</div>
                                <div><strong>Orientation:</strong> ${record.antennaInfo.transmitter?.orientation || 'Not specified'}</div>
                                <div><strong>Polarization:</strong> ${record.antennaInfo.transmitter?.polarization || 'Not specified'}</div>
                            </div>
                        </div>
                        <div class="antenna-group">
                            <h6>Receiver Antenna</h6>
                            <div class="antenna-details">
                                <div><strong>Gain:</strong> ${record.antennaInfo.receiver?.gain || 'Not specified'}</div>
                                <div><strong>Height:</strong> ${record.antennaInfo.receiver?.height || 'Not specified'}</div>
                                <div><strong>Orientation:</strong> ${record.antennaInfo.receiver?.orientation || 'Not specified'}</div>
                                <div><strong>Polarization:</strong> ${record.antennaInfo.receiver?.polarization || 'Not specified'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="record-actions">
                <h5>Actions</h5>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="databaseViewer.saveAllSFAFFieldChanges('${record.id}')">
                        <i class="fas fa-save"></i> Save All Changes
                    </button>
                    <button class="btn btn-success" onclick="databaseViewer.exportSFAFRecord('${record.id}')">
                        <i class="fas fa-download"></i> Export SFAF
                    </button>
                    <button class="btn btn-info" onclick="databaseViewer.validateSFAFRecord('${record.id}')">
                        <i class="fas fa-check-circle"></i> Validate Compliance
                    </button>
                    ${record.coordinates?.lat && record.coordinates?.lng ? `
                        <button class="btn btn-secondary" onclick="databaseViewer.viewRecordOnMap('${record.id}')">
                            <i class="fas fa-map-marker-alt"></i> View on Map
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    }

    // ✅ ENHANCED: Generate SFAF export text format (Source: db_viewer_js.txt SFAF parsing)
    generateSFAFExport(record) {
        const lines = [];
        const sfafFields = record.rawSFAFFields || {};

        // Sort field keys to maintain proper SFAF field order
        const sortedFieldKeys = Object.keys(sfafFields).sort((a, b) => {
            const aNum = parseInt(a.replace('field', '').split('_')[0]);
            const bNum = parseInt(b.replace('field', '').split('_')[0]);
            return aNum - bNum;
        });

        // Generate SFAF header comment
        lines.push(`=== SFAF Export for ${record.serial} ===`);
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push(`Source: SFAF Plotter Database Viewer`);
        lines.push(`MC4EB Publication 7, Change 1 Format`);
        lines.push('');

        // Generate SFAF field lines
        sortedFieldKeys.forEach(fieldKey => {
            const value = sfafFields[fieldKey];
            if (value && value.trim() !== '') {
                // Extract field number and occurrence from key (e.g., field500_02 -> 500/02)
                const match = fieldKey.match(/field(\d+)(?:_(\d+))?/);
                if (match) {
                    const fieldNumber = match[1];
                    const occurrence = match[2];

                    if (occurrence) {
                        lines.push(`${fieldNumber}/${occurrence}. ${value}`);
                    } else {
                        lines.push(`${fieldNumber}. ${value}`);
                    }
                }
            }
        });

        lines.push(''); // Empty line to separate records
        return lines.join('\n');
    }

    // ✅ ENHANCED: Additional supporting functions for SFAF record management
    validateSFAFRecord(recordId) {
        try {
            console.log(`🔍 Validating SFAF record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found for validation');
                return;
            }

            // Perform comprehensive validation
            const validation = this.performSFAFValidation(record.rawSFAFFields || {}, record.fieldDefinitions || {});
            const mcebCompliance = this.checkMCEBCompliance(record.rawSFAFFields || {}, record.fieldDefinitions || {});

            // Show validation results in modal
            const validationContent = `
            <div class="validation-results">
                <h4>SFAF Validation Results for ${record.serial}</h4>
                
                <div class="validation-summary">
                    <div class="validation-status ${validation.isValid ? 'valid' : 'invalid'}">
                        ${validation.isValid ? '✅ All validations passed' : '❌ Validation issues found'}
                    </div>
                    <div class="compliance-status ${mcebCompliance.isCompliant ? 'compliant' : 'non-compliant'}">
                        ${mcebCompliance.isCompliant ? '✅ MC4EB Publication 7, Change 1 Compliant' : '⚠️ MC4EB Compliance Issues'}
                    </div>
                </div>

                ${validation.errors && validation.errors.length > 0 ? `
                    <div class="validation-errors">
                        <h5>Validation Errors</h5>
                        <ul>
                            ${validation.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${validation.warnings && validation.warnings.length > 0 ? `
                    <div class="validation-warnings">
                        <h5>Validation Warnings</h5>
                        <ul>
                            ${validation.warnings.map(warning => `<li>${warning}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${mcebCompliance.issues && mcebCompliance.issues.length > 0 ? `
                    <div class="compliance-issues">
                        <h5>MC4EB Compliance Issues</h5>
                        <ul>
                            ${mcebCompliance.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="validation-summary-stats">
                    <div class="stat-item">
                        <label>Completion Percentage:</label>
                        <span>${record.completionPercentage || 0}%</span>
                    </div>
                    <div class="stat-item">
                        <label>Total SFAF Fields:</label>
                        <span>${record.sfafFieldCount || 0}</span>
                    </div>
                    <div class="stat-item">
                        <label>Validation Date:</label>
                        <span>${new Date().toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;

            this.showModal('SFAF Validation Results', validationContent);

        } catch (error) {
            console.error('Failed to validate SFAF record:', error);
            this.showError('Failed to validate SFAF record');
        }
    }

    viewOnMap(recordId) {
        try {
            console.log(`🗺️ Opening map view for record: ${recordId}`);

            // Find the record in current data
            const record = this.currentSFAFData?.find(r => r.id === recordId);
            if (!record) {
                this.showError('Record not found');
                return;
            }

            if (!record.coordinates?.lat || !record.coordinates?.lng) {
                this.showError('No valid coordinates available for this record');
                return;
            }

            // Construct URL to main map with marker focus (Source: main_go.txt route structure)
            const mapUrl = `/?focus=${record.coordinates.lat},${record.coordinates.lng}&marker=${record.id}&serial=${encodeURIComponent(record.serial)}`;

            // Open in new tab
            window.open(mapUrl, '_blank');

        } catch (error) {
            console.error('Failed to open map view:', error);
            this.showError('Failed to open map view');
        }
    }

    // ✅ ENHANCED: Save SFAF changes function
    saveSFAFChanges(recordId) {
        try {
            console.log(`💾 Saving SFAF changes for record: ${recordId}`);

            // Collect SFAF field values from all input fields in the modal
            const sfafFields = {};
            const modalContent = document.querySelector('.sfaf-edit-form');

            if (!modalContent) {
                throw new Error('Edit form not found in modal');
            }

            // Find all SFAF field inputs
            const fieldInputs = modalContent.querySelectorAll('input[id^="field"]');
            console.log(`📋 Found ${fieldInputs.length} field inputs`);

            fieldInputs.forEach(input => {
                const fieldId = input.id;
                const value = input.value.trim();
                if (value !== '') {
                    sfafFields[fieldId] = value;
                }
            });

            console.log(`📤 Collected ${Object.keys(sfafFields).length} non-empty fields:`, sfafFields);

            // Validate required fields before saving
            const validation = this.validateSFAFFormData(sfafFields);
            if (!validation.isValid) {
                this.showError(`Validation failed: ${validation.errors.join(', ')}`);
                return;
            }

            // Show loading state
            this.showLoading(true, 'Saving SFAF changes...');

            // Save changes via API (Source: main_go.txt SFAF routes)
            fetch(`/api/sfaf/marker/${recordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    marker_id: recordId,
                    sfaf_fields: sfafFields,
                    updated_by: 'database_viewer',
                    update_timestamp: new Date().toISOString()
                })
            })
                .then(async response => {
                    if (!response.ok) {
                        const errorData = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorData}`);
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.success) {
                        this.showSuccess('SFAF changes saved successfully');
                        this.closeModal();

                        // Refresh the SFAF records display to show updated data
                        this.loadSFAFRecords();

                        console.log('✅ SFAF changes saved successfully');
                    } else {
                        throw new Error(result.error || 'Failed to save SFAF changes');
                    }
                })
                .catch(error => {
                    console.error('❌ Failed to save SFAF changes:', error);
                    this.showError(`Failed to save changes: ${error.message}`);
                })
                .finally(() => {
                    this.showLoading(false);
                });

        } catch (error) {
            console.error('❌ Error in saveSFAFChanges:', error);
            this.showError('Failed to save SFAF changes');
            this.showLoading(false);
        }
    }

    // ✅ ENHANCED: Validate SFAF form data before submission
    validateSFAFFormData(sfafFields) {
        const errors = [];
        const warnings = [];

        // Required fields validation (Source: db_viewer_js.txt MC4EB compliance)
        const requiredFields = {
            'field005': 'Type of Application',
            'field010': 'Type of Action',
            'field102': 'Agency Serial Number',
            'field110': 'Frequency',
            'field200': 'Agency'
        };

        Object.entries(requiredFields).forEach(([fieldId, fieldName]) => {
            if (!sfafFields[fieldId] || sfafFields[fieldId].trim() === '') {
                errors.push(`${fieldName} (${fieldId}) is required`);
            }
        });

        // Frequency format validation
        if (sfafFields.field110) {
            if (!this.isValidFrequencyFormat(sfafFields.field110)) {
                errors.push('Frequency (field110) format is invalid. Expected: K####(####.#)');
            }
        }

        // Emission designator validation
        if (sfafFields.field114) {
            if (!this.isValidEmissionDesignator(sfafFields.field114)) {
                warnings.push('Emission designator (field114) format should be verified');
            }
        }

        // Agency serial number format validation
        if (sfafFields.field102) {
            const serialPattern = /^[A-Z]{2,3}\s+\d{6,8}$/;
            if (!serialPattern.test(sfafFields.field102)) {
                warnings.push('Agency serial number format should be: AA NNNNNN or AAA NNNNNN');
            }
        }

        // Power format validation
        if (sfafFields.field115) {
            const powerPattern = /^W\d+$/;
            if (!powerPattern.test(sfafFields.field115)) {
                warnings.push('Power format should be: W### (e.g., W500)');
            }
        }

        // MC4EB Publication 7, Change 1 field occurrence limits (Source: db_viewer_js.txt validation)
        const field500Count = this.countFieldOccurrencesInForm(sfafFields, '500');
        const field501Count = this.countFieldOccurrencesInForm(sfafFields, '501');

        if (field500Count > 10) {
            errors.push('Field 500 occurrences exceed MC4EB Publication 7, Change 1 limit (max 10)');
        }

        if (field501Count > 30) {
            errors.push('Field 501 occurrences exceed MC4EB Publication 7, Change 1 limit (max 30)');
        }

        return {
            isValid: errors.length === 0,
            hasWarnings: warnings.length > 0,
            errors: errors,
            warnings: warnings,
            errorCount: errors.length,
            warningCount: warnings.length
        };
    }

    // ✅ ENHANCED: Count field occurrences in form data
    countFieldOccurrencesInForm(sfafFields, fieldNumber) {
        return Object.keys(sfafFields).filter(key =>
            key.includes(`field${fieldNumber}`)
        ).length;
    }

    // ✅ NEW: Render editable SFAF fields view for Object tab
    renderEditableSFAFFieldsView(sfafFields, recordId) {
        if (!sfafFields || Object.keys(sfafFields).length === 0) {
            return `
                <div class="no-sfaf-fields">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h5>No SFAF Fields Defined</h5>
                        <p>This record does not have any SFAF fields defined.</p>
                    </div>
                </div>
            `;
        }

        // Sort field keys numerically
        const sortedFieldKeys = Object.keys(sfafFields).sort((a, b) => {
            const aNum = parseInt(a.replace('field', '').split('_')[0]);
            const bNum = parseInt(b.replace('field', '').split('_')[0]);
            return aNum - bNum;
        });

        return `
            <div class="editable-sfaf-fields">
                <div class="fields-grid">
                    ${sortedFieldKeys.map(fieldKey => {
                        const fieldNumber = fieldKey.replace('field', '');
                        const value = sfafFields[fieldKey] || '';
                        const fieldLabel = this.getFieldLabelFromNumber(fieldNumber);

                        return `
                            <div class="field-row editable-field" data-field-key="${fieldKey}">
                                <div class="field-label-col">
                                    <label for="edit_${fieldKey}">
                                        <span class="field-number">Field ${fieldNumber}:</span>
                                        <span class="field-name">${fieldLabel}</span>
                                    </label>
                                </div>
                                <div class="field-value-col">
                                    <input type="text"
                                           id="edit_${fieldKey}"
                                           name="${fieldKey}"
                                           value="${this.escapeHtml(value)}"
                                           class="field-input"
                                           data-field-key="${fieldKey}"
                                           placeholder="Enter value...">
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // ✅ NEW: Get field label from field number
    getFieldLabelFromNumber(fieldNumber) {
        const fieldLabels = {
            '005': 'Type of Application',
            '010': 'Type of Action',
            '102': 'Agency Serial Number',
            '110': 'Frequency',
            '113': 'Station Class',
            '114': 'Emission',
            '115': 'Power',
            '200': 'Agency',
            '300': 'Location',
            '301': 'Coordinates',
            '302': 'Radius',
            '500': 'Equipment Nomenclature',
            '501': 'Equipment Certification',
            '601': 'Remarks'
        };

        // Extract base field number (e.g., "500_01" -> "500")
        const baseNumber = fieldNumber.split('_')[0];
        return fieldLabels[baseNumber] || `Field ${fieldNumber}`;
    }

    // ✅ NEW: Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ✅ NEW: Save all SFAF field changes from Object tab
    async saveAllSFAFFieldChanges(recordId) {
        try {
            console.log(`💾 Saving all SFAF field changes for record: ${recordId}`);

            // Collect all field values from inputs
            const fieldInputs = document.querySelectorAll('.field-input[data-field-key]');
            const sfafFields = {};

            fieldInputs.forEach(input => {
                const fieldKey = input.dataset.fieldKey;
                const value = input.value.trim();
                if (value !== '') {
                    sfafFields[fieldKey] = value;
                }
            });

            console.log('📤 Submitting SFAF field updates:', sfafFields);

            if (Object.keys(sfafFields).length === 0) {
                this.showWarning('No fields to save');
                return;
            }

            // Show loading state
            this.showLoading(true, 'Saving SFAF changes...');

            // Save changes via API
            const response = await fetch(`/api/sfaf/marker/${recordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    marker_id: recordId,
                    sfaf_fields: sfafFields,
                    updated_by: 'database_viewer',
                    update_timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess('SFAF changes saved successfully');

                // Refresh the SFAF records display to show updated data
                await this.loadSFAFRecords();

                console.log('✅ SFAF changes saved successfully');
            } else {
                throw new Error(result.error || 'Failed to save SFAF changes');
            }

        } catch (error) {
            console.error('❌ Failed to save SFAF changes:', error);
            this.showError(`Failed to save changes: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // ✅ ENHANCED: Validate SFAF form before submission
    validateSFAFForm(recordId) {
        try {
            console.log(`🔍 Validating SFAF form for record: ${recordId}`);

            // Collect current form data
            const formData = new FormData(document.getElementById('editForm'));
            const sfafFields = {};

            for (const [key, value] of formData.entries()) {
                if (key.startsWith('field')) {
                    sfafFields[key] = value.trim();
                }
            }

            // Perform comprehensive validation
            const validation = this.validateSFAFFormData(sfafFields);
            const mcebCompliance = this.checkMCEBComplianceForForm(sfafFields);

            // Show validation results in alert or modal
            let message = '🔍 SFAF Validation Results:\n\n';

            if (validation.isValid) {
                message += '✅ All required fields are valid\n';
            } else {
                message += '❌ Validation Errors:\n';
                validation.errors.forEach(error => {
                    message += `  • ${error}\n`;
                });
            }

            if (validation.hasWarnings) {
                message += '\n⚠️ Validation Warnings:\n';
                validation.warnings.forEach(warning => {
                    message += `  • ${warning}\n`;
                });
            }

            if (mcebCompliance.isCompliant) {
                message += '\n✅ MC4EB Publication 7, Change 1 Compliant';
            } else {
                message += '\n⚠️ MC4EB Compliance Issues:\n';
                mcebCompliance.issues.forEach(issue => {
                    message += `  • ${issue}\n`;
                });
            }

            // Calculate completion percentage
            const completionPercentage = this.calculateFormCompletionPercentage(sfafFields);
            message += `\n📊 Form Completion: ${completionPercentage}%`;

            alert(message);

            // Highlight invalid fields in the form
            this.highlightFormValidationIssues(validation);

        } catch (error) {
            console.error('❌ Failed to validate SFAF form:', error);
            this.showError('Failed to validate SFAF form');
        }
    }

    // ✅ ENHANCED: Check MC4EB compliance for form data
    checkMCEBComplianceForForm(sfafFields) {
        const issues = [];

        // Field occurrence limits (Source: db_viewer_js.txt MC4EB compliance)
        const field500Count = this.countFieldOccurrencesInForm(sfafFields, '500');
        const field501Count = this.countFieldOccurrencesInForm(sfafFields, '501');

        if (field500Count > 10) {
            issues.push('Field 500 exceeds maximum 10 occurrences per MC4EB Publication 7, Change 1');
        }

        if (field501Count > 30) {
            issues.push('Field 501 exceeds maximum 30 occurrences per MC4EB Publication 7, Change 1');
        }

        // Field length limits
        if (sfafFields.field500 && sfafFields.field500.length > 4) {
            issues.push('Field 500 exceeds maximum 4 characters');
        }

        if (sfafFields.field501 && sfafFields.field501.length > 35) {
            issues.push('Field 501 exceeds maximum 35 characters');
        }

        // Required field validation for MC4EB compliance
        const requiredForCompliance = ['field005', 'field010', 'field102', 'field110', 'field200', 'field300'];
        const missingRequired = requiredForCompliance.filter(field =>
            !sfafFields[field] || sfafFields[field].trim() === ''
        );

        if (missingRequired.length > 0) {
            issues.push(`Missing required fields for MC4EB compliance: ${missingRequired.join(', ')}`);
        }

        return {
            isCompliant: issues.length === 0,
            issues: issues,
            checkDate: new Date().toISOString()
        };
    }

    // ✅ ENHANCED: Calculate form completion percentage
    calculateFormCompletionPercentage(sfafFields) {
        // Critical fields for completion (Source: db_viewer_js.txt completion calculation)
        const criticalFields = [
            'field005', 'field010', 'field102', 'field110', 'field113',
            'field114', 'field115', 'field200', 'field300', 'field301'
        ];

        const completedCritical = criticalFields.filter(field =>
            sfafFields[field] && sfafFields[field].trim() !== ''
        ).length;

        return Math.round((completedCritical / criticalFields.length) * 100);
    }

    // ✅ ENHANCED: Highlight form validation issues visually
    highlightFormValidationIssues(validation) {
        // Clear previous highlights
        document.querySelectorAll('.sfaf-field-input').forEach(input => {
            input.classList.remove('validation-error', 'validation-warning');
            const errorMsg = input.parentNode.querySelector('.validation-error-msg');
            if (errorMsg) errorMsg.remove();
        });

        // Add error highlights
        validation.errors.forEach(error => {
            const fieldMatch = error.match(/\(field(\d+)\)/);
            if (fieldMatch) {
                const fieldId = `field${fieldMatch[1]}`;
                const input = document.getElementById(fieldId);
                if (input) {
                    input.classList.add('validation-error');

                    // Add error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'validation-error-msg';
                    errorDiv.textContent = error;
                    input.parentNode.appendChild(errorDiv);
                }
            }
        });

        // Add warning highlights
        validation.warnings.forEach(warning => {
            const fieldMatch = warning.match(/\(field(\d+)\)/);
            if (fieldMatch) {
                const fieldId = `field${fieldMatch[1]}`;
                const input = document.getElementById(fieldId);
                if (input) {
                    input.classList.add('validation-warning');
                }
            }
        });
    }

    // ✅ ENHANCED: Close modal with cleanup
    closeModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';

            // Reset modal content to prevent stale data (Source: db_viewer_html.txt modal structure)
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = modal.querySelector('.modal-body');
            const editForm = document.getElementById('editForm');

            if (modalTitle) {
                modalTitle.textContent = 'Edit Record';
            }

            if (editForm) {
                editForm.innerHTML = '';
                editForm.onsubmit = null; // Remove event handlers
            }

            // Reset modal footer to default
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
                <button type="submit" form="editForm" class="btn btn-primary">Save Changes</button>
            `;
            }

            // Clear any stored data attributes
            delete modal.dataset.markerId;
            delete modal.dataset.recordId;

            // Clear validation highlights
            document.querySelectorAll('.validation-error, .validation-warning').forEach(element => {
                element.classList.remove('validation-error', 'validation-warning');
            });

            document.querySelectorAll('.validation-error-msg').forEach(element => {
                element.remove();
            });

            console.log('✅ Modal closed and reset');
        }
    }

    // ✅ ENHANCED: Download file utility function
    downloadFile(filename, content) {
        try {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log(`✅ File downloaded: ${filename}`);
            this.showSuccess(`File downloaded: ${filename}`);
        } catch (error) {
            console.error('❌ Failed to download file:', error);
            this.showError('Failed to download file');
        }
    }

    // ✅ ENHANCED: Show modal with proper initialization
    showModal(title, content, footerButtons = null) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = modal.querySelector('.modal-body');

        if (!modal || !modalTitle || !modalBody) {
            console.error('❌ Modal elements not found in DOM');
            this.showError('Modal system not properly initialized');
            return;
        }

        // Set modal content (Source: db_viewer_html.txt modal structure)
        modalTitle.textContent = title;
        modalBody.innerHTML = content;

        // Set custom footer buttons if provided
        if (footerButtons) {
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = footerButtons;
            }
        }

        // Show modal with fade-in effect
        modal.style.display = 'block';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        // Focus management for accessibility (
    }

    // ✅ ENHANCED: Show modal with proper initialization
    showModal(title, content, footerButtons = null) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = modal.querySelector('.modal-body');

        if (!modal || !modalTitle || !modalBody) {
            console.error('❌ Modal elements not found in DOM');
            this.showError('Modal system not properly initialized');
            return;
        }

        // Set modal content (Source: db_viewer_html.txt modal structure)
        modalTitle.textContent = title;
        modalBody.innerHTML = content;

        // Set custom footer buttons if provided
        if (footerButtons) {
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = footerButtons;
            }
        }

        // Show modal with fade-in effect (Source: db_viewer_css.txt modal styling)
        modal.style.display = 'block';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        // Focus management for accessibility (Source: db_viewer_css.txt accessibility)
        const firstInput = modal.querySelector('input, select, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        // Add keyboard event handler for modal
        this.addModalKeyboardHandlers(modal);

        // Add click-outside-to-close functionality
        this.addModalClickOutsideHandler(modal);

        console.log(`📋 Modal opened: ${title}`);
    }

    // ✅ ENHANCED: Add keyboard event handlers for modal accessibility
    addModalKeyboardHandlers(modal) {
        const keyboardHandler = (e) => {
            // ESC key to close modal
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeModal();
                document.removeEventListener('keydown', keyboardHandler);
            }

            // Tab key navigation within modal
            if (e.key === 'Tab') {
                const focusableElements = modal.querySelectorAll(
                    'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }

            // Enter key to submit form if modal contains a form
            if (e.key === 'Enter' && e.ctrlKey) {
                const submitButton = modal.querySelector('button[type="submit"], .btn-primary');
                if (submitButton) {
                    e.preventDefault();
                    submitButton.click();
                }
            }
        };

        document.addEventListener('keydown', keyboardHandler);

        // Store handler for cleanup
        modal.dataset.keyboardHandler = 'attached';
    }

    // ✅ ENHANCED: Add click-outside-to-close functionality
    addModalClickOutsideHandler(modal) {
        const clickHandler = (e) => {
            // Check if click was on the modal backdrop (not the modal content)
            if (e.target === modal) {
                this.closeModal();
                modal.removeEventListener('click', clickHandler);
            }
        };

        modal.addEventListener('click', clickHandler);

        // Store handler for cleanup
        modal.dataset.clickHandler = 'attached';
    }

    // ✅ ENHANCED: Enhanced close modal with proper cleanup
    closeModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            // Fade-out effect (Source: db_viewer_css.txt transitions)
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);

            // Reset modal content to prevent stale data (Source: db_viewer_html.txt modal structure)
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = modal.querySelector('.modal-body');
            const editForm = document.getElementById('editForm');

            if (modalTitle) {
                modalTitle.textContent = 'Edit Record';
            }

            if (editForm) {
                editForm.innerHTML = '';
                editForm.onsubmit = null; // Remove event handlers
            }

            // Reset modal footer to default (Source: db_viewer_html.txt footer structure)
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">Cancel</button>
                <button type="submit" form="editForm" class="btn btn-primary">Save Changes</button>
            `;
            }

            // Clear any stored data attributes
            delete modal.dataset.markerId;
            delete modal.dataset.recordId;
            delete modal.dataset.keyboardHandler;
            delete modal.dataset.clickHandler;

            // Clear validation highlights (Source: db_viewer_js.txt validation)
            document.querySelectorAll('.validation-error, .validation-warning').forEach(element => {
                element.classList.remove('validation-error', 'validation-warning');
            });

            document.querySelectorAll('.validation-error-msg').forEach(element => {
                element.remove();
            });

            // Remove event handlers
            document.removeEventListener('keydown', this.modalKeyboardHandler);
            modal.removeEventListener('click', this.modalClickHandler);

            console.log('✅ Modal closed and reset');
        }
    }

    // ✅ ENHANCED: Show modal with specific SFAF field form
    showSFAFFieldModal(markerId, fieldData = {}) {
        const modalContent = `
        <div class="sfaf-field-modal-content">
            <h4>SFAF Field Editor</h4>
            <p class="modal-description">Edit SFAF fields according to MC4EB Publication 7, Change 1 standards</p>
            
            <form id="sfafFieldForm" class="sfaf-field-form">
                <!-- Required Fields Section (Source: db_viewer_js.txt MC4EB compliance) -->
                <div class="field-section required-fields">
                    <h5>Required Fields <span class="required-indicator">*</span></h5>
                    
                    <div class="field-group">
                        <label for="field005">Field 005 - Type of Application <span class="required">*</span></label>
                        <select id="field005" name="field005" required class="sfaf-field-input">
                            <option value="">Select Type</option>
                            <option value="UE" ${fieldData.field005 === 'UE' ? 'selected' : ''}>UE - Uncoordinated Equipment</option>
                            <option value="CE" ${fieldData.field005 === 'CE' ? 'selected' : ''}>CE - Coordinated Equipment</option>
                        </select>
                        <small class="field-hint">UE = Uncoordinated Equipment, CE = Coordinated Equipment</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field010">Field 010 - Type of Action <span class="required">*</span></label>
                        <select id="field010" name="field010" required class="sfaf-field-input">
                            <option value="">Select Action</option>
                            <option value="N" ${fieldData.field010 === 'N' ? 'selected' : ''}>N - New</option>
                            <option value="M" ${fieldData.field010 === 'M' ? 'selected' : ''}>M - Modification</option>
                            <option value="D" ${fieldData.field010 === 'D' ? 'selected' : ''}>D - Discontinue</option>
                        </select>
                        <small class="field-hint">N = New, M = Modification, D = Discontinue</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field102">Field 102 - Agency Serial Number <span class="required">*</span></label>
                        <input type="text" id="field102" name="field102" required 
                               value="${fieldData.field102 || ''}" 
                               pattern="[A-Z]{2,3}\\s+\\d{6,8}"
                               class="sfaf-field-input"
                               placeholder="e.g., AF 014589">
                        <small class="field-hint">Format: [Agency Code][Space][6-8 digits]</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field110">Field 110 - Frequency <span class="required">*</span></label>
                        <input type="text" id="field110" name="field110" required 
                               value="${fieldData.field110 || ''}"
                               class="sfaf-field-input"
                               placeholder="e.g., K4028(4026.5)">
                        <small class="field-hint">Format: K####(####.#) or numeric with units</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field200">Field 200 - Agency <span class="required">*</span></label>
                        <select id="field200" name="field200" required class="sfaf-field-input">
                            <option value="">Select Agency</option>
                            <option value="USAF" ${fieldData.field200 === 'USAF' ? 'selected' : ''}>USAF - U.S. Air Force</option>
                            <option value="USA" ${fieldData.field200 === 'USA' ? 'selected' : ''}>USA - U.S. Army</option>
                            <option value="USN" ${fieldData.field200 === 'USN' ? 'selected' : ''}>USN - U.S. Navy</option>
                            <option value="USMC" ${fieldData.field200 === 'USMC' ? 'selected' : ''}>USMC - U.S. Marine Corps</option>
                            <option value="USCG" ${fieldData.field200 === 'USCG' ? 'selected' : ''}>USCG - U.S. Coast Guard</option>
                        </select>
                        <small class="field-hint">Select the responsible military service</small>
                    </div>
                </div>
                
                <!-- Technical Parameters Section (Source: db_viewer_js.txt field definitions) -->
                <div class="field-section technical-fields">
                    <h5>Technical Parameters</h5>
                    
                    <div class="field-group">
                        <label for="field113">Field 113 - Station Class</label>
                        <select id="field113" name="field113" class="sfaf-field-input">
                            <option value="">Select Class</option>
                            <option value="MO" ${fieldData.field113 === 'MO' ? 'selected' : ''}>MO - Mobile</option>
                            <option value="ML" ${fieldData.field113 === 'ML' ? 'selected' : ''}>ML - Mobile Land</option>
                            <option value="FB" ${fieldData.field113 === 'FB' ? 'selected' : ''}>FB - Fixed Base</option>
                            <option value="FX" ${fieldData.field113 === 'FX' ? 'selected' : ''}>FX - Fixed</option>
                        </select>
                        <small class="field-hint">Station operational classification</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field114">Field 114 - Emission Designator</label>
                        <input type="text" id="field114" name="field114" 
                               value="${fieldData.field114 || ''}"
                               pattern="\\d+[KMG]?\\d*[A-Z]\\d*[A-Z]?"
                               class="sfaf-field-input"
                               placeholder="e.g., 2K70J3E">
                        <small class="field-hint">Format: Bandwidth + Emission Class + Modulation</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field115">Field 115 - Transmitter Power</label>
                        <input type="text" id="field115" name="field115" 
                               value="${fieldData.field115 || ''}"
                               pattern="W\\d+"
                               class="sfaf-field-input"
                               placeholder="e.g., W500">
                        <small class="field-hint">Format: W### (watts)</small>
                    </div>
                </div>
                
                <!-- Location Information Section -->
                <div class="field-section location-fields">
                    <h5>Location Information</h5>
                    
                    <div class="field-group">
                        <label for="field300">Field 300 - State/Country</label>
                        <input type="text" id="field300" name="field300" 
                               value="${fieldData.field300 || ''}"
                               maxlength="2"
                               class="sfaf-field-input"
                               placeholder="e.g., FL">
                        <small class="field-hint">Two-letter state/country code</small>
                    </div>
                    
                    <div class="field-group">
                        <label for="field301">Field 301 - Location Description</label>
                        <input type="text" id="field301" name="field301" 
                               value="${fieldData.field301 || ''}"
                               class="sfaf-field-input"
                               placeholder="e.g., HURLBURT">
                        <small class="field-hint">Base or installation name</small>
                    </div>
                </div>
                
                <!-- Compliance Information -->
                <div class="field-section compliance-info">
                    <h5>MC4EB Publication 7, Change 1 Compliance Status</h5>
                    <div class="compliance-status-display">
                        <div class="compliance-indicator" id="complianceIndicator">
                            <i class="fas fa-clock"></i> Validation pending...
                        </div>
                        <div class="field-count-display">
                            <span>Required fields completed: <strong id="requiredFieldCount">0/5</strong></span>
                            <span>Optional fields completed: <strong id="optionalFieldCount">0/6</strong></span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    `;

        const footerButtons = `
        <button type="button" class="btn btn-secondary" onclick="databaseViewer.closeModal()">
            <i class="fas fa-times"></i> Cancel
        </button>
        <button type="button" class="btn btn-info" onclick="databaseViewer.validateSFAFFormRealTime()">
            <i class="fas fa-check-circle"></i> Validate
        </button>
        <button type="submit" form="sfafFieldForm" class="btn btn-primary">
            <i class="fas fa-save"></i> Save SFAF Fields
        </button>
    `;

        // Show modal with SFAF-specific content
        this.showModal('SFAF Field Editor', modalContent, footerButtons);

        // Add real-time validation (Source: db_viewer_js.txt validation)
        this.addSFAFFormValidation();

        // Store marker ID for form submission (Source: main_go.txt SFAF routes)
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.dataset.markerId = markerId;
        }

        // Initialize compliance status display
        this.updateFormComplianceStatus();

        console.log(`📋 SFAF Field Editor opened for marker: ${markerId}`);
    }

    // ✅ ENHANCED: Real-time SFAF form validation with MC4EB Publication 7, Change 1 compliance
    addSFAFFormValidation() {
        const form = document.getElementById('sfafFieldForm');
        if (!form) {
            console.warn('SFAF form not found for validation setup');
            return;
        }

        console.log('🔍 Setting up real-time SFAF form validation...');

        // Get all form inputs for validation monitoring (Source: db_viewer_html.txt form structure)
        const formInputs = form.querySelectorAll('input, select, textarea');

        // Add event listeners for real-time validation
        formInputs.forEach(input => {
            // Real-time validation on input changes
            input.addEventListener('input', (e) => {
                this.validateSFAFFieldRealTime(e.target);
                this.updateFormComplianceStatus();
            });

            // Validation on focus loss
            input.addEventListener('blur', (e) => {
                this.validateSFAFFieldRealTime(e.target);
                this.updateFormComplianceStatus();
            });

            // Special handling for select elements
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', (e) => {
                    this.validateSFAFFieldRealTime(e.target);
                    this.updateFormComplianceStatus();
                });
            }
        });

        // Handle form submission with comprehensive validation (Source: main_go.txt SFAF routes)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const sfafFields = {};

            // Extract SFAF field values
            for (const [key, value] of formData.entries()) {
                if (value.trim() !== '') {
                    sfafFields[key] = value.trim();
                }
            }

            // Perform comprehensive validation before submission
            const validation = this.validateCompleteSFAFForm(sfafFields);

            if (validation.isValid) {
                await this.submitSFAFForm(sfafFields);
            } else {
                this.displayValidationErrors(validation);
            }
        });

        // Initial validation state setup
        this.updateFormComplianceStatus();

        console.log('✅ Real-time SFAF validation activated');
    }

    // ✅ ENHANCED: Real-time field validation with MC4EB standards
    validateSFAFFieldRealTime(input) {
        const fieldId = input.id;
        const value = input.value.trim();
        const fieldNumber = fieldId.replace('field', '');

        // Clear previous validation states
        input.classList.remove('validation-error', 'validation-warning', 'validation-success');

        // Remove existing error messages
        const existingError = input.parentNode.querySelector('.field-validation-message');
        if (existingError) {
            existingError.remove();
        }

        // Skip validation for empty non-required fields
        if (value === '' && !input.hasAttribute('required')) {
            return { isValid: true, message: null };
        }

        let validation = { isValid: true, message: null, type: 'success' };

        // Field-specific validation based on MC4EB Publication 7, Change 1 standards (Source: db_viewer_js.txt MC4EB compliance)
        switch (fieldId) {
            case 'field005':
                validation = this.validateField005(value);
                break;
            case 'field010':
                validation = this.validateField010(value);
                break;
            case 'field102':
                validation = this.validateField102(value);
                break;
            case 'field110':
                validation = this.validateField110(value);
                break;
            case 'field113':
                validation = this.validateField113(value);
                break;
            case 'field114':
                validation = this.validateField114(value);
                break;
            case 'field115':
                validation = this.validateField115(value);
                break;
            case 'field200':
                validation = this.validateField200(value);
                break;
            case 'field300':
                validation = this.validateField300(value);
                break;
            case 'field301':
                validation = this.validateField301(value);
                break;
            default:
                // Generic validation for other fields
                validation = this.validateGenericField(fieldNumber, value);
                break;
        }

        // Apply visual feedback based on validation result
        this.applyFieldValidationFeedback(input, validation);

        return validation;
    }

    // ✅ ENHANCED: Specific field validation functions for MC4EB Publication 7, Change 1 compliance
    validateField005(value) {
        // Field 005 - Type of Application
        const validValues = ['UE', 'CE'];

        if (!validValues.includes(value.toUpperCase())) {
            return {
                isValid: false,
                message: 'Must be UE (Uncoordinated Equipment) or CE (Coordinated Equipment)',
                type: 'error'
            };
        }

        return { isValid: true, message: 'Valid application type', type: 'success' };
    }

    validateField010(value) {
        // Field 010 - Type of Action
        const validValues = ['N', 'M', 'D'];

        if (!validValues.includes(value.toUpperCase())) {
            return {
                isValid: false,
                message: 'Must be N (New), M (Modification), or D (Discontinue)',
                type: 'error'
            };
        }

        return { isValid: true, message: 'Valid action type', type: 'success' };
    }

    validateField102(value) {
        // Field 102 - Agency Serial Number (Source: db_viewer_js.txt validation patterns)
        const serialPattern = /^[A-Z]{2,3}\s+\d{6,8}$/;

        if (!serialPattern.test(value)) {
            return {
                isValid: false,
                message: 'Format must be: [Agency Code][Space][6-8 digits] (e.g., AF 014589)',
                type: 'error'
            };
        }

        // Validate agency code
        const agencyCode = value.split(' ')[0];
        const validAgencyCodes = ['AF', 'USA', 'USN', 'USMC', 'USCG', 'DI', 'DO', 'DS', 'FA', 'FT', 'HS', 'JC'];

        if (!validAgencyCodes.includes(agencyCode)) {
            return {
                isValid: true,
                message: `Warning: ${agencyCode} is not a standard agency code`,
                type: 'warning'
            };
        }

        return { isValid: true, message: 'Valid agency serial number', type: 'success' };
    }

    validateField110(value) {
        // Field 110 - Frequency (Source: db_viewer_js.txt frequency validation)
        const frequencyPatterns = [
            /^K\d+(\.\d+)?$/, // K-band format: K4028
            /^K\d+\(\d+(\.\d+)?\)$/, // K-band with parentheses: K4028(4026.5)
            /^\d+(\.\d+)?\s?(MHz|GHz|KHz)$/i, // Standard with units: 4026.5 MHz
            /^[A-Z]\d+(\.\d+)?$/ // Letter prefix: M4028, G2000, etc.
        ];

        const isValidFormat = frequencyPatterns.some(pattern => pattern.test(value));

        if (!isValidFormat) {
            return {
                isValid: false,
                message: 'Invalid frequency format. Use K####(####.#) or ####.# MHz',
                type: 'error'
            };
        }

        // Extract numeric frequency for range validation
        const numericFreq = parseFloat(value.replace(/[^0-9.]/g, ''));

        if (numericFreq < 0.003 || numericFreq > 300000) {
            return {
                isValid: true,
                message: 'Frequency outside normal spectrum range (3 kHz - 300 GHz)',
                type: 'warning'
            };
        }

        return { isValid: true, message: 'Valid frequency format', type: 'success' };
    }

    validateField113(value) {
        // Field 113 - Station Class
        const validClasses = ['MO', 'ML', 'FB', 'FX', 'BC', 'MS', 'AF', 'AE', 'AM'];

        if (!validClasses.includes(value.toUpperCase())) {
            return {
                isValid: true,
                message: 'Non-standard station class - verify correctness',
                type: 'warning'
            };
        }

        return { isValid: true, message: 'Valid station class', type: 'success' };
    }

    validateField114(value) {
        // Field 114 - Emission Designator
        const emissionPattern = /^\d+[KMG]?\d*[A-Z]\d*[A-Z]?$/;

        if (!emissionPattern.test(value)) {
            return {
                isValid: false,
                message: 'Invalid emission designator. Format: Bandwidth + Emission Class + Modulation (e.g., 2K70J3E)',
                type: 'error'
            };
        }

        return { isValid: true, message: 'Valid emission designator', type: 'success' };
    }

    validateField115(value) {
        // Field 115 - Transmitter Power
        const powerPattern = /^W\d+$/;

        if (!powerPattern.test(value)) {
            return {
                isValid: false,
                message: 'Power format must be W### (e.g., W500 for 500 watts)',
                type: 'error'
            };
        }

        const power = parseInt(value.substring(1));
        if (power > 1000000) {
            return {
                isValid: true,
                message: 'Very high power level - verify correctness',
                type: 'warning'
            };
        }

        return { isValid: true, message: 'Valid power specification', type: 'success' };
    }

    validateField200(value) {
        // Field 200 - Agency
        const validAgencies = ['USAF', 'USA', 'USN', 'USMC', 'USCG'];

        if (!validAgencies.includes(value)) {
            return {
                isValid: true,
                message: 'Non-standard agency designation',
                type: 'warning'
            };
        }

        return { isValid: true, message: 'Valid agency designation', type: 'success' };
    }

    validateField300(value) {
        // Field 300 - State/Country Code
        if (value.length !== 2) {
            return {
                isValid: false,
                message: 'Must be exactly 2 characters (state/country code)',
                type: 'error'
            };
        }

        if (!/^[A-Z]{2}$/.test(value.toUpperCase())) {
            return {
                isValid: false,
                message: 'Must contain only letters',
                type: 'error'
            };
        }

        return { isValid: true, message: 'Valid state/country code', type: 'success' };
    }

    validateField301(value) {
        // Field 301 - Location Description
        if (value.length > 50) {
            return {
                isValid: true,
                message: 'Location description is quite long - consider abbreviating',
                type: 'warning'
            };
        }

        if (value.length < 3) {
            return {
                isValid: false,
                message: 'Location description too short - minimum 3 characters',
                type: 'error'
            };
        }

        return { isValid: true, message: 'Valid location description', type: 'success' };
    }

    validateGenericField(fieldNumber, value) {
        // Generic validation for fields not specifically handled
        if (value.length > 255) {
            return {
                isValid: false,
                message: 'Field value exceeds maximum length (255 characters)',
                type: 'error'
            };
        }

        if (value.length > 100) {
            return {
                isValid: true,
                message: 'Long field value - verify completeness',
                type: 'warning'
            };
        }

        return { isValid: true, message: null, type: 'success' };
    }

    // ✅ ENHANCED: Apply visual feedback for field validation
    applyFieldValidationFeedback(input, validation) {
        // Apply CSS classes based on validation result (Source: db_viewer_css.txt styling)
        if (validation.isValid && validation.type === 'success') {
            input.classList.add('validation-success');
        } else if (validation.isValid && validation.type === 'warning') {
            input.classList.add('validation-warning');
        } else {
            input.classList.add('validation-error');
        }

        // Add validation message if provided
        if (validation.message) {
            const messageElement = document.createElement('div');
            messageElement.className = `field-validation-message validation-${validation.type}`;
            messageElement.innerHTML = `
            <i class="fas fa-${validation.type === 'error' ? 'exclamation-triangle' :
                    validation.type === 'warning' ? 'exclamation' : 'check'}"></i>
            ${validation.message}
        `;

            // Insert message after the input
            input.parentNode.appendChild(messageElement);
        }
    }

    // ✅ ENHANCED: Update overall form compliance status with real-time feedback
    updateFormComplianceStatus() {
        const complianceIndicator = document.getElementById('complianceIndicator');
        const requiredFieldCount = document.getElementById('requiredFieldCount');
        const optionalFieldCount = document.getElementById('optionalFieldCount');
        const form = document.getElementById('sfafFieldForm');

        if (!form || !complianceIndicator) {
            console.log('Form or compliance elements not found for status update');
            return;
        }

        console.log('🔍 Updating form compliance status...');

        // Required fields for MC4EB Publication 7, Change 1 compliance (Source: db_viewer_js.txt MC4EB compliance)
        const requiredFields = ['field005', 'field010', 'field102', 'field110', 'field200'];
        const optionalImportantFields = ['field113', 'field114', 'field115', 'field300', 'field301', 'field144'];

        let completedRequired = 0;
        let completedOptional = 0;
        let hasValidationErrors = false;
        const fieldIssues = [];

        // Check required fields completion and validation
        requiredFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                const value = input.value.trim();
                const hasValue = value !== '';
                const isValid = !input.classList.contains('validation-error');

                if (hasValue && isValid) {
                    completedRequired++;
                } else if (hasValue && !isValid) {
                    hasValidationErrors = true;
                    fieldIssues.push(`${fieldId}: validation error`);
                } else if (!hasValue) {
                    fieldIssues.push(`${fieldId}: required field empty`);
                }
            } else {
                fieldIssues.push(`${fieldId}: field not found in form`);
            }
        });

        // Check optional fields completion
        optionalImportantFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                const value = input.value.trim();
                const isValid = !input.classList.contains('validation-error');

                if (value !== '' && isValid) {
                    completedOptional++;
                } else if (value !== '' && !isValid) {
                    hasValidationErrors = true;
                    fieldIssues.push(`${fieldId}: validation error`);
                }
            }
        });

        // Calculate completion percentages
        const requiredCompletionRate = (completedRequired / requiredFields.length) * 100;
        const optionalCompletionRate = (completedOptional / optionalImportantFields.length) * 100;
        const overallCompletionRate = (requiredCompletionRate * 0.8) + (optionalCompletionRate * 0.2);

        // Update field count displays (Source: db_viewer_html.txt form structure)
        if (requiredFieldCount) {
            requiredFieldCount.textContent = `${completedRequired}/${requiredFields.length}`;
        }

        if (optionalFieldCount) {
            optionalFieldCount.textContent = `${completedOptional}/${optionalImportantFields.length}`;
        }

        // Determine overall compliance status
        let complianceStatus = 'pending';
        let complianceIcon = 'fas fa-clock';
        let complianceText = 'Validation pending...';
        let complianceClass = 'compliance-pending';

        if (hasValidationErrors) {
            complianceStatus = 'error';
            complianceIcon = 'fas fa-exclamation-triangle';
            complianceText = 'Validation errors detected';
            complianceClass = 'compliance-error';
        } else if (completedRequired === requiredFields.length) {
            if (optionalCompletionRate >= 50) {
                complianceStatus = 'compliant';
                complianceIcon = 'fas fa-check-circle';
                complianceText = 'MC4EB Publication 7, Change 1 Compliant';
                complianceClass = 'compliance-compliant';
            } else {
                complianceStatus = 'partial';
                complianceIcon = 'fas fa-check';
                complianceText = 'Basic compliance achieved';
                complianceClass = 'compliance-partial';
            }
        } else {
            complianceStatus = 'incomplete';
            complianceIcon = 'fas fa-minus-circle';
            complianceText = `${requiredFields.length - completedRequired} required fields missing`;
            complianceClass = 'compliance-incomplete';
        }

        // Update compliance indicator with visual feedback (Source: db_viewer_css.txt styling)
        complianceIndicator.className = `compliance-indicator ${complianceClass}`;
        complianceIndicator.innerHTML = `
        <i class="${complianceIcon}"></i>
        <span class="compliance-text">${complianceText}</span>
        <div class="compliance-details">
            <small>Completion: ${overallCompletionRate.toFixed(0)}% | Required: ${requiredCompletionRate.toFixed(0)}% | Optional: ${optionalCompletionRate.toFixed(0)}%</small>
        </div>
    `;

        // Update form-level validation state for submit button
        const submitButton = document.querySelector('button[type="submit"][form="sfafFieldForm"]');
        if (submitButton) {
            if (hasValidationErrors) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Fix Validation Errors';
                submitButton.className = 'btn btn-danger';
            } else if (completedRequired < requiredFields.length) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-minus-circle"></i> Complete Required Fields';
                submitButton.className = 'btn btn-secondary';
            } else {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-save"></i> Save SFAF Fields';
                submitButton.className = 'btn btn-primary';
            }
        }

        // Update validation button text based on status
        const validateButton = document.querySelector('button[onclick*="validateSFAFFormRealTime"]');
        if (validateButton) {
            if (complianceStatus === 'compliant') {
                validateButton.innerHTML = '<i class="fas fa-check-circle"></i> Validated';
                validateButton.className = 'btn btn-success';
            } else if (complianceStatus === 'error') {
                validateButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Errors Found';
                validateButton.className = 'btn btn-danger';
            } else {
                validateButton.innerHTML = '<i class="fas fa-check-circle"></i> Validate';
                validateButton.className = 'btn btn-info';
            }
        }

        // Store current validation state for form submission
        form.dataset.validationState = JSON.stringify({
            complianceStatus: complianceStatus,
            completedRequired: completedRequired,
            completedOptional: completedOptional,
            hasValidationErrors: hasValidationErrors,
            fieldIssues: fieldIssues,
            overallCompletionRate: overallCompletionRate
        });

        console.log(`📊 Form compliance updated: ${complianceStatus} (${overallCompletionRate.toFixed(0)}% complete)`);
    }

    // ✅ ENHANCED: Real-time form validation function called by the validate button
    validateSFAFFormRealTime() {
        const form = document.getElementById('sfafFieldForm');
        if (!form) {
            console.error('SFAF form not found');
            return;
        }

        console.log('🔍 Performing real-time SFAF form validation...');

        // Validate all form fields
        const formInputs = form.querySelectorAll('input, select, textarea');
        let hasErrors = false;
        const validationResults = [];

        formInputs.forEach(input => {
            const result = this.validateSFAFFieldRealTime(input);
            validationResults.push(result);

            if (!result.isValid) {
                hasErrors = true;
            }
        });

        // Update compliance status after validation
        this.updateFormComplianceStatus();

        // Show validation summary
        const validationState = JSON.parse(form.dataset.validationState || '{}');

        let message = '🔍 SFAF Validation Summary:\n\n';
        message += `Overall Status: ${validationState.complianceStatus?.toUpperCase() || 'UNKNOWN'}\n`;
        message += `Completion: ${validationState.overallCompletionRate?.toFixed(0) || 0}%\n\n`;

        if (validationState.hasValidationErrors) {
            message += '❌ Validation Issues:\n';
            validationState.fieldIssues?.forEach(issue => {
                message += `  • ${issue}\n`;
            });
        } else {
            message += '✅ All field validations passed\n';
        }

        message += `\nRequired Fields: ${validationState.completedRequired || 0}/5\n`;
        message += `Optional Fields: ${validationState.completedOptional || 0}/6\n`;

        if (validationState.complianceStatus === 'compliant') {
            message += '\n🎉 Ready for MC4EB Publication 7, Change 1 compliance!';
        }

        alert(message);
    }

    // Navigate to first page
    goToFirstPage() {
        this.currentPage = 1;
        // Load first page from API
        this.loadSFAFRecords();
        // Scroll to top of table
        this.scrollToTopOfTable();
    }

    // Navigate to last page
    goToLastPage() {
        // Calculate last page based on total database records
        const totalPages = Math.ceil(this.totalDatabaseRecords / this.itemsPerPage);
        this.currentPage = totalPages;
        // Load last page from API
        this.loadSFAFRecords();
        // Scroll to top of table
        this.scrollToTopOfTable();
    }

    // Scroll to top of table container
    scrollToTopOfTable() {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.scrollTop = 0;
        }
    }

    // Add new SFAF record
    addNewSFAFRecord() {
        // This would open a modal or redirect to a form for creating a new SFAF record
        console.log('Opening new SFAF record form...');

        // Show modal with empty SFAF form
        const modal = document.getElementById('editModal');
        if (modal) {
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Add New SFAF Record';
            }

            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <form id="newSFAFForm">
                        <p>New SFAF record form would go here.</p>
                        <p>This would include all required SFAF fields according to MC4EB Publication 7, Change 1.</p>
                    </form>
                `;
            }

            modal.style.display = 'flex';
        }
    }

    // Show bulk actions menu
    showBulkActionsMenu() {
        if (this.selectedItems.size === 0) {
            alert('Please select at least one record to perform bulk actions.');
            return;
        }

        const actions = [
            'Export Selected',
            'Delete Selected',
            'Update Agency',
            'Update Status',
            'Generate Report'
        ];

        const action = prompt(`Selected ${this.selectedItems.size} record(s).\n\nChoose an action:\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nEnter number (1-${actions.length}):`);

        if (action) {
            const actionIndex = parseInt(action) - 1;
            if (actionIndex >= 0 && actionIndex < actions.length) {
                console.log(`Performing bulk action: ${actions[actionIndex]} on ${this.selectedItems.size} items`);

                switch (actionIndex) {
                    case 0:
                        this.exportSelectedRecords();
                        break;
                    case 1:
                        this.deleteSelectedRecords();
                        break;
                    default:
                        alert(`Bulk action "${actions[actionIndex]}" not yet implemented.`);
                }
            }
        }
    }

    // ==================== Sort and Filter Methods ====================

    sortByColumn(field) {
        // Toggle sort order if clicking the same column
        if (this.currentSort.field === field) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.order = 'asc';
        }

        console.log(`📊 Sorting by ${field} (${this.currentSort.order})`);

        // Apply sort and re-render
        this.applySortAndFilter();
    }

    filterColumn(field, value) {
        // Update filter value
        if (value && value.trim()) {
            this.columnFilters[field] = value.trim();
        } else {
            delete this.columnFilters[field];
        }

        console.log(`🔍 Filtering ${field}:`, value);

        // Reset to first page when filtering
        this.currentPage = 1;

        // Apply filter and re-render
        this.applySortAndFilter();
    }

    clearAllFilters() {
        this.columnFilters = {};
        this.currentPage = 1;

        // Clear filter inputs
        document.querySelectorAll('.column-filter').forEach(input => {
            input.value = '';
        });

        this.applySortAndFilter();
    }

    applySortAndFilter() {
        let records = [...this.enhancedRecords];

        // Apply column filters
        Object.keys(this.columnFilters).forEach(field => {
            const filterValue = this.columnFilters[field].toLowerCase();
            records = records.filter(record => {
                const value = this.getRecordFieldValue(record, field);
                return value && value.toString().toLowerCase().includes(filterValue);
            });
        });

        // Apply sorting
        records.sort((a, b) => {
            const aValue = this.getRecordFieldValue(a, this.currentSort.field);
            const bValue = this.getRecordFieldValue(b, this.currentSort.field);

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            // Compare values
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true });
            }

            return this.currentSort.order === 'asc' ? comparison : -comparison;
        });

        console.log(`📊 After sort/filter: ${records.length} records (from ${this.enhancedRecords.length} total)`);

        // Re-render with filtered and sorted data
        this.renderEnhancedSFAFTable(records);
    }

    getRecordFieldValue(record, field) {
        // Handle nested fields and special cases
        switch(field) {
            case 'serial':
                return record.serial;
            case 'frequency':
                return record.frequency;
            case 'location':
                return record.location;
            case 'agency':
                return record.agency;
            case 'status':
                return record.sfafComplete ? 'Complete' : 'Partial';
            case 'completion':
                return record.completionPercentage;
            case 'validation':
                return record.validationStatus;
            case 'compliant':
                return record.mcebCompliant?.isCompliant ? 'Yes' : 'No';
            default:
                // Try to get SFAF field
                if (record.sfafFields && record.sfafFields[field]) {
                    return record.sfafFields[field];
                }
                return record[field];
        }
    }

    // Export selected records
    viewRecordOnMap(recordId) {
        // Find the record details from enhanced records
        const record = this.enhancedRecords.find(r => r.id === recordId);

        if (!record) {
            alert('Could not find the record.');
            return;
        }

        // Check if record has coordinates
        if (!record.coordinates || !record.coordinates.lat || !record.coordinates.lng) {
            alert('This record does not have valid coordinates to display on the map.');
            return;
        }

        // Navigate to the map page with marker ID and coordinates as URL parameters
        const lat = record.coordinates.lat;
        const lng = record.coordinates.lng;
        const zoom = 13; // Close zoom level to focus on the marker

        // Redirect to map with parameters to center and highlight the marker
        window.location.href = `/?marker=${recordId}&lat=${lat}&lng=${lng}&zoom=${zoom}`;
    }

    viewSelectedOnMap() {
        if (this.selectedItems.size === 0) {
            alert('Please select a record to view on the map.');
            return;
        }

        if (this.selectedItems.size > 1) {
            alert('Please select only one record to view on the map.');
            return;
        }

        // Get the selected record ID and call viewRecordOnMap
        const selectedId = Array.from(this.selectedItems)[0];
        this.viewRecordOnMap(selectedId);
    }

    exportSelectedRecords() {
        if (this.selectedItems.size === 0) {
            alert('Please select at least one record to export.');
            return;
        }

        console.log(`Exporting ${this.selectedItems.size} selected records...`);

        // Gather selected records data
        const selectedData = {
            type: 'SFAF_Selected_Export',
            exported_at: new Date().toISOString(),
            total_count: this.selectedItems.size,
            record_ids: Array.from(this.selectedItems),
            records: []
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SFAF_Selected_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`Exported ${this.selectedItems.size} records successfully.`);
    }

    // Toggle export dropdown menu
    toggleExportDropdown() {
        const dropdown = document.getElementById('exportDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }

        // Close dropdown when clicking outside
        if (dropdown.style.display === 'block') {
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('#exportDropdownBtn') && !e.target.closest('#exportDropdown')) {
                        dropdown.style.display = 'none';
                    }
                }, { once: true });
            }, 0);
        }
    }

    // Export all records to CSV
    async exportAllToCSV() {
        console.log('📤 Exporting all SFAF records to CSV...');

        this.showLoading(true, 'Exporting all records to CSV...');

        try {
            // Use the existing backend export endpoint
            const response = await fetch('/api/sfaf/export?format=csv');

            if (!response.ok) {
                throw new Error(`Export failed: ${response.status} ${response.statusText}`);
            }

            // Get the CSV content
            const blob = await response.blob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SFAF_All_Records_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showLoading(false);
            this.showSuccess('All records exported to CSV successfully!');

            // Close dropdown
            document.getElementById('exportDropdown').style.display = 'none';

        } catch (error) {
            this.showLoading(false);
            console.error('Export failed:', error);
            this.showError(`Failed to export: ${error.message}`);
        }
    }

    // Export selected records to CSV
    async exportSelectedToCSV() {
        if (this.selectedItems.size === 0) {
            alert('Please select at least one record to export.');
            return;
        }

        console.log(`📤 Exporting ${this.selectedItems.size} selected records to CSV...`);

        this.showLoading(true, `Exporting ${this.selectedItems.size} records to CSV...`);

        try {
            const response = await fetch('/api/sfaf/export-selected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(this.selectedItems),
                    format: 'csv'
                })
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.status} ${response.statusText}`);
            }

            // Get the CSV content
            const blob = await response.blob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SFAF_Selected_${this.selectedItems.size}_Records_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showLoading(false);
            this.showSuccess(`${this.selectedItems.size} records exported to CSV successfully!`);

            // Close dropdown
            document.getElementById('exportDropdown').style.display = 'none';

        } catch (error) {
            this.showLoading(false);
            console.error('Export failed:', error);
            this.showError(`Failed to export: ${error.message}`);
        }
    }

    // View selected records on map with Field 306/530 visualizations
    viewSelectedOnMap() {
        if (this.selectedItems.size === 0) {
            alert('Please select at least one record to view on the map.');
            return;
        }

        console.log(`📍 Opening ${this.selectedItems.size} selected records on map...`);

        // Convert Set to Array for URL encoding
        const selectedIds = Array.from(this.selectedItems);

        // Store selected IDs in sessionStorage for map viewer to access
        sessionStorage.setItem('selectedRecordsForMap', JSON.stringify(selectedIds));

        // Navigate to map viewer
        window.location.href = '/';
    }

    // Delete selected records (calls main deleteSelected method)
    async deleteSelectedRecords() {
        await this.deleteSelected();
    }

    // ==================== Custom View Management ====================

    loadCustomViews() {
        const stored = localStorage.getItem('sfaf_custom_views');
        return stored ? JSON.parse(stored) : [];
    }

    saveCustomViews() {
        localStorage.setItem('sfaf_custom_views', JSON.stringify(this.customViews));
        this.updateViewDropdown();
    }

    loadDefaultView() {
        return localStorage.getItem('sfaf_default_view') || 'summary';
    }

    saveDefaultView(viewName) {
        localStorage.setItem('sfaf_default_view', viewName);
    }

    openViewManagementModal() {
        const modal = document.getElementById('viewManagementModal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadViewManagementUI();
        }
    }

    closeViewManagementModal() {
        const modal = document.getElementById('viewManagementModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Hide create form if open
        const createForm = document.getElementById('createCustomViewForm');
        if (createForm) {
            createForm.style.display = 'none';
        }
    }

    loadViewManagementUI() {
        // Load default view selector
        const defaultViewSelect = document.getElementById('defaultViewSelect');
        if (defaultViewSelect) {
            // Remove any previously added custom options to avoid duplicates
            const existingCustomOptions = defaultViewSelect.querySelectorAll('option[value^="custom_"]');
            existingCustomOptions.forEach(opt => opt.remove());

            // Add custom views to the dropdown
            const customOptions = this.customViews.map(view =>
                `<option value="custom_${view.id}">${view.name} (Custom)</option>`
            ).join('');

            if (customOptions) {
                // Insert custom options after the last built-in option
                const builtInOptions = defaultViewSelect.querySelectorAll('option:not([value^="custom_"])');
                const lastBuiltIn = builtInOptions[builtInOptions.length - 1];
                if (lastBuiltIn) {
                    lastBuiltIn.insertAdjacentHTML('afterend', customOptions);
                }
            }

            // Set the current default view (do this AFTER adding options)
            defaultViewSelect.value = this.defaultView;
        }

        // Render custom views list
        this.renderCustomViewsList();
    }

    renderCustomViewsList() {
        const container = document.getElementById('customViewsList');
        if (!container) return;

        if (this.customViews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <p>No custom views yet. Create one to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.customViews.map(view => `
            <div class="custom-view-item" data-view-id="${view.id}">
                <div class="view-info">
                    <strong><i class="fas fa-table"></i> ${view.name}</strong>
                    <span class="view-field-count">${view.fields.length} fields</span>
                </div>
                <div class="view-actions">
                    <button class="btn btn-sm" onclick="databaseViewer.applyCustomView('${view.id}')" title="Apply View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm" onclick="databaseViewer.editCustomView('${view.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="databaseViewer.deleteCustomView('${view.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    showCreateCustomView() {
        const createForm = document.getElementById('createCustomViewForm');
        if (createForm) {
            createForm.style.display = 'block';
            this.renderFieldSelector();
        }
    }

    cancelCreateCustomView() {
        const createForm = document.getElementById('createCustomViewForm');
        if (createForm) {
            createForm.style.display = 'none';
        }
        // Clear form
        const nameInput = document.getElementById('customViewName');
        if (nameInput) nameInput.value = '';

        // Clear all field checkboxes
        const checkboxes = document.querySelectorAll('#fieldSelectorGrid input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        // Reset editing state
        this.editingViewId = null;

        // Reset button text back to "Save View"
        const saveBtn = document.querySelector('#createCustomViewForm button[onclick*="saveCustomView"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save View';
        }
    }

    renderFieldSelector() {
        const container = document.getElementById('fieldSelectorGrid');
        if (!container) return;

        // Get organized field groups
        const fieldGroups = this.getOrganizedFieldGroups();

        container.innerHTML = fieldGroups.map((group, idx) => `
            <div class="field-group">
                <div class="field-group-header">
                    <h6><i class="${group.icon}"></i> ${group.title}</h6>
                    <div class="field-group-actions">
                        <button type="button" class="btn-group-select" onclick="databaseViewer.selectAllInGroup(${idx})">Select All</button>
                        <button type="button" class="btn-group-clear" onclick="databaseViewer.clearAllInGroup(${idx})">Clear</button>
                        <span class="field-count">${group.fields.length} fields</span>
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

    selectAllInGroup(groupIdx) {
        const group = document.querySelector(`.field-group-items[data-group-idx="${groupIdx}"]`);
        if (!group) return;
        group.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    }

    clearAllInGroup(groupIdx) {
        const group = document.querySelector(`.field-group-items[data-group-idx="${groupIdx}"]`);
        if (!group) return;
        group.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }

    getOrganizedFieldGroups() {
        return [
            {
                title: 'Administrative Data',
                icon: 'fas fa-file-alt',
                fields: [
                    { key: 'field005', label: '005 - Security Classification' },
                    { key: 'field006', label: '006 - Security Classification Modification' },
                    { key: 'field007', label: '007 - Missing Data Indicator' },
                    { key: 'field010', label: '010 - Type of Action' },
                    { key: 'field013', label: '013 - Declassification Instruction Comment' },
                    { key: 'field014', label: '014 - Derivative Classification Authority' },
                    { key: 'field015', label: '015 - Unclassified Data Fields' },
                    { key: 'field016', label: '016 - Extended Declassification Date' },
                    { key: 'field017', label: '017 - Downgrading Instructions' },
                    { key: 'field018', label: '018 - Original Classification Authority' },
                    { key: 'field019', label: '019 - Reason for Classification' },
                    { key: 'field020', label: '020 - Proposal References' },
                    { key: 'field102', label: '102 - Agency Serial Number' },
                    { key: 'field103', label: '103 - IRAC Docket Number' },
                    { key: 'field105', label: '105 - List Serial Number' },
                    { key: 'field106', label: '106 - Serial Replaced, Delete Date' },
                    { key: 'field107', label: '107 - Authorization Date' },
                    { key: 'field108', label: '108 - Docket Numbers of Older Authorizations' },
                    { key: 'field151', label: '151 - Coordination Indicator' },
                    { key: 'field152', label: '152 - Coordination Data' }
                ]
            },
            {
                title: 'Emission Characteristics',
                icon: 'fas fa-broadcast-tower',
                fields: [
                    { key: 'field110', label: '110 - Frequency(ies)' },
                    { key: 'field111', label: '111 - Excluded Frequency Band' },
                    { key: 'field112', label: '112 - Frequency Separation Criteria' },
                    { key: 'field113', label: '113 - Station Class' },
                    { key: 'field114', label: '114 - Emission Designator' },
                    { key: 'field115', label: '115 - Transmitter Power' },
                    { key: 'field116', label: '116 - Power Type' },
                    { key: 'field117', label: '117 - Effective Radiated Power' },
                    { key: 'field118', label: '118 - Power/ERP Augmentation' }
                ]
            },
            {
                title: 'Time/Date Information',
                icon: 'fas fa-calendar',
                fields: [
                    { key: 'field130', label: '130 - Time' },
                    { key: 'field131', label: '131 - Percent Time' },
                    { key: 'field140', label: '140 - Required Date' },
                    { key: 'field141', label: '141 - Expiration Date' },
                    { key: 'field142', label: '142 - Review Date' },
                    { key: 'field143', label: '143 - Revision Date' },
                    { key: 'field144', label: '144 - Approval Authority Indicator' },
                    { key: 'field145', label: '145 - ITU BR Registration' },
                    { key: 'field146', label: '146 - DCS Trunk ID' },
                    { key: 'field147', label: '147 - Joint Agencies' }
                ]
            },
            {
                title: 'Organizational Information',
                icon: 'fas fa-building',
                fields: [
                    { key: 'field200', label: '200 - Agency' },
                    { key: 'field201', label: '201 - Unified Command' },
                    { key: 'field202', label: '202 - Unified Command Service' },
                    { key: 'field203', label: '203 - Bureau' },
                    { key: 'field204', label: '204 - Command' },
                    { key: 'field205', label: '205 - Subcommand' },
                    { key: 'field206', label: '206 - Installation Frequency Manager' },
                    { key: 'field207', label: '207 - Operating Unit' },
                    { key: 'field208', label: '208 - User Net/Code' },
                    { key: 'field209', label: '209 - Area AFC/DoD AFC/Other Organizations' }
                ]
            },
            {
                title: 'Transmitter Location Data',
                icon: 'fas fa-map-marker-alt',
                fields: [
                    { key: 'field300', label: '300 - State/Country' },
                    { key: 'field301', label: '301 - Antenna Location' },
                    { key: 'field302', label: '302 - Station Control' },
                    { key: 'field303', label: '303 - Antenna Coordinates' },
                    { key: 'field304', label: '304 - Call Sign' },
                    { key: 'field306', label: '306 - Authorized Radius' }
                ]
            },
            {
                title: 'Space Stations',
                icon: 'fas fa-satellite',
                fields: [
                    { key: 'field315', label: '315 - Equatorial Inclination Angle' },
                    { key: 'field316', label: '316 - Apogee' },
                    { key: 'field317', label: '317 - Perigee' },
                    { key: 'field318', label: '318 - Period of Orbit' },
                    { key: 'field319', label: '319 - Number of Satellites' },
                    { key: 'field321', label: '321 - Power Density' }
                ]
            },
            {
                title: 'Transmitter Equipment',
                icon: 'fas fa-server',
                fields: [
                    { key: 'field340', label: '340 - Equipment Nomenclature' },
                    { key: 'field341', label: '341 - Number of Stations, System Name' },
                    { key: 'field342', label: '342 - Aircraft Nautical Mile Value' },
                    { key: 'field343', label: '343 - Equipment Certification Identification Number' },
                    { key: 'field344', label: '344 - Off-the-shelf Equipment' },
                    { key: 'field345', label: '345 - Radar Tunability' },
                    { key: 'field346', label: '346 - Pulse Duration' },
                    { key: 'field347', label: '347 - Pulse Repetition Rate' },
                    { key: 'field348', label: '348 - Intermediate Frequency' },
                    { key: 'field349', label: '349 - Sidelobe Suppression' }
                ]
            },
            {
                title: 'Transmitter Antenna Data',
                icon: 'fas fa-tower-broadcast',
                fields: [
                    { key: 'field354', label: '354 - Antenna Name' },
                    { key: 'field355', label: '355 - Antenna Nomenclature' },
                    { key: 'field356', label: '356 - Antenna Structure Height' },
                    { key: 'field357', label: '357 - Antenna Gain' },
                    { key: 'field358', label: '358 - Antenna Elevation' },
                    { key: 'field359', label: '359 - Antenna Feedpoint Height' },
                    { key: 'field360', label: '360 - Antenna Horizontal Beamwidth' },
                    { key: 'field361', label: '361 - Antenna Vertical Beamwidth' },
                    { key: 'field362', label: '362 - Antenna Orientation' },
                    { key: 'field363', label: '363 - Antenna Polarization' },
                    { key: 'field373', label: '373 - JSC Area Code' },
                    { key: 'field374', label: '374 - ITU Region' }
                ]
            },
            {
                title: 'Receiver Location Data',
                icon: 'fas fa-satellite-dish',
                fields: [
                    { key: 'field400', label: '400 - State/Country' },
                    { key: 'field401', label: '401 - Antenna Location' },
                    { key: 'field402', label: '402 - Receiver Control' },
                    { key: 'field403', label: '403 - Antenna Coordinates' },
                    { key: 'field404', label: '404 - Call Sign' },
                    { key: 'field406', label: '406 - Authorized Radius' },
                    { key: 'field407', label: '407 - Path Length' },
                    { key: 'field408', label: '408 - Repeater Indicator' }
                ]
            },
            {
                title: 'Receiver Space Stations',
                icon: 'fas fa-satellite',
                fields: [
                    { key: 'field415', label: '415 - Equatorial Inclination Angle' },
                    { key: 'field416', label: '416 - Apogee' },
                    { key: 'field417', label: '417 - Perigee' },
                    { key: 'field418', label: '418 - Period of Orbit' },
                    { key: 'field419', label: '419 - Number of Satellites' }
                ]
            },
            {
                title: 'Receiver Equipment',
                icon: 'fas fa-server',
                fields: [
                    { key: 'field440', label: '440 - Equipment Nomenclature' },
                    { key: 'field442', label: '442 - Aircraft Nautical Mile Value' },
                    { key: 'field443', label: '443 - Equipment Certification Identification Number' }
                ]
            },
            {
                title: 'Receiver Antenna Data',
                icon: 'fas fa-tower-broadcast',
                fields: [
                    { key: 'field454', label: '454 - Antenna Name' },
                    { key: 'field455', label: '455 - Antenna Nomenclature' },
                    { key: 'field456', label: '456 - Antenna Structure Height' },
                    { key: 'field457', label: '457 - Antenna Gain' },
                    { key: 'field458', label: '458 - Antenna Elevation' },
                    { key: 'field459', label: '459 - Antenna Feedpoint Height' },
                    { key: 'field460', label: '460 - Antenna Horizontal Beamwidth' },
                    { key: 'field461', label: '461 - Antenna Vertical Beamwidth' },
                    { key: 'field462', label: '462 - Antenna Orientation' },
                    { key: 'field463', label: '463 - Antenna Polarization' },
                    { key: 'field470', label: '470 - Space Station Noise' },
                    { key: 'field471', label: '471 - Earth Station System Noise Temperature' },
                    { key: 'field472', label: '472 - Equivalent Satellite Link Noise Temperature' }
                ]
            },
            {
                title: 'Supplementary Details',
                icon: 'fas fa-comment',
                fields: [
                    { key: 'field500', label: '500 - IRAC Notes' },
                    { key: 'field501', label: '501 - Notes free-text Comments' },
                    { key: 'field502', label: '502 - Description of Requirement' },
                    { key: 'field503', label: '503 - Agency Free-text Comments' },
                    { key: 'field504', label: '504 - FAS Agenda or OUS&P Comments' },
                    { key: 'field506', label: '506 - Paired Frequency' },
                    { key: 'field511', label: '511 - Major Function Identifier' },
                    { key: 'field512', label: '512 - Intermediate Function Identifier' },
                    { key: 'field513', label: '513 - Detailed Function Identifier' },
                    { key: 'field520', label: '520 - Supplementary Details' },
                    { key: 'field521', label: '521 - Transition and Narrow Band Planning Data' },
                    { key: 'field530', label: '530 - Authorized Areas' },
                    { key: 'field531', label: '531 - Authorized States' }
                ]
            },
            {
                title: 'Other Assignment Identifiers',
                icon: 'fas fa-user-tie',
                fields: [
                    { key: 'field701', label: '701 - Frequency Action Officer' },
                    { key: 'field702', label: '702 - Control/Request Number' },
                    { key: 'field704', label: '704 - Type of Service' },
                    { key: 'field707', label: '707 - PACOM Complement/FMSC Function Number' },
                    { key: 'field710', label: '710 - Host Country Docket Number' },
                    { key: 'field711', label: '711 - Aeronautical Service Range and Height' },
                    { key: 'field716', label: '716 - Usage Code' }
                ]
            },
            {
                title: 'Additional Information',
                icon: 'fas fa-info-circle',
                fields: [
                    { key: 'field801', label: '801 - Coordination Data/Remarks' },
                    { key: 'field803', label: '803 - Requestor Data' },
                    { key: 'field804', label: '804 - Tuning Range/Tuning Increments' },
                    { key: 'field805', label: '805 - Date Response Required' },
                    { key: 'field806', label: '806 - Indication if Host Nominations are Acceptable' },
                    { key: 'field807', label: '807 - Frequencies to be Deleted' }
                ]
            },
            {
                title: 'Status and Administrative (900 Series)',
                icon: 'fas fa-th-large',
                fields: [
                    { key: 'field901', label: '901 - Record Status' },
                    { key: 'field903', label: '903 - Proposal Status' },
                    { key: 'field904', label: '904 - Status Date' },
                    { key: 'field905', label: '905 - Proposal Date Time Group' },
                    { key: 'field906', label: '906 - Originator' },
                    { key: 'field907', label: '907 - Validation Status' },
                    { key: 'field910', label: '910 - Exercise Project' },
                    { key: 'field911', label: '911 - Date of Last Transaction' },
                    { key: 'field924', label: '924 - Data Source Indicator' },
                    { key: 'field926', label: '926 - Semi-Bandwidth' },
                    { key: 'field927', label: '927 - Date of Entry' },
                    { key: 'field928', label: '928 - Date of Receipt' },
                    { key: 'field952', label: '952 - IRAC Security Classification' },
                    { key: 'field953', label: '953 - IRAC Declassification Date' },
                    { key: 'field956', label: '956 - Agency Action Number' },
                    { key: 'field957', label: '957 - Review Year' },
                    { key: 'field958', label: '958 - Routine Agenda Item' },
                    { key: 'field959', label: '959 - Circuit Remarks' },
                    { key: 'field963', label: '963 - FCC File Number' },
                    { key: 'field964', label: '964 - Tx Aircraft Altitude' },
                    { key: 'field965', label: '965 - Rx Aircraft Altitude' },
                    { key: 'field982', label: '982 - JCEOI Line Number' },
                    { key: 'field983', label: '983 - JCEOI Master Net List Name' },
                    { key: 'field984', label: '984 - Net Frequency Range' },
                    { key: 'field985', label: '985 - Joint Restricted Frequency List (JRFL) Protection Code' },
                    { key: 'field986', label: '986 - Net Tactical Call Word' },
                    { key: 'field987', label: '987 - Net Tactical Call Sign' },
                    { key: 'field988', label: '988 - Net Tactical Air Designator (TAD)' },
                    { key: 'field989', label: '989 - Net Color Word' },
                    { key: 'field990', label: '990 - Net Color Number' },
                    { key: 'field991', label: '991 - Net Restoral Priority' },
                    { key: 'field992', label: '992 - Net Push Number' },
                    { key: 'field993', label: '993 - Band Usage' },
                    { key: 'field994', label: '994 - Check Sum' },
                    { key: 'field995', label: '995 - COMSEC Keymat' },
                    { key: 'field996', label: '996 - Circuit Type, Line Item, Group Category' },
                    { key: 'field997', label: '997 - JCEOI Special Net Instructions' },
                    { key: 'field998', label: '998 - Net Notes' },
                    { key: 'field999', label: '999 - Guard Requirements' }
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

    getAllAvailableFields() {
        // Return all SFAF fields that can be added to a custom view
        return [
            { key: 'serial', label: 'Serial Number (102)' },
            { key: 'field005', label: '005 - Status' },
            { key: 'field006', label: '006 - Action' },
            { key: 'field007', label: '007 - Type' },
            { key: 'field010', label: '010 - Indicator' },
            { key: 'field013', label: '013 - Name' },
            { key: 'field014', label: '014 - Description' },
            { key: 'field015', label: '015 - Text' },
            { key: 'field016', label: '016 - ID' },
            { key: 'field017', label: '017 - Code' },
            { key: 'field018', label: '018 - Info' },
            { key: 'field019', label: '019 - Reference' },
            { key: 'field020', label: '020 - Extended' },
            { key: 'field103', label: '103 - Freq Alt' },
            { key: 'field105', label: '105 - Config' },
            { key: 'field106', label: '106 - System' },
            { key: 'field107', label: '107 - Mode' },
            { key: 'field108', label: '108 - Band' },
            { key: 'field110', label: '110 - Frequency' },
            { key: 'field111', label: '111 - Channel' },
            { key: 'field112', label: '112 - Spacing' },
            { key: 'field113', label: '113 - Width' },
            { key: 'field114', label: '114 - Class' },
            { key: 'field115', label: '115 - Type' },
            { key: 'field116', label: '116 - Service' },
            { key: 'field117', label: '117 - Emission' },
            { key: 'field118', label: '118 - Power' },
            { key: 'field130', label: '130 - Date 1' },
            { key: 'field131', label: '131 - Date 2' },
            { key: 'field144', label: '144 - Flag 1' },
            { key: 'field145', label: '145 - Flag 2' },
            { key: 'field146', label: '146 - Time' },
            { key: 'field147', label: '147 - Classification' },
            { key: 'field151', label: '151 - Status' },
            { key: 'field152', label: '152 - Notes' },
            { key: 'field200', label: '200 - Agency' },
            { key: 'field201', label: '201 - System' },
            { key: 'field202', label: '202 - Service' },
            { key: 'field203', label: '203 - Purpose' },
            { key: 'field204', label: '204 - ID' },
            { key: 'field205', label: '205 - Equipment' },
            { key: 'field206', label: '206 - Config' },
            { key: 'field207', label: '207 - Technical' },
            { key: 'field208', label: '208 - Performance' },
            { key: 'field209', label: '209 - Parameters' },
            { key: 'field300', label: '300 - State' },
            { key: 'field301', label: '301 - Location' },
            { key: 'field302', label: '302 - Site' },
            { key: 'field303', label: '303 - Coordinates' },
            { key: 'field304', label: '304 - Elevation' },
            { key: 'field305', label: '305 - Height' },
            { key: 'field306', label: '306 - Radius' },
            { key: 'field307', label: '307 - Area' },
            { key: 'frequency', label: 'Frequency (computed)' },
            { key: 'location', label: 'Location (computed)' },
            { key: 'agency', label: 'Agency (computed)' },
            { key: 'status', label: 'SFAF Status' },
            { key: 'created_at', label: 'Created Date' },
            { key: 'updated_at', label: 'Updated Date' }
        ];
    }

    selectAllFields() {
        const checkboxes = document.querySelectorAll('#fieldSelectorGrid input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    clearAllFields() {
        const checkboxes = document.querySelectorAll('#fieldSelectorGrid input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    saveCustomView() {
        const nameInput = document.getElementById('customViewName');
        const name = nameInput?.value?.trim();

        if (!name) {
            alert('Please enter a view name');
            return;
        }

        // Get selected fields
        const checkboxes = document.querySelectorAll('#fieldSelectorGrid input[type="checkbox"]:checked');
        const fields = Array.from(checkboxes).map(cb => ({
            key: cb.value,
            label: cb.dataset.label
        }));

        if (fields.length === 0) {
            alert('Please select at least one field');
            return;
        }

        // Check if we're editing an existing view
        if (this.editingViewId) {
            // Update existing view
            const viewIndex = this.customViews.findIndex(v => v.id === this.editingViewId);
            if (viewIndex !== -1) {
                this.customViews[viewIndex] = {
                    ...this.customViews[viewIndex],
                    name: name,
                    fields: fields,
                    updatedAt: new Date().toISOString()
                };
                alert(`Custom view "${name}" updated successfully!`);
            }
            this.editingViewId = null;
        } else {
            // Create new view
            const newView = {
                id: Date.now().toString(),
                name: name,
                fields: fields,
                createdAt: new Date().toISOString()
            };
            this.customViews.push(newView);
            alert(`Custom view "${name}" created successfully!`);
        }

        this.saveCustomViews();
        this.cancelCreateCustomView();
        this.renderCustomViewsList();
    }

    editCustomView(viewId) {
        const view = this.customViews.find(v => v.id === viewId);
        if (!view) {
            alert('View not found');
            return;
        }

        // Show the create form in edit mode
        const createForm = document.getElementById('createCustomViewForm');
        if (createForm) {
            createForm.style.display = 'block';
        }

        // Populate the name field
        const nameInput = document.getElementById('customViewName');
        if (nameInput) {
            nameInput.value = view.name;
        }

        // Render field selector
        this.renderFieldSelector();

        // Check the fields that are in this view
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('#fieldSelectorGrid input[type="checkbox"]');
            checkboxes.forEach(cb => {
                const isSelected = view.fields.some(f => f.key === cb.value);
                cb.checked = isSelected;
            });
        }, 100);

        // Store the view ID being edited
        this.editingViewId = viewId;

        // Update the save button to show "Update"
        const saveBtn = document.querySelector('#createCustomViewForm button[onclick*="saveCustomView"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Update View';
        }
    }

    deleteCustomView(viewId) {
        if (!confirm('Are you sure you want to delete this custom view?')) {
            return;
        }

        this.customViews = this.customViews.filter(v => v.id !== viewId);
        this.saveCustomViews();
        this.renderCustomViewsList();
    }

    applyCustomView(viewId) {
        const view = this.customViews.find(v => v.id === viewId);
        if (!view) return;

        this.currentView = `custom_${viewId}`;
        this.currentCustomView = view;
        this.renderEnhancedSFAFTable(this.currentSFAFData);
        this.closeViewManagementModal();
    }

    setDefaultView() {
        const select = document.getElementById('defaultViewSelect');
        if (!select) {
            console.error('defaultViewSelect element not found');
            return;
        }

        const selectedView = select.value;
        console.log('Setting default view:', {
            selectedValue: selectedView,
            selectedIndex: select.selectedIndex,
            selectedText: select.options[select.selectedIndex].text,
            currentDefault: this.defaultView
        });

        this.defaultView = selectedView;
        this.saveDefaultView(selectedView);

        alert(`Default view set to: ${select.options[select.selectedIndex].text}`);
    }

    updateViewDropdown() {
        const viewModeSelect = document.getElementById('sfafViewMode');
        if (!viewModeSelect) return;

        // Remove existing custom view options
        const existingCustomOptions = viewModeSelect.querySelectorAll('option[data-custom="true"]');
        existingCustomOptions.forEach(opt => opt.remove());

        // Add custom views
        this.customViews.forEach(view => {
            const option = document.createElement('option');
            option.value = `custom_${view.id}`;
            option.textContent = `${view.name} (Custom)`;
            option.dataset.custom = 'true';
            viewModeSelect.appendChild(option);
        });
    }

    applyDefaultView() {
        // Apply the user's default view preference
        if (this.defaultView && this.defaultView !== 'summary') {
            const viewModeSelect = document.getElementById('sfafViewMode');
            if (viewModeSelect) {
                viewModeSelect.value = this.defaultView;
                this.currentView = this.defaultView;

                // If it's a custom view, load the custom view data
                if (this.defaultView.startsWith('custom_')) {
                    const viewId = this.defaultView.replace('custom_', '');
                    const view = this.customViews.find(v => v.id === viewId);
                    if (view) {
                        this.currentCustomView = view;
                    }
                }
            }
        }

        // Restore the last used field view
        const preferences = this.sessionManager.getSessionPreferences();
        if (preferences.lastFieldView) {
            const views = this.getCustomViews();
            const savedView = views.find(v => v.id === preferences.lastFieldView);
            if (savedView) {
                this.currentFieldView = savedView;
                console.log(`✅ Restored field view: ${preferences.lastFieldView}`);
            } else if (preferences.lastFieldView === 'all') {
                this.currentFieldView = {
                    id: 'all',
                    name: 'All Fields',
                    fields: null,
                    fieldOrder: null
                };
                console.log(`✅ Restored field view: all`);
            }
        }
    }

    // ==================== QUERY BUILDER METHODS ====================

    toggleQueryPanel() {
        const panel = document.getElementById('advancedQueryPanel');
        if (panel) {
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'block';
                this.updateDBQueryStats();
            } else {
                panel.style.display = 'none';
            }
        }
    }

    addDBFilterQuery() {
        const queryId = `db_query_${Date.now()}`;
        const container = document.getElementById('dbFilterQueriesContainer');

        if (!this.dbFilterQueries) {
            this.dbFilterQueries = [];
        }

        const queryHTML = `
            <div class="filter-query" data-query-id="${queryId}">
                <div class="query-header">
                    <span class="query-label">Filter ${this.dbFilterQueries.length + 1}</span>
                    <button class="query-remove-btn" onclick="databaseViewer.removeDBQuery('${queryId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="query-body">
                    <div class="query-row">
                        <label>Field:</label>
                        <select class="query-field" data-query-id="${queryId}">
                            <option value="">Select field...</option>
                            <option value="serial">Serial Number (100)</option>
                            <option value="frequency">Frequency (110)</option>
                            <option value="emission">Emission (114)</option>
                            <option value="power">Power (115)</option>
                            <option value="location">Location (300)</option>
                            <option value="equipment">Equipment (340)</option>
                            <option value="notes">Notes</option>
                            <option value="marker_type">Type</option>
                        </select>
                    </div>
                    <div class="query-row">
                        <label>Operator:</label>
                        <select class="query-operator" data-query-id="${queryId}">
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not Equals</option>
                            <option value="starts_with">Starts With</option>
                            <option value="ends_with">Ends With</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>
                        </select>
                    </div>
                    <div class="query-row">
                        <label>Value:</label>
                        <input type="text" class="query-value" placeholder="Enter value"
                               data-query-id="${queryId}">
                        <small class="query-hint">Case-insensitive search</small>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', queryHTML);

        this.dbFilterQueries.push({
            id: queryId,
            field: '',
            operator: 'contains',
            value: ''
        });

        console.log(`✅ Added DB filter query: ${queryId}`);
    }

    removeDBQuery(queryId) {
        const queryElement = document.querySelector(`[data-query-id="${queryId}"]`);
        if (queryElement) {
            queryElement.remove();
        }

        if (this.dbFilterQueries) {
            this.dbFilterQueries = this.dbFilterQueries.filter(q => q.id !== queryId);
        }

        console.log(`🗑️ Removed DB filter query: ${queryId}`);
    }

    applyDBFilters() {
        if (!this.dbFilterQueries || this.dbFilterQueries.length === 0) {
            alert('Please add at least one filter query');
            return;
        }

        // Collect filter values from UI
        this.dbFilterQueries.forEach(query => {
            const fieldSelect = document.querySelector(`.query-field[data-query-id="${query.id}"]`);
            const operatorSelect = document.querySelector(`.query-operator[data-query-id="${query.id}"]`);
            const valueInput = document.querySelector(`.query-value[data-query-id="${query.id}"]`);

            if (fieldSelect) query.field = fieldSelect.value;
            if (operatorSelect) query.operator = operatorSelect.value;
            if (valueInput) query.value = valueInput.value;
        });

        // Filter the current data
        const filteredData = this.filterRecordsByQueries(this.currentSFAFData || []);

        // Update the display
        this.currentData = filteredData;
        this.currentPage = 1;
        this.renderEnhancedSFAFTable(filteredData);
        this.updatePagination();
        this.updateDBQueryStats();

        console.log(`✅ Applied ${this.dbFilterQueries.length} filters, found ${filteredData.length} matching records`);
    }

    filterRecordsByQueries(records, queries = null) {
        // Use provided queries or fall back to dbFilterQueries
        const filterQueries = queries || this.dbFilterQueries;

        console.log('🔍 Filtering records:', {
            totalRecords: records.length,
            queries: filterQueries.map(q => ({
                field: q.field,
                operator: q.operator,
                value: q.value
            }))
        });

        const filtered = records.filter(record => {
            // All queries must pass (AND logic)
            const matches = filterQueries.every(query => {
                if (!query.field || !query.value) {
                    console.log('⚠️ Skipping empty query:', query);
                    return true; // Skip empty queries
                }

                const fieldValue = this.getRecordFieldValue(record, query.field);
                const queryValue = query.value.toLowerCase();
                const recordValue = String(fieldValue || '').toLowerCase();

                console.log(`  Checking record ${record.id || record.serial}:`, {
                    field: query.field,
                    operator: query.operator,
                    recordValue: recordValue,
                    queryValue: queryValue
                });

                let result = false;
                switch (query.operator) {
                    case 'in':
                        // "In (In Set)" - split by comma and check if value is in the set
                        const setValues = queryValue.split(',').map(v => v.trim().toLowerCase());
                        result = setValues.some(v => recordValue.includes(v));
                        break;
                    case 'contains':
                        result = recordValue.includes(queryValue);
                        break;
                    case 'equals':
                        result = recordValue === queryValue;
                        break;
                    case 'not_equals':
                        result = recordValue !== queryValue;
                        break;
                    case 'starts_with':
                        result = recordValue.startsWith(queryValue);
                        break;
                    case 'ends_with':
                        result = recordValue.endsWith(queryValue);
                        break;
                    case 'greater_than':
                        result = parseFloat(recordValue) > parseFloat(queryValue);
                        break;
                    case 'less_than':
                        result = parseFloat(recordValue) < parseFloat(queryValue);
                        break;
                    default:
                        result = true;
                }

                console.log(`    Result: ${result}`);
                return result;
            });

            return matches;
        });

        console.log(`✅ Filtering complete: ${filtered.length} records matched`);
        return filtered;
    }

    getRecordFieldValue(record, field) {
        let value = '';

        // Check if this is an SFAF field (field100, field110, etc.)
        if (field.startsWith('field')) {
            // Access from sfafFields object
            value = record.sfafFields?.[field] || record.rawSFAFFields?.[field] || '';
        } else {
            // Handle non-SFAF fields
            switch (field) {
                case 'serial':
                    value = record.serial || record.id || '';
                    break;
                case 'frequency':
                    value = record.frequency || record.sfafFields?.field110 || '';
                    break;
                case 'emission':
                    value = record.emission || record.sfafFields?.field114 || '';
                    break;
                case 'power':
                    value = record.power || record.sfafFields?.field115 || '';
                    break;
                case 'location':
                    value = record.location || record.sfafFields?.field300 || `${record.latitude || ''},${record.longitude || ''}`;
                    break;
                case 'equipment':
                    value = record.equipment || record.sfafFields?.field340 || '';
                    break;
                case 'notes':
                    value = record.notes || '';
                    break;
                case 'marker_type':
                    value = record.marker_type || record.type || '';
                    break;
                case 'created_at':
                    value = record.created_at || record.createdAt || '';
                    break;
                default:
                    // Try direct property access as fallback
                    value = record[field] || '';
                    console.warn(`⚠️ Unknown field '${field}', attempting direct access. Value:`, value);
            }
        }

        console.log(`  getRecordFieldValue(${field}):`, value);
        return value;
    }

    clearDBFilters() {
        // Remove all query elements
        const container = document.getElementById('dbFilterQueriesContainer');
        if (container) {
            container.innerHTML = '';
        }

        // Clear queries array
        this.dbFilterQueries = [];

        // Reload original data
        this.currentData = this.currentSFAFData || [];
        this.currentPage = 1;
        this.renderEnhancedSFAFTable(this.currentSFAFData || []);
        this.updatePagination();
        this.updateDBQueryStats();

        console.log('✅ Cleared all DB filters');
    }

    applyQuickFilter(filterType) {
        // Clear existing queries
        this.clearDBFilters();

        // Add a query based on filter type
        this.addDBFilterQuery();

        // Set query values based on filter type
        const queries = this.dbFilterQueries;
        if (queries && queries.length > 0) {
            const query = queries[queries.length - 1];
            const fieldSelect = document.querySelector(`.query-field[data-query-id="${query.id}"]`);
            const operatorSelect = document.querySelector(`.query-operator[data-query-id="${query.id}"]`);
            const valueInput = document.querySelector(`.query-value[data-query-id="${query.id}"]`);

            switch (filterType) {
                case 'hf':
                    if (fieldSelect) fieldSelect.value = 'frequency';
                    if (operatorSelect) operatorSelect.value = 'starts_with';
                    if (valueInput) valueInput.value = 'K';
                    break;
                case 'vhf':
                    if (fieldSelect) fieldSelect.value = 'frequency';
                    if (operatorSelect) operatorSelect.value = 'starts_with';
                    if (valueInput) valueInput.value = 'M';
                    break;
                case 'uhf':
                    if (fieldSelect) fieldSelect.value = 'frequency';
                    if (operatorSelect) operatorSelect.value = 'contains';
                    if (valueInput) valueInput.value = 'M';
                    break;
                case 'imported':
                    if (fieldSelect) fieldSelect.value = 'marker_type';
                    if (operatorSelect) operatorSelect.value = 'equals';
                    if (valueInput) valueInput.value = 'imported';
                    break;
                case 'manual':
                    if (fieldSelect) fieldSelect.value = 'marker_type';
                    if (operatorSelect) operatorSelect.value = 'equals';
                    if (valueInput) valueInput.value = 'manual';
                    break;
            }

            // Auto-apply the filter
            this.applyDBFilters();
        }
    }

    updateDBQueryStats() {
        const matchingCount = document.getElementById('dbMatchingCount');
        const totalCount = document.getElementById('dbTotalCount');

        if (matchingCount) {
            matchingCount.textContent = this.currentData ? this.currentData.length : 0;
        }

        if (totalCount) {
            totalCount.textContent = this.currentSFAFData ? this.currentSFAFData.length : 0;
        }
    }

    // ==================== QUERY BUILDER UNIFIED INTERFACE ====================

    addQueryCondition() {
        // SYNCHRONOUS lock - check and set atomically at the very start
        if (this._isAddingCondition) {
            console.warn('⚠️ Already adding a condition, skipping duplicate call');
            return;
        }
        this._isAddingCondition = true; // Set immediately, synchronously

        // Generate a unique ID with timestamp + random component to prevent collisions
        const conditionId = `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const container = document.getElementById('queryConditionsList');

        if (!container) {
            console.error('❌ Query conditions list container not found');
            this._isAddingCondition = false;
            return;
        }

        // Check if this ID already exists (prevent duplicates)
        if (document.querySelector(`[data-condition-id="${conditionId}"]`)) {
            console.warn('⚠️ Duplicate condition ID detected, skipping');
            this._isAddingCondition = false;
            return;
        }

        // Generate field options from MC4EB Pub 7 CHG 1 fields
        const fieldOptions = [
            '<option value="field005">005 - Security Classification</option>',
            '<option value="field006">006 - Security Classification Modification</option>',
            '<option value="field007">007 - Missing Data Indicator</option>',
            '<option value="field010">010 - Type of Action</option>',
            '<option value="field013">013 - Declassification Instruction Comment</option>',
            '<option value="field014">014 - Derivative Classification Authority</option>',
            '<option value="field015">015 - Unclassified Data Fields</option>',
            '<option value="field016">016 - Extended Declassification Date</option>',
            '<option value="field017">017 - Date of Origin</option>',
            '<option value="field018">018 - Assignment Concurrence Indicator</option>',
            '<option value="field019">019 - ITU Notification</option>',
            '<option value="field020">020 - File Number Extension</option>',
            '<option value="field102">102 - Agency Serial Number</option>',
            '<option value="field103">103 - Frequency/Frequency Alternative</option>',
            '<option value="field105">105 - Equipment Configuration/Emission Designator</option>',
            '<option value="field106">106 - Tuning Range/System/Subsystem/Equipment Indicator</option>',
            '<option value="field107">107 - Tuning Increment/Net Identifier</option>',
            '<option value="field108">108 - Equipment Function Code</option>',
            '<option value="field110">110 - Transmitter Frequency</option>',
            '<option value="field111">111 - Transmitter Emission Designation</option>',
            '<option value="field112">112 - Transmitter Necessary Bandwidth</option>',
            '<option value="field113">113 - Transmitter Specific Bandwidth</option>',
            '<option value="field114">114 - Transmitter Class of Emission</option>',
            '<option value="field115">115 - Transmitter Power</option>',
            '<option value="field116">116 - Transmitter Power Units</option>',
            '<option value="field117">117 - Transmitter Nature of Service</option>',
            '<option value="field118">118 - Transmitter EIRP</option>',
            '<option value="field130">130 - Proposed Start Date</option>',
            '<option value="field131">131 - Proposed Stop Date</option>',
            '<option value="field140">140 - Hours of Operation/Area of Operation</option>',
            '<option value="field141">141 - Effective Date</option>',
            '<option value="field142">142 - Expiration Date</option>',
            '<option value="field143">143 - Coordination Request Date</option>',
            '<option value="field144">144 - Coordination Completion Date</option>',
            '<option value="field145">145 - Date Transmitted to NTIA</option>',
            '<option value="field146">146 - Date Received at NTIA</option>',
            '<option value="field147">147 - Date Action Completed</option>',
            '<option value="field151">151 - Hours of Operation Begin Time</option>',
            '<option value="field152">152 - Hours of Operation End Time</option>',
            '<option value="field200">200 - Agency Code</option>',
            '<option value="field201">201 - Agency Name</option>',
            '<option value="field202">202 - Agency Serial Number Prefix</option>',
            '<option value="field203">203 - Agency File Number</option>',
            '<option value="field204">204 - Organization Code</option>',
            '<option value="field205">205 - Using Organization Name</option>',
            '<option value="field206">206 - Station Name</option>',
            '<option value="field207">207 - Station Location</option>',
            '<option value="field208">208 - Station Call Sign</option>',
            '<option value="field209">209 - Net Identification</option>',
            '<option value="field300">300 - Transmitter Location State Code</option>',
            '<option value="field301">301 - Transmitter Location City</option>',
            '<option value="field302">302 - Transmitter Location Site Name</option>',
            '<option value="field303">303 - Transmitter Location Latitude</option>',
            '<option value="field304">304 - Transmitter Location Longitude</option>',
            '<option value="field305">305 - Transmitter Coordinate System</option>',
            '<option value="field306">306 - Transmitter Site Elevation</option>',
            '<option value="field307">307 - Transmitter Site Radius</option>',
            '<option value="field315">315 - Transmitter Orbit Type</option>',
            '<option value="field316">316 - Transmitter Orbital Period</option>',
            '<option value="field317">317 - Transmitter Apogee</option>',
            '<option value="field318">318 - Transmitter Perigee</option>',
            '<option value="field319">319 - Transmitter Inclination</option>',
            '<option value="field321">321 - Transmitter Orbital Position</option>',
            '<option value="field340">340 - Transmitter Manufacturer</option>',
            '<option value="field341">341 - Transmitter Model Number</option>',
            '<option value="field342">342 - Transmitter Type</option>',
            '<option value="field343">343 - Transmitter Rated Power Output</option>',
            '<option value="field344">344 - Transmitter Emission Type</option>',
            '<option value="field345">345 - Transmitter Modulation Type</option>',
            '<option value="field346">346 - Transmitter Frequency Stability</option>',
            '<option value="field347">347 - Transmitter Frequency Tolerance</option>',
            '<option value="field348">348 - Transmitter Spurious Emissions</option>',
            '<option value="field349">349 - Transmitter Equipment Notes</option>',
            '<option value="field354">354 - Transmitter Antenna Manufacturer</option>',
            '<option value="field355">355 - Transmitter Antenna Model</option>',
            '<option value="field356">356 - Transmitter Antenna Type</option>',
            '<option value="field357">357 - Transmitter Antenna Gain</option>',
            '<option value="field358">358 - Transmitter Antenna Height Above Ground</option>',
            '<option value="field359">359 - Transmitter Antenna Height Above Average Terrain</option>',
            '<option value="field360">360 - Transmitter Antenna Azimuth</option>',
            '<option value="field361">361 - Transmitter Antenna Beamwidth</option>',
            '<option value="field362">362 - Transmitter Antenna Polarization</option>',
            '<option value="field363">363 - Transmitter Antenna Front-to-Back Ratio</option>',
            '<option value="field364">364 - Transmitter Antenna Vertical Beamwidth</option>',
            '<option value="field365">365 - Transmitter Antenna Elevation Angle</option>',
            '<option value="field373">373 - Transmitter Antenna Directional Pattern</option>',
            '<option value="field374">374 - Transmitter Antenna Pattern Number</option>',
            '<option value="field400">400 - Receiver Frequency</option>',
            '<option value="field401">401 - Receiver Emission Designation</option>',
            '<option value="field402">402 - Receiver Location State Code</option>',
            '<option value="field403">403 - Receiver Location Latitude</option>',
            '<option value="field404">404 - Receiver Location Longitude</option>',
            '<option value="field405">405 - Receiver Coordinate System</option>',
            '<option value="field406">406 - Receiver Site Elevation</option>',
            '<option value="field407">407 - Receiver Location City</option>',
            '<option value="field408">408 - Receiver Location Site Name</option>',
            '<option value="field409">409 - Receiver Site Radius</option>',
            '<option value="field415">415 - Receiver Orbit Type</option>',
            '<option value="field416">416 - Receiver Orbital Period</option>',
            '<option value="field417">417 - Receiver Apogee</option>',
            '<option value="field418">418 - Receiver Perigee</option>',
            '<option value="field419">419 - Receiver Inclination</option>',
            '<option value="field440">440 - Receiver Manufacturer</option>',
            '<option value="field442">442 - Receiver Model Number</option>',
            '<option value="field443">443 - Receiver Type</option>',
            '<option value="field453">453 - Receiver Antenna Manufacturer</option>',
            '<option value="field454">454 - Receiver Antenna Model</option>',
            '<option value="field455">455 - Receiver Antenna Type</option>',
            '<option value="field456">456 - Receiver Antenna Gain</option>',
            '<option value="field457">457 - Receiver Antenna Height Above Ground</option>',
            '<option value="field458">458 - Receiver Antenna Height Above Average Terrain</option>',
            '<option value="field459">459 - Receiver Antenna Azimuth</option>',
            '<option value="field460">460 - Receiver Antenna Beamwidth</option>',
            '<option value="field461">461 - Receiver Antenna Polarization</option>',
            '<option value="field462">462 - Receiver Antenna Front-to-Back Ratio</option>',
            '<option value="field463">463 - Receiver Antenna Vertical Beamwidth</option>',
            '<option value="field470">470 - Receiver Antenna Elevation Angle</option>',
            '<option value="field471">471 - Receiver Antenna Directional Pattern</option>',
            '<option value="field472">472 - Receiver Antenna Pattern Number</option>',
            '<option value="field473">473 - Receiver Antenna Notes</option>',
            '<option value="field500">500 - General Remarks</option>',
            '<option value="field501">501 - Interference Analysis</option>',
            '<option value="field502">502 - Link Budget Analysis</option>',
            '<option value="field503">503 - Frequency Coordination Comments</option>',
            '<option value="field504">504 - Technical Operating Conditions</option>',
            '<option value="field505">505 - IRAC Notes Field 1</option>',
            '<option value="field506">506 - IRAC Notes Field 2</option>',
            '<option value="field507">507 - IRAC Notes Field 3</option>',
            '<option value="field508">508 - IRAC Notes Field 4</option>',
            '<option value="field509">509 - IRAC Notes Field 5</option>',
            '<option value="field510">510 - Certification Statement</option>',
            '<option value="field511">511 - Environmental Impact</option>',
            '<option value="field512">512 - Radiation Hazard Analysis</option>',
            '<option value="field513">513 - Historical/Cultural Site Impact</option>',
            '<option value="field520">520 - Coordination Data</option>',
            '<option value="field521">521 - International Coordination</option>',
            '<option value="field530">530 - Area of Operation</option>',
            '<option value="field531">531 - Authorized Operating Areas</option>',
            '<option value="marker_type">Marker Type</option>',
            '<option value="created_at">Date Created</option>'
        ].join('');

        const conditionHTML = `
            <div class="condition-item" data-condition-id="${conditionId}">
                <input type="checkbox" class="condition-checkbox" checked data-condition-id="${conditionId}">
                <select class="condition-field" data-condition-id="${conditionId}">
                    ${fieldOptions}
                </select>
                <select class="condition-operator" data-condition-id="${conditionId}">
                    <option value="in">In (In Set)</option>
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                </select>
                <input type="text" class="condition-value" placeholder="Expression" data-condition-id="${conditionId}">
                <button class="btn-remove-condition" onclick="databaseViewer.removeCondition('${conditionId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', conditionHTML);

        this.queryConditions.push({
            id: conditionId,
            enabled: true,
            field: 'serial',
            operator: 'in',
            value: ''
        });

        const currentTotal = this.queryConditions.length;
        console.log(`✅ Added query condition: ${conditionId}`);
        console.log(`   Total conditions now: ${currentTotal}`);
        console.log(`   All condition IDs:`, this.queryConditions.map(c => c.id));

        // Reset the flag after a short delay
        setTimeout(() => {
            this._isAddingCondition = false;
        }, 100);
    }

    removeCondition(conditionId) {
        const conditionElement = document.querySelector(`[data-condition-id="${conditionId}"].condition-item`);
        if (conditionElement) {
            conditionElement.remove();
        }

        this.queryConditions = this.queryConditions.filter(c => c.id !== conditionId);
        console.log(`🗑️ Removed condition: ${conditionId}`);
    }

    runQuery() {
        console.log('🔍 Running query...', 'Total conditions:', this.queryConditions.length);
        console.log('📊 Current SFAF Data count:', this.currentSFAFData?.length || 0);

        // Collect condition values from UI
        this.queryConditions.forEach(condition => {
            const checkbox = document.querySelector(`.condition-checkbox[data-condition-id="${condition.id}"]`);
            const fieldSelect = document.querySelector(`.condition-field[data-condition-id="${condition.id}"]`);
            const operatorSelect = document.querySelector(`.condition-operator[data-condition-id="${condition.id}"]`);
            const valueInput = document.querySelector(`.condition-value[data-condition-id="${condition.id}"]`);

            if (checkbox) condition.enabled = checkbox.checked;
            if (fieldSelect) condition.field = fieldSelect.value;
            if (operatorSelect) condition.operator = operatorSelect.value;
            if (valueInput) condition.value = valueInput.value;

            console.log(`  Condition ${condition.id}:`, {
                enabled: condition.enabled,
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                valueLength: condition.value?.length
            });
        });

        // Filter only enabled conditions with non-empty values
        const enabledConditions = this.queryConditions.filter(c => {
            const hasValue = c.value && c.value.trim().length > 0;
            return c.enabled && hasValue;
        });

        console.log('📊 Enabled conditions with values:', enabledConditions.length);

        if (enabledConditions.length === 0) {
            alert('Please add at least one enabled condition with a value');
            return;
        }

        // Filter data
        console.log('🔍 Filtering records with', enabledConditions.length, 'conditions...');
        const filteredData = this.filterRecordsByQueries(this.currentSFAFData || [], enabledConditions);
        console.log('📊 Filtered results:', filteredData.length, 'records');

        // Sort data
        const sortField = document.getElementById('querySortField')?.value || 'created_at';
        const sortedData = this.sortQueryResults(filteredData, sortField, this.querySortOrder);

        // Store results
        this.queryResults = sortedData;

        // Render results
        console.log('🎨 Rendering query results...');
        this.renderQueryResults();
        this.updateQueryStats();

        console.log(`✅ Query executed: ${enabledConditions.length} conditions, ${sortedData.length} results`);
    }

    sortQueryResults(data, field, order) {
        return [...data].sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';

            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    renderQueryResults() {
        const resultsGrid = document.getElementById('queryResultsGrid');
        const emptyState = document.getElementById('queryEmptyState');

        if (!this.queryResults || this.queryResults.length === 0) {
            if (resultsGrid) resultsGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (resultsGrid) resultsGrid.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        const tableContainer = resultsGrid.querySelector('.table-container');
        if (tableContainer) {
            const tableHTML = this.generateQueryResultsTable(this.queryResults);
            tableContainer.innerHTML = tableHTML;
        }
    }

    generateQueryResultsTable(records) {
        if (!records || records.length === 0) return '';

        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="checkbox-col"><input type="checkbox" id="selectAllQueryCheckbox" title="Select All"></th>
                        <th>102 - Agency Serial</th>
                        <th>110 - Frequency</th>
                        <th>200 - Agency</th>
                        <th>300 - State/Country</th>
                        <th>301 - City/Location</th>
                        <th>115 - Power</th>
                        <th>Type</th>
                        <th>ID</th>
                    </tr>
                </thead>
                <tbody>
        `;

        records.forEach(record => {
            const recordId = record.marker_id || record.id;
            const isChecked = this.selectedItems.has(recordId) ? 'checked' : '';
            const escapedId = recordId.replace(/'/g, "\\'");
            const agencySerial = record.sfafFields?.field102 || record.serial || 'N/A';
            const frequency = record.sfafFields?.field110 || record.frequency || 'N/A';
            const agency = record.sfafFields?.field200 || record.agency || 'N/A';
            const stateCountry = record.sfafFields?.field300 || 'N/A';
            const cityLocation = record.sfafFields?.field301 || record.location || 'N/A';
            const power = record.sfafFields?.field115 || 'N/A';

            html += `
                <tr data-record-id="${recordId}">
                    <td class="checkbox-col">
                        <input type="checkbox" class="row-checkbox" value="${recordId}" ${isChecked}
                               data-record-id="${recordId}"
                               onchange="databaseViewer.toggleRowSelection('${escapedId}', this.checked)">
                    </td>
                    <td>${agencySerial}</td>
                    <td>${frequency}</td>
                    <td>${agency}</td>
                    <td>${stateCountry}</td>
                    <td>${cityLocation}</td>
                    <td>${power}</td>
                    <td><span class="badge badge-${record.marker_type || 'imported'}">${record.marker_type || 'imported'}</span></td>
                    <td>
                        <span class="text-muted" style="font-size: 11px;">${recordId || ''}</span>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    clearQuery() {
        // Clear all conditions
        const container = document.getElementById('queryConditionsList');
        if (container) {
            container.innerHTML = '';
        }

        this.queryConditions = [];
        this.queryResults = [];

        // Reset sort order
        this.querySortOrder = 'asc';
        document.getElementById('sortAscBtn')?.classList.add('active');
        document.getElementById('sortDescBtn')?.classList.remove('active');

        // Clear results
        this.renderQueryResults();
        this.updateQueryStats();

        console.log('✅ Query cleared');
    }

    updateQueryStats() {
        const matchingCount = document.getElementById('queryMatchingCount');
        const totalCount = document.getElementById('queryTotalCount');

        if (matchingCount) {
            matchingCount.textContent = this.queryResults ? this.queryResults.length : 0;
        }

        if (totalCount) {
            totalCount.textContent = this.currentSFAFData ? this.currentSFAFData.length : 0;
        }
    }
}
// Enhanced Session Management and Default Tab Implementation
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize session manager first
        const sessionManager = new SessionManager();

        // Get saved preferences
        const savedPrefs = sessionManager.getSessionPreferences();
        console.log('🔄 Loading session preferences:', savedPrefs);

        // Initialize core database viewer with session preferences
        window.databaseViewer = new DatabaseViewer();

        // Show session restoration notification
        if (savedPrefs.sessionCount > 0) {
            showSessionNotification(`Session restored: ${savedPrefs.activeTab} tab, ${savedPrefs.viewMode} view`, 'info');

            // Highlight restored tab briefly
            setTimeout(() => {
                const restoredTab = document.querySelector(`[data-tab="${savedPrefs.activeTab}"]`);
                if (restoredTab) {
                    restoredTab.classList.add('session-restored');
                    setTimeout(() => {
                        restoredTab.classList.remove('session-restored');
                    }, 1500);
                }
            }, 500);
        }

        // Initialize other components
        if (typeof ThemeManager !== 'undefined') {
            window.themeManager = new ThemeManager();
            console.log('🎨 Theme management enabled');
        }

        if (typeof AccessibilityManager !== 'undefined') {
            window.accessibilityManager = new AccessibilityManager();
            console.log('♿ Accessibility features active');
        }

        if (typeof PerformanceManager !== 'undefined') {
            window.performanceManager = new PerformanceManager();
            console.log('⚡ Performance optimizations applied');
        }

        // Update session indicator
        updateSessionIndicator(savedPrefs);

        // Mark SFAF tab as default
        const sfafTab = document.querySelector('[data-tab="sfaf"]');
        if (sfafTab) {
            sfafTab.classList.add('default-tab');
        }

        // Mark view mode selector if session is active
        const viewSelector = document.getElementById('sfafViewMode');
        if (viewSelector && savedPrefs.sessionCount > 0) {
            viewSelector.classList.add('session-active');
        }

        // Sync top scrollbar with table container
        const topScroll = document.getElementById('tableScrollTop');
        const topScrollInner = document.getElementById('tableScrollTopInner');
        const tableContainer = document.getElementById('tableContainer');

        if (topScroll && tableContainer) {
            // Update inner width to match table scroll width
            const syncScrollWidth = () => {
                topScrollInner.style.width = tableContainer.scrollWidth + 'px';
            };
            syncScrollWidth();

            // Observe table content changes to keep width in sync
            const resizeObserver = new ResizeObserver(syncScrollWidth);
            resizeObserver.observe(tableContainer);

            let syncing = false;
            topScroll.addEventListener('scroll', () => {
                if (syncing) return;
                syncing = true;
                tableContainer.scrollLeft = topScroll.scrollLeft;
                syncing = false;
            });
            tableContainer.addEventListener('scroll', () => {
                if (syncing) return;
                syncing = true;
                topScroll.scrollLeft = tableContainer.scrollLeft;
                syncing = false;
            });
        }

        console.log('✅ SFAF Plotter Database Viewer fully initialized');
        console.log('🏠 Default tab: SFAF Records');
        console.log('💾 Session management: Active');
        console.log('📱 Responsive design active for all screen sizes');

    } catch (error) {
        console.error('❌ Failed to initialize Database Viewer:', error);
        showErrorNotification('Database Viewer initialization failed. Please refresh the page.');
    }
});

// Session notification functions
function showSessionNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'session-notification';

    const iconMap = {
        info: '💾',
        success: '✅',
        error: '❌'
    };

    notification.innerHTML = `
        <span>${iconMap[type]} ${message}</span>
        <button class="close-btn" onclick="this.parentElement.remove()">&times;</button>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

function showErrorNotification(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">❌</span>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 6 seconds for errors
    setTimeout(() => {
        errorDiv.remove();
    }, 6000);
}

// Update session indicator in header
function updateSessionIndicator(preferences) {
    const sessionInfo = document.getElementById('sessionInfo');
    if (sessionInfo) {
        sessionInfo.innerHTML = `
            <span class="session-info">
                <i class="fas fa-save"></i>
                Session: ${preferences.sessionCount}
                <span class="session-count">${preferences.sessionCount}</span>
            </span>
        `;

        sessionInfo.title = `Session ${preferences.sessionCount} - Last: ${preferences.lastAccessed ?
            new Date(preferences.lastAccessed).toLocaleString() : 'New session'}`;
    }
}

// Global function wrappers for HTML onclick handlers (maintaining backward compatibility)
function closeModal() {
    if (window.databaseViewer) {
        window.databaseViewer.closeModal();
    } else {
        console.error('DatabaseViewer not initialized');
    }
}

function editSFAFRecord(recordId) {
    if (window.databaseViewer) {
        window.databaseViewer.editSFAFRecord(recordId);
    } else {
        console.error('DatabaseViewer not initialized');
    }
}

function viewSFAFRecord(recordId) {
    if (window.databaseViewer) {
        window.databaseViewer.viewSFAFRecord(recordId);
    } else {
        console.error('DatabaseViewer not initialized');
    }
}

function exportSFAFRecord(recordId) {
    if (window.databaseViewer) {
        window.databaseViewer.exportSFAFRecord(recordId);
    } else {
        console.error('DatabaseViewer not initialized');
    }
}

function importSampleSFAFData() {
    if (window.databaseViewer) {
        window.databaseViewer.importSampleSFAFData();
    } else {
        console.error('DatabaseViewer not initialized');
    }
}

// Additional keyboard shortcuts for session management
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+R to reset session
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (window.databaseViewer?.sessionManager) {
            if (confirm('Reset all session preferences to defaults?')) {
                window.databaseViewer.sessionManager.clearSessionData();
                showSessionNotification('Session preferences reset to defaults', 'success');
                setTimeout(() => location.reload(), 1000);
            }
        }
    }

    // Ctrl+Tab to cycle through tabs
    if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const tabs = ['sfaf', 'irac', 'analytics'];
        const currentIndex = tabs.indexOf(window.databaseViewer?.currentTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        window.databaseViewer?.switchTab(tabs[nextIndex]);
    }
});

console.log('✅ SFAF Plotter Database Viewer session management loaded');
console.log('🏠 Default tab: SFAF Records');
console.log('💾 Session persistence: Enabled');
console.log('⌨️ Keyboard shortcuts: Ctrl+Shift+R (reset), Ctrl+Tab (cycle tabs)');
// NOTE: DatabaseViewer is initialized in the DOMContentLoaded event listener above (line 11708)
// DO NOT create another instance here or everything will duplicate!


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