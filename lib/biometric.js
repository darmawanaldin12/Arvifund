// ── WebAuthn / Biometric Helper ────────────────────────────
// Private key TIDAK pernah keluar dari device (hardware chip).
// Yang disimpan: credentialId + email + password (AES-GCM encrypted)

const CRED_KEY  = 'arvifund_biometric_cred'
const RP_NAME   = 'Arvifund'

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
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return false
    const cred = JSON.parse(raw)
    // Validasi: credential lama (tanpa encryptedEmail) dianggap tidak terdaftar
    if (!cred?.credentialId || !cred?.encryptedEmail || !cred?.encryptedPassword) {
      localStorage.removeItem(CRED_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function getBiometricCred() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return null
    const cred = JSON.parse(raw)
    // Kalau credential lama tidak lengkap, hapus dan return null
    if (!cred?.credentialId || !cred?.encryptedEmail || !cred?.encryptedPassword) {
      localStorage.removeItem(CRED_KEY)
      return null
    }
    return cred
  } catch {
    return null
  }
}

export function removeBiometricCred() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(CRED_KEY) } catch {}
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

// ── AES-GCM encrypt/decrypt ─────────────────────────────────
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
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return bufToB64(iv) + '.' + bufToB64(enc)
}

async function decryptData(credentialId, ciphertext) {
  // Guard: kalau ciphertext undefined/null/tidak punya titik → throw jelas
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.includes('.')) {
    throw new Error('Data credential tidak valid. Daftar ulang biometrik.')
  }
  const [ivB64, dataB64] = ciphertext.split('.')
  if (!ivB64 || !dataB64) throw new Error('Data credential korup. Daftar ulang biometrik.')
  const key = await deriveKey(credentialId)
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(ivB64) }, key, b64ToBuf(dataB64))
  return new TextDecoder().decode(dec)
}

// ── REGISTER ─────────────────────────────────────────────────
export async function registerBiometric(userId, username, email, password) {
  // Hapus credential lama dulu (termasuk yang versi lama tanpa encrypted fields)
  localStorage.removeItem(CRED_KEY)

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
export async function authenticateWithBiometric(supabaseClient) {
  const cred = getBiometricCred()
  if (!cred) {
    throw new Error('NEEDS_REREGISTER')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  let assertion
  try {
    assertion = await navigator.credentials.get({
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
  } catch (err) {
    throw err // NotAllowedError dll ditangani di caller
  }

  if (!assertion) throw new Error('Autentikasi biometrik dibatalkan')

  // Dekripsi email + password
  let email, password
  try {
    email    = await decryptData(cred.credentialId, cred.encryptedEmail)
    password = await decryptData(cred.credentialId, cred.encryptedPassword)
  } catch (err) {
    // Data korup atau credential lama — hapus dan minta daftar ulang
    removeBiometricCred()
    throw new Error('NEEDS_REREGISTER')
  }

  // Re-login ke Supabase (selalu fresh, tidak tergantung session)
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
  if (error) {
    // Password mungkin sudah berubah
    removeBiometricCred()
    throw new Error('LOGIN_FAILED: ' + error.message)
  }
  if (!data?.session) throw new Error('Tidak dapat membuat session')

  return data.session
}
