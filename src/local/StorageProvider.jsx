'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeStorage } from './database';

const StorageContext = createContext({ loading: true, error: '' });
export const useStorageState = () => useContext(StorageContext);

export default function StorageProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: '', warnings: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    initializeStorage().then((warnings) => {
      if (active) setState({ loading: false, error: '', warnings });
    }, (error) => { if (active) setState({ loading: true, error: error.message, warnings: [] }); });
    return () => { active = false; };
  }, [attempt]);
  return <StorageContext.Provider value={state}>
    {(state.error || state.warnings.length > 0) && <div role="alert" className="relative z-50 bg-amber-950 p-4 text-sm text-amber-100 lg:ml-72">
      {state.error || state.warnings.join(' ')}
      {state.error && <button className="ml-4 underline" onClick={() => setAttempt((n) => n + 1)}>Retry storage</button>}
    </div>}
    {children}
  </StorageContext.Provider>;
}
