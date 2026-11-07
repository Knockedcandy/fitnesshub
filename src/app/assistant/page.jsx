import CoachChat from '@/components/CoachChat';

export const metadata = {
  title: 'AI Coach',
  description: 'Ask plan-aware fitness, exercise, nutrition, and recovery questions.'
};

export default function Assistant() {
  return <div className="coach-page"><CoachChat /></div>;
}
