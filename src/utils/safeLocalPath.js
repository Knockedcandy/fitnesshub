// Only return a path that stays on this app's origin, even after URL normalization.
export function safeLocalPath(value, fallback = '/planner') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const base = 'https://fitlifehub.invalid';
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith('//')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
