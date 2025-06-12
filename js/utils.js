// Utility functions for date formatting and helpers

export function formatDateTime(isoString) {
    const date = new Date(isoString);
    const datumOpties = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' };
    const tijdOpties = { hour: '2-digit', minute: '2-digit' };
    const tijd = date.toLocaleTimeString('nl-NL', tijdOpties);
    return {
        datum: date.toLocaleDateString('nl-NL', datumOpties).replace(",", " -"),
        tijd: `${tijd}`
    };
}

export function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

export function movingAverage(arr, windowSize) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        let start = Math.max(0, i - Math.floor(windowSize / 2));
        let end = Math.min(arr.length, i + Math.ceil(windowSize / 2));
        let window = arr.slice(start, end).filter(v => v !== null && v !== undefined);
        if (window.length > 0) {
            result.push(window.reduce((a, b) => a + b, 0) / window.length);
        } else {
            result.push(null);
        }
    }
    return result;
}
