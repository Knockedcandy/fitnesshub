'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BookOpen, Clock3, Repeat2 } from 'lucide-react';
import GlassCard from './GlassCard';
import ExerciseTutorialModal from './ExerciseTutorialModal';
import { exerciseVisualAlt, getExerciseVisual } from '@/data/exerciseVisuals';
import { exerciseMuscleGroups } from '@/utils/workoutGenerator';

const coverageOrder = ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function WorkoutCard({ workout, searchSwaps, onSwap }) {
  const [exercise, setExercise] = useState(null);
  const [swapIndex, setSwapIndex] = useState(null);
  const [swapQuery, setSwapQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [swapError, setSwapError] = useState('');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isToday = workout.day === today;
  const isRest = !(workout.isTrainingDay ?? workout.split !== 'Rest');
  const coverage = isRest ? [] : coverageOrder.filter((group) =>
    workout.exercises.some((item) => exerciseMuscleGroups(item).has(group))
  );

  async function chooseSwap(index, name) {
    if (saving) return;
    setSaving(true);
    setSwapError('');
    try {
      await onSwap(index, name);
      setSwapIndex(null);
      setSwapQuery('');
    } catch (error) {
      setSwapError(error.message || 'Could not save the replacement. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard className={isToday ? 'ring-2 ring-cyan-300/50' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-cyan-300">
            <span>{workout.day}</span>
            {isToday && <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">Today</span>}
          </div>
          <h3 className="mt-1 text-2xl font-bold">{workout.split}</h3>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{workout.exercises?.length || 0} exercises</span>
      </div>

      {isRest ? (
        <p className="mt-4 text-slate-300">Recovery day. Walk, stretch, hydrate, and sleep well.</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-cyan-100"><b>Muscle coverage:</b> {coverage.map(titleCase).join(' • ')}</p>
          <p className="mt-2 flex gap-2 text-sm text-slate-300"><Clock3 className="mt-0.5 shrink-0 text-violet-300" size={16} /><span><b>Warmup:</b> {workout.warmup}</span></p>
          <div className="mt-4 space-y-3">
            {workout.exercises.map((item, index) => {
              const repetitionLabel = String(item.reps).includes('sec') ? item.reps : `${item.reps} reps`;
              const visual = getExerciseVisual(item);
              const matches = swapIndex === index && swapQuery.trim() ? searchSwaps(index, swapQuery) : [];
              return (
                <div key={`${workout.day}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                        {visual.src ? <Image src={visual.src} alt={exerciseVisualAlt(item)} fill sizes="80px" className="object-cover" /> : <BookOpen size={21} className="text-cyan-200" aria-label="Text-only guide" />}
                        <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-md bg-slate-950/85 text-[10px] font-bold text-cyan-200">{index + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="break-words font-bold">{item.name}</h4>
                        <p className="mt-1 text-sm text-slate-300">{item.sets} sets × {repetitionLabel} • Rest: {item.rest}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {searchSwaps && <button type="button" onClick={() => { setSwapIndex(swapIndex === index ? null : index); setSwapQuery(''); setSwapError(''); }} aria-expanded={swapIndex === index} className="rounded-xl bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"><Repeat2 size={15} className="mr-1 inline" />Replace</button>}
                      <button type="button" onClick={() => setExercise(item)} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Tutorial</button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{item.equipment} • {item.muscle || item.muscles?.join(', ')} • {item.difficulty}</p>
                  {item.beginnerModification && <p className="mt-2 text-sm text-cyan-200"><b>Make it easier:</b> {item.beginnerModification}</p>}
                  {swapIndex === index && <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3" aria-label={`Replacements for ${item.name}`}>
                    <label htmlFor={`swap-search-${workout.day}-${index}`} className="block text-sm font-bold text-cyan-100">Search for a replacement movement</label>
                    <input id={`swap-search-${workout.day}-${index}`} type="search" value={swapQuery} onChange={(event) => setSwapQuery(event.target.value)} maxLength={70} placeholder="Try ‘row’, ‘chest’, or ‘dumbbell’" className="field mt-2" />
                    <p className="mt-2 text-xs text-slate-400">Search by movement, muscle, or equipment. Every result can be selected; notes flag possible changes to your plan. New catalog artwork is being added in batches; entries without an illustration still have written guides.</p>
                    {swapError && <p role="alert" className="mt-2 text-sm text-amber-200">{swapError}</p>}
                    {swapQuery.trim() && <p role="status" className="mt-3 text-xs text-slate-300">{matches.length ? `${matches.length} matching movements` : 'No movements match that search. Try a different name or muscle.'}</p>}
                    {matches.length > 0 && <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {matches.map(({ exercise: option, advisory }) => <button key={option.name} type="button" disabled={saving} onClick={() => chooseSwap(index, option.name)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-2 text-left hover:border-cyan-300/40 disabled:opacity-50">
                        <span className="relative grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-cyan-300/10">{getExerciseVisual(option).src ? <Image src={getExerciseVisual(option).src} alt="" fill sizes="64px" className="object-cover" /> : <BookOpen className="text-cyan-200" size={19} />}</span>
                        <span className="min-w-0"><span className="block text-sm font-semibold text-white">{option.name}</span><span className="block text-xs text-slate-400">{option.equipment} · {option.muscle}</span>{advisory && <span className="block text-xs text-amber-200">{advisory}</span>}</span>
                      </button>)}
                    </div>}
                  </div>}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-slate-300"><b>Cooldown:</b> {workout.cooldown}</p>
        </>
      )}

      {exercise && <ExerciseTutorialModal exercise={exercise} onClose={() => setExercise(null)} />}
    </GlassCard>
  );
}
