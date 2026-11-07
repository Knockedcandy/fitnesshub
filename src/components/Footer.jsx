import Link from 'next/link';
import BrandLogo from './BrandLogo';
import StarterPlanDownload from './StarterPlanDownload';

export default function Footer() {
  return <footer className="mt-16 border-t border-white/10 px-6 py-10 text-sm text-slate-400 md:px-10">
    <div className="mx-auto max-w-6xl">
      <StarterPlanDownload compact />
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        <div><BrandLogo size={72} /><p className="mt-3 text-lg font-black tracking-[.06em] text-white">FITLIFEHUB</p><p className="mt-2">A beginner-friendly AI fitness planner for people who feel lost at the gym.</p></div>
        <div><b className="text-white">Tools</b><div className="mt-3 grid gap-2"><Link href="/planner">Build My Free Plan</Link><Link href="/nutrition">Nutrition Calculator</Link><Link href="/progress">Progress Tracker</Link><Link href="/assistant">AI Coach</Link></div></div>
        <div><b className="text-white">Learn</b><div className="mt-3 grid gap-2"><Link href="/first-day-at-the-gym">First Day Guide</Link><Link href="/gym-etiquette-for-beginners">Gym Etiquette</Link><Link href="/how-to-track-progress">Tracking Progress</Link><Link href="/digital-products">Free Downloads</Link></div></div>
        <div><b className="text-white">Trust</b><div className="mt-3 grid gap-2"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms of Use</Link><Link href="/account">My Data</Link><p>Educational fitness guidance, not medical advice.</p></div></div>
      </div>
      <p className="mt-8 border-t border-white/10 pt-6">© 2026 FitLifeHub. AI guidance is educational and beginner-focused.</p>
    </div>
  </footer>;
}
