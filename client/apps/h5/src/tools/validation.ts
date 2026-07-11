/** Validation result returned by H5 field validation tools. */
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/** Context passed when a field needs label-aware validation feedback. */
export interface ValidationContext {
  label?: string;
  required?: boolean;
}

/** Rule function used by validateByKey to keep page code free of scattered regular expressions. */
type ValidationRule = (value: string, context: ValidationContext) => ValidationResult;

/** Successful validation result shared by all rules. */
const validResult: ValidationResult = {
  isValid: true,
  message: ""
};

/** Mainland China mobile phone format used by H5 login and contact fields. */
const mobilePhonePattern = /^1[3-9]\d{9}$/;
/** Mainland China resident ID format used by local tutor certification drafts. */
const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])([0-2]\d|3[01])\d{3}[\dX]$/;

/** Field keys that should be normalized as mobile phone input. */
const mobilePhoneKeys = new Set(["phone", "contactPhone"]);
/** Field keys that should be normalized as age input. */
const ageKeys = new Set(["age", "tutorAge", "huntingAge"]);
/** Field keys that should be normalized as resident ID input. */
const idCardKeys = new Set(["idCard", "tutorIdCard", "huntingIdCard"]);

/** Builds the required-field message with the most specific visible label. */
function getRequiredMessage(label?: string) {
  return `请填写${label || "内容"}。`;
}

/** Builds the mobile-phone error message with the most specific visible label. */
function getMobilePhoneMessage(label?: string) {
  return `请输入正确的${label || "手机号"}。`;
}

/** Validates mobile phone fields, allowing empty values only when the field is optional. */
function validateMobilePhone(value: string, context: ValidationContext) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return context.required ? { isValid: false, message: getRequiredMessage(context.label || "手机号") } : validResult;
  }

  return mobilePhonePattern.test(trimmedValue)
    ? validResult
    : { isValid: false, message: getMobilePhoneMessage(context.label) };
}

/** Validates age fields, allowing empty values only when the field is optional. */
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

/** Validates resident ID fields, allowing empty values only when the field is optional. */
function validateIdCard(value: string, context: ValidationContext) {
  const trimmedValue = value.trim().toUpperCase();

  if (!trimmedValue) {
    return context.required ? { isValid: false, message: getRequiredMessage(context.label || "身份证") } : validResult;
  }

  return idCardPattern.test(trimmedValue)
    ? validResult
    : { isValid: false, message: `请输入正确的${context.label || "身份证"}。` };
}

/** Validation rule map keyed by business field key. */
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

/** Normalizes field values before they enter form state when a matching key has input constraints. */
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

/** Validates a field by key; unknown keys are treated as valid so forms can opt in gradually. */
export function validateByKey(key: string, value: string, context: ValidationContext = {}): ValidationResult {
  const rule = validationRules[key];

  if (!rule) {
    const trimmedValue = value.trim();
    return context.required && !trimmedValue ? { isValid: false, message: getRequiredMessage(context.label) } : validResult;
  }

  return rule(value, context);
}
