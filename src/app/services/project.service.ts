import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProjectResponse } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly apiUrl = 'http://localhost:8080/project'; // adatta se usi environment

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /** Ottiene tutti i progetti associati all’utente autenticato */
  async getProjects(): Promise<ProjectResponse[]> {
    // funzione che esegue la chiamata con il token corrente
    const doRequest = () =>
      firstValueFrom(
        this.http.get<ProjectResponse[]>(this.apiUrl, {
          withCredentials: true,
          headers: {
            Authorization: 'Bearer ' + this.authService.getAccessToken(),
          },
        })
      );

    try {
      // 1️⃣ primo tentativo con il token attuale
      return await doRequest();
    } catch (error) {
      console.error('Errore nel caricamento dei progetti:', error);

      // 2️⃣ se è un 401 provo il refresh
      if (error instanceof HttpErrorResponse && error.status === 401) {
        console.warn('Token scaduto, provo a fare il refresh...');

        const refreshed = await this.authService.refreshTokens();

        if (!refreshed) {
          console.warn('Refresh token fallito — eseguo logout');
          this.authService.logout();
          return [];
        }

        const newAccess = this.authService.getAccessToken();
        if (!newAccess) {
          console.error('Refresh riuscito ma accessToken mancante');
          this.authService.logout();
          return [];
        }

        try {
          // 3️⃣ secondo (e ultimo) tentativo con il nuovo token
          return await doRequest();
        } catch (retryErr) {
          console.error('Errore dopo refresh nel caricamento progetti:', retryErr);
          return [];
        }
      }

      // 4️⃣ altri errori → array vuoto
      return [];
    }
  }

  /**  Ottiene il dettaglio di un singolo progetto per ID */
  async getProjectById(id: string): Promise<ProjectResponse | null> {
    try {
      return await firstValueFrom(
        this.http.get<ProjectResponse>(`${this.apiUrl}/${id}`, {
          withCredentials: true,
          credentials: 'include',
          headers: { 'Authorization' : 'Bearer' +  this.authService.getAccessToken()}
        }));
    } catch (error) {
      console.error(`Errore nel caricamento del progetto ${id}:`, error);
      return null;
    }
  }

  /**  Crea un nuovo progetto */
  async createProject(payload: { title: string; description?: string }): Promise<ProjectResponse | null> {
    try {
      return await firstValueFrom(
        this.http.post<ProjectResponse>(this.apiUrl, payload)
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
        this.http.put<ProjectResponse>(`${this.apiUrl}/${id}`, payload)
      );
    } catch (error) {
      console.error(`Errore nell'aggiornamento del progetto ${id}:`, error);
      return null;
    }
  }

  /**  Elimina un progetto */
  async deleteProject(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
      return true;
    } catch (error) {
      console.error(`Errore nell'eliminazione del progetto ${id}:`, error);
      return false;
    }
  }
}
