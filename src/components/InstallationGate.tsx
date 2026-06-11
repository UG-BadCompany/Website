import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from './Router';

type InstallStatus = {
  installed: boolean;
  installerEnabled: boolean;
  companyConfigured: boolean;
  ownerCreated: boolean;
  databaseReady: boolean;
};

type CheckState =
  | { state: 'loading' }
  | { state: 'ready'; status: InstallStatus }
  | { state: 'error'; message: string };

export function InstallationGate({ children }: { children: ReactNode }) {
  const { path, push } = useRouter();
  const [check, setCheck] = useState<CheckState>({ state: 'loading' });

  useEffect(() => {
    let active = true;
    setCheck({ state: 'loading' });

    fetch('/api/install/status', { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Install status failed with HTTP ${response.status}`);
        return response.json() as Promise<InstallStatus>;
      })
      .then((status) => {
        if (active) setCheck({ state: 'ready', status });
      })
      .catch((error) => {
        if (active) setCheck({ state: 'error', message: error instanceof Error ? error.message : 'Unable to check installation status.' });
      });

    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    if (check.state !== 'ready') return;

    const inInstaller = path.startsWith('/install');
    if (!check.status.installed && !inInstaller) {
      push('/install');
      return;
    }

    if (check.status.installed && inInstaller) {
      push('/dashboard');
    }
  }, [check, path, push]);

  if (check.state === 'loading') return <InstallationLoading message="Checking installation status…" />;

  if (check.state === 'error') {
    if (path.startsWith('/install')) return <>{children}</>;
    return <InstallationLoading message={check.message} />;
  }

  if (!check.status.installed && !path.startsWith('/install')) return <InstallationLoading message="Redirecting to installer…" />;
  if (check.status.installed && path.startsWith('/install')) return <InstallationLoading message="Opening ContractorOS…" />;

  return <>{children}</>;
}

function InstallationLoading({ message }: { message: string }) {
  return <main className="install-loading"><div className="card"><p className="eyebrow">ContractorOS</p><h1>{message}</h1><p>The app checks database installation state before opening public or app routes.</p></div></main>;
}
