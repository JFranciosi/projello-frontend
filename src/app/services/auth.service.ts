import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateUserRequestPayload, UserResponse } from '../models/models';

type TokenResponse = { accessToken: string; refreshToken?: string | null ; userResponse: UserResponse };

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private AUTH_API = 'http://localhost:8080/auth';
  private USER_API = 'http://localhost:8080/user';

  constructor(private http: HttpClient) { }

  /** LOGIN */
  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(`${this.AUTH_API}/login`, { email, password })
    );
    this.setTokens(res.accessToken, res.refreshToken ?? null, res.userResponse);
  }

  /** REGISTER */
  async register(payload: CreateUserRequestPayload): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.USER_API}/register`, payload, {
        responseType: 'text' as 'json',
      })
    );
  }

  /** UPDATE USER */
  async editUser(payload: CreateUserRequestPayload): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.USER_API}/edit`, payload, {
        responseType: 'text' as 'json',
        headers: {
          Authorization: `Bearer ${this.getAccessToken()}`,
        }
      })
    );
  }


  /** LOGOUT */
  logout(): void {
    this.clearTokens();
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

  /** SET/REMOVE token */
  setTokens(access: string, refresh: string | null, user: UserResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh != null) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /** REFRESH TOKENS */
  async refreshTokens(): Promise<boolean> {
    const currentRefresh = this.getRefreshToken();
    if (!currentRefresh) {
      this.clearTokens();
      return false;
    }

    try {
      const res = await firstValueFrom(
        this.http.post<TokenResponse>(
          `${this.AUTH_API}/refresh`,
          {}, // corpo vuoto
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${currentRefresh}`,
            },
          }
        )
      );

      const newAccess = res.accessToken;
      const newRefresh = res.refreshToken ?? currentRefresh;
      const user = res.userResponse;

      this.setTokens(newAccess, newRefresh, user);
      return true;
    } catch (err) {
      this.clearTokens();
      return false;
    }
  }
}
