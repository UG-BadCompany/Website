import { api } from './api-client.js';
export async function requireInstalled() {
  const result = await api('/api/install-status');
  if (!result.ok || !result.data.installation_complete) {
    location.replace('/install/');
    return false;
  }
  return true;
}
export async function redirectIfInstalled() {
  const result = await api('/api/install-status');
  if (result.ok && result.data.installation_complete) location.replace('/dashboard/');
}
