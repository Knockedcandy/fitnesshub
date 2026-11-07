export function calculateNutrition(profile = {}) {
  const weight = Number(profile.weight) || 180;
  const height = Number(profile.height) || 70;
  const age = Number(profile.age) || 25;
  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
  const activity = activityMap[profile.activity] || 1.45;
  const sexOffset = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78;
  const minimumCalories = profile.sex === 'female' ? 1200 : profile.sex === 'male' ? 1400 : 1300;

  const weightKg = weight * 0.453592;
  const heightCm = height * 2.54;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const maintenance = Math.round(bmr * activity);
  const goalAdjustment = profile.goal === 'cut' ? -350 : profile.goal === 'bulk' ? 300 : 0;
  const calories = Math.max(minimumCalories, Math.round(maintenance + goalAdjustment));
  const proteinMultiplier = profile.goal === 'maintain' ? 0.8 : 0.9;
  const protein = Math.round(weight * proteinMultiplier);
  const fats = Math.max(40, Math.round((calories * 0.25) / 9));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4));
  const water = Math.round(weight * 0.55);

  return { maintenance, calories, protein, carbs, fats, water };
}
