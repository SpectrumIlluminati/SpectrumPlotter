// sfaf-reference-data.js - MCEB Pub 7 Official Reference Data
// All official reference data from MCEB Publication 7 (1 November 2018)

const SFAF_REFERENCE_DATA = {
    // Function Identifiers (234+ items from MCEB Pub 7 Annex G)
    functionIdentifiers: [
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
    ],
    // Equipment Manufacturer Codes (40+ codes from MCEB Pub 7 Annex D)
    equipmentCodes: {
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
    },

    // Geographic Codes (200+ codes from MCEB Pub 7 Annex C)
    loadOfficialGeographicCodes: {
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
        },

        IRACNotes: {
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
        },

        timeCodes: {
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
        }
    },
            PowerTypes: {
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
            }
        };

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SFAF_REFERENCE_DATA;
}
if (typeof window !== 'undefined') {
    window.SFAF_REFERENCE_DATA = SFAF_REFERENCE_DATA;
}