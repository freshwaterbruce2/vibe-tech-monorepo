export interface ActivateLicenseInput {
  appId: string;
  licenseKey: string;
  activationUrl?: string;
  deviceName?: string;
}

export interface ActivateLicenseResult {
  ok: true;
  appId: string;
  licenseKey: string;
  status: 'active';
  entitlement: 'desktop-license';
  activatedAt: string;
  deviceName?: string;
}

export function normalizeLicenseKey(licenseKey: string): string {
  return licenseKey.trim().toUpperCase();
}

export async function activateLicense(
  input: ActivateLicenseInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ActivateLicenseResult> {
  const licenseKey = normalizeLicenseKey(input.licenseKey);
  if (!licenseKey) {
    throw new Error('License key is required');
  }

  if (!input.activationUrl) {
    if (!licenseKey.startsWith('DEMO-')) {
      throw new Error('VITE_BILLING_ACTIVATION_URL is not set');
    }

    return {
      ok: true,
      appId: input.appId,
      licenseKey,
      status: 'active',
      entitlement: 'desktop-license',
      activatedAt: new Date().toISOString(),
      deviceName: input.deviceName,
    };
  }

  const response = await fetchImpl(input.activationUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      appId: input.appId,
      licenseKey,
      deviceName: input.deviceName,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `License activation failed with ${response.status}`);
  }

  const result = (await response.json()) as ActivateLicenseResult;
  return {
    ...result,
    licenseKey: normalizeLicenseKey(result.licenseKey),
  };
}
