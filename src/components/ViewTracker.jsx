'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/utils/analytics';

export default function ViewTracker({ eventName, data = {} }) {
  const initialData = useRef(data);
  useEffect(() => { trackEvent(eventName, initialData.current); }, [eventName]);
  return null;
}
