import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type TokenResponse = { accessToken: string; refreshToken: string };

export interface CreateUserRequestPayload {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private AUTH_API = 'http://localhost:8080/auth';
  private USER_API = 'http://localhost:8080/user';

  constructor(private http: HttpClient) {}

  /** LOGIN */
  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(`${this.AUTH_API}/login`, { email, password })
    );
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
  }

  /** REGISTER su /user/register — il backend risponde 200 senza body */
  async register(payload: CreateUserRequestPayload): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.USER_API}/register`, payload, {
        responseType: 'text' as 'json',
      })
    );
  }

  /** LOGOUT */
  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /** STATO */
  isLoggedIn(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** GETTERS */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
}
