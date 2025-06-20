// Chart.js custom plugins for sun/moon icons, current time shadow, and night overlay

export const chartPlugins = [
  {
    id: 'nightOverlayBox',
    beforeDatasetsDraw: function(chart) {
      const chartArea = chart.chartArea;
      const ctx = chart.ctx;
      if (!chartArea || !chart.scales.x) return;
      const overlays = chart.config.options.plugins._overlays || [];
      overlays.forEach(o => {
        const xScale = chart.scales.x;
        const xMinPx = xScale.getPixelForValue(o.xMin);
        const xMaxPx = xScale.getPixelForValue(o.xMax);
        const yTop = chartArea.top;
        const yBottom = chartArea.bottom;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(128,128,128,0.25)';
        ctx.fillRect(xMinPx, yTop, xMaxPx - xMinPx, yBottom - yTop);
        ctx.restore();
      });
    }
  },
  {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = 'rgba(173, 216, 230, 1)'; // match the fill color
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  },
  {
    id: 'sunMoonIcons',
    afterDatasetsDraw: function(chart) {
      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const sunIconPositions = chart.config.options.plugins._sunIconPositions || [];
      const moonIconPositions = chart.config.options.plugins._moonIconPositions || [];
      // Draw sun icons
      sunIconPositions.forEach(pos => {
        const x = xScale.getPixelForValue(pos.x);
        const y = yScale.getPixelForValue(pos.y) + 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.2, 1.2);
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 2;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 4);
          ctx.beginPath();
          ctx.moveTo(0, -5);
          ctx.lineTo(0, -10);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      });
      // Draw moon icons
      moonIconPositions.forEach(pos => {
        const x = xScale.getPixelForValue(pos.x);
        const y = yScale.getPixelForValue(pos.y) + 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.1, 1.1);
        ctx.beginPath();
        ctx.arc(0, 0, 7, Math.PI * 0.45, Math.PI * 1.55, false);
        ctx.arc(5, 0, 8, Math.PI * 1.3, Math.PI * 0.7, true);
        ctx.closePath();
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 2;
        ctx.fill();
        ctx.restore();
      });
    }
  },
  {
    id: 'currentTimeBoxShadow',
    afterDatasetsDraw: function(chart) {
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const closestIdx = chart.config.options.plugins._closestIdx;
      const labels = chart.config.options.plugins._labels;
      if (closestIdx === undefined || !labels) return;
      const xMin = xScale.getPixelForValue(Math.max(closestIdx - 0.5, 0));
      const xMax = xScale.getPixelForValue(Math.min(closestIdx + 0.5, labels.length - 1));
      const yTop = yScale.top ?? chart.chartArea.top;
      const yBottom = yScale.bottom ?? chart.chartArea.bottom;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo((xMin + xMax) / 2, yTop);
      ctx.lineTo((xMin + xMax) / 2, yBottom);
      ctx.stroke();
      ctx.restore();
    }
  }
];
