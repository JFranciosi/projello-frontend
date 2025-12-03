import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Task, CreateTaskRequest, TaskFromDB, CreateTaskRequestToDB } from '../models/models';

export type Priority = 'high' | 'medium' | 'low';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080';

  /**
   * Converte un Task dal formato database (con trattini) al formato app (con underscore)
   */
  private taskFromDBToApp(dbTask: TaskFromDB, projectId?: string): Task {
    return {
      _id: dbTask._id,
      project_id: dbTask['project-id'] || projectId || '',
      phase_id: dbTask['phase-id'],
      title: dbTask.title,
      description: dbTask.description,
      expiration_date: dbTask['expiration-date'],
      priority: dbTask.priority,
      attachments: dbTask.attachments,
      assignees: dbTask.assignees,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt
    };
  }

  /**
   * Converte un CreateTaskRequest dal formato app (con underscore) al formato database (con trattini)
   */
  private createTaskRequestToDB(appRequest: CreateTaskRequest): CreateTaskRequestToDB {
    const dbRequest: CreateTaskRequestToDB = {
      'phase-id': appRequest.phase_id,
      title: appRequest.title,
      assignees: appRequest.assignees || []
    };

    if (appRequest.description && appRequest.description.trim()) {
      dbRequest.description = appRequest.description.trim();
    }

    if (appRequest.expiration_date && appRequest.expiration_date.trim()) {
      dbRequest['expiration-date'] = appRequest.expiration_date.trim();
    }

    if (appRequest.priority) {
      dbRequest.priority = appRequest.priority;
    }

    return dbRequest;
  }

  list(params: { project_id: string; phase_id?: string; q?: string }): Observable<Task[]> {
    let q = new HttpParams().set('project_id', params.project_id);
    if (params.phase_id) q = q.set('phase_id', params.phase_id);
    if (params.q)        q = q.set('q', params.q);
    return this.http.get<TaskFromDB[]>(`${this.baseUrl}/tasks`, { params: q })
      .pipe(
        map(tasks => tasks.map(t => this.taskFromDBToApp(t, params.project_id)))
      );
  }

  getById(id: string): Observable<Task> {
    return this.http.get<TaskFromDB>(`${this.baseUrl}/tasks/${id}`)
      .pipe(
        map(task => this.taskFromDBToApp(task))
      );
  }

  create(dto: CreateTaskRequest): Observable<Task> {
    const dbPayload = this.createTaskRequestToDB(dto);
    return this.http.post<TaskFromDB>(`${this.baseUrl}/tasks`, dbPayload)
      .pipe(
        map(task => this.taskFromDBToApp(task, dto.project_id))
      );
  }

  update(id: string, dto: Partial<Task>): Observable<Task> {
    // Converte il DTO parziale al formato database
    const dbDto: any = {};
    if (dto.phase_id !== undefined) dbDto['phase-id'] = dto.phase_id;
    if (dto.title !== undefined) dbDto.title = dto.title;
    if (dto.description !== undefined) dbDto.description = dto.description;
    if (dto.expiration_date !== undefined) {
      dbDto['expiration-date'] = dto.expiration_date && dto.expiration_date.trim() 
        ? dto.expiration_date.trim() 
        : undefined;
    }
    if (dto.priority !== undefined) dbDto.priority = dto.priority;
    if ((dto as any).assignees !== undefined) dbDto.assignees = (dto as any).assignees;

    return this.http.put<TaskFromDB>(`${this.baseUrl}/tasks/${id}`, dbDto)
      .pipe(
        map(task => this.taskFromDBToApp(task))
      );
  }

  move(id: string, payload: { phase_id: string; position: number }): Observable<Task> {
    const dbPayload = {
      'phase-id': payload.phase_id,
      position: payload.position
    };
    return this.http.patch<TaskFromDB>(`${this.baseUrl}/tasks/${id}/move`, dbPayload)
      .pipe(
        map(task => this.taskFromDBToApp(task))
      );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`);
  }
}
