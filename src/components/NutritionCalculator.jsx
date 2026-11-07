'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Apple, Droplets, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import GlassCard from './GlassCard';
import { calculateNutrition } from '@/utils/calorieCalculator';
import { useStorageState } from '@/local/StorageProvider';
import { addNutritionLog, deleteNutritionLog, getNutritionLogs, loadPlannerData } from '@/local/database';
import { events, trackEvent } from '@/utils/analytics';
import { todayISO } from '@/utils/localStore';

const emptyTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
const macroColors = ['#22d3ee', '#8b5cf6', '#f59e0b'];
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

async function readNutritionData(date) {
  const [logs, planner] = await Promise.all([getNutritionLogs(date), loadPlannerData()]);
  return { logs, profile: planner.profile || {}, warning: '' };
}

function progressPercent(current, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function NutritionCalculator() {
  const { loading: storageLoading } = useStorageState();
  const [profile, setProfile] = useState({});
  const [date, setDate] = useState(todayISO());
  const [food, setFood] = useState([]);
  const [action, setAction] = useState('load');
  const [status, setStatus] = useState('');
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const targets = calculateNutrition(profile);

  async function refresh() {
    const data = await readNutritionData(date);
    setProfile(data.profile);
    setFood(data.logs);
    if (data.warning) setStatus(data.warning);
  }

  useEffect(() => {
    if (storageLoading) return undefined;
    let active = true;

    async function hydrate() {
      try {
        const data = await readNutritionData(date);
        if (active) {
          setProfile(data.profile);
          setFood(data.logs);
          setStatus(data.warning);
          setAction('');
        }
      } catch (error) { if (active) { setStatus(error.message); setAction(''); } }
    }

    void hydrate();
    return () => { active = false; };
  }, [storageLoading, date]);

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setAction('add');
    setStatus('Saving food log...');
    try {
      const values = Object.fromEntries(new FormData(form));
      const entry = {
        meal: String(values.meal || '').trim(),
        serving: String(values.serving || '').trim(),
        date,
        calories: Number(values.calories) || 0,
        protein: Number(values.protein) || 0,
        carbs: Number(values.carbs) || 0,
        fats: Number(values.fats) || 0
      };
      if (!entry.meal) throw new Error('Enter a food or meal name.');
      if ([entry.calories, entry.protein, entry.carbs, entry.fats].some((value) => value < 0)) throw new Error('Nutrition values cannot be negative.');
      if (entry.calories === 0 && entry.protein === 0 && entry.carbs === 0 && entry.fats === 0) throw new Error('Enter at least one nutrition value.');

      await addNutritionLog(entry);
      form.reset();
      await refresh();
      trackEvent(events.foodLogAdded, { date, source: 'device' });
      setStatus('Food saved.');
    } catch (error) {
      setStatus(error.message || 'Could not save this food.');
    } finally {
      setAction('');
    }
  }

  async function remove(id) {
    setAction(`delete-${id}`);
    setStatus('Deleting food log...');
    try {
      await deleteNutritionLog(id);
      await refresh();
      setStatus('Food deleted.');
    } catch (error) {
      setStatus(error.message || 'Could not delete this food.');
    } finally {
      setAction('');
    }
  }

  const totals = useMemo(() => food.reduce((result, item) => ({
    calories: result.calories + (Number(item.calories) || 0),
    protein: result.protein + (Number(item.protein) || 0),
    carbs: result.carbs + (Number(item.carbs) || 0),
    fats: result.fats + (Number(item.fats) || 0)
  }), emptyTotals), [food]);
  const macroData = [
    { name: 'Protein', value: targets.protein * 4 },
    { name: 'Carbs', value: targets.carbs * 4 },
    { name: 'Fats', value: targets.fats * 9 }
  ];
  const progress = [
    ['Calories', totals.calories, targets.calories, 'cal'],
    ['Protein', totals.protein, targets.protein, 'g'],
    ['Carbs', totals.carbs, targets.carbs, 'g'],
    ['Fats', totals.fats, targets.fats, 'g']
  ];
  const targetCards = [
    ['Calories', targets.calories, 'cal'],
    ['Protein', targets.protein, 'g'],
    ['Carbs', targets.carbs, 'g'],
    ['Fats', targets.fats, 'g']
  ];
  const busy = Boolean(action);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <GlassCard className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-2xl font-bold">Daily targets</h2><p className="mt-1 text-sm text-slate-400">Calculated from your planner profile on this device.</p></div>
          <Apple className="text-cyan-300" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">{targetCards.map(([label, value, unit]) => <div key={label} className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}<span className="ml-1 text-sm font-medium text-slate-500">{unit}</span></p></div>)}</div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/5 p-4"><div><p className="text-sm text-slate-400">Estimated maintenance</p><p className="text-xl font-bold">{targets.maintenance} cal</p></div><div className="text-right"><Droplets className="ml-auto text-cyan-300" size={20} /><p className="mt-1 text-sm text-slate-300">About {targets.water} oz water</p></div></div>
        <div className="mt-5 h-72 min-w-0">{isClient ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={macroData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={3}>{macroData.map((item, index) => <Cell key={item.name} fill={macroColors[index]} />)}</Pie><Tooltip formatter={(value) => `${Math.round(value)} cal`} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12 }} /><Legend /></PieChart></ResponsiveContainer> : <div className="h-full animate-pulse rounded-2xl bg-white/5" />}</div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Food log</h2><p className="mt-1 text-sm text-slate-400">{food.length} {food.length === 1 ? 'entry' : 'entries'} for this date</p></div><input aria-label="Food log date" className="field max-w-48" type="date" value={date} onChange={(event) => { setAction('load'); setDate(event.target.value); }} /></div>
        <form onSubmit={add} className="mt-4 grid gap-3">
          <input name="meal" className="field" maxLength="100" placeholder="Meal / food name" required />
          <input name="serving" className="field" maxLength="80" placeholder="Serving size, optional" />
          <div className="grid grid-cols-2 gap-3"><input name="calories" className="field" placeholder="Calories" type="number" min="0" step="1" /><input name="protein" className="field" placeholder="Protein (g)" type="number" min="0" step="0.1" /><input name="carbs" className="field" placeholder="Carbs (g)" type="number" min="0" step="0.1" /><input name="fats" className="field" placeholder="Fats (g)" type="number" min="0" step="0.1" /></div>
          <button disabled={busy} className="btn-primary disabled:opacity-60">{action === 'add' ? 'Saving...' : 'Add Food'}</button>
        </form>
        {status && <p aria-live="polite" className="mt-3 text-sm text-cyan-200">{status}</p>}
        <div className="mt-6 space-y-2">{action === 'load' ? <p className="animate-pulse rounded-2xl bg-white/5 p-4 text-sm text-slate-300">Loading this day...</p> : food.length === 0 ? <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">No food logged for this date yet.</p> : food.map((item) => <div key={item.id || `${item.meal}-${item.createdAt}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3"><div><b>{item.meal}</b>{item.serving && <p className="text-xs text-slate-500">{item.serving}</p>}<p className="text-xs text-slate-400">{item.calories} cal • P {item.protein}g • C {item.carbs}g • F {item.fats}g</p></div><button type="button" disabled={busy} onClick={() => remove(item.id)} className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-100 disabled:opacity-50">{action === `delete-${item.id}` ? 'Deleting...' : 'Delete'}</button></div>)}</div>
      </GlassCard>

      <GlassCard className="lg:col-span-2">
        <h2 className="text-2xl font-bold">Daily progress</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">{progress.map(([label, current, target, unit]) => { const percent = progressPercent(current, target); return <div key={label}><div className="flex items-end justify-between gap-3"><p className="font-bold">{label}</p><p className="text-sm text-slate-400">{Math.round(current)} / {target} {unit}</p></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width]" style={{ width: `${percent}%` }} /></div><p className="mt-1 text-right text-xs text-slate-500">{percent}%</p></div>; })}</div>
      </GlassCard>

      <GlassCard className="lg:col-span-2">
        <div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-cyan-300" size={20} /><div><h2 className="text-xl font-bold">Use targets as a starting point</h2><p className="mt-2 text-sm leading-6 text-slate-300">These are estimates, not medical advice. Track a few consistent weeks and adjust gradually based on energy, training, and progress. A registered dietitian can personalize nutrition for medical conditions, pregnancy, or eating-disorder concerns.</p></div></div>
      </GlassCard>
    </div>
  );
}
