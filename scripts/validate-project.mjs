import assert from 'node:assert/strict';
import fs from 'node:fs';

// Source-only debug bundles intentionally omit the exercise artwork.
// Default validation still requires every original asset.
const skipArtwork = process.argv.includes('--skip-artwork');

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function importSource(path, transform = (source) => source) {
  const source = transform(read(path));
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(url);
}

const exerciseSource = read('src/data/exercises.js');
const starterPdf = fs.readFileSync(new URL('../public/downloads/fitlifehub-7-day-gym-starter.pdf', import.meta.url));
assert.equal(starterPdf.subarray(0, 5).toString(), '%PDF-', 'The starter download must be a valid PDF asset.');
assert.ok(starterPdf.length < 5_000_000, 'The starter PDF should be practical to download on a phone.');
assert.ok(read('src/components/StarterPlanDownload.jsx').includes('/downloads/fitlifehub-7-day-gym-starter.pdf'), 'The main download must link to the finished PDF.');
assert.ok(read('src/app/digital-products/page.jsx').includes('/downloads/fitlifehub-7-day-gym-starter.pdf'), 'The resource page must link to the finished PDF.');
const exercises = JSON.parse(exerciseSource.slice(exerciseSource.indexOf('['), exerciseSource.lastIndexOf(']') + 1));
const openExercises = JSON.parse(read('src/data/openExercises.json'));
const openExerciseArt = JSON.parse(read('src/data/openExerciseArt.json'));
const exerciseCatalog = [...exercises, ...openExercises];
const { getExerciseVisual } = await importSource('src/data/exerciseVisuals.js', (source) => source
  .replace("import openExerciseArt from './openExerciseArt.json';", `const openExerciseArt=${JSON.stringify(openExerciseArt)};`));
const { generatePlan, replacementOptions, searchReplacementExercises, replacePlanExercise, exerciseMuscleGroups, MUSCLE_GROUPS, WORKOUT_GENERATOR_VERSION } = await importSource('src/utils/workoutGenerator.js', (source) => source
  .replace("import { exercises } from '@/data/exercises';", `const exercises=${JSON.stringify(exercises)};`)
  .replace("import { exerciseCatalog } from '@/data/exerciseCatalog';", `const exerciseCatalog=${JSON.stringify(exerciseCatalog)};`));
const { searchExercises } = await importSource('src/utils/exerciseSearch.js');
const { moderateMessage, normalizeCoachText, validateAnswer } = await importSource('src/utils/aiSafety.js');
const { calculateNutrition } = await importSource('src/utils/calorieCalculator.js');
const { todayISO } = await importSource('src/utils/localStore.js');
const { safeLocalPath } = await importSource('src/utils/safeLocalPath.js');
const packageJson = JSON.parse(read('package.json'));

