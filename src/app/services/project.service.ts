import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProjectResponse } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly apiUrl = 'http://localhost:8080/project';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): { [key: string]: string } {
    const token = this.authService.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Ottiene tutti i progetti associati all’utente autenticato */
  async getProjects(): Promise<ProjectResponse[]> {
    const doRequest = () =>
      firstValueFrom(
        this.http.get<ProjectResponse[]>(this.apiUrl, {
          withCredentials: true,
          headers: this.getAuthHeaders(),
        })
      );

    try {
      // 1️ primo tentativo con il token attuale
      return await doRequest();
    } catch (error) {
      console.error('Errore nel caricamento dei progetti:', error);

      if (error instanceof HttpErrorResponse && error.status === 401) {
        console.warn('Token scaduto, provo a fare il refresh...');

        const refreshed = await this.authService.refreshTokens();

        if (!refreshed) {
          console.warn('Refresh token fallito — eseguo logout');
          this.authService.logout();
          return [];
        }

        try {
          // 3️ secondo (e ultimo) tentativo con il nuovo token
          return await doRequest();
        } catch (retryErr) {
          console.error('Errore dopo refresh nel caricamento progetti:', retryErr);
          return [];
        }
      }

      // altri errori → array vuoto
      return [];
    }
  }

  /**  Ottiene il dettaglio di un singolo progetto per ID */
  async getProjectById(id: string): Promise<ProjectResponse | null> {
    const doRequest = () =>
      firstValueFrom(
        this.http.get<ProjectResponse>(`${this.apiUrl}/${id}`, {
          withCredentials: true,
          headers: this.getAuthHeaders(),
        })
      );

    try {
      return await doRequest();
    } catch (error) {
      console.error(`Errore nel caricamento del progetto ${id}:`, error);

      if (error instanceof HttpErrorResponse && error.status === 401) {
        console.warn('Token scaduto mentre caricavo il progetto, provo il refresh...');

        const refreshed = await this.authService.refreshTokens();
        if (!refreshed) {
          console.warn('Refresh token fallito — logout');
          this.authService.logout();
          return null;
        }

        try {
          return await doRequest();
        } catch (retryErr) {
          console.error('Errore dopo refresh nel caricamento del progetto:', retryErr);
          return null;
        }
      }

      return null;
    }
  }

  /**  Crea un nuovo progetto */
  async createProject(payload: { title: string; description?: string }): Promise<ProjectResponse | null> {
    try {
      return await firstValueFrom(
        this.http.post<ProjectResponse>(this.apiUrl, payload, {
          withCredentials: true,
          headers: this.getAuthHeaders(),
        })
      );
    } catch (error) {
      console.error('Errore nella creazione del progetto:', error);
      return null;
    }
  }

  /** Aggiorna un progetto esistente */
  async updateProject(id: string, payload: { title?: string; description?: string }): Promise<ProjectResponse | null> {
    try {
      return await firstValueFrom(
        this.http.put<ProjectResponse>(`${this.apiUrl}/${id}`, payload, {
          withCredentials: true,
          headers: this.getAuthHeaders(),
        })
      );
    } catch (error) {
      console.error(`Errore nell'aggiornamento del progetto ${id}:`, error);
      return null;
    }
  }

  /**  Elimina un progetto */
  async deleteProject(id: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${id}`, {
          withCredentials: true,
          headers: this.getAuthHeaders(),
        })
      );
      return true;
    } catch (error) {
      console.error(`Errore nell'eliminazione del progetto ${id}:`, error);
      return false;
    }
  }
}