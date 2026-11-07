import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const load = (source) => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const security = await load(read('src/utils/requestSecurity.js'));
const safety = await load(read('src/utils/aiSafety.js'));
globalThis.__coachHarness = { ...security, ...safety, NextResponse: { json: (body, options) => Response.json(body, options) } };
const source = `const { NextResponse, isCrossOriginRequest, readRequestText, buildCoachPrompt, fallbackCoachReply, moderateMessage, validateAnswer } = globalThis.__coachHarness;\n`
  + read('src/app/api/coach/route.js').replace(/^import .*? from ['"](?:next\/server|@\/[^'"]+)['"];\n/gm, '');
const coach = await load(source);
const request = (body, headers = {}) => new Request('https://fitlifehub.test/api/coach', { method: 'POST', headers: { host: 'fitlifehub.test', origin: 'https://fitlifehub.test', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const originalKey = process.env.OPENROUTER_API_KEY;
const originalFetch = globalThis.fetch;
try {
  delete process.env.OPENROUTER_API_KEY;
  const fallback = await coach.POST(request({ message: 'Help me get started' }));
  assert.equal(fallback.status, 200);assert.equal((await fallback.json()).degraded, true);
  assert.equal((await coach.POST(request('{'))).status, 400);
  assert.equal((await coach.POST(request({ message: '' }))).status, 400);
  assert.equal((await coach.POST(request({ message: 'x'.repeat(1201) }))).status, 400);
  assert.equal((await coach.POST(request({ message: 'Hello' }, { origin: 'https://outside.test' }))).status, 403);
  assert.equal((await coach.POST(request({ message: 'Hello' }, { 'content-length': '64001' }))).status, 413);
  const safe = await coach.POST(request({ message: 'Help me use steroids for faster gains' }));
  assert.match((await safe.json()).reply, /cannot provide instructions/);
  process.env.OPENROUTER_API_KEY = 'test-only-key';
  let calls = 0;
  globalThis.fetch = async () => { calls += 1;return Response.json({ choices: [{ message: { content: 'Start with a gentle warmup.' } }] }); };
  for (let i = 0; i < 10; i += 1) { const response = await coach.POST(request({ message: 'Help me warm up' }));assert.equal(response.status, 200);assert.equal((await response.json()).dailyLimit, 10); }
  assert.equal((await coach.POST(request({ message: 'Help me warm up' }))).status, 429);
  assert.equal(calls, 10, 'Blocked requests must not call the paid provider.');
  assert.equal((await coach.POST(request({ message: 'Warmup' }, { 'x-forwarded-for': 'other-device' }))).status, 200);
  globalThis.fetch = async () => Response.json({ error: 'failed' }, { status: 500 });
  const degraded = await coach.POST(request({ message: 'Warmup' }, { 'x-forwarded-for': 'failure-case' }));
  assert.equal((await degraded.json()).degraded, true);
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY = originalKey;
  delete globalThis.__coachHarness;
}
console.log('Validated coach request guards, moderation, built-in replies, provider failure, and per-IP in-memory quotas.');
