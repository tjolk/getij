// Utility functions for date formatting and helpers

/**
 * Formats an ISO date string to Dutch date and time.
 * @param {string} isoString - The ISO date string.
 * @returns {{datum: string, tijd: string}}
 */
export function formatDateTime(isoString) {
    const date = new Date(isoString);
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const time = date.toLocaleTimeString('nl-NL', timeOptions);
    return {
        datum: date.toLocaleDateString('nl-NL', dateOptions).replace(",", " -"),
        tijd: `${time}`
    };
}

/**
 * Checks if two dates are on the same calendar day.
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Calculates the moving average of an array with a given window size.
 * @param {number[]} arr - The input array.
 * @param {number} windowSize - The size of the moving window.
 * @returns {number[]}
 */
export function movingAverage(arr, windowSize) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const startIdx = Math.max(0, i - Math.floor(windowSize / 2));
        const endIdx = Math.min(arr.length, i + Math.ceil(windowSize / 2));
        const window = arr.slice(startIdx, endIdx).filter(v => v !== null && v !== undefined);
        if (window.length > 0) {
            result.push(window.reduce((a, b) => a + b, 0) / window.length);
        } else {
            result.push(null);
        }
    }
    return result;
}
