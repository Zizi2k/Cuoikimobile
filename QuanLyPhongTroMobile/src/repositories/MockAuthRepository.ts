import { IAuthRepository } from "./IAuthRepository";
import { User } from "../models/types";

export class MockAuthRepository implements IAuthRepository {
  public savedToken: string | null = null;
  public savedUser: User | null = null;

  public mockUsers: User[] = [
    {
      id: 1,
      username: "admin",
      fullname: "Chủ Nhà Trọ An Bình",
      role: "admin",
      status: 1,
    },
    {
      id: 2,
      username: "0912345678",
      fullname: "Nguyễn Văn An",
      phone: "0912345678",
      role: "tenant",
      tenant_id: 1,
      status: 1,
    },
  ];

  public shouldFail = false;
  public errorMessage = "Lỗi xác thực giả lập";

  async login(
    phoneOrUsername: string,
    password: string,
  ): Promise<{ token: string; user: User }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const user = this.mockUsers.find(
      (u) => u.username === phoneOrUsername || u.phone === phoneOrUsername,
    );
    if (!user)
      throw new Error("Số điện thoại/tài khoản hoặc mật khẩu không chính xác.");

    const token = `mock_token_${user.id}_${Date.now()}`;
    await this.saveSession(token, user);
    return { token, user };
  }

  async register(
    fullname: string,
    phone: string,
    password: string,
    idCard?: string,
  ): Promise<{ token: string; user: User }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const newId = this.mockUsers.length + 1;
    const user: User = {
      id: newId,
      username: phone,
      fullname,
      phone,
      role: "tenant",
      tenant_id: newId,
      status: 1,
    };
    this.mockUsers.push(user);
    const token = `mock_token_${newId}_${Date.now()}`;
    await this.saveSession(token, user);
    return { token, user };
  }

  async getSavedSession(): Promise<{
    token: string | null;
    user: User | null;
  }> {
    return { token: this.savedToken, user: this.savedUser };
  }

  async saveSession(token: string, user: User): Promise<void> {
    this.savedToken = token;
    this.savedUser = user;
  }

  async clearSession(): Promise<void> {
    this.savedToken = null;
    this.savedUser = null;
  }

  async verifySession(token: string): Promise<boolean> {
    if (this.shouldFail) return false;
    return !!token && token.startsWith("mock_token_");
  }
}
