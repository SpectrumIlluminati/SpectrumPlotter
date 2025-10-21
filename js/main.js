// main.js
import { map, drawnItems } from './map.js';
import { initializeDrawHandlers } from './geometry.js';

window.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded');
    console.log('Map available:', !!map); // Debug line
    
   const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: {
            showArea: false,  // Disable area calculation during drawing
            metric: false,    // Disable metric measurements
            feet: false       // Disable imperial measurements
        },
        polyline: false,
        rectangle: {
            showArea: false,
            metric: false
        },
        circle: {
            showRadius: false,  // Disable radius display during drawing
            metric: false,
            feet: false
        },
        marker: true,
        circlemarker: false
    }
    });
        
        map.addControl(drawControl);
        console.log('✅ Draw control added');
        
        // Pass map instance to the function
        initializeDrawHandlers(map);
    }
);