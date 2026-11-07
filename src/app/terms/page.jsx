import GlassCard from '@/components/GlassCard';

export const metadata = { title: 'Terms of Use', description: 'FitLifeHub safety, AI, local storage, and responsible-use terms.' };

export default function Terms() {
  const legalName = process.env.NEXT_PUBLIC_LEGAL_NAME || 'FitLifeHub';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
  const effectiveDate = process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || 'Configure before launch';
  return <section className="mx-auto max-w-5xl px-6 py-10 md:px-10">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Terms</p>
    <h1 className="mt-4 text-5xl font-black">Terms of Use</h1>
    <p className="mt-3 text-sm text-slate-400">Agreement with {legalName} • Effective {effectiveDate}</p>
    <div className="mt-8 grid gap-5">
      <GlassCard><h2 className="text-2xl font-bold">General fitness guidance</h2><p className="mt-3 text-slate-300">FitLifeHub provides general fitness and nutrition education only. It is not medical advice. Consult a qualified professional before starting a program, especially if you have injuries, medical conditions, are pregnant, or have a history of disordered eating.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">AI disclaimer</h2><p className="mt-3 text-slate-300">AI coach responses may be incomplete or incorrect. Stop any activity that causes sharp pain, dizziness, or unusual symptoms, and seek appropriate professional care.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">Local data and acceptable use</h2><p className="mt-3 text-slate-300">Protect access to your browser profile and keep regular backups. Do not abuse the AI endpoint, upload unlawful content, or interfere with the service. You can delete your local fitness data from My Data.</p></GlassCard>
      <GlassCard><h2 className="text-2xl font-bold">Availability and support</h2><p className="mt-3 text-slate-300">Live AI coaching has a daily message limit. Service availability and responses may vary. Contact {supportEmail ? <a className="text-cyan-200 hover:text-cyan-100" href={`mailto:${supportEmail}`}>{supportEmail}</a> : 'the app operator'} with questions about the app.</p></GlassCard>
    </div>
  </section>;
}
