const stopWords = new Set(['a', 'an', 'and', 'at', 'for', 'i', 'in', 'of', 'on', 'the', 'to', 'with', 'workout', 'exercise', 'exercises']);
const aliases = {
  abs: ['core'],
  arm: ['biceps', 'triceps'],
  arms: ['biceps', 'triceps'],
  band: ['resistance band'],
  bands: ['resistance band'],
  beginner: ['beginner'],
  bicep: ['biceps'],
  dumbbell: ['dumbbell', 'dumbbells'],
  dumbbells: ['dumbbell', 'dumbbells'],
  easy: ['beginner'],
  glute: ['glutes'],
  home: ['bodyweight', 'resistance band'],
  lat: ['back'],
  lats: ['back'],
  leg: ['legs', 'quads', 'hamstrings', 'glutes'],
  legs: ['legs', 'quads', 'hamstrings', 'glutes'],
  pec: ['chest'],
  pecs: ['chest'],
  shoulder: ['shoulders'],
  tricep: ['triceps']
};
const equipmentTerms = new Set(['bodyweight', 'dumbbell', 'dumbbells', 'band', 'bands', 'home', 'machine', 'barbell', 'cable']);
const difficultyTerms = new Set(['beginner', 'intermediate', 'advanced', 'easy']);
const muscleTerms = new Set(['abs', 'arm', 'arms', 'back', 'bicep', 'biceps', 'calf', 'calves', 'chest', 'core', 'glute', 'glutes', 'hamstring', 'hamstrings', 'lat', 'lats', 'leg', 'legs', 'pec', 'pecs', 'quad', 'quads', 'shoulder', 'shoulders', 'tricep', 'triceps']);
const splitTerms = new Set(['push', 'pull', 'upper', 'lower', 'conditioning']);

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function queryGroups(query) {
  const normalized = normalize(query)
    .replace(/no equipment/g, 'bodyweight')
    .replace(/upper body/g, 'upper')
    .replace(/lower body/g, 'lower');
  return normalized
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token))
    .map((token) => ({
      token,
      variants: [token, ...(aliases[token] || [])],
      kind: equipmentTerms.has(token) ? 'equipment' : difficultyTerms.has(token) ? 'difficulty' : muscleTerms.has(token) ? 'muscle' : splitTerms.has(token) ? 'split' : 'general'
    }));
}

function scoreExercise(exercise, groups) {
  if (!groups.length) return 1;
  const fields = {
    name: normalize(exercise.name),
    muscle: normalize([exercise.muscle, ...(exercise.muscles || [])].join(' ')),
    equipment: normalize(exercise.equipment),
    difficulty: normalize(exercise.difficulty),
    split: normalize(exercise.split),
    details: normalize(`${exercise.description} ${(exercise.alternatives || []).join(' ')}`)
  };

  let total = 0;
  for (const group of groups) {
    const candidates = group.kind === 'equipment'
      ? [[fields.equipment, 7], [fields.name, 5]]
      : group.kind === 'difficulty'
        ? [[fields.difficulty, 7]]
        : group.kind === 'muscle'
          ? [[fields.muscle, 7]]
          : group.kind === 'split'
            ? [[fields.split, 7]]
            : [[fields.name, 8], [fields.muscle, 6], [fields.equipment, 5], [fields.difficulty, 4], [fields.split, 4], [fields.details, 2]];
    let best = 0;
    for (const variant of group.variants) {
      const needle = normalize(variant);
      for (const [field, weight] of candidates) {
        if (field.includes(needle)) best = Math.max(best, weight + (field === needle ? 1 : 0));
      }
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

export function searchExercises(exercises, query = '', filter = '') {
  const groups = queryGroups(`${query} ${filter}`);
  const noAddedWeight = /\b(?:home|no equipment)\b/i.test(`${query} ${filter}`);
  const strictNoEquipment = /\bno equipment\b/i.test(`${query} ${filter}`);
  return exercises
    .filter((exercise) => !noAddedWeight || !/^weighted\b/i.test(exercise.name))
    .filter((exercise) => !strictNoEquipment || !/pull-up|inverted row|hanging/i.test(exercise.name))
    .map((exercise, index) => ({ exercise, index, score: scoreExercise(exercise, groups) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.exercise);
}
