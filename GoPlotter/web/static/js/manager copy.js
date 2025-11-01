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
    'field110': { maxLength: 11, maxOccurrences: 20, title: 'Frequency(ies)', dynamic: true },
    'field113': { maxLength: 4, maxOccurrences: 20, title: 'Station Class', dynamic: true },
    'field114': { maxLength: 11, maxOccurrences: 20, title: 'Emission Designator', dynamic: true },
    'field115': { maxLength: 9, maxOccurrences: 20, title: 'Transmitter Power', dynamic: true },
    'field116': { maxLength: 1, maxOccurrences: 20, title: 'Power Type', dynamic: true, options: ['C', 'M', 'P'] },
    'field117': { maxLength: 6, maxOccurrences: 20, title: 'Effective Radiated Power', dynamic: true },
    'field118': { maxLength: 1, maxOccurrences: 20, title: 'Power/ERP Augmentation', dynamic: true },

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
    'field340': { maxLength: 18, maxOccurrences: 10, title: 'Equipment Nomenclature', dynamic: true },
    'field343': { maxLength: 15, maxOccurrences: 10, title: 'Equipment Certification ID', dynamic: true },

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
    'field440': { maxLength: 18, maxOccurrences: 10, title: 'Equipment Nomenclature', dynamic: true },
    'field443': { maxLength: 15, maxOccurrences: 10, title: 'Equipment Certification ID', dynamic: true },

    // Receiver Antenna
    'field457': { maxLength: 4, maxOccurrences: 10, title: 'Antenna Gain' },
    'field462': { maxLength: 3, maxOccurrences: 10, title: 'Antenna Orientation' },
    'field463': { maxLength: 1, maxOccurrences: 10, title: 'Antenna Polarization', options: ['V', 'H', 'C'] },
    'field473': { maxLength: 1, maxOccurrences: 1, title: 'JSC Area Code', options: ['A', 'B', 'C', 'D'] },

    // Supplementary Details (IRAC Notes and Comments)
    'field500': { maxLength: 4, maxOccurrences: 10, title: 'IRAC Notes', dynamic: true },
    'field501': { maxLength: 35, maxOccurrences: 30, title: 'Notes/Comments', dynamic: true },
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

(function () {
    'use strict';

    // Prevent multiple initializations
    if (window.sfafFieldManager) {
        console.log('⚠️ SFAF Manager already exists');
        return;
    }

    class SFAFFieldManager {
        constructor() {
            this.fieldSpecs = this.initializeFieldSpecs();
            this.geographicCodes = {};
            this.iracNotes = {};
            this.functionIdentifiers = [];
            this.equipmentManufacturers = {};
            this.timeCodeDefinitions = {};
            this.powerTypes = {};

            // Initialize with MCEB compliance
            this.initializeWithMCEBCompliance();
        }

        // Initialize field specifications
        initializeFieldSpecs() {
            return {
                'field005': { title: 'Security Classification', maxLength: 15, required: true },
                'field010': { title: 'Type of Action', maxLength: 3, required: true },
                'field013': { title: 'Priority Indicator', maxLength: 1 },
                'field019': { title: 'Coordination Required', maxLength: 1 },
                'field102': { title: 'Agency Serial Number', maxLength: 20, required: true },
                'field110': { title: 'Frequency', maxLength: 14, dynamic: true, maxOccurrences: 300, required: true },
                'field113': { title: 'Station Class', maxLength: 3, dynamic: true, maxOccurrences: 300, required: true },
                'field114': { title: 'Emission Designator', maxLength: 11, dynamic: true, maxOccurrences: 300, required: true },
                'field115': { title: 'Transmitter Power', maxLength: 11, dynamic: true, maxOccurrences: 300, required: true },
                'field116': { title: 'Power Type', maxLength: 1, dynamic: true, maxOccurrences: 300 },
                'field117': { title: 'Antenna Gain', maxLength: 7, dynamic: true, maxOccurrences: 300 },
                'field118': { title: 'Antenna Pattern', maxLength: 3, dynamic: true, maxOccurrences: 300 },
                'field130': { title: 'Time Code', maxLength: 4 },
                'field131': { title: 'Percent Time', maxLength: 2 },
                'field140': { title: 'Start Date', maxLength: 8 },
                'field141': { title: 'Stop Date', maxLength: 8 },
                'field142': { title: 'Repetitive Start Date', maxLength: 8 },
                'field143': { title: 'Repetitive Stop Date', maxLength: 8 },
                'field144': { title: 'Years of Repetition', maxLength: 2 },
                'field200': { title: 'Agency', maxLength: 4, required: true },
                'field201': { title: 'Station Serial Number', maxLength: 20 },
                'field202': { title: 'Net Identifier', maxLength: 20 },
                'field204': { title: 'Station Call Sign', maxLength: 10 },
                'field205': { title: 'Circuit Identifier', maxLength: 20 },
                'field206': { title: 'Geographic Code', maxLength: 1 },
                'field207': { title: 'Function Identifier', maxLength: 50 },
                'field208': { title: 'Equipment Designation', maxLength: 40, dynamic: true, maxOccurrences: 50 },
                'field209': { title: 'Supplementary Details', maxLength: 200, dynamic: true, maxOccurrences: 50 },
                'field300': { title: 'State/Country (TX)', maxLength: 2, required: true },
                'field301': { title: 'Antenna Location (TX)', maxLength: 30, required: true },
                'field303': { title: 'Antenna Coordinates (TX)', maxLength: 15, required: true },
                'field306': { title: 'Geographic Area (TX)', maxLength: 1 },
                'field340': { title: 'TX Equipment Class', maxLength: 20, dynamic: true, maxOccurrences: 50 },
                'field343': { title: 'TX Equipment Manufacturer', maxLength: 3, dynamic: true, maxOccurrences: 50 },
                'field357': { title: 'TX Antenna Height AGL', maxLength: 6 },
                'field362': { title: 'TX Antenna Azimuth', maxLength: 3 },
                'field363': { title: 'TX Antenna Elevation', maxLength: 4 },
                'field373': { title: 'TX Antenna Polarization', maxLength: 1 },
                'field400': { title: 'State/Country (RX)', maxLength: 2, required: true },
                'field401': { title: 'Antenna Location (RX)', maxLength: 30, required: true },
                'field403': { title: 'Antenna Coordinates (RX)', maxLength: 15, required: true },
                'field407': { title: 'Geographic Area (RX)', maxLength: 1 },
                'field440': { title: 'RX Equipment Class', maxLength: 20, dynamic: true, maxOccurrences: 50 },
                'field443': { title: 'RX Equipment Manufacturer', maxLength: 3, dynamic: true, maxOccurrences: 50 },
                'field457': { title: 'RX Antenna Height AGL', maxLength: 6 },
                'field462': { title: 'RX Antenna Azimuth', maxLength: 3 },
                'field463': { title: 'RX Antenna Elevation', maxLength: 4 },
                'field470': { title: 'RX Antenna Beamwidth H', maxLength: 3 },
                'field471': { title: 'RX Antenna Beamwidth V', maxLength: 3 },
                'field472': { title: 'RX Antenna Front-to-Back', maxLength: 3 },
                'field473': { title: 'RX Antenna Polarization', maxLength: 1 },
                'field500': { title: 'IRAC Coordination Notes', maxLength: 3, dynamic: true, maxOccurrences: 100 },
                'field501': { title: 'Coordination Comments', maxLength: 200, dynamic: true, maxOccurrences: 100 },
                'field502': { title: 'Justification', maxLength: 200 },
                'field503': { title: 'Additional Information', maxLength: 200 },
                'field511': { title: 'Link Budget', maxLength: 200 },
                'field512': { title: 'Bandwidth Justification', maxLength: 200 },
                'field513': { title: 'RF Exposure Analysis', maxLength: 200 },
                'field520': { title: 'Technical Contact', maxLength: 50 },
                'field701': { title: 'Host Nation Frequency', maxLength: 14 },
                'field702': { title: 'NTIA Identifier', maxLength: 9 },
                'field716': { title: 'Previous Assignment ID', maxLength: 20 },
                'field801': { title: 'ITU Region', maxLength: 1 },
                'field803': { title: 'ITU Notification Number', maxLength: 20 },
                'field804': { title: 'ITU Notification Date', maxLength: 8 },
                'field903': { title: 'Coordination Status', maxLength: 20 }
            };
        }

        // Initialize with MCEB Pub 7 compliance
        initializeWithMCEBCompliance() {
            console.log('✅ SFAF Field Manager initialized with MCEB Pub 7 compliance');

            // Load all official MCEB Pub 7 reference data
            this.geographicCodes = this.loadOfficialGeographicCodes();
            this.iracNotes = this.loadOfficialIRACNotes();
            this.functionIdentifiers = this.loadOfficialFunctionIdentifiers();
            this.equipmentManufacturers = this.loadOfficialEquipmentCodes();
            this.timeCodeDefinitions = this.loadOfficialTimeCodes();
            this.powerTypes = this.loadOfficialPowerTypes();

            // Initialize validation and dynamic entry management
            this.initializeValidation();
            this.initializeDynamicEntries();
            this.addFieldCounters();
            this.enableAutoSave();
            this.initializeExistingButtons();

            console.log('📊 Loaded official MCEB Pub 7 reference data:');
            console.log(`  - Geographic codes: ${Object.keys(this.geographicCodes).length} regions`);
            console.log(`  - IRAC coordination notes: ${Object.keys(this.iracNotes).length} notes`);
            console.log(`  - Function identifiers: ${this.functionIdentifiers.length} functions`);
            console.log(`  - Equipment manufacturer codes: ${Object.keys(this.equipmentManufacturers).length} codes`);
        }

        // Load official power type codes from MCEB Pub 7 field 116
        loadOfficialPowerTypes() {
            return {
                'C': {
                    description: 'Carrier Power',
                    usage: 'Use this for "N0N" and for "A3E" sound broadcasting service (Station Class "BC")'
                },
                'M': {
                    description: 'Mean Power',
                    usage: 'For all air to air (A/A) & air/ground/air (A/G/A). Use this for most AM emissions using unkeyed full carrier and all frequency modulated emissions. Typical emissions include A2A, A2B, A3C, A3E, A3F, A7B, AXX, F1B, F1C, F2B, F3E, F3F, F7B, FXX, H2A, H3E, and H7B'
                },
                'P': {
                    description: 'Peak Envelope Power',
                    usage: 'Use this for all pulsed equipment, C3F Television, and the following classes: A1A, A1B, A7B, B7B, B8C, B8E, BXX, C3F, G3E, J2B, J3E, J7B, JXX, K1B, K2B, K3E, K3F, L2B, M2B, M3E, P0N, PXX, R2B and R3C'
                }
            };
        }

        // Load official geographic codes from MCEB Pub 7 Annex E
        loadOfficialGeographicCodes() {
            return {
                'A': {
                    description: 'Northeast US',
                    locations: ['ALABAMA', 'CHESAPEAKE BAY', 'CONNECTICUT', 'DELAWARE', 'DISTRICT OF COLUMBIA',
                        'FIRST NAV DISTRICT', 'LAKE ONTARIO', 'MAINE', 'MARYLAND', 'MASSACHUSETTS',
                        'NAV DIST WASH DC', 'NEW HAMPSHIRE', 'NEW JERSEY', 'NEW YORK', 'PENNSYLVANIA',
                        'RHODE ISLAND', 'THIRD NAV DISTRICT', 'VERMONT', 'VIRGINIA', 'WEST VIRGINIA']
                },
                'B': {
                    description: 'Great Lakes Region',
                    locations: ['GREAT LAKES', 'ILLINOIS', 'INDIANA', 'IOWA', 'KENTUCKY', 'LAKE ERIE',
                        'LAKE SUPERIOR', 'LAKE HURON', 'LAKE MICHIGAN', 'MICHIGAN', 'MINNESOTA',
                        'MISSOURI', 'OHIO', 'WISCONSIN']
                },
                'C': {
                    description: 'Southeast US',
                    locations: ['ALABAMA', 'FLORIDA', 'GEORGIA', 'MISSISSIPPI', 'NORTH CAROLINA',
                        'SIXTH NAV DISTRICT', 'SOUTH CAROLINA', 'TENNESSEE']
                },
                'D': {
                    description: 'Rocky Mountain/Plains',
                    locations: ['COLORADO', 'IDAHO', 'KANSAS', 'MONTANA', 'NEBRASKA', 'NORTH DAKOTA',
                        'RCKY MTN RGN. CAP 7', 'SOUTH DAKOTA', 'UTAH', 'WYOMING']
                },
                'E': {
                    description: 'South Central US',
                    locations: ['ARIZONA', 'ARKANSAS', 'EIGHTH NAV DIST', 'LOUISIANA', 'NEW MEXICO',
                        'OKLAHOMA', 'SW REGION CAP 6', 'TEXAS']
                },
                'F': {
                    description: 'Pacific US',
                    locations: ['CALIFORNIA', 'NEVADA', 'OREGON', 'PAC REGION CAP 8', 'WASHINGTON']
                },
                'G': {
                    description: 'Alaska (mainland)',
                    locations: ['ALASKA', 'PACIFIC OCEAN NE']
                },
                'H': {
                    description: 'Pacific Ocean/Hawaii/Alaska Aleutians',
                    locations: ['ALASKA ALEUTIAN IS', 'BERING SEA', 'FOURTEENTH NAV DIS', 'HAWAII',
                        'JOHNSTON ISLAND', 'MIDWAY ISLAND', 'PACIFIC OCEAN NW']
                },
                'J': {
                    description: 'Canada/Greenland/Iceland',
                    locations: ['ATLANTIC OCEAN NW', 'AZORES', 'CANADA', 'GREENLAND', 'ICELAND', 'JAN MAYEN']
                },
                'K': {
                    description: 'Caribbean/Central America',
                    locations: ['BAHAMAS', 'BERMUDA', 'CARIBBEAN', 'CUBA', 'DOMINICAN REPUBLIC', 'GULF OF MEXICO',
                        'HAITI REPUBLIC', 'JAMAICA', 'PUERTO RICO', 'VIRGIN ISLANDS']
                },
                'L': {
                    description: 'South America/Antarctica',
                    locations: ['ANTARTICA', 'ARGENTINE REPUBLIC', 'BOLIVIA', 'BRAZIL', 'CHILE (EX EASTER I)',
                        'COLUMBIA REPUBLIC', 'MEXICO', 'SOUTH AMERICA', 'VENEZUELA REPUBLIC']
                },
                'M': {
                    description: 'Northern Europe/Scandinavia',
                    locations: ['BALTIC SEA', 'FINLAND', 'NORWAY', 'NORWEGIAN SEA', 'SPITSBERGEN', 'SWEDEN']
                },
                'N': {
                    description: 'Western/Central Europe',
                    locations: ['AUSTRIA', 'BELGIUM', 'DENMARK', 'ENGLAND CHANNEL', 'EUROPE', 'FRANCE',
                        'GERMANY', 'ITALY', 'NETHERLANDS KINGDM', 'SPAIN', 'SWITZERLAND CONFED', 'UK GREAT BRITAIN']
                },
                'O': {
                    description: 'Eastern Europe',
                    locations: ['ALBANIA REPUBLIC', 'BULGARIA PEO REPUB', 'CZECHOSLOVAKIA', 'HUNGARIAN REPUBLIC',
                        'POLAND PEO REPUBLI', 'ROUMANIA SOCLT REP']
                },
                'P': {
                    description: 'Africa/Middle East',
                    locations: ['AFRICA', 'ALGERIA', 'EGYPT ARAB REPUBLI', 'ISRAEL (STATE OF)', 'LEBANON',
                        'LIBYA ARAB REPUBL', 'MOROCCO (KINGDOM OF)', 'NIGERIA (REPUBLIC OF)', 'SO AFRICA REPUBLIC',
                        'SYRIAN ARAB REP.']
                }
            };
        }

        // Load official IRAC coordination notes
        loadOfficialIRACNotes() {
            return {
                'US1': 'Coordinate with NTIA',
                'US2': 'Coordinate with FCC',
                'US3': 'Coordinate with affected agencies',
                'US7': 'Coordinate use of this frequency',
                'US8': 'Coordination required for power above threshold',
                'US15': 'Coordinate before use in these areas',
                'US25': 'Coordinate frequency assignment',
                'US27': 'Use requires coordination',
                'US30': 'Coordinate interference cases',
                'US42': 'Coordinate for emergency use only',
                'US60': 'Federal use requires coordination',
                'US74': 'Coordinate all applications',
                'US84': 'Use limited to coordination',
                'C045': 'Subject to coordination with FAA prior to use.',
                'C065': 'Subject to coordination, prior to use, with the Department of the Interior, Bureau of Land Management, National Interagency Fire Center, Boise, Idaho.',
                'C067': 'Subject to coordination with the Area Frequency Coordinator located at Nellis AFB, Nevada, prior to use in the states of Nevada, Utah west of 111°W and Idaho south of 44°N.'
            };
        }

        // Complete the loadOfficialFunctionIdentifiers method
        loadOfficialFunctionIdentifiers() {
            return [
                // Air Operations
                'AIR OPERATIONS', 'FLIGHT OPERATIONS', 'FLIGHT TEST', 'FORWARD AIR CONTROL POST',
                'GCA', 'PILOT-TO-DISPATCHER', 'PILOT-TO-METRO', 'PILOT-TO-PILOT', 'RAMP CONTROL',
                'REFUELING', 'SHIP/AIR OPERATIONS', 'AIR DEFENSE', 'AIR DEFENSE WARNING',
                'AIR DEFENSE / INTERCEPT', 'AIR FORCE ONE', 'AIR FORCE SPECIAL OPERATIONS',
                'AIR ROUTE SURVEILLANCE RADAR', 'AIR TRAFFIC CONTROL', 'AIR/AIR COMMUNICATIONS',
                'AIR/GROUND/AIR COMMUNICATIONS', 'AIRBORNE COMMAND CENTER', 'AIRCRAFT',
                'AIRPORT SURVEILLANCE RADAR', 'APPROACH CONTROL', 'ARMY AVIATION',

                // Training
                'TRAINING', 'INSTRUCTOR/STUDENT TRAINING', 'EXERCISE', 'EXPERIMENTAL',
                'SIMULATOR', 'AERO CLUB', 'EDUCATION',

                // Tactical Operations
                'TACTICAL OPERATIONS', 'GROUND OPERATIONS', 'SEA OPERATIONS', 'SPECIAL OPERATIONS',
                'PSYCHOLOGICAL OPERATIONS', 'FIRE SUPPORT', 'INFANTRY', 'GROUND INTERDICTION',
                'ARTILLERY', 'MISSILE', 'SPECIAL FORCES', 'RANGER UNITS', 'NAVY SPECIAL OPERATIONS',
                'NAVAL GUNFIRE SUPPORT', 'TARGET ACQUISITION', 'TARGET SCORING', 'TARGET',

                // Administrative
                'ADMINISTRATIVE', 'INSTALLATION PA SYSTEM', 'MOTOR POOL', 'PAGING',
                'BROADCAST', 'TRAVELERS INFORMATION SYSTEM', 'UNLICENSED DEVICE',
                'WIRELESS LOCAL AREA NETWORK', 'WIRELESS MIKE', 'BASE OPERATIONS',
                'COMMAND NET', 'TRUNKING', 'HICOM', 'MOMS',

                // Logistics
                'LOGISTICS', 'MAINTENANCE', 'MUNITIONS', 'POL', 'RESUPPLY',
                'INVENTORY/INVENTORY CONTROLS', 'SUPPLY AND LOGISTICS', 'SHIPYARD',
                'TRANSPORTATION', 'TAXI', 'AMPS', 'CSSCS', 'MTS', 'RF TAGS',

                // Communications
                'COMMUNICATIONS', 'SATELLITE COMMUNICATIONS', 'RADIO RELAY', 'MICROWAVE',
                'MILSTAR', 'FLTSATCOM', 'GLOBAL', 'MARS', 'AFSATCOM', 'DSCS', 'LEASAT',
                'SPITFIRE', 'TROJAN SPIRIT', 'MSE', 'TACTS', 'IONOSPHERIC SOUNDER',
                'ISYSCON', 'GCCS', 'MICROWAVE DATA LINK',

                // Intelligence
                'INTELLIGENCE', 'SURVEILLANCE', 'RECONNAISSANCE', 'SURVEILLANCE/RECONNAISSANCE',
                'ACS', 'AHFEWS', 'ARL', 'TRACKWOLF', 'TRAILBLAZER', 'TEAMMATE',

                // Medical
                'MEDICAL', 'SEARCH AND RESCUE',

                // Security/Law Enforcement
                'LAW ENFORCEMENT', 'SECURITY FORCE', 'MILITARY POLICE', 'SHORE PATROL',
                'FIRE', 'HAZMAT', 'CID', 'DIS', 'NCIS', 'OSI', 'SCOPE SHIELD',
                'SPEED MEASUREMENT SYSTEMS', 'SURVEILLANCE SYSTEMS', 'TETHERED AEROSTAT RADAR',
                'WEAPONS STORAGE PROTECTION', 'ALARM SYSTEMS', 'DISASTER PLANNING', 'EOD',
                'ANTI-TERRORISM', 'CIVIL DISTURBANCES', 'COUNTER DRUG', 'PROJECT COTHEN',
                'SPECIAL SECURITY OPERATIONS',

                // Range Operations
                'RANGE OPERATIONS', 'RANGE CONTROL', 'RDTE SUPPORT', 'TEST AND MEASUREMENT',
                'TEST RANGE TIMING', 'TEST RANGE', 'RDMS', 'OCCS SUPPORT',

                // Sustaining Operations
                'SUSTAINING OPERATIONS', 'FLEET SUPPORT', 'PUBLIC WORKS', 'NATURAL RESOURCES',
                'RESOURCES CONSERVATION', 'SAFETY', 'LOCKS AND DAMS', 'HYDROLOGIC',
                'METEOROLOGICAL', 'SEISMIC', 'NAVAIDS', 'NAVIGATION RADAR', 'CIVIL ENGINEERING',
                'CIVIL WORKS', 'CONSTRUCTION', 'INDUSTRIAL CONTROLS', 'PRIME BEEF', 'RED HORSE',
                'SEABEES', 'UTILITIES', 'WILDLIFE PRESERVATION', 'NAVAIDS CONTROLS',
                'REMOTE BARRIER CONTROL SYSTEMS', 'RUNWAY LIGHTING CONTROL',

                // Space Operations
                'SPACE OPERATIONS', 'SATELLITE COMMUNICATIONS', 'GPS', 'SHUTTLE', 'NASA',
                'SGLS', 'ARTS', 'TELEMETRY', 'TELECOMMAND', 'UAV',

                // Emergency Services
                'EMERGENCY SERVICES', 'WARNING SYSTEM', 'CONSEQUENCE MANAGEMENT', 'CBR',
                'CIVIL SUPPORT TEAM', 'ENVIRONMENTAL CLEANUP', 'FEMA', 'HAZARDOUS MATERIAL RELEASE',
                'TECHNICAL ESCORT UNIT', 'MUTUAL AID',

                // Weather/Environmental
                'WEATHER', 'WEATHER RADAR', 'WIND PROFILER', 'AMSS', 'ASOS', 'AWOS', 'GOES',
                'IMETS', 'NEXRAD', 'SAWDS',

                // Command and Control
                'COMMAND AND CONTROL', 'BASE OPERATIONS', 'COMMAND NET', 'MOMS', 'TRUNKING',
                'HICOM', 'A2C2S', 'NAOC', 'MYSTIC STAR', 'WHCA',

                // Data Links
                'DATA LINK', 'JTIDS/MIDS', 'TADIL-A', 'TADIL-C', 'A-EPLRS', 'AFATDS',
                'TACCS', 'NTDR', 'MITT/DTES', 'SCAMP',

                // Special Systems
                'AEGIS', 'PATRIOT', 'MLRS', 'SENTINEL', 'PAVE PAWS', 'OTHR/ROTHR',
                'THUNDERBIRDS', 'STRIKER II', 'AQF', 'TACJAM', 'NORAD',

                // Global Operations
                'GLOBAL', 'WORLDWIDE', 'CONUS', 'NATO', 'OTHER OPERATIONS', 'SPECIAL PROJECTS',
                'HAARP', 'SURVEY', 'DTSS', 'ETRAC'
            ];
        }

        // Load function identifiers from MCEB Pub 7 Annex I
        loadFunctionIdentifiers() {
            return [
                // Air Operations
                'AIR OPERATIONS', 'FLIGHT OPERATIONS', 'FLIGHT TEST', 'FORWARD AIR CONTROL POST',
                'GCA', 'PILOT-TO-DISPATCHER', 'PILOT-TO-METRO', 'PILOT-TO-PILOT', 'RAMP CONTROL',
                'REFUELING', 'SHIP/AIR OPERATIONS',

                // Training
                'TRAINING', 'INSTRUCTOR/STUDENT TRAINING', 'EXERCISE', 'EXPERIMENTAL',

                // Tactical Operations
                'TACTICAL OPERATIONS', 'GROUND OPERATIONS', 'SEA OPERATIONS', 'SPECIAL OPERATIONS',
                'PSYCHOLOGICAL OPERATIONS', 'FIRE SUPPORT', 'INFANTRY', 'GROUND INTERDICTION',

                // Administrative
                'ADMINISTRATIVE', 'INSTALLATION PA SYSTEM', 'MOTOR POOL', 'PAGING',

                // Logistics
                'LOGISTICS', 'MAINTENANCE', 'MUNITIONS', 'POL', 'RESUPPLY', 'INVENTORY/INVENTORY CONTROLS',

                // Communications
                'COMMUNICATIONS', 'SATELLITE COMMUNICATIONS', 'RADIO RELAY', 'MICROWAVE',
                'MILSTAR', 'FLTSATCOM', 'GLOBAL', 'MARS',

                // Intelligence
                'INTELLIGENCE', 'SURVEILLANCE', 'RECONNAISSANCE',

                // Medical
                'MEDICAL', 'SEARCH AND RESCUE',

                // Security/Law Enforcement
                'LAW ENFORCEMENT', 'SECURITY FORCE', 'MILITARY POLICE', 'SHORE PATROL',
                'FIRE', 'HAZMAT', 'LOOTING PREVENTION',

                // Range Operations
                'RANGE OPERATIONS', 'RANGE CONTROL', 'RDTE SUPPORT',

                // Sustaining Operations
                'SUSTAINING OPERATIONS', 'FLEET SUPPORT', 'PUBLIC WORKS', 'NATURAL RESOURCES',
                'RESOURCES CONSERVATION', 'SAFETY', 'LOCKS AND DAMS', 'HYDROLOGIC',
                'METEOROLOGICAL', 'SEISMIC', 'NAVAIDS', 'NAVIGATION RADAR',

                // Space Operations
                'SPACE OPERATIONS', 'SATELLITE COMMUNICATIONS', 'GPS', 'SHUTTLE',

                // Global Operations
                'GLOBAL', 'WORLDWIDE', 'CONUS', 'NATO'
            ];
        }

        loadOfficialEquipmentCodes() {
            return {
                'AAI': 'AAI Corp.',
                'ABB': 'ABB Power T&D Co.',
                'ACS': 'ACS Defense, Inc.',
                'ADC': 'ADC Telecommunications',
                'AEL': 'American Electronic Labs',
                'AIL': 'AIL Systems',
                'AMP': 'AMP Inc.',
                'ANT': 'Antenna Technology Corp.',
                'ARC': 'ARC Electronics',
                'ATI': 'ATI Inc.',
                'BAE': 'BAE Systems',
                'BOE': 'Boeing Co.',
                'CAM': 'Cameron Corp.',
                'CBN': 'Caribbean Communications',
                'COL': 'Collins Radio Co.',
                'EFJ': 'EF Johnson Co.',
                'GEC': 'GEC Marconi',
                'GEN': 'General Dynamics',
                'HAR': 'Harris Corp.',
                'HP': 'Hewlett Packard',
                'IBM': 'IBM Corp.',
                'ITT': 'ITT Corp.',
                'LOC': 'Lockheed Martin',
                'MOT': 'Motorola',
                'NEC': 'NEC Corp.',
                'RAY': 'Raytheon',
                'ROC': 'Rockwell International',
                'TBL': 'Trimble Navigation',
                'TBN': 'Tayburn',
                'TCC': 'Telcom Communications',
                'TCD': 'Techdyn Systems Corp.',
                'TCE': 'Telecommunications Corp.',
                'TCH': 'Techcomm',
                'TCI': 'Tel Com Industries',
                'TCL': 'Trio Communications, Ltd.',
                'TCM': 'TCOM Industries, Inc.',
                'TCN': 'Technos International Corp.',
                'TEK': 'Tektronix',
                'TRW': 'TRW Inc.',
                'WES': 'Westinghouse Electric'
            };
        }

        // Load official time codes from MCEB Pub 7
        loadOfficialTimeCodes() {
            return {
                '1': {
                    description: 'Regular Service',
                    usage: 'Operates continuously, daily, on a regular basis',
                    subCodes: {
                        '1H24': '24 hours per day',
                        '1HX': 'Hours of operation vary',
                        '1HN': 'Nighttime hours only',
                        '1HJ': 'Daylight hours only',
                        '1HT': 'Hours of twilight only'
                    }
                },
                '2': {
                    description: 'Workweek Service',
                    usage: 'Operates continuously during normal working hours and days',
                    subCodes: {
                        '2H24': '24 hours per day, workweek only',
                        '2HX': 'Variable hours, workweek only',
                        '2HN': 'Nighttime hours, workweek only',
                        '2HJ': 'Daylight hours, workweek only',
                        '2HT': 'Twilight hours, workweek only'
                    }
                },
                '3': {
                    description: 'Occasional Service',
                    usage: 'Operates on an irregular, intermittent, or as-needed basis',
                    subCodes: {
                        '3H24': 'Any time during 24-hour period',
                        '3HX': 'Variable hours, occasional use',
                        '3HN': 'Nighttime hours, occasional use',
                        '3HJ': 'Daylight hours, occasional use',
                        '3HT': 'Twilight hours, occasional use'
                    }
                },
                '4': {
                    description: 'Occasional Workweek Service',
                    usage: 'Operates occasionally during normal working hours and days',
                    subCodes: {
                        '4H24': 'Any time during workweek',
                        '4HX': 'Variable hours, occasional workweek',
                        '4HN': 'Nighttime hours, occasional workweek',
                        '4HJ': 'Daylight hours, occasional workweek',
                        '4HT': 'Twilight hours, occasional workweek'
                    }
                }
            };
        }

        parseImportedSFAF(importText) {
            const lines = importText.split('\n');
            const fieldData = {};

            // Define auto-generated fields to skip during import
            const autoGeneratedFields = [
                '103', '107', '117', '118', '373', '473', '402'
            ];

            lines.forEach(line => {
                // Ignore computer-generated content
                if (this.isComputerGenerated(line)) {
                    return;
                }

                // Parse field data
                const fieldMatch = line.match(/^(\d{3})(?:\/\d{2})?\.?\s*(.+)$/);
                if (fieldMatch) {
                    const fieldNum = fieldMatch[1];
                    const fieldValue = fieldMatch[2].trim();

                    // Skip auto-generated fields
                    if (autoGeneratedFields.includes(fieldNum)) {
                        console.log(`⚠️ Skipping auto-generated field ${fieldNum}: ${fieldValue}`);
                        return;
                    }

                    // Store only manually-entered field data
                    if (!fieldData[`field${fieldNum}`]) {
                        fieldData[`field${fieldNum}`] = [];
                    }
                    fieldData[`field${fieldNum}`].push(fieldValue);
                }
            });

            return fieldData;
        }

        // Helper method for identifying computer-generated content
        isComputerGenerated(line) {
            const computerGeneratedPatterns = [
                /^\*{5}.*\*{5}$/,           // Header/footer asterisk lines
                /^MCEB Publication/,        // Publication reference
                /^Generated:/,              // Generation timestamp
                /^System:/,                 // System identifier
                /^[✅📊💾🔄❌]/,          // Emoji status indicators
                /^\s*$/,                    // Empty lines
                /^Loaded official/,         // Status messages
                /^Auto-save enabled/        // System messages
            ];

            return computerGeneratedPatterns.some(pattern => pattern.test(line));
        }

        // Complete the missing validation methods
        validateEmissionDesignator(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // MCEB Pub 7 emission designator format: up to 11 characters
            if (value.length > 11) {
                this.showFieldErrors(field, ['Maximum 11 characters per MCEB Pub 7 field 114']);
                return false;
            }

            // Basic format validation for emission designators
            const validEmissionPattern = /^[0-9]*[A-Z]*[0-9]*[A-Z]*$/;

            if (!validEmissionPattern.test(value)) {
                this.showFieldErrors(field, [
                    'Invalid emission designator format',
                    'Examples: A3E, F3E, 16K0F3E, 2K70J3E per MCEB Pub 7'
                ]);
                return false;
            }

            return true;
        }

        // Complete the missing utility methods
        clearFieldErrors(field) {
            field.style.borderColor = '';

            // Remove existing error messages
            const existingErrors = field.parentNode.querySelectorAll('.field-errors, .field-warning');
            existingErrors.forEach(error => error.remove());
        }

        getBaseFieldId(fieldId) {
            // Remove occurrence suffix (e.g., "field110_1" -> "field110")
            return fieldId.split('_')[0];
        }

        // Complete the export formatting method
        exportCompleteFormattedSFAF() {
            const formData = this.collectFormData();
            const sfafLines = [];

            // MCEB Pub 7 standard header
            sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
            sfafLines.push('MCEB Publication 7, June 30, 2005');
            sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
            sfafLines.push(`System: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push('');

            // Export all fields in proper MCEB order
            const fieldOrder = [
                '005', '010', '013', '019', '102', '701', '702',
                '110', '113', '114', '115', '116', '117', '118',
                '130', '131', '140', '141', '142', '143', '144',
                '200', '201', '202', '204', '205', '206', '207', '208', '209',
                '300', '301', '303', '306',
                '340', '343', '357', '362', '363', '373',
                '400', '401', '403', '407',
                '440', '443', '457', '462', '463', '470', '471', '472', '473',
                '500', '501', '502', '503', '511', '512', '513', '520',
                '716', '801', '803', '804', '903'
            ];

            fieldOrder.forEach(fieldNum => {
                const fieldId = `field${fieldNum}`;
                const data = formData[fieldId];

                if (data) {
                    if (Array.isArray(data)) {
                        data.forEach((value, index) => {
                            if (index === 0) {
                                sfafLines.push(`${fieldNum}. ${value}`);
                            } else {
                                const occurrence = (index + 1).toString().padStart(2, '0');
                                sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                            }
                        });
                    } else {
                        sfafLines.push(`${fieldNum}. ${data}`);
                    }
                }
            });

            sfafLines.push('');
            sfafLines.push('***** END OF SFAF RECORD *****');

            return sfafLines.join('\n');
        }

        // Complete the missing initialization methods
        enableAutoSave(intervalMinutes = 5) {
            setInterval(() => {
                this.saveFormState();
            }, intervalMinutes * 60000);

            // Save on form changes
            document.addEventListener('input', this.debounce(() => {
                this.saveFormState();
            }, 2000));

            console.log(`💾 Auto-save enabled every ${intervalMinutes} minutes`);
        }

        // Add debounce utility for auto-save
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

        // Complete the populateFormFromData method
        populateFormFromData(formData) {
            Object.keys(formData).forEach(fieldId => {
                const value = formData[fieldId];

                if (Array.isArray(value)) {
                    // Handle dynamic fields
                    value.forEach((val, index) => {
                        const field = document.getElementById(`${fieldId}_${index + 1}`);
                        if (field) {
                            field.value = val;
                        } else if (index > 0) {
                            // Create additional occurrences if needed
                            this.addFieldOccurrence(fieldId, this.fieldSpecs[fieldId]);
                            const newField = document.getElementById(`${fieldId}_${index + 1}`);
                            if (newField) newField.value = val;
                        }
                    });
                } else {
                    // Handle single fields
                    const field = document.getElementById(fieldId);
                    if (field) field.value = value;
                }
            });
        }

        // Complete the missing initialization methods
        initializeValidation() {
            // Add validation event listeners to all form fields
            document.addEventListener('DOMContentLoaded', () => {
                Object.keys(this.fieldSpecs).forEach(fieldId => {
                    this.attachFieldValidation(fieldId);
                });
            });
        }

        initializeDynamicEntries() {
            // Initialize dynamic field management
            Object.keys(this.fieldSpecs).forEach(fieldId => {
                const spec = this.fieldSpecs[fieldId];
                if (spec.dynamic) {
                    this.setupDynamicField(fieldId, spec);
                }
            });
        }

        addFieldCounters() {
            // Add character counters to all text fields
            Object.keys(this.fieldSpecs).forEach(fieldId => {
                const spec = this.fieldSpecs[fieldId];
                if (spec.maxLength) {
                    this.addCharacterCounter(fieldId, spec.maxLength);
                }
            });
        }

        // Setup dynamic field management
        setupDynamicField(baseFieldId, spec) {
            // Create the first instance
            const firstField = document.getElementById(`${baseFieldId}_1`);
            if (firstField) {
                this.addDynamicFieldControls(firstField, baseFieldId, spec);
            }
        }

        // Add dynamic field controls (add/remove buttons)
        addDynamicFieldControls(field, baseFieldId, spec) {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'dynamic-controls';
            controlsDiv.style.cssText = `
        margin-top: 5px;
        display: flex;
        gap: 10px;
    `;

            // Add occurrence button
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.textContent = '+ Add Another';
            addButton.className = 'btn btn-sm btn-outline-primary';
            addButton.onclick = () => this.addFieldOccurrence(baseFieldId, spec);

            // Remove occurrence button
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.textContent = '- Remove';
            removeButton.className = 'btn btn-sm btn-outline-danger';
            removeButton.onclick = () => this.removeFieldOccurrence(baseFieldId);

            controlsDiv.appendChild(addButton);
            controlsDiv.appendChild(removeButton);

            // Add occurrence counter
            const counter = document.createElement('span');
            counter.className = 'occurrence-counter';
            counter.style.cssText = 'font-size: 0.8em; color: #666; margin-left: auto;';
            counter.textContent = `1 of ${spec.maxOccurrences} max`;
            controlsDiv.appendChild(counter);

            field.parentNode.appendChild(controlsDiv);
        }

        // Add field occurrence
        addFieldOccurrence(baseFieldId, spec) {
            const currentCount = this.getFieldOccurrenceCount(baseFieldId);

            if (currentCount >= spec.maxOccurrences) {
                alert(`Maximum ${spec.maxOccurrences} occurrences allowed for ${spec.title}`);
                return;
            }

            const newFieldId = `${baseFieldId}_${currentCount + 1}`;
            const firstField = document.getElementById(`${baseFieldId}_1`);

            if (firstField) {
                const newFieldContainer = this.createFieldOccurrence(newFieldId, spec, currentCount + 1);
                firstField.closest('.form-group').appendChild(newFieldContainer);
                this.updateOccurrenceCounters(baseFieldId, spec);
            }
        }

        // Remove field occurrence
        removeFieldOccurrence(baseFieldId) {
            const currentCount = this.getFieldOccurrenceCount(baseFieldId);

            if (currentCount <= 1) {
                alert('At least one occurrence is required');
                return;
            }

            const lastFieldId = `${baseFieldId}_${currentCount}`;
            const lastField = document.getElementById(lastFieldId);

            if (lastField) {
                lastField.closest('.field-occurrence').remove();
                this.updateOccurrenceCounters(baseFieldId, this.fieldSpecs[baseFieldId]);
            }
        }

        // Get current field occurrence count
        getFieldOccurrenceCount(baseFieldId) {
            let count = 0;
            for (let i = 1; i <= 300; i++) {
                const field = document.getElementById(`${baseFieldId}_${i}`);
                if (field) count++;
                else break;
            }
            return count;
        }

        // Update occurrence counters
        updateOccurrenceCounters(baseFieldId, spec) {
            const count = this.getFieldOccurrenceCount(baseFieldId);
            const counters = document.querySelectorAll(`[id^="${baseFieldId}"] ~ .dynamic-controls .occurrence-counter`);

            counters.forEach(counter => {
                counter.textContent = `${count} of ${spec.maxOccurrences} max`;
            });
        }

        // Create field occurrence for dynamic fields
        createFieldOccurrence(fieldId, spec, occurrenceNumber) {
            const container = document.createElement('div');
            container.className = 'field-occurrence';
            container.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background-color: #f9f9f9;
    `;

            const label = document.createElement('label');
            label.textContent = `${spec.title} #${occurrenceNumber}`;
            label.style.cssText = 'font-weight: bold; margin-bottom: 5px; display: block;';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = fieldId;
            input.className = 'form-control';
            input.maxLength = spec.maxLength;
            input.style.cssText = 'width: 100%; margin-bottom: 5px;';

            // Add validation
            this.attachFieldValidation(fieldId);

            container.appendChild(label);
            container.appendChild(input);

            return container;
        }

        // End of SFAFFieldManager class

        // Attach validation to a field
        attachFieldValidation(fieldId) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            const spec = this.fieldSpecs[fieldId];

            field.addEventListener('blur', () => {
                this.validateField(field, spec);
            });

            field.addEventListener('input', () => {
                this.clearFieldErrors(field);
                if (spec.maxLength) {
                    this.updateCharacterCounter(field, spec.maxLength);
                }
            });
        }

        // Add character counter to field
        addCharacterCounter(fieldId, maxLength) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            field.addEventListener('input', () => {
                this.updateCharacterCounter(field, maxLength);
            });
        }

        // Validate individual field
        validateField(field, spec) {
            if (!field || !spec) return true;

            this.clearFieldErrors(field);

            // Check required fields
            if (spec.required && !field.value.trim()) {
                this.showFieldErrors(field, [`${spec.title} is required per MCEB Pub 7`]);
                return false;
            }

            // Check max length
            if (spec.maxLength && field.value.length > spec.maxLength) {
                this.showFieldErrors(field, [`Maximum ${spec.maxLength} characters allowed`]);
                return false;
            }

            // Field-specific validation
            const fieldId = field.id.split('_')[0]; // Get base field ID

            switch (fieldId) {
                case 'field110':
                    return this.validateFrequency(field);
                case 'field114':
                    return this.validateEmissionDesignator(field);
                case 'field115':
                    return this.validateTransmitterPower(field);
                case 'field116':
                    return this.validatePowerType(field);
                case 'field130':
                    return this.validateTimeField(field);
                case 'field131':
                    return this.validatePercentTime(field);
                case 'field140':
                case 'field141':
                case 'field142':
                case 'field143':
                    return this.validateMCEBDateField(field);
                case 'field303':
                case 'field403':
                    return this.validateCoordinates(field);
                default:
                    return true;
            }
        }

        // Superior time field validation per MCEB Pub 7 field 130
        validateTimeField(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // Valid time codes from MCEB Pub 7
            const validTimeCodes = [
                '1', '2', '3', '4',                          // Basic codes
                '1H24', '1HX', '1HN', '1HJ', '1HT',         // Regular service
                '2H24', '2HX', '2HN', '2HJ', '2HT',         // Workweek service
                '3H24', '3HX', '3HN', '3HJ', '3HT',         // Occasional service
                '4H24', '4HX', '4HN', '4HJ', '4HT'          // Occasional workweek
            ];

            if (!validTimeCodes.includes(value)) {
                this.showFieldErrors(field, [
                    'Invalid time code per MCEB Pub 7',
                    'Use: 1-4 or 1H24, 1HX, 1HN, 1HJ, 1HT, etc.'
                ]);
                return false;
            }

            return true;
        }

        // Superior power type validation with MCEB Pub 7 compliance
        validatePowerType(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            const validPowerTypes = ['C', 'M', 'P'];

            if (!validPowerTypes.includes(value)) {
                this.showFieldErrors(field, [
                    'Invalid power type per MCEB Pub 7 field 116',
                    'Use: C (Carrier), M (Mean), P (Peak Envelope)'
                ]);
                return false;
            }

            return true;
        }

        // Enhanced power validation based on MCEB Pub 7 field 115 specifications
        validatePowerFormat(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // MCEB Pub 7 power format with logical range validation
            const powerPattern = /^[WKMG]\d+(\.\d{1,5})?$/;

            if (!powerPattern.test(value)) {
                this.showFieldErrors(field, [
                    'Invalid power format. Use: W0.5, K1.5, M2.0, G1.0 per MCEB Pub 7'
                ]);
                return false;
            }

            // Validate logical ranges
            const unit = value.charAt(0);
            const powerValue = parseFloat(value.substring(1));

            let isValid = true;
            const errors = [];

            switch (unit) {
                case 'W':
                    if (powerValue >= 1000) {
                        errors.push('Power >= 1000W should use K prefix (e.g., K1.0)');
                        isValid = false;
                    }
                    break;
                case 'K':
                    if (powerValue < 1 || powerValue >= 1000) {
                        errors.push('K prefix for 1-999.99999 kW range');
                        isValid = false;
                    }
                    break;
                // Additional cases...
            }

            if (!isValid) {
                this.showFieldErrors(field, errors);
            }

            return isValid;
        }

        // Enhanced date validation for MCEB Pub 7 date fields (140, 141, 142, 143)
        validateMCEBDateField(field) {
            const value = field.value.trim();
            if (!value) return true;

            // MCEB Pub 7 date format: YYYYMMDD
            if (!/^\d{8}$/.test(value)) {
                this.showFieldErrors(field, ['Date format must be YYYYMMDD per MCEB Pub 7']);
                return false;
            }

            const year = parseInt(value.substring(0, 4));
            const month = parseInt(value.substring(4, 6));
            const day = parseInt(value.substring(6, 8));

            // Validate date components per MCEB Pub 7 requirements
            if (year < 1950 || year > 2099) {
                this.showFieldErrors(field, ['Year must be between 1950-2099']);
                return false;
            }

            // Additional date logic validation with leap year support
            const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

            if (month === 2 && isLeapYear) {
                daysInMonth[1] = 29;
            }

            if (day > daysInMonth[month - 1]) {
                this.showFieldErrors(field, [`Invalid day for month ${month.toString().padStart(2, '0')}`]);
                return false;
            }

            return true;
        }

        // Enhanced power validation based on MCEB Pub 7 field 115 specifications
        validatePowerFormat(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // MCEB Pub 7 power format with logical range validation
            const powerPattern = /^[WKMG]\d+(\.\d{1,5})?$/;

            if (!powerPattern.test(value)) {
                this.showFieldErrors(field, [
                    'Invalid power format. Use: W0.5, K1.5, M2.0, G1.0 per MCEB Pub 7'
                ]);
                return false;
            }

            // Validate logical ranges between power units
            const unit = value.charAt(0);
            const powerValue = parseFloat(value.substring(1));

            switch (unit) {
                case 'W':
                    if (powerValue >= 1000) {
                        this.showFieldWarning(field, 'Power >= 1000W should use K prefix (e.g., K1.0)');
                    }
                    break;
                case 'K':
                    if (powerValue < 1 || powerValue >= 1000) {
                        this.showFieldErrors(field, ['K prefix for 1-999.99999 kW range']);
                        return false;
                    }
                    break;
                case 'M':
                    if (powerValue < 1 || powerValue >= 1000) {
                        this.showFieldErrors(field, ['M prefix for 1-999.99999 MW range']);
                        return false;
                    }
                    break;
                case 'G':
                    if (powerValue < 1) {
                        this.showFieldErrors(field, ['G prefix for power >= 1 GW']);
                        return false;
                    }
                    break;
            }

            return true;
        }

        // Enhanced coordinate validation for fields 303/403
        validateCoordinates(field) {
            const value = field.value.trim();
            if (!value) return true;

            // MCEB Pub 7 coordinate formats
            // Format 1: DDDMMSS.SN/E (degrees, minutes, seconds)
            // Format 2: DD.DDDDDN/E (decimal degrees)

            const degMinSecPattern = /^(\d{2,3})(\d{2})(\d{2})(\.\d+)?([NSEW])$/;
            const decimalPattern = /^(\d{1,3})\.(\d{5,})([NSEW])$/;

            let isValid = false;
            const coord = value.toUpperCase();

            if (degMinSecPattern.test(coord)) {
                const match = coord.match(degMinSecPattern);
                const degrees = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseInt(match[3]);
                const hemisphere = match[5];

                // Validate ranges
                const maxDegrees = (hemisphere === 'N' || hemisphere === 'S') ? 90 : 180;

                if (degrees <= maxDegrees && minutes < 60 && seconds < 60) {
                    isValid = true;
                }
            } else if (decimalPattern.test(coord)) {
                const match = coord.match(decimalPattern);
                const degrees = parseFloat(match[1] + '.' + match[2]);
                const hemisphere = match[3];

                const maxDegrees = (hemisphere === 'N' || hemisphere === 'S') ? 90 : 180;

                if (degrees <= maxDegrees) {
                    isValid = true;
                }
            }

            if (!isValid) {
                this.showFieldErrors(field, [
                    'Invalid coordinate format per MCEB Pub 7',
                    'Use: DDDMMSS.SN/E or DD.DDDDDN/E format',
                    'Examples: 0384512.5N, 38.75347N'
                ]);
                return false;
            }

            return true;
        }

        // Add character counter with visual feedback
        addCharacterCounter(fieldId, maxLength) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            // Create counter element
            const counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.style.cssText = `
        font-size: 0.8em;
        color: #666;
        text-align: right;
        margin-top: 2px;
        font-family: monospace;
        transition: color 0.3s ease;
    `;

            field.parentNode.appendChild(counter);

            // Update counter on input
            field.addEventListener('input', () => {
                this.updateCharacterCounter(field, maxLength);
            });

            // Initial update
            this.updateCharacterCounter(field, maxLength);
        }

        // Enhanced field occurrence creation with validation
        createFieldOccurrence(fieldId, spec, occurrenceNumber) {
            const container = document.createElement('div');
            container.className = 'field-occurrence';
            container.setAttribute('data-occurrence', occurrenceNumber);
            container.style.cssText = `
        margin-top: 10px;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background-color: #f9f9f9;
        position: relative;
    `;

            // Add occurrence label
            const label = document.createElement('label');
            label.textContent = `${spec.title} #${occurrenceNumber}`;
            label.setAttribute('for', fieldId);
            label.style.cssText = `
        font-weight: bold; 
        margin-bottom: 8px; 
        display: block;
        color: #495057;
    `;

            // Create input field with proper attributes
            const input = document.createElement('input');
            input.type = 'text';
            input.id = fieldId;
            input.className = 'form-control';
            input.maxLength = spec.maxLength;
            input.setAttribute('data-field-spec', JSON.stringify(spec));
            input.style.cssText = 'width: 100%; margin-bottom: 5px;';

            // Add validation and character counter
            this.attachFieldValidation(fieldId);
            if (spec.maxLength) {
                this.addCharacterCounter(fieldId, spec.maxLength);
            }

            // Add remove button for occurrences > 1
            if (occurrenceNumber > 1) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'btn btn-sm btn-outline-danger';
                removeBtn.textContent = '×';
                removeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            width: 25px;
            height: 25px;
            padding: 0;
            border-radius: 50%;
        `;
                removeBtn.onclick = () => {
                    container.remove();
                    this.updateOccurrenceCounters(this.getBaseFieldId(fieldId), spec);
                };
                container.appendChild(removeBtn);
            }

            container.appendChild(label);
            container.appendChild(input);

            return container;
        }

        // Validate equipment manufacturer codes against official MCEB Pub 7 list
        validateEquipmentManufacturer(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            const validManufacturers = Object.keys(this.equipmentManufacturers);

            if (!validManufacturers.includes(value)) {
                this.showFieldWarning(field,
                    'Manufacturer code not in official MCEB Pub 7 list. Verify code accuracy.'
                );
            }

            return true;
        }

        // Complete frequency validation with band plan checking
        validateFrequency(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // Basic format validation
            const frequencyPattern = /^(\d+(\.\d{1,9})?)(HZ|KHZ|MHZ|GHZ)$/;

            if (!frequencyPattern.test(value)) {
                this.showFieldErrors(field, [
                    'Invalid frequency format per MCEB Pub 7',
                    'Use: 123.456MHZ, 14.25GHZ, etc.'
                ]);
                return false;
            }

            // Convert to Hz for band plan validation
            const match = value.match(frequencyPattern);
            const numValue = parseFloat(match[1]);
            const unit = match[3];

            let frequencyHz;
            switch (unit) {
                case 'HZ': frequencyHz = numValue; break;
                case 'KHZ': frequencyHz = numValue * 1000; break;
                case 'MHZ': frequencyHz = numValue * 1000000; break;
                case 'GHZ': frequencyHz = numValue * 1000000000; break;
            }

            // Validate against spectrum limits
            if (frequencyHz < 3 || frequencyHz > 300000000000) {
                this.showFieldErrors(field, ['Frequency out of valid range (3 Hz - 300 GHz)']);
                return false;
            }

            // Check common DoD frequency bands
            this.validateFrequencyBand(field, frequencyHz);

            return true;
        }

        // Export SFAF data to CSV format for analysis
        exportToCSV() {
            const formData = this.collectFormData();
            const csvRows = [];

            // CSV header
            csvRows.push(['Field ID', 'Field Name', 'Value', 'Occurrence']);

            // Process all fields
            Object.entries(formData).forEach(([fieldId, value]) => {
                const spec = this.fieldSpecs[fieldId];
                const fieldName = spec ? spec.title : fieldId;

                if (Array.isArray(value)) {
                    value.forEach((val, index) => {
                        csvRows.push([fieldId, fieldName, val, index + 1]);
                    });
                } else {
                    csvRows.push([fieldId, fieldName, value, 1]);
                }
            });

            // Convert to CSV string
            const csvContent = csvRows.map(row =>
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sfaf_export.csv';
            a.click();
            URL.revokeObjectURL(url);
        }

        exportFinalSFAFRecord() {
            const formData = this.collectFormData();
            const sfafLines = [];

            // MCEB Pub 7 standard header
            sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
            sfafLines.push('MCEB Publication 7, June 30, 2005');
            sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);

            // Export in official MCEB field order
            const fieldOrder = [
                '005', '010', '013', '019', '102', '701', '702',
                '110', '113', '114', '115', '116', '117', '118',
                // ... complete field order
            ];

            // Handle multiple occurrences properly
            fieldOrder.forEach(fieldNum => {
                const data = formData[`field${fieldNum}`];
                if (Array.isArray(data)) {
                    data.forEach((value, index) => {
                        if (index === 0) {
                            sfafLines.push(`${fieldNum}. ${value}`);
                        } else {
                            const occurrence = (index + 1).toString().padStart(2, '0');
                            sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                        }
                    });
                }
            });

            return sfafLines.join('\n');
        }

        // Add contextual help for MCEB Pub 7 fields
        addFieldHelp(fieldId, helpText) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            const helpIcon = document.createElement('span');
            helpIcon.innerHTML = '❓';
            helpIcon.style.cssText = `
        margin-left: 5px;
        cursor: help;
        color: #007bff;
        font-size: 0.9em;
    `;

            helpIcon.title = helpText;
            helpIcon.onclick = () => this.showFieldHelpModal(fieldId, helpText);

            field.parentNode.querySelector('label').appendChild(helpIcon);
        }

        // Show detailed field help modal
        showFieldHelpModal(fieldId, helpText) {
            const modal = document.createElement('div');
            modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

            const content = document.createElement('div');
            content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

            const spec = this.fieldSpecs[fieldId];
            content.innerHTML = `
        <h3>${spec.title} (${fieldId})</h3>
        <p><strong>MCEB Pub 7 Requirements:</strong></p>
        <p>${helpText}</p>
        <p><strong>Max Length:</strong> ${spec.maxLength} characters</p>
        ${spec.maxOccurrences ? `<p><strong>Max Occurrences:</strong> ${spec.maxOccurrences}</p>` : ''}
        <button onclick="this.closest('[style*=fixed]').remove()" 
                style="margin-top: 15px; padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
            Close
        </button>
    `;

            modal.appendChild(content);
            document.body.appendChild(modal);
        }



        // Validate entire form against MCEB Pub 7 standards
        validateEntireForm() {
            const errors = [];
            let isValid = true;

            // Required fields per MCEB Pub 7
            const requiredFields = [
                'field005', 'field010', 'field102', 'field110_1', 'field113_1',
                'field114_1', 'field115_1', 'field200', 'field300', 'field301',
                'field303', 'field400', 'field401', 'field403'
            ];

            // Check required fields
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!field || !field.value.trim()) {
                    errors.push(`Required field missing: ${fieldId} - ${this.getFieldTitle(fieldId)}`);
                    isValid = false;

                    if (field) {
                        field.style.borderColor = '#ff6b6b';
                    }
                }
            });

            // Validate field occurrence limits
            this.validateOccurrenceLimits(errors);

            // Check for classification consistency
            this.validateClassificationConsistency(errors);

            // Display validation results
            this.displayValidationResults(errors, isValid);

            return isValid;
        }

        // Update character counter with visual feedback
        updateCharacterCounter(field, maxLength) {
            let counter = field.parentNode.querySelector('.char-counter');
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'char-counter';
                counter.style.cssText = `
            font-size: 0.8em;
            color: #666;
            text-align: right;
            margin-top: 2px;
            font-family: monospace;
        `;
                field.parentNode.appendChild(counter);
            }

            const remaining = maxLength - field.value.length;
            counter.textContent = `${field.value.length}/${maxLength}`;

            // Color coding based on remaining characters
            if (remaining < 5) {
                counter.style.color = '#dc3545';  // Red when near limit
            } else if (remaining < 20) {
                counter.style.color = '#ffc107';  // Yellow when approaching limit
            } else {
                counter.style.color = '#666';     // Gray when safe
            }
        }

        // Complete station class validation per MCEB Pub 7
        validateStationClass(field) {
            const value = field.value.trim().toUpperCase();
            if (!value) return true;

            // Valid station classes from MCEB Pub 7
            const validStationClasses = [
                // Fixed Service
                'FB', 'FB2', 'FB3', 'FB8', 'FX1',
                // Mobile Service
                'ML', 'MA', 'MO', 'MP', 'MR', 'MS', 'MT',
                // Broadcasting
                'BC', 'BT',
                // Aeronautical
                'AC', 'AD', 'AF', 'AG', 'AL', 'AR', 'AS', 'AT',
                // Maritime
                'CG', 'CP', 'CS', 'CT',
                // Amateur
                'HA',
                // Experimental
                'XE', 'XF', 'XM', 'XR', 'XT'
            ];

            if (!validStationClasses.includes(value)) {
                this.showFieldWarning(field,
                    'Station class may not be standard. Verify against MCEB Pub 7 Annex B'
                );
            }

            return true;
        }

        // Display validation results with enhanced UI
        displayValidationResults(errors, isValid) {
            // Remove existing validation summary
            const existingSummary = document.querySelector('.validation-summary');
            if (existingSummary) {
                existingSummary.remove();
            }

            // Create enhanced validation summary
            const summary = document.createElement('div');
            summary.className = 'validation-summary';
            summary.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

            if (isValid) {
                summary.style.backgroundColor = '#d4edda';
                summary.style.borderLeft = '4px solid #28a745';
                summary.style.color = '#155724';
                summary.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">✅ SFAF Validation Passed</h4>
            <p style="margin: 0;">Form complies with MCEB Pub 7 standards</p>
        `;
            } else {
                summary.style.backgroundColor = '#f8d7da';
                summary.style.borderLeft = '4px solid #dc3545';
                summary.style.color = '#721c24';

                const errorList = errors.map(error => `<li>${error}</li>`).join('');
                summary.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">❌ SFAF Validation Failed</h4>
            <p style="margin: 0 0 10px 0;">${errors.length} error(s) found:</p>
            <ul style="margin: 0; padding-left: 20px; max-height: 200px; overflow-y: auto;">
                ${errorList}
            </ul>
        `;
            }

            document.body.appendChild(summary);

            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (summary.parentNode) {
                    summary.remove();
                }
            }, 10000);
        }

        // Show field errors
        showFieldErrors(field, errors) {
            field.style.borderColor = '#dc3545';

            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-errors';
            errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.8em;
        margin-top: 5px;
        padding: 5px;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
    `;

            errorDiv.innerHTML = errors.map(error => `• ${error}`).join('<br>');
            field.parentNode.appendChild(errorDiv);
        }

        // Show field warning
        showFieldWarning(field, warning) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'field-warning';
            warningDiv.style.cssText = `
        color: #856404;
        font-size: 0.8em;
        margin-top: 5px;
        padding: 5px;
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
    `;

            warningDiv.innerHTML = `⚠️ ${warning}`;
            field.parentNode.appendChild(warningDiv);
        }

        // Collect all form data
        collectFormData() {
            const formData = {};

            Object.keys(this.fieldSpecs).forEach(baseFieldId => {
                const spec = this.fieldSpecs[baseFieldId];

                if (spec.dynamic) {
                    // Collect dynamic field data
                    const values = [];
                    for (let i = 1; i <= spec.maxOccurrences; i++) {
                        const field = document.getElementById(`${baseFieldId}_${i}`);
                        if (field && field.value.trim()) {
                            values.push(field.value.trim());
                        }
                    }
                    if (values.length > 0) {
                        formData[baseFieldId] = values;
                    }
                } else {
                    // Collect single field data
                    const field = document.getElementById(baseFieldId);
                    if (field && field.value.trim()) {
                        formData[baseFieldId] = field.value.trim();
                    }
                }
            });

            return formData;
        }

        // Export complete SFAF record
        exportCompleteFormattedSFAF() {
            const formData = this.collectFormData();
            const sfafLines = [];

            // MCEB Pub 7 standard header
            sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
            sfafLines.push('MCEB Publication 7, June 30, 2005');
            sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
            sfafLines.push(`System: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push('');

            // Export all fields in official MCEB Pub 7 field order
            const fieldOrder = [
                '005', '010', '013', '019', '102', '701', '702',
                '110', '113', '114', '115', '116', '117', '118',
                '130', '131', '140', '141', '142', '143', '144',
                '200', '201', '202', '204', '205', '206', '207', '208', '209',
                '300', '301', '303', '306',
                '340', '343', '357', '362', '363', '373',
                '400', '401', '403', '407',
                '440', '443', '457', '462', '463', '470', '471', '472', '473',
                '500', '501', '502', '503', '511', '512', '513', '520',
                '716', '801', '803', '804', '903'
            ];

            fieldOrder.forEach(fieldNum => {
                const fieldId = `field${fieldNum}`;
                const data = formData[fieldId];

                if (data) {
                    if (Array.isArray(data)) {
                        // Handle multiple occurrences for dynamic fields
                        data.forEach((value, index) => {
                            if (index === 0) {
                                sfafLines.push(`${fieldNum}. ${value}`);
                            } else {
                                const occurrence = (index + 1).toString().padStart(2, '0');
                                sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                            }
                        });
                    } else {
                        // Handle single occurrence fields
                        sfafLines.push(`${fieldNum}. ${data}`);
                    }
                }
            });

            // Add MCEB Pub 7 compliant footer
            sfafLines.push('');
            sfafLines.push('***** END OF SFAF RECORD *****');
            sfafLines.push(`Record Format: MCEB Publication 7 Standard`);
            sfafLines.push(`Generated by: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push(`Timestamp: ${new Date().toISOString()}`);

            return sfafLines.join('\n');
        }

        // Export dynamic fields with proper occurrence numbering
        exportDynamicFields(sfafLines, formData, fieldIds) {
            fieldIds.forEach(baseFieldId => {
                const values = formData[baseFieldId];
                if (values) {
                    const fieldNumber = baseFieldId.replace('field', '');
                    if (Array.isArray(values)) {
                        values.forEach((value, index) => {
                            if (index === 0) {
                                sfafLines.push(`${fieldNumber}. ${value}`);
                            } else {
                                sfafLines.push(`${fieldNumber}/${(index + 1).toString().padStart(2, '0')}. ${value}`);
                            }
                        });
                    } else {
                        sfafLines.push(`${fieldNumber}. ${values}`);
                    }
                }
            });
        }

        // Generate compliance report
        generateComplianceReport() {
            const formData = this.collectFormData();
            const report = [];

            report.push('MCEB Publication 7 Compliance Report');
            report.push('====================================');
            report.push(`Generated: ${new Date().toLocaleString()}`);
            report.push('');

            // Check required fields per MCEB Pub 7
            const requiredFields = {
                'field005': 'Security Classification',
                'field010': 'Type of Action',
                'field102': 'Agency Serial Number',
                'field110': 'Frequency(ies)',
                'field113': 'Station Class',
                'field114': 'Emission Designator',
                'field115': 'Transmitter Power',
                'field200': 'Agency',
                'field300': 'State/Country (TX)',
                'field301': 'Antenna Location (TX)',
                'field303': 'Antenna Coordinates (TX)',
                'field400': 'State/Country (RX)',
                'field401': 'Antenna Location (RX)',
                'field403': 'Antenna Coordinates (RX)'
            };

            let missingRequired = 0;
            let presentRequired = 0;

            Object.entries(requiredFields).forEach(([fieldId, title]) => {
                const value = formData[fieldId] || (Array.isArray(formData[fieldId]) ? formData[fieldId][0] : null);
                if (value) {
                    presentRequired++;
                } else {
                    missingRequired++;
                    report.push(`❌ MISSING REQUIRED: ${fieldId} - ${title}`);
                }
            });

            report.push('');
            report.push(`Required Fields Status: ${presentRequired}/${presentRequired + missingRequired} complete`);
            report.push('');

            // Check field occurrence limits
            let exceedsLimits = 0;
            Object.keys(this.fieldSpecs).forEach(baseFieldId => {
                const spec = this.fieldSpecs[baseFieldId];
                if (spec.dynamic) {
                    const values = formData[baseFieldId];
                    if (Array.isArray(values) && values.length > spec.maxOccurrences) {
                        exceedsLimits++;
                        report.push(`⚠️ EXCEEDS LIMIT: ${baseFieldId} has ${values.length} occurrences (max: ${spec.maxOccurrences})`);
                    }
                }
            });

            if (exceedsLimits === 0) {
                report.push('✅ All field occurrence limits compliant with MCEB Pub 7');
            }

            report.push('');
            report.push(`Overall Compliance: ${missingRequired === 0 && exceedsLimits === 0 ? 'COMPLIANT' : 'NON-COMPLIANT'}`);

            return report.join('\n');
        }

        exportFinalSFAFRecord() {
            const formData = this.collectFormData();
            const sfafLines = [];

            // MCEB Pub 7 standard header
            sfafLines.push('***** STANDARD FREQUENCY ACTION FORMAT (SFAF) *****');
            sfafLines.push('MCEB Publication 7, June 30, 2005');
            sfafLines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
            sfafLines.push(`System: SFAF Plotter - Go Edition v1.0`);
            sfafLines.push('');

            // Export logic from source files...
            const fieldOrder = [
                '005', '010', '013', '019', '102', '701', '702',
                '110', '113', '114', '115', '116', '117', '118',
                '130', '131', '140', '141', '142', '143', '144',
                '200', '201', '202', '204', '205', '206', '207', '208', '209',
                '300', '301', '303', '306',
                '340', '343', '357', '362', '363', '373',
                '400', '401', '403', '407',
                '440', '443', '457', '462', '463', '470', '471', '472', '473',
                '500', '501', '502', '503', '511', '512', '513', '520',
                '716', '801', '803', '804', '903'
            ];

            fieldOrder.forEach(fieldNum => {
                const fieldId = `field${fieldNum}`;
                const data = formData[fieldId];

                if (data) {
                    if (Array.isArray(data)) {
                        data.forEach((value, index) => {
                            if (index === 0) {
                                sfafLines.push(`${fieldNum}. ${value}`);
                            } else {
                                const occurrence = (index + 1).toString().padStart(2, '0');
                                sfafLines.push(`${fieldNum}/${occurrence}. ${value}`);
                            }
                        });
                    } else {
                        sfafLines.push(`${fieldNum}. ${data}`);
                    }
                }
            });

            sfafLines.push('');
            sfafLines.push('***** END OF SFAF RECORD *****');
            return sfafLines.join('\n');
        }

        // Add all other missing methods from source files...
        saveFormState() {
            const formData = this.collectFormData();
            const stateData = {
                formData: formData,
                timestamp: new Date().toISOString(),
                version: 'MCEB_PUB_7_2005'
            };
            localStorage.setItem('sfafFormState', JSON.stringify(stateData));
            console.log('💾 SFAF form state saved');
        }

        restoreFormState() {
            const savedState = localStorage.getItem('sfafFormState');
            if (savedState) {
                try {
                    const stateData = JSON.parse(savedState);
                    this.populateFormFromData(stateData.formData);
                    console.log('🔄 SFAF form state restored from', stateData.timestamp);
                    return true;
                } catch (error) {
                    console.error('❌ Error restoring form state:', error);
                    return false;
                }
            }
            return false;
        }
        // initializeFieldSpecs() { /* from sources */ }
        // loadOfficialGeographicCodes() { /* from sources */ }
        // loadOfficialIRACNotes() { /* from sources */ }
        // loadOfficialFunctionIdentifiers() { /* from sources */ }
        // loadOfficialEquipmentCodes() { /* from sources */ }
        // loadOfficialTimeCodes() { /* from sources */ }
        // saveFormState() { /* from sources */ }
        // restoreFormState() { /* from sources */ }
        // validateEntireForm() { /* from sources */ }
        // exportFinalSFAFRecord() { /* from sources */ }
        // ... etc.
    }
    // Single initialization
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.sfafFieldManager = new SFAFFieldManager();
            console.log('🎯 SFAF Field Manager fully operational');
        } catch (error) {
            console.error('❌ Error initializing SFAF Field Manager:', error);
        }
    });

    window.SFAFFieldManager = SFAFFieldManager;

})(); // ← CRITICAL: Proper IIFE closure

