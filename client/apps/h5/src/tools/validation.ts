/** H5 字段校验工具返回的结果。 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/** 字段需要基于展示名称输出校验反馈时传入的上下文。 */
export interface ValidationContext {
  label?: string;
  required?: boolean;
}

/** validateByKey 使用的规则函数，用于避免页面散落正则。 */
type ValidationRule = (value: string, context: ValidationContext) => ValidationResult;

/** 所有规则共用的校验成功结果。 */
const validResult: ValidationResult = {
  isValid: true,
  message: ""
};

/** H5 登录和联系字段使用的中国大陆手机号格式。 */
const mobilePhonePattern = /^1[3-9]\d{9}$/;
/** 本地家教认证草稿使用的中国大陆居民身份证格式。 */
const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])([0-2]\d|3[01])\d{3}[\dX]$/;

/** 需要按手机号输入归一化的字段 key。 */
const mobilePhoneKeys = new Set(["phone", "contactPhone"]);
/** 需要按年龄输入归一化的字段 key。 */
const ageKeys = new Set(["age", "tutorAge", "huntingAge"]);
/** 需要按身份证输入归一化的字段 key。 */
const idCardKeys = new Set(["idCard", "tutorIdCard", "huntingIdCard"]);

/** 按最具体展示名称生成必填提示。 */
function getRequiredMessage(label?: string) {
  return `请填写${label || "内容"}。`;
}

/** 按最具体展示名称生成手机号错误提示。 */
function getMobilePhoneMessage(label?: string) {
  return `请输入正确的${label || "手机号"}。`;
}

/** 校验手机号字段，仅在字段非必填时允许空值。 */
function validateMobilePhone(value: string, context: ValidationContext) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return context.required ? { isValid: false, message: getRequiredMessage(context.label || "手机号") } : validResult;
  }

  return mobilePhonePattern.test(trimmedValue)
    ? validResult
    : { isValid: false, message: getMobilePhoneMessage(context.label) };
}

/** 校验年龄字段，仅在字段非必填时允许空值。 */
function validateAge(value: string, context: ValidationContext) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return context.required ? { isValid: false, message: getRequiredMessage(context.label || "年龄") } : validResult;
  }

  const age = Number(trimmedValue);
  return Number.isInteger(age) && age >= 1 && age <= 100
    ? validResult
    : { isValid: false, message: `请输入正确的${context.label || "年龄"}。` };
}

/** 校验身份证字段，仅在字段非必填时允许空值。 */
function validateIdCard(value: string, context: ValidationContext) {
  const trimmedValue = value.trim().toUpperCase();

  if (!trimmedValue) {
    return context.required ? { isValid: false, message: getRequiredMessage(context.label || "身份证") } : validResult;
  }

  return idCardPattern.test(trimmedValue)
    ? validResult
    : { isValid: false, message: `请输入正确的${context.label || "身份证"}。` };
}

/** 按业务字段 key 建立的校验规则表。 */
const validationRules: Record<string, ValidationRule> = {
  phone: validateMobilePhone,
  contactPhone: validateMobilePhone,
  age: validateAge,
  tutorAge: validateAge,
  huntingAge: validateAge,
  idCard: validateIdCard,
  tutorIdCard: validateIdCard,
  huntingIdCard: validateIdCard
};

/** 字段进入表单状态前，按 key 对有输入约束的值做归一化。 */
export function normalizeByKey(key: string, value: string) {
  if (mobilePhoneKeys.has(key)) {
    return value.replace(/\D/g, "").slice(0, 11);
  }

  if (ageKeys.has(key)) {
    return value.replace(/\D/g, "").slice(0, 3);
  }

  if (idCardKeys.has(key)) {
    return value.replace(/[^\dXx]/g, "").slice(0, 18).toUpperCase();
  }

  return value;
}

/** 按 key 校验字段；未知 key 默认视为合法，便于表单渐进接入规则。 */
export function validateByKey(key: string, value: string, context: ValidationContext = {}): ValidationResult {
  const rule = validationRules[key];

  if (!rule) {
    const trimmedValue = value.trim();
    return context.required && !trimmedValue ? { isValid: false, message: getRequiredMessage(context.label) } : validResult;
  }

  return rule(value, context);
}
