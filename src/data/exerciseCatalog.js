import { exercises } from './exercises';
import openExercises from './openExercises.json';

// The curated set powers automatic plans; the wider catalog powers search and manual swaps.
export const exerciseCatalog = [...exercises, ...openExercises];
