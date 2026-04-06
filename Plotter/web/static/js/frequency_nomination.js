// Frequency Nomination Tool - Converted from VBA
// Performs frequency deconfliction analysis and generates nomination lists

class FrequencyNomination {
    constructor() {
        this.orConstraints = [];
        this.andConstraints = [];
        this.numFreqsToAnalyze = 1;
        this.freqSet = [];
        this.recordsToAvoidEMI = [];
        this.init();
    }

    init() {
        console.log('🎯 Frequency Nomination Tool initialized');
    }

    // ==================== Bandwidth Calculation ====================

    /**
     * Calculate bandwidth from Emission Designator
     * Converted from VBA function: getBandwidthEMS()
     *
     * @param {string} inputEMS - Emission designator (e.g., "6K00A3E", "130MA3E")
     * @param {string} unit - Output unit: "H" (Hz), "K" (kHz), "M" (MHz), "G" (GHz)
     * @returns {number} - Bandwidth in specified unit
     *
     * Examples:
     * getBandwidthEMS("6K00A3E", "M") → 0.006
     * getBandwidthEMS("130MA3E", "M") → 130
     * getBandwidthEMS("10H00P23E", "M") → 0.00001
     */
    getBandwidthEMS(inputEMS, unit = "M") {
        if (!inputEMS || typeof inputEMS !== 'string') {
            console.error('Invalid emission designator:', inputEMS);
            return 0;
        }

        const EMS = inputEMS.toUpperCase().trim();
        const freqUnits = ['H', 'K', 'M', 'G'];

        let bandwidthLocation = 0;
        let bandwidthUnit = 0;

        // Find the bandwidth unit location (H, K, M, or G)
        for (let i = 0; i < freqUnits.length && bandwidthLocation === 0; i++) {
            const pos = EMS.indexOf(freqUnits[i]);
            if (pos >= 0 && pos < 5) {
                bandwidthLocation = pos;
                bandwidthUnit = i;
            }
        }

        if (bandwidthLocation === 0 || bandwidthLocation >= 5) {
            console.warn('No valid bandwidth unit found in EMS:', inputEMS);
            return 0;
        }

        // Find the modulation type location (first letter after bandwidth)
        let modulationTypeLocation = 0;
        for (let i = bandwidthLocation + 1; i < EMS.length && modulationTypeLocation === 0; i++) {
            const charCode = EMS.charCodeAt(i);
            // Check if character is a letter (A-Z, a-z)
            if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
                modulationTypeLocation = i;
            }
        }

        if (modulationTypeLocation === 0) {
            console.error('No modulation type found in EMS:', inputEMS);
            return 0;
        }

        // Extract bandwidth numerals and insert decimal if needed
        let outputString = '';

        if (bandwidthLocation === 0 && modulationTypeLocation === 1) {
            // Error - No Bandwidth
            return 0;
        } else if (bandwidthLocation === 0 && modulationTypeLocation >= 2) {
            // e.g., "H4A" → "0.4"
            outputString = '0.' + EMS.substring(bandwidthLocation + 1, modulationTypeLocation);
        } else if (bandwidthLocation > 0 && modulationTypeLocation === bandwidthLocation + 1) {
            // e.g., "6KA" → "6"
            outputString = EMS.substring(0, bandwidthLocation);
        } else if (bandwidthLocation > 0 && modulationTypeLocation > bandwidthLocation + 1) {
            // e.g., "6K00A3E" → "6.00"
            outputString = EMS.substring(0, bandwidthLocation) + '.' +
                          EMS.substring(bandwidthLocation + 1, modulationTypeLocation);
        } else {
            console.error('Bad emission designator format:', inputEMS);
            return 0;
        }

        // Convert to Hz
        const outputHz = parseFloat(outputString) * Math.pow(10, bandwidthUnit * 3);

        if (isNaN(outputHz)) {
            console.error('Failed to parse bandwidth from:', inputEMS);
            return 0;
        }

        // Convert to desired unit
        const decimalPlaces = 12;
        let result = 0;

        switch (unit.toUpperCase()) {
            case 'H':
                result = outputHz;
                break;
            case 'K':
                result = outputHz / 1e3;
                break;
            case 'M':
                result = outputHz / 1e6;
                break;
            case 'G':
                result = outputHz / 1e9;
                break;
            default:
                console.error('Invalid unit specified:', unit);
                return 0;
        }

