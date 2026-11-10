const DATABASE = 'fitlifehub-local';
const VERSION = 1;
export const DATA_KEYS = ['fitnessPlannerProfile', 'fitnessPlannerPlan', 'fitnessPlannerNutrition', 'fitnessNutritionLogs', 'progressWeightLogs', 'progressPRLogs', 'progressExerciseLoads', 'progressWorkoutLogs', 'progressPhotoLogs'];
const LIST_KEYS = DATA_KEYS.slice(3);
let opening;

export function closeDatabase() {
  const pending = opening;
  opening = undefined;
  if (pending) void pending.then((db) => db.close(), () => {});
}

async function database() {
  if (typeof indexedDB === 'undefined') throw new Error('Browser storage is unavailable. Open this site in a browser that supports IndexedDB.');
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('values')) db.createObjectStore('values');
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
      };
      request.onerror = () => reject(new Error('Could not open local storage. Check your browser storage permissions.'));
      request.onblocked = () => reject(new Error('Close other FitLifeHub tabs, then retry opening storage.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = undefined; };
        resolve(db);
      };
    }).catch((error) => { opening = undefined; throw error; });
  }
  return opening;
}

// Resolve on transaction completion, never merely on a request's success.
async function transaction(stores, mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error || new Error('The change could not be saved. Browser storage may be full.'));
    tx.onerror = () => {}; // onabort reports transaction failure once.
    try { action(tx, (value) => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  });
}

export async function initializeStorage() {
  const legacy = {};
  const warnings = [];
  for (const key of DATA_KEYS) {
    try {
      const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
      if (raw) {
        try {
          const value = JSON.parse(raw);
          if (LIST_KEYS.includes(key) ? !Array.isArray(value) : (value !== null && (typeof value !== 'object' || Array.isArray(value)))) throw new Error('Unexpected legacy data format');
          legacy[key] = value;
        }
        catch { warnings.push(`Could not migrate ${key}; its original browser copy was left untouched.`); }
      }
    } catch { /* IndexedDB can still work when legacy storage is unavailable. */ }
  }
  await transaction(['values'], 'readwrite', (tx) => {
    const store = tx.objectStore('values');
    const marker = store.get('_legacyMigrated');
    marker.onsuccess = () => {
      if (marker.result) return;
      for (const [key, value] of Object.entries(legacy)) {
        const existing = store.get(key);
        existing.onsuccess = () => { if (existing.result === undefined) store.put(value, key); };
      }
      store.put(true, '_legacyMigrated');
    };
  });
  return warnings;
}

export const readValue = (key, fallback = null) => transaction(['values'], 'readonly', (tx, set) => {
  const request = tx.objectStore('values').get(key);
  request.onsuccess = () => set(request.result ?? fallback);
});

export const savePlannerData = ({ profile, plan, nutrition }) => transaction(['values'], 'readwrite', (tx) => {
  const store = tx.objectStore('values');
  store.put(profile, 'fitnessPlannerProfile');
  store.put(plan, 'fitnessPlannerPlan');
  store.put(nutrition, 'fitnessPlannerNutrition');
});

export async function loadPlannerData() {
  return transaction(['values'], 'readonly', (tx, set) => {
    const store = tx.objectStore('values');const data = {};
    for (const [field, key] of [['profile','fitnessPlannerProfile'], ['plan','fitnessPlannerPlan'], ['nutrition','fitnessPlannerNutrition']]) {
      const request = store.get(key);request.onsuccess = () => { data[field] = request.result ?? null; };
    }
    set(data);
  });
}
export const saveWorkoutPlan = (plan) => transaction(['values'], 'readwrite', (tx) => tx.objectStore('values').put(plan, 'fitnessPlannerPlan'));

