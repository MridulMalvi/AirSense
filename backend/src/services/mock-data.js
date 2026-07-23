const fs = require('fs');
const path = require('path');

const MOCK_DATA_PATHS = [
  path.join(__dirname, '../../../ml-service/data/mock_outputs.json'),
  path.join(__dirname, '../data/demo-snapshot.json'),
];
let cachedMockData = null;

function getMockData() {
  if (cachedMockData) return cachedMockData;

  for (const mockPath of MOCK_DATA_PATHS) {
    try {
      cachedMockData = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
      return cachedMockData;
    } catch {
      // Try the next fallback path.
    }
  }

  console.warn('[MOCK DATA] Could not load any demo snapshot');
  return null;
}

module.exports = {
  MOCK_DATA_PATHS,
  getMockData,
};
