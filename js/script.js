async function getTideData() {
    const jsonUrl = "/data/tideData.json"; // Verwijzing naar lokaal JSON-bestand

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

document.addEventListener("DOMContentLoaded", getTideData);
