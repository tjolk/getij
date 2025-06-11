async function getTideData() {
    const jsonUrl = "/data/getijExtremenScheveningenData.json"; // Verwijzing naar lokaal JSON-bestand

    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`Fout: ${response.status} ${response.statusText}`);

        const data = await response.json();
        console.log("🌊 Gecachte getijdendata geladen:", data);
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

function appendTideCards(metingen, container, colorMap, highlightNextTide = false) {
    // Find the next tide (first one in the future)
    let nextTideIndex = -1;
    if (highlightNextTide) {
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

    appendTideCards(metingenVandaag, cardContainer, { darkblue: 'darkblue', lightblue: 'lightblue' }, true);
    appendTideCards(metingenMorgen, tomorrowContainer, { darkblue: 'gray-dark', lightblue: 'gray-light' }, false);
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
    document.getElementById('waterhoogte-table').innerHTML = html;
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
        const hour = date.getHours();
        // Toon alleen als het uur deelbaar is door 12 (bijv. 0, 12)
        if (hour % 12 === 0) {
            // Toon alleen het uur (bv. 00:00 of 12:00)
            return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } else {
            return '';
        }
    });
    const data = rows.map(row => (row.gemeten != null) ? row.gemeten : (row.verwacht != null ? row.verwacht : null));
    // Chart.js grafiek
    const ctx = document.getElementById('waterhoogte-graph').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waterhoogte (cm)',
                data: data,
                borderColor: '#005f9e',
                backgroundColor: 'rgba(0,95,158,0.08)',
                pointRadius: 0, // geen punten
                fill: true,
                tension: 1 // vloeiender lijn
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tijd (elke 3 uur)' },
                    grid: { display: false },
                    ticks: {
                        color: '#888',
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: false,
                        font: { size: 14 }
                    }
                },
                y: {
                    title: { display: true, text: 'Waterhoogte (cm)' },
                    grid: { color: 'rgba(0,0,0,0.06)' }
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    getTideData();
    loadAndDisplayWaterHoogteTable();
    loadAndDisplayWaterHoogteGraph();
});
