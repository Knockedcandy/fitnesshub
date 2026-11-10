'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { BarChart3, CalendarCheck2, Check, Flame, RotateCcw, Trophy, Upload } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import GlassCard from './GlassCard';
import { useStorageState } from '@/local/StorageProvider';
import {
  addPRLog,
  addWeightLog,
  addWorkoutLog,
  deletePRLog,
  deleteWeightLog,
  deleteWorkoutLog,
  getPhotoLogs,
  getExerciseLoads,
  getPRLogs,
  getWeightLogs,
  getWorkoutLogs,
  loadPlannerData
} from '@/local/database';
import { saveProgressPhoto, loadProgressPhoto, deleteProgressPhoto } from '@/local/database';
import { events, trackEvent } from '@/utils/analytics';
import { todayISO } from '@/utils/localStore';

const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function byDate(a, b) {
  return String(a.date).localeCompare(String(b.date));
}

function parseDate(iso) {
  return new Date(`${iso}T12:00:00`);
}

function weekStartISO(iso) {
  const date = parseDate(iso);
  const daysFromMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysFromMonday);
  return todayISO(date);
}

function calendarRange() {
  const end = parseDate(todayISO());
  const daysFromMonday = (end.getDay() + 6) % 7;
  const start = new Date(end);
  start.setDate(end.getDate() - daysFromMonday - 21);
  return Array.from({ length: 28 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { iso: todayISO(date), date };
  });
}

