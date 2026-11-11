/**
 * Tasks Service & Business Logic
 * Communicates with /api/tasks backend endpoints and re-exports pure calculations.
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import { FetchTasksParams, Task, TaskStatus } from '../types';

export * from './taskCalculations';

export const taskService = {
  /** Fetches user tasks from backend */
  async fetchTasks(params?: FetchTasksParams): Promise<{ tasks: Task[]; pagination?: any }> {
    return apiClient.get<{ tasks: Task[]; pagination?: any }>(Endpoints.tasks.list, {
      params: {
        sort: params?.sort || 'dueDate',
        limit: params?.limit || 200,
        ...params,
      },
    });
  },

  /** Fetches single task by ID */
  async getTaskById(id: string): Promise<{ task: Task }> {
    return apiClient.get<{ task: Task }>(Endpoints.tasks.getById(id));
  },

  /** Creates a new task */
  async createTask(data: Partial<Task>): Promise<{ message: string; task: Task }> {
    return apiClient.post<{ message: string; task: Task }>(Endpoints.tasks.create, data);
  },

  /** Updates an existing task */
  async updateTask(id: string, data: Partial<Task>): Promise<{ message: string; task: Task }> {
    return apiClient.put<{ message: string; task: Task }>(Endpoints.tasks.update(id), data);
  },

  /** Updates only task workflow status (todo | in_progress | completed) */
  async updateTaskStatus(
    id: string,
    status: TaskStatus
  ): Promise<{ message: string; task: Task }> {
    return apiClient.put<{ message: string; task: Task }>(Endpoints.tasks.update(id), { status });
  },

  /** Deletes a task permanently */
  async deleteTask(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(Endpoints.tasks.delete(id));
  },
};

