'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Apple,
  Bot,
  ClipboardList,
  Dumbbell,
  Home,
  Menu,
  Search,
  Shield,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const links = [
  ['/', 'Home', Home],
  ['/planner', 'Planner', ClipboardList],
  ['/results', 'My Plan', Dumbbell],
  ['/nutrition', 'Nutrition', Apple],
  ['/progress', 'Progress', TrendingUp],
  ['/search', 'Exercise Search', Search],
  ['/assistant', 'AI Coach', Bot]
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href) {
    return href === '/' ? path === '/' : path === href;
  }

  const accountHref = '/account';
  const accountLabel = 'My Data';

  return (
    <aside className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl lg:fixed lg:left-0 lg:h-screen lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3" aria-label="FitLifeHub home">
          <BrandLogo size={58} priority />
          <div className="min-w-0"><p className="truncate text-sm font-black tracking-[.06em] text-white">FITLIFEHUB</p><p className="truncate text-xs text-slate-400">Fitness planner</p></div>
        </Link>
        <button type="button" aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen((current) => !current)} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-200 lg:hidden">{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>

      <div id="primary-navigation" className={`${open ? 'block' : 'hidden'} max-h-[calc(100vh-5rem)] overflow-y-auto pt-4 lg:block lg:max-h-none lg:overflow-visible`}>
        <nav aria-label="Primary navigation" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
          {links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={isActive(href) ? 'page' : undefined} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive(href) ? 'bg-white/15 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}><Icon size={18} />{label}</Link>)}
          <Link href={accountHref} onClick={() => setOpen(false)} aria-current={isActive(accountHref) ? 'page' : undefined} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive(accountHref) ? 'bg-white/15 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}><User size={18} />{accountLabel}</Link>
        </nav>

        <p className="mt-4 text-xs text-emerald-200">Saved on this device · No account needed</p>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 lg:mt-6">
          <Shield className="mb-2 text-cyan-300" size={20} />
          <b className="text-white">Built for sustainable progress</b>
          <p className="mt-2">Build a balanced week, track what you actually do, and adjust without starting over.</p>
          <Link href="/progress" onClick={() => setOpen(false)} className="mt-3 inline-block text-cyan-200 hover:text-cyan-100">Open progress dashboard →</Link>
        </div>
      </div>
    </aside>
  );
}
