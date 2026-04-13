export const prerender = false;

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load source pack at startup
let sourcePack = '';
try {
  sourcePack = readFileSync(
    join(process.cwd(), 'src', 'data', 'source-pack.md'),
    'utf-8'
  );
} catch {
  console.warn('Source pack not found, copilot will have limited context');
}

const SYSTEM_PROMPT = `You are Pradeep AI, a professional copilot that helps recruiters and hiring managers understand Pradeep's background, projects, and perspective.

RULES:
- Only answer based on the provided context below.
- If something is not in the context, say "That's not in my current context, but you can ask Pradeep directly at pradeep@realgradientdescent.tech"
- Be sharp, warm, clear, and grounded.
- Never invent facts, dates, titles, or claims.
- Keep answers concise — 2-4 short paragraphs max unless asked for more detail.
- When referencing projects, mention they can be found on the website.
- Do not be salesy or use superlatives — let the work speak.
- Do not discuss salary, personal life, or make comparisons to other candidates.
- Use plain language. No corporate jargon or buzzwords.

PROFESSIONAL CONTEXT:
${sourcePack}`;

// Rate limiting (simple in-memory, per IP)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // messages per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// DeepSeek API (OpenAI-compatible)
async function callDeepSeek(
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream> {
  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'; // DeepSeek V3

  if (!apiKey) {
    return errorStream(
      "The copilot is being set up. Please reach out to Pradeep directly at pradeep@realgradientdescent.tech"
    );
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      console.error(`DeepSeek API error ${response.status}:`, errText);

      // If rate limited, try Groq fallback
      if (response.status === 429 && process.env.GROQ_API_KEY) {
        console.log('DeepSeek rate limited, trying Groq fallback');
        return callGroqFallback(messages);
      }

      return errorStream(
        "I'm having a brief connection issue. Please try again in a moment."
      );
    }

    if (!response.body) {
      return errorStream("No response received. Please try again.");
    }

    return transformSSEStream(response.body);
  } catch (err) {
    console.error('DeepSeek request failed:', (err as Error).message);

    // Try Groq fallback on network errors
    if (process.env.GROQ_API_KEY) {
      console.log('DeepSeek failed, trying Groq fallback');
      return callGroqFallback(messages);
    }

    return errorStream(
      "I'm having trouble connecting right now. Please try again shortly, or reach out to Pradeep directly."
    );
  }
}

// Groq fallback (optional, free tier)
async function callGroqFallback(
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream> {
  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          stream: true,
          temperature: 0.4,
          max_tokens: 512,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.ok && response.body) {
      return transformSSEStream(response.body);
    }
  } catch (err) {
    console.error('Groq fallback also failed:', (err as Error).message);
  }

  return errorStream(
    "I'm temporarily unavailable. Please reach out to Pradeep directly at pradeep@realgradientdescent.tech"
  );
}

// Transform OpenAI-compatible SSE stream to plain text
function transformSSEStream(body: ReadableStream): ReadableStream {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    },
  });
}

// Helper: create an error message stream
function errorStream(message: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(message));
      controller.close();
    },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // CORS headers for the chat widget
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  };

  // Rate limit
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse body
  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const messages = body.messages || [];

  // Keep only last 6 messages for context window
  const trimmedMessages = messages.slice(-6);

  // Validate message lengths
  for (const msg of trimmedMessages) {
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 2000 chars)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const stream = await callDeepSeek(trimmedMessages);
  return new Response(stream, { headers });
};