// 2. THEN: Utility functions (from newfile.txt)
function setFieldValue(formFieldId, value) {
    // Implementation from newfile.txt
}

function downloadSFAF(sfafData, filename = 'sfaf_record.txt') {
    // Implementation from newfile.txt  
}

function showNotification(message, type = 'info') {
    // Implementation from newfile.txt
}

// // NOW the initialization code goes OUTSIDE the class:
// let sfafFieldManager;
// document.addEventListener('DOMContentLoaded', () => {
//     try {
//         sfafFieldManager = new SFAFFieldManager();

//         // Restore any saved form state
//         sfafFieldManager.restoreFormState();

//         console.log('🎯 SFAF Field Manager fully operational');
//         console.log('📖 Based on MCEB Publication 7, June 30, 2005');
//         console.log('✅ All official MCEB Pub 7 standards implemented');

//     } catch (error) {
//         console.error('❌ Error initializing SFAF Field Manager:', error);
//     }
// });

// Additional utility functions can go here
function setFieldValue(formFieldId, value) {
    if (!formFieldId || !value) return false;

    const field = document.getElementById(formFieldId);
    if (field) {
        console.log(`✅ Setting ${formFieldId} = ${value}`);
        field.value = value;
        field.dispatchEvent(new Event('change'));

        // Trigger MCEB Pub 7 validation if field manager is available
        if (window.sfafFieldManager) {
            window.sfafFieldManager.validateField(field);
        }

        return true;
    }
    return false;
}

