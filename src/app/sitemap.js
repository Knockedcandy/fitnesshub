import { getSiteUrl } from '@/utils/siteUrl';

const routes = ['', 'planner', 'digital-products', 'first-day-at-the-gym', 'how-to-start-going-to-the-gym', 'gym-etiquette-for-beginners', 'how-much-protein-do-i-need', 'weight-loss-workout-plan', 'muscle-gain-workout-plan', 'full-body-workout-for-beginners', 'push-pull-legs-for-beginners', 'how-to-track-progress', 'best-gym-equipment-for-beginners', 'nutrition-calculator', 'progress-tracker', 'ai-fitness-coach', 'nutrition', 'progress', 'search', 'assistant', 'privacy', 'terms'];

export default function sitemap() {
  const siteUrl = getSiteUrl();
  return routes.map((route) => ({
    url: `${siteUrl}${route ? `/${route}` : ''}`,
    lastModified: new Date(),
    changeFrequency: route ? 'weekly' : 'daily',
    priority: route === '' ? 1 : route === 'planner' ? 0.9 : 0.8
  }));
}
