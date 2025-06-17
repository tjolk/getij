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
    const today = new Date().toISOString().slice(0, 10);
    const astro = astronomyData[today]?.astronomy;
    if (!astro) return;
    // Place sun-moon card as sibling to day card inside tides-container
    const tidesContainer = document.querySelector('.tides-container');
    if (!tidesContainer) return;
    // Remove any existing sun-moon card
    let oldCard = tidesContainer.querySelector('.sun-moon-card');
    if (oldCard) oldCard.remove();
    // Create sun-moon card
    const sunMoonCard = document.createElement('div');
    sunMoonCard.className = 'card sun-moon-card';
    sunMoonCard.innerHTML = `
        <div class="sun-moon-grid">
          <div class="sun-moon-grid-item">
            <span class="material-icons" style="color:#ffcc00;vertical-align:middle;">wb_sunny</span>
            <span>Opkomst: <b>${astro.sunrise}</b></span>
          </div>
          <div class="sun-moon-grid-item">
            <span class="material-icons" style="color:#ffcc00;vertical-align:middle;">wb_sunny</span>
            <span>Ondergang: <b>${astro.sunset}</b></span>
          </div>
          <div class="sun-moon-grid-item">
            <span class="material-icons" style="color:#b3b3ff;vertical-align:middle;">dark_mode</span>
            <span>Opkomst: <b>${astro.moonrise}</b></span>
          </div>
          <div class="sun-moon-grid-item">
            <span class="material-icons" style="color:#b3b3ff;vertical-align:middle;">dark_mode</span>
            <span>Ondergang: <b>${astro.moonset}</b></span>
          </div>
        </div>
    `;
    // Insert after the day card if present, else at the top
    const dayCard = tidesContainer.querySelector('#tides-day-card');
    if (dayCard && dayCard.nextSibling) {
        tidesContainer.insertBefore(sunMoonCard, dayCard.nextSibling);
    } else {
        tidesContainer.insertBefore(sunMoonCard, tidesContainer.firstChild);
    }
}
