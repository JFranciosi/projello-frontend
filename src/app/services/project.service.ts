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
  ) { }

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
  async createProject(payload: { title: string; description?: string; collaborators?: string[] }): Promise<ProjectResponse | null> {
    const safePayload = {
      title: payload.title,
      description: payload.description,
      collaborators: payload.collaborators ?? []
    };

    const doRequest = async () => {
      const response = await firstValueFrom(
        this.http.post<any>(this.apiUrl, safePayload, {
          withCredentials: true,
          headers: this.getAuthHeaders(),
        })
      );
      console.log('✅ createProject - Risposta dal backend:', response);
      // Normalizza la risposta
      const normalized = this.normalizeProjectResponse(response);
      console.log('✅ createProject - Risposta normalizzata:', normalized);
      return normalized;
    };

    try {
      const result = await doRequest();
      console.log('✅ createProject - Risultato finale:', result);
      return result;
    } catch (error) {
      console.error('❌ Errore nella creazione del progetto:', error);
      
      // Se è un errore 401, prova a fare refresh del token
      if (error instanceof HttpErrorResponse && error.status === 401) {
        console.warn('Token scaduto durante la creazione, provo il refresh...');
        const refreshed = await this.authService.refreshTokens();
        if (refreshed) {
          try {
            return await doRequest();
          } catch (retryErr) {
            console.error('Errore dopo refresh nella creazione:', retryErr);
            return null;
          }
        }
      }

      return null;
    }
  }

  private normalizeProjectResponse(raw: any): ProjectResponse {
    if (!raw) {
      console.warn('normalizeProjectResponse: raw è null o undefined');
      return null as any;
    }

    let rawId: any;

    if (raw?._id && typeof raw._id === 'object' && '$oid' in raw._id) {
      rawId = raw._id.$oid;
    } else if (raw?._id) {
      rawId = raw._id;
    } else if (raw?.id) {
      rawId = raw.id;
    } else {
      // Se non c'è _id, prova a vedere se c'è un campo id in altri formati
      console.warn('normalizeProjectResponse: nessun _id trovato, raw:', raw);
      rawId = '';
    }

    const id = typeof rawId === 'string' ? rawId.trim() : String(rawId ?? '').trim();
    
    console.log('🔧 normalizeProjectResponse – rawId:', rawId, '→ id:', id, 'raw:', raw);

    const normalized: ProjectResponse = {
      ...raw,
      _id: id || rawId || raw.id || '',
      title: raw.title || '',
      description: raw.description,
      collaborators: raw.collaborators || [],
      creator: raw.creator || raw.creatorId || null,
      createdAt: raw.createdAt || raw.created_at,
      updatedAt: raw.updatedAt || raw.updated_at
    };

    return normalized;
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

  async removeCollaborator(projectId: string, userId: string): Promise<boolean> {
    console.log('Chiamata a removeCollaborator con projectId:', projectId, 'e userId:', userId);
    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/leave/${projectId}?userId=${userId}`,
          {},
          {
            observe: 'response',
            withCredentials: true,
            headers: this.getAuthHeaders(),
          }
        )
      );
      return true;
    } catch (error) {
      console.error(`Errore nella rimozione del collaboratore dal progetto ${projectId}:`, error);
      return false;
    }
  }
}