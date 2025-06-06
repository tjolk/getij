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
    const icoon = (uur >= 6 && uur < 18) ? "☀️" : "🌙";

    return {
        datum: date.toLocaleDateString('nl-NL', datumOpties).replace(",", " -"),
        tijd: `${tijd}`
    };
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

    const vandaag = new Date().toISOString().split("T")[0]; // YYYY-MM-DD formaat
    const morgen = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split("T")[0]; // Morgen

    data.WaarnemingenLijst.forEach(waarneming => {
        waarneming.MetingenLijst.forEach(meting => {
            if (typeof meting.Meetwaarde.Waarde_Numeriek === "number") {
                const waardeNum = meting.Meetwaarde.Waarde_Numeriek;
                const pijlHTML = waardeNum >= 0 ? "▲" : "▼";
                const tijdInfo = formatDateTime(meting.Tijdstip);

                if (new Date(meting.Tijdstip).toISOString().split("T")[0] === vandaag) {
                    metingenVandaag.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue" });
                } else if (new Date(meting.Tijdstip).toISOString().split("T")[0] === morgen) {
                    metingenMorgen.push({ tijd: tijdInfo.tijd, hoogte: `${pijlHTML} ${waardeNum} cm`, kleur: waardeNum >= 0 ? "darkblue" : "lightblue" });
                }
            }
        });
    });

    metingenVandaag.sort((a, b) => new Date(`1970-01-01 ${a.tijd}`) - new Date(`1970-01-01 ${b.tijd}`));
    metingenMorgen.sort((a, b) => new Date(`1970-01-01 ${a.tijd}`) - new Date(`1970-01-01 ${b.tijd}`));

    metingenVandaag.forEach(meting => {
        const card = document.createElement("div");
        card.className = `tide-card ${meting.kleur === 'darkblue' ? 'darkblue' : 'lightblue'}`;
        card.innerHTML = `<p class="tijd">${meting.tijd}</p> <p>${meting.hoogte}</p>`;
        cardContainer.appendChild(card);
    });

	metingenMorgen.forEach(meting => {
		const card = document.createElement("div");
		card.className = `tide-card ${meting.kleur === 'darkblue' ? 'gray-dark' : 'gray-light'}`;
		card.innerHTML = `<p class="tijd">${meting.tijd}</p> <p>${meting.hoogte}</p>`;
		tomorrowContainer.appendChild(card);
	});
}

document.addEventListener("DOMContentLoaded", getTideData);
