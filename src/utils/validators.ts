export interface PasswordStrengthResult {
  score: number; // 0..4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumberOrSpecial: boolean;
  isValid: boolean;
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);
  const hasLowercase = /[a-z]/.test(password);

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasUppercase) score += 1;
  if (hasNumberOrSpecial) score += 1;
  if (hasLowercase && password.length >= 10) score += 1;

  let label: PasswordStrengthResult['label'] = 'Weak';
  if (score >= 4) label = 'Strong';
  else if (score === 3) label = 'Good';
  else if (score === 2) label = 'Fair';

  return {
    score,
    label,
    hasMinLength,
    hasUppercase,
    hasNumberOrSpecial,
    isValid: hasMinLength && hasUppercase && hasNumberOrSpecial,
  };
}

/**
 * Validates external URLs for Developer Intro contact links.
 * Allows only https:, http:, and mailto: schemes; blocks javascript:, data:, etc.
 */
export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('mailto:')) {
    const emailPart = trimmed.slice('mailto:'.length).split('?')[0];
    return isValidEmail(emailPart) ? trimmed : null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Group name must be at least 2 characters.';
  if (trimmed.length > 50) return 'Group name cannot exceed 50 characters.';
  return null;
}

export function validateAssistantInput(input: {
  name: string;
  instructions: string;
}): string | null {
  if (input.name.trim().length < 2) {
    return 'Assistant name must be at least 2 characters.';
  }
  if (input.instructions.trim().length < 10) {
    return 'System instructions must be at least 10 characters so the assistant behaves reliably.';
  }
  return null;
}
