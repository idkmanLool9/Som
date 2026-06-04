import * as Crypto from 'expo-crypto';

/**
 * Genereert een PKCE code-verifier + code-challenge paar.
 *
 * De verifier is een willekeurige string van toegestane "unreserved" tekens
 * (RFC 7636). De challenge is de base64url-encoded SHA-256 hash daarvan.
 */
export interface PkcePair {
  verifier: string;
  challenge: string;
}

const VERIFIER_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/** Standaard base64 -> base64url (RFC 4648 §5), zonder padding. */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Willekeurige verifier van `length` tekens uit de toegestane set. */
export function generateVerifier(length = 64): string {
  const bytes = Crypto.getRandomBytes(length);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += VERIFIER_CHARSET[bytes[i] % VERIFIER_CHARSET.length];
  }
  return out;
}

/** Korte willekeurige state-parameter. */
export function generateState(length = 8): string {
  return generateVerifier(length);
}

export async function createPkcePair(): Promise<PkcePair> {
  const verifier = generateVerifier(64);
  const base64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return { verifier, challenge: toBase64Url(base64) };
}
