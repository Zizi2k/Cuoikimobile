import { User } from "../models/types";

export interface IAuthRepository {
  login(
    phoneOrUsername: string,
    password: string,
  ): Promise<{ token: string; user: User }>;
  register(
    fullname: string,
    phone: string,
    password: string,
    idCard?: string,
  ): Promise<{ token: string; user: User }>;
  getSavedSession(): Promise<{ token: string | null; user: User | null }>;
  saveSession(token: string, user: User): Promise<void>;
  clearSession(): Promise<void>;
  verifySession(token: string): Promise<boolean>;
}
