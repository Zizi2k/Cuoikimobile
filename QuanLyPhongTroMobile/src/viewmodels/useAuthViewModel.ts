import { useState, useCallback, useEffect } from "react";
import { User } from "../models/types";
import { IAuthRepository } from "../repositories/IAuthRepository";
import { ApiAuthRepository } from "../repositories/ApiAuthRepository";

const defaultRepo = new ApiAuthRepository();

export interface UseAuthViewModelOptions {
  repository?: IAuthRepository;
  autoRestore?: boolean;
}

export function useAuthViewModel(options?: UseAuthViewModelOptions) {
  const repo = options?.repository || defaultRepo;
  const autoRestore = options?.autoRestore ?? true;

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const session = await repo.getSavedSession();
      if (session.token && session.user) {
        // Validate with server
        const isValid = await repo.verifySession(session.token);
        if (isValid) {
          setToken(session.token);
          setUser(session.user);
        } else {
          // Token expired or invalid
          await repo.clearSession();
          setToken(null);
          setUser(null);
        }
      }
    } catch (err: any) {
      console.warn("Session restoration failed:", err);
    } finally {
      setIsRestoring(false);
    }
  }, [repo]);

  useEffect(() => {
    if (autoRestore) {
      const timer = setTimeout(() => {
        void restoreSession();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoRestore, restoreSession]);

  const login = useCallback(
    async (phoneOrUsername: string, password: string): Promise<boolean> => {
      if (!phoneOrUsername.trim() || !password.trim()) {
        setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
        return false;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await repo.login(phoneOrUsername.trim(), password);
        setToken(res.token);
        setUser(res.user);
        return true;
      } catch (err: any) {
        setError(err.message || "Đăng nhập không thành công");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [repo],
  );

  const register = useCallback(
    async (
      fullname: string,
      phone: string,
      password: string,
      idCard?: string,
    ): Promise<boolean> => {
      if (!fullname.trim() || !phone.trim() || !password.trim()) {
        setError("Vui lòng điền họ tên, số điện thoại và mật khẩu");
        return false;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await repo.register(
          fullname.trim(),
          phone.trim(),
          password,
          idCard?.trim(),
        );
        setToken(res.token);
        setUser(res.user);
        return true;
      } catch (err: any) {
        setError(err.message || "Đăng ký tài khoản không thành công");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [repo],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await repo.clearSession();
      setToken(null);
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  return {
    user,
    token,
    role: user?.role || null,
    isAdmin: user?.role === "admin",
    isTenant: user?.role === "tenant",
    isAuthenticated: !!token && !!user,
    isRestoring,
    loading,
    error,
    login,
    register,
    logout,
    restoreSession,
  };
}
