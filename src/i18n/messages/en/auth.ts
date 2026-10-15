import type { auth as fa } from "../fa/auth";

export const auth: Record<keyof typeof fa, string> = {
  loginTitle: "Sign in to your panel",
  loginSubtitle: "Manage projects, time and contracts.",
  email: "Email",
  password: "Password",
  submit: "Sign in",
  invalid: "Invalid email or password.",
  tooMany: "Too many attempts. Try again in a few minutes.",
  setupTitle: "First-time setup",
  setupSubtitle: "Create the owner account. This page is only available once.",
  setupSubmit: "Create account & sign in",
  name: "Full name",
  passwordHint: "At least 10 characters. A long, memorable passphrase is best.",
  backToSite: "Back to site",
  clientHint: "Are you a client? Sign in with the email you were invited with.",
  showPassword: "Show password",
  hidePassword: "Hide password",
};
