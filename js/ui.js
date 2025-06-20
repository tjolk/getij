// UI rendering logic for tide cards
import { formatDateTime, isSameDay } from './utils.js';

export function appendTideCards(metingen, container, colorMap, highlightNextTide = false, nextTideIndex = -1) {
    metingen.forEach((meting, idx) => {
        const card = document.createElement("div");
        let highlightClass = (highlightNextTide && idx === nextTideIndex) ? "next-tide" : "";
        card.className = `card tide-card ${colorMap[meting.kleur]} ${highlightClass}`;
        card.innerHTML = `<p class="tijd">${meting.tijd}</p> <p>${meting.hoogte}</p>`;
        container.appendChild(card);
    });
}

export function displayTides(data) {
    const dayCard = document.getElementById("day-card");
    const dayTitle = document.getElementById("day-title");
    const cardContainer = document.getElementById("tides-container");

    const tomorrowCard = document.getElementById("tomorrow-card");
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

    // --- NEW LOGIC: Find the single next tide across both today and tomorrow ---
    const now = new Date();
    // Build a flat list with card info
    const allTides = [];
    metingenVandaag.forEach((t, idx) => allTides.push({ ...t, card: 'vandaag', idx }));
    metingenMorgen.forEach((t, idx) => allTides.push({ ...t, card: 'morgen', idx }));
    // Find the first tide in the future
    let nextTide = allTides.find(t => new Date(t.tijdstip) > now);
    let nextTideIndexVandaag = -1;
    let nextTideIndexMorgen = -1;
    if (nextTide) {
        if (nextTide.card === 'vandaag') {
            nextTideIndexVandaag = nextTide.idx;
        } else if (nextTide.card === 'morgen') {
            nextTideIndexMorgen = nextTide.idx;
        }
    }
    // --- END NEW LOGIC ---

    appendTideCards(metingenVandaag, cardContainer, { darkblue: 'darkblue', lightblue: 'lightblue' }, true, nextTideIndexVandaag);
    appendTideCards(metingenMorgen, tomorrowContainer, { darkblue: 'gray-dark', lightblue: 'gray-light' }, true, nextTideIndexMorgen);
}

export function renderAstronomyTable(astronomyData, containerId) {
    // Flatten all events with their datetime
    let events = [];
    for (const date in astronomyData) {
        const astro = astronomyData[date].astronomy;
        if (astro.sunrise && astro.sunrise !== "-:-") {
            events.push({ type: "Zonsopkomst", datetime: `${date}T${astro.sunrise}` });
        }
        if (astro.sunset && astro.sunset !== "-:-") {
            events.push({ type: "Zonsondergang", datetime: `${date}T${astro.sunset}` });
        }
        if (astro.moonrise && astro.moonrise !== "-:-") {
            events.push({ type: "Maanopkomst", datetime: `${date}T${astro.moonrise}` });
        }
        if (astro.moonset && astro.moonset !== "-:-") {
            events.push({ type: "Maanondergang", datetime: `${date}T${astro.moonset}` });
        }
    }
    // Sort by datetime
    events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    // Build table
    let html = '<table><thead><tr><th>Type</th><th>Datum/tijd</th></tr></thead><tbody>';
    events.forEach(ev => {
        const d = new Date(ev.datetime);
        html += `<tr><td>${ev.type}</td><td>${d.toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}</td></tr>`;
    });
    html += '</tbody></table>';
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
}

