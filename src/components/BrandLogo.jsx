import Image from 'next/image';

export default function BrandLogo({ size = 56, priority = false, className = '' }) {
  return (
    <Image
      src="/fitlifehub-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className={`shrink-0 rounded-2xl bg-white object-cover shadow-[0_12px_35px_rgba(239,68,68,.14)] ring-1 ring-white/20 ${className}`}
    />
  );
}
