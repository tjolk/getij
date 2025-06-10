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

function appendTideCards(metingen, container, colorMap) {
    metingen.forEach(meting => {
        const card = document.createElement("div");
        card.className = `tide-card ${colorMap[meting.kleur]}`;
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

    if (!data?.WaarnemingenLijst?.length) {
        dayTitle.innerText = "Geen getijdendata beschikbaar";
        tomorrowTitle.innerText = "Geen getijdendata beschikbaar";
        return;
    }

    let metingenVandaag = [];
    let metingenMorgen = [];
    let metingenOvermorgen = [];

    const vandaagDate = new Date();
    const morgenDate = new Date();
    morgenDate.setDate(vandaagDate.getDate() + 1);
    const overmorgenDate = new Date();
    overmorgenDate.setDate(vandaagDate.getDate() + 2);

    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    data.WaarnemingenLijst.forEach(waarneming => {
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

    appendTideCards(metingenVandaag, cardContainer, { darkblue: 'darkblue', lightblue: 'lightblue' });
    appendTideCards(metingenMorgen, tomorrowContainer, { darkblue: 'gray-dark', lightblue: 'gray-light' });
}

document.addEventListener("DOMContentLoaded", getTideData);
