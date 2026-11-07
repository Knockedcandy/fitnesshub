'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from './GlassCard';
import { generatePlan } from '@/utils/workoutGenerator';
import { calculateNutrition } from '@/utils/calorieCalculator';
import { useStorageState } from '@/local/StorageProvider';
import { loadPlannerData, savePlannerData } from '@/local/database';
import { events, trackEvent } from '@/utils/analytics';

const selectFields = [
  ['goal', 'Goal', [
    ['cut', 'Lose fat'],
    ['maintain', 'Maintain weight'],
    ['bulk', 'Build muscle']
  ]],
  ['experience', 'Experience', [
    ['beginner', 'Beginner'],
    ['intermediate', 'Intermediate'],
    ['advanced', 'Advanced']
  ]],
  ['days', 'Training days per week', [[3, '3 days'], [4, '4 days'], [5, '5 days'], [6, '6 days']]],
  ['exercisesPerWorkout', 'Maximum exercises per workout', [5, 6, 7, 8, 9, 10].map((count) => [count, `Up to ${count} exercises`])],
  ['equipment', 'Available equipment', [
    ['full gym', 'Full gym'],
    ['dumbbells only', 'Dumbbells only'],
    ['home/bodyweight', 'Bodyweight + fixed bars'],
    ['resistance bands', 'Resistance bands']
  ]],
  ['focus', 'Preferred focus', [
    ['balanced', 'Balanced fitness'],
    ['strength', 'Strength'],
    ['muscle', 'Build muscle'],
    ['conditioning', 'Conditioning']
  ]],
  ['activity', 'Daily activity level', [
    ['sedentary', 'Mostly seated'],
    ['light', 'Lightly active'],
    ['moderate', 'Moderately active'],
    ['active', 'Very active']
  ]],
  ['sex', 'Sex used for calorie estimate', [
    ['unspecified', 'Prefer not to say'],
    ['female', 'Female'],
    ['male', 'Male']
  ]]
];

const defaults = {
  goal: 'maintain',
  experience: 'beginner',
  days: 3,
  exercisesPerWorkout: 5,
  equipment: 'full gym',
  focus: 'balanced',
  activity: 'moderate',
  sex: 'unspecified',
  age: 25,
  heightFeet: 5,
  heightInches: 10,
  height: 70,
  weight: 180,
  limitations: ''
};

function restoreProfile(saved = {}) {
  const totalInches = Number(saved.height) || defaults.height;
  const requestedCount = Number(saved.exercisesPerWorkout);
  const currentProfile = { ...saved };
  delete currentProfile.duration;
  return {
    ...defaults,
    ...currentProfile,
    exercisesPerWorkout: Number.isInteger(requestedCount) ? Math.min(10, Math.max(5, requestedCount)) : 5,
    heightFeet: Number(saved.heightFeet) || Math.floor(totalInches / 12),
    heightInches: saved.heightInches === 0 ? 0 : Number(saved.heightInches) || totalInches % 12
  };
}

function validateProfile(profile) {
  if (profile.days < 3 || profile.days > 6) return 'Choose between 3 and 6 training days.';
  if (!Number.isInteger(profile.exercisesPerWorkout) || profile.exercisesPerWorkout < 5 || profile.exercisesPerWorkout > 10) return 'Choose between 5 and 10 exercises per workout.';
  if (profile.age < 13 || profile.age > 100) return 'Enter an age between 13 and 100.';
  if (profile.height < 48 || profile.height > 96) return 'Enter a height between 4 ft and 8 ft.';
  if (profile.weight < 70 || profile.weight > 700) return 'Enter a weight between 70 and 700 lb.';
  return '';
}

