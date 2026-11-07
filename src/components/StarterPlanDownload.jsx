import { Download } from 'lucide-react';
import GlassCard from './GlassCard';
import TrackedLink from './TrackedLink';
import { events } from '@/utils/analytics';

export default function StarterPlanDownload({ compact = false }) {
  return <GlassCard className={compact ? '' : 'mx-auto max-w-4xl'}>
    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Free beginner resource</p>
        <h2 className="mt-3 text-2xl font-black md:text-3xl">Download the 7-day gym starter plan</h2>
        <p className="mt-3 text-slate-300">A polished, phone-friendly PDF with three guided beginner workouts, recovery days, form cues, and a week-one checklist. No account required.</p>
      </div>
      <TrackedLink href="/downloads/fitlifehub-7-day-gym-starter.pdf" eventName={events.leadDownloaded} eventData={{ location: compact ? 'footer' : 'content' }} className="btn-primary justify-center" download>
        <Download className="mr-2" size={18} />Download PDF
      </TrackedLink>
    </div>
  </GlassCard>;
}
