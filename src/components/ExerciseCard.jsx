'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import ExerciseTutorialModal from './ExerciseTutorialModal';
import { exerciseVisualAlt, getExerciseVisual } from '@/data/exerciseVisuals';

export default function ExerciseCard({ exercise }) {
  const [open, setOpen] = useState(false);
  const visual = getExerciseVisual(exercise);
  return (
    <article className="glass flex h-full flex-col overflow-hidden">
      <div className="relative border-b border-white/10 bg-slate-950/70">
        {visual.src ? <Image
          src={visual.src}
          alt={exerciseVisualAlt(exercise)}
          width={1536}
          height={1024}
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 92vw"
          className="aspect-[3/2] h-auto w-full object-cover"
        /> : <div className="flex aspect-[3/2] flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-400/10 via-slate-900 to-cyan-400/10 text-cyan-100"><BookOpen size={40} strokeWidth={1.5} /><span className="text-xs font-semibold uppercase tracking-widest">Written movement guide</span></div>}
        <span className="absolute bottom-3 left-3 rounded-full border border-cyan-200/20 bg-slate-950/80 px-3 py-1 text-xs font-bold text-cyan-100 backdrop-blur">{visual.label}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{exercise.name}</h2><p className="mt-1 text-sm text-slate-400">{exercise.muscle} • {exercise.equipment} • {exercise.difficulty}</p></div>
          <button type="button" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20" onClick={() => setOpen(true)}>Tutorial</button>
        </div>
        <p className="mt-3 flex-1 text-slate-300">{exercise.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">{(exercise.alternatives || []).slice(0, 3).map((alternative) => <span key={alternative} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Swap: {alternative}</span>)}</div>
      </div>
      {open && <ExerciseTutorialModal exercise={exercise} onClose={() => setOpen(false)} />}
    </article>
  );
}
