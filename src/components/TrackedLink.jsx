'use client';
import Link from 'next/link';
import { trackEvent } from '@/utils/analytics';
export default function TrackedLink({ href, eventName, eventData = {}, className = '', sponsored = false, children, ...props }) {
  const external = /^https?:\/\//i.test(String(href));
  return <Link
    href={href}
    className={className}
    target={external ? '_blank' : undefined}
    rel={external ? `${sponsored ? 'sponsored ' : ''}noopener noreferrer`.trim() : undefined}
    onClick={() => trackEvent(eventName || 'cta_clicked', { href, ...eventData })}
    {...props}
  >{children}</Link>;
}
