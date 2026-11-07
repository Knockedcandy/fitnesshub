import { getSiteUrl } from '@/utils/siteUrl';

export default function robots() {
  const siteUrl = getSiteUrl();
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
