// irac-notes-loader.js
class iracNotesManager {
    constructor() {
        this.notes = {};
        this.loaded = false;
    }
    
    async loadNotes() {
        try {
            const response = await fetch('./data/irac-notes-reference.json');
            this.notes = await response.json();
            this.loaded = true;
            console.log('✅ IRAC notes reference loaded successfully');
            return this.notes;
        } catch (error) {
            console.error('❌ Failed to load IRAC notes reference:', error);
            return this.getFallbackNotes();
        }
    }
    
    getFallbackNotes() {
        // Fallback to hardcoded essential notes if file fails to load
        return {
            coordination: {
                "C010": { code: "C010", title: "Gulf Area Frequency Coordinator" }
            },
            limitation: {
                "L012": { code: "L012", title: "Emergency use only" }
            },
            special: {
                "S142": { code: "S142", title: "Drone Control" },
                "S148": { code: "S148", title: "National emergency communications" }
            }
        };
    }
    
    getAllNotes() {
        const allNotes = [];
        
        // Handle categorized structure from reference file
        if (this.notes.coordination || this.notes.limitation) {
            Object.values(this.notes).forEach(category => {
                if (typeof category === 'object') {
                    Object.values(category).forEach(note => {
                        allNotes.push(note);
                    });
                }
            });
        } else {
            // Handle flat structure fallback
            Object.entries(this.notes).forEach(([code, description]) => {
                allNotes.push({ code, title: description });
            });
        }
        
        return allNotes.sort((a, b) => a.code.localeCompare(b.code));
    }
    
    searchNotes(query) {
        return this.getAllNotes().filter(note =>
            note.code.toLowerCase().includes(query.toLowerCase()) ||
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            (note.description && note.description.toLowerCase().includes(query.toLowerCase()))
        );
    }
    
    getNotesByCategory(categoryKey) {
        // Handle categorized structure
        if (this.notes[categoryKey]) {
            return Object.values(this.notes[categoryKey]);
        }
        
        // Handle flat structure fallback
        const categorizedNotes = [];
        Object.entries(this.notes).forEach(([code, description]) => {
            const prefix = code.charAt(0).toLowerCase();
            
            switch (categoryKey) {
                case 'coordination':
                    if (prefix === 'c') {
                        categorizedNotes.push({ 
                            code, 
                            title: typeof description === 'string' ? description : description.title 
                        });
                    }
                    break;
                case 'emission':
                    if (prefix === 'e') {
                        categorizedNotes.push({ 
                            code, 
                            title: typeof description === 'string' ? description : description.title 
                        });
                    }
                    break;
                case 'limitation':
                    if (prefix === 'l') {
                        categorizedNotes.push({ 
                            code, 
                            title: typeof description === 'string' ? description : description.title 
                        });
                    }
                    break;
                case 'special':
                    if (prefix === 's') {
                        categorizedNotes.push({ 
                            code, 
                            title: typeof description === 'string' ? description : description.title 
                        });
                    }
                    break;
                case 'priority':
                    if (prefix === 'p') {
                        categorizedNotes.push({ 
                            code, 
                            title: typeof description === 'string' ? description : description.title 
                        });
                    }
                    break;
            }
        });
        
        return categorizedNotes;
    }
}

// Global instance
window.iracNotesManager = new iracNotesManager();