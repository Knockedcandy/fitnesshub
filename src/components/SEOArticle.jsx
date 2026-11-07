import GlassCard from './GlassCard';
import StarterPlanDownload from './StarterPlanDownload';
import TrackedLink from './TrackedLink';
import { events } from '@/utils/analytics';
import { getSiteUrl } from '@/utils/siteUrl';

const siteUrl = getSiteUrl();

export default function SEOArticle({ title, intro, steps = [], mistakes = [], workout, related = [], disclaimer = true }) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: intro,
    author: { '@type': 'Organization', name: 'FitLifeHub' },
    publisher: { '@type': 'Organization', name: 'FitLifeHub', logo: { '@type': 'ImageObject', url: `${siteUrl}/fitlifehub-logo.png` } }
  };
  const serializedArticleSchema = JSON.stringify(articleSchema).replace(/</g, '\\u003c');

  return <section className="mx-auto max-w-5xl px-6 py-10 md:px-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializedArticleSchema }} />
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Beginner fitness guide</p>
      <h1 className="mt-4 text-4xl font-black md:text-6xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-lg text-slate-300">{intro}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <TrackedLink href="/planner" eventName={events.seoCta} eventData={{ article: title, cta: 'build_plan' }} className="btn-primary">Build My Free Workout Plan</TrackedLink>
        <TrackedLink href="/signup" eventName={events.seoCta} eventData={{ article: title, cta: 'account' }} className="btn-secondary">Save Across Devices</TrackedLink>
      </div>
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <GlassCard><h2 className="text-2xl font-bold">Step-by-step guide</h2><div className="mt-4 space-y-4">{steps.map((s,i)=><div key={`${s}-${i}`} className="rounded-2xl bg-white/5 p-4"><b className="text-cyan-200">Step {i+1}</b><p className="mt-1 text-slate-300">{s}</p></div>)}</div></GlassCard>
      <div className="space-y-5"><GlassCard><h2 className="text-2xl font-bold">Beginner mistakes</h2>{mistakes.map(m=><p key={m} className="mt-3 text-slate-300">• {m}</p>)}</GlassCard>{workout&&<GlassCard><h2 className="text-2xl font-bold">Example workout or calculation</h2>{workout.map(x=><div key={x} className="mt-3 rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-300">{x}</div>)}</GlassCard>}</div>
    </div>
    {related.length > 0 && <GlassCard className="mt-8"><h2 className="text-2xl font-bold">Related beginner resources</h2><div className="mt-4 flex flex-wrap gap-3">{related.map(([href,label])=><TrackedLink key={href} href={href} eventName={events.seoCta} eventData={{ article: title, related: label }} className="btn-secondary">{label}</TrackedLink>)}</div></GlassCard>}
    {disclaimer && <GlassCard className="mt-8 border-cyan-300/20"><h2 className="text-xl font-bold">Safety note</h2><p className="mt-3 text-slate-300">Fitness Planner provides general fitness and nutrition education only. It is not medical advice. If you have injuries, medical conditions, or diet-specific needs, consult a qualified professional.</p></GlassCard>}
    <div className="mt-10"><StarterPlanDownload /></div>
  </section>
}
