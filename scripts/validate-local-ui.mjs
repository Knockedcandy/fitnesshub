import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { indexedDB, IDBObjectStore } from 'fake-indexeddb';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const output = path.join(root, 'scripts/.local-ui-bundle.mjs');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3000' });
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Element: dom.window.Element, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, FormData: dom.window.FormData, localStorage: dom.window.localStorage, indexedDB, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
globalThis.__testRouter = { paths: [], push(route) { this.paths.push(route); } };
const originalSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, delay, ...args) => { const timer = originalSetTimeout(fn, delay, ...args);if (delay === 60_000) timer.unref?.();return timer; };
const mocks = {
  'next/navigation': 'export const useRouter = () => globalThis.__testRouter;',
  'next/link': 'import React from "react"; export default function Link({children,...props}) { return React.createElement("a",props,children); }',
  'next/image': 'import React from "react"; export default function Image({unoptimized,priority,fill,...props}) { return React.createElement("img",props); }',
  recharts: 'import React from "react"; const Mock=({children})=>React.createElement("div",null,children); export {Mock as ResponsiveContainer,Mock as LineChart,Mock as Line,Mock as XAxis,Mock as YAxis,Mock as Tooltip,Mock as BarChart,Mock as Bar,Mock as CartesianGrid,Mock as PieChart,Mock as Pie,Mock as Cell,Mock as Legend};'
};
let app;
let cleanup;
try {
  await build({
    stdin: { contents: `export {default as StorageProvider} from './src/local/StorageProvider.jsx'; export {default as WorkoutGenerator} from './src/components/WorkoutGenerator.jsx'; export {default as Results} from './src/app/results/page.jsx'; export {default as ExerciseCard} from './src/components/ExerciseCard.jsx'; export {default as Nutrition} from './src/components/NutritionCalculator.jsx'; export {default as Progress} from './src/components/ProgressTracker.jsx'; export {default as MyData} from './src/components/DataManagement.jsx'; export * from './src/local/database.js';`, resolveDir: root, loader: 'jsx' },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output, packages: 'external',
    plugins: [{ name: 'local-ui-test', setup(builder) {
      builder.onResolve({ filter: /^(next\/(navigation|image|link)|recharts)$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: root }));
      builder.onResolve({ filter: /^@\// }, (args) => {
        const base = path.join(root, 'src', args.path.slice(2));
        return { path: ['', '.js', '.jsx', '.json'].map((suffix) => base + suffix).find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) };
      });
    } }]
  });
  app = await import(pathToFileURL(output));
  const React = await import('react');
  const testing = await import('@testing-library/react');
  const { render, screen, fireEvent, waitFor } = testing;cleanup = testing.cleanup;
  const mount = (Component) => render(React.createElement(app.StorageProvider, null, React.createElement(Component)));
  const enabled = (name) => waitFor(() => assert.equal(screen.getByRole('button', { name, exact: true }).disabled, false));
  mount(app.WorkoutGenerator);await enabled('Generate My Plan');
  fireEvent.change(screen.getByLabelText(/^Training days per week/), { target: { value: '4' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Generate My Plan' }).closest('form'));
  await waitFor(() => assert.deepEqual(globalThis.__testRouter.paths, ['/results']));
  const saved = await app.loadPlannerData();assert.equal(saved.profile.days, 4);assert.deepEqual(saved.plan.weekly[0].exercises, saved.plan.weekly[3].exercises);

  // A failed write must keep the saved plan/profile and must not navigate.
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function(value, key) { if (key === 'fitnessPlannerPlan') throw new Error('Simulated storage full');return originalPut.call(this, value, key); };
  fireEvent.change(screen.getByLabelText(/^Training days per week/), { target: { value: '6' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Generate My Plan' }).closest('form'));
  await screen.findByText('Simulated storage full');IDBObjectStore.prototype.put = originalPut;
  assert.equal((await app.loadPlannerData()).profile.days, 4);assert.equal(globalThis.__testRouter.paths.length, 1);
  cleanup();app.closeDatabase();
  mount(app.Results);await screen.findByRole('button', { name: 'Show next workout' });
  assert.ok(screen.getAllByText(/Upper A/).length);
  assert.ok(screen.getAllByRole('button', { name: /^Log weight for / }).length, 'Workout plan exercises must expose weight logging.');cleanup();

  const exercise = { name: 'Goblet Squat', muscle: 'Legs', equipment: 'Dumbbell', difficulty: 'Beginner', description: 'Squat with a dumbbell.', alternatives: [] };
  mount(() => React.createElement(app.ExerciseCard, { exercise }));await enabled('Log weight for Goblet Squat');
  fireEvent.click(screen.getByRole('button', { name: 'Log weight for Goblet Squat' }));
  fireEvent.change(screen.getByLabelText('Weight used (lb)'), { target: { value: '25' } });
  fireEvent.change(screen.getByLabelText('Sets', { exact: true }), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Reps per set'), { target: { value: '10' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Save exercise weight' }).closest('form'));
  await screen.findByText('Exercise weight saved.');
  assert.equal((await app.getExerciseLoads('Goblet Squat'))[0].weight, 25);
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  await screen.findByText(/Last: 25 lb/);
  cleanup();app.closeDatabase();
  mount(() => React.createElement(app.ExerciseCard, { exercise }));await screen.findByText(/Last: 25 lb/);cleanup();

  mount(app.Nutrition);await enabled('Add Food');
  fireEvent.change(screen.getByPlaceholderText('Meal / food name'), { target: { value: 'Rice' } });
  fireEvent.change(screen.getByPlaceholderText('Calories'), { target: { value: '250' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add Food' }).closest('form'));
  await screen.findByText('Food saved.');assert.equal((await app.getNutritionLogs()).length, 1);cleanup();
  mount(app.Nutrition);await screen.findByText('Rice');fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
  await screen.findByText('Food deleted.');assert.equal((await app.getNutritionLogs()).length, 0);cleanup();

  mount(app.Progress);await enabled('Save Weight');
  fireEvent.change(screen.getByPlaceholderText('Body weight (lb)'), { target: { value: '181' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Save Weight' }).closest('form'));await screen.findByText('Weight saved.');
  assert.equal((await app.getWeightLogs()).length, 1);
  fireEvent.change(screen.getByPlaceholderText('Exercise', { exact: true }), { target: { value: 'Squat' } });
  fireEvent.change(screen.getByPlaceholderText('Weight', { exact: true }), { target: { value: '100' } });
  fireEvent.change(screen.getByPlaceholderText('Reps'), { target: { value: '5' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Save PR' }).closest('form'));await screen.findByText('Personal record saved.');
  assert.equal((await app.getPRLogs()).length, 1);
  const photo = new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'progress.png', { type: 'image/png' });
  fireEvent.change(document.querySelector('input[type=file]'), { target: { files: [photo] } });
  await screen.findByText('Photo saved.');assert.equal((await app.getPhotoLogs()).length, 1);cleanup();app.closeDatabase();
  mount(app.Progress);await screen.findByAltText(/Progress photo from/);assert.ok(screen.getAllByText(/181 lb/).length);cleanup();
  mount(app.Progress);await screen.findByText('Exercise weight trends');
  await waitFor(() => assert.ok([...document.querySelectorAll('p')].some((item) => item.textContent.includes('Latest: 25 lb'))));
  cleanup();

  let downloadUrl;
  dom.window.HTMLAnchorElement.prototype.click = function() { downloadUrl = this.href; };
  mount(app.MyData);await enabled('Download Backup');fireEvent.click(screen.getByRole('button', { name: 'Download Backup' }));
  await screen.findByText(/Backup download started/);
  const backup = await (await fetch(downloadUrl)).json();assert.equal(backup.photos.length, 1);assert.equal(backup.values.progressPRLogs.length, 1);assert.equal(backup.values.progressExerciseLoads.length, 1);URL.revokeObjectURL(downloadUrl);
  assert.equal(screen.getByRole('button', { name: 'Delete Local Data' }).disabled, true);
  fireEvent.change(screen.getByLabelText('Choose backup file'), { target: { files: [new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })] } });
  await screen.findByText(/Type RESTORE/);assert.equal(screen.getByRole('button', { name: 'Restore Backup' }).disabled, true);
  fireEvent.change(screen.getByLabelText('Type RESTORE to replace local data'), { target: { value: 'RESTORE' } });
  assert.equal(screen.getByRole('button', { name: 'Restore Backup' }).disabled, false);
  console.log('Validated component interactions with jsdom and IndexedDB: plan generation/reopen, failed-save rollback, exercise weight logging and trend, results, food add/reload/delete, body weight/PR saves, photo reload, backup download and restore/delete confirmations.');
} finally {
  cleanup?.();app?.closeDatabase();globalThis.setTimeout = originalSetTimeout;
  fs.rmSync(output, { force: true });dom.window.close();delete globalThis.__testRouter;
}