function sourceFiles(directory) {
  return fs.readdirSync(new URL(`../${directory}`, import.meta.url), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

assert.ok(exercises.length >= 75, 'Exercise library unexpectedly shrank.');
assert.ok(openExercises.length >= 800, 'The text-only exercise catalog is unexpectedly small.');
assert.ok(!exerciseCatalog.some((exercise) => exercise.name === 'Air Bike'), 'Air Bike must remain removed from search and substitution.');
for (const name of ['Around The Worlds', 'Barbell Hack Squat', 'Barbell Seated Calf Raise', 'Barbell Walking Lunge', 'Bench Sprint', 'Bicycling', 'Crossover Reverse Lunge', 'Dumbbell Lying Pronation', 'Elliptical Trainer', "Farmer's Walk", 'Fast Skipping', 'Flutter Kicks', 'Hanging Leg Raise', 'Hip Flexion with Band', 'Intermediate Hip Flexor and Quad Stretch', 'Iron Crosses (stretch)', 'Jefferson Squats', 'Jogging, Treadmill', 'Kneeling Forearm Stretch', 'Landmine Linear Jammer', 'Leverage Decline Chest Press']) {
  assert.ok(!exerciseCatalog.some((exercise) => exercise.name === name), `${name} failed artwork review and must remain excluded.`);
}
assert.deepEqual(openExercises.find((exercise) => exercise.name === 'Cable Hip Adduction')?.muscles, ['Adductors'], 'Hip adduction must target the inner thigh.');
assert.equal(openExercises.find((exercise) => exercise.name === 'Incline Bench Pull')?.equipment, 'Dumbbell', 'Incline Bench Pull instructions use two dumbbells.');
assert.equal(new Set(openExerciseArt).size, openExerciseArt.length, 'Illustrated imported names must be unique.');
const illustratedOpenNames = new Set(openExerciseArt);
assert.equal(new Set(exerciseCatalog.map((exercise) => exercise.name.toLowerCase())).size, exerciseCatalog.length, 'The combined catalog has duplicate names.');
for (const exercise of openExercises) {
  assert.equal(exercise.source, 'free-exercise-db', 'Imported records must retain their source.');
  assert.ok(exercise.instructions.length && exercise.muscle && exercise.equipment, 'Imported records need text instructions and searchable metadata.');
  const visual = getExerciseVisual(exercise);
  if (illustratedOpenNames.has(exercise.name)) {
    assert.ok(visual.src?.endsWith('.webp'), `${exercise.name} needs its own image path.`);
    if (!skipArtwork) assert.ok(fs.existsSync(new URL(`../public${visual.src}`, import.meta.url)), `${exercise.name} is missing its two-panel illustration.`);
  } else {
    assert.equal(visual.src, null, 'Unillustrated entries must not point to nonexistent images.');
  }
  assert.ok(!('images' in exercise), 'Imported image paths must be excluded.');
}
assert.ok(openExerciseArt.every((name) => openExercises.some((exercise) => exercise.name === name)), 'Every imported art entry must exist in the catalog.');
assert.equal(new Set(exercises.map((exercise) => exercise.name)).size, exercises.length, 'Exercise names must be unique.');
for (const exercise of exercises) {
  for (const field of ['name', 'muscle', 'equipment', 'difficulty', 'split', 'description']) {
    assert.ok(exercise[field], `${exercise.name || 'Unknown exercise'} is missing ${field}.`);
  }
  assert.ok(exercise.instructions?.length >= 3, `${exercise.name} needs at least three instructions.`);
  assert.ok(exercise.mistakes?.length >= 3, `${exercise.name} needs at least three common mistakes.`);
  const visual = getExerciseVisual(exercise);
  assert.equal(visual.label, 'Movement guide', `${exercise.name} is missing a movement-guide label.`);
  assert.match(visual.src, /^\/exercises\/movements-v2\/[a-z0-9-]+\.webp$/, `${exercise.name} is not mapped to an exercise-specific movement asset.`);
  if (!skipArtwork) assert.ok(fs.existsSync(new URL(`../public${visual.src}`, import.meta.url)), `${exercise.name} references a missing movement illustration.`);
}

const exerciseVisuals = new Set(exercises.map((exercise) => getExerciseVisual(exercise).src));
assert.equal(exerciseVisuals.size, exercises.length, 'Every exercise should resolve to its own movement illustration.');
const movementFiles = skipArtwork ? [] : fs.readdirSync(new URL('../public/exercises/movements-v2/', import.meta.url)).filter((name) => name.endsWith('.webp'));
if (!skipArtwork) assert.ok(movementFiles.length >= exercises.length + openExerciseArt.length, 'Movement-asset directory should contain all mapped exercise images.');
for (const file of movementFiles) {
  const bytes = fs.readFileSync(new URL(`../public/exercises/movements-v2/${file}`, import.meta.url));
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${file} is empty or has an invalid container.`);
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `${file} must contain a WebP image.`);
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${file} is truncated.`);
}
for (const path of skipArtwork ? [] : exerciseVisuals) {
  const bytes = fs.statSync(new URL(`../public${path}`, import.meta.url)).size;
  assert.ok(bytes < 200_000, `${path} is too large for a workout card asset.`);
}

const equipmentModes = ['full gym', 'dumbbells only', 'home/bodyweight', 'resistance bands'];
function assertMatchingDays(plan) {
  for (const a of plan.weekly.filter((day) => day.split.endsWith(' A'))) {
    const b = plan.weekly.find((day) => day.split === a.split.replace(/ A$/, ' B'));
    assert.ok(b, `${a.split} needs its matching B day.`);
    assert.deepEqual(b.exercises, a.exercises, `${a.split} and ${b.split} must repeat the entire workout in order.`);
    assert.notEqual(b.exercises, a.exercises, 'Paired days must have separate exercise arrays.');
    for (let i = 0; i < a.exercises.length; i += 1) {
      assert.notEqual(b.exercises[i], a.exercises[i], 'Paired days must not share exercise objects.');
      assert.notEqual(b.exercises[i].instructions, a.exercises[i].instructions, 'Paired days must not share mutable instruction arrays.');
    }
  }
  for (const rest of plan.weekly.filter((day) => !day.isTrainingDay)) {
    assert.deepEqual(rest.exercises, [], 'Rest days must stay empty.');
    assert.equal(rest.workoutNumber, null, 'Rest days must not consume a workout number.');
  }
  assert.deepEqual(plan.weekly.filter((day) => day.isTrainingDay).map((day) => day.workoutNumber),
    Array.from({ length: plan.trainingDays }, (_, index) => index + 1), 'Workout numbering must remain chronological.');
}

function assertWeeklyCoverage(plan, context) {
  for (const group of MUSCLE_GROUPS) {
    if (plan.trainingDays === 3 && plan.muscleFrequency[group] < 2) {
      // Five movements cannot always cover every muscle twice with identical A/B.
      assert.ok(plan.balanceNote.includes(group), `${context} must explain limited ${group} coverage.`);
    } else {
      assert.ok(plan.muscleFrequency[group] >= 2, `${context} trains ${group} fewer than two days.`);
    }
  }
}
const equipmentMatches = {
  'full gym': () => true,
  'dumbbells only': (exercise) => /dumbbell|bodyweight/i.test(exercise.equipment) && !/^weighted/i.test(exercise.name),
  'home/bodyweight': (exercise) => /bodyweight|none/i.test(exercise.equipment) && !/^weighted/i.test(exercise.name),
  'resistance bands': (exercise) => /band|bodyweight|none/i.test(exercise.equipment) && !/^weighted/i.test(exercise.name)
};
const dayCategories = {
  'Full Body': ['Push', 'Pull', 'Legs', 'Full Body'],
  Upper: ['Push', 'Pull'],
  Lower: ['Legs', 'Lower', 'Full Body'],
  Push: ['Push'],
  Pull: ['Pull'],
  Legs: ['Legs', 'Lower', 'Full Body']
};
for (const equipment of ['dumbbells only', 'resistance bands']) {
  for (const days of [3, 4, 5, 6]) {
    const plan = generatePlan({ days, equipment, experience: 'advanced', exercisesPerWorkout: 10 });
    assert.ok(!plan.weekly.flatMap((day) => day.exercises).some((exercise) =>
      ['Pull-Ups', 'Weighted Pull-Ups', 'Inverted Row', 'Hanging Knee Raises'].includes(exercise.name)),
    `${equipment} must not require a pull-up or row bar.`);
  }
}
function assertDayMatchesSplit(workout) {
  assert.ok(workout.exercises.every((exercise) => dayCategories[workout.trainingType].includes(exercise.split)),
    `${workout.split} includes a movement from the wrong training split.`);
  const trained = new Set(workout.exercises.flatMap((exercise) => [...exerciseMuscleGroups(exercise)]));
  const forbidden = {
    Push: ['back', 'biceps', 'quads', 'hamstrings', 'glutes', 'calves'],
    Pull: ['chest', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves'],
    Legs: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
    Upper: ['quads', 'hamstrings', 'glutes', 'calves'],
    Lower: ['chest', 'back', 'shoulders', 'triceps', 'biceps']
  }[workout.trainingType] || [];
  for (const group of forbidden) assert.ok(!trained.has(group), `${workout.split} incorrectly trains ${group}.`);
}

for (const days of [3, 4, 5, 6]) {
  for (const equipment of equipmentModes) {
    const plan = generatePlan({ days, equipment, experience: 'intermediate', focus: 'balanced' });
    assertMatchingDays(plan);
    assert.equal(plan.generatorVersion, WORKOUT_GENERATOR_VERSION, 'Generated plans must carry the current generator version.');
    assert.equal(plan.weekly.length, 7, `${days}-day ${equipment} plan must cover seven calendar days.`);
    assert.equal(plan.weekly.filter((day) => day.isTrainingDay).length, days, `${days}-day ${equipment} plan has the wrong number of workouts.`);
    for (const workout of plan.weekly.filter((day) => day.isTrainingDay)) {
      assert.ok(workout.exercises.length >= 1 && workout.exercises.length <= 5, `${workout.split} should contain up to five split-appropriate exercises.`);
      assert.equal(new Set(workout.exercises.map((exercise) => exercise.name)).size, workout.exercises.length, `${workout.split} contains a duplicate exercise.`);
      assertDayMatchesSplit(workout);
      const muscleCounts = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
      for (const exercise of workout.exercises) {
        for (const group of exerciseMuscleGroups(exercise)) muscleCounts[group] += 1;
      }
      assert.ok(Object.values(muscleCounts).every((total) => total <= 2), `${workout.split} overtrains a muscle group in one session.`);
      assert.ok(workout.exercises.every((exercise) => exercise.difficulty !== 'advanced'), `${workout.split} gave an advanced movement to an intermediate user.`);
      assert.ok(workout.exercises.every(equipmentMatches[equipment]), `${workout.split} used unavailable equipment.`);
    }
    if (days === 3) {
      for (const workout of plan.weekly.filter((day) => day.isTrainingDay)) {
        const groups = new Set(workout.exercises.map((exercise) => exercise.split));
        for (const required of ['Push', 'Pull', 'Legs', 'Full Body']) assert.ok(groups.has(required), `${equipment} full-body day is missing ${required}.`);
      }
    }
  }
}

for (const count of [5, 6, 7, 8, 9, 10]) {
  for (const days of [3, 4, 5, 6]) {
    for (const equipment of equipmentModes) {
      for (const experience of ['beginner', 'advanced']) {
        const plan = generatePlan({ days, equipment, experience, exercisesPerWorkout: count, focus: 'balanced' });
        assertMatchingDays(plan);
        assert.equal(plan.exercisesPerWorkout, count, 'The plan must remember the selected exercise count.');
        for (const workout of plan.weekly.filter((day) => day.isTrainingDay)) {
          assert.ok(workout.exercises.length >= 1 && workout.exercises.length <= count, `${equipment} ${days}-day ${workout.split} should stay within the selected limit.`);
          assert.equal(new Set(workout.exercises.map((exercise) => exercise.name)).size, workout.exercises.length, `${workout.split} contains a duplicate exercise.`);
          assertDayMatchesSplit(workout);
          const muscleCounts = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
          for (const exercise of workout.exercises) {
            for (const group of exerciseMuscleGroups(exercise)) muscleCounts[group] += 1;
          }
          assert.ok(Object.values(muscleCounts).every((total) => total <= 2), `${equipment} ${days}-day ${workout.split} exceeds two movements for a muscle at ${count} exercises.`);
          assert.ok(workout.exercises.every(equipmentMatches[equipment]), `${workout.split} used unavailable equipment.`);
          if (experience === 'beginner') assert.ok(workout.exercises.every((exercise) => exercise.difficulty !== 'advanced'), `${workout.split} gave an advanced movement to a beginner.`);
          if (count >= 8) assert.ok(workout.exercises.every((exercise) => exercise.sets <= 3), 'Longer workouts should reduce sets per exercise.');
        }
        assertWeeklyCoverage(plan, `${count}-exercise ${equipment} ${days}-day plan`);
      }
    }
  }
}

for (const [input, expected] of [[undefined, 5], [4, 5], [11, 10], ['8', 8]]) {
  const plan = generatePlan({ days: 3, equipment: 'full gym', exercisesPerWorkout: input });
  assert.equal(plan.exercisesPerWorkout, expected, 'Old or invalid exercise counts should be clamped to the supported range.');
}

for (const equipment of equipmentModes) {
  const profile = { days: 4, equipment, experience: 'beginner', exercisesPerWorkout: 10 };
  const plan = generatePlan(profile);
  let checked = 0;
  for (const [dayIndex, day] of plan.weekly.entries()) {
    if (!day.isTrainingDay) continue;
    for (const [exerciseIndex, original] of day.exercises.entries()) {
      const options = replacementOptions(plan, profile, dayIndex, exerciseIndex);
      assert.deepEqual(searchReplacementExercises(plan, profile, dayIndex, exerciseIndex, ''), [], 'The picker should wait for the user to search.');
      assert.ok(options.every((option) => option.name !== original.name), 'A replacement must change the selected movement.');
      if (!options.length) continue;
      const searched = searchReplacementExercises(plan, profile, dayIndex, exerciseIndex, options[0].name);
      assert.ok(searched.some(({ exercise }) => exercise.name === options[0].name), 'Catalog movements should appear in replacement search.');
      const updated = replacePlanExercise(plan, profile, dayIndex, exerciseIndex, options[0].name);
      assert.equal(updated.weekly[dayIndex].exercises[exerciseIndex].name, options[0].name, 'The selected replacement should appear in its original position.');
      assert.equal(updated.weekly[dayIndex].exercises.length, day.exercises.length, 'A swap should preserve the exercise count.');
      assert.equal(updated.customized, true, 'A manually changed plan must be marked customized.');
      assert.equal(plan.weekly[dayIndex].exercises[exerciseIndex].name, original.name, 'Replacing must not mutate the saved plan.');
      for (const [otherIndex, otherDay] of plan.weekly.entries()) {
        if (otherIndex !== dayIndex) assert.deepEqual(updated.weekly[otherIndex], otherDay, 'A manual swap should only change the selected calendar day.');
      }
      checked += 1;
    }
  }
  assert.ok(checked > 0, `${equipment} should offer at least one replacement.`);
  const duplicate = searchReplacementExercises(plan, profile, 0, 0, plan.weekly[0].exercises[0].name);
  assert.ok(!duplicate.some(({ exercise }) => exercise.name === plan.weekly[0].exercises[0].name), 'Replacing a movement with itself is not useful.');
  assert.throws(() => replacePlanExercise(plan, profile, 0, 0, 'Not an exercise'), /catalog/, 'Unknown movements must be rejected.');
}
const pullPlan = generatePlan({ days: 6, equipment: 'full gym', experience: 'beginner', exercisesPerWorkout: 10 });
const pullIndex = pullPlan.weekly.findIndex((day) => day.trainingType === 'Pull');
const legSearch = searchReplacementExercises(pullPlan, { days: 6, equipment: 'full gym', experience: 'beginner', exercisesPerWorkout: 10 }, pullIndex, 0, 'leg press');
assert.ok(legSearch.some(({ exercise, advisory }) => exercise.name === 'Leg Press' && /Different day focus/.test(advisory)), 'Search should advise when a choice changes the day focus.');
assert.equal(replacePlanExercise(pullPlan, { days: 6, equipment: 'full gym', experience: 'beginner', exercisesPerWorkout: 10 }, pullIndex, 0, 'Leg Press').weekly[pullIndex].exercises[0].name, 'Leg Press', 'A user may manually override the generated split.');
const importedSwap = replacePlanExercise(pullPlan, { days: 6, equipment: 'full gym', experience: 'beginner', exercisesPerWorkout: 10 }, pullIndex, 0, openExercises[0].name);
assert.equal(importedSwap.weekly[pullIndex].exercises[0].source, 'free-exercise-db', 'Imported text-only movements must be selectable.');

const restrictedProfile = { days: 4, equipment: 'home/bodyweight', experience: 'beginner', exercisesPerWorkout: 8, limitations: 'No overhead pressing.' };
const restrictedPlan = generatePlan(restrictedProfile);
const overheadResults = searchReplacementExercises(restrictedPlan, restrictedProfile, 0, 0, 'pike push-up');
assert.ok(overheadResults.some(({ exercise, advisory }) => exercise.name === 'Pike Push-Up' && /movement restrictions/.test(advisory)), 'Search should advise about a stated restriction without locking the choice.');

for (const days of [3, 4, 5, 6]) {
  for (const equipment of equipmentModes) {
    const plan = generatePlan({ days, equipment, experience: 'intermediate', focus: 'balanced' });
    const calculatedFrequency = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
    for (const workout of plan.weekly.filter((day) => day.isTrainingDay)) {
      const trainedToday = new Set(workout.exercises.flatMap((exercise) => [...exerciseMuscleGroups(exercise)]));
      for (const group of MUSCLE_GROUPS) {
        if (trainedToday.has(group)) calculatedFrequency[group] += 1;
      }
      for (const exercise of workout.exercises) {
        assert.match(exercise.rest, /^(?:30|45|60|90) sec$|^2 min$/, `${workout.split} has a complicated rest-time label.`);
      }
    }
    assert.deepEqual(plan.muscleFrequency, calculatedFrequency, `${equipment} ${days}-day plan stored the wrong frequency summary.`);
    assertWeeklyCoverage(plan, `${equipment} ${days}-day plan`);
  }
}

const noTimePlan = generatePlan({ days: 4, equipment: 'full gym', experience: 'beginner' });
for (const focus of ['balanced', 'strength', 'muscle', 'conditioning']) {
  for (const days of [3, 4, 5, 6]) {
    const plan = generatePlan({ days, focus, equipment: 'full gym', experience: 'advanced', exercisesPerWorkout: 8 });
    assertMatchingDays(plan);
    if (days === 3) {
      const a = plan.weekly.find((day) => day.split === 'Full Body A');
      const c = plan.weekly.find((day) => day.split === 'Full Body C');
      assert.notDeepEqual(c.exercises.map((exercise) => exercise.name), a.exercises.map((exercise) => exercise.name), 'Full Body C must remain a separate generated session.');
    }
  }
}
const independentDays = generatePlan({ days: 4, equipment: 'full gym' });
const independentA = independentDays.weekly[0];
const independentB = independentDays.weekly[3];
independentB.exercises[0].sets += 1;
independentB.exercises[0].instructions[0] = 'Edited only on B';
assert.notEqual(independentA.exercises[0].sets, independentB.exercises[0].sets, 'Changing B sets must not change A.');
assert.notEqual(independentA.exercises[0].instructions[0], independentB.exercises[0].instructions[0], 'Changing B instructions must not change A.');
const legacyTimePlan = generatePlan({ days: 4, equipment: 'full gym', experience: 'beginner', duration: 20 });
assert.deepEqual(
  legacyTimePlan.weekly.map((day) => day.exercises.map(({ name, sets }) => ({ name, sets }))),
  noTimePlan.weekly.map((day) => day.exercises.map(({ name, sets }) => ({ name, sets }))),
  'A saved legacy duration must no longer change workout selection or sets.'
);

const fourDayCoverage = {
  Upper: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
  Lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core']
};
const fourDayCategories = {
  Upper: ['Push', 'Pull'],
  Lower: ['Legs', 'Lower', 'Full Body']
};
for (const equipment of equipmentModes) {
  const plan = generatePlan({ days: 4, equipment, experience: 'intermediate', focus: 'balanced' });
  for (const workout of plan.weekly.filter((day) => day.isTrainingDay)) {
    const muscleGroups = new Set(workout.exercises.flatMap((exercise) => [...exerciseMuscleGroups(exercise)]));
    for (const required of fourDayCoverage[workout.trainingType]) {
      assert.ok(muscleGroups.has(required), `${equipment} ${workout.split} is missing ${required}.`);
    }
    assert.ok(workout.exercises.every((exercise) => fourDayCategories[workout.trainingType].includes(exercise.split)),
      `${equipment} ${workout.split} includes an exercise from the wrong training split.`);
  }
}

const constrainedFourDayPlan = generatePlan({
  days: 4,
  equipment: 'home/bodyweight',
  experience: 'beginner',
  exercisesPerWorkout: 10,
  focus: 'balanced',
  limitations: 'Avoid jumping, no overhead pressing, avoid squats and lunges, avoid deadlifts.'
});
for (const workout of constrainedFourDayPlan.weekly.filter((day) => day.isTrainingDay)) {
  assert.ok(workout.exercises.length >= 1 && workout.exercises.length <= 10, 'Restricted workouts should stay within the selected limit.');
  assertDayMatchesSplit(workout);
  const counts = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
  for (const exercise of workout.exercises) for (const group of exerciseMuscleGroups(exercise)) counts[group] += 1;
  assert.ok(Object.values(counts).every((total) => total <= 2), 'Restrictions must not bypass the muscle cap.');
  const muscleGroups = new Set(workout.exercises.flatMap((exercise) => [...exerciseMuscleGroups(exercise)]));
  for (const required of fourDayCoverage[workout.trainingType]) {
    assert.ok(muscleGroups.has(required), `Constraint-aware ${workout.split} is missing ${required}.`);
  }
}

for (const days of [3, 4, 5, 6]) {
  const constrainedPlan = generatePlan({
    days,
    equipment: 'home/bodyweight',
    experience: 'beginner',
    exercisesPerWorkout: 10,
    focus: 'balanced',
    limitations: 'Avoid jumping, no overhead pressing, avoid squats and lunges, avoid deadlifts.'
  });
  assertMatchingDays(constrainedPlan);
  assertWeeklyCoverage(constrainedPlan, `Constraint-aware ${days}-day plan`);
}

const limitedPlan = generatePlan({
  days: 5,
  equipment: 'home/bodyweight',
  experience: 'beginner',
  exercisesPerWorkout: 10,
  limitations: 'Avoid jumping, no overhead pressing, avoid squats and lunges.'
});
for (const workout of limitedPlan.weekly.filter((day) => day.isTrainingDay)) {
  assert.ok(workout.exercises.length >= 1 && workout.exercises.length <= 10, 'Restricted sessions should fit the available exercise pool.');
  assertDayMatchesSplit(workout);
  const counts = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]));
  for (const exercise of workout.exercises) for (const group of exerciseMuscleGroups(exercise)) counts[group] += 1;
  assert.ok(Object.values(counts).every((total) => total <= 2), 'Limited sessions must respect the muscle cap.');
  assert.ok(workout.exercises.every((exercise) => !/jump|burpee|mountain climber|overhead|shoulder press|arnold press|pike push-up|thruster|squat|lunge/i.test(exercise.name)), `${workout.split} ignored an explicit limitation.`);
}
assert.ok(constrainedFourDayPlan.balanceNote, 'Shortened plans must explain why the requested count was unavailable.');

