// ============================================
// SHARED VALIDATION UTILITIES
// ============================================

// Common weak passwords / patterns to reject
const WEAK_PASSWORDS = [
  'password', 'password1', '12345678', '123456789', '1234567890',
  'qwerty', 'abc123', 'letmein', 'welcome', 'monkey',
  'admin', 'admin123', 'login', 'master', 'dragon',
  'passw0rd', 'shadow', 'sunshine', 'trustno1', 'iloveyou',
  '000000', '111111', '123123', 'password123'
];

/**
 * Validate email format:
 * - Must be lowercase
 * - Must contain @ and proper domain
 * - Rejects whitespace and common typos
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) return { valid: false, error: 'Email is required' };

  // Must be lowercase
  if (email !== email.toLowerCase()) {
    return { valid: false, error: 'Email must be in lowercase' };
  }

  // Trim check
  if (email.trim() !== email) {
    return { valid: false, error: 'Email must not contain leading or trailing spaces' };
  }

  // Standard pattern: local@domain.tld
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format. Must include @ and a valid domain' };
  }

  return { valid: true };
};

/**
 * Validate password strength:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 numeric character
 * - At least 1 special character
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) return { valid: false, error: 'Password is required' };

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 special character (!@#$%^&*...)' };
  }

  // Check for weak passwords
  const weakResult = isWeakPassword(password);
  if (weakResult.isWeak) {
    return { valid: false, error: weakResult.error };
  }

  return { valid: true };
};

/**
 * Detect common weak password patterns
 */
export const isWeakPassword = (password: string): { isWeak: boolean; error?: string } => {
  const lower = password.toLowerCase();

  // Direct match against known weak passwords
  if (WEAK_PASSWORDS.includes(lower)) {
    return { isWeak: true, error: 'Weak Password — Choose a stronger password' };
  }

  // Sequential number patterns (e.g. 12345678)
  if (/^(\d)\1+$/.test(password)) {
    return { isWeak: true, error: 'Weak Password — Avoid repeated characters' };
  }

  // Keyboard sequential patterns
  const sequences = ['qwerty', 'asdfgh', 'zxcvbn', 'abcdef'];
  for (const seq of sequences) {
    if (lower.includes(seq)) {
      return { isWeak: true, error: 'Weak Password — Avoid keyboard sequences' };
    }
  }

  return { isWeak: false };
};
