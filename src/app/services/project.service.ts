import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProjectResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private apiUrl = 'http://localhost:8080/project';

  constructor(private http: HttpClient) {}

  /**  Ottiene tutti i progetti associati all’utente autenticato */
  async getProjects(): Promise<ProjectResponse[]> {
    try {
      return await firstValueFrom(
        this.http.get<ProjectResponse[]>(this.apiUrl)
      );
    } catch (error) {
      console.error('Errore nel caricamento dei progetti:', error);
      return [];
    }
  }

  /**  Ottiene il dettaglio di un singolo progetto per ID */
  async getProjectById(id: string): Promise<ProjectResponse | null> {
    try {
      return await firstValueFrom(
        this.http.get<ProjectResponse>(`${this.apiUrl}/${id}`)
      );
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

  /** 🔹 Aggiorna un progetto esistente */
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

  /** 🔹 Elimina un progetto */
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
