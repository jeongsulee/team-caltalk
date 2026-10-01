// /api/categories (FR-08)
import { request } from './client';
import type { Category } from './types';

export const listCategories = () => request<Category[]>('GET', '/api/categories');
export const createCategory = (name: string) => request<Category>('POST', '/api/categories', { name });
export const renameCategory = (id: number, name: string) => request<Category>('PATCH', `/api/categories/${id}`, { name });
export const deleteCategory = (id: number) => request<void>('DELETE', `/api/categories/${id}`);
