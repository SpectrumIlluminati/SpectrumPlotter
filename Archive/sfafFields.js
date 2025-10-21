// js/sfafFields.js - SFAF field definitions and validation

export const sfafFieldDefinitions = {
    // Administrative Data
    'field005': {
        title: 'Security Classification',
        maxLength: 2,
        required: true,
        type: 'select',
        options: ['U', 'UE', 'C', 'S'],
        validation: /^(U|UE|C|S)$/
    },
    'field010': {
        title: 'Type of Action',
        maxLength: 1,
        required: true,
        type: 'select',
        options: ['M', 'N', 'D', 'R'],
        validation: /^(M|N|D|R)$/
    },
    'field102': {
        title: 'Agency Serial Number',
        maxLength: 10,
        required: true,
        type: 'text',
        validation: /^[A-Z0-9\s]{1,10}$/
    },
    
    // Emission Characteristics
    'field110': {
        title: 'Frequency(ies)',
        maxLength: 23,
        required: true,
        type: 'text',
        validation: /^[KMG]?\d+\.?\d*(\(\d+\.?\d*\))?$/
    },
    'field113': {
        title: 'Station Class',
        maxLength: 4,
        required: true,
        type: 'text',
        validation: /^[A-Z]{1,4}$/
    },
    'field114': {
        title: 'Emission Designator',
        maxLength: 11,
        required: true,
        type: 'text',
        validation: /^\d+[A-Z]\d+[A-Z]\d*[A-Z]?$/
    },
    'field115': {
        title: 'Transmitter Power',
        maxLength: 9,
        required: true,
        type: 'text',
        validation: /^[KWMG]?\d+\.?\d*$/
    },
    
    // Time/Date Information
    'field130': {
        title: 'Time',
        maxLength: 4,
        type: 'text',
        validation: /^[A-Z0-9]{1,4}$/
    },
    'field142': {
        title: 'Review Date',
        maxLength: 8,
        type: 'text',
        validation: /^\d{8}$/
    },
    'field143': {
        title: 'Revision Date',
        maxLength: 8,
        type: 'text',
        validation: /^\d{8}$/
    },
    'field144': {
        title: 'Approval Authority Indicator',
        maxLength: 1,
        type: 'select',
        options: ['Y', 'N'],
        validation: /^(Y|N)$/
    },
    
    // Organizational Information
    'field200': {
        title: 'Agency',
        maxLength: 6,
        type: 'select',
        options: ['USAF', 'USA', 'USN', 'USMC', 'USCG'],
        validation: /^[A-Z]{2,6}$/
    },
    'field201': {
        title: 'Unified Command',
        maxLength: 8,
        type: 'text',
        validation: /^[A-Z]{1,8}$/
    },
    'field202': {
        title: 'Unified Command Service',
        maxLength: 8,
        type: 'text',
        validation: /^[A-Z]{1,8}$/
    },
    'field204': {
        title: 'Command',
        maxLength: 18,
        type: 'text'
    },
    'field205': {
        title: 'Subcommand',
        maxLength: 18,
        type: 'text'
    },
    'field206': {
        title: 'Installation Frequency Manager',
        maxLength: 18,
        type: 'text'
    },
    'field207': {
        title: 'Operating Unit',
        maxLength: 18,
        type: 'text'
    },
    'field209': {
        title: 'Area AFC/DoD AFC/Other Organizations',
        maxLength: 18,
        type: 'text'
    },
    
    // Transmitter Location Data
    'field300': {
        title: 'State/Country',
        maxLength: 4,
        required: true,
        type: 'text',
        validation: /^[A-Z]{2,4}$/
    },
    'field301': {
        title: 'Antenna Location',
        maxLength: 24,
        required: true,
        type: 'text'
    },
    'field303': {
        title: 'Antenna Coordinates',
        maxLength: 15,
        required: true,
        type: 'text',
        readonly: true,
        validation: /^\d{6}[NS]\d{7}[EW]$/
    },
    'field306': {
        title: 'Authorized Radius',
        maxLength: 5,
        type: 'text',
        validation: /^\d+[A-Z]?$/
    },
    
    // Transmitter Equipment
    'field340': {
        title: 'Equipment Nomenclature',
        maxLength: 18,
        type: 'text'
    },
    'field343': {
        title: 'Equipment Certification ID',
        maxLength: 15,
        type: 'text'
    },
    
    // Transmitter Antenna Data
    'field357': {
        title: 'Antenna Gain',
        maxLength: 4,
        type: 'text',
        validation: /^\d{1,4}$/
    },
    'field362': {
        title: 'Antenna Orientation',
        maxLength: 3,
        type: 'text',
        validation: /^(\d{3}|ND)$/
    },
    'field363': {
        title: 'Antenna Polarization',
        maxLength: 1,
        type: 'select',
        options: ['V', 'H', 'C'],
        validation: /^(V|H|C)$/
    },
    'field373': {
        title: 'JSC Area Code',
        maxLength: 1,
        type: 'select',
        options: ['A', 'B', 'C', 'D'],
        validation: /^[A-D]$/
    },
    
    // Receiver Location Data
    'field400': {
        title: 'State/Country',
        maxLength: 4,
        type: 'text',
        validation: /^[A-Z]{2,4}$/
    },
    'field401': {
        title: 'Antenna Location',
        maxLength: 24,
        type: 'text'
    },
    'field402': {
        title: 'Receiver Control',
        maxLength: 18,
        type: 'text'
    },
    'field403': {
        title: 'Antenna Coordinates',
        maxLength: 15,
        type: 'text',
        readonly: true,
        validation: /^\d{6}[NS]\d{7}[EW]$/
    },
    
    // Receiver Equipment
    'field440': {
        title: 'Equipment Nomenclature',
        maxLength: 18,
        type: 'text'
    },
    'field443': {
        title: 'Equipment Certification ID',
        maxLength: 15,
        type: 'text'
    },
    
    // Receiver Antenna Data
    'field457': {
        title: 'Antenna Gain',
        maxLength: 4,
        type: 'text',
        validation: /^\d{1,4}$/
    },
    'field462': {
        title: 'Antenna Orientation',
        maxLength: 3,
        type: 'text',
        validation: /^(\d{3}|ND)$/
    },
    'field463': {
        title: 'Antenna Polarization',
        maxLength: 1,
        type: 'select',
        options: ['V', 'H', 'C'],
        validation: /^(V|H|C)$/
    },
    'field473': {
        title: 'JSC Area Code',
        maxLength: 1,
        type: 'select',
        options: ['A', 'B', 'C', 'D'],
        validation: /^[A-D]$/
    },
    
    // Supplementary Details
    'field500': {
        title: 'IRAC Notes',
        maxLength: 4,
        type: 'text'
    },
    'field501': {
        title: 'Notes free-text Comments',
        maxLength: 35,
        type: 'text'
    },
    'field502': {
        title: 'Description of Requirement',
        maxLength: 1440,
        type: 'textarea'
    },
    'field503': {
        title: 'Agency Free-text Comments',
        maxLength: 35,
        type: 'text'
    },
    'field511': {
        title: 'Major Function Identifier',
        maxLength: 30,
        type: 'text'
    },
    'field512': {
        title: 'Intermediate Function Identifier',
        maxLength: 30,
        type: 'text'
    },
    'field520': {
        title: 'Supplementary Details',
        maxLength: 1080,
        type: 'textarea'
    },
    
    // Other Assignment Identifiers
    'field701': {
        title: 'Frequency Action Officer',
        maxLength: 3,
        type: 'text',
        validation: /^[A-Z0-9]{1,3}$/
    },
    'field702': {
        title: 'Control/Request Number',
        maxLength: 15,
        type: 'text'
    },
    'field716': {
        title: 'Usage Code',
        maxLength: 1,
        type: 'text',
        validation: /^\d$/
    },
    
    // Additional Information
    'field801': {
        title: 'Coordination Data/Remarks',
        maxLength: 60,
        type: 'text'
    },
    'field803': {
        title: 'Requestor Data POC',
        maxLength: 60,
        type: 'text'
    }
};

