/**
 * User Profile & Input Validation (src/backend/user_validation.ts)
 * 
 * Enforces strict validation on display name, bio, visibility preferences,
 * and social handles to ensure safety, length constraints, and prevent offensive terms.
 */

import { SessionVisibilityPreference, UserSocialLinks } from "../storage/user";

// Offensive or reserved keywords that cannot be used as user display names
export const FORBIDDEN_DISPLAY_NAME_PATTERNS = [
  /^(admin|administrator|root|system|sysadmin|moderator|mod|official|support|self-test|bot)$/i,
  /\b(fuck|shit|bitch|asshole|cunt|nigger|dick|pussy|faggot)\b/i,
  /^(傻逼|草泥马|操你妈|脑残|弱智|全家死光|习近平|毛泽东|共产党)$/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDisplayName(rawName?: string | null): ValidationResult {
  if (typeof rawName !== "string") {
    return { valid: false, error: "Display name is required and must be a string." };
  }

  const name = rawName.trim();

  // Length constraints: 2 to 32 characters
  if (name.length < 2) {
    return { valid: false, error: "Display name must be at least 2 characters long." };
  }
  if (name.length > 32) {
    return { valid: false, error: "Display name cannot exceed 32 characters." };
  }

  // Prevent script/HTML tags or angle brackets
  if (/<[^>]*>|[<>]/.test(name)) {
    return { valid: false, error: "Display name contains invalid HTML or script characters." };
  }

  // Prevent non-printable or control characters
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(name)) {
    return { valid: false, error: "Display name contains illegal control characters." };
  }

  // Check offensive / reserved patterns
  for (const pattern of FORBIDDEN_DISPLAY_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return { valid: false, error: "Display name contains prohibited, reserved, or offensive words." };
    }
  }

  return { valid: true };
}

export function validateBio(rawBio?: string | null): ValidationResult {
  if (rawBio === undefined || rawBio === null || rawBio === "") {
    return { valid: true };
  }
  if (typeof rawBio !== "string") {
    return { valid: false, error: "Bio must be a string." };
  }
  if (rawBio.length > 300) {
    return { valid: false, error: "Bio cannot exceed 300 characters." };
  }
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawBio)) {
    return { valid: false, error: "Bio contains disallowed script tags." };
  }
  return { valid: true };
}

export function validateVisibility(vis?: any): ValidationResult {
  if (vis === undefined || vis === null) {
    return { valid: true }; // default to existing/anonymous
  }
  const allowed: SessionVisibilityPreference[] = ["private", "anonymous", "public"];
  if (!allowed.includes(vis)) {
    return {
      valid: false,
      error: `Invalid visibility preference: '${vis}'. Must be 'private', 'anonymous', or 'public'.`,
    };
  }
  return { valid: true };
}

export function validateSocialLinks(links?: any): ValidationResult {
  if (links === undefined || links === null) {
    return { valid: true };
  }
  if (typeof links !== "object" || Array.isArray(links)) {
    return { valid: false, error: "Social links must be an object." };
  }

  for (const [key, val] of Object.entries(links)) {
    if (val !== undefined && val !== null && val !== "") {
      if (typeof val !== "string") {
        return { valid: false, error: `Social link '${key}' must be a string.` };
      }
      if (val.length > 150) {
        return { valid: false, error: `Social link '${key}' cannot exceed 150 characters.` };
      }
      if (/<[^>]*>|[<>]/.test(val)) {
        return { valid: false, error: `Social link '${key}' contains invalid characters.` };
      }
    }
  }
  return { valid: true };
}
