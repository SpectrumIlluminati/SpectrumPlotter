export function convertToDMS(decimal) {
    const deg = Math.floor(Math.abs(decimal));
    const minFloat = (Math.abs(decimal) - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60);
    const dir = decimal < 0 ? (decimal === lat ? 'S' : 'W') : (decimal === lat ? 'N' : 'E');
    return `${deg}°${min}'${sec}"${dir}`;
}

export function convertToCompactDMS(lat, lng) {
    function toCompactDMS(decimal, isLng = false) {
        const abs = Math.abs(decimal);
        const deg = Math.floor(abs);
        const minFloat = (abs - deg) * 60;
        const min = Math.floor(minFloat);
        const sec = Math.floor((minFloat - min) * 60);
        const dir = isLng ? (decimal < 0 ? 'W' : 'E') : (decimal < 0 ? 'S' : 'N');
        return `${deg.toString().padStart(isLng ? 3 : 2, '0')}${min.toString().padStart(2, '0')}${sec.toString().padStart(2, '0')}${dir}`;
    }
    return toCompactDMS(lat, false) + toCompactDMS(lng, true);
}

export function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
}

export function generateSerial() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
}