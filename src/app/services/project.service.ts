import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export interface ProjectResponse {
  id: string;
  title: string;
  collaborators: UserResponse[];
  creator: UserResponse;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private apiUrl = 'http://localhost:8080/project';

  constructor(private http: HttpClient) {}

  /** Legge il token ad ogni chiamata e crea gli headers Authorization */
  private getAuthHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token') ||
      '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  // 🔹 GET – tutti i progetti
  async getProjects(): Promise<ProjectResponse[]> {
    try {
      return await firstValueFrom(
        this.http.get<ProjectResponse[]>(this.apiUrl, {
          headers: this.getAuthHeaders(),
        })
      );
    } catch (error) {
      console.error('Errore nel caricamento dei progetti:', error);
      return [];
    }
  }

  // 🔹 GET – progetto singolo per ID
  async getProjectById(id: string): Promise<ProjectResponse | null> {
    try {
      return await firstValueFrom(
        this.http.get<ProjectResponse>(`${this.apiUrl}/${id}`, {
          headers: this.getAuthHeaders(),
        })
      );
    } catch (error) {
      console.error(`Errore nel caricamento del progetto ${id}:`, error);
      return null;
    }
  }
}