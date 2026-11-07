import openExerciseArt from './openExerciseArt.json';

const illustratedOpenExercises = new Set(openExerciseArt);

const fallbackVisual = Object.freeze({
  src: '/exercises/fitlifehub-muscle-map.webp',
  label: 'Movement guide',
  focus: ['Primary working muscles']
});

export function exerciseAssetSlug(name = '') {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function exerciseFocus(exercise) {
  if (Array.isArray(exercise?.muscles) && exercise.muscles.length) return exercise.muscles;
  return exercise?.muscle ? [exercise.muscle] : fallbackVisual.focus;
}

export function getExerciseVisual(exercise) {
  if (exercise?.source === 'free-exercise-db' && !illustratedOpenExercises.has(exercise.name)) {
    return { src: null, label: 'Text guide', focus: exerciseFocus(exercise) };
  }
  const slug = exerciseAssetSlug(exercise?.name);
  if (!slug) return fallbackVisual;

  return {
    src: `/exercises/movements-v2/${slug}.webp`,
    label: 'Movement guide',
    focus: exerciseFocus(exercise)
  };
}

export function exerciseVisualAlt(exercise) {
  const targets = exerciseFocus(exercise).join(', ');
  return `Two-panel FitLifeHub illustration showing two stages of ${exercise?.name || 'this exercise'}, with ${targets} highlighted.`;
}
