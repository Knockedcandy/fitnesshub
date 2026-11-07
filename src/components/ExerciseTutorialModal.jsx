'use client';

import Image from 'next/image';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { exerciseVisualAlt, getExerciseVisual } from '@/data/exerciseVisuals';

export default function ExerciseTutorialModal({ exercise, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const visual = getExerciseVisual(exercise);
  const targetMuscles = Array.isArray(exercise.muscles) && exercise.muscles.length
    ? exercise.muscles
    : [exercise.muscle].filter(Boolean);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (first && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onMouseDown={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass max-h-[90vh] w-full max-w-4xl overflow-auto p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-cyan-300">Exercise tutorial</p>
            <h2 id={titleId} className="text-3xl font-black">{exercise.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{exercise.muscle} • {exercise.equipment} • {exercise.difficulty}</p>
          </div>
          <button ref={closeRef} type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>
        {visual.src ? <figure className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
          <Image
            src={visual.src}
            alt={exerciseVisualAlt(exercise)}
            width={1536}
            height={1024}
            sizes="(min-width: 768px) 820px, 92vw"
            className="h-auto w-full object-cover"
            priority
          />
          <figcaption className="border-t border-white/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Target muscles</span>
              {targetMuscles.map((muscle) => <span key={muscle} className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">{muscle}</span>)}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">The panels show two stages of the movement. Coral shows the target muscles. Follow the written steps for setup and control, and have a qualified coach review your technique when needed.</p>
          </figcaption>
        </figure> : <div className="mt-6 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-violet-400/10 to-cyan-400/10 p-6"><BookOpen className="text-cyan-200" size={28} /><p className="mt-3 text-sm text-slate-300">Text-only exercise reference. Use the steps below to review setup and movement; no image is provided for this entry.</p><div className="mt-4 flex flex-wrap gap-2">{targetMuscles.map((muscle) => <span key={muscle} className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">{muscle}</span>)}</div></div>}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="font-bold">How to do it</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-300">{(exercise.instructions || []).map((item) => <li key={item}>{item}</li>)}</ol>
          </section>
          {!!exercise.mistakes?.length && <section>
            <h3 className="font-bold">Common mistakes</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-300">{(exercise.mistakes || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>}
          {exercise.beginnerModification && <section>
            <h3 className="font-bold">Beginner modification</h3>
            <p className="mt-2 text-slate-300">{exercise.beginnerModification}</p>
          </section>}
          {exercise.progression && <section>
            <h3 className="font-bold">How to progress</h3>
            <p className="mt-2 text-slate-300">{exercise.progression}</p>
          </section>}
        </div>
        <p className="mt-5 text-sm text-amber-200">Stop if you feel sharp pain. Injury-specific questions need a qualified medical or rehabilitation professional.</p>
      </motion.div>
    </div>,
    document.body
  );
}
