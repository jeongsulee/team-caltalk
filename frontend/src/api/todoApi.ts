// /api/todos (FR-03~07)
import { request } from './client';
import type { Todo, TodoStatus } from './types';

export interface TodoFilter {
  categoryId?: number;
  status?: TodoStatus;
}

export interface TodoInput {
  title: string;
  categoryId?: number; // 미지정 시 서버가 '기본' (BR-03)
  startDate?: string;
  endDate?: string;
}

export type TodoPatch = Partial<TodoInput> & { isCompleted?: boolean };

// 값이 없는 필터는 쿼리스트링에 붙이지 않는다 (FR-07)
export function listTodos({ categoryId, status }: TodoFilter = {}) {
  const query = new URLSearchParams();
  if (categoryId !== undefined) query.set('categoryId', String(categoryId));
  if (status !== undefined) query.set('status', status);
  const qs = query.toString();
  return request<Todo[]>('GET', qs ? `/api/todos?${qs}` : '/api/todos');
}

export const getTodo = (id: number) => request<Todo>('GET', `/api/todos/${id}`);
export const createTodo = (body: TodoInput) => request<Todo>('POST', '/api/todos', body);
export const updateTodo = (id: number, patch: TodoPatch) => request<Todo>('PATCH', `/api/todos/${id}`, patch);
export const deleteTodo = (id: number) => request<void>('DELETE', `/api/todos/${id}`);
