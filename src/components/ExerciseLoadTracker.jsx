'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dumbbell } from 'lucide-react';
import { addExerciseLoad, deleteExerciseLoad, getExerciseLoads } from '@/local/database';
import { useStorageState } from '@/local/StorageProvider';
import { todayISO } from '@/utils/localStore';

function describeLoad(entry) {
  return `${entry.weight === 0 ? '0 lb added' : `${entry.weight} lb`} · ${entry.sets} × ${entry.reps}`;
}

function LoadModal({ exercise, entries, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const weightRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const latest = entries.at(-1);
  const previous = entries.at(-2);
  const difference = latest && previous ? Number((latest.weight - previous.weight).toFixed(1)) : null;

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
        const controls = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (first && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    weightRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setStatus('');
    try {
      await addExerciseLoad({
        exercise: exercise.name,
        date: String(values.date),
        weight: Number(values.weight),
        sets: Number(values.sets),
        reps: Number(values.reps),
        notes: String(values.notes || '').trim()
      });
      form.reset();
      setStatus('Exercise weight saved.');
      weightRef.current?.focus();
    } catch (error) {
      setStatus(error.message || 'Could not save this exercise weight.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true);
    setStatus('');
    try {
      await deleteExerciseLoad(id);
      setStatus('Entry deleted.');
    } catch (error) {
      setStatus(error.message || 'Could not delete this entry.');
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onMouseDown={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.15em] text-cyan-300">Progressive overload log</p>
            <h2 id={titleId} className="mt-1 text-2xl font-black sm:text-3xl">{exercise.name}</h2>
          </div>
          <button type="button" className="btn-secondary shrink-0" onClick={onClose}>Close</button>
        </div>
        <p className="mt-4 text-sm text-slate-300">Record the weight you used and the sets and reps you completed. Use 0 lb for no added weight. For dumbbells, record the weight per hand consistently.</p>
        {latest && <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Latest session · {latest.date}</p>
          <p className="mt-1 text-xl font-bold">{describeLoad(latest)}</p>
          {difference !== null && <p className="mt-1 text-sm text-slate-300">Weight change from previous entry: {difference > 0 ? '+' : ''}{difference} lb. Compare sessions with similar reps and form.</p>}
        </div>}
        <form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="sm:col-span-3"><span className="label">Date</span><input className="field mt-1" name="date" type="date" defaultValue={todayISO()} max={todayISO()} required /></label>
          <label><span className="label">Weight used (lb)</span><input ref={weightRef} className="field mt-1" name="weight" type="number" inputMode="decimal" min="0" max="2000" step="0.1" placeholder="0" required /></label>
          <label><span className="label">Sets</span><input className="field mt-1" name="sets" type="number" inputMode="numeric" min="1" max="20" step="1" placeholder="3" required /></label>
          <label><span className="label">Reps per set</span><input className="field mt-1" name="reps" type="number" inputMode="numeric" min="1" max="100" step="1" placeholder="10" required /></label>
          <label className="sm:col-span-3"><span className="label">Notes, optional</span><input className="field mt-1" name="notes" maxLength="120" placeholder="Form, tempo, or how it felt" /></label>
          <button type="submit" disabled={busy} className="btn-primary sm:col-span-3 disabled:opacity-50">{busy ? 'Saving...' : 'Save exercise weight'}</button>
        </form>
        {status && <p role="status" className="mt-3 text-sm text-cyan-100">{status}</p>}
        <div className="mt-6">
          <h3 className="text-lg font-bold">Recent sessions</h3>
          {entries.length ? <ul className="mt-3 space-y-2">
            {entries.slice(-8).reverse().map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-3 text-sm">
              <div><span className="font-semibold text-white">{entry.date}</span><span className="ml-2 text-slate-200">{describeLoad(entry)}</span>{entry.notes && <p className="mt-1 text-slate-400">{entry.notes}</p>}</div>
              <button type="button" disabled={busy} aria-label={`Delete exercise weight entry from ${entry.date}`} onClick={() => remove(entry.id)} className="text-rose-200 hover:underline disabled:opacity-50">Delete</button>
            </li>)}
          </ul> : <p className="mt-3 rounded-xl bg-white/5 p-4 text-sm text-slate-300">No sessions logged yet. Save your first one to start a history.</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ExerciseLoadTracker({ exercise }) {
  const { loading, error: storageError } = useStorageState();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loadedFor, setLoadedFor] = useState('');
  const [error, setError] = useState('');
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (loading || storageError) return undefined;
    let active = true;
    const refresh = () => {
      getExerciseLoads(exercise.name).then((logs) => {
        if (active) { setEntries(logs); setLoadedFor(exercise.name); setError(''); }
      }, (cause) => { if (active) setError(cause.message || 'Could not load exercise weights.'); });
    };
    refresh();
    window.addEventListener('fitlifehub:exercise-loads-changed', refresh);
    return () => { active = false; window.removeEventListener('fitlifehub:exercise-loads-changed', refresh); };
  }, [exercise.name, loading, storageError]);

  const currentEntries = loadedFor === exercise.name ? entries : [];
  const latest = currentEntries.at(-1);
  return <>
    <button type="button" disabled={loading || Boolean(storageError) || loadedFor !== exercise.name} onClick={() => setOpen(true)} aria-label={`Log weight for ${exercise.name}`} className="rounded-xl bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-50"><Dumbbell size={15} className="mr-1 inline" />Log weight</button>
    {latest && <span className="self-center text-xs text-slate-300">Last: {describeLoad(latest)}</span>}
    {error && <span role="alert" className="text-xs text-amber-200">{error}</span>}
    {open && <LoadModal exercise={exercise} entries={currentEntries} onClose={close} />}
  </>;
}
