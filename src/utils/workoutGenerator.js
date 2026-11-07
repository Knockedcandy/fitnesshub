import { exercises } from '@/data/exercises';
import { exerciseCatalog } from '@/data/exerciseCatalog';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SCHEDULES = {
  3: ['Full Body A', 'Rest', 'Full Body B', 'Rest', 'Full Body C', 'Rest', 'Rest'],
  4: ['Upper A', 'Lower A', 'Rest', 'Upper B', 'Lower B', 'Rest', 'Rest'],
  5: ['Push', 'Pull', 'Legs', 'Rest', 'Upper', 'Lower', 'Rest'],
  6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', 'Rest']
};

const SPLIT_NAMES = {
  3: '3-day full body',
  4: '4-day upper / lower',
  5: '5-day push / pull / legs + upper / lower',
  6: '6-day push / pull / legs'
};

const DIFFICULTY_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
export const WORKOUT_GENERATOR_VERSION = 8;
export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];

function baseSplit(label) {
  return label.replace(/\s+[ABC]$/, '');
}

function variantIndex(label) {
  if (label.endsWith(' B')) return 1;
  if (label.endsWith(' C')) return 2;
  return 0;
}

function supportsEquipment(exercise, selected = 'full gym') {
  const equipment = exercise.equipment.toLowerCase();
  const choice = selected.toLowerCase();
  if (!choice.includes('full gym') && /^weighted\b/i.test(exercise.name)) return false;
  if (equipment.includes('fixed bar') && !choice.includes('full gym') && !choice.includes('bodyweight')) return false;
  if (choice.includes('dumbbell')) return /dumbbell|bodyweight/.test(equipment);
  if (choice.includes('bodyweight')) return /bodyweight|none/.test(equipment);
  if (choice.includes('band')) return /band|bodyweight|none/.test(equipment);
  return true;
}

function supportsExperience(exercise, experience = 'beginner') {
  return experience === 'advanced' || exercise.difficulty !== 'advanced';
}

function supportsLimitations(exercise, limitations = '') {
  const note = limitations.toLowerCase();
  const name = exercise.name.toLowerCase();
  const avoids = (term) => new RegExp(`(?:avoid|no)[^.;]{0,48}\\b${term}`, 'i').test(note);
  if (/(?:avoid|no|low)[ -]?(?:jump|impact)|sensitive to impact/.test(note) && /jump|burpee|mountain climber/.test(name)) return false;
  if (/(?:avoid|no) overhead|sensitive.{0,20}overhead|overhead.{0,20}sensitive/.test(note) && /overhead|shoulder press|arnold press|pike push-up|thruster/.test(name)) return false;
  if (avoids('squats?') && /squat/.test(name)) return false;
  if (avoids('lunges?') && /lunge/.test(name)) return false;
  if (avoids('deadlifts?') && /deadlift/.test(name)) return false;
  if (avoids('pull[ -]?ups?') && /pull-up/.test(name)) return false;
  return true;
}

function categoriesForSplit(split) {
  if (split === 'Full Body') return ['Legs', 'Push', 'Pull', 'Full Body'];
  if (split === 'Upper') return ['Push', 'Pull'];
  if (split === 'Lower' || split === 'Legs') return ['Legs', 'Lower', 'Full Body'];
  return [split];
}

function primaryMuscleGroups(exercise) {
  const muscle = String(exercise.muscle || '').toLowerCase();
  const groups = new Set();
  if (/chest/.test(muscle)) groups.add('chest');
  if (/back|lats|traps/.test(muscle)) groups.add('back');
  if (/shoulder|delt/.test(muscle)) groups.add('shoulders');
  if (/tricep/.test(muscle)) groups.add('triceps');
  if (/bicep/.test(muscle)) groups.add('biceps');
  if (/quad/.test(muscle)) groups.add('quads');
  if (/hamstring/.test(muscle)) groups.add('hamstrings');
  if (/glute/.test(muscle)) groups.add('glutes');
  if (/calf|calves/.test(muscle)) groups.add('calves');
  if (/core|abdominal/.test(muscle)) groups.add('core');
  return groups;
}

export function exerciseMuscleGroups(exercise) {
  const groups = primaryMuscleGroups(exercise);
  const name = String(exercise.name || '').toLowerCase();

  if (exercise.split === 'Push' && /press|push-up|dips?/.test(name)) groups.add('triceps');
  if (exercise.split === 'Pull' && /rows?|pulldown|pull-up/.test(name)) groups.add('biceps');
  if (/pike push-up|prone y raise/.test(name)) groups.add('shoulders');
  // Conditioning labels are not muscle names; count their actual working regions.
  if (/burpee/.test(name)) ['chest', 'quads', 'core'].forEach((group) => groups.add(group));
  if (/thruster/.test(name)) ['shoulders', 'quads', 'glutes'].forEach((group) => groups.add(group));
  if (/battle ropes/.test(name)) ['shoulders', 'core'].forEach((group) => groups.add(group));
  if (/box jumps?/.test(name)) ['quads', 'glutes'].forEach((group) => groups.add(group));
  if (/sled push/.test(name)) ['quads', 'calves'].forEach((group) => groups.add(group));

  return groups;
}

function coverageSlots(label, split, count) {
  if (split === 'Full Body') {
    const variants = {
      0: [['chest', 'triceps'], ['back', 'biceps'], { groups: ['quads', 'glutes'], fallbackGroups: ['quads'] }, ['calves'], { groups: ['core'], splits: ['Full Body'] }],
      1: [['chest', 'triceps'], { groups: ['shoulders'], splits: ['Pull'] }, ['hamstrings', 'glutes'], ['calves'], { groups: ['core'], splits: ['Full Body'] }],
      2: [['back', 'biceps'], { groups: ['shoulders'], splits: ['Push'], relaxSplit: true }, { groups: ['quads', 'glutes'], fallbackGroups: ['quads'] }, ['hamstrings', 'glutes'], { groups: ['core'], splits: ['Full Body'] }]
    };
    return variants[variantIndex(label)];
  }
  if (split === 'Upper') {
    return count <= 4
      ? [['chest', 'triceps'], ['back', 'biceps'], ['shoulders']]
      : [['chest'], ['back', 'biceps'], ['shoulders'], ['triceps']];
  }
  if (split === 'Lower' || split === 'Legs') {
    return count <= 4
      ? [{ groups: ['quads', 'glutes'], fallbackGroups: ['quads'] }, ['hamstrings', 'glutes'], ['calves'], ['core']]
      : [['quads'], ['hamstrings'], ['glutes'], ['calves'], ['core']];
  }
  if (split === 'Push') {
    return count <= 4
      ? [['chest', 'triceps'], { groups: ['shoulders'], relaxSplit: true }]
      : [['chest'], { groups: ['shoulders'], relaxSplit: true }, ['triceps']];
  }
  if (split === 'Pull') {
    return count <= 4 ? [['back', 'biceps']] : [['back', 'biceps'], { groups: ['shoulders'], splits: ['Pull'] }];
  }
  return [];
}

function rotate(items, offset) {
  if (!items.length) return [];
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function slotQuality(exercise, requiredGroups) {
  const primary = primaryMuscleGroups(exercise);
  return requiredGroups.reduce((score, group) => score + (primary.has(group) ? 2 : 1), 0);
}

function muscleCounts(selected) {
  const counts = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
  for (const exercise of selected) {
    for (const group of exerciseMuscleGroups(exercise)) counts[group] += 1;
  }
  return counts;
}

function withinMuscleCap(exercise, counts) {
  return [...exerciseMuscleGroups(exercise)].every((group) => counts[group] < 2);
}

function chooseCoverageCandidate(pool, slot, selected, usedNames) {
  const requiredGroups = Array.isArray(slot) ? slot : slot.groups;
  const requiredSplits = Array.isArray(slot) ? [] : slot.splits || [];
  const counts = muscleCounts(selected);
  const available = pool.filter((exercise) =>
    !selected.some((item) => item.name === exercise.name) && withinMuscleCap(exercise, counts));
  const matching = (groups, splits) => available.filter((exercise) => {
    if (splits.length && !splits.includes(exercise.split)) return false;
    const exerciseGroups = exerciseMuscleGroups(exercise);
    return groups.every((group) => exerciseGroups.has(group));
  });
  let qualityGroups = requiredGroups;
  let matches = matching(requiredGroups, requiredSplits);
  if (!matches.length && !Array.isArray(slot) && slot.fallbackGroups) {
    qualityGroups = slot.fallbackGroups;
    matches = matching(slot.fallbackGroups, requiredSplits);
  }
  if (!matches.length && !Array.isArray(slot) && slot.relaxSplit) {
    qualityGroups = requiredGroups;
    matches = matching(requiredGroups, []);
  }
  const unused = matches.filter((exercise) => !usedNames.has(exercise.name));
  const candidates = unused.length ? unused : matches;
  return candidates.reduce((best, exercise) => {
    if (!best) return exercise;
    return slotQuality(exercise, qualityGroups) > slotQuality(best, qualityGroups) ? exercise : best;
  }, null);
}

function chooseBalancedExercises(label, split, profile, allowed, usedNames, count) {
  const categories = categoriesForSplit(split);
  const splitPool = allowed.filter((exercise) => categories.includes(exercise.split));
  const offset = variantIndex(label) * Math.max(2, Math.floor(splitPool.length / 3));
  const pool = rotate(splitPool, offset);
  const selected = [];

  for (const slot of coverageSlots(label, split, count)) {
    const next = chooseCoverageCandidate(pool, slot, selected, usedNames);
    if (!next) continue;
    selected.push(next);
    usedNames.add(next.name);
  }

  while (selected.length < count) {
    const counts = muscleCounts(selected);
    const candidates = pool
      .filter((exercise) => !selected.some((item) => item.name === exercise.name) && withinMuscleCap(exercise, counts));
    if (!candidates.length) break;
    // Keep the day in its split while spreading work across unsaturated muscles.
    candidates.sort((a, b) => {
      const score = (exercise) => {
        const groups = [...exerciseMuscleGroups(exercise)];
        return (!usedNames.has(exercise.name) ? 10 : 0)
          - groups.reduce((sum, group) => sum + counts[group] * 8, 0)
          - Math.max(0, groups.length - 1) * 12;
      };
      return score(b) - score(a);
    });
    const next = candidates[0];
    selected.push(next);
    usedNames.add(next.name);
  }

  return selected.map((exercise) => prescription(exercise, profile, count));
}

function prescription(exercise, profile, count) {
  const experience = profile.experience || 'beginner';
  const focus = profile.focus || 'balanced';
  const highVariety = count >= 8;
  const timed = /plank|carry|sled|rope|climber|burpee|swing|jump|wall sit/i.test(exercise.name);
  const sets = highVariety ? (focus === 'strength' || experience === 'advanced' ? 3 : 2) : (focus === 'strength' || experience === 'advanced' ? 4 : 3);

  if (timed) {
    return {
      ...exercise,
      sets: highVariety ? (focus === 'conditioning' ? 3 : 2) : (focus === 'conditioning' ? 4 : 3),
      reps: focus === 'strength' ? '20–30 sec' : '30–45 sec',
      rest: focus === 'conditioning' ? '30 sec' : '60 sec'
    };
  }

  const reps = focus === 'strength' ? '5–8' : focus === 'conditioning' ? '12–15' : '8–12';
  const rest = focus === 'strength' ? '2 min' : focus === 'conditioning' ? '45 sec' : '90 sec';
  return { ...exercise, sets, reps, rest };
}

function exerciseCount(profile) {
  const requested = Number(profile.exercisesPerWorkout);
  return Number.isInteger(requested) ? Math.min(10, Math.max(5, requested)) : 5;
}

function chooseExercises(label, profile, usedNames) {
  const split = baseSplit(label);
  const count = exerciseCount(profile);
  const allowed = exercises
    .filter((exercise) => supportsEquipment(exercise, profile.equipment))
    .filter((exercise) => supportsExperience(exercise, profile.experience))
    .filter((exercise) => supportsLimitations(exercise, profile.limitations))
    .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);

  return chooseBalancedExercises(label, split, profile, allowed, usedNames, count);
}

function muscleFrequency(weekly) {
  const frequency = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
  for (const workout of weekly.filter((day) => day.isTrainingDay)) {
    const trainedToday = new Set(workout.exercises.flatMap((exercise) => [...exerciseMuscleGroups(exercise)]));
    for (const group of MUSCLE_GROUPS) {
      if (trainedToday.has(group)) frequency[group] += 1;
    }
  }
  return frequency;
}

function replacementCandidates(plan, profile, dayIndex, exerciseIndex, candidates = exerciseCatalog) {
  const day = plan?.weekly?.[dayIndex];
  const original = day?.isTrainingDay && day.exercises?.[exerciseIndex];
  if (!original || !profile) return [];

  const counts = muscleCounts(day.exercises.filter((_, index) => index !== exerciseIndex));
  return candidates.filter((candidate) => candidate.name !== original.name).map((candidate) => {
    const notes = [];
    if (day.exercises.some((item) => item.name === candidate.name)) notes.push('Already listed today');
    if (!categoriesForSplit(day.trainingType || baseSplit(day.split)).includes(candidate.split)) notes.push('Different day focus');
    if (!supportsEquipment(candidate, profile.equipment)) notes.push('Different equipment');
    if (!supportsExperience(candidate, profile.experience)) notes.push('Above selected experience level');
    if (!supportsLimitations(candidate, profile.limitations)) notes.push('Check your movement restrictions');
    if (!withinMuscleCap(candidate, counts)) notes.push('Above two movements for a muscle');
    const updated = day.exercises.map((exercise, index) => index === exerciseIndex ? candidate : exercise);
    const weekly = plan.weekly.map((workout, index) => index === dayIndex ? { ...day, exercises: updated } : workout);
    if (Object.values(muscleFrequency(weekly)).some((frequency) => frequency < 2)) notes.push('Review weekly muscle coverage');
    return { exercise: candidate, advisory: notes.join(' · ') };
  });
}

export function replacementOptions(plan, profile, dayIndex, exerciseIndex) {
  return replacementCandidates(plan, profile, dayIndex, exerciseIndex)
    .map(({ exercise }) => prescription(exercise, profile, exerciseCount(profile)));
}

export function searchReplacementExercises(plan, profile, dayIndex, exerciseIndex, query) {
  const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const aliases = { abs: 'core', pecs: 'chest', lats: 'back', glute: 'glutes', bicep: 'biceps', tricep: 'triceps' };
  const matches = exerciseCatalog.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.muscle} ${exercise.equipment} ${exercise.split}`.toLowerCase();
    return terms.every((term) => haystack.includes(term) || haystack.includes(aliases[term] || '\0'));
  });
  return replacementCandidates(plan, profile, dayIndex, exerciseIndex, matches)
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
}

export function replacePlanExercise(plan, profile, dayIndex, exerciseIndex, replacementName) {
  const day = plan?.weekly?.[dayIndex];
  const original = day?.isTrainingDay && day.exercises?.[exerciseIndex];
  const candidate = exerciseCatalog.find((exercise) => exercise.name === replacementName);
  if (!original || !profile || !candidate || candidate.name === original.name) throw new Error('Choose another movement from the exercise catalog.');
  const replacement = prescription(candidate, profile, exerciseCount(profile));
  const weekly = plan.weekly.map((day, index) => index === dayIndex
    ? { ...day, exercises: day.exercises.map((exercise, position) => position === exerciseIndex ? replacement : exercise) }
    : day);
  return { ...plan, weekly, customized: true, muscleFrequency: muscleFrequency(weekly) };
}

export function generatePlan(profile = {}) {
  const requestedDays = Number(profile.days) || 3;
  const trainingDays = Math.min(6, Math.max(3, requestedDays));
  const schedule = SCHEDULES[trainingDays];
  const usedNames = new Set();
  const pairedWorkouts = new Map();
  let workoutNumber = 0;

  const weekly = schedule.map((label, index) => {
    const isRest = label === 'Rest';
    if (!isRest) workoutNumber += 1;
    let dayExercises = [];
    if (!isRest) {
      // A/B are repeat sessions of the same split; C remains a separate session.
      const templateKey = label.replace(/\s+[AB]$/, '');
      if (!pairedWorkouts.has(templateKey)) {
        pairedWorkouts.set(templateKey, chooseExercises(label, profile, usedNames));
      }
      // Keep swaps and later edits local to their calendar day, including nested data.
      dayExercises = structuredClone(pairedWorkouts.get(templateKey));
    }
    return {
      day: WEEKDAYS[index],
      split: label,
      trainingType: isRest ? 'Rest' : baseSplit(label),
      workoutNumber: isRest ? null : workoutNumber,
      isTrainingDay: !isRest,
      exercises: dayExercises,
      warmup: '5 minutes of easy movement, then 2 lighter practice sets for the first exercise.',
      cooldown: 'Walk for 3–5 minutes, breathe normally, and gently move the trained muscles.'
    };
  });

  const frequency = muscleFrequency(weekly);
  const coverageGaps = MUSCLE_GROUPS.filter((group) => frequency[group] < 2);
  const balanceNotes = [];
  if (weekly.some((day) => day.isTrainingDay && day.exercises.length < exerciseCount(profile))) {
    balanceNotes.push('Some days have fewer exercises than requested so the movements stay in the correct training split and no muscle is assigned more than two movements that day. Equipment or restrictions may narrow the choices further.');
  }
  if (coverageGaps.length) {
    balanceNotes.push(`Some muscle groups are trained fewer than twice this week: ${coverageGaps.join(', ')}. Repeated A/B sessions, your exercise maximum, available equipment, or movement restrictions can limit weekly coverage.`);
  }

  return {
    generatorVersion: WORKOUT_GENERATOR_VERSION,
    splitName: SPLIT_NAMES[trainingDays],
    trainingDays,
    exercisesPerWorkout: exerciseCount(profile),
    weekly,
    muscleFrequency: frequency,
    balanceNote: balanceNotes.join(' '),
    generatedAt: new Date().toISOString(),
    progressiveOverload: 'When every set reaches the top of the rep range with clean form, add 1–2 reps or the smallest available weight next time. Keep the same load if form breaks down.',
    limitationNote: profile.limitations
      ? `You noted: “${String(profile.limitations).slice(0, 240)}.” Use pain-free substitutions and get qualified guidance before training through an injury.`
      : ''
  };
}
