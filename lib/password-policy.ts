export const PASSWORD_MIN_LENGTH = 10;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`;
  }
  if (!/[a-z]/.test(password)) {
    return "パスワードに英小文字を1文字以上含めてください。";
  }
  if (!/[A-Z]/.test(password)) {
    return "パスワードに英大文字を1文字以上含めてください。";
  }
  if (!/[0-9]/.test(password)) {
    return "パスワードに数字を1文字以上含めてください。";
  }
  return null;
}

