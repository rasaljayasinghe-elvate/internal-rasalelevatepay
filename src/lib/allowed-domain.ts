/** Read at request time so Netlify build output does not embed the domain string. */
export function getAllowedEmailDomain(): string | undefined {
  const domain =
    process.env["ALLOWED_EMAIL_DOMAIN"] ?? process.env["ALLOWED_GOOGLE_DOMAIN"];
  const trimmed = domain?.trim().toLowerCase();
  return trimmed || undefined;
}
