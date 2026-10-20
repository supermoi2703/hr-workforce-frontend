import type { CurrentUser } from "@/lib/auth/types";

/** Khớp LoginRequest của backend. */
export type LoginRequest = {
  email: string;
  password: string;
};

/** Khớp AuthResponse của POST /api/auth/login và /api/auth/refresh. */
export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  /** Số giây access token còn hiệu lực. */
  expiresIn: number;
  user: CurrentUser;
};
