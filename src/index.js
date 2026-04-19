// Cloudflare Worker entry point for ptocalsmart.com
//
// Behavior:
//   - POST /api/itinerary   -> calls Google Gemini API, returns trip itinerary
//   - Everything else       -> served from static assets in /public (index.html, etc.)
//
// The GEMINI_KEY secret must be set in the Worker's Settings -> Variables and Secrets.

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return MONTH_NAMES[parseInt(m, 10) - 1] + ' ' + parseInt(d, 10) + ', ' + y;
}

function groupLabel(g) {
  return ({
    solo: 'a solo traveler',
    couple: 'a couple',
    kids: 'a family with young kids',
    teens: 'a family with teens',
    group: 'a group of friends'
  })[g] || 'travelers';
}

function budgetLabel(b) {
  return ({
    low: 'budget-conscious (under $500 total)',
    mid: 'mid-range ($500-1500 total)',
    high: 'higher-end ($1500+ total)'
  })[b] || 'mid-range';
}

function buildPrompt(p) {
  const start = formatDate(p.startDate);
  const end = formatDate(p.endDate);
  const month = MONTH_NAMES[parseInt(p.startDate.split('-')[1], 10) - 1];
  const group = groupLabel(p.group);
  const budget = budgetLabel(p.budget);
  const styles = (p.styles || []).join(', ') || 'general leisure';
  const travel = p.driveHours
    ? `driving ~${p.driveHours} hours from ${p.origin}`
    : `flying from ${p.origin}`;

  const tipsText = Object.keys(p.tips || {})
    .map(k => `  - Month ${k}: ${p.tips[k]}`)
    .join('\n');

  const eventsText = (p.events || [])
    .filter(e => e.month === parseInt(p.startDate.split('-')[1], 10))
    .map(e => `  - ${e.name}: ${e.note}`)
    .join('\n');

  return `You are a practical travel planner for a hospital worker from Tulsa, Oklahoma who has a limited PTO window. Write a concise, day-by-day itinerary for this trip.

DESTINATION: ${p.dest} (${p.region})
DATES: ${start} through ${end} (${p.numDays} days)
TRAVELERS: ${group}
BUDGET: ${budget}
TRAVEL STYLE: ${styles}
TRANSPORTATION: ${travel}

CONTEXT ABOUT THE DESTINATION:
${p.blurb}

LOCAL SEASONAL NOTES:
${tipsText || '  (none)'}

EVENTS HAPPENING DURING THESE DATES (${month}):
${eventsText || '  (none specifically noted)'}

INSTRUCTIONS:
- Write a day-by-day plan. Label each day (Day 1, Day 2, etc.) with the actual date.
- For each day: morning, afternoon, evening suggestions with specific places, restaurants, and activities.
- Weave in any events listed above naturally if they fit.
- Include a couple of honest practical tips (traffic, booking, weather, what to pack).
- Keep total length around 300-450 words. Practical over poetic.
- No disclaimers about prices changing. No "as an AI" language.
- Do not use markdown headers (# or ##). Use plain text with day labels and line breaks.
- Start directly with "Day 1" — no preamble.`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

async function handleItinerary(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  if (!env.GEMINI_KEY) {
    return json({ error: 'GEMINI_KEY not configured on server' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!payload.dest || !payload.startDate || !payload.endDate) {
    return json({ error: 'Missing required fields (dest, startDate, endDate)' }, 400);
  }

  const prompt = buildPrompt(payload);

  const geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
    env.GEMINI_KEY;

  try {
    const gResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          topP: 0.95,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    if (!gResp.ok) {
      if (gResp.status === 429) {
        return json({ error: 'Rate limit reached — please try again later' }, 429);
      }
      const errText = await gResp.text();
      return json({
        error: 'Gemini API error: ' + gResp.status,
        detail: errText.slice(0, 300)
      }, 502);
    }

    const gData = await gResp.json();

    // Log metadata about the response for debugging truncation issues
    const finishReason = gData?.candidates?.[0]?.finishReason;
    const usage = gData?.usageMetadata;
    console.log('Gemini response:', JSON.stringify({ finishReason, usage }));

    const text =
      gData &&
      gData.candidates &&
      gData.candidates[0] &&
      gData.candidates[0].content &&
      gData.candidates[0].content.parts &&
      gData.candidates[0].content.parts[0] &&
      gData.candidates[0].content.parts[0].text;

    if (!text) {
      return json({ error: 'Empty response from Gemini' }, 502);
    }

    return json({ itinerary: text.trim() });
  } catch (err) {
    return json({
      error: 'Network error calling Gemini',
      detail: String(err).slice(0, 200)
    }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route API calls to the function
    if (url.pathname === '/api/itinerary') {
      return handleItinerary(request, env);
    }

    // Everything else: fall through to static assets
    return env.ASSETS.fetch(request);
  }
};
