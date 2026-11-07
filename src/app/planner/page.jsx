import PageHeader from '@/components/PageHeader';
import WorkoutGenerator from '@/components/WorkoutGenerator';

export const metadata = { title: 'Workout Planner' };

export default function Planner() {
  return <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
    <PageHeader eyebrow="Workout questionnaire" title="Build a personalized beginner plan" description="Choose your goal, equipment, and a maximum of 5–10 exercises per training day. Set your own pace during each workout." />
    <WorkoutGenerator />
  </div>;
}
