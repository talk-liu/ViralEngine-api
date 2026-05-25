export function normalizeBaseUrl(baseUrl?: string): string {
  return baseUrl?.trim().replace(/\/+$/, '') ?? '';
}

export function buildLocalHttpsBaseUrl(host: string, port: number): string {
  return `https://${host}:${port}`;
}

export function buildOAuthCallbackUrl(baseUrl: string, platformId: string): string {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    return '';
  }

  return `${base}/api/oauth/${platformId}/callback`;
}

export function resolveOAuthRedirectUri(
  explicitUri: string | undefined,
  callbackBaseUrl: string | undefined,
  platformId: string,
): string {
  const explicit = explicitUri?.trim();
  if (explicit) {
    return explicit;
  }

  return buildOAuthCallbackUrl(callbackBaseUrl ?? '', platformId);
}
