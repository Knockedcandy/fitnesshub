import { redirect } from 'next/navigation';

// Preserve old bookmarks while directing visitors to the free planner.
export default function FormerPricingPage() {
  redirect('/planner');
}
