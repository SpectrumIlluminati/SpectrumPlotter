// persistentSidebar.js - Fixed version
import { decimalToCompactDMS } from './utils.js';

export class PersistentSidebar {
    constructor() {
        this.isOpen = false;
        this.currentTab = 'filters';
        this.init();

        // Bind resize event properly
        window.addEventListener('resize', () => {
            this.adjustSidebarHeight();
        });
    }

    adjustSidebarHeight() {
        const sidebar = document.getElementById('persistentSidebar');
        if (sidebar) {
            const viewportHeight = window.innerHeight;
            const taskbarHeight = 40; // Adjust based on your taskbar
            sidebar.style.height = `${viewportHeight - taskbarHeight}px`;
            sidebar.style.maxHeight = `${viewportHeight - taskbarHeight}px`;
        }
    }

    // Add these methods to your PersistentSidebar class

    setupCollapsibleSections() {
        // Remove any existing listeners to prevent duplicates
        document.removeEventListener('click', this.handleSectionClick);

        // Add click handler for collapsible sections
        document.addEventListener('click', this.handleSectionClick.bind(this));

        // Initialize all sections as expanded by default
        this.initializeSections();

        // Restore previously saved state
        setTimeout(() => this.restoreCollapsedState(), 100);
    }

    handleSectionClick(e) {
        const header = e.target.closest('.section-header');
        if (!header) return;

        const section = header.closest('.collapsible-section');
        if (!section) return;

        // Toggle collapsed state
        section.classList.toggle('collapsed');

        // Update toggle icon
        const toggle = header.querySelector('.collapse-toggle');
        if (toggle) {
            toggle.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
        }

        // Save state
        setTimeout(() => this.saveCollapsedState(), 100);

        // Auto-scroll to section if it was opened
        if (!section.classList.contains('collapsed')) {
            setTimeout(() => this.scrollToElement(section), 350);
        }
    }

    initializeSections() {
        document.querySelectorAll('.collapsible-section').forEach(section => {
            const toggle = section.querySelector('.collapse-toggle');
            if (toggle && !section.classList.contains('collapsed')) {
                toggle.textContent = '▼';
            }
        });
    }

    saveCollapsedState() {
        const collapsedSections = {};
        document.querySelectorAll('.collapsible-section').forEach(section => {
            const sectionId = section.dataset.section;
            if (sectionId) {
                collapsedSections[sectionId] = section.classList.contains('collapsed');
            }
        });
        localStorage.setItem('sidebarCollapsedSections', JSON.stringify(collapsedSections));
    }

    restoreCollapsedState() {
        const saved = localStorage.getItem('sidebarCollapsedSections');
        if (!saved) return;

        try {
            const collapsedSections = JSON.parse(saved);
            Object.keys(collapsedSections).forEach(sectionId => {
                const section = document.querySelector(`[data-section="${sectionId}"]`);
                if (section && collapsedSections[sectionId]) {
                    section.classList.add('collapsed');
                    const toggle = section.querySelector('.collapse-toggle');
                    if (toggle) {
                        toggle.textContent = '▶';
                    }
                }
            });
        } catch (e) {
            console.warn('Could not restore collapsed state:', e);
        }
    }

    scrollToElement(element) {
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'start'
            });
        }
    }

    // Update your existing init method to include collapsible setup
    async init() {
        await this.loadTemplate();
        this.adjustSidebarHeight();
        this.initializeTheme();
        this.setupEventListeners();
        this.setupTabs();
        this.setupCollapsibleSections(); // Add this line
    }

    initializeTheme() {
        // Check for saved theme preference, default to dark
        const savedTheme = localStorage.getItem('spectrum-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Update toggle button if it exists
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle?.querySelector('.theme-icon');
        const themeText = themeToggle?.querySelector('.theme-text');
        if (savedTheme === 'light') {
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Light';
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'Dark';
        }
    }

    async loadTemplate() {
        try {
            const response = await fetch('./templates/sidebar.html');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const template = await response.text();
            document.body.insertAdjacentHTML('beforeend', template);
            console.log('✅ Sidebar template loaded');
        } catch (error) {
            console.error('❌ Failed to load sidebar template:', error);
        }
    }

    setupEventListeners() {
        // Close button in header
        const closeBtn = document.getElementById('sidebarToggle');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
            console.log('✅ Close button listener added');
        }
        // Open button (floating)
        const openBtn = document.getElementById('openSidebarBtn');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.open());
            console.log('✅ Open button listener added');
        }
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        // SFAF Action buttons
        const validateBtn = document.getElementById('validateSFAFBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateSFAFFields());
        }
        const saveBtn = document.getElementById('saveSFAFBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSFAFData());
        }
        const exportBtn = document.getElementById('exportSFAFBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSFAFData());
        }
        const deleteBtn = document.getElementById('deleteSFAFBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteObject());
        }
        // Dynamic entry buttons
        this.setupDynamicEntries();
        // Geometry events
        this.setupGeometryEvents();
    }

    setupDynamicEntries() {
        // Add frequency entry
        const addFreqBtn = document.getElementById('addFrequencyEntry');
        if (addFreqBtn) {
            addFreqBtn.addEventListener('click', () => this.addFrequencyEntry());
        }
        // Add equipment entry
        const addEquipBtn = document.getElementById('addEquipmentEntry');
        if (addEquipBtn) {
            addEquipBtn.addEventListener('click', () => this.addEquipmentEntry());
        }
        // Add receiver entry
        const addReceiverBtn = document.getElementById('addReceiverEntry');
        if (addReceiverBtn) {
            addReceiverBtn.addEventListener('click', () => this.addReceiverEntry());
        }
        // Add IRAC notes entry
        const addNotesBtn = document.getElementById('addIracNotesEntry');
        if (addNotesBtn) {
            addNotesBtn.addEventListener('click', () => this.addIracNotesEntry());
        }
        // Add comments entry
        const addCommentsBtn = document.getElementById('addCommentsEntry');
        if (addCommentsBtn) {
            addCommentsBtn.addEventListener('click', () => this.addCommentsEntry());
        }
    }

    setupTabs() {
        // Main tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        console.log(`📋 Found ${tabBtns.length} tab buttons`);
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });
        // Subtabs
        this.setupSubtabs();
    }

    setupSubtabs() {
        const subtabBtns = document.querySelectorAll('.subtab-btn');
        console.log(`📋 Found ${subtabBtns.length} subtab buttons`);
        subtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subtabId = btn.dataset.subtab;
                this.switchSubtab(subtabId);
            });
        });
    }

    switchSubtab(subtabId) {
        // Update subtab buttons
        document.querySelectorAll('.subtab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-subtab="${subtabId}"]`)?.classList.add('active');
        // Update subtab panels
        document.querySelectorAll('.subtab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`subtab-${subtabId}`)?.classList.add('active');
        console.log(`✅ Switched to subtab: ${subtabId}`);
    }

    setupGeometryEvents() {
        // Geometry type change
        const geometryType = document.getElementById('geometryType');
        if (geometryType) {
            geometryType.addEventListener('change', () => this.updateGeometryFields());
        }
        // Create geometry
        const createBtn = document.getElementById('createGeometryButton');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createGeometry());
        }
        // Clear form
        const clearBtn = document.getElementById('clearGeometryInput');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearGeometryForm());
        }
        // Circle radius real-time update
        const circleRadius = document.getElementById('circleRadius');
        if (circleRadius) {
            circleRadius.addEventListener('input', () => this.updateGeometryHelp());
        }
        // Opacity slider
        const opacitySlider = document.getElementById('geometryOpacity');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                const opacityValueElement = document.getElementById('opacityValue');
                if (opacityValueElement) {
                    opacityValueElement.textContent = `${value}%`;
                }
            });
        }
        // Management subtab events
        const geometryFilter = document.getElementById('geometryFilter');
        if (geometryFilter) {
            geometryFilter.addEventListener('change', () => this.filterGeometryList());
        }
        const selectAllBtn = document.getElementById('selectAllGeometries');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllGeometries());
        }
        const deleteSelectedBtn = document.getElementById('deleteSelectedGeometries');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedGeometries());
        }
        // Export buttons
        const exportButtons = ['exportGeoJSON', 'exportKML', 'exportCSV'];
        exportButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.exportGeometries(id.replace('export', '').toLowerCase()));
            }
        });
        // Import events
        const importFormat = document.getElementById('importFormat');
        if (importFormat) {
            importFormat.addEventListener('change', () => this.updateImportOptions());
        }
        const importBtn = document.getElementById('importGeometries');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importGeometries());
        }
        const previewBtn = document.getElementById('previewImport');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewImport());
        }
        const bulkTextBtn = document.getElementById('processBulkText');
        if (bulkTextBtn) {
            bulkTextBtn.addEventListener('click', () => this.processBulkText());
        }
    }

    updateGeometryFields() {
        const geometryTypeElement = document.getElementById('geometryType');
        if (!geometryTypeElement) return;

        const geometryType = geometryTypeElement.value;
        // Hide all geometry-specific fields
        document.querySelectorAll('.geometry-specific').forEach(field => {
            field.style.display = 'none';
        });
        // Show relevant fields
        const relevantField = document.getElementById(`${geometryType}Fields`);
        if (relevantField) {
            relevantField.style.display = 'block';
        }
        // Update help text
        this.updateGeometryHelp();
    }

    updateGeometryHelp() {
        const geometryTypeElement = document.getElementById('geometryType');
        const helpText = document.getElementById('geometryHelp');

        if (!geometryTypeElement || !helpText) return;

        const geometryType = geometryTypeElement.value;
        const circleRadius = document.getElementById('circleRadius')?.value;
        const circleUnit = document.getElementById('circleUnit')?.value;

        const helpTexts = {
            marker: 'Enter: latitude, longitude (e.g., 40.7128, -74.0060)',
            circle: `Enter: latitude, longitude${circleRadius ? `, radius: ${circleRadius} ${circleUnit || 'meters'}` : ', radius (optional if set above)'}`,
            rectangle: 'Enter two corners on separate lines: SW corner, then NE corner',
            polygon: 'Enter each vertex on a separate line (latitude, longitude)',
            polyline: 'Enter each point on a separate line (latitude, longitude)'
        };

        helpText.textContent = helpTexts[geometryType] || 'Enter coordinates';
    }

    createGeometry() {
        const geometryTypeElement = document.getElementById('geometryType');
        const inputElement = document.getElementById('geometryInput');
        const colorElement = document.getElementById('geometryColor');
        const opacityElement = document.getElementById('geometryOpacity');

        if (!geometryTypeElement || !inputElement) {
            alert('Required form elements not found');
            return;
        }

        const geometryType = geometryTypeElement.value;
        const input = inputElement.value.trim();
        const color = colorElement ? colorElement.value : '#4CAF50';
        const opacity = opacityElement ? opacityElement.value : '0.7';

        if (!input) {
            alert('Please enter coordinates');
            return;
        }

        const style = {
            color: color,
            fillColor: color,
            opacity: opacity,
            fillOpacity: opacity * 0.3
        };

        try {
            switch (geometryType) {
                case 'marker':
                    this.createMarkerFromText(input, style);
                    break;
                case 'circle':
                    this.createCircleFromText(input, style);
                    break;
                case 'rectangle':
                    this.createRectangleFromText(input, style);
                    break;
                case 'polygon':
                    this.createPolygonFromText(input, style);
                    break;
                case 'polyline':
                    this.createPolylineFromText(input, style);
                    break;
            }
            // Clear form and switch to manage tab
            this.clearGeometryForm();
            this.switchSubtab('manage');
            this.updateGeometryList();
        } catch (error) {
            alert(`Error creating geometry: ${error.message}`);
            console.error('Geometry creation error:', error);
        }
    }

    clearGeometryForm() {
        const input = document.getElementById('geometryInput');
        if (input) input.value = '';
        // Reset to defaults
        const geometryType = document.getElementById('geometryType');
        if (geometryType) geometryType.value = 'marker';
        const color = document.getElementById('geometryColor');
        if (color) color.value = '#4CAF50';
        const opacity = document.getElementById('geometryOpacity');
        if (opacity) {
            opacity.value = '0.7';
            const opacityValue = document.getElementById('opacityValue');
            if (opacityValue) opacityValue.textContent = '70%';
        }
        this.updateGeometryFields();
    }

    // Geometry creation methods
    createMarkerFromText(input, style) {
        console.log('🔧 Creating marker from:', input, 'with style:', style);
        const coords = this.parseCoordinates(input);
        if (coords.length >= 1) {
            // Use your existing marker creation system
            // Example: createManualMarker(coords[0].lat, coords[0].lng);
        }
    }

    createMarkerFromText(input, style) {
        console.log('🔧 Creating marker from:', input, 'with style:', style);
        const coords = this.parseCoordinates(input);
        if (coords.length >= 1) {
            // Use the global createManualMarker function
            if (window.createManualMarker) {
                window.createManualMarker(coords[0].lat, coords[0].lng);
            } else {
                console.error('createManualMarker not available');
            }
        }
    }

    createCircleFromText(input, style) {
        console.log('🔧 Creating circle from:', input, 'with style:', style);
        const coords = this.parseCoordinates(input);
        if (coords.length >= 1) {
            const coord = coords[0];
            const radius = coord.radius || 1000; // Default 1km if no radius specified

            // Create a circle layer and pass it to the handler
            const circle = L.circle([coord.lat, coord.lng], { radius: radius });

            if (window.handleCircleCreation) {
                window.handleCircleCreation(circle);
            } else {
                console.error('handleCircleCreation not available');
            }
        }
    }

    createRectangleFromText(input, style) {
        console.log('🔧 Creating rectangle from:', input, 'with style:', style);
        const coords = this.parseCoordinates(input);
        if (coords.length >= 2) {
            // Create rectangle from two corner points
            const bounds = L.latLngBounds([coords[0].lat, coords[0].lng], [coords[1].lat, coords[1].lng]);
            const rectangle = L.rectangle(bounds);

            if (window.handleRectangleCreation) {
                window.handleRectangleCreation(rectangle);
            } else {
                console.error('handleRectangleCreation not available');
            }
        }
    }

    createPolygonFromText(input, style) {
        console.log('🔧 Creating polygon from:', input, 'with style:', style);
        const coords = this.parseCoordinates(input);
        if (coords.length >= 3) {
            // Create polygon from multiple points
            const latLngs = coords.map(coord => [coord.lat, coord.lng]);
            const polygon = L.polygon(latLngs);

            if (window.handlePolygonCreation) {
                window.handlePolygonCreation(polygon);
            } else {
                console.error('handlePolygonCreation not available');
            }
        }
    }

    // Helper method to convert DMS to decimal
    parseDMSToDecimal(dmsString) {
        const match = dmsString.match(/(\d{2,3})(\d{2})(\d{2})([NSEW])/);
        if (!match) return NaN;

        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const direction = match[4];

        let decimal = degrees + minutes / 60 + seconds / 3600;

        if (direction === 'S' || direction === 'W') {
            decimal = -decimal;
        }

        return decimal;
    }

    parseCoordinates(input) {
        console.log('Parsing input:', input);
        const lines = input.split('\n').filter(line => line.trim());
        const coords = [];

        lines.forEach(line => {
            let lat, lng, radius;

            // Check if it's DMS format like "302521N0864150W"
            const dmsMatch = line.match(/(\d{6}[NS])(\d{7}[EW])/);
            if (dmsMatch) {
                console.log('Found DMS format:', dmsMatch);
                lat = this.parseDMSToDecimal(dmsMatch[1]);
                lng = this.parseDMSToDecimal(dmsMatch[2]);
                console.log('Converted to decimal:', lat, lng);
            } else {
                // Parse as decimal degrees
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    lat = parseFloat(parts[0]);
                    lng = parseFloat(parts[1]);
                    radius = parts[2] ? parseFloat(parts[2]) : undefined;
                    console.log('Parsed decimal:', lat, lng, radius);
                }
            }

            if (!isNaN(lat) && !isNaN(lng)) {
                coords.push({ lat, lng, radius });
                console.log('Added coordinate:', { lat, lng, radius });
            } else {
                console.log('Invalid coordinates:', lat, lng);
            }
        });

        console.log('Final coords array:', coords);
        return coords;
    }


    // Management subtab methods
    filterGeometryList() {
        console.log('🔧 Filtering geometry list...');
        // Implementation needed
    }

    selectAllGeometries() {
        console.log('🔧 Selecting all geometries...');
        // Implementation needed
    }

    deleteSelectedGeometries() {
        console.log('🔧 Deleting selected geometries...');
        // Implementation needed
    }

    updateGeometryList() {
        console.log('🔧 Updating geometry list...');
        // Implementation needed - populate the geometry list
    }

    // Export methods
    exportGeometries(format) {
        console.log(`📤 Exporting geometries as ${format}...`);
        // Implementation needed
    }

    // Import methods
    updateImportOptions() {
        const format = document.getElementById('importFormat');
        if (format) {
            console.log('🔧 Updating import options for:', format.value);
            // Update file input accept attribute based on format
        }
    }

    importGeometries() {
        console.log('📥 Importing geometries...');
        // Implementation needed
    }

    previewImport() {
        console.log('👁️ Previewing import...');
        // Implementation needed
    }

    processBulkText() {
        const bulkTextElement = document.getElementById('bulkTextInput');
        if (bulkTextElement) {
            const bulkText = bulkTextElement.value;
            console.log('🔧 Processing bulk text:', bulkText);
            // Implementation needed
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);

        // Update toggle button
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle?.querySelector('.theme-icon');
        const themeText = themeToggle?.querySelector('.theme-text');

        if (newTheme === 'light') {
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Light';
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'Dark';
        }

        // Save preference
        localStorage.setItem('spectrum-theme', newTheme);
        console.log(`🎨 Switched to ${newTheme} theme`);
    }

    open() {
        const sidebar = document.getElementById('persistentSidebar');
        if (sidebar) {
            sidebar.classList.add('open');
            this.isOpen = true;
            // Adjust height when opening
            this.adjustSidebarHeight();
            console.log('✅ Sidebar opened');
        }
    }

    close() {
        const sidebar = document.getElementById('persistentSidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            this.isOpen = false;
            console.log('✅ Sidebar closed');
        }
    }

    switchTab(tabId) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`tab-${tabId}`)?.classList.add('active');

        this.currentTab = tabId;
        console.log(`✅ Switched to tab: ${tabId}`);
    }

    // Method to show Object tab when marker is clicked
    showObjectTab(markerData) {
        const objectTab = document.getElementById('objectTab');
        if (objectTab) {
            objectTab.style.display = 'block';
            this.switchTab('object');
            this.populateObjectFields(markerData);

            // Open sidebar if closed
            if (!this.isOpen) {
                this.open();
            }
        }
    }

    populateObjectFields(markerData) {
        // Auto-fill location fields (300, 301, 303)
        if (markerData.lat && markerData.lng) {
            // Field 303 - Antenna Coordinates (already exists)
            const field303 = document.getElementById('field303');
            const field403 = document.getElementById('field403');
            const compactCoords = this.formatCoordinates(markerData.lat, markerData.lng);
            if (field303) field303.value = compactCoords;
            if (field403) field403.value = compactCoords;

            // Field 300 - State/Country (extract from coordinates or set default)
            const field300 = document.getElementById('field300');
            if (field300 && !field300.value) {
                // You can implement state detection logic here
                // For now, set a default or leave for user to fill
                field300.value = 'FL'; // Default or detect from coords
            }

            // Field 301 - Antenna Location (extract from marker data or coordinates)
            const field301 = document.getElementById('field301');
            if (field301 && !field301.value) {
                // You can implement location name lookup here
                field301.value = markerData.locationName || 'TBD'; // Use marker name if available
            }
        }

        // Populate all other SFAF fields from markerData
        if (markerData.sfaf) {
            Object.keys(markerData.sfaf).forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = markerData.sfaf[fieldId];
                }
            });
        }

        // Setup field 306 authorization radius functionality
        this.setupAuthorizationRadius(markerData);

        // If this is a circle center marker, add circle-specific controls
        if (markerData.circleProperties) {
            this.addCircleControls(markerData);
        }

        // Setup real-time coordinate updates
        this.setupCoordinateUpdates(markerData);
    }

    setupCoordinateUpdates(markerData) {
        console.log('Setting up coordinate updates for:', markerData);

        // If there's already a listener, remove it
        if (this.coordinateUpdateListener && this.currentMarkerRef) {
            this.currentMarkerRef.off('drag', this.coordinateUpdateListener);
        }

        // Use the globally stored marker reference
        const marker = window.currentSidebarMarker;

        if (!marker) {
            console.error('No current sidebar marker found');
            return;
        }

        this.currentMarkerRef = marker;
        console.log('Using current sidebar marker:', marker);

        // Create update function
        this.coordinateUpdateListener = (e) => {
            const newPos = e.target.getLatLng();
            const newLat = newPos.lat.toFixed(4);
            const newLng = newPos.lng.toFixed(4);

            console.log('Marker dragged to:', newLat, newLng);

            // Update coordinate fields
            const field303 = document.getElementById('field303');
            const field403 = document.getElementById('field403');
            const compactCoords = this.formatCoordinates(newLat, newLng);

            if (field303) field303.value = compactCoords;
            if (field403) field403.value = compactCoords;

            // Update marker data
            markerData.lat = newLat;
            markerData.lng = newLng;
            marker.markerData.lat = newLat;
            marker.markerData.lng = newLng;

            // Update authorization circle
            if (this.authorizationCircle) {
                console.log('Moving auth circle to:', newPos);
                this.authorizationCircle.setLatLng(newPos);
            }
        };
        // Add the listener
        marker.on('drag', this.coordinateUpdateListener);
    }

    setupAuthorizationRadius(markerData) {
        const field306 = document.getElementById('field306');
        if (!field306) return;

        // Add input validation and formatting
        field306.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase(); // Convert to uppercase

            // Remove any characters that aren't numbers, B, or T
            value = value.replace(/[^0-9BT]/g, '');

            // Ensure only one B or T at the end
            const numberPart = value.replace(/[BT]/g, '');
            const letterPart = value.match(/[BT]/g);

            if (letterPart && letterPart.length > 0) {
                // Keep only the last B or T
                value = numberPart + letterPart[letterPart.length - 1];
            } else {
                value = numberPart;
            }

            e.target.value = value;
        });

        // Create checkbox and controls if they don't exist
        let authRadiusControls = document.getElementById('authRadiusControls');
        if (!authRadiusControls) {
            authRadiusControls = document.createElement('div');
            authRadiusControls.id = 'authRadiusControls';
            authRadiusControls.innerHTML = `
            <div class="form-row">
                <label>
                    <input type="checkbox" id="showAuthRadius" checked> 
                    Show Authorization Radius Circle
                </label>
                <small class="field-help">Examples: 5, 10B, 25T</small>
            </div>
        `;

            // Insert after field306
            field306.parentNode.insertBefore(authRadiusControls, field306.nextSibling);
        }

        const showAuthCheckbox = document.getElementById('showAuthRadius');

        // Create or update authorization circle
        // In setupAuthorizationRadius method, update the updateAuthRadius function:
        const updateAuthRadius = () => {
            const radiusValue = field306.value;
            const showCircle = showAuthCheckbox.checked;

            // Remove existing circle
            if (this.authorizationCircle) {
                console.log('Removing existing auth circle');
                window.map.removeLayer(this.authorizationCircle);
                this.authorizationCircle = null;
            }

            if (showCircle && radiusValue) {
                // Parse the radius value, ignoring B or T
                const numericValue = this.parseRadiusValue(radiusValue);

                if (numericValue && !isNaN(numericValue)) {
                    const radiusMeters = numericValue * 1000; // Convert km to meters

                    console.log(`Creating auth circle: ${numericValue} km at`, markerData.lat, markerData.lng);

                    // Create circle at marker position
                    this.authorizationCircle = L.circle([parseFloat(markerData.lat), parseFloat(markerData.lng)], {
                        radius: radiusMeters,
                        color: '#ff6b6b',
                        fillColor: '#ff6b6b',
                        fillOpacity: 0.1,
                        opacity: 0.6,
                        weight: 2,
                        dashArray: '5, 5' // Dashed line
                    }).addTo(window.map);

                    // Add tooltip
                    this.authorizationCircle.bindTooltip(
                        `<b>Authorization Radius</b><br>
                 Radius: ${numericValue} km<br>
                 Field 306: ${radiusValue}`,
                        { permanent: false }
                    );

                    console.log('Authorization circle created and stored:', this.authorizationCircle);
                }
            }
        };

        // Event listeners
        field306.addEventListener('input', updateAuthRadius);
        showAuthCheckbox.addEventListener('change', updateAuthRadius);

        // Initial setup
        updateAuthRadius();
    }

    parseRadiusValue(radiusString) {
        if (!radiusString) return null;

        // Remove B or T suffix and parse the number
        const numericPart = radiusString.replace(/[BT]/g, '');
        const parsed = parseFloat(numericPart);

        return isNaN(parsed) ? null : parsed;
    }

    updateAuthorizationCircle(newPosition) {
        if (this.authorizationCircle) {
            this.authorizationCircle.setLatLng(newPosition);
        }
    }

    close() {
        const sidebar = document.getElementById('persistentSidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            this.isOpen = false;

            // Clean up authorization circle
            if (this.authorizationCircle) {
                window.map.removeLayer(this.authorizationCircle);
                this.authorizationCircle = null;
            }

            // Clean up coordinate update listener
            if (this.coordinateUpdateListener && this.currentMarkerRef) {
                this.currentMarkerRef.off('drag', this.coordinateUpdateListener);
            }

            console.log('✅ Sidebar closed');
        }
    }

    addCircleControls(markerData) {
        // Find a place to add circle controls (maybe after existing SFAF fields)
        const objectTab = document.getElementById('tab-object');
        if (!objectTab) return;

        // Remove existing circle controls
        const existingControls = document.getElementById('circleControls');
        if (existingControls) {
            existingControls.remove();
        }

        // Create circle controls section
        const circleSection = document.createElement('div');
        circleSection.id = 'circleControls';
        circleSection.innerHTML = `
            <div class="field-group circle-section">
                <h4>Circle Properties</h4>
                
                <div class="form-row">
                    <label for="circleRadiusEdit">Radius:</label>
                    <input type="number" id="circleRadiusEdit" 
                           value="${markerData.circleProperties.radius}" 
                           min="0.1" step="0.1">
                    <select id="circleUnitEdit">
                        <option value="km" ${markerData.circleProperties.unit === 'km' ? 'selected' : ''}>km</option>
                        <option value="nm" ${markerData.circleProperties.unit === 'nm' ? 'selected' : ''}>nm</option>
                    </select>
                </div>
                
                <div class="form-row">
                    <label for="circleColorEdit">Color:</label>
                    <input type="color" id="circleColorEdit" value="${markerData.circleProperties.color}">
                </div>
                
                <div class="form-row">
                    <button id="updateCircleBtn" type="button" class="btn-secondary">Update Circle</button>
                    <button id="deleteCircleBtn" type="button" class="btn-danger">Delete Circle</button>
                </div>
            </div>
        `;

        // Append to the object tab
        objectTab.appendChild(circleSection);

        // Add event listeners for circle controls
        this.setupCircleControls(markerData);
    }

    setupCircleControls(markerData) {
        const radiusInput = document.getElementById('circleRadiusEdit');
        const unitSelect = document.getElementById('circleUnitEdit');
        const colorInput = document.getElementById('circleColorEdit');
        const updateBtn = document.getElementById('updateCircleBtn');
        const deleteBtn = document.getElementById('deleteCircleBtn');

        // Real-time radius updates
        if (radiusInput && unitSelect) {
            const updateRadius = () => {
                const newRadius = parseFloat(radiusInput.value) || 1;
                const newUnit = unitSelect.value;
                const radiusMeters = newUnit === 'km' ? newRadius * 1000 : newRadius * 1852;

                if (markerData.circleProperties.layer) {
                    markerData.circleProperties.layer.setRadius(radiusMeters);
                    markerData.circleProperties.radius = newRadius;
                    markerData.circleProperties.unit = newUnit;

                    // Update tooltip - import updateCircleTooltip from markers.js
                    if (window.updateCircleTooltip) {
                        window.updateCircleTooltip(markerData.circleProperties.layer, markerData.marker);
                    }
                }
            };

            radiusInput.addEventListener('input', updateRadius);
            unitSelect.addEventListener('change', updateRadius);
        }

        // Color updates
        if (colorInput) {
            colorInput.addEventListener('change', () => {
                const newColor = colorInput.value;
                if (markerData.circleProperties.layer) {
                    markerData.circleProperties.layer.setStyle({
                        color: newColor,
                        fillColor: newColor,
                        fillOpacity: 0.3
                    });
                    markerData.circleProperties.color = newColor;
                }
            });
        }

        // Update button (save all changes)
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.saveSFAFData();
            });
        }

        // Delete button
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Delete this circle?')) {
                    if (markerData.circleProperties.layer) {
                        map.removeLayer(markerData.circleProperties.layer);
                    }
                    this.deleteObject();
                }
            });
        }
    }

    formatCoordinates(lat, lng) {
        try {
            const latDMS = decimalToCompactDMS(parseFloat(lat), false);
            const lngDMS = decimalToCompactDMS(parseFloat(lng), true);
            return `${latDMS}${lngDMS}`;
        } catch (error) {
            console.error('Error formatting coordinates:', error);
            return `${lat},${lng}`;
        }
    }

    // Placeholder methods for dynamic entries
    addFrequencyEntry() {
        console.log('🔧 Adding frequency entry...');
        // Implementation needed
    }

    addEquipmentEntry() {
        console.log('🔧 Adding equipment entry...');
        // Implementation needed
    }

    addReceiverEntry() {
        console.log('🔧 Adding receiver entry...');
        // Implementation needed
    }

    addIracNotesEntry() {
        console.log('🔧 Adding IRAC notes entry...');
        // Implementation needed
    }

    addCommentsEntry() {
        console.log('🔧 Adding comments entry...');
        // Implementation needed
    }

    validateSFAFFields() {
        console.log('🔍 Validating SFAF fields...');
        // Add validation logic here
    }

    saveSFAFData() {
        console.log('💾 Saving SFAF data...');
        // Collect and save SFAF data
    }

    exportSFAFData() {
        console.log('📤 Exporting SFAF data...');
        // Export to SFAF format
    }

    deleteObject() {
        if (confirm('Are you sure you want to delete this object?')) {
            console.log('🗑️ Deleting object...');
        }
    }
}

export const persistentSidebar = new PersistentSidebar();