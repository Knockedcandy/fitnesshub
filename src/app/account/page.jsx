import DataManagement from '@/components/DataManagement';
import PageHeader from '@/components/PageHeader';

export const metadata = { title: 'My Data', description: 'Export, restore, and manage your fitness data on this device.' };

export default function AccountPage() {
  return <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
    <PageHeader eyebrow="On this device" title="My Data" description="Back up your plan, food logs, progress, and photos. No account is needed." />
    <DataManagement />
  </div>;
}
