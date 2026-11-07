import assert from 'node:assert/strict';
import fs from 'node:fs';
import { indexedDB } from 'fake-indexeddb';
globalThis.indexedDB = indexedDB;
const legacy = new Map();
globalThis.localStorage = { getItem: (key) => legacy.get(key) ?? null, setItem: (key, value) => legacy.set(key, value), removeItem: (key) => legacy.delete(key) };
const source = fs.readFileSync(new URL('../src/local/database.js', import.meta.url), 'utf8');
const db = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
legacy.set('fitnessPlannerProfile', JSON.stringify({ days: 4 }));
legacy.set('progressWeightLogs', JSON.stringify([{ id: 'legacy', date: '2026-11-01', weight: 180 }]));
assert.deepEqual(await db.initializeStorage(), []);
assert.equal((await db.loadPlannerData()).profile.days, 4);
assert.equal((await db.getWeightLogs()).length, 1);assert.ok(legacy.has('fitnessPlannerProfile'));
const plan = { generatorVersion: 8, splitName: 'test', weekly: Array.from({ length: 7 }, (_, i) => ({ day: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i], split: 'Rest', exercises: [] })) };
await db.savePlannerData({ profile: { days: 6 }, plan, nutrition: { calories: 2100 } });
db.closeDatabase();await db.initializeStorage();
assert.equal((await db.loadPlannerData()).profile.days, 6, 'Legacy data must not overwrite newer records.');
assert.deepEqual((await db.loadPlannerData()).plan, plan, 'Plan must survive closing and reopening IndexedDB.');
await Promise.all(Array.from({ length: 30 }, (_, i) => db.addWeightLog({ date: '2026-11-02', weight: 181 + i })));
assert.equal((await db.getWeightLogs()).length, 31, 'Concurrent writes must not lose logs.');
await db.deleteWeightLog((await db.getWeightLogs())[0].id);assert.equal((await db.getWeightLogs()).length, 30);
const food = await db.addNutritionLog({ meal: 'Rice', date: '2026-11-02', calories: 250, protein: 4, carbs: 50, fats: 1 });
assert.equal((await db.getNutritionLogs('2026-11-02')).length, 1);assert.equal((await db.getNutritionLogs('2026-11-03')).length, 0);
await db.deleteNutritionLog(food.id);assert.equal((await db.getNutritionLogs()).length, 0);
const pr = await db.addPRLog({ exercise: 'Squat', date: '2026-11-02', weight: 100, reps: 5 });
const workout = await db.addWorkoutLog({ date: '2026-11-02', completed: true });
assert.equal((await db.getPRLogs()).length, 1);assert.equal((await db.getWorkoutLogs()).length, 1);
const bytes = Uint8Array.from([137,80,78,71,13,10,26,10]);
await db.saveProgressPhoto(new Blob([bytes], { type: 'image/png' }), { date: '2026-11-02', note: 'test' });
const photo = (await db.getPhotoLogs())[0];
async function checkPhoto() { const url = await db.loadProgressPhoto(photo.storagePath);assert.deepEqual(new Uint8Array(await (await fetch(url)).arrayBuffer()), bytes);URL.revokeObjectURL(url); }
await checkPhoto();
await assert.rejects(db.saveProgressPhoto(new Blob(['bad'], { type: 'text/plain' }), {}), /JPEG/);
await assert.rejects(db.saveProgressPhoto(new Blob([new Uint8Array(5*1024*1024+1)], { type: 'image/png' }), {}), /5 MB/);
const backup = JSON.parse(JSON.stringify(await db.exportBackup()));assert.equal(backup.photos.length, 1);
await db.clearLocalData();assert.equal((await db.getPhotoLogs()).length, 0);assert.equal((await db.loadPlannerData()).plan, null);
assert.equal(legacy.size, 0);await db.initializeStorage();assert.equal((await db.getWeightLogs()).length, 0, 'Deletion must not resurrect migrated data.');
await db.importBackup(backup);db.closeDatabase();
assert.equal((await db.loadPlannerData()).profile.days, 6);assert.equal((await db.getWeightLogs()).length, 30);await checkPhoto();
const before = await db.exportBackup();
for (const broken of [
  { ...backup, version: 999 }, { ...backup, values: { ...backup.values, unknown: true } },
  { ...backup, values: { ...backup.values, progressWeightLogs: 'not a log' } }, { ...backup, photos: [] },
  { ...backup, photos: [{ ...backup.photos[0], data: '%%%' }] },
  { ...backup, values: { ...backup.values, fitnessPlannerPlan: { weekly: [] } } },
  { ...backup, values: { ...backup.values, fitnessPlannerProfile: { unsupported: () => {} } } }
]) {
  await assert.rejects(db.importBackup(broken));const after = await db.exportBackup();
  assert.deepEqual(after.values, before.values);assert.deepEqual(after.photos, before.photos);
}
await db.deleteProgressPhoto(photo);await assert.rejects(db.loadProgressPhoto(photo.storagePath));assert.equal((await db.getPhotoLogs()).length, 0);
await db.deletePRLog(pr.id);await db.deleteWorkoutLog(workout.id);assert.equal((await db.getPRLogs()).length, 0);assert.equal((await db.getWorkoutLogs()).length, 0);
db.closeDatabase();delete globalThis.indexedDB;await assert.rejects(db.initializeStorage(), /unavailable/);
globalThis.indexedDB = indexedDB;await db.initializeStorage();assert.equal((await db.loadPlannerData()).profile.days, 6, 'Failed storage open must be retryable.');
db.closeDatabase();delete globalThis.localStorage;
console.log('Validated IndexedDB migration, reopen persistence, concurrent logs, photos, backup round trips, invalid/aborted restore rollback, deletion, and unavailable-storage recovery.');
