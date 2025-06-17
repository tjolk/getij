// Chart.js graph logic for water height
import { chartPlugins } from './chart-plugins.js';
import { getHighLowAnnotations, getSunMoonIconPositions } from './chart-annotations.js';
import { findClosestIndex, getYRangePadding } from './chart-utils.js';
import { formatDateTime, movingAverage } from './utils.js';

export async function renderWaterHoogteGraph(rows) {
    // Fetch astronomy data for overlays
    let astronomyData = {};
    try {
        const resp = await fetch('data/ipgeolocationAstronomy.json');
        astronomyData = await resp.json();
    } catch (e) {
        astronomyData = {};
    }

    const labels = rows.map(row => {
        const date = new Date(row.tijd);
        return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    });
    const data = rows.map(row => (row.gemeten != null) ? row.gemeten : (row.verwacht != null ? row.verwacht : null));
    const ctx = document.getElementById('waterhoogte-graph').getContext('2d');
    const smoothedData = movingAverage(data, 10);

    // Bepaal index van huidige tijd (dichtstbijzijnde punt)
    const now = new Date();
    let closestIdx = 0;
    let minDiff = Infinity;
    rows.forEach((row, i) => {
        const diff = Math.abs(new Date(row.tijd) - now);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
        }
    });
    // Find highest and lowest points
    const values = rows.map(d => (d.gemeten != null) ? d.gemeten : (d.verwacht != null ? d.verwacht : null));
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const maxIndex = values.indexOf(maxValue);
    const minIndex = values.indexOf(minValue);
    const maxLabel = rows[maxIndex].tijd;
    const minLabel = rows[minIndex].tijd;

    // Find all 8-hour window maxima (label only the first of the middle if there are ties)
    const windowHours = 2;
    const pointsPerHour = Math.round(rows.length / 24); // Estimate points per hour
    const windowSize = Math.max(1, Math.floor((windowHours * pointsPerHour) / 2));
    const highPoints = [];
    for (let i = windowSize; i < values.length - windowSize; i++) {
        // Get window
        const windowVals = values.slice(i - windowSize, i + windowSize + 1);
        const maxInWindow = Math.max(...windowVals);
        if (values[i] === maxInWindow) {
            // Find all indices in window with max value
            const maxIndices = [];
            for (let j = 0; j < windowVals.length; j++) {
                if (windowVals[j] === maxInWindow) maxIndices.push(j);
            }
            const center = windowSize;
            // Label if this is the first OR the middle one (for ties)
            let labelIdx = maxIndices[Math.floor((maxIndices.length - 1) / 2)];
            if ((maxIndices[0] === center && i === (i - windowSize + maxIndices[0])) || (labelIdx === center)) {
                if (i === 0 || values[i] !== values[i-1]) {
                    highPoints.push({
                        index: i,
                        value: values[i],
                        tijd: rows[i].tijd
                    });
                }
            }
        }
    }
    // Add the global max if not already included
    if (!highPoints.some(p => p.index === maxIndex)) {
        highPoints.push({ index: maxIndex, value: maxValue, tijd: maxLabel });
    }

    // Find all 8-hour window minima (label only the first or the middle if there are ties)
    const lowPoints = [];
    for (let i = windowSize; i < values.length - windowSize; i++) {
        const windowVals = values.slice(i - windowSize, i + windowSize + 1);
        const minInWindow = Math.min(...windowVals);
        if (values[i] === minInWindow) {
            // Find all indices in window with min value
            const minIndices = [];
            for (let j = 0; j < windowVals.length; j++) {
                if (windowVals[j] === minInWindow) minIndices.push(j);
            }
            const center = windowSize;
            let labelIdx = minIndices[Math.floor((minIndices.length - 1) / 2)];
            if ((minIndices[0] === center && i === (i - windowSize + minIndices[0])) || (labelIdx === center)) {
                if (i === 0 || values[i] !== values[i-1]) {
                    lowPoints.push({
                        index: i,
                        value: values[i],
                        tijd: rows[i].tijd
                    });
                }
            }
        }
    }
    // Add the global min if not already included
    if (!lowPoints.some(p => p.index === minIndex)) {
        lowPoints.push({ index: minIndex, value: minValue, tijd: minLabel });
    }

    // Calculate overlay regions (gray) between sunset and next sunrise
    let overlays = [];
    const dates = Object.keys(astronomyData).sort();
    for (let i = 0; i < dates.length; i++) {
        const astro = astronomyData[dates[i]].astronomy;
        const sunset = astro.sunset;
        const sunriseNext = astronomyData[dates[i+1]]?.astronomy?.sunrise;
        if (sunset && sunriseNext) {
            const sunsetDateTime = dates[i] + 'T' + sunset;
            const sunriseDateTime = dates[i+1] + 'T' + sunriseNext;
            const sunsetIdx = findClosestIndex(rows, sunsetDateTime);
            const sunriseIdx = findClosestIndex(rows, sunriseDateTime);
            if (sunsetIdx !== -1 && sunriseIdx !== -1 && sunriseIdx > sunsetIdx) {
                overlays.push({ xMin: sunsetIdx, xMax: sunriseIdx });
            }
        }
    }

    // Calculate y-axis range with 1/4 below min and 1/3 above max
    const { yPaddingBelow, yPaddingAbove } = getYRangePadding(minValue, maxValue);
    const suggestedMin = minValue - yPaddingBelow;
    const suggestedMax = maxValue + yPaddingAbove;

    // Calculate sun/moon icon positions using modularized function
    const { sunIconPositions, moonIconPositions } = getSunMoonIconPositions(
        dates,
        astronomyData,
        findClosestIndex,
        suggestedMax,
        rows
    );

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waterhoogte (cm)',
                data: smoothedData,
                borderColor: 'rgba(173, 216, 230,0)',
                backgroundColor: '#005f9e',
                fill: { target: { value: -200 }, above: '#005f9e', below: '#005f9e' },
                pointRadius: 0, // geen punten
                tension: 1, // vloeiender lijn (was 0.5)
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
                annotation: {
                    annotations: getHighLowAnnotations(highPoints, lowPoints, formatDateTime, maxValue, minValue)
                },
                // Pass custom plugin data
                _overlays: overlays,
                _sunIconPositions: sunIconPositions,
                _moonIconPositions: moonIconPositions,
                _closestIdx: closestIdx,
                _labels: labels
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false,
                    suggestedMin: suggestedMin,
                    suggestedMax: suggestedMax
                }
            }
        },
        plugins: chartPlugins
    });
}
