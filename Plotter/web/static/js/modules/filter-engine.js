/**
 * Filter Engine Module
 * Handles filtering and sorting of SFAF markers on the map
 */

const FilterEngine = (function() {
    'use strict';

    // Active filter queries
    let filterQueries = [];
    let sortConfig = { field: null, order: 'asc' };
    let queryIdCounter = 0;

    // SFAF field number to property mapping
    const FIELD_MAP = {
        '005': 'serial',
        '010': 'serial',  // Also maps to serial
        '102': 'action_code',
        '110': 'frequency',
        '114': 'emission',
        '115': 'power',
        '300': 'location_state',
        '301': 'location_name',
        '303': 'coordinates',
        '340': 'equipment',
        '403': 'alt_coordinates'
    };

    /**
     * Initialize the filter engine
     */
    function init() {
        setupEventListeners();
        console.log('🔍 Filter Engine initialized');
    }

    /**
     * Set up event listeners for filter UI
     */
    function setupEventListeners() {
        // Add query button
        const addQueryBtn = document.getElementById('addQueryBtn');
        if (addQueryBtn) {
            addQueryBtn.addEventListener('click', addFilterQuery);
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', applyFilters);
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', clearAllFilters);
        }

        // Quick filter buttons
        const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
        quickFilterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filter;
                applyQuickFilter(filterType);
            });
        });

        // Sort controls
        setupSortControls();
    }

    /**
     * Setup sort control event listeners
     */
    function setupSortControls() {
        const sortAscBtn = document.getElementById('sortAscBtn');
        const sortDescBtn = document.getElementById('sortDescBtn');
        const applySortBtn = document.getElementById('applySortBtn');

        if (sortAscBtn) {
            sortAscBtn.addEventListener('click', () => {
                sortAscBtn.classList.add('active');
                sortDescBtn.classList.remove('active');
                sortConfig.order = 'asc';
            });
        }

        if (sortDescBtn) {
            sortDescBtn.addEventListener('click', () => {
                sortDescBtn.classList.add('active');
                sortAscBtn.classList.remove('active');
                sortConfig.order = 'desc';
            });
        }

        if (applySortBtn) {
            applySortBtn.addEventListener('click', applySort);
        }
    }

    /**
     * Add a new filter query to the UI
     */
    function addFilterQuery() {
        const queryId = `query_${queryIdCounter++}`;
        const container = document.getElementById('filterQueriesContainer');

        const queryHTML = `
            <div class="filter-query" data-query-id="${queryId}">
                <div class="query-header">
                    <span class="query-label">Filter ${filterQueries.length + 1}</span>
                    <button class="query-remove-btn" onclick="FilterEngine.removeQuery('${queryId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="query-body">
                    <div class="query-row">
                        <label>Field #:</label>
                        <input type="text" class="query-field" placeholder="e.g., 110, 300, 340"
                               data-query-id="${queryId}">
                    </div>
                    <div class="query-row">
                        <label>Expression:</label>
                        <select class="query-operator" data-query-id="${queryId}">
                            <option value="=">=  (Equal)</option>
                            <option value="==">== (Exactly Equal)</option>
                            <option value="!=">!= (Not Equal)</option>
                            <option value="<">&lt;  (Less Than)</option>
                            <option value="<="> &lt;= (Less or Equal)</option>
                            <option value=">">&gt;  (Greater Than)</option>
                            <option value=">=">&gt;= (Greater or Equal)</option>
                            <option value="..">.. (Between)</option>
                            <option value="$$">$$ (Contains)</option>
                        </select>
                    </div>
                    <div class="query-row">
                        <label>Value:</label>
                        <input type="text" class="query-value" placeholder="Enter value"
                               data-query-id="${queryId}">
                        <small class="query-hint">For "between", use format: min..max</small>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', queryHTML);

        // Add to queries array
        filterQueries.push({
            id: queryId,
            field: '',
            operator: '=',
            value: ''
        });

        console.log(`✅ Added filter query: ${queryId}`);
    }

    /**
     * Remove a filter query
     */
    function removeQuery(queryId) {
        const queryElement = document.querySelector(`[data-query-id="${queryId}"]`);
        if (queryElement) {
            queryElement.remove();
        }

        filterQueries = filterQueries.filter(q => q.id !== queryId);
        updateFilterResults();
        console.log(`🗑️ Removed filter query: ${queryId}`);
    }

    /**
     * Get all markers from the map
     */
    function getAllMarkers() {
        if (!window.map || !window.MarkerManager) {
            console.error('Map or MarkerManager not available');
            return [];
        }

        // Get all markers from MarkerManager
        const markers = [];
        window.map.eachLayer(layer => {
            if (layer instanceof L.Marker && layer.markerData) {
                markers.push(layer);
            }
        });

        return markers;
    }

    /**
     * Apply all active filters
     */
    function applyFilters() {
        // Collect filter values from UI
        filterQueries.forEach(query => {
            const fieldInput = document.querySelector(`.query-field[data-query-id="${query.id}"]`);
            const operatorSelect = document.querySelector(`.query-operator[data-query-id="${query.id}"]`);
            const valueInput = document.querySelector(`.query-value[data-query-id="${query.id}"]`);

            if (fieldInput && operatorSelect && valueInput) {
                query.field = fieldInput.value.trim();
                query.operator = operatorSelect.value;
                query.value = valueInput.value.trim();
            }
        });

        const markers = getAllMarkers();
        let visibleCount = 0;
        let hiddenCount = 0;

        markers.forEach(marker => {
            const markerData = marker.markerData;
            let shouldShow = true;

            // Apply all filter queries (AND logic)
            for (const query of filterQueries) {
                if (!query.field || !query.value) continue;

                const fieldValue = getFieldValue(markerData, query.field);
                if (!evaluateExpression(fieldValue, query.operator, query.value)) {
                    shouldShow = false;
                    break;
                }
            }

            // Show or hide marker
            if (shouldShow) {
                if (!window.map.hasLayer(marker)) {
                    window.map.addLayer(marker);
                }
                visibleCount++;
            } else {
                if (window.map.hasLayer(marker)) {
                    window.map.removeLayer(marker);
                }
                hiddenCount++;
            }
        });

        updateFilterResults(visibleCount, hiddenCount, markers.length);
        console.log(`🔍 Filters applied: ${visibleCount} visible, ${hiddenCount} hidden`);
    }

    /**
     * Get field value from marker data
     */
    function getFieldValue(markerData, fieldNumber) {
        // Remove leading zeros
        const fieldNum = fieldNumber.replace(/^0+/, '');

        // Check SFAF fields if available
        if (markerData.sfaf_fields) {
            const fieldKey = `field${fieldNum}`;
            if (markerData.sfaf_fields[fieldKey]) {
                return markerData.sfaf_fields[fieldKey];
            }
        }

        // Try mapped property
        const mappedProp = FIELD_MAP[fieldNum.padStart(3, '0')];
        if (mappedProp && markerData[mappedProp]) {
            return markerData[mappedProp];
        }

        // Special cases
        if (fieldNum === '110') return markerData.frequency || '';
        if (fieldNum === '005' || fieldNum === '010') return markerData.serial || '';

        return '';
    }

    /**
     * Evaluate filter expression
     */
    function evaluateExpression(fieldValue, operator, queryValue) {
        if (!fieldValue) return false;

        const fieldStr = String(fieldValue).toLowerCase();
        const queryStr = String(queryValue).toLowerCase();

        switch (operator) {
            case '=': // Equal (case-insensitive partial match)
                return fieldStr.includes(queryStr);

            case '==': // Exactly Equal (case-insensitive)
                return fieldStr === queryStr;

            case '!=': // Not Equal
                return fieldStr !== queryStr;

            case '<': // Less Than
                return parseFloat(fieldValue) < parseFloat(queryValue);

            case '<=': // Less or Equal
                return parseFloat(fieldValue) <= parseFloat(queryValue);

            case '>': // Greater Than
                return parseFloat(fieldValue) > parseFloat(queryValue);

            case '>=': // Greater or Equal
                return parseFloat(fieldValue) >= parseFloat(queryValue);

            case '..': // Between
                const [min, max] = queryValue.split('..').map(v => parseFloat(v.trim()));
                const numValue = parseFloat(fieldValue);
                return numValue >= min && numValue <= max;

            case '$$': // Contains (case-insensitive)
                return fieldStr.includes(queryStr);

            default:
                return false;
        }
    }

    /**
     * Apply quick filter presets
     */
    function applyQuickFilter(filterType) {
        clearAllFilters();

        switch (filterType) {
            case 'hf':
                addFilterQuery();
                setTimeout(() => {
                    const lastQuery = filterQueries[filterQueries.length - 1];
                    document.querySelector(`.query-field[data-query-id="${lastQuery.id}"]`).value = '110';
                    document.querySelector(`.query-operator[data-query-id="${lastQuery.id}"]`).value = '..';
                    document.querySelector(`.query-value[data-query-id="${lastQuery.id}"]`).value = '3..30';
                    applyFilters();
                }, 100);
                break;

            case 'vhf':
                addFilterQuery();
                setTimeout(() => {
                    const lastQuery = filterQueries[filterQueries.length - 1];
                    document.querySelector(`.query-field[data-query-id="${lastQuery.id}"]`).value = '110';
                    document.querySelector(`.query-operator[data-query-id="${lastQuery.id}"]`).value = '..';
                    document.querySelector(`.query-value[data-query-id="${lastQuery.id}"]`).value = '30..300';
                    applyFilters();
                }, 100);
                break;

            case 'uhf':
                addFilterQuery();
                setTimeout(() => {
                    const lastQuery = filterQueries[filterQueries.length - 1];
                    document.querySelector(`.query-field[data-query-id="${lastQuery.id}"]`).value = '110';
                    document.querySelector(`.query-operator[data-query-id="${lastQuery.id}"]`).value = '..';
                    document.querySelector(`.query-value[data-query-id="${lastQuery.id}"]`).value = '300..3000';
                    applyFilters();
                }, 100);
                break;

            case 'manual':
                filterByMarkerType('manual');
                break;

            case 'imported':
                filterByMarkerType('imported');
                break;
        }
    }

    /**
     * Filter by marker type
     */
    function filterByMarkerType(type) {
        const markers = getAllMarkers();
        let visibleCount = 0;
        let hiddenCount = 0;

        markers.forEach(marker => {
            const markerType = marker.markerData?.marker_type || marker.markerData?.type;

            if (markerType === type) {
                if (!window.map.hasLayer(marker)) {
                    window.map.addLayer(marker);
                }
                visibleCount++;
            } else {
                if (window.map.hasLayer(marker)) {
                    window.map.removeLayer(marker);
                }
                hiddenCount++;
            }
        });

        updateFilterResults(visibleCount, hiddenCount, markers.length);
    }

    /**
     * Clear all filters and show all markers
     */
    function clearAllFilters() {
        // Remove all query UI elements
        const container = document.getElementById('filterQueriesContainer');
        if (container) {
            container.innerHTML = '';
        }

        filterQueries = [];
        queryIdCounter = 0;

        // Show all markers
        const markers = getAllMarkers();
        markers.forEach(marker => {
            if (!window.map.hasLayer(marker)) {
                window.map.addLayer(marker);
            }
        });

        updateFilterResults(markers.length, 0, markers.length);
        console.log('🗑️ All filters cleared');
    }

    /**
     * Apply sort to markers
     */
    function applySort() {
        const sortField = document.getElementById('sortByField')?.value;
        if (!sortField) {
            console.log('No sort field selected');
            return;
        }

        sortConfig.field = sortField;

        const markers = getAllMarkers();

        // Sort markers based on field
        markers.sort((a, b) => {
            const aValue = getSortValue(a.markerData, sortField);
            const bValue = getSortValue(b.markerData, sortField);

            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;

            return sortConfig.order === 'asc' ? comparison : -comparison;
        });

        // Update marker z-index based on sort order
        markers.forEach((marker, index) => {
            if (marker.setZIndexOffset) {
                marker.setZIndexOffset(index * 100);
            }
        });

        console.log(`📊 Sorted by ${sortField} (${sortConfig.order})`);
    }

    /**
     * Get value for sorting
     */
    function getSortValue(markerData, field) {
        switch (field) {
            case 'serial':
                return markerData.serial || '';
            case 'frequency':
                return parseFloat(markerData.frequency || 0);
            case 'location':
                return markerData.location_name || markerData.location_state || '';
            case 'power':
                return parseFloat(getFieldValue(markerData, '115') || 0);
            case 'emission':
                return getFieldValue(markerData, '114') || '';
            case 'equipment':
                return getFieldValue(markerData, '340') || '';
            case 'created_at':
                return new Date(markerData.created_at || 0);
            default:
                return '';
        }
    }

    /**
     * Update filter result statistics
     */
    function updateFilterResults(visible, hidden, total) {
        const markers = getAllMarkers();
        const visibleCount = visible !== undefined ? visible : markers.filter(m => window.map.hasLayer(m)).length;
        const hiddenCount = hidden !== undefined ? hidden : markers.length - visibleCount;
        const totalCount = total !== undefined ? total : markers.length;

        const visibleEl = document.getElementById('visibleCount');
        const hiddenEl = document.getElementById('hiddenCount');
        const totalEl = document.getElementById('totalCount');

        if (visibleEl) visibleEl.textContent = visibleCount;
        if (hiddenEl) hiddenEl.textContent = hiddenCount;
        if (totalEl) totalEl.textContent = totalCount;
    }

    // Public API
    return {
        init,
        addFilterQuery,
        removeQuery,
        applyFilters,
        clearAllFilters,
        applySort,
        updateFilterResults
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FilterEngine.init());
} else {
    FilterEngine.init();
}