const add = (key, data) => transaction(['values'], 'readwrite', (tx, set) => {
  const store = tx.objectStore('values');const request = store.get(key);
  const entry = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  request.onsuccess = () => store.put([...(request.result || []), entry], key);
  set(entry);
});
const remove = (key, id) => transaction(['values'], 'readwrite', (tx) => {
  const store = tx.objectStore('values');const request = store.get(key);
  request.onsuccess = () => store.put((request.result || []).filter((row) => row.id !== id), key);
});
const list = async (key) => (await readValue(key, [])).sort((a, b) => String(a.date).localeCompare(String(b.date)));
export const addNutritionLog = (data) => add('fitnessNutritionLogs', data);
export const getNutritionLogs = async (date) => (await list('fitnessNutritionLogs')).filter((row) => !date || row.date === date);
export const deleteNutritionLog = (id) => remove('fitnessNutritionLogs', id);
export const addWeightLog = (data) => add('progressWeightLogs', data);
export const getWeightLogs = () => list('progressWeightLogs');
export const deleteWeightLog = (id) => remove('progressWeightLogs', id);
export const addPRLog = (data) => add('progressPRLogs', data);
export const getPRLogs = () => list('progressPRLogs');
export const deletePRLog = (id) => remove('progressPRLogs', id);
const notifyExerciseLoadsChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new window.Event('fitlifehub:exercise-loads-changed'));
};
function validExerciseLoad(row) {
  const date = String(row?.date || '');
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return typeof row?.exercise === 'string' && row.exercise.trim().length > 0 && row.exercise.length <= 120
    && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    && Number.isFinite(row.weight) && row.weight >= 0 && row.weight <= 2000
    && Number.isInteger(row.sets) && row.sets >= 1 && row.sets <= 20
    && Number.isInteger(row.reps) && row.reps >= 1 && row.reps <= 100
    && (row.notes === undefined || (typeof row.notes === 'string' && row.notes.length <= 120));
}
export async function addExerciseLoad(data) {
  const entry = { ...data, exercise: String(data?.exercise || '').trim(), notes: String(data?.notes || '').trim() };
  if (!validExerciseLoad(entry)) throw new Error('Enter a valid date, weight, sets, and reps.');
  const saved = await add('progressExerciseLoads', entry);
  notifyExerciseLoadsChanged();
  return saved;
}
export async function getExerciseLoads(exerciseName) {
  const entries = await list('progressExerciseLoads');
  const name = String(exerciseName || '').trim().toLocaleLowerCase();
  return name ? entries.filter((row) => String(row.exercise).toLocaleLowerCase() === name) : entries;
}
export async function deleteExerciseLoad(id) {
  await remove('progressExerciseLoads', id);
  notifyExerciseLoadsChanged();
}
export const addWorkoutLog = (data) => add('progressWorkoutLogs', data);
export const getWorkoutLogs = () => list('progressWorkoutLogs');
export const deleteWorkoutLog = (id) => remove('progressWorkoutLogs', id);
export const getPhotoLogs = async () => (await list('progressPhotoLogs')).reverse();

const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
export async function saveProgressPhoto(file, details) {
  if (!IMAGE_TYPES.includes(file?.type)) throw new Error('Choose a JPEG, PNG, WebP, GIF, or AVIF image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Progress photos must be 5 MB or smaller.');
  const id = crypto.randomUUID();
  return transaction(['values','photos'], 'readwrite', (tx) => {
    tx.objectStore('photos').put(file, id);
    const store = tx.objectStore('values');const request = store.get('progressPhotoLogs');
    request.onsuccess = () => store.put([...(request.result || []), { ...details, id, storagePath: id, createdAt: new Date().toISOString() }], 'progressPhotoLogs');
  });
}
export async function loadProgressPhoto(id) {
  const blob = await transaction(['photos'], 'readonly', (tx, set) => {
    const request = tx.objectStore('photos').get(id);request.onsuccess = () => set(request.result);
  });
  if (!(blob instanceof Blob)) throw new Error('This photo could not be found on this device.');
  return URL.createObjectURL(blob);
}
export const deleteProgressPhoto = (photo) => transaction(['values','photos'], 'readwrite', (tx) => {
  if (photo.storagePath) tx.objectStore('photos').delete(photo.storagePath);
  const store = tx.objectStore('values');const request = store.get('progressPhotoLogs');
  request.onsuccess = () => store.put((request.result || []).filter((row) => row.id !== photo.id), 'progressPhotoLogs');
});

export const clearLocalData = async () => {
  await transaction(['values','photos'], 'readwrite', (tx) => {
    tx.objectStore('values').clear();tx.objectStore('photos').clear();
    tx.objectStore('values').put(true, '_legacyMigrated');
  });
  for (const key of [...DATA_KEYS,'fitnessPlannerSyncNotice','fitnessPlannerAnalytics']) {
    try { localStorage.removeItem(key); } catch { /* The migration marker prevents reimport. */ }
  }
};

