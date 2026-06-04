// ── WebAuthn / Biometric Helper ────────────────────────────
// Menyimpan credential di localStorage device.
// Private key TIDAK pernah keluar dari device (hardware chip).
// Yang disimpan hanya credentialId (bukan password).

const STORAGE_KEY = 'arvifund_biometric_cred'
const RP_NAME     = 'Arvifund'
const RP_ID       = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

// Cek apakah browser & device mendukung WebAuthn
export async function isBiometricSupported() {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// Cek apakah user sudah pernah daftar biometrik di device ini
export function isBiometricRegistered() {
  if (typeof window === 'undefined') return false
  try {
    return !!localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

// Ambil data credential yang tersimpan
export function getBiometricCred() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Hapus credential (dari settings)
export function removeBiometricCred() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

// Helper: convert ArrayBuffer ke Base64URL string
function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Helper: convert Base64URL string ke Uint8Array
function b64ToBuf(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - b64.length % 4) % 4)
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

// ── REGISTER: panggil setelah login email berhasil ──────────
// Meminta device untuk membuat credential baru (trigger Face ID / Touch ID / fingerprint)
export async function registerBiometric(userId, username) {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userIdBuf = new TextEncoder().encode(userId)

  const publicKey = {
    challenge,
    rp: { name: RP_NAME, id: RP_ID },
    user: {
      id: userIdBuf,
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7  }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // hanya biometrik bawaan device
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  }

  const credential = await navigator.credentials.create({ publicKey })
  if (!credential) throw new Error('Gagal membuat credential biometrik')

  // Simpan hanya credentialId (bukan private key — itu tetap di device)
  const credData = {
    credentialId: bufToB64(credential.rawId),
    userId,
    username,
    registeredAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credData))
  return credData
}

// ── AUTHENTICATE: panggil saat login dengan biometrik ───────
// Trigger Face ID / Touch ID, lalu verify dengan Supabase
export async function authenticateWithBiometric(supabaseClient) {
  const cred = getBiometricCred()
  if (!cred) throw new Error('Tidak ada credential biometrik tersimpan')

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const publicKey = {
    challenge,
    rpId: RP_ID,
    allowCredentials: [{
      type: 'public-key',
      id: b64ToBuf(cred.credentialId),
      transports: ['internal'],
    }],
    userVerification: 'required',
    timeout: 60000,
  }

  // Ini yang trigger Face ID / fingerprint di device
  const assertion = await navigator.credentials.get({ publicKey })
  if (!assertion) throw new Error('Autentikasi biometrik dibatalkan')

  // Biometrik berhasil — sekarang ambil session Supabase yang masih aktif
  // atau re-login via stored session
  const { data: { session } } = await supabaseClient.auth.getSession()
  if (session) return session

  throw new Error('Session habis. Silakan login dengan email dan password terlebih dahulu.')
}
