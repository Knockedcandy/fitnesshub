# Free Exercise DB text data

The expanded exercise catalog includes a transformed snapshot of
[yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db),
commit `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`.
The source file is `dist/exercises.json` (SHA-256
`5bb747e3fc658f095a60dcbf6d53c96627acdcc6ffb6fffde86f7e26995d40bf`).
Its [LICENSE.md](https://github.com/yuhonas/free-exercise-db/blob/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/LICENSE.md)
uses the Unlicense. The source reports 876 records.

`src/data/openExercises.json` keeps names, primary and secondary muscle labels,
equipment, difficulty, category-derived description, and written instructions.
The import drops incomplete records and name duplicates already in FitLifeHub,
and excludes Air Bike because its alternating movement could not be illustrated reliably.
It excludes all image paths and does not download or display upstream images.
FitLifeHub's 78 original movement guides are retained. 373 independently
generated FitLifeHub-style two-panel illustrations for imported entries are
listed in `src/data/openExerciseArt.json`; the rest remain text-only while
artwork is developed and reviewed in batches. All imported entries are
available through search and manual substitutions.

To refresh the snapshot, download the pinned `dist/exercises.json` and run
`node scripts/import-free-exercise-db.mjs /path/to/exercises.json`.
Review any changed text and license before using a different commit.

The imported Dumbbell Lying Supination steps were corrected to describe forearm
rotation rather than shoulder rotation. The importer preserves that correction.
Technique reference: [ACE forearm supination and pronation](https://www.acefitness.org/resources/everyone/exercise-library/31/wrist-supination-and-pronation/).
