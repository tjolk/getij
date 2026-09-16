// Register annotation plugin for Chart.js v3
import { fetchTideData, fetchWaterHoogteData } from './data.js';
import { appendTideCards, displayTides, renderAstronomyTable, renderSunriseSunsetCard } from './ui.js';
import { renderWaterHoogteGraph } from './chart.js';
import { formatDateTime, isSameDay } from './utils.js';

if (window.ChartAnnotation) {
  Chart.register(window.ChartAnnotation);
}

async function displayTidesFromApi() {
    try {
        const data = await fetchTideData();
        displayTides(data);
    } catch (error) {
        console.error("❌ Fout bij het ophalen van JSON-data:", error);
        document.getElementById("output").innerHTML = `<p>Er is een fout opgetreden bij het laden van gegevens.</p>`;
    }
}

async function fetchAstronomyData() {
    try {
        const response = await fetch('data/ipgeolocationAstronomy.json');
        return await response.json();
    } catch (e) {
        return {};
    }
}

async function loadAndDisplayWaterHoogteGraph(astronomyData) {
    const rows = await fetchWaterHoogteData();
    renderWaterHoogteGraph(rows, astronomyData);
}

function displayAstronomyTable(astronomyData) {
    renderAstronomyTable(astronomyData, 'astronomy-table-container');
    renderSunriseSunsetCard(astronomyData);
}

document.addEventListener("DOMContentLoaded", async () => {
    displayTidesFromApi();
    const astronomyData = await fetchAstronomyData();
    loadAndDisplayWaterHoogteGraph(astronomyData);
    displayAstronomyTable(astronomyData);
});
