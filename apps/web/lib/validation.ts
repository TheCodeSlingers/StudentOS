const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function getPasswordError(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
