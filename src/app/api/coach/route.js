import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { buildCoachPrompt, fallbackCoachReply, moderateMessage, validateAnswer } from '@/utils/aiSafety';
import { isCrossOriginRequest, readRequestText } from '@/utils/requestSecurity';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const counters = new Map();
const MINUTE_WINDOW_SECONDS = 60;
const MINUTE_LIMIT = 20;
const DAILY_WINDOW_SECONDS = 86_400;
const DAILY_LIMIT = 10;
const MAX_MEMORY_COUNTERS = 2_000;

function pruneMemoryCounters(now) {
  for (const [storedKey, value] of counters) {
    if (now - value.start > value.windowMs) counters.delete(storedKey);
  }
  while (counters.size >= MAX_MEMORY_COUNTERS) {
    const oldestKey = counters.keys().next().value;
    if (!oldestKey) break;
    counters.delete(oldestKey);
  }
}

function memoryLimited(key, limit, windowSeconds) {
  const now = Date.now();
  if (!counters.has(key) && counters.size >= MAX_MEMORY_COUNTERS) pruneMemoryCounters(now);
  const windowMs = windowSeconds * 1000;
  let entry = counters.get(key) || { count: 0, start: now, windowMs };
  if (now - entry.start > windowMs) {
    counters.delete(key);
    entry = { count: 0, start: now, windowMs };
  }
  entry.windowMs = windowMs;
  entry.count += 1;
  counters.set(key, entry);
  return entry.count > limit;
}

async function consumeQuota(rawKey, limit, windowSeconds) {
  const salt = process.env.AI_RATE_LIMIT_SALT || process.env.APP_URL || 'fitlifehub-local';
  const key = createHash('sha256').update(`${salt}:${rawKey}`).digest('hex');
  return memoryLimited(key, limit, windowSeconds);
}

async function liveCoachLimited(ip) {
  if (await consumeQuota(`minute:${ip}`, MINUTE_LIMIT, MINUTE_WINDOW_SECONDS)) {
    return { limited: true, reason: 'minute', limit: MINUTE_LIMIT };
  }
  const subject = `ip:${ip}`;
  if (await consumeQuota(`daily:${subject}`, DAILY_LIMIT, DAILY_WINDOW_SECONDS)) {
    return { limited: true, reason: 'daily', limit: DAILY_LIMIT };
  }
  return { limited: false, limit: DAILY_LIMIT };
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).flatMap((item) => {
    if (!['user', 'assistant'].includes(item?.role)) return [];
    const content = String(item.content || '').trim().slice(0, 1000);
    return content ? [{ role: item.role, content }] : [];
  });
}

export async function POST(request) {
  try {
    if (isCrossOriginRequest(request)) return NextResponse.json({ error: 'Cross-origin coach requests are not allowed.' }, { status: 403 });

    const contentLength = Number(request.headers.get('content-length')) || 0;
    if (contentLength > 64_000) return NextResponse.json({ error: 'This message is too large.' }, { status: 413 });

    let payload;
    try { payload = JSON.parse(await readRequestText(request, 64_000) || '{}'); } catch (error) {
      return NextResponse.json({ error: error?.code === 'PAYLOAD_TOO_LARGE' ? 'This message is too large.' : 'The request body is invalid.' }, { status: error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400 });
    }
    const message = String(payload?.message || '').trim();
    const context = payload?.context && typeof payload.context === 'object' ? payload.context : {};
    const history = cleanHistory(payload?.history);
    if (!message) return NextResponse.json({ error: 'Enter a message first.' }, { status: 400 });
    if (message.length > 1200) return NextResponse.json({ error: 'Keep messages under 1,200 characters.' }, { status: 400 });

    const moderation = moderateMessage(message);
    if (!moderation.allowed) {
      return NextResponse.json({ reply: 'I can help with safe beginner training, nutrition basics, and gym confidence, but I cannot provide instructions for dangerous drug use, extreme restriction, self-harm, or training through an injury.' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: fallbackCoachReply(context), degraded: true });

    const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim().slice(0, 80);
    const quota = await liveCoachLimited(ip);
    if (quota.limited) {
      const error = quota.reason === 'daily'
        ? `Live-coach limit reached (${quota.limit} per 24-hour window). Try again after the quota window resets.`
        : 'Too many messages at once. Wait a minute and try again.';
      return NextResponse.json({ error, limit: quota.limit }, { status: 429 });
    }

    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-5.6-luna';
    const base = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const prompt = buildCoachPrompt({ message, context, history });
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(22_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-OpenRouter-Title': process.env.APP_TITLE || 'FitLifeHub'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a safe, practical fitness assistant for beginners. Use saved plan context when it helps and respect the conversation history. Respond in plain text without Markdown or formatting symbols.' },
          { role: 'user', content: prompt }
        ],
        ...(model.startsWith('openai/gpt-5.6-')
          ? { reasoning: { effort: 'low', exclude: true } }
          : { temperature: 0.55 }),
        max_tokens: 700
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.choices?.[0]?.message?.content) {
      return NextResponse.json({ reply: fallbackCoachReply(context), degraded: true });
    }

    return NextResponse.json({
      reply: validateAnswer(data.choices[0].message.content),
      model: data.model || model,
      dailyLimit: quota.limit,
      degraded: false
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return NextResponse.json({ error: timedOut ? 'The coach took too long to answer. Try again.' : 'The coach is temporarily unavailable.' }, { status: timedOut ? 504 : 500 });
  }
}
