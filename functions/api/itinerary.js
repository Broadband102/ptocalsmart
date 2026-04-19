// Cloudflare Pages Function: POST /api/itinerary
// Generates an AI trip itinerary using Google Gemini (free tier).
// The GEMINI_KEY secret must be set in Pages settings -> Environment variables.
//
// Request body (JSON):
//   { dest, region, blurb, startDate, endDate, numDays,
//     budget, group, styles, driveHours, tips, events, origin }
//
// Response (JSON):
//   { itinerary: "..." } on success
//   { error: "..." }    on failure

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

  // Include curated local knowledge to ground the output
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

export async function onRequestPost(context) {
  const { request, env } = context;

  // Require the key to be configured
  if (!env.GEMINI_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_KEY not configured on server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Basic validation
  if (!payload.dest || !payload.startDate || !payload.endDate) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields (dest, startDate, endDate)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const prompt = buildPrompt(payload);

  // Call Gemini 2.0 Flash (free tier)
  const geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    env.GEMINI_KEY;

  try {
    const gResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 900,
          topP: 0.95
        }
      })
    });

    if (!gResp.ok) {
      // Forward rate limit / server errors meaningfully
      if (gResp.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit reached — please try again later' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const errText = await gResp.text();
      return new Response(
        JSON.stringify({ error: 'Gemini API error: ' + gResp.status, detail: errText.slice(0, 300) }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const gData = await gResp.json();
    const text =
      gData &&
      gData.candidates &&
      gData.candidates[0] &&
      gData.candidates[0].content &&
      gData.candidates[0].content.parts &&
      gData.candidates[0].content.parts[0] &&
      gData.candidates[0].content.parts[0].text;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ itinerary: text.trim() }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Network error calling Gemini', detail: String(err).slice(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Block all non-POST methods
export async function onRequest(context) {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', 'Allow': 'POST' } }
  );
}
