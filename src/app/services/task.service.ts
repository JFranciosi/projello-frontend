import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from '../models/models';

export type Priority = 'high' | 'medium' | 'low';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080';

  list(params: { project_id: string; phase_id?: string; q?: string }): Observable<Task[]> {
    let q = new HttpParams().set('project_id', params.project_id);
    if (params.phase_id) q = q.set('phase_id', params.phase_id);
    if (params.q)        q = q.set('q', params.q);
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`, { params: q });
  }

  getById(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${id}`);
  }

  create(dto: { project_id: string; phase_id: string; title: string } & Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks`, dto);
  }

  update(id: string, dto: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/tasks/${id}`, dto);
  }

  move(id: string, payload: { phase_id: string; position: number }): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/move`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`);
  }
}
