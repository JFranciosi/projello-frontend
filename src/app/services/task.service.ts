import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Task, CreateTaskRequest, TaskFromDB, CreateTaskRequestToDB } from '../models/models';
import { AuthService } from './auth.service';

export type Priority = 'high' | 'medium' | 'low';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'http://localhost:8080';

  private getHeaders(): { [key: string]: string } {
    const token = this.auth.getAccessToken();
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }

  /**
   * Converte un Task dal formato database (con trattini) al formato app (con underscore)
   */
  // In service/task.service.ts

  private taskFromDBToApp(dbTask: any, projectId?: string): Task {
    let realId = '';

    if (dbTask.id) {
      realId = dbTask.id;
    } 
    else if (typeof dbTask._id === 'string') {
      realId = dbTask._id;
    }
    else if (dbTask._id && dbTask._id.$oid) {
      realId = dbTask._id.$oid;
    }
    else if (dbTask._id) {
      realId = dbTask._id.toString();
    }

    return {
      _id: realId,
      project_id: dbTask['project-id'] || dbTask.projectId || projectId || '',
      phase_id: dbTask['phase-id'] || dbTask.phaseId, 
      title: dbTask.title,
      description: dbTask.description,
      expiration_date: dbTask['expiration-date'] || dbTask.expirationDate,
      priority: dbTask.priority,
      attachments: dbTask.attachments,
      assignees: dbTask.assignees,
      is_done: dbTask['is-done'] || dbTask.isDone || dbTask.done, // Anche qui controlliamo tutte le varianti
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt
    };
  }

  /**
   * Converte un CreateTaskRequest dal formato app (con underscore) al formato database (con trattini)
   */
  private createTaskRequestToDB(appRequest: CreateTaskRequest): CreateTaskRequestToDB {
    const dbRequest: any = {
      title: appRequest.title,
      assignees: appRequest.assignees || [],
      'is-done': false,
      isDone: false // Fallback
    };

    if (appRequest.phase_id && appRequest.phase_id !== 'null') {
      dbRequest['phase-id'] = appRequest.phase_id;
      dbRequest.phaseId = appRequest.phase_id; // Fallback
    }

    if (appRequest.description && appRequest.description.trim()) {
      dbRequest.description = appRequest.description.trim();
    }

    if (appRequest.expiration_date && appRequest.expiration_date.trim()) {
      dbRequest['expiration-date'] = appRequest.expiration_date.trim();
      dbRequest.expirationDate = appRequest.expiration_date.trim(); // Fallback
    }

    // Priority removed to strictly follow user requirements
    // if (appRequest.priority) {
    //   dbRequest.priority = appRequest.priority;
    // }

    return dbRequest as CreateTaskRequestToDB;
  }

  list(params: { project_id: string; phase_id?: string; q?: string }): Observable<Task[]> {
    let q = new HttpParams().set('project_id', params.project_id);
    if (params.phase_id) q = q.set('phase_id', params.phase_id);
    if (params.q) q = q.set('q', params.q);
    return this.http.get<TaskFromDB[]>(`${this.baseUrl}/task`, { params: q })
      .pipe(
        map(tasks => tasks.map(t => this.taskFromDBToApp(t, params.project_id)))
      );
  }

  getById(id: string): Observable<Task> {
    return this.http.get<TaskFromDB>(`${this.baseUrl}/task/${id}`)
      .pipe(
        map(task => this.taskFromDBToApp(task))
      );
  }

  async create(dto: CreateTaskRequest): Promise<Task> {
    const dbPayload = this.createTaskRequestToDB(dto);
    return this.auth.apiCall<Task>(() => {
      return this.http.post<any>(`${this.baseUrl}/task`, dbPayload, { headers: this.getHeaders() })
        .pipe(
          map(task => this.taskFromDBToApp(task, dto.project_id))
        );
    });
  }

  update(id: string, dto: Partial<Task>): Observable<Task> {
    const dbDto: any = {};

    if (dto.phase_id !== undefined) dbDto['phase-id'] = dto.phase_id;
    if (dto.title !== undefined) dbDto.title = dto.title;
    if (dto.description !== undefined) dbDto.description = dto.description;
    
    if (dto.expiration_date !== undefined) {
      dbDto['expiration-date'] = dto.expiration_date && dto.expiration_date.trim()
        ? dto.expiration_date.trim()
        : undefined;
    }

    if (dto.assignees !== undefined) dbDto.assignees = dto.assignees;

    if (dto.is_done !== undefined) {
      dbDto['is-done'] = dto.is_done;
      dbDto.isDone = dto.is_done;
      dbDto.done = dto.is_done;
    }

    return this.http.put<any>(`${this.baseUrl}/task/${id}`, dbDto)
      .pipe(
        map(task => this.taskFromDBToApp(task))
      );
  }

  move(id: string, payload: { phase_id: string; position: number }): Observable<Task> {
    const dbPayload = {
      'phase-id': payload.phase_id,
      position: payload.position
    };
    return this.http.patch<TaskFromDB>(`${this.baseUrl}/task/${id}/move`, dbPayload)
      .pipe(
        map(task => this.taskFromDBToApp(task))
      );
  }

  async delete(id: string): Promise<void> {
    return this.auth.apiCall<void>(() => {
      return this.http.delete<void>(`${this.baseUrl}/task/${id}`, { headers: this.getHeaders() });
    });
  }

  async getByPhaseId(phaseId: string): Promise<Task[]> {
    return this.auth.apiCall<Task[]>(() => {
      return this.http.get<any[]>(`${this.baseUrl}/task/${phaseId}`, { headers: this.getHeaders() })
        .pipe(
          map(tasks => tasks.map(t => this.taskFromDBToApp(t)))
        );
    });
  }

  async markAsDone(id: string): Promise<void> {
    return this.auth.apiCall<void>(() => {
      return this.http.put<void>(`${this.baseUrl}/task/${id}/complete`, {}, { headers: this.getHeaders() });
    });
  }

  async markAsIncomplete(id: string): Promise<void> {
    return this.auth.apiCall<void>(() => {
      return this.http.put<void>(`${this.baseUrl}/task/${id}/incomplete`, {}, { headers: this.getHeaders() });
    });
  }
}