const searchCases = {
  'beginner dumbbell chest': (exercise) => /dumbbell/i.test(exercise.equipment) && exercise.difficulty === 'beginner' && /chest/i.test(exercise.muscle),
  'legs at home': (exercise) => /bodyweight|band/i.test(exercise.equipment) && /leg|quad|glute|hamstring|calf/i.test(exercise.muscle),
  'no equipment back': (exercise) => /bodyweight/i.test(exercise.equipment) && /back/i.test(exercise.muscle) && !/pull-up|inverted row|hanging|weighted/i.test(exercise.name),
  'resistance band pull': (exercise) => /band/i.test(exercise.equipment) && exercise.split === 'Pull'
};
for (const [query, matches] of Object.entries(searchCases)) {
  const results = searchExercises(exercises, query);
  assert.ok(results.length, `Search returned no results for “${query}”.`);
  assert.ok(results.every(matches), `Search returned an off-target result for “${query}”.`);
}

assert.equal(moderateMessage('Help me use steroids for faster gains').allowed, false, 'Unsafe drug-use instructions must be blocked.');
assert.equal(moderateMessage('Explain the health risks of steroids').allowed, true, 'Safe educational questions should remain available.');
assert.equal(normalizeCoachText('### Warmup\n* **Squats:** 2 sets\n* `Rows`: 2 sets'), 'Warmup\n• Squats: 2 sets\n• Rows: 2 sets', 'Coach Markdown must become clean plain text.');
assert.doesNotMatch(validateAnswer('**Keep it simple:**\n* Do 3 x 10 reps.'), /\*/, 'Validated coach replies must not expose asterisks.');

