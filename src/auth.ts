export type Role = "operator" | "reader";

export type SessionUser = {
  email: string;
  name: string | null;
  role: Role;
};

/** Sign-in is off. Anyone who opens the tool can read and edit. */
const OPEN_USER: SessionUser = {
  email: "team",
  name: "Team",
  role: "operator",
};

export async function getSessionUser(): Promise<SessionUser> {
  return OPEN_USER;
}

export async function requireOperator(): Promise<SessionUser> {
  return OPEN_USER;
}
