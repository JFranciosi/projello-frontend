import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Phase } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PhaseService {
  private apiUrl = 'http://localhost:8080/phase';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getAuthHeaders(): { [key: string]: string } {
    const token = this.authService.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** GET /phase/{projectId} */
  getByProject(projectId: string): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${this.apiUrl}/${projectId}`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
  }

  /** POST /phase */
  createPhase(body: { title: string; projectId: string }): Observable<Phase> {
    return this.http.post<Phase>(`${this.apiUrl}`, body, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
  }

  /** PUT /phase/{id} */
  updateTitle(id: string, title: string): Observable<void> {
    const headers = {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json'
    };
    return this.http.put<void>(`${this.apiUrl}/${id}`, title, {
      headers,
      withCredentials: true,
    });
  }

  /** DELETE /phase/{id} */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
  }
}