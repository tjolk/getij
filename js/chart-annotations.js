// Functions to generate Chart.js annotation objects for high/low points, sun/moon events

export function getHighLowAnnotations(highPoints, lowPoints, formatDateTime, maxValue, minValue) {
  const high = Object.fromEntries(highPoints.map((p, idx) => [
    `highLabel${idx}`,
    {
      type: 'line',
      xMin: p.index,
      xMax: p.index,
      yMin: maxValue,
      yMax: maxValue,
      label: {
        enabled: true,
        content: [formatDateTime(p.tijd).tijd],
        backgroundColor: 'rgba(0,0,0,0)',
        color: '#fff',
        font: { size: 12 },
        yAdjust: -7
      }
    }
  ]));
  const low = Object.fromEntries(lowPoints.map((p, idx) => [
    `lowLabel${idx}`,
    {
      type: 'line',
      xMin: p.index,
      xMax: p.index,
      yMin: minValue,
      yMax: minValue,
      label: {
        enabled: true,
        content: [formatDateTime(p.tijd).tijd],
        position: 'bottom',
        backgroundColor: 'rgba(0,0,0,0)',
        color: '#fff',
        font: { size: 12 },
        yAdjust: 10
      }
    }
  ]));
  return { ...high, ...low };
}

export function getSunMoonIconPositions(dates, astronomyData, findClosestIndex, suggestedMax, rows) {
  let sunIconPositions = [];
  let moonIconPositions = [];
  for (let i = 0; i < dates.length; i++) {
    const astro = astronomyData[dates[i]].astronomy;
    // Sun
    const sunrise = astro.sunrise;
    const sunset = astro.sunset;
    if (sunrise && sunset) {
      const sunriseDateTime = dates[i] + 'T' + sunrise;
      const sunsetDateTime = dates[i] + 'T' + sunset;
      const sunriseIdx = findClosestIndex(rows, sunriseDateTime);
      const sunsetIdx = findClosestIndex(rows, sunsetDateTime);
      if (sunriseIdx !== -1 && sunsetIdx !== -1 && sunsetIdx > sunriseIdx) {
        const sunIdx = Math.round((sunriseIdx + sunsetIdx) / 2);
        sunIconPositions.push({ x: sunIdx, y: suggestedMax });
      }
    }
    // Moon
    const moonrise = astro.moonrise;
    const moonset = astro.moonset;
    if (moonrise && moonset && moonrise !== "-:-" && moonset !== "-:-") {
      const moonriseDateTime = dates[i] + 'T' + moonrise;
      const moonsetDateTime = dates[i] + 'T' + moonset;
      const moonriseIdx = findClosestIndex(rows, moonriseDateTime);
      const moonsetIdx = findClosestIndex(rows, moonsetDateTime);
      if (moonriseIdx !== -1 && moonsetIdx !== -1 && moonsetIdx > moonriseIdx) {
        const moonIdx = Math.round((moonriseIdx + moonsetIdx) / 2);
        moonIconPositions.push({ x: moonIdx, y: suggestedMax });
      }
    }
  }
  return { sunIconPositions, moonIconPositions };
}
