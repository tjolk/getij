// Chart-specific helper functions (index finding, y-range calculation, etc.)

export function findClosestIndex(rows, targetDateTime) {
  let minDiff = Infinity;
  let idx = -1;
  for (let i = 0; i < rows.length; i++) {
    const diff = Math.abs(new Date(rows[i].tijd) - new Date(targetDateTime));
    if (diff < minDiff) {
      minDiff = diff;
      idx = i;
    }
  }
  return idx;
}

export function getYRangePadding(minValue, maxValue) {
  const yRange = maxValue - minValue;
  return {
    yPaddingBelow: yRange / 4,
    yPaddingAbove: yRange / 3
  };
}