        return this.round(result, decimalPlaces);
    }

    /**
     * Round number to specified decimal places
     */
    round(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    /**
     * Test bandwidth calculation with various emission designators
     * Converted from VBA: testBandwidths()
     */
    testBandwidths() {
        const testArray = [
            "10H00P23E", "200HJ323", "H4A", "H45A",
            "3KA", "3K4A", "3K45A", "23MA253",
            "23M4W345", "123M00Ujwg", "123GWgw3",
            "123G40Hg2g", "123G45Q2G34"
        ];

        console.log('🧪 Testing Bandwidth Calculations:');
        testArray.forEach(ems => {
            const bw = this.getBandwidthEMS(ems, "M");
            console.log(`${ems.padEnd(15)} → ${bw} MHz`);
        });

        return testArray.map(ems => ({
            emissionDesignator: ems,
            bandwidthMHz: this.getBandwidthEMS(ems, "M"),
            bandwidthKHz: this.getBandwidthEMS(ems, "K"),
            bandwidthHz: this.getBandwidthEMS(ems, "H")
        }));
    }

    // ==================== Bandwidth Calculation for Records ====================

    /**
     * Calculate bandwidths for frequency deconfliction
     * Converted from VBA: Calculate_Bandwidths_for_Frequency_Deconfliction()
     *
     * @param {Array} records - Array of SFAF records to analyze
     * @returns {Array} - Records with calculated widest bandwidth
     */
    calculateBandwidthsForDeconfliction(records) {
        if (!Array.isArray(records)) {
            console.error('Records must be an array');
            return [];
        }

        return records.map(record => {
            let widestBandwidthMHz = 0;

            // Check all emission designator fields (field113, field114, etc.)
            const emissionFields = [
                'field113', 'field114', 'field115', 'field116',
                'field117', 'field118'
            ];

            emissionFields.forEach(fieldKey => {
                if (record.sfafFields && record.sfafFields[fieldKey]) {
                    const ems = record.sfafFields[fieldKey];
                    const bw = this.getBandwidthEMS(ems, 'M');

                    if (bw > widestBandwidthMHz) {
                        widestBandwidthMHz = bw;
                    }
                }
            });

            // Calculate occupied bandwidth lower and upper frequencies
            const centerFreq = this.parseFrequency(record.frequency || record.sfafFields?.field110);

            return {
                ...record,
                widestBandwidthMHz: widestBandwidthMHz,
                lowerFrequencyMHz: centerFreq - (widestBandwidthMHz / 2),
                upperFrequencyMHz: centerFreq + (widestBandwidthMHz / 2)
            };
        });
    }

    /**
     * Parse frequency string to MHz
     * Handles formats like "K4460.5", "M225.8", "G1.5"
     */
    parseFrequency(freqString) {
        if (!freqString || typeof freqString !== 'string') {
            return 0;
        }

        const match = freqString.match(/([HKMG])?([\d.]+)/i);
        if (!match) return 0;

        const unit = (match[1] || 'M').toUpperCase();
        const value = parseFloat(match[2]);

        switch (unit) {
            case 'H': return value / 1e6;
            case 'K': return value / 1e3;
            case 'M': return value;
            case 'G': return value * 1e3;
            default: return value;
        }
    }

    // ==================== Frequency Set Creation ====================

    /**
     * Create frequency set for analysis
     * Converted from VBA: Create_Frequency_Set()
     *
     * @param {boolean} useChannelPlan - Whether to use channel plan constraints
     * @returns {Array} - Frequency set array
     */
    createFrequencySet(useChannelPlan = false) {
        // Determine how many frequencies need to be analyzed at a time
        if (useChannelPlan) {
            // TODO: Implement channel plan logic
            // For now, default to 1
            this.numFreqsToAnalyze = 1;
        } else {
            this.numFreqsToAnalyze = 1;
        }

        // Create array for frequency set
        this.freqSet = new Array(this.numFreqsToAnalyze).fill(null);

        return this.freqSet;
    }

    // ==================== Frequency Deconfliction ====================

    /**
     * Check if a frequency conflicts with existing records
     *
     * @param {number} proposedFreqMHz - Proposed frequency in MHz
     * @param {number} proposedBandwidthMHz - Proposed bandwidth in MHz
     * @param {Array} existingRecords - Records to avoid interference with
     * @param {number} guardBandMHz - Guard band in MHz (default 0)
     * @returns {Object} - {hasConflict: boolean, conflicts: Array}
     */
    checkFrequencyConflict(proposedFreqMHz, proposedBandwidthMHz, existingRecords, guardBandMHz = 0) {
        const proposedLower = proposedFreqMHz - (proposedBandwidthMHz / 2) - guardBandMHz;
        const proposedUpper = proposedFreqMHz + (proposedBandwidthMHz / 2) + guardBandMHz;

        const conflicts = [];

        existingRecords.forEach(record => {
            if (!record.lowerFrequencyMHz || !record.upperFrequencyMHz) {
                return;
            }

            // Check for overlap
            const hasOverlap = !(proposedUpper < record.lowerFrequencyMHz ||
                                proposedLower > record.upperFrequencyMHz);

            if (hasOverlap) {
                conflicts.push({
                    record: record,
                    proposedRange: `${proposedLower.toFixed(3)} - ${proposedUpper.toFixed(3)} MHz`,
                    existingRange: `${record.lowerFrequencyMHz.toFixed(3)} - ${record.upperFrequencyMHz.toFixed(3)} MHz`,
                    overlap: this.calculateOverlap(proposedLower, proposedUpper,
                                                   record.lowerFrequencyMHz, record.upperFrequencyMHz)
                });
            }
        });

        return {
            hasConflict: conflicts.length > 0,
            conflicts: conflicts
        };
    }

    /**
     * Calculate overlap between two frequency ranges
     */
    calculateOverlap(lower1, upper1, lower2, upper2) {
        const overlapLower = Math.max(lower1, lower2);
        const overlapUpper = Math.min(upper1, upper2);
        const overlapMHz = Math.max(0, overlapUpper - overlapLower);

        return {
            lowerMHz: overlapLower,
            upperMHz: overlapUpper,
            bandwidthMHz: overlapMHz
        };
    }

    /**
     * Generate frequency nomination list
     *
     * @param {Object} params - Parameters for nomination
     * @returns {Array} - List of nominated frequencies
     */
    generateNominationList(params) {
        const {
            startFreqMHz,
            endFreqMHz,
            stepKHz = 25,
            bandwidthMHz,
            existingRecords = [],
            guardBandMHz = 0,
            maxResults = 100
        } = params;

        const nominations = [];
        let currentFreq = startFreqMHz;
        const stepMHz = stepKHz / 1000;

        while (currentFreq <= endFreqMHz && nominations.length < maxResults) {
            const conflict = this.checkFrequencyConflict(
                currentFreq,
                bandwidthMHz,
                existingRecords,
                guardBandMHz
            );

            if (!conflict.hasConflict) {
                nominations.push({
                    frequencyMHz: currentFreq,
                    frequencyFormatted: this.formatFrequency(currentFreq),
                    bandwidthMHz: bandwidthMHz,
                    status: 'Available',
                    conflicts: []
                });
            }

            currentFreq += stepMHz;
        }

        return nominations;
    }

    /**
     * Format frequency for display
     */
    formatFrequency(freqMHz) {
        if (freqMHz < 1) {
            return `K${(freqMHz * 1000).toFixed(3)}`;
        } else if (freqMHz < 1000) {
            return `M${freqMHz.toFixed(3)}`;
        } else {
            return `G${(freqMHz / 1000).toFixed(3)}`;
        }
    }

    // ==================== Constraint Management ====================

    /**
     * Compile AND constraints table
     * All constraints must be satisfied
     */
    compileAndConstraints(constraints) {
        this.andConstraints = constraints || [];
        return this.andConstraints;
    }

    /**
     * Compile OR constraints table
     * At least one constraint must be satisfied
     */
    compileOrConstraints(constraints) {
        this.orConstraints = constraints || [];
        return this.orConstraints;
    }

    /**
     * Check if frequency meets all AND constraints
     */
    checkAndConstraints(frequency, bandwidth) {
        return this.andConstraints.every(constraint => {
            return this.evaluateConstraint(frequency, bandwidth, constraint);
        });
    }

    /**
     * Check if frequency meets at least one OR constraint
     */
    checkOrConstraints(frequency, bandwidth) {
        if (this.orConstraints.length === 0) {
            return true; // No OR constraints means it passes
        }

        return this.orConstraints.some(constraint => {
            return this.evaluateConstraint(frequency, bandwidth, constraint);
        });
    }

    /**
     * Evaluate a single constraint
     */
    evaluateConstraint(frequency, bandwidth, constraint) {
        // TODO: Implement constraint evaluation logic
        // This will depend on the constraint type (frequency range, bandwidth, etc.)
        return true;
    }

    // ==================== Input Validation ====================

    /**
     * Validate input parameters
     * Converted from VBA: Input_Validation()
     */
    validateInput(params) {
        const errors = [];

        if (!params.startFreqMHz || params.startFreqMHz <= 0) {
            errors.push('Start frequency must be greater than 0');
        }

        if (!params.endFreqMHz || params.endFreqMHz <= 0) {
            errors.push('End frequency must be greater than 0');
        }

        if (params.startFreqMHz >= params.endFreqMHz) {
            errors.push('Start frequency must be less than end frequency');
        }

        if (!params.bandwidthMHz || params.bandwidthMHz <= 0) {
            errors.push('Bandwidth must be greater than 0');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Initialize on page load
let frequencyNomination;
window.addEventListener('DOMContentLoaded', () => {
    frequencyNomination = new FrequencyNomination();
});