const maleEstimate = calculateNutrition({ weight: 180, height: 70, age: 25, sex: 'male', activity: 'moderate', goal: 'maintain' });
const femaleEstimate = calculateNutrition({ weight: 180, height: 70, age: 25, sex: 'female', activity: 'moderate', goal: 'maintain' });
assert.ok(maleEstimate.calories > femaleEstimate.calories, 'Sex-specific BMR offsets are not being applied.');
assert.equal(todayISO(new Date(2026, 0, 2, 23, 55)), '2026-01-02', 'Local calendar dates must not roll over through UTC conversion.');
for (const unsafe of ['https://outside.invalid', '//outside.invalid', '/\\outside.invalid', '/\\\\outside.invalid', '/..//outside.invalid', '/\noutside.invalid', '/\toutside.invalid', null]) {
  assert.equal(safeLocalPath(unsafe), '/planner', 'Login redirects must stay inside the app after URL normalization.');
}
assert.equal(safeLocalPath('/account?recovery=1#password'), '/account?recovery=1#password');
assert.equal(safeLocalPath('/search?q=bench press'), '/search?q=bench%20press', 'Legitimate query text should survive redirect normalization.');
assert.equal(safeLocalPath('/search/../planner'), '/planner');

assert.ok(!Object.keys(packageJson.dependencies).some((name) => name.includes('supabase')), 'Remote database SDKs must be removed.');
assert.equal(packageJson.dependencies.stripe, undefined, 'Payment SDK must remain removed.');
assert.equal(packageJson.dependencies.firebase, undefined, 'Firebase must not remain in production dependencies.');

const applicationSource = sourceFiles('src').filter((path) => /\.(js|jsx)$/.test(path)).map(read).join('\n');
assert.doesNotMatch(applicationSource, /stripe|BillingPanel|checkoutStarted|billingPortalOpened/i, 'Payment integrations must remain removed from the application.');
assert.doesNotMatch(applicationSource, /firebase/i, 'Firebase references must not remain in application source.');
assert.doesNotMatch(applicationSource, /waitlist/i, 'Unfinished signup-list references must not remain in application source.');
assert.ok(fs.existsSync(new URL('../src/app/account/page.jsx', import.meta.url)), 'Self-service account controls are missing.');
assert.doesNotMatch(applicationSource, /supabase/i, 'Application source must not retain remote database references.');
assert.match(read('src/local/database.js'), /indexedDB.open/, 'Native browser persistence is required.');
assert.match(read('src/components/DataManagement.jsx'), /Download Backup/, 'Backup controls are required.');
assert.equal(fs.existsSync(new URL('../src/app/pro/page.jsx', import.meta.url)), false, 'Old Pro route must remain removed.');
assert.equal(fs.existsSync(new URL('../src/app/upgrade/page.jsx', import.meta.url)), false, 'Old upgrade route must remain removed.');
for (const removedRoute of ['guide', 'beginner-gear', 'beginner-workout-plan']) {
  assert.equal(fs.existsSync(new URL(`../src/app/${removedRoute}/page.jsx`, import.meta.url)), false, `${removedRoute} route must remain removed.`);
}

