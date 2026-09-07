// Shared validation for staff account creation — used both client-side
// (instant feedback in the Add Account modal) and server-side (the real
// security check, in the API route). Client-side validation can always
// be bypassed by a direct API call, so the server MUST re-check
// everything here too, not just trust what the form sent.

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character.";
  return null;
}

export function validateEmail(email: string): string | null {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) return "Enter a valid email address.";
  return null;
}

// Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX
export function validatePhoneNumber(phone: string): string | null {
  const pattern = /^(09\d{9}|\+639\d{9})$/;
  if (!pattern.test(phone.replace(/[\s-]/g, ""))) {
    return "Enter a valid Philippine mobile number (e.g. 09171234567).";
  }
  return null;
}

export function validateUsername(username: string): string | null {
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) return "Username can only contain letters, numbers, underscores, and periods.";
  return null;
}
