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

async function loadAndDisplayWaterHoogteGraph() {
    const rows = await fetchWaterHoogteData();
    renderWaterHoogteGraph(rows);
}

async function loadAndDisplayAstronomyTable() {
    const response = await fetch('data/ipgeolocationAstronomy.json');
    const data = await response.json();
    renderAstronomyTable(data, 'astronomy-table-container');
    renderSunriseSunsetCard(data);
}

document.addEventListener("DOMContentLoaded", () => {
    displayTidesFromApi();
    loadAndDisplayWaterHoogteGraph();
    loadAndDisplayAstronomyTable();
});
