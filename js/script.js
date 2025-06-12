// Register annotation plugin for Chart.js v3
if (window.ChartAnnotation) {
  Chart.register(window.ChartAnnotation);
}

async function getTideData() {
    const jsonUrl = "/data/getijExtremenScheveningenData.json"; // Verwijzing naar lokaal JSON-bestand

    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`Fout: ${response.status} ${response.statusText}`);

        const data = await response.json();
        displayTides(data);
    } catch (error) {
        console.error("❌ Fout bij het ophalen van JSON-data:", error);
        document.getElementById("output").innerHTML = `<p>Er is een fout opgetreden bij het laden van gegevens.</p>`;
    }
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const datumOpties = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' };
    const tijdOpties = { hour: '2-digit', minute: '2-digit' };

    const tijd = date.toLocaleTimeString('nl-NL', tijdOpties);
    const uur = date.getHours();

    return {
        datum: date.toLocaleDateString('nl-NL', datumOpties).replace(",", " -"),
        tijd: `${tijd}`
    };
}

function appendTideCards(metingen, container, colorMap, highlightNextTide = false, nextTideIndex = -1) {
    // Find the next tide (first one in the future)
    if (highlightNextTide && nextTideIndex === -1) {
        const now = new Date();
        for (let i = 0; i < metingen.length; i++) {
            const tideTime = new Date(metingen[i].tijdstip);
            if (tideTime > now) {
                nextTideIndex = i;
                break;
            }
        }
    }
    metingen.forEach((meting, idx) => {
        const card = document.createElement("div");
        let highlightClass = (highlightNextTide && idx === nextTideIndex) ? "next-tide" : "";
        card.className = `tide-card ${colorMap[meting.kleur]} ${highlightClass}`;
        card.innerHTML = `<p class="tijd">${meting.tijd}</p> <p>${meting.hoogte}</p>`;
        container.appendChild(card);
    });
}

