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
  firstName: string;
  lastName: string;
}

export interface ProjectResponse {
  id: string;
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

export interface Task {
  _id: string;
  project_id: string;
  phase_id: string;
  title: string;
  description?: string;
  expiration_date?: string;
  priority?: TaskPriority;
  attachments?: TaskAttachment[];
  assignees?: string[] | UserResponse[];
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
}

export interface MoveTaskRequest {
  phase_id: string;
  position?: number;
}

export interface ListTasksParams {
  project_id: string;
  phase_id?: string;
}