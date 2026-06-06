// ── WebAuthn / Biometric Helper ────────────────────────────
// Private key TIDAK pernah keluar dari device (hardware chip).
// Yang disimpan: credentialId + email + password (AES-GCM encrypted)
// Encryption key di-derive dari credentialId itu sendiri via PBKDF2.

const CRED_KEY      = 'arvifund_biometric_cred'
const SESSION_KEY   = 'arvifund_biometric_session'
const RP_NAME       = 'Arvifund'

function getRpId() {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname
}

// ── Cek support ──────────────────────────────────────────────
export async function isBiometricSupported() {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricRegistered() {
  if (typeof window === 'undefined') return false
  try { return !!localStorage.getItem(CRED_KEY) } catch { return false }
}

export function getBiometricCred() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CRED_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function removeBiometricCred() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CRED_KEY)
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

// ── Base64URL helpers ────────────────────────────────────────
function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function b64ToBuf(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - b64.length % 4) % 4)
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

// ── AES-GCM encrypt/decrypt untuk simpan password ──────────
async function deriveKey(credentialId) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(credentialId),
    { name: 'PBKDF2' }, false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('arvifund-bio-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

async function encryptData(credentialId, plaintext) {
  const key = await deriveKey(credentialId)
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  return bufToB64(iv) + '.' + bufToB64(enc)
}

async function decryptData(credentialId, ciphertext) {
  const [ivB64, dataB64] = ciphertext.split('.')
  const key = await deriveKey(credentialId)
  const dec = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(ivB64) },
    key,
    b64ToBuf(dataB64)
  )
  return new TextDecoder().decode(dec)
}

// ── REGISTER ─────────────────────────────────────────────────
// Panggil setelah login email berhasil.
// Menyimpan credentialId + email + password terenkripsi.
export async function registerBiometric(userId, username, email, password) {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userIdBuf = new TextEncoder().encode(userId)

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: getRpId() },
      user: { id: userIdBuf, name: username, displayName: username },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    }
  })

  if (!credential) throw new Error('Gagal membuat credential biometrik')

  const credentialId = bufToB64(credential.rawId)

  // Enkripsi email+password pakai key yang di-derive dari credentialId
  const encryptedEmail    = await encryptData(credentialId, email)
  const encryptedPassword = await encryptData(credentialId, password)

  const credData = {
    credentialId,
    userId,
    username,
    encryptedEmail,
    encryptedPassword,
    registeredAt: new Date().toISOString(),
  }

  localStorage.setItem(CRED_KEY, JSON.stringify(credData))
  return credData
}

// ── AUTHENTICATE ─────────────────────────────────────────────
// Trigger Face ID / fingerprint, lalu re-login ke Supabase
// menggunakan email+password yang ter-dekripsi.
export async function authenticateWithBiometric(supabaseClient) {
  const cred = getBiometricCred()
  if (!cred) throw new Error('Tidak ada credential biometrik tersimpan')

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  // Ini yang trigger Face ID / fingerprint
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: getRpId(),
      allowCredentials: [{
        type: 'public-key',
        id: b64ToBuf(cred.credentialId),
        transports: ['internal'],
      }],
      userVerification: 'required',
      timeout: 60000,
    }
  })

  if (!assertion) throw new Error('Autentikasi biometrik dibatalkan')

  // Biometrik berhasil — dekripsi email + password
  const email    = await decryptData(cred.credentialId, cred.encryptedEmail)
  const password = await decryptData(cred.credentialId, cred.encryptedPassword)

  // Re-login ke Supabase (selalu fresh, tidak tergantung session)
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
  if (error) throw new Error('Login gagal: ' + error.message)
  if (!data?.session) throw new Error('Tidak dapat membuat session')

  return data.session
}