export async function exportBackup() {
  const snapshot = await transaction(['values','photos'], 'readonly', (tx, set) => {
    const values = {};const photos = [];
    for (const key of DATA_KEYS) {
      const request = tx.objectStore('values').get(key);
      request.onsuccess = () => { if (request.result !== undefined) values[key] = request.result; };
    }
    const cursor = tx.objectStore('photos').openCursor();
    cursor.onsuccess = () => { const row = cursor.result;if (row) { photos.push({ id: row.key, blob: row.value });row.continue(); } };
    set({ values, photos });
  });
  const photos = await Promise.all(snapshot.photos.map(async ({ id, blob }) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { id, type: blob.type, data: btoa(binary) };
  }));
  return { format: 'fitlifehub-local-backup', version: 1, exportedAt: new Date().toISOString(), values: snapshot.values, photos };
}

export async function importBackup(backup) {
  if (backup?.format !== 'fitlifehub-local-backup' || backup.version !== 1 || !backup.values || typeof backup.values !== 'object' || Array.isArray(backup.values) || !Array.isArray(backup.photos)) throw new Error('Choose a valid FitLifeHub version 1 backup.');
  for (const [key, value] of Object.entries(backup.values)) {
    if (!DATA_KEYS.includes(key)) throw new Error('The backup contains an unknown data field.');
    if (LIST_KEYS.includes(key)) {
      if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.date !== 'string')) throw new Error('The backup contains an invalid log.');
      if (new Set(value.map((row) => row.id)).size !== value.length) throw new Error('The backup contains duplicate log IDs.');
      const numberFields = { fitnessNutritionLogs: ['calories','protein','carbs','fats'], progressWeightLogs: ['weight'], progressPRLogs: ['weight','reps'], progressExerciseLoads: ['weight','sets','reps'] }[key] || [];
      if (value.some((row) => numberFields.some((field) => !Number.isFinite(row[field]) || row[field] < 0))) throw new Error('The backup contains invalid numeric values.');
      if (key === 'progressPRLogs' && value.some((row) => typeof row.exercise !== 'string')) throw new Error('The backup contains an invalid exercise name.');
      if (key === 'progressExerciseLoads' && value.some((row) => !validExerciseLoad(row))) throw new Error('The backup contains an invalid exercise weight log.');
      if (key === 'fitnessNutritionLogs' && value.some((row) => typeof row.meal !== 'string')) throw new Error('The backup contains an invalid food name.');
    } else if (value !== null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('The backup contains invalid planner data.');
  }
  const plan = backup.values.fitnessPlannerPlan;
  if (plan && (!Array.isArray(plan.weekly) || plan.weekly.length !== 7 || plan.weekly.some((day) => !day || typeof day.day !== 'string' || !Array.isArray(day.exercises)))) throw new Error('The backup contains an invalid workout plan.');
  const seen = new Set();
  const photos = backup.photos.map((photo) => {
    if (typeof photo?.id !== 'string' || seen.has(photo.id) || !IMAGE_TYPES.includes(photo.type) || typeof photo.data !== 'string' || photo.data.length > 7_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(photo.data)) throw new Error('The backup contains an invalid photo.');
    seen.add(photo.id);
    let binary;try { binary = atob(photo.data); } catch { throw new Error('The backup contains an invalid photo.'); }
    if (binary.length > 5 * 1024 * 1024) throw new Error('A backup photo exceeds 5 MB.');
    return { id: photo.id, blob: new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], { type: photo.type }) };
  });
  for (const row of backup.values.progressPhotoLogs || []) {
    if (row.storagePath && !seen.has(row.storagePath)) throw new Error('A photo referenced by this backup is missing.');
    if (row.imageUrl && !/^data:image\/(?:jpeg|png|webp|gif|avif);base64,/.test(row.imageUrl)) throw new Error('The backup contains an invalid legacy photo.');
  }
  // Validation and photo decoding finish before replacing anything; replacement is atomic.
  await transaction(['values','photos'], 'readwrite', (tx) => {
    const store = tx.objectStore('values');store.clear();tx.objectStore('photos').clear();
    for (const [key, value] of Object.entries(backup.values)) store.put(value, key);
    store.put(true, '_legacyMigrated');
    for (const photo of photos) tx.objectStore('photos').put(photo.blob, photo.id);
  });
}
