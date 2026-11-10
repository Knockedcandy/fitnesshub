import GlassCard from '@/components/GlassCard';

export const metadata = { title: 'Privacy Policy', description: 'How FitLifeHub handles local workout, nutrition, progress, photo, AI, and analytics data.' };

export default function Privacy() {
  const legalName = process.env.NEXT_PUBLIC_LEGAL_NAME || 'FitLifeHub';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
  const effectiveDate = process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || 'Configure before launch';
  return <section className="mx-auto max-w-5xl px-6 py-10 md:px-10">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Privacy</p>
    <h1 className="mt-4 text-5xl font-black">Privacy Policy</h1>
    <p className="mt-3 text-sm text-slate-400">Operated by {legalName} • Effective {effectiveDate}</p>
    <div className="mt-8 grid gap-5">
      <GlassCard><h2 className="text-2xl font-bold">What the app stores</h2><p className="mt-3 text-slate-300">Plans, nutrition logs, body weight, exercise weight history, workout logs, personal records, and progress photos are stored in this browser using IndexedDB. No account or cloud database is used for these records.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">Local storage and backups</h2><p className="mt-3 text-slate-300">Records are available to anyone using this browser profile. Exported backups include your personal fitness data and photos; keep them somewhere private. Data does not automatically sync between devices. Clearing site data, browser eviction, or a device failure can remove local records, so export backups regularly.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">How AI requests work</h2><p className="mt-3 text-slate-300">AI coach requests pass through a server-side route so the OpenRouter key is never exposed in the browser. Your question, recent chat messages, and a limited summary of your saved workout and nutrition plan may be sent to OpenRouter. Progress photos and detailed progress logs are not included.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">Analytics</h2><p className="mt-3 text-slate-300">If analytics IDs are configured, analytics providers may receive page views and feature events used to understand and improve the app.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">Your control and retention</h2><p className="mt-3 text-slate-300">You can delete individual food, body weight, exercise weight, PR, workout, and photo entries in the app. My Data lets you export or restore a backup and delete all fitness records stored by this app on this browser. Clearing browser site data also removes these records. Previously synced records from an older version are not downloaded or deleted by this local-only version.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">Contact</h2><p className="mt-3 text-slate-300">Questions or privacy requests can be sent to {supportEmail ? <a className="text-cyan-200 hover:text-cyan-100" href={`mailto:${supportEmail}`}>{supportEmail}</a> : 'the support address configured before launch'}.</p></GlassCard>
    </div>
  </section>;
}
