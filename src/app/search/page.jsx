'use client';

import { useMemo, useState } from 'react';
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ExerciseCard from '@/components/ExerciseCard';
import { exerciseCatalog } from '@/data/exerciseCatalog';
import { searchExercises } from '@/utils/exerciseSearch';

const filters = ['Chest', 'Back', 'Legs', 'Core', 'Dumbbells', 'Bodyweight', 'Resistance Band', 'Beginner', 'Push', 'Pull'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const results = useMemo(() => searchExercises(exerciseCatalog, query, filter), [query, filter]);

  function clear() {
    setQuery('');
    setFilter('');
    setVisibleCount(24);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <PageHeader eyebrow="Smart exercise search" title="Find exercises, tutorials, and swaps" description={`Explore ${exerciseCatalog.length} movements by muscle, equipment, difficulty, or goal. New catalog artwork is being added in batches; every entry has written steps.`} />
      <div className="glass mb-6 p-4 md:p-5">
        <label className="relative block">
          <span className="sr-only">Search exercises</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input type="search" className="field py-4 pl-12 pr-12" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }} placeholder="Try “beginner dumbbell chest” or “legs at home”" />
          {query && <button type="button" aria-label="Clear search text" onClick={() => { setQuery(''); setVisibleCount(24); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>}
        </label>
        <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-slate-500"><SlidersHorizontal size={14} />Quick filters</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((item) => <button type="button" aria-pressed={filter === item} key={item} onClick={() => { setFilter((current) => current === item ? '' : item); setVisibleCount(24); }} className={`rounded-full px-3 py-2 text-sm transition ${filter === item ? 'bg-cyan-300 font-bold text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}>{item}</button>)}
          {(query || filter) && <button type="button" onClick={clear} className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">Clear all</button>}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400"><b className="text-white">{results.length}</b> {results.length === 1 ? 'exercise' : 'exercises'} found{filter ? ` for ${filter}` : ''}</p>
        {results.length > visibleCount && <p className="text-xs text-slate-500">Showing the first {visibleCount}</p>}
      </div>

      {results.length ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{results.slice(0, visibleCount).map((exercise) => <ExerciseCard key={exercise.name} exercise={exercise} />)}</div>
          {visibleCount < results.length && <div className="mt-8 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + 24)} className="btn-secondary">Show More Exercises</button></div>}
        </>
      ) : (
        <div className="glass p-10 text-center">
          <SearchX className="mx-auto text-slate-500" size={42} />
          <h2 className="mt-4 text-2xl font-bold">No exact matches yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-300">Try a broader muscle or equipment term, or clear the active filter.</p>
          <button type="button" onClick={clear} className="btn-primary mt-6">Clear Search</button>
        </div>
      )}
    </div>
  );
}
