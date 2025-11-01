// 1. Field specifications object - Complete SFAF field specifications with character limits and max occurrences from MCEB Pub 7
const sfafFieldSpecs = {
    // Administrative Data
    'field005': { maxLength: 2, maxOccurrences: 1, title: 'Security Classification', options: ['U', 'UE', 'C', 'S'] },
    'field010': { maxLength: 1, maxOccurrences: 1, title: 'Type of Action', options: ['M', 'N', 'D', 'R'] },
    'field013': { maxLength: 35, maxOccurrences: 1, title: 'Declassification Instruction Comment' },
    'field019': { maxLength: 8, maxOccurrences: 1, title: 'Declassification Date' },
    'field102': { maxLength: 10, maxOccurrences: 1, title: 'Agency Serial Number' },
    'field701': { maxLength: 3, maxOccurrences: 1, title: 'Frequency Action Officer' },
    'field702': { maxLength: 15, maxOccurrences: 1, title: 'Control/Request Number' },

    // Emission Characteristics (Dynamic - up to 20 occurrences each per MCEB Pub 7)
    'field110': { maxLength: 11, maxOccurrences: 1, title: 'Frequency(ies)' },
    'field113': { maxLength: 4, maxOccurrences: 20, title: 'Station Class' },
    'field114': { maxLength: 11, maxOccurrences: 20, title: 'Emission Designator' },
    'field115': { maxLength: 9, maxOccurrences: 20, title: 'Transmitter Power' },
    'field116': { maxLength: 1, maxOccurrences: 20, title: 'Power Type', options: ['C', 'M', 'P'] },
    'field117': { maxLength: 6, maxOccurrences: 20, title: 'Effective Radiated Power' },
    'field118': { maxLength: 1, maxOccurrences: 20, title: 'Power/ERP Augmentation' },

    // Time/Date Information
    'field130': { maxLength: 4, maxOccurrences: 1, title: 'Time' },
    'field131': { maxLength: 2, maxOccurrences: 1, title: 'Percent Time' },
    'field140': { maxLength: 8, maxOccurrences: 1, title: 'Required Date (YYYYMMDD)' },
    'field141': { maxLength: 8, maxOccurrences: 1, title: 'Expiration Date (YYYYMMDD)' },
    'field142': { maxLength: 8, maxOccurrences: 1, title: 'Review Date (YYYYMMDD)' },
    'field143': { maxLength: 8, maxOccurrences: 1, title: 'Revision Date (YYYYMMDD)' },
    'field144': { maxLength: 1, maxOccurrences: 1, title: 'Approval Authority', options: ['Y', 'N', 'U'] },

    // Organizational Information
    'field200': { maxLength: 6, maxOccurrences: 1, title: 'Agency', options: ['USAF', 'USA', 'USN', 'USMC', 'USCG'] },
    'field201': { maxLength: 8, maxOccurrences: 10, title: 'Unified Command' },
    'field202': { maxLength: 8, maxOccurrences: 10, title: 'Unified Command Service' },
    'field204': { maxLength: 18, maxOccurrences: 1, title: 'Command' },
    'field205': { maxLength: 18, maxOccurrences: 1, title: 'Subcommand' },
    'field206': { maxLength: 18, maxOccurrences: 1, title: 'Installation Frequency Manager' },
    'field207': { maxLength: 18, maxOccurrences: 10, title: 'Operating Unit' },
    'field209': { maxLength: 18, maxOccurrences: 10, title: 'Area AFC/DoD AFC' },

    // Transmitter Location (Geographic codes A-Z per MCEB Pub 7 Annex E)
    'field300': { maxLength: 4, maxOccurrences: 1, title: 'State/Country' },
    'field301': { maxLength: 24, maxOccurrences: 1, title: 'Antenna Location' },
    'field303': { maxLength: 15, maxOccurrences: 1, title: 'Antenna Coordinates' },
    'field306': { maxLength: 5, maxOccurrences: 1, title: 'Authorized Radius' },

    // Transmitter Equipment (Dynamic - up to 10 occurrences each per MCEB Pub 7)
    'field340': { maxLength: 18, maxOccurrences: 10, title: 'Equipment Nomenclature' },
    'field343': { maxLength: 15, maxOccurrences: 10, title: 'Equipment Certification ID' },

    // Transmitter Antenna
    'field357': { maxLength: 4, maxOccurrences: 10, title: 'Antenna Gain' },
    'field362': { maxLength: 3, maxOccurrences: 10, title: 'Antenna Orientation' },
    'field363': { maxLength: 1, maxOccurrences: 10, title: 'Antenna Polarization', options: ['V', 'H', 'C'] },
    'field373': { maxLength: 1, maxOccurrences: 1, title: 'JSC Area Code' },

    // Receiver Location
    'field400': { maxLength: 4, maxOccurrences: 1, title: 'State/Country' },
    'field401': { maxLength: 24, maxOccurrences: 1, title: 'Antenna Location' },
    'field403': { maxLength: 15, maxOccurrences: 1, title: 'Antenna Coordinates' },

    // Receiver Equipment (Dynamic - up to 10 occurrences each per MCEB Pub 7)
    'field440': { maxLength: 18, maxOccurrences: 10, title: 'Equipment Nomenclature' },
    'field443': { maxLength: 15, maxOccurrences: 10, title: 'Equipment Certification ID' },

    // Receiver Antenna
    'field457': { maxLength: 4, maxOccurrences: 10, title: 'Antenna Gain' },
    'field462': { maxLength: 3, maxOccurrences: 10, title: 'Antenna Orientation' },
    'field463': { maxLength: 1, maxOccurrences: 10, title: 'Antenna Polarization', options: ['V', 'H', 'C'] },
    'field473': { maxLength: 1, maxOccurrences: 1, title: 'JSC Area Code', options: ['A', 'B', 'C', 'D'] },

    // Supplementary Details (IRAC Notes and Comments)
    'field500': { maxLength: 4, maxOccurrences: 10, title: 'IRAC Notes' },
    'field501': { maxLength: 35, maxOccurrences: 30, title: 'Notes/Comments' },
    'field502': { maxLength: 1440, maxOccurrences: 1, title: 'Description of Requirement' },
    'field503': { maxLength: 35, maxOccurrences: 30, title: 'Agency Free-text Comments' },
    'field511': { maxLength: 30, maxOccurrences: 1, title: 'Major Function Identifier' },
    'field512': { maxLength: 30, maxOccurrences: 1, title: 'Intermediate Function Identifier' },
    'field513': { maxLength: 30, maxOccurrences: 1, title: 'Minor Function Identifier' },
    'field520': { maxLength: 1080, maxOccurrences: 1, title: 'Supplementary Details' },

    // Other Assignment Identifiers
    'field716': { maxLength: 1, maxOccurrences: 1, title: 'Usage Code' },
    'field801': { maxLength: 60, maxOccurrences: 20, title: 'Coordination Data/Remarks' },
    'field803': { maxLength: 60, maxOccurrences: 1, title: 'Requestor Data POC' },
    'field804': { maxLength: 60, maxOccurrences: 30, title: 'Tuning Range/Tuning Increments' }
};

// Export field specifications
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sfafFieldSpecs;
}
if (typeof window !== 'undefined') {
    window.sfafFieldSpecs = sfafFieldSpecs;
}