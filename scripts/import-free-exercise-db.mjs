import fs from 'node:fs';
import path from 'node:path';

// Download the pinned upstream dist/exercises.json described in THIRD_PARTY_DATA.md,
// then run: node scripts/import-free-exercise-db.mjs /path/to/exercises.json
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Pass a local copy of the pinned upstream exercises.json.');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const curatedSource = fs.readFileSync(new URL('../src/data/exercises.js', import.meta.url), 'utf8');
const curated = JSON.parse(curatedSource.slice(curatedSource.indexOf('['), curatedSource.lastIndexOf(']') + 1));
const seen = new Set(curated.map((exercise) => exercise.name.toLowerCase()));
const excluded = new Set(['air bike', 'around the worlds', 'barbell hack squat', 'barbell seated calf raise', 'barbell walking lunge', 'bench sprint', 'bicycling', 'crossover reverse lunge', 'dumbbell lying pronation', 'elliptical trainer', "farmer's walk", 'fast skipping', 'flutter kicks', 'hanging leg raise', 'hip flexion with band', 'intermediate hip flexor and quad stretch', 'iron crosses (stretch)', 'jefferson squats', 'jogging, treadmill', 'kneeling forearm stretch', 'landmine linear jammer', 'leverage decline chest press']); // Generated artwork or imported target-muscle metadata failed review.
const title = (value) => String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
const labels = (values) => (Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value.trim()).map(title);
const equipmentNames = {
  'body only': 'Bodyweight', bands: 'Resistance Band', kettlebells: 'Kettlebell',
  'e-z curl bar': 'EZ Curl Bar', 'medicine ball': 'Medicine Ball', 'exercise ball': 'Exercise Ball',
  'foam roll': 'Foam Roll'
};

function splitFor(primary) {
  const muscle = primary.join(' ').toLowerCase();
  if (/chest|shoulder|tricep/.test(muscle)) return 'Push';
  if (/back|lat|trap|bicep|forearm/.test(muscle)) return 'Pull';
  if (/quad|hamstring|glute|calf|calves|adductor|abductor/.test(muscle)) return 'Legs';
  return 'Full Body';
}

const imported = [];
for (const item of source) {
  const name = String(item.name || '').trim();
  const instructions = (Array.isArray(item.instructions) ? item.instructions : [])
    .filter((step) => typeof step === 'string' && step.trim())
    .map((step) => step.replace(/<[^>]*>/g, '').trim());
  if (!name || !instructions.length || seen.has(name.toLowerCase()) || excluded.has(name.toLowerCase())) continue;
  seen.add(name.toLowerCase());
  const primary = name.toLowerCase() === 'cable hip adduction' ? ['Adductors'] : labels(item.primaryMuscles);
  const secondary = labels(item.secondaryMuscles);
  // The upstream Incline Bench Pull record says barbell, but its steps specify two dumbbells.
  const equipment = name.toLowerCase() === 'incline bench pull'
    ? 'Dumbbell'
    : equipmentNames[item.equipment] || title(item.equipment || 'None');
  imported.push({
    name,
    muscle: primary.join(' / ') || 'General fitness',
    muscles: primary,
    secondaryMuscles: secondary,
    equipment,
    difficulty: item.level === 'expert' ? 'advanced' : item.level || 'intermediate',
    split: splitFor(primary),
    description: `${title(item.category || 'Exercise')} movement targeting ${primary.join(', ') || 'general fitness'}.`,
    instructions: name === 'Dumbbell Lying Supination' ? [
      'Lie on your side on a flat bench with your head supported. Hold a very light dumbbell in your top hand, keep your elbow bent about 90 degrees, and support your forearm in front of you.',
      'Keep your elbow and upper arm still. Slowly rotate only your forearm so your palm turns upward; keep your wrist straight rather than curling it or lifting your upper arm.',
      'Pause briefly in a comfortable range, then rotate your forearm back toward the starting position with control. Repeat before changing sides.'
    ] : instructions,
    mistakes: name === 'Dumbbell Lying Supination' ? [
      'Rotating the shoulder or lifting the upper arm instead of turning the forearm.',
      'Bending the wrist or using a weight that pulls the joint beyond a comfortable range.',
      'Moving quickly or forcing the end of the rotation.'
    ] : [],
    beginnerModification: '',
    progression: '',
    alternatives: [],
    source: 'free-exercise-db',
    sourceId: String(item.id || name)
  });
}

const output = new URL('../src/data/openExercises.json', import.meta.url);
fs.writeFileSync(output, `${JSON.stringify(imported, null, 2)}\n`);
console.log(`Imported ${imported.length} exercises to ${path.basename(output.pathname)}.`);
