const fallbackUrl = 'http://localhost:3000';

export function getSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || fallbackUrl).origin;
  } catch {
    return fallbackUrl;
  }
}
