import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Phase } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PhaseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080';

  list(project_id: string): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${this.baseUrl}/projects/${project_id}/phases`);
  }

  create(project_id: string, dto: { title: string; order?: number; is_done?: boolean; wip_limit?: number }): Observable<Phase> {
    return this.http.post<Phase>(`${this.baseUrl}/projects/${project_id}/phases`, dto);
  }

  update(phase_id: string, dto: Partial<Phase>): Observable<Phase> {
    return this.http.patch<Phase>(`${this.baseUrl}/phases/${phase_id}`, dto);
  }

  reorder(items: { phase_id: string; order: number }[]): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/phases/reorder`, items);
  }

  delete(phase_id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/phases/${phase_id}`);
  }
}