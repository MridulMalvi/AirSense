const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY || (process.env.LLM_PROVIDER === 'groq' ? process.env.LLM_API_KEY : '');
const VISION_MODEL = process.env.VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Vision response did not contain JSON');
    return JSON.parse(match[0]);
  }
}

function normalizeClassification(parsed, rawResponse) {
  const allowed = new Set(['garbage_burning', 'construction_dust', 'vehicle_smoke', 'industrial_emission', 'unknown']);
  const severities = new Set(['low', 'medium', 'high']);
  const category = allowed.has(parsed.category) ? parsed.category : 'unknown';
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const severity = severities.has(parsed.severity) ? parsed.severity : 'low';

  return {
    category,
    confidence,
    severity,
    description: String(parsed.description || '').slice(0, 500),
    rawResponse,
  };
}

async function classifyPollutionImage(imageUrl) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const prompt = `Analyze this image for visible urban air pollution sources. Return only JSON with:
{
  "category": "garbage_burning" | "construction_dust" | "vehicle_smoke" | "industrial_emission" | "unknown",
  "confidence": 0.0,
  "severity": "low" | "medium" | "high",
  "description": "one concise sentence"
}
Be conservative. If the image is unclear or no pollution source is visible, use "unknown" with confidence below 0.4.`;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        authorization: `Bearer ${GROQ_API_KEY}`,
        'content-type': 'application/json',
      },
      timeout: 20000,
      proxy: false,
    }
  );

  const rawResponse = response.data?.choices?.[0]?.message?.content || '{}';
  return normalizeClassification(safeJsonParse(rawResponse), rawResponse);
}

module.exports = {
  classifyPollutionImage,
};
