'use client';

import { useState } from 'react';
import GlassCard from './GlassCard';
import { clearLocalData, exportBackup, importBackup } from '@/local/database';
import { useStorageState } from '@/local/StorageProvider';

export default function DataManagement() {
  const { loading } = useStorageState();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(null);
  const [restoreText, setRestoreText] = useState('');
  const [deleteText, setDeleteText] = useState('');

  async function download() {
    setBusy(true);setStatus('Preparing your backup, including progress photos...');
    try {
      const backup = await exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const link = document.createElement('a');link.href = url;
      link.download = `fitlifehub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);link.click();link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus('Backup download started. Keep it private; it includes your fitness data and photos.');
    } catch (error) { setStatus(error.message || 'Could not export your data.'); }
    finally { setBusy(false); }
  }
  async function chooseBackup(event) {
    const input = event.currentTarget;const file = input.files?.[0];if (!file) return;
    setPending(null);setRestoreText('');setBusy(true);
    try {
      if (file.size > 200 * 1024 * 1024) throw new Error('Choose a backup smaller than 200 MB.');
      const backup = JSON.parse(await file.text());
      if (backup?.format !== 'fitlifehub-local-backup' || backup.version !== 1) throw new Error('Choose a FitLifeHub version 1 backup.');
      setPending({ name: file.name, backup });setStatus('Backup selected. Review the replacement notice before restoring.');
    } catch (error) { setStatus(error.message || 'This file could not be read.'); }
    finally { setBusy(false);input.value = ''; }
  }
  async function restore() {
    if (!pending || restoreText !== 'RESTORE') return;
    setBusy(true);setStatus('Restoring your backup...');
    try { await importBackup(pending.backup);window.location.reload(); }
    catch (error) { setStatus(error.message || 'Restore failed. Your existing data has not been replaced.');setBusy(false); }
  }
  async function clear() {
    if (deleteText !== 'DELETE') return;
    setBusy(true);setStatus('Deleting this browser’s fitness data...');
    try { await clearLocalData();window.location.reload(); }
    catch (error) { setStatus(error.message || 'Could not delete local data.');setBusy(false); }
  }
  const disabled = busy || loading;
  return <div className="grid gap-6">
    <GlassCard><h2 className="text-2xl font-bold">Your data stays on this device</h2>
      <p className="mt-3 text-slate-300">Plans, food logs, body weight, exercise weight history, personal records, workout history, and photos are saved in this browser. No login is required and records do not automatically sync to another device.</p>
      <p className="mt-3 text-sm text-amber-100">Clearing site data, private browsing, browser cleanup, or losing this device can remove your records. Download a backup regularly and before changing browsers or website addresses. Anyone using this browser profile may access these records.</p>
    </GlassCard>
    {status && <p role="status" className="rounded-2xl bg-cyan-400/10 p-4 text-sm text-cyan-100">{status}</p>}
    <GlassCard><h2 className="text-2xl font-bold">Export a backup</h2>
      <p className="mt-3 text-slate-300">Download one JSON file with your plan, profile, nutrition targets, logs, and photos. Restore it here or in another browser running this version.</p>
      <button type="button" disabled={disabled} onClick={download} className="btn-primary mt-5 disabled:opacity-50">Download Backup</button>
    </GlassCard>
    <GlassCard><h2 className="text-2xl font-bold">Restore a backup</h2>
      <label className="mt-4 block"><span className="label">Choose backup file</span><input aria-label="Choose backup file" disabled={disabled} type="file" accept="application/json,.json" onChange={chooseBackup} className="mt-2 block w-full text-sm" /></label>
      {pending && <div className="mt-5 space-y-3 rounded-2xl bg-amber-400/10 p-4">
        <p className="break-all text-amber-100">Restoring <b>{pending.name}</b> replaces all fitness records and photos saved in this browser. Export your current data first to keep it.</p>
        <label className="block"><span className="label">Type RESTORE to replace local data</span><input className="field mt-2" value={restoreText} onChange={(event) => setRestoreText(event.target.value)} autoComplete="off" /></label>
        <button type="button" disabled={disabled || restoreText !== 'RESTORE'} onClick={restore} className="btn-secondary disabled:opacity-50">Restore Backup</button>
        <button type="button" disabled={disabled} onClick={() => { setPending(null);setRestoreText(''); }} className="ml-4 text-sm underline">Cancel</button>
      </div>}
    </GlassCard>
    <GlassCard><h2 className="text-2xl font-bold">Delete local fitness data</h2>
      <p className="mt-3 text-slate-300">Delete the plan, profile, logs, and photos saved by this app in this browser, including older local records. This does not delete backup files or data previously stored by an older online version.</p>
      <label className="mt-4 block"><span className="label">Type DELETE to confirm</span><input className="field mt-2" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} autoComplete="off" /></label>
      <button type="button" disabled={disabled || deleteText !== 'DELETE'} onClick={clear} className="btn-secondary mt-4 text-rose-200 disabled:opacity-50">Delete Local Data</button>
    </GlassCard>
  </div>;
}
