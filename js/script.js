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

    const vandaagDate = new Date();
    const morgenDate = new Date();
    morgenDate.setDate(vandaagDate.getDate() + 1);

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
                    metingenVandaag.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue" });
                } else if (isSameDay(metingDate, morgenDate)) {
                    metingenMorgen.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue" });
                }
            }
        });
    });

    metingenVandaag.sort((a, b) => new Date(`1970-01-01 ${a.tijd}`) - new Date(`1970-01-01 ${b.tijd}`));
    metingenMorgen.sort((a, b) => new Date(`1970-01-01 ${a.tijd}`) - new Date(`1970-01-01 ${b.tijd}`));

    appendTideCards(metingenVandaag, cardContainer, { darkblue: 'darkblue', lightblue: 'lightblue' });
    appendTideCards(metingenMorgen, tomorrowContainer, { darkblue: 'gray-dark', lightblue: 'gray-light' });
}

document.addEventListener("DOMContentLoaded", getTideData);
