export interface LicenseVerificationInput { licenseKey: string; ownerEmail: string; domain: string }
export interface LicenseProvider { verify(input: LicenseVerificationInput): Promise<{ ok: boolean; status: string; installationId?: string; message?: string }> }
export class LocalLicenseProvider implements LicenseProvider {
  async verify(input: LicenseVerificationInput) {
    return { ok: Boolean(input.licenseKey && input.ownerEmail && input.domain), status: 'local_valid', installationId: `local-${Date.now()}` };
  }
}