function workoutStreak(workoutLogs, plan) {
  const completed = new Set(workoutLogs.map((item) => item.date));
  const scheduledDays = new Set((plan?.weekly || []).filter((item) => item.isTrainingDay ?? item.split !== 'Rest').map((item) => item.day));
  if (!scheduledDays.size) return completed.size;

  const current = parseDate(todayISO());
  let streak = 0;
  for (let index = 0; index < 120; index += 1) {
    const iso = todayISO(current);
    const weekday = current.toLocaleDateString('en-US', { weekday: 'long' });
    if (scheduledDays.has(weekday)) {
      if (index === 0 && !completed.has(iso)) {
        current.setDate(current.getDate() - 1);
        continue;
      }
      if (!completed.has(iso)) break;
      streak += 1;
    }
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

async function readProgressData(includePhotos = true) {
  const [weight, prs, loads, workouts, photoLogs, planner] = await Promise.all([
    getWeightLogs(), getPRLogs(), getExerciseLoads(), getWorkoutLogs(), includePhotos ? getPhotoLogs() : null, loadPlannerData()
  ]);
  const photos = photoLogs ? await Promise.all(photoLogs.map(async (photo) => {
    if (!photo.storagePath) return photo;
    try { return { ...photo, imageUrl: await loadProgressPhoto(photo.storagePath), revokeUrl: true }; }
    catch { return { ...photo, imageUrl: '', loadError: true }; }
  })) : null;
  return { weight, prs, loads, workouts, photos, plan: planner.plan, warning: '' };
}

export default function ProgressTracker() {
  const { loading: storageLoading } = useStorageState();
  const [weightLogs, setWeightLogs] = useState([]);
  const [prLogs, setPrLogs] = useState([]);
  const [loadLogs, setLoadLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [plan, setPlan] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedLoadExercise, setSelectedLoadExercise] = useState('');
  const [action, setAction] = useState('load');
  const [status, setStatus] = useState('');

  function applyData(data) {
    setWeightLogs(data.weight);
    setPrLogs(data.prs);
    setLoadLogs(data.loads);
    setWorkoutLogs(data.workouts);
    if (data.photos) setPhotos(data.photos);
    setPlan(data.plan);
    if (data.warning) setStatus(data.warning);
  }

  async function refresh(includePhotos = false) {
    const data = await readProgressData(includePhotos);
    applyData(data);
  }

  useEffect(() => {
    if (storageLoading) return undefined;
    let active = true;

    async function hydrate() {
      try {
        const data = await readProgressData();
        if (active) {
          setWeightLogs(data.weight);
          setPrLogs(data.prs);
          setLoadLogs(data.loads);
          setWorkoutLogs(data.workouts);
          setPhotos(data.photos);
          setPlan(data.plan);
          setStatus(data.warning);
          setAction('');
        } else {
          data.photos?.filter((photo) => photo.revokeUrl).forEach((photo) => URL.revokeObjectURL(photo.imageUrl));
        }
      } catch (error) { if (active) { setStatus(error.message); setAction(''); } }
    }

    void hydrate();
    return () => { active = false; };
  }, [storageLoading]);

  useEffect(() => () => {
    photos.filter((photo) => photo.revokeUrl && photo.imageUrl).forEach((photo) => URL.revokeObjectURL(photo.imageUrl));
  }, [photos]);

  async function submitWeight(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setAction('weight');
    setStatus('Saving weight entry...');
    try {
      const values = Object.fromEntries(new FormData(form));
      const entry = { date: values.date, weight: Number(values.weight), notes: String(values.notes || '').trim() };
      if (!entry.date || entry.weight <= 0) throw new Error('Enter a valid date and weight.');
      await addWeightLog(entry);
      form.reset();
      await refresh();
      trackEvent(events.weightEntryAdded, { source: 'device' });
      setStatus('Weight saved.');
    } catch (error) {
      setStatus(error.message || 'Could not save this weight entry.');
    } finally {
      setAction('');
    }
  }

  async function submitPR(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setAction('pr');
    setStatus('Saving personal record...');
    try {
      const values = Object.fromEntries(new FormData(form));
      const entry = {
        date: values.date,
        exercise: String(values.exercise || '').trim(),
        weight: Number(values.weight),
        reps: Number(values.reps),
        notes: String(values.notes || '').trim()
      };
      if (!entry.date || !entry.exercise || entry.weight <= 0 || entry.reps <= 0) throw new Error('Enter a valid exercise, weight, reps, and date.');
      await addPRLog(entry);
      form.reset();
      await refresh();
      setSelectedExercise(entry.exercise);
      trackEvent(events.prEntryAdded, { source: 'device', exercise: entry.exercise });
      setStatus('Personal record saved.');
    } catch (error) {
      setStatus(error.message || 'Could not save this personal record.');
    } finally {
      setAction('');
    }
  }

  async function completeWorkout() {
    const today = todayISO();
    if (workoutLogs.some((item) => item.date === today)) return;
    setAction('workout');
    setStatus('Saving workout completion...');
    try {
      const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const scheduled = plan?.weekly?.find((item) => item.day === weekday);
      const entry = {
        date: today,
        completed: true,
        title: scheduled?.split ? `${scheduled.split} completed` : 'Workout completed',
        split: scheduled?.split || 'Workout'
      };
      await addWorkoutLog(entry);
      await refresh();
      trackEvent(events.workoutSaved, { source: 'device', split: entry.split });
      setStatus('Workout logged. Nice work.');
    } catch (error) {
      setStatus(error.message || 'Could not log this workout.');
    } finally {
      setAction('');
    }
  }

  async function undoWorkout(entry) {
    setAction('workout');
    setStatus('Removing today’s workout log...');
    try {
      await deleteWorkoutLog(entry.id);
      await refresh();
      setStatus('Today’s completion was removed.');
    } catch (error) {
      setStatus(error.message || 'Could not remove this workout log.');
    } finally {
      setAction('');
    }
  }

  async function addPhoto(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setAction('photo');
    setStatus('Saving photo on this device...');
    try {
      const entry = { date: todayISO(), note: 'Progress photo' };
      await saveProgressPhoto(file, entry);
      await refresh(true);
      trackEvent(events.progressPhotoUploaded, { source: 'device' });
      setStatus('Photo saved.');
    } catch (error) {
      setStatus(error.message || 'Could not save this photo. Delete an older local photo and try again.');
    } finally {
      setAction('');
      input.value = '';
    }
  }

  async function removePhoto(photo) {
    setAction('photo');
    setStatus('Deleting photo...');
    try {
      await deleteProgressPhoto(photo);
      await refresh(true);
      setStatus('Photo deleted.');
    } catch (error) {
      setStatus(error.message || 'Could not delete this photo.');
    } finally {
      setAction('');
    }
  }

  async function removeWeight(id) {
    setAction('weight');
    try {
      await deleteWeightLog(id);
      await refresh();
      setStatus('Weight entry deleted.');
    } catch (error) {
      setStatus(error.message || 'Could not delete this weight entry.');
    } finally {
      setAction('');
    }
  }

  async function removePR(id) {
    setAction('pr');
    try {
      await deletePRLog(id);
      await refresh();
      setStatus('Personal record deleted.');
    } catch (error) {
      setStatus(error.message || 'Could not delete this personal record.');
    } finally {
      setAction('');
    }
  }

  const today = todayISO();
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysWorkout = plan?.weekly?.find((item) => item.day === weekday);
  const todayLog = workoutLogs.find((item) => item.date === today);
  const completedDates = useMemo(() => new Set(workoutLogs.map((item) => item.date)), [workoutLogs]);
  const calendarDays = useMemo(() => calendarRange(), []);
  const streak = useMemo(() => workoutStreak(workoutLogs, plan), [workoutLogs, plan]);
  const currentWeek = weekStartISO(today);
  const workoutsThisWeek = workoutLogs.filter((item) => weekStartISO(item.date) === currentWeek).length;
  const workoutChart = useMemo(() => {
    const grouped = workoutLogs.reduce((result, item) => {
      const week = weekStartISO(item.date);
      result[week] = result[week] || { week, completed: 0 };
      result[week].completed += 1;
      return result;
    }, {});
    return Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week)).slice(-8).map((item) => ({ ...item, label: parseDate(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));
  }, [workoutLogs]);
  const exerciseNames = useMemo(() => [...new Set(prLogs.map((item) => item.exercise))].sort(), [prLogs]);
  const activeExercise = exerciseNames.includes(selectedExercise) ? selectedExercise : exerciseNames[0] || '';
  const prChart = prLogs.filter((item) => item.exercise === activeExercise).map((item) => ({ date: item.date, weight: Number(item.weight) || 0, reps: Number(item.reps) || 0 }));
  const loadExerciseNames = useMemo(() => [...new Set(loadLogs.map((item) => item.exercise))].sort(), [loadLogs]);
  const activeLoadExercise = loadExerciseNames.includes(selectedLoadExercise) ? selectedLoadExercise : loadExerciseNames[0] || '';
  const loadHistory = loadLogs.filter((item) => item.exercise === activeLoadExercise);
  const loadChart = loadHistory.slice(-12).map((item) => ({ date: item.date, weight: Number(item.weight), sets: item.sets, reps: item.reps }));
  const planExerciseNames = useMemo(() => [...new Set((plan?.weekly || []).flatMap((day) => day.exercises || []).map((item) => item.name))], [plan]);
  const achievements = [
    ['First workout', workoutLogs.length > 0],
    ['3 workouts logged', workoutLogs.length >= 3],
    ['3-workout streak', streak >= 3],
    ['First weigh-in', weightLogs.length > 0],
    ['First PR', prLogs.length > 0]
  ];
  const busy = Boolean(action);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <GlassCard className="lg:col-span-2">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr] xl:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Today • {weekday}</p>
            <h2 className="mt-2 text-3xl font-black">{todaysWorkout?.split || 'Ready when you are'}</h2>
            <p className="mt-2 text-sm text-slate-400">Progress is saved in this browser on this device.</p>
            {status && <p aria-live="polite" className="mt-3 text-sm text-cyan-100">{status}</p>}
          </div>
          <div className="flex flex-wrap gap-3 xl:justify-end">
            {todayLog ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400/15 px-4 py-3 font-bold text-emerald-200"><Check size={18} />Workout complete</span>
                <button disabled={action === 'workout'} onClick={() => undoWorkout(todayLog)} className="btn-secondary disabled:opacity-60"><RotateCcw size={17} className="mr-2" />Undo</button>
              </>
            ) : (
              <button disabled={busy || todaysWorkout?.split === 'Rest'} onClick={completeWorkout} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                {action === 'workout' ? 'Saving...' : todaysWorkout?.split === 'Rest' ? 'Recovery day' : 'Complete Workout'}
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4"><Flame className="text-orange-300" size={20} /><p className="mt-2 text-3xl font-black">{streak}</p><p className="text-sm text-slate-400">scheduled-workout streak</p></div>
          <div className="rounded-2xl bg-white/5 p-4"><CalendarCheck2 className="text-cyan-300" size={20} /><p className="mt-2 text-3xl font-black">{workoutsThisWeek}</p><p className="text-sm text-slate-400">completed this week</p></div>
          <div className="rounded-2xl bg-white/5 p-4"><Trophy className="text-violet-300" size={20} /><p className="mt-2 text-3xl font-black">{prLogs.length}</p><p className="text-sm text-slate-400">personal records logged</p></div>
        </div>
      </GlassCard>

      <GlassCard className="lg:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-2xl font-bold">4-week workout calendar</h2><p className="mt-1 text-sm text-slate-400">Completed dates update as soon as you log a workout.</p></div>
          <div className="flex gap-3 text-xs text-slate-400"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Completed</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full ring-2 ring-cyan-300" />Today</span></div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
          {dayHeaders.map((day) => <div key={day} className="pb-1 text-[10px] font-bold uppercase text-slate-500">{day}</div>)}
          {calendarDays.map(({ iso, date }) => {
            const completed = completedDates.has(iso);
            const isToday = iso === today;
            return <div key={iso} aria-label={`${date.toLocaleDateString()}${completed ? ', workout completed' : ''}`} className={`rounded-xl p-2 text-sm ${completed ? 'bg-emerald-400/20 font-bold text-emerald-100' : 'bg-white/5 text-slate-400'} ${isToday ? 'ring-2 ring-cyan-300' : ''}`}><span className="hidden sm:inline">{date.toLocaleDateString('en-US', { month: 'short' })} </span>{date.getDate()}</div>;
          })}
        </div>
      </GlassCard>

      <GlassCard className="min-w-0">
        <h2 className="text-2xl font-bold">Body weight</h2>
        <form onSubmit={submitWeight} className="mt-4 grid gap-3">
          <input className="field" name="date" type="date" defaultValue={today} required />
          <input className="field" name="weight" type="number" inputMode="decimal" min="1" step="0.1" placeholder="Body weight (lb)" required />
          <input className="field" name="notes" maxLength="120" placeholder="Notes, optional" />
          <button disabled={busy} className="btn-primary disabled:opacity-60">{action === 'weight' ? 'Saving...' : 'Save Weight'}</button>
        </form>
        <div className="mt-4 h-56 min-w-0">
          {weightLogs.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={weightLogs}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis width={42} domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12 }} /><Line type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={3} dot={{ fill: '#22d3ee' }} /></LineChart></ResponsiveContainer> : <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">Add your first weigh-in to start a real trend line.</p>}
        </div>
        <div className="space-y-2">{weightLogs.slice(-3).reverse().map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-xl bg-white/5 p-3 text-sm"><span>{item.date}: <b>{item.weight} lb</b></span><button type="button" disabled={busy} onClick={() => removeWeight(item.id)} className="text-rose-200 disabled:opacity-50">Delete</button></div>)}</div>
      </GlassCard>

      <GlassCard className="min-w-0">
        <h2 className="text-2xl font-bold">Workout consistency</h2>
        <p className="mt-1 text-sm text-slate-400">Workouts are grouped by Monday-starting week.</p>
        <div className="mt-4 h-72 min-w-0">
          {workoutChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={workoutChart}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis allowDecimals={false} width={28} tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12 }} /><Bar dataKey="completed" name="Workouts" fill="#8b5cf6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl bg-white/5 p-5 text-center text-sm text-slate-300"><div><BarChart3 className="mx-auto mb-3 text-violet-300" /><p>Complete a workout to start your weekly chart.</p></div></div>}
        </div>
      </GlassCard>

      <GlassCard className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">PR tracking</h2>
          {exerciseNames.length > 0 && <select aria-label="Exercise shown in PR chart" className="field max-w-52" value={activeExercise} onChange={(event) => setSelectedExercise(event.target.value)}>{exerciseNames.map((name) => <option key={name}>{name}</option>)}</select>}
        </div>
        <form onSubmit={submitPR} className="mt-4 grid gap-3">
          <input className="field" name="exercise" list="plan-exercises" maxLength="80" placeholder="Exercise" required />
          <datalist id="plan-exercises">{planExerciseNames.map((name) => <option key={name} value={name} />)}</datalist>
          <div className="grid grid-cols-2 gap-3"><input className="field" name="weight" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="Weight" required /><input className="field" name="reps" type="number" inputMode="numeric" min="1" max="100" placeholder="Reps" required /></div>
          <input className="field" name="date" type="date" defaultValue={today} required />
          <input className="field" name="notes" maxLength="120" placeholder="Notes, optional" />
          <button disabled={busy} className="btn-primary disabled:opacity-60">{action === 'pr' ? 'Saving...' : 'Save PR'}</button>
        </form>
        <div className="mt-4 h-56 min-w-0">{prChart.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={prChart}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis width={42} domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12 }} /><Line type="monotone" dataKey="weight" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa' }} /></LineChart></ResponsiveContainer> : <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">Log a lift to track that exercise over time.</p>}</div>
        {prLogs.slice(-4).reverse().map((item) => <div key={item.id} className="mt-2 flex justify-between gap-3 rounded-xl bg-white/5 p-3 text-sm"><span>{item.exercise}: <b>{item.weight} × {item.reps}</b></span><button type="button" disabled={busy} onClick={() => removePR(item.id)} className="text-rose-200 disabled:opacity-50">Delete</button></div>)}
      </GlassCard>

      <GlassCard className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Exercise weight trends</h2>
          {loadExerciseNames.length > 0 && <select aria-label="Exercise shown in weight trend" className="field max-w-52" value={activeLoadExercise} onChange={(event) => setSelectedLoadExercise(event.target.value)}>{loadExerciseNames.map((name) => <option key={name}>{name}</option>)}</select>}
        </div>
        <p className="mt-2 text-sm text-slate-400">Use Log weight beside an exercise tutorial to save each session. Compare weights at similar reps and form.</p>
        <div className="mt-4 h-56 min-w-0">
          {loadChart.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={loadChart}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis width={42} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12 }} formatter={(value, name, props) => [`${value} lb · ${props.payload.sets} × ${props.payload.reps}`, 'Weight']} /><Line type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={3} dot={{ fill: '#22d3ee' }} /></LineChart></ResponsiveContainer> : <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">No exercise weights logged yet. Start from your workout plan or exercise search.</p>}
        </div>
        {loadHistory.length > 0 && <p className="mt-3 text-sm text-cyan-100">Latest: <b>{loadHistory.at(-1).weight} lb</b> · {loadHistory.at(-1).sets} sets × {loadHistory.at(-1).reps} reps on {loadHistory.at(-1).date}</p>}
      </GlassCard>

      <GlassCard>
        <h2 className="text-2xl font-bold">Progress photos</h2>
        <p className="mt-1 text-sm text-slate-400">Photos stay in this browser. Include them in an export from My Data to keep a backup.</p>
        <label className={`mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 p-8 text-center text-slate-300 hover:bg-white/5 ${busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <Upload className="mb-3 text-cyan-300" />
          <span>{action === 'photo' ? 'Working...' : 'Upload image, max 5 MB'}</span>
          <input disabled={busy} className="hidden" type="file" accept="image/*" onChange={addPhoto} />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {photos.length === 0 ? <p className="col-span-2 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">No progress photos yet.</p> : photos.map((photo) => <div key={photo.id || photo.imageUrl} className="overflow-hidden rounded-2xl bg-white/5">{photo.imageUrl ? <Image unoptimized src={photo.imageUrl} alt={`Progress photo from ${photo.date}`} width={320} height={200} className="h-32 w-full object-cover" /> : <div className="grid h-32 place-items-center p-3 text-center text-xs text-amber-200">Photo preview unavailable</div>}<div className="flex items-center justify-between p-2 text-xs text-slate-300"><span>{photo.date}</span><button type="button" disabled={busy} onClick={() => removePhoto(photo)} className="text-rose-200 disabled:opacity-50">Delete</button></div></div>)}
        </div>
      </GlassCard>

      <GlassCard className="lg:col-span-2">
        <h2 className="text-2xl font-bold">Achievements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{achievements.map(([name, unlocked]) => <div key={name} className={`rounded-2xl p-4 ${unlocked ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-slate-400'}`}>{unlocked ? '🏆' : '🔒'} {name}</div>)}</div>
      </GlassCard>
    </div>
  );
}