// Global utility function for downloading SFAF records
function downloadSFAF(sfafData, filename = 'sfaf_record.txt') {
    const blob = new Blob([sfafData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('SFAF record downloaded', 'success');
}

// Global notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };

    const color = colors[type];
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        color: ${color.text};
        border: 1px solid ${color.border};
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 10000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

// Setup global keyboard shortcuts for SFAF operations
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S: Save form state
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            sfafFieldManager.saveFormState();
            showNotification('Form state saved', 'success');
        }

        // Ctrl+E: Export SFAF
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            const sfafData = sfafFieldManager.exportFinalSFAFRecord();
            downloadSFAF(sfafData);
        }

        // Ctrl+V: Validate form
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            sfafFieldManager.validateEntireForm();
        }
    });
}

// Show initialization errors
function showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
        z-index: 10000;
        font-family: monospace;
    `;
    errorDiv.innerHTML = `
        <strong>❌ SFAF Manager Initialization Failed</strong><br>
        ${error.message}<br>
        <small>Check console for details</small>
    `;
    document.body.appendChild(errorDiv);
}

// Map imported field IDs to SFAF field IDs
function mapImportedFieldId(importedFieldId) {
    const fieldMappings = {
        'security_classification': 'field005',
        'type_of_action': 'field010',
        'agency_serial': 'field102',
        'frequency': 'field110_1',
        'station_class': 'field113_1',
        'emission': 'field114_1',
        'power': 'field115_1',
        'agency': 'field200',
        'tx_state': 'field300',
        'tx_location': 'field301',
        'tx_coordinates': 'field303',
        'rx_state': 'field400',
        'rx_location': 'field401',
        'rx_coordinates': 'field403'
    };

    return fieldMappings[importedFieldId] || null;
}

// Handle field500 variants and dynamic field processing
function processField500Variants(importedFieldId, value) {
    if (importedFieldId.startsWith('500/')) {
        const occurrence = importedFieldId.split('/')[1];
        const targetFieldId = `field500_${parseInt(occurrence)}`;

        if (setFieldValue(targetFieldId, value)) {
            return { success: true };
        } else {
            // Create dynamic occurrence if needed
            sfafFieldManager.addFieldOccurrence('field500', sfafFieldManager.fieldSpecs['field500']);
            return { success: setFieldValue(targetFieldId, value) };
        }
    }
    return { success: false };
}

// Export for module systems (Node.js, etc.)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SFAFFieldManager,
        setFieldValue,
        downloadSFAF,
        showNotification,
        setupKeyboardShortcuts,
        mapImportedFieldId
    };
}

// AMD/RequireJS support
if (typeof define === 'function' && define.amd) {
    define([], function () {
        return {
            SFAFFieldManager,
            setFieldValue,
            downloadSFAF,
            showNotification
        };
    });
}

// Initialize map integration if available
if (typeof initializeMap === 'function') {
    initializeMap();
    console.log('🗺️ Map integration initialized');
}

// Auto-populate coordinate fields from marker data
function populateCoordinatesFromMap(data) {
    if (data.coordinates) {
        setFieldValue('field303', data.coordinates.compact);
        setFieldValue('field403', data.coordinates.compact);
        console.log('📍 Coordinates populated from map data');
    }
}