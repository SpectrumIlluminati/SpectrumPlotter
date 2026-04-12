/**
 * Field 530 Polygon Manager
 * Handles MC4EB Pub 7 CHG 1 Field 530 Authorized Areas (polygons)
 */

class Field530PolygonManager {
    constructor(map) {
        this.map = map;
        this.polygonLayer = L.layerGroup().addTo(map);
        this.polygons = new Map(); // marker_id -> L.Polygon
        this.polygonData = new Map(); // marker_id -> polygon data
        this.isVisible = true;
    }

    /**
     * Fetch all Field 530 polygons from the API
     */
    async fetchAllPolygons() {
        try {
            console.log('📐 Fetching Field 530 polygons...');
            const response = await fetch('/api/sfaf/field530/polygons');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                console.log(`✅ Loaded ${result.count} Field 530 polygons`);
                return result.data;
            } else {
                console.warn('⚠️ No Field 530 polygon data returned');
                return [];
            }
        } catch (error) {
            console.error('❌ Error fetching Field 530 polygons:', error);
            return [];
        }
    }

    /**
     * Fetch Field 530 polygon for a specific marker
     */
    async fetchPolygonByMarker(markerId) {
        try {
            const response = await fetch(`/api/sfaf/field530/marker/${markerId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`ℹ️ No Field 530 polygon found for marker ${markerId}`);
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error(`❌ Error fetching Field 530 polygon for marker ${markerId}:`, error);
            return null;
        }
    }

    /**
     * Validate Field 530 coordinate format
     */
    async validateCoordinate(value) {
        try {
            const response = await fetch('/api/sfaf/field530/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error validating Field 530 coordinate:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Display all Field 530 polygons on the map
     */
    async loadAndDisplayPolygons() {
        const polygons = await this.fetchAllPolygons();

        polygons.forEach(polygonData => {
            this.displayPolygon(polygonData);
        });

        console.log(`📐 Displayed ${polygons.length} Field 530 polygons on map`);
    }

    /**
     * Display a single Field 530 polygon on the map
     */
    displayPolygon(polygonData) {
        const { marker_id, serial_number, polygon } = polygonData;

        // Skip if polygon is invalid (less than 3 points)
        if (!polygon.is_valid || polygon.coordinates.length < 3) {
            console.warn(`⚠️ Invalid polygon for marker ${marker_id} (${polygon.coordinates.length} points)`);
            return;
        }

        // Convert coordinates to Leaflet format [lat, lng]
        const latLngs = polygon.coordinates.map(coord => [
            coord.latitude,
            coord.longitude
        ]);

        // Determine polygon color based on type
        const colors = {
            'transmit': '#0066ff',  // Blue
            'receive': '#00cc00',   // Green
            'both': '#9933ff'       // Purple
        };
        const color = colors[polygon.type] || '#666666';

        // Create Leaflet polygon
        const leafletPolygon = L.polygon(latLngs, {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2,
            opacity: 0.8
        });

        // Create popup content
        const popupContent = this.createPolygonPopup(polygonData);
        leafletPolygon.bindPopup(popupContent);

        // Add tooltip with serial number
        leafletPolygon.bindTooltip(serial_number, {
            permanent: false,
            direction: 'center',
            className: 'polygon-tooltip'
        });

        // Add to layer group
        leafletPolygon.addTo(this.polygonLayer);

        // Store reference
        this.polygons.set(marker_id, leafletPolygon);
        this.polygonData.set(marker_id, polygonData);

        // Add click event to highlight
        leafletPolygon.on('click', (e) => {
            this.highlightPolygon(marker_id);
        });
    }

    /**
     * Create popup content for a polygon
     */
    createPolygonPopup(polygonData) {
        const { marker_id, serial_number, polygon } = polygonData;

        const typeLabels = {
            'transmit': 'Transmitting (ART)',
            'receive': 'Receiving (ARR)',
            'both': 'Transmit & Receive (ARB)'
        };

        const typeLabel = typeLabels[polygon.type] || polygon.type;
        const coordCount = polygon.coordinates.length;

        return `
            <div class="field530-popup">
                <h4>📐 Field 530 Authorized Area</h4>
                <table>
                    <tr>
                        <td><strong>Serial:</strong></td>
                        <td>${serial_number}</td>
                    </tr>
                    <tr>
                        <td><strong>Type:</strong></td>
                        <td>${typeLabel}</td>
                    </tr>
                    <tr>
                        <td><strong>Vertices:</strong></td>
                        <td>${coordCount} points</td>
                    </tr>
                    <tr>
                        <td><strong>Marker ID:</strong></td>
                        <td><small>${marker_id}</small></td>
                    </tr>
                </table>
                <button onclick="field530Manager.viewPolygonDetails('${marker_id}')" class="btn-view-details">
                    View Details
                </button>
            </div>
        `;
    }

    /**
     * Highlight a specific polygon
     */
    highlightPolygon(markerId) {
        // Reset all polygons to normal style
        this.polygons.forEach((polygon, id) => {
            const data = this.polygonData.get(id);
            const colors = {
                'transmit': '#0066ff',
                'receive': '#00cc00',
                'both': '#9933ff'
            };
            const color = colors[data.polygon.type] || '#666666';

            polygon.setStyle({
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.2
            });
        });

        // Highlight selected polygon
        const selectedPolygon = this.polygons.get(markerId);
        if (selectedPolygon) {
            selectedPolygon.setStyle({
                weight: 4,
                opacity: 1.0,
                fillOpacity: 0.4
            });
            selectedPolygon.bringToFront();
        }
    }

    /**
     * View detailed information about a polygon
     */
    viewPolygonDetails(markerId) {
        const data = this.polygonData.get(markerId);
        if (!data) {
            console.error(`No polygon data found for marker ${markerId}`);
            return;
        }

        // Create modal with detailed coordinate information
        const modal = document.createElement('div');
        modal.className = 'field530-details-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <h3>📐 Field 530 Polygon Details</h3>
                <p><strong>Serial Number:</strong> ${data.serial_number}</p>
                <p><strong>Type:</strong> ${data.polygon.type}</p>

                <h4>Coordinates:</h4>
                <table class="coordinates-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Code</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                            <th>Raw Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.polygon.coordinates.map((coord, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${coord.code}</td>
                                <td>${coord.latitude.toFixed(6)}°</td>
                                <td>${coord.longitude.toFixed(6)}°</td>
                                <td><code>${coord.raw_value}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <button onclick="this.closest('.field530-details-modal').remove()" class="btn-close">
                    Close
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Remove a polygon from the map
     */
    removePolygon(markerId) {
        const polygon = this.polygons.get(markerId);
        if (polygon) {
            this.polygonLayer.removeLayer(polygon);
            this.polygons.delete(markerId);
            this.polygonData.delete(markerId);
        }
    }

    /**
     * Clear all polygons from the map
     */
    clearAllPolygons() {
        this.polygonLayer.clearLayers();
        this.polygons.clear();
        this.polygonData.clear();
    }

    /**
     * Toggle polygon visibility
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.polygonLayer.addTo(this.map);
        } else {
            this.polygonLayer.remove();
        }
        return this.isVisible;
    }

    /**
     * Zoom to fit all polygons in view
     */
    zoomToPolygons() {
        if (this.polygons.size === 0) {
            console.warn('No polygons to zoom to');
            return;
        }

        const bounds = L.latLngBounds();
        this.polygons.forEach(polygon => {
            bounds.extend(polygon.getBounds());
        });

        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    /**
     * Get polygon count
     */
    getPolygonCount() {
        return this.polygons.size;
    }
}

// Initialize global instance when map is ready
let field530Manager = null;

// Auto-initialize when map is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for map to be initialized
    const initInterval = setInterval(() => {
        if (typeof map !== 'undefined' && map) {
            field530Manager = new Field530PolygonManager(map);

            // Load polygons automatically
            field530Manager.loadAndDisplayPolygons();

            console.log('✅ Field 530 Polygon Manager initialized');
            clearInterval(initInterval);
        }
    }, 100);
});