const sidebar = read('src/components/Sidebar.jsx');
const sitemap = read('src/app/sitemap.js');
for (const removedPath of ['/guide', '/beginner-gear', '/beginner-workout-plan']) {
  assert.doesNotMatch(sidebar, new RegExp(removedPath.replace('/', '\\/')), `${removedPath} must not remain in primary navigation.`);
  assert.doesNotMatch(sitemap, new RegExp(`['\"]${removedPath.slice(1)}['\"]`), `${removedPath} must not remain in the sitemap.`);
}

assert.match(read('src/app/api/coach/route.js'), /X-OpenRouter-Title/, 'OpenRouter app attribution header is missing.');
assert.match(read('src/app/api/coach/route.js'), /openai\/gpt-5\.6-luna/, 'The coach must use the stable cost-sensitive model by default.');
assert.match(read('src/app/api/coach/route.js'), /reasoning:\s*\{\s*effort:\s*'low',\s*exclude:\s*true\s*\}/, 'The default coach model must constrain paid reasoning output.');
assert.match(read('src/app/api/coach/route.js'), /MAX_MEMORY_COUNTERS[\s\S]*while \(counters\.size >= MAX_MEMORY_COUNTERS\)/, 'The in-memory AI rate limiter must remain bounded.');
assert.match(read('.env.example'), /OPENROUTER_MODEL=openai\/gpt-5\.6-luna/, 'The example environment must use the production coach model.');

const resultsPage = read('src/app/results/page.jsx');
assert.match(resultsPage, /onTouchStart[\s\S]*onTouchEnd/, 'My Plan needs swipe navigation between workouts.');
assert.match(resultsPage, /Show previous workout[\s\S]*Show next workout/, 'My Plan needs previous and next workout controls.');
const seoArticle = read('src/components/SEOArticle.jsx');
assert.doesNotMatch(seoArticle, /FAQPage|faq\.map|faqSchema/, 'FAQ output must remain removed from public guide pages.');
assert.doesNotMatch(read('src/app/page.jsx'), />FAQ</, 'The homepage FAQ must remain removed.');
const coachChat = read('src/components/CoachChat.jsx');
const workoutForm = read('src/components/WorkoutGenerator.jsx');
assert.doesNotMatch(workoutForm, /Time per workout|\['duration'/, 'The questionnaire must not ask for workout time.');
assert.match(workoutForm, /Maximum exercises per workout/, 'The questionnaire must explain that the exercise count is a maximum.');
assert.doesNotMatch(read('src/utils/workoutGenerator.js'), /profile\.duration/, 'Workout length must not affect generation.');
assert.doesNotMatch(read('src/utils/aiSafety.js'), /profile\.duration/, 'The coach should not receive an obsolete time preference.');
assert.match(coachChat, /What can I help you train\?/, 'The assistant needs the focused chat welcome state.');
assert.match(coachChat, /Message FitLife Coach/, 'The assistant needs the bottom chat composer.');
assert.match(coachChat, /function CoachMark\(/, 'The coach needs a small consistent logo.');
assert.match(read('src/app/assistant/page.jsx'), /className="coach-page"/, 'The assistant must use its full-page layout.');
assert.match(read('src/app/globals.css'), /main > \.coach-page \+ footer \{ display:none; \}/, 'The assistant page must not render a footer below the chat.');
assert.match(read('src/app/globals.css'), /\.coach-composer textarea:focus[\s\S]*outline:none!important/, 'The coach textbox must not show a focus highlight.');
assert.match(coachChat, /lg:h-dvh/, 'The desktop assistant must fill the available viewport.');
assert.doesNotMatch(coachChat, /focus-within:(?:ring|border-cyan)/, 'The typing area must not show a cyan focus box.');
assert.match(coachChat, /resizeComposer\(event\.currentTarget\)/, 'The coach composer must grow as the user types.');
assert.match(coachChat, /!event\.nativeEvent\.isComposing/, 'Enter must not send incomplete IME text.');
assert.match(coachChat, /type="submit"[\s\S]*disabled=\{loading \|\| !input\.trim\(\)\}/, 'The send button must block empty or in-flight messages.');
for (const publicCopyFile of [
  'src/app/page.jsx',
  'src/app/terms/page.jsx',
  'src/app/assistant/page.jsx',
  'src/app/account/page.jsx',
  'src/components/DataManagement.jsx',
  'src/components/ProgressTracker.jsx'
]) {
  assert.doesNotMatch(read(publicCopyFile), /Supabase|OpenRouter|Stripe/, `${publicCopyFile} exposes an integration brand in public copy.`);
}

console.log(`Validated ${exerciseCatalog.length} searchable exercises (${skipArtwork ? 'artwork files intentionally excluded from checks' : 'artwork files checked'}), matching A/B days across 192 generated-plan combinations, equipment and split filters, two-movement muscle caps, accurate weekly coverage notes, manual replacements, starter PDF, compact plan navigation, public copy, search relevance, safety, nutrition, local dates, local data controls.`);
