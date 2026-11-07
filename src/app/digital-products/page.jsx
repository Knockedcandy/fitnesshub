import { Apple, CalendarCheck2, Dumbbell, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import TrackedLink from '@/components/TrackedLink';
import StarterPlanDownload from '@/components/StarterPlanDownload';
import { events } from '@/utils/analytics';

export const metadata = { title: 'Free Fitness Resources', description: 'Free beginner workout planning, nutrition, progress tracking, and gym-confidence resources.', alternates: { canonical: '/digital-products' } };

const resources = [
  [Dumbbell, 'Workout planner', 'Generate a complete 3–6 day schedule from your equipment and goals.', '/planner'],
  [Apple, 'Nutrition calculator', 'Estimate calories and macros, then log real meals by date.', '/nutrition'],
  [TrendingUp, 'Progress dashboard', 'Track workouts, weight, PRs, streaks, and private progress photos.', '/progress'],
  [CalendarCheck2, '7-day starter plan', 'Download the illustrated first-week PDF without entering an email address.', '/downloads/fitlifehub-7-day-gym-starter.pdf']
];

export default function DigitalProducts() {
  return <section className="mx-auto max-w-6xl px-6 py-10 md:px-10">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Free resources</p>
    <h1 className="mt-4 text-5xl font-black md:text-7xl">Use every finished FitLifeHub tool for free</h1>
    <p className="mt-5 max-w-3xl text-lg text-slate-300">Only complete, usable resources appear here. There are no preorder buttons, payment placeholders, or unfinished downloads.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-2">{resources.map(([Icon, name, text, href]) => <GlassCard key={name}><Icon className="text-cyan-300" /><h2 className="mt-4 text-2xl font-bold">{name}</h2><p className="mt-3 text-slate-300">{text}</p><TrackedLink href={href} eventName={events.digitalProductClick} eventData={{ product: name }} className="btn-primary mt-6" download={href.endsWith('.pdf')}>{href.endsWith('.pdf') ? 'Download PDF' : 'Open Resource'}</TrackedLink></GlassCard>)}</div>
    <div className="mt-10"><StarterPlanDownload /></div>
  </section>;
}