export default function WorkoutGenerator() {
  const router = useRouter();
  const { loading: storageLoading } = useStorageState();
  const [profile, setProfile] = useState(defaults);
  const [hydrating, setHydrating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const saved = await loadPlannerData();
        if (active && saved.profile) setProfile(restoreProfile(saved.profile));
      } catch (error) {
        if (active) setStatus(error.message || 'Could not read your saved profile.');
      } finally {
        if (active) setHydrating(false);
      }
    }

    if (!storageLoading) void hydrate();
    return () => { active = false; };
  }, [storageLoading]);

  function update(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus('Generating a balanced 7-day schedule...');

    try {
      const normalized = {
        ...profile,
        days: Number(profile.days),
        exercisesPerWorkout: Number(profile.exercisesPerWorkout),
        age: Number(profile.age),
        heightFeet: Number(profile.heightFeet),
        heightInches: Number(profile.heightInches),
        height: Number(profile.heightFeet) * 12 + Number(profile.heightInches),
        weight: Number(profile.weight),
        limitations: String(profile.limitations || '').trim()
      };
      delete normalized.duration;
      const validationError = validateProfile(normalized);
      if (validationError) throw new Error(validationError);

      const plan = generatePlan(normalized);
      const nutrition = calculateNutrition(normalized);
      setStatus('Saving your plan on this device...');
      await savePlannerData({ profile: normalized, plan, nutrition });

      trackEvent(events.workoutGenerated, {
        days: normalized.days,
        equipment: normalized.equipment,
        experience: normalized.experience
      });
      setStatus('Plan ready. Opening your schedule...');
      router.push('/results');
    } catch (error) {
      setStatus(error.message || 'Could not generate your plan. Check the form and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
        {selectFields.map(([key, label, options]) => (
          <label key={key} className="space-y-2">
            <span className="label">{label}</span>
            <select className="field" value={profile[key]} onChange={(event) => update(key, event.target.value)}>
              {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
            </select>
            {key === 'days' && <span className="block text-xs leading-5 text-slate-400">Matching A and B days repeat the same exercises, sets, reps, and rest. Full Body C is a separate session.</span>}
            {key === 'exercisesPerWorkout' && <span className="block text-xs leading-5 text-slate-400">Set a maximum of 5–10 movements per day. Exercises stay in the correct split and each muscle is capped at two movements, so some sessions will be shorter. Longer lists use fewer sets per exercise.</span>}
            {key === 'equipment' && <span className="block text-xs leading-5 text-slate-400">Bodyweight plans use secure pull-up or row bars. Dumbbell plans may use a stable bench; band plans need secure anchors.</span>}
          </label>
        ))}

        <label className="space-y-2">
          <span className="label">Age</span>
          <input className="field" type="number" inputMode="numeric" min="13" max="100" value={profile.age} onChange={(event) => update('age', event.target.value)} required />
        </label>

        <fieldset className="space-y-2">
          <legend className="label">Height</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative">
              <span className="sr-only">Height in feet</span>
              <input className="field pr-10" type="number" inputMode="numeric" min="4" max="8" value={profile.heightFeet} onChange={(event) => update('heightFeet', event.target.value)} required />
              <span className="pointer-events-none absolute right-4 top-3 text-sm text-slate-400">ft</span>
            </label>
            <label className="relative">
              <span className="sr-only">Additional height in inches</span>
              <input className="field pr-10" type="number" inputMode="numeric" min="0" max="11" value={profile.heightInches} onChange={(event) => update('heightInches', event.target.value)} required />
              <span className="pointer-events-none absolute right-4 top-3 text-sm text-slate-400">in</span>
            </label>
          </div>
        </fieldset>

        <label className="space-y-2">
          <span className="label">Weight (lb)</span>
          <input className="field" type="number" inputMode="decimal" min="70" max="700" step="0.1" value={profile.weight} onChange={(event) => update('weight', event.target.value)} required />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="label">Injuries or limitations <span className="font-normal text-slate-500">(optional)</span></span>
          <textarea className="field min-h-24 resize-y" maxLength="240" value={profile.limitations} onChange={(event) => update('limitations', event.target.value)} placeholder="Example: Avoid jumping; left shoulder is sensitive overhead." />
          <span className="block text-right text-xs text-slate-500">{String(profile.limitations).length}/240</span>
        </label>

        <button disabled={loading || hydrating || storageLoading} className="btn-primary md:col-span-2 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
          {hydrating || storageLoading ? 'Loading saved profile...' : loading ? 'Generating your plan...' : 'Generate My Plan'}
        </button>
        {status && <p aria-live="polite" className="md:col-span-2 text-sm text-cyan-200">{status}</p>}
        <p className="md:col-span-2 text-xs text-slate-400">
          Your plan is saved automatically in this browser. Use My Data to export a backup.
        </p>
      </form>
    </GlassCard>
  );
}