export function renderSunriseSunsetCard(astronomyData) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const astroToday = astronomyData[todayStr]?.astronomy;
    const astroTomorrow = astronomyData[tomorrowStr]?.astronomy;
    const dayContainer = document.querySelector('.day-container');
    if (!dayContainer) return;
    let oldCard = dayContainer.querySelector('.sun-moon-card');
    if (oldCard) oldCard.remove();

    // Helper to build sun-moon grid HTML for a given astro object
    function buildSunMoonGrid(astro) {
        if (!astro) return '';
        let events = [];
        if (astro.sunrise && astro.sunrise !== "-:-") {
            events.push({
                type: 'sun',
                label: `<b>${astro.sunrise}</b>`,
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffcc00"><circle cx="12" cy="12" r="5" /><g stroke-width="2" stroke-linecap="round" stroke="#ffcc00"><line x1="12" y1="5" x2="12" y2="3" /><line x1="17" y1="7" x2="18.4" y2="5.6"  stroke="none"/><line x1="19" y1="12" x2="21" y2="12" /><line x1="17" y1="17" x2="18.4" y2="18.4" /><line x1="12" y1="19" x2="12" y2="21" /><line x1="7" y1="17" x2="5.6" y2="18.4" /><line x1="5" y1="12" x2="3" y2="12" /><line x1="7" y1="7" x2="5.6" y2="5.6" /></g><polygon points="19,2 22,6 20,6 20,10 18,10 18,6 16,6" stroke="none"/></svg>`,
                time: astro.sunrise
            });
        }
        if (astro.sunset && astro.sunset !== "-:-") {
            events.push({
                type: 'sun',
                label: `<b>${astro.sunset}</b>`,
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffcc00"><circle cx="12" cy="12" r="5" /><g stroke-width="2" stroke-linecap="round" stroke="#ffcc00"><line x1="12" y1="5" x2="12" y2="3" /><line x1="17" y1="7" x2="18.4" y2="5.6"  stroke="none"/><line x1="19" y1="12" x2="21" y2="12" /><line x1="17" y1="17" x2="18.4" y2="18.4" /><line x1="12" y1="19" x2="12" y2="21" /><line x1="7" y1="17" x2="5.6" y2="18.4" /><line x1="5" y1="12" x2="3" y2="12" /><line x1="7" y1="7" x2="5.6" y2="5.6" /></g><polygon points="19,10 22,6 20,6 20,2 18,2 18,6 16,6" stroke="none"/></svg>`,
                time: astro.sunset
            });
        }
        if (astro.moonrise && astro.moonrise !== "-:-") {
            events.push({
                type: 'moon',
                label: `<b>${astro.moonrise}</b>`,
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#b3b3ff" style="vertical-align:middle;"><path d='M19 15A7 7 0 0 1 10 6 7 7 0 1 0 19 15Z'/><polygon points="15,4 18,8 16,8 16,12 14,12 14,8 12,8"/></svg>`,
                time: astro.moonrise
            });
        }
        if (astro.moonset && astro.moonset !== "-:-") {
            events.push({
                type: 'moon',
                label: `<b>${astro.moonset}</b>`,
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#b3b3ff" style="vertical-align:middle;"><path d='M19 15A7 7 0 0 1 10 6 7 7 0 1 0 19 15Z'/><polygon points="15,12 18,8 16,8 16,4 14,4 14,8 12,8"/></svg>`,
                time: astro.moonset
            });
        }
        // Sort by time (HH:MM)
        events.sort((a, b) => {
            const d1 = new Date(`2000-01-01T${a.time}`);
            const d2 = new Date(`2000-01-01T${b.time}`);
            return d1 - d2;
        });
        return `<div class="sun-moon-container">${events.map(ev => `<div class="sun-moon-item">${ev.icon}<span>${ev.label}</span></div>`).join('')}</div>`;
    }

    // Today
    const dayCard = dayContainer.querySelector('#day-card');
    if (dayCard) {
        const oldGrid = dayCard.querySelector('.sun-moon-container');
        if (oldGrid) oldGrid.remove();
        dayCard.insertAdjacentHTML('beforeend', buildSunMoonGrid(astroToday));
    }
    // Tomorrow
    const tomorrowCard = dayContainer.querySelector('#tomorrow-card');
    if (tomorrowCard) {
        const oldGrid = tomorrowCard.querySelector('.sun-moon-container');
        if (oldGrid) oldGrid.remove();
        tomorrowCard.insertAdjacentHTML('beforeend', buildSunMoonGrid(astroTomorrow));
    }
}



