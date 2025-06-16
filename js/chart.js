// Chart.js graph logic for water height
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
    function findClosestIndex(targetDateTime) {
        let minDiff = Infinity;
        let idx = -1;
        for (let i = 0; i < rows.length; i++) {
            const diff = Math.abs(new Date(rows[i].tijd) - new Date(targetDateTime));
            if (diff < minDiff) {
                minDiff = diff;
                idx = i;
            }
        }
        return idx;
    }
    for (let i = 0; i < dates.length; i++) {
        const astro = astronomyData[dates[i]].astronomy;
        const sunset = astro.sunset;
        const sunriseNext = astronomyData[dates[i+1]]?.astronomy?.sunrise;
        if (sunset && sunriseNext) {
            const sunsetDateTime = dates[i] + 'T' + sunset;
            const sunriseDateTime = dates[i+1] + 'T' + sunriseNext;
            const sunsetIdx = findClosestIndex(sunsetDateTime);
            const sunriseIdx = findClosestIndex(sunriseDateTime);
            if (sunsetIdx !== -1 && sunriseIdx !== -1 && sunriseIdx > sunsetIdx) {
                overlays.push({ xMin: sunsetIdx, xMax: sunriseIdx });
            }
        }
    }

    // Calculate y-axis range with 1/4 below min and 1/3 above max
    const yRange = maxValue - minValue;
    const yPaddingBelow = yRange / 4;
    const yPaddingAbove = yRange / 3;
    const suggestedMin = minValue - yPaddingBelow;
    const suggestedMax = maxValue + yPaddingAbove;

    // Add sun annotations between sunrise and sunset (Chart.js v3 + annotation v1.x: use type 'line' with label)
    let sunAnnotations = [];
    for (let i = 0; i < dates.length; i++) {
        const astro = astronomyData[dates[i]].astronomy;
        const sunrise = astro.sunrise;
        const sunset = astro.sunset;
        if (sunrise && sunset) {
            // Find closest indices for sunrise and sunset
            const sunriseDateTime = dates[i] + 'T' + sunrise;
            const sunsetDateTime = dates[i] + 'T' + sunset;
            const sunriseIdx = findClosestIndex(sunriseDateTime);
            const sunsetIdx = findClosestIndex(sunsetDateTime);
            if (sunriseIdx !== -1 && sunsetIdx !== -1 && sunsetIdx > sunriseIdx) {
                const sunIdx = Math.round((sunriseIdx + sunsetIdx) / 2);
                sunAnnotations.push([
                    `sun${i}`,
                    {
                        type: 'line',
                        xMin: sunIdx,
                        xMax: sunIdx,
                        yMin: suggestedMax,
                        yMax: suggestedMax,
                        borderWidth: 0, // no line
                        label: {
                            enabled: true,
                            content: ['☀'], // Material-like sun
                            font: { size: 18, weight: 'normal' }, // less bold
                            color: '#ffcc00',
                            backgroundColor: 'rgba(0,0,0,0)',
                            position: 'start',
                            yAdjust: -10
                        }
                    }
                ]);
            }
        }
    }

    // Add moon annotations between moonrise and moonset (Chart.js v3 + annotation v1.x: use type 'line' with label)
    let moonAnnotations = [];
    for (let i = 0; i < dates.length; i++) {
        const astro = astronomyData[dates[i]].astronomy;
        const moonrise = astro.moonrise;
        const moonset = astro.moonset;
        if (moonrise && moonset && moonrise !== "-:-" && moonset !== "-:-") {
            // Find closest indices for moonrise and moonset
            const moonriseDateTime = dates[i] + 'T' + moonrise;
            const moonsetDateTime = dates[i] + 'T' + moonset;
            const moonriseIdx = findClosestIndex(moonriseDateTime);
            const moonsetIdx = findClosestIndex(moonsetDateTime);
            if (moonriseIdx !== -1 && moonsetIdx !== -1 && moonsetIdx > moonriseIdx) {
                const moonIdx = Math.round((moonriseIdx + moonsetIdx) / 2);
                moonAnnotations.push([
                    `moon${i}`,
                    {
                        type: 'line',
                        xMin: moonIdx,
                        xMax: moonIdx,
                        yMin: suggestedMax,
                        yMax: suggestedMax,
                        borderWidth: 0, // no line
                        label: {
                            enabled: true,
                            content: ['☾'], // Material-like moon
                            font: { size: 12, weight: 'bold' }, // less bold
                            color: '#ffcc00',
                            backgroundColor: 'rgba(0,0,0,0)',
                            position: 'start',
                            yAdjust: -7
                        }
                    }
                ]);
            }
        }
    }

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
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false },
                annotation: {
                    annotations: {
                        currentTimeBox: {
                            type: 'line',
                            xMin: Math.max(closestIdx - 0.5, 0),
                            xMax: Math.min(closestIdx + 0.5, labels.length - 1),
                            borderColor: 'rgba(255,204,0,1)',
                            borderWidth: 2,
                            drawTime: 'afterDraw',
                            display: true
                        },
                        ...Object.fromEntries(highPoints.map((p, idx) => [
                            `highLabel${idx}`,
                            {
                                type: 'line',
                                xMin: p.index,
                                xMax: p.index,
                                yMin: maxValue, // align all at the highest y
                                yMax: maxValue, // align all at the highest y
                                label: {
                                    enabled: true,
                                    content: [formatDateTime(p.tijd).tijd],
                                    backgroundColor: 'rgba(0,0,0,0)',
                                    color: '#fff',
                                    font: { size: 14 },
                                    yAdjust: -7
                                }
                            }
                        ])),
                        ...Object.fromEntries(lowPoints.map((p, idx) => [
                            `lowLabel${idx}`,
                            {
                                type: 'line',
                                xMin: p.index,
                                xMax: p.index,
                                yMin: minValue, // align all at the lowest y
                                yMax: minValue, // align all at the lowest y
                                label: {
                                    enabled: true,
                                    content: [formatDateTime(p.tijd).tijd],
                                    position: 'bottom',
                                    backgroundColor: 'rgba(0,0,0,0)',
                                    color: '#fff',
                                    font: { size: 14 },
                                    yAdjust: 5
                                }
                            }
                        ])),
                        ...Object.fromEntries(sunAnnotations),
                        ...Object.fromEntries(moonAnnotations),
                    }
                }
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
        plugins: [
            {
                id: 'nightOverlayBox',
                beforeDatasetsDraw: function(chart) {
                    const chartArea = chart.chartArea;
                    const ctx = chart.ctx;
                    if (!chartArea) return;
                    overlays.forEach(o => {
                        const xScale = chart.scales.x;
                        if (!xScale) return;
                        const xMinPx = xScale.getPixelForValue(o.xMin);
                        const xMaxPx = xScale.getPixelForValue(o.xMax);
                        const yTop = chartArea.top;
                        const yBottom = chartArea.bottom;
                        ctx.save();
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.fillStyle = 'rgba(128,128,128,0.25)';
                        ctx.fillRect(xMinPx, yTop, xMaxPx - xMinPx, yBottom - yTop);
                        ctx.restore();
                    });
                }
            },
            {
                id: 'customCanvasBackgroundColor',
                beforeDraw: (chart) => {
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = 'rgba(173, 216, 230, 1)'; // match the fill color
                    ctx.fillRect(0, 0, chart.width, chart.height);
                    ctx.restore();
                }
            }
        ]
    });
}
