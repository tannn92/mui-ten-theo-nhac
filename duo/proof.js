// Two-iPad play (duo): room ids and key proofs, WebCrypto only (works in Safari and in Node 22 for the unit tests).
// The room's PeerJS id is derived from the game key, so only an iPad opened with the private link can compute it; on
// connect both sides prove they hold the same key without sending it.
const enc = new TextEncoder();
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

export async function roomPeerId(keyBytes, code) {
  const head = enc.encode('room|'), all = new Uint8Array(head.length + keyBytes.length);
  all.set(head); all.set(keyBytes, head.length);
  return 'mtn-' + hex(await crypto.subtle.digest('SHA-256', all)).slice(0, 10) + '-' + code;
}

export function newNonce() { return hex(crypto.getRandomValues(new Uint8Array(16))); }

export async function proofFor(keyBytes, hostId, nonce) {
  const k = await crypto.subtle.importKey('raw', keyBytes, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(`duo|${hostId}|${nonce}`)));
}

export async function checkProof(keyBytes, hostId, nonce, mac) {
  return typeof mac === 'string' && mac === await proofFor(keyBytes, hostId, nonce);
}
