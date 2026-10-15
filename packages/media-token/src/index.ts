export interface MediaTokenPayload {
  mediaKey: string;
  exp: number; // unix timestamp in seconds
}

export async function signMediaToken(
  payload: MediaTokenPayload,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payloadB64),
  );

  const sigB64 = Buffer.from(signature).toString('base64url');
  return `${payloadB64}.${sigB64}`;
}

export async function verifyMediaToken(
  token: string,
  secret: string,
  nowUnixSec: number = Math.floor(Date.now() / 1000),
): Promise<MediaTokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const payloadB64 = parts[0];
  const sigB64 = parts[1];
  if (!payloadB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBuf = Buffer.from(sigB64, 'base64url');
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuf,
      enc.encode(payloadB64),
    );

    if (!isValid) return null;

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr) as MediaTokenPayload;

    if (payload.exp < nowUnixSec) {
      return null; // expired
    }

    return payload;
  } catch {
    return null;
  }
}
