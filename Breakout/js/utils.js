// utils.js
import { map } from './map.js';

// ------------------ Utility Functions ------------------

let manualCounter = 1;
export function generateSerial() {
    return "FREQ" + String(manualCounter++).padStart(6, "0");
}

// Generate a random hex color
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Convert decimal degrees to compact DMS string (e.g., 1234506N0863541W)
export function decimalToCompactDMS(decimal, isLongitude) {
    const absDecimal = Math.abs(decimal);
    const degrees = Math.floor(absDecimal);
    const minutesFloat = (absDecimal - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.floor((minutesFloat - minutes) * 60);

    const direction = isLongitude
        ? (decimal < 0 ? 'W' : 'E')
        : (decimal < 0 ? 'S' : 'N');

    const degreesPadLength = isLongitude ? 3 : 2;

    return (
        degrees.toString().padStart(degreesPadLength, '0') +
        minutes.toString().padStart(2, '0') +
        seconds.toString().padStart(2, '0') +
        direction
    );
}


// Convert lat/lng pair to combined compact DMS string
export function convertLatLngToCompactDMS(lat, lng) {
    return decimalToCompactDMS(lat, false) + decimalToCompactDMS(lng, true);
}

// Convert decimal degrees to DMS (for tooltips)
export function convertToDMS(dec, isLongitude = false) {
    // Work with absolute value for calculations
    const absDec = Math.abs(dec);
    
    const deg = Math.floor(absDec);
    const minFloat = (absDec - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.floor((minFloat - min) * 60);
    
    // Determine direction
    const direction = isLongitude
        ? (dec < 0 ? 'W' : 'E')
        : (dec < 0 ? 'S' : 'N');
    
    // Return regular DMS format with symbols
    return `${deg}° ${min}' ${sec}" ${direction}`;
}