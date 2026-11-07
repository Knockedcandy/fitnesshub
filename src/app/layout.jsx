import './globals.css';
import StorageProvider from '@/local/StorageProvider';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import AnalyticsScripts from '@/components/AnalyticsScripts';
import { getSiteUrl } from '@/utils/siteUrl';

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'FitLifeHub',
  title: {
    default: 'FitLifeHub | Beginner AI Workout and Nutrition Coach',
    template: '%s | FitLifeHub'
  },
  description: 'Stop guessing what to do at the gym. Build a beginner-friendly workout plan, track progress, and get AI fitness guidance in one simple dashboard.',
  keywords: ['beginner workout plan','AI fitness coach','nutrition calculator','progress tracker','gym guide'],
  openGraph: {
    title: 'FitLifeHub Fitness Planner',
    description: 'Beginner AI workout, nutrition, and progress platform for people who feel lost at the gym.',
    url: siteUrl,
    siteName: 'FitLifeHub',
    images: [{ url: '/fitlifehub-logo.png', width: 1254, height: 1254, alt: 'FitLifeHub logo' }],
    type: 'website'
  },
  twitter: { card: 'summary', title: 'FitLifeHub Fitness Planner', description: 'Build your free beginner workout plan.', images: ['/fitlifehub-logo.png'] },
  icons: {
    icon: [{ url: '/fitlifehub-logo.png', type: 'image/png', sizes: '1254x1254' }],
    shortcut: '/fitlifehub-logo.png',
    apple: [{ url: '/fitlifehub-logo.png', type: 'image/png', sizes: '1254x1254' }]
  },
  alternates: { canonical: '/' }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AnalyticsScripts />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,.18),transparent_30%)]" />
        <StorageProvider>
        <Sidebar />
        <main className="min-h-screen lg:pl-72">
          {children}
          <Footer />
        </main>
        </StorageProvider>
      </body>
    </html>
  );
}
