/**
 * User and role types for auth and access control.
 */

export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  last_sign_in: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  user: User;
  tenant: import("./tenant.js").Tenant;
  access_token: string;
}