// System-specific field groups
export const systemFieldGroups = {
    USAFE: [
        'field005', 'field010', 'field102', 'field110', 'field113', 'field114', 'field115',
        'field130', 'field142', 'field143', 'field144', 'field200', 'field201', 'field202',
        'field300', 'field301', 'field303', 'field340', 'field343', 'field357', 'field362',
        'field363', 'field500', 'field501', 'field502', 'field511', 'field512', 'field701',
        'field702', 'field801', 'field803'
    ],
    PACOM: [
        'field005', 'field010', 'field102', 'field110', 'field113', 'field114', 'field115',
        'field130', 'field200', 'field300', 'field301', 'field303', 'field340', 'field343',
        'field373', 'field400', 'field401', 'field403', 'field440', 'field443', 'field473',
        'field500', 'field511', 'field701', 'field716'
    ],
    CONUS: [
        'field005', 'field010', 'field102', 'field110', 'field113', 'field114', 'field115',
        'field200', 'field300', 'field301', 'field303', 'field340', 'field343', 'field500',
        'field701', 'field702'
    ]
};

// Validation functions
export function validateSFAFField(fieldId, value) {
    const fieldDef = sfafFieldDefinitions[fieldId];
    if (!fieldDef) return { valid: true };

    const errors = [];

    // Check required fields
    if (fieldDef.required && (!value || value.trim() === '')) {
        errors.push(`${fieldDef.title} is required`);
    }

    // Check max length
    if (value && fieldDef.maxLength && value.length > fieldDef.maxLength) {
        errors.push(`${fieldDef.title} exceeds maximum length of ${fieldDef.maxLength}`);
    }

    // Check validation pattern
    if (value && fieldDef.validation && !fieldDef.validation.test(value)) {
        errors.push(`${fieldDef.title} format is invalid`);
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

export function validateAllFields(data) {
    const allErrors = {};
    let isValid = true;

    Object.keys(data).forEach(fieldId => {
        const result = validateSFAFField(fieldId, data[fieldId]);
        if (!result.valid) {
            allErrors[fieldId] = result.errors;
            isValid = false;
        }
    });

    return {
        valid: isValid,
        errors: allErrors
    };
}

// Get fields for specific system
export function getFieldsForSystem(system) {
    return systemFieldGroups[system] || systemFieldGroups.CONUS;
}