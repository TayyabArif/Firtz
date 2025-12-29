// Admin configuration
// In production, this could come from environment variables or a database

// Admin emails for initial admin setup (legacy support)
// After initial setup, use admin: true in user profile instead
export const ADMIN_EMAILS = [
  'admin@example.com',
  'developer@example.com',
  'team@getaimonitor.com',
  'write2avinash007@gmail.com'
  // Add your admin emails here (for initial setup only)
];

// Check if user is admin based on profile admin field
export function isAdmin(userProfile: { admin?: boolean } | null | undefined): boolean {
  if (!userProfile) return false;
  return userProfile.admin === true;
}

// Legacy function for email-based admin check (for initial setup)
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

