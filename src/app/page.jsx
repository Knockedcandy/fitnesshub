import { Apple, Bot, CalendarDays, Dumbbell, LineChart, Search, ShieldCheck, TrendingUp, UserRoundCheck } from 'lucide-react';
import FeatureCard from '@/components/FeatureCard';
import GlassCard from '@/components/GlassCard';
import Hero from '@/components/Hero';
import StarterPlanDownload from '@/components/StarterPlanDownload';
import TrackedLink from '@/components/TrackedLink';
import { events } from '@/utils/analytics';

const features = [
  [Dumbbell, 'Personalized workout plan', 'Generate 3–6 training days and choose a 5–10 exercise limit per session using the equipment you have.'],
  [Apple, 'Nutrition targets and logs', 'Estimate calories and macros from your profile, then record real meals for any date.'],
  [TrendingUp, 'Real progress tracking', 'Log completed workouts, body weight, personal records, streaks, and private progress photos.'],
  [Bot, 'Plan-aware AI coach', 'Ask natural questions about form, swaps, warmups, recovery, and your saved routine—with a free daily live-message allowance.'],
  [Search, 'Exercise library', 'Search a detailed movement library by muscle, equipment, difficulty, or natural-language intent.'],
  [UserRoundCheck, 'Saved on your device', 'Your plans and progress stay in this browser. Export a backup whenever you need one.']
];

export default function Home() {
  return <>
    <Hero />
    <section className="mx-auto max-w-6xl px-6 md:px-10">
      <div className="mb-8 text-center"><p className="text-sm font-bold uppercase tracking-[.25em] text-cyan-300">Everything beginners need</p><h2 className="mt-3 text-4xl font-black">From first workout to consistent progress</h2></div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, text]) => <FeatureCard key={title} icon={Icon} title={title} text={text} />)}</div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <GlassCard><LineChart className="text-cyan-300" /><h2 className="mt-3 text-2xl font-bold">Track what actually happens</h2><p className="mt-3 text-slate-300">Charts and calendar states come from your own workout, weight, and PR entries—not demo data.</p><TrackedLink href="/progress" eventName={events.homepageCta} eventData={{ section: 'progress' }} className="btn-secondary mt-6">Track My Progress</TrackedLink></GlassCard>
        <GlassCard><CalendarDays className="text-cyan-300" /><h2 className="mt-3 text-2xl font-bold">A full Monday–Sunday plan</h2><p className="mt-3 text-slate-300">Training and recovery days stay visible, with balanced exercise selection for every equipment mode.</p><TrackedLink href="/planner" eventName={events.homepageCta} eventData={{ section: 'schedule' }} className="btn-secondary mt-6">Build My Schedule</TrackedLink></GlassCard>
        <GlassCard><ShieldCheck className="text-cyan-300" /><h2 className="mt-3 text-2xl font-bold">Simple, private, beginner-friendly</h2><p className="mt-3 text-slate-300">Your fitness records stay in your browser. Use My Data to download a backup or move your records to another browser.</p><TrackedLink href="/privacy" eventName={events.homepageCta} eventData={{ section: 'privacy' }} className="btn-secondary mt-6">Read Privacy Details</TrackedLink></GlassCard>
      </div>

      <div className="mt-12"><StarterPlanDownload /></div>

      <GlassCard className="mx-auto mt-12 max-w-3xl text-center"><h2 className="text-2xl font-bold">Build your routine for free</h2><p className="mt-3 text-slate-300">Plan workouts, track nutrition and progress, sync your data, and use the daily live-coach allowance.</p><TrackedLink href="/planner" eventName={events.homepageCta} eventData={{ section: 'free-tools' }} className="btn-primary mt-6">Build My Free Plan</TrackedLink></GlassCard>

      <div className="mt-12 rounded-3xl bg-gradient-to-r from-violet-600/40 to-cyan-500/30 p-8 text-center"><h2 className="text-3xl font-black">Ready to stop guessing?</h2><p className="mx-auto mt-3 max-w-2xl text-slate-200">Create your beginner workout plan, learn how to train, and start tracking progress today.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><TrackedLink href="/planner" eventName={events.homepageCta} eventData={{ section: 'final' }} className="btn-primary">Build My Free Plan</TrackedLink><TrackedLink href="/account" eventName={events.signupClick} eventData={{ section: 'final' }} className="btn-secondary">Manage My Data</TrackedLink></div></div>
    </section>
  </>;
}
