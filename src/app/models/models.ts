export interface CreateUserRequestPayload {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  notifies: string[];
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  collaboratorsEmails?: string[];
}

export interface ProjectResponse {
  _id: any;
  title: string;
  description?: string;
  collaborators: UserResponse[];
  creator: UserResponse;
  createdAt?: string;
  updatedAt?: string;
}

export interface Phase {
  _id: string;
  project_id: string;
  title: string;
  description?: string;
  is_done?: boolean;
  wip_limit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePhaseRequest {
  title: string;
  description?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskAttachment {
  name: string;
  url?: string;
}

// Interfacce per il database (con trattini come nel JSON del backend)
export interface TaskFromDB {
  _id: string;
  'project-id'?: string;
  'phase-id': string;
  title: string;
  description?: string;
  'expiration-date'?: string;
  priority?: TaskPriority;
  attachments?: TaskAttachment[];
  assignees?: string[];
  'is-done'?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequestToDB {
  'phase-id': string;
  phaseId?: string;
  title: string;
  description?: string;
  'expiration-date'?: string;
  expirationDate?: string;
  priority?: TaskPriority;
  assignees?: string[];
  'is-done'?: boolean;
  isDone?: boolean;
}

// Interfacce per l'applicazione (con underscore per compatibilità)
export interface Task {
  _id: string;
  project_id: string;
  phase_id: string;
  title: string;
  description?: string;
  expiration_date?: string;
  priority?: TaskPriority;
  attachments?: TaskAttachment[];
  assignees?: string[];
  is_done?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  project_id: string;
  phase_id: string;
  title: string;
  description?: string;
  expiration_date?: string;
  priority?: TaskPriority;
  assignees?: string[];
}

export interface MoveTaskRequest {
  phase_id: string;
  position?: number;
}

export interface ListTasksParams {
  project_id: string;
  phase_id?: string;
}