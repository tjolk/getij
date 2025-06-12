// Data fetching and merging logic for tide and water height
import { formatDateTime, isSameDay } from './utils.js';

export async function fetchTideData() {
    const jsonUrl = "/data/getijExtremenScheveningenData.json";
    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error(`Fout: ${response.status} ${response.statusText}`);
    return await response.json();
}

export async function fetchWaterHoogteData() {
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
    return Object.values(dataMap).sort((a, b) => new Date(a.tijd) - new Date(b.tijd));
}
