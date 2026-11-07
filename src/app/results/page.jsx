'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import WorkoutCard from '@/components/WorkoutCard';
import GlassCard from '@/components/GlassCard';
import { generatePlan, searchReplacementExercises, replacePlanExercise, MUSCLE_GROUPS, WORKOUT_GENERATOR_VERSION } from '@/utils/workoutGenerator';
import { useStorageState } from '@/local/StorageProvider';
import { loadPlannerData, saveWorkoutPlan } from '@/local/database';

const goalLabels = { cut: 'lose fat', maintain: 'maintain weight', bulk: 'build muscle' };

function hasProfile(profile) {
  return Boolean(profile && Object.keys(profile).some((key) => !['updatedAt'].includes(key)));
}

export default function Results() {
  const { loading: storageLoading } = useStorageState();
  const [plan, setPlan] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [activeWorkout, setActiveWorkout] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const saved = await loadPlannerData();
        let savedPlan = saved.plan;
        const savedProfile = saved.profile;
        if (hasProfile(savedProfile) && (!savedPlan?.weekly || savedPlan.weekly.length !== 7 || !savedPlan.splitName || savedPlan.generatorVersion !== WORKOUT_GENERATOR_VERSION)) {
          savedPlan = generatePlan(savedProfile);
          await saveWorkoutPlan(savedPlan);
        }
        if (active) {
          setPlan(savedPlan);
          setProfile(hasProfile(savedProfile) ? savedProfile : null);
          setActiveWorkout(0);
        }
      } catch (error) {
        if (active) setStatus(error.message || 'Could not load your plan.');
      } finally { if (active) setLoading(false); }
    }

    if (!storageLoading) void load();
    return () => { active = false; };
  }, [storageLoading]);

  const trainingDays = plan?.weekly?.filter((day) => day.isTrainingDay ?? day.split !== 'Rest') || [];
  const currentWorkout = trainingDays[activeWorkout] || trainingDays[0];

  function selectWorkout(index) {
    if (!trainingDays.length) return;
    setActiveWorkout((index + trainingDays.length) % trainingDays.length);
  }

  function finishSwipe(event) {
    if (touchStartX.current === null) return;
    const distance = touchStartX.current - event.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(distance) < 50) return;
    selectWorkout(activeWorkout + (distance > 0 ? 1 : -1));
  }

  function searchSwaps(index, query) {
    if (!currentWorkout || !profile) return [];
    const dayIndex = plan.weekly.findIndex((day) => day.day === currentWorkout.day);
    return searchReplacementExercises(plan, profile, dayIndex, index, query);
  }

  async function swapExercise(index, name) {
    try {
      const dayIndex = plan.weekly.findIndex((day) => day.day === currentWorkout.day);
      const updated = replacePlanExercise(plan, profile, dayIndex, index, name);
      await saveWorkoutPlan(updated);
      setPlan(updated);
      setStatus('Replacement saved on this device.');
    } catch (error) {
      setStatus(error.message || 'Could not save the replacement.');
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <PageHeader eyebrow="Generated plan" title="Your weekly workout plan" description="A complete Monday–Sunday schedule with balanced sessions, recovery days, tutorials, and progression guidance." />

      {loading && <GlassCard><p className="animate-pulse text-cyan-200">Loading your saved plan...</p></GlassCard>}
      {status && !loading && <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={18} />{status}</div>}

      {!loading && !plan && (
        <GlassCard className="text-center">
          <CalendarDays className="mx-auto text-cyan-300" size={36} />
          <h2 className="mt-4 text-2xl font-bold">No workout plan yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">Answer the short questionnaire first. Your plan will be generated from your schedule, equipment, experience, and goal.</p>
          <Link href="/planner" className="btn-primary mt-6">Build My Plan</Link>
        </GlassCard>
      )}

      {plan && (
        <>
          <GlassCard className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-300">{plan.splitName || 'Weekly schedule'}</p>
                <h2 className="mt-2 text-3xl font-black">{trainingDays.length} focused workouts</h2>
                {profile && <p className="mt-2 text-sm text-slate-400">{goalLabels[profile.goal] || profile.goal} • {profile.experience} • {profile.equipment} • Up to {plan.exercisesPerWorkout || 5} exercises per workout</p>}
                <p className="mt-2 text-sm text-emerald-200">{MUSCLE_GROUPS.every((group) => plan.muscleFrequency?.[group] >= 2) ? 'Every major muscle group is trained on at least two days each week.' : 'Your schedule, exercise maximum, equipment, or restrictions limit weekly coverage for some muscle groups. Adjust your settings if you need a different balance.'}</p>
              </div>
              <Link href="/planner" className="btn-secondary">Adjust My Plan</Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {plan.weekly.map((workout) => {
                const isRest = !(workout.isTrainingDay ?? workout.split !== 'Rest');
                const workoutIndex = trainingDays.findIndex((day) => day.day === workout.day);
                const content = <>
                    <p className="text-xs font-semibold text-slate-400">{workout.day.slice(0, 3)}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-slate-100">
                      {isRest ? <Moon size={14} className="text-violet-300" /> : <Check size={14} className="text-cyan-300" />}
                      <span className="truncate">{workout.split}</span>
                    </div>
                  </>;
                if (isRest) return <div key={workout.day} className="rounded-2xl border border-white/5 bg-white/[.03] p-3">{content}</div>;
                return <button type="button" key={workout.day} aria-pressed={workoutIndex === activeWorkout} onClick={() => selectWorkout(workoutIndex)} className={`rounded-2xl border p-3 text-left transition ${workoutIndex === activeWorkout ? 'border-cyan-200 bg-cyan-300/20 ring-1 ring-cyan-200/30' : 'border-cyan-300/15 bg-cyan-400/10 hover:bg-cyan-400/15'}`}>{content}</button>;
              })}
            </div>
          </GlassCard>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <h2 className="text-xl font-bold">Progressive overload</h2>
              <p className="mt-2 text-slate-300">{plan.progressiveOverload}</p>
            </GlassCard>
            <GlassCard>
              <h2 className="text-xl font-bold">Recovery rule</h2>
              <p className="mt-2 text-slate-300">Rest days are part of the plan. Keep activity easy, prioritize sleep, and repeat a weight instead of increasing it when soreness or form says you are not ready.</p>
            </GlassCard>
          </div>

          {plan.limitationNote && <div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{plan.limitationNote}</div>}
          {plan.balanceNote && <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">{plan.balanceNote}</div>}
          {plan.customized && <div className="mb-6 rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4 text-sm text-violet-100">You customized this plan. Review equipment, movement restrictions, and muscle balance for the replacements you chose.</div>}

          {currentWorkout && <section aria-label="Workout viewer">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" disabled={trainingDays.length < 2} onClick={() => selectWorkout(activeWorkout - 1)} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40" aria-label="Show previous workout"><ChevronLeft className="mr-2" size={18} />Previous</button>
              <p className="text-center text-sm text-slate-300"><b className="text-white">Workout {activeWorkout + 1} of {trainingDays.length}</b><span className="hidden sm:inline"> • Swipe the card or choose a day above</span></p>
              <button type="button" disabled={trainingDays.length < 2} onClick={() => selectWorkout(activeWorkout + 1)} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40" aria-label="Show next workout">Next<ChevronRight className="ml-2" size={18} /></button>
            </div>
            <div className="touch-pan-y" onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }} onTouchEnd={finishSwipe}>
              <WorkoutCard key={`${currentWorkout.day}-${currentWorkout.split}`} workout={currentWorkout} searchSwaps={searchSwaps} onSwap={swapExercise} />
            </div>
            <div className="mt-4 flex justify-center gap-2" aria-label="Choose a workout">
              {trainingDays.map((workout, index) => <button type="button" key={workout.day} onClick={() => selectWorkout(index)} aria-label={`Show ${workout.day} workout`} aria-current={index === activeWorkout ? 'true' : undefined} className={`h-2.5 rounded-full transition-all ${index === activeWorkout ? 'w-8 bg-cyan-300' : 'w-2.5 bg-white/20 hover:bg-white/40'}`} />)}
            </div>
          </section>}
        </>
      )}
    </div>
  );
}
