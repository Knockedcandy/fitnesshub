export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  if (window.gtag) window.gtag('event', eventName, params);
  if (window.va) window.va('event', { name: eventName, data: params });
  if (window.clarity) window.clarity('event', eventName);
}

export const events = {
  homepageCta: 'homepage_cta_click',
  signupClick: 'signup_click',
  accountCreated: 'account_created',
  leadDownloaded: 'lead_magnet_downloaded',
  workoutGenerated: 'workout_generated',
  workoutSaved: 'workout_saved',
  nutritionTargetSaved: 'nutrition_target_saved',
  foodLogAdded: 'food_log_added',
  weightEntryAdded: 'weight_entry_added',
  prEntryAdded: 'pr_entry_added',
  progressPhotoUploaded: 'progress_photo_uploaded',
  aiCoachMessage: 'ai_coach_message_sent',
  seoCta: 'seo_article_cta_click',
  digitalProductClick: 'digital_product_click'
};
