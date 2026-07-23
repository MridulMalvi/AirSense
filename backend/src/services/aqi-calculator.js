function pm25ToAQI(pm25) {
  const value = Math.max(0, Number(pm25) || 0);
  const breakpoints = [
    [0, 12, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];

  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (value >= cLow && value <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (value - cLow) + iLow);
    }
  }

  return value > 500.4 ? 500 : 0;
}

function getAQICategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

module.exports = { pm25ToAQI, getAQICategory };