function displayTides(data) {
    const dayCard = document.getElementById("tides-day-card");
    const dayTitle = document.getElementById("day-title");
    const cardContainer = document.getElementById("tides-card-container");

    const tomorrowCard = document.getElementById("tides-tomorrow-card");
    const tomorrowTitle = document.getElementById("tomorrow-title");
    const tomorrowContainer = document.getElementById("tides-tomorrow-container");

    dayCard.style.display = "block";
    tomorrowCard.style.display = "block";
    tomorrowCard.classList.add("tomorrow-card");
    cardContainer.innerHTML = "";
    tomorrowContainer.innerHTML = "";

    // Define today, tomorrow, and overmorgen dates for comparison
    const vandaagDate = new Date();
    vandaagDate.setHours(0,0,0,0);
    const morgenDate = new Date(vandaagDate);
    morgenDate.setDate(morgenDate.getDate() + 1);
    const overmorgenDate = new Date(vandaagDate);
    overmorgenDate.setDate(overmorgenDate.getDate() + 2);

    if (!data?.WaarnemingenLijst?.length) {
        dayTitle.innerText = "Geen getijdendata beschikbaar";
        tomorrowTitle.innerText = "Geen getijdendata beschikbaar";
        return;
    }

    let metingenVandaag = [];
    let metingenMorgen = [];
    let metingenOvermorgen = [];

    // Set only the day titles with date, but without parentheses
    if (dayTitle) dayTitle.textContent = `Vandaag ${vandaagDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`;
    if (tomorrowTitle) tomorrowTitle.textContent = `Morgen ${morgenDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`;

    // Use the first WaarnemingLijst that contains at least one MetingenLijst item with Waarde_Numeriek
    const waarneming = data.WaarnemingenLijst && data.WaarnemingenLijst.find(w =>
        w.MetingenLijst && w.MetingenLijst.some(m => typeof m.Meetwaarde.Waarde_Numeriek === "number")
    );
    if (!waarneming) return;

    waarneming.MetingenLijst.forEach(meting => {
        if (typeof meting.Meetwaarde.Waarde_Numeriek === "number") {
            const waardeNum = meting.Meetwaarde.Waarde_Numeriek;
            const pijlHTML = waardeNum >= 0 ? "▲" : "▼";
            const tijdInfo = formatDateTime(meting.Tijdstip);
            const metingDate = new Date(meting.Tijdstip);

            if (isSameDay(metingDate, vandaagDate)) {
                metingenVandaag.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue", tijdstip: meting.Tijdstip });
            } else if (isSameDay(metingDate, morgenDate)) {
                metingenMorgen.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue", tijdstip: meting.Tijdstip });
            } else if (isSameDay(metingDate, overmorgenDate)) {
                metingenOvermorgen.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue", tijdstip: meting.Tijdstip });
            }
        }
    });

    metingenVandaag.sort((a, b) => new Date(a.tijdstip) - new Date(b.tijdstip));
    metingenMorgen.sort((a, b) => new Date(a.tijdstip) - new Date(b.tijdstip));
    metingenOvermorgen.sort((a, b) => new Date(a.tijdstip) - new Date(b.tijdstip));

    // If only 3 tides today, add the first tide of tomorrow to today
    if (metingenVandaag.length === 3 && metingenMorgen.length > 0) {
        metingenVandaag.push(metingenMorgen[0]);
    }
    // If only 3 tides tomorrow, add the first tide of overmorgen to tomorrow
    if (metingenMorgen.length === 3 && metingenOvermorgen.length > 0) {
        metingenMorgen.push(metingenOvermorgen[0]);
    }

    // Find the next tide index for today and tomorrow
    const now = new Date();
    let nextTideIndexVandaag = -1;
    let nextTideIndexMorgen = -1;
    for (let i = 0; i < metingenVandaag.length; i++) {
        if (new Date(metingenVandaag[i].tijdstip) > now) {
            nextTideIndexVandaag = i;
            break;
        }
    }
    if (nextTideIndexVandaag === -1) {
        for (let i = 0; i < metingenMorgen.length; i++) {
            if (new Date(metingenMorgen[i].tijdstip) > now) {
                nextTideIndexMorgen = i;
                break;
            }
        }
    }

    appendTideCards(metingenVandaag, cardContainer, { darkblue: 'darkblue', lightblue: 'lightblue' }, true, nextTideIndexVandaag);
    appendTideCards(metingenMorgen, tomorrowContainer, { darkblue: 'gray-dark', lightblue: 'gray-light' }, true, nextTideIndexMorgen);
}

// Helper to check if two dates are the same day (year, month, day)
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// --- WATERHOOGTE TABEL LOGICA ---
async function loadAndDisplayWaterHoogteTable() {
    // Alleen verwacht en gemeten
    const files = [
        { url: 'data/waterHoogteVerwachtScheveningenData.json', key: 'verwacht' },
        { url: 'data/waterHoogteScheveningenData.json', key: 'gemeten' }
    ];
    // Data laden
    const results = await Promise.all(files.map(f => fetch(f.url).then(r => r.json())));
    // Extractie per bestand
    const dataMap = {};
    files.forEach((f, i) => {
        const lijst = results[i]?.WaarnemingenLijst?.[0]?.MetingenLijst || [];
        lijst.forEach(m => {
            const waarde = (typeof m.Meetwaarde?.Waarde_Numeriek === 'number') ? m.Meetwaarde.Waarde_Numeriek : null;
            if (waarde === 999999999) return; // skip invalid value
            const tijd = m.Tijdstip;
            if (!dataMap[tijd]) dataMap[tijd] = { tijd };
            dataMap[tijd][f.key] = waarde;
        });
    });
    // Sorteren op tijd
    const rows = Object.values(dataMap).sort((a, b) => new Date(a.tijd) - new Date(b.tijd));
    // Tabel bouwen: alleen één kolom, waarbij gemeten voorgaat boven verwacht
    let html = '<table><thead><tr><th>Datum/tijd</th><th>Water hoogte (cm)</th></tr></thead><tbody>';
    rows.forEach(row => {
        // Gebruik gemeten als die er is, anders verwacht
        const waarde = (row.gemeten != null) ? row.gemeten : (row.verwacht != null ? row.verwacht : '-');
        html += `<tr><td>${formatDateTime(row.tijd).tijd} ${formatDateTime(row.tijd).datum}</td>` +
            `<td>${waarde}</td></tr>`;
    });
    html += '</tbody></table>';
    if (document.getElementById('waterhoogte-table')) {
        document.getElementById('waterhoogte-table').innerHTML = html;
    }
}

// --- WATERHOOGTE GRAFIEK LOGICA ---
async function loadAndDisplayWaterHoogteGraph() {
    // Zelfde merge logica als tabel
    const files = [
        { url: 'data/waterHoogteVerwachtScheveningenData.json', key: 'verwacht' },
        { url: 'data/waterHoogteScheveningenData.json', key: 'gemeten' }
    ];
    const results = await Promise.all(files.map(f => fetch(f.url).then(r => r.json())));
    const dataMap = {};
    files.forEach((f, i) => {
        const lijst = results[i]?.WaarnemingenLijst?.[0]?.MetingenLijst || [];
        lijst.forEach(m => {
            const waarde = (typeof m.Meetwaarde?.Waarde_Numeriek === 'number') ? m.Meetwaarde.Waarde_Numeriek : null;
            if (waarde === 999999999) return; // skip invalid value
            const tijd = m.Tijdstip;
            if (!dataMap[tijd]) dataMap[tijd] = { tijd };
            dataMap[tijd][f.key] = waarde;
        });
    });
    const rows = Object.values(dataMap).sort((a, b) => new Date(a.tijd) - new Date(b.tijd));
    // Data voor grafiek: x = tijd, y = gemeten of verwacht
    const labels = rows.map(row => {
        const date = new Date(row.tijd);
        // Toon altijd het uur (bv. 00:00, 01:00, ...)
        return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    });
    const data = rows.map(row => (row.gemeten != null) ? row.gemeten : (row.verwacht != null ? row.verwacht : null));
    // Chart.js grafiek
    const ctx = document.getElementById('waterhoogte-graph').getContext('2d');
    // Smooth the data using a moving average (window size 5)
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
    const windowHours = 1;
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
                    //clip: false, // Zorg dat annotaties buiten de chart area zichtbaar zijn
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
                        // Add all high value labels
                        ...Object.fromEntries(highPoints.map((p, idx) => [
                            `highLabel${idx}`,
                            {
                                type: 'line',
                                xMin: p.index,
                                xMax: p.index,
                                yMin: p.value,
                                yMax: p.value,
                                label: {
                                    enabled: true,
                                    content: [formatDateTime(p.tijd).tijd],
                                    backgroundColor: 'rgba(0,0,0,0)', // transparent background
                                    color: '#fff',
                                    font: { size: 14 },
                                    yAdjust: -7
                                }
                            }
                        ])),
                        // Add all low value labels
                        ...Object.fromEntries(lowPoints.map((p, idx) => [
                            `lowLabel${idx}`,
                            {
                                type: 'line',
                                xMin: p.index,
                                xMax: p.index,
                                yMin: p.value,
                                yMax: p.value,
                                label: {
                                    enabled: true,
                                    content: [formatDateTime(p.tijd).tijd],
                                    position: 'bottom',
                                    backgroundColor: 'rgba(0,0,0,0)', // transparent background
                                    color: '#fff',
                                    font: { size: 14 },
                                    yAdjust: 5
                                }
                            }
                        ])),
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });

    // Add a background color to the chart area (darkblue, like high tide cards)
    Chart.register({
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'rgba(173, 216, 230, 1)'; // match the fill color
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    });
}

// Apply a moving average smoothing to the data before plotting
function movingAverage(arr, windowSize) {
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

document.addEventListener("DOMContentLoaded", () => {
    getTideData();
    loadAndDisplayWaterHoogteTable();
    loadAndDisplayWaterHoogteGraph();
});
