import { getStoredPasswordCredential, setStoredPasswordCredential } from "@shared/clientPageModel";

/** 登录、注册和设置安全流程共用的 H5 本地测试验证码。 */
export const localAuthCode = "000000";

/** H5 本地密码设置和重置流程要求的最小密码长度。 */
export const localPasswordMinLength = 6;

/** H5 本地密码哈希使用的随机盐字节长度。 */
const localPasswordSaltBytes = 16;

/** H5 本地密码哈希中携带的版本标记。 */
const localPasswordHashVersion = "h5-local-password-v1";

/** 将二进制哈希或盐值编码为十六进制字符串，便于写入 localStorage。 */
function encodeHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 为 H5 本地密码凭据生成随机盐值。 */
function createPasswordSalt() {
  const runtimeCrypto = globalThis.crypto;

  if (!runtimeCrypto) {
    throw new Error("当前浏览器不支持本地密码能力。");
  }

  const saltBytes = new Uint8Array(localPasswordSaltBytes);
  runtimeCrypto.getRandomValues(saltBytes);
  return encodeHex(saltBytes);
}

/** 使用手机号和盐值计算 H5 本地密码哈希，等待后端密码接口接入。 */
async function createLocalPasswordHash(phone: string, password: string, salt: string) {
  const runtimeCrypto = globalThis.crypto;

  if (!runtimeCrypto?.subtle) {
    throw new Error("当前浏览器不支持本地密码校验。");
  }

  const hashInput = `${localPasswordHashVersion}:${phone}:${salt}:${password}`;
  const digest = await runtimeCrypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
  return encodeHex(new Uint8Array(digest));
}

/** 将 H5 本地密码凭据保存为带盐哈希。 */
export async function saveLocalPasswordCredential(phone: string, password: string) {
  const salt = createPasswordSalt();
  const passwordHash = await createLocalPasswordHash(phone, password, salt);

  setStoredPasswordCredential(phone, {
    salt,
    passwordHash,
    updatedAt: new Date().toISOString()
  });
}

/** 复用验证码登录接口创建会话前，先校验 H5 本地密码凭据。 */
export async function verifyLocalPasswordCredential(phone: string, password: string) {
  const credential = getStoredPasswordCredential(phone);

  if (!credential) {
    return false;
  }

  const passwordHash = await createLocalPasswordHash(phone, password, credential.salt);
  return passwordHash === credential.passwordHash;
}
