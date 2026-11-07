import AnimatedSection from './AnimatedSection';
import TrackedLink from './TrackedLink';
import { events } from '@/utils/analytics';

export default function Hero() {
  return <AnimatedSection className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:px-10 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
    <div>
      <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan-300">Beginner AI fitness planner</p>
      <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">Stop guessing what to do at the gym.</h1>
      <p className="mt-6 text-lg text-slate-300">Build a balanced workout plan, track nutrition and progress, and get plan-aware AI guidance in one simple dashboard.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <TrackedLink eventName={events.homepageCta} eventData={{ label: 'Build My Free Plan' }} className="btn-primary" href="/planner">Build My Free Plan</TrackedLink>
        <TrackedLink eventName={events.homepageCta} eventData={{ label: 'Ask My AI Coach' }} className="btn-secondary" href="/assistant">Ask My AI Coach</TrackedLink>
      </div>
      <p className="mt-4 text-sm text-slate-400">The tools are free. Create an account to sync your plans and progress across devices.</p>
    </div>
    <div className="glass p-6">
      <div className="rounded-2xl bg-slate-950/60 p-4"><p className="text-sm text-slate-400">Balanced week preview</p>{['Mon Push • 45 min', 'Tue Pull • 45 min', 'Wed Recovery', 'Thu Legs • 45 min', 'Fri Full Body • 40 min'].map((item) => <div key={item} className="mt-3 flex items-center justify-between rounded-2xl bg-white/5 p-3"><span>{item}</span><span className="text-cyan-300">Beginner</span></div>)}</div>
      <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600/30 to-cyan-500/20 p-4"><p className="font-semibold">AI Coach</p><p className="text-sm text-slate-300">“Make today’s workout easier with dumbbells only.”</p></div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div className="rounded-2xl bg-white/5 p-3"><b className="block text-white">3–6</b><span className="text-slate-400">training days</span></div><div className="rounded-2xl bg-white/5 p-3"><b className="block text-white">Private</b><span className="text-slate-400">device storage</span></div><div className="rounded-2xl bg-white/5 p-3"><b className="block text-white">Safe</b><span className="text-slate-400">beginner tips</span></div></div>
    </div>
  </AnimatedSection>;
}
