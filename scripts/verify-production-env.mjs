const required = [
  'NEXT_PUBLIC_SITE_URL',
  'APP_URL',
  'NEXT_PUBLIC_SUPPORT_EMAIL',
  'NEXT_PUBLIC_LEGAL_NAME',
  'NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE'
];

const missing = required.filter((name) => !String(process.env[name] || '').trim());
const placeholder = /your[-_. ]?(domain|project)|example\.com|localhost/i;
const invalidUrls = ['NEXT_PUBLIC_SITE_URL', 'APP_URL'].filter((name) => {
  const value = String(process.env[name] || '');
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol !== 'https:' || placeholder.test(value);
  } catch {
    return true;
  }
});

if (missing.length || invalidUrls.length) {
  if (missing.length) console.error(`Missing production variables: ${missing.join(', ')}`);
  if (invalidUrls.length) console.error(`Production URLs must be real HTTPS addresses: ${invalidUrls.join(', ')}`);
  process.exit(1);
}

if (process.env.OPENROUTER_API_KEY && String(process.env.AI_RATE_LIMIT_SALT || '').length < 32) {
  console.error('AI_RATE_LIMIT_SALT must contain at least 32 random characters.');
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)) || /your-domain|example\./i.test(String(process.env.NEXT_PUBLIC_SUPPORT_EMAIL))) {
  console.error('NEXT_PUBLIC_SUPPORT_EMAIL must contain a real support email.');
  process.exit(1);
}

if (/your |placeholder|example/i.test(String(process.env.NEXT_PUBLIC_LEGAL_NAME))) {
  console.error('NEXT_PUBLIC_LEGAL_NAME must identify the real operator or business.');
  process.exit(1);
}

const effectiveDate = String(process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE);
const parsedEffectiveDate = new Date(`${effectiveDate}T00:00:00.000Z`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || !Number.isFinite(parsedEffectiveDate.getTime()) || parsedEffectiveDate.toISOString().slice(0, 10) !== effectiveDate) {
  console.error('NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE must be a real date in YYYY-MM-DD format.');
  process.exit(1);
}

if (new URL(process.env.NEXT_PUBLIC_SITE_URL).origin !== new URL(process.env.APP_URL).origin) {
  console.error('NEXT_PUBLIC_SITE_URL and APP_URL must use the same production origin.');
  process.exit(1);
}

console.log('Production legal, URL, and optional live-coach variables pass basic safety checks.');
