/**
 * Allowed verified email domains (Google, Yahoo, Microsoft, Apple)
 * Completely eliminates disposable and temporary emails (temp-mail, 10minutemail, guerrillamail, necub, etc.)
 */
export const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "myyahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
]);

export function isAllowedEmailDomain(email: string): { valid: boolean; error?: string; domain?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Please enter a valid email address." };
  }
  const clean = email.trim().toLowerCase();
  const atIndex = clean.lastIndexOf("@");
  if (atIndex === -1 || atIndex === 0 || atIndex === clean.length - 1) {
    return { valid: false, error: "Please enter a valid email address." };
  }
  const domain = clean.slice(atIndex + 1);
  if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      domain,
      error: "Registration is restricted to verified email providers only (@gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @icloud.com). Temporary or disposable emails are strictly prohibited."
    };
  }
  return { valid: true, domain };
}
