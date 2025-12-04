import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { CreateUserRequestPayload, UserResponse } from '../models/models';
import { NotifyService } from './notify.service';
import { Router } from '@angular/router';

type TokenResponse = { accessToken: string; refreshToken?: string | null ; userResponse: UserResponse };

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private AUTH_API = 'http://localhost:8080/auth';
  private USER_API = 'http://localhost:8080/user';
  private notifyService = inject(NotifyService);
  private router = inject(Router);

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
    await this.apiCall(() => 
      this.http.put(`${this.USER_API}`, payload, {
        responseType: 'text' as 'json',
        headers: { Authorization: `Bearer ${this.getAccessToken()}` }
      })
    );
  }


  /** LOGOUT */
  logout(): void {
    this.clearTokens();
    this.router.navigate(['/login']);
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
    // Pulisci le notifiche dell'utente precedente prima di salvare le nuove
    this.notifyService.clearLocalNotifications();
    
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh != null) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }
    localStorage.setItem('user', JSON.stringify(user));
    
    // Salva le notifiche in localStorage se presenti nella UserResponse
    if (user.notifies) {
      console.log('Saving notifications:', user.notifies);
      this.notifyService.saveNotifications(user.notifies);
    } else {
      console.log('No notifies in UserResponse, initializing empty array');
      this.notifyService.saveNotifications([]);
    }
  }

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
    this.notifyService.clearLocalNotifications();
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

  async apiCall<T>( requestFn: () => Observable<T> ): Promise<T> {
    try {
      return await firstValueFrom(requestFn());
    } catch (error: any) {
      
      if (error.status === 401) {
        console.warn('Token scaduto (401), provo il refresh...');
        
        const refreshed = await this.refreshTokens();

        if (refreshed) {
          return await firstValueFrom(requestFn());
        }
      }

      if (error.status === 401) {
          this.logout(); 
      }
      
      throw error;
    }
  }
}
