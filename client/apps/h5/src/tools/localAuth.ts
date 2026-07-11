import { getStoredPasswordCredential, setStoredPasswordCredential } from "../shared/clientPageModel";

/** Local H5 test verification code shared by login, register, and settings security flows. */
export const localAuthCode = "000000";

/** Minimum password length enforced by the H5 local password setup and reset flows. */
export const localPasswordMinLength = 6;

/** Byte length of the random salt used for local H5 password hashing. */
const localPasswordSaltBytes = 16;

/** Version marker included in local H5 password hashes. */
const localPasswordHashVersion = "h5-local-password-v1";

/** Encodes binary hash or salt bytes as hex for localStorage persistence. */
function encodeHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Creates a random salt for the local H5 password credential. */
function createPasswordSalt() {
  const runtimeCrypto = globalThis.crypto;

  if (!runtimeCrypto) {
    throw new Error("当前浏览器不支持本地密码能力。");
  }

  const saltBytes = new Uint8Array(localPasswordSaltBytes);
  runtimeCrypto.getRandomValues(saltBytes);
  return encodeHex(saltBytes);
}

/** Hashes the local H5 password with phone and salt; backend password API is not available yet. */
async function createLocalPasswordHash(phone: string, password: string, salt: string) {
  const runtimeCrypto = globalThis.crypto;

  if (!runtimeCrypto?.subtle) {
    throw new Error("当前浏览器不支持本地密码校验。");
  }

  const hashInput = `${localPasswordHashVersion}:${phone}:${salt}:${password}`;
  const digest = await runtimeCrypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
  return encodeHex(new Uint8Array(digest));
}

/** Saves a local H5 password credential as a salted hash. */
export async function saveLocalPasswordCredential(phone: string, password: string) {
  const salt = createPasswordSalt();
  const passwordHash = await createLocalPasswordHash(phone, password, salt);

  setStoredPasswordCredential(phone, {
    salt,
    passwordHash,
    updatedAt: new Date().toISOString()
  });
}

/** Verifies a local H5 password credential before delegating session creation to the code login API. */
export async function verifyLocalPasswordCredential(phone: string, password: string) {
  const credential = getStoredPasswordCredential(phone);

  if (!credential) {
    return false;
  }

  const passwordHash = await createLocalPasswordHash(phone, password, credential.salt);
  return passwordHash === credential.passwordHash;
}
