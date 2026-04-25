import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// --- Helper: Trim transcript if too long (Groq free tier limits) ---
function trimTranscript(transcript, maxChars = 15000) {
  if (transcript.length <= maxChars) return transcript;
  const keep = Math.floor(maxChars / 2);
  return transcript.slice(0, keep) + "\n\n... [TRIMMED FOR LENGTH] ...\n\n" + transcript.slice(-keep);
}

const PROMPT = (transcript) => `You are an expert YouTube video summarizer. Analyze the transcript below and return a clean, well-structured summary with:

📌 **Overview** — A concise 2-3 sentence description of the video.
🔑 **Key Points** — A bulleted list of the most important concepts.
💡 **Main Takeaways** — The most important lessons or conclusions the viewer should remember.

Keep it concise, accurate, and easy to read.

Transcript:
${transcript}`;

// --- Try Groq first (free, no credit card needed) ---
async function summarizeWithGroq(transcript, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: PROMPT(trimTranscript(transcript)) }],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error?.message || `Groq error ${res.status}`;
    // Pass along the status so frontend knows if it's a rate limit (429)
    throw { message, status: res.status };
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'No summary generated.';
}

// --- Fallback: Gemini (free via Google AI Studio) ---
async function summarizeWithGemini(transcript, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT(trimTranscript(transcript)) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req) {
  try {
    const { transcript, videoId } = await req.json();

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400, headers: corsHeaders });
    }

    // 1. Simple Rate Limiting (Simulated or via Vercel KV)
    if (process.env.KV_REST_API_URL) {
      const ip = req.headers.get('x-forwarded-for') || 'anonymous';
      const rateKey = `rate_limit:${ip}`;
      const requests = await kv.incr(rateKey);
      if (requests === 1) await kv.expire(rateKey, 60); // 1 minute window
      if (requests > 10) {
        return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429, headers: corsHeaders });
      }
    }

    // 2. Summary Caching (Saves API costs & improves speed)
    const cacheKey = videoId ? `summary:${videoId}` : null;
    if (cacheKey && process.env.KV_REST_API_URL) {
      const cached = await kv.get(cacheKey);
      if (cached) {
        console.log('Serving summary from cache for:', videoId);
        return NextResponse.json({ summary: cached, cached: true }, { headers: corsHeaders });
      }
    }

    // Point back to environment variables for security (Launch Ready)
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!groqKey && (!geminiKey || geminiKey === 'PASTE_YOUR_GEMINI_KEY_HERE')) {
      return NextResponse.json(
        {
          error:
            'No AI API key configured. Add GROQ_API_KEY (free at console.groq.com) ' +
            'or GEMINI_API_KEY (free at aistudio.google.com/apikey) to your .env.local file.',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    let summary;
    if (groqKey) {
      summary = await summarizeWithGroq(transcript, groqKey);
    } else {
      summary = await summarizeWithGemini(transcript, geminiKey);
    }

    // Save to cache after successful generation
    if (cacheKey && process.env.KV_REST_API_URL) {
      await kv.set(cacheKey, summary, { ex: 604800 }); // Cache for 7 days
      await kv.incr('total_summaries_generated'); // Global stat
    }

    return NextResponse.json({ summary, cached: false }, { headers: corsHeaders });
  } catch (error) {
    console.error('Summarize error:', error);

    // If Groq fails, try Gemini as fallback
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'PASTE_YOUR_GEMINI_KEY_HERE') {
      try {
        const { transcript: t } = await req.json().catch(() => ({})); 
        const summary = await summarizeWithGemini(t || transcript, geminiKey);
        return NextResponse.json({ summary, fallback: true });
      } catch (fallbackErr) {
        console.error('Gemini fallback error:', fallbackErr);
      }
    }

    return NextResponse.json(
      { 
        error: error.message || `AI summarization failed`,
        status: error.status || 500
      },
      { status: error.status || 500 }
    );
  }
}

