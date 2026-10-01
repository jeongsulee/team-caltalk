// 할일 조회·등록·수정·삭제 훅 (FR-03~07). 쿼리 키에 필터 값을 포함한다
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as todoApi from '../api/todoApi';
import type { TodoFilter, TodoPatch } from '../api/todoApi';

export const useTodos = (filter: TodoFilter = {}) =>
  useQuery({
    queryKey: ['todos', { categoryId: filter.categoryId, status: filter.status }],
    queryFn: () => todoApi.listTodos(filter),
  });

export const useTodo = (id: number) =>
  useQuery({ queryKey: ['todos', 'detail', id], queryFn: () => todoApi.getTodo(id) });

// 할일 변경 후 ['todos']로 시작하는 쿼리(목록·단건) 무효화
function useInvalidateTodos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['todos'] });
}

export function useCreateTodo() {
  const onSuccess = useInvalidateTodos();
  return useMutation({ mutationFn: todoApi.createTodo, onSuccess });
}

export function useUpdateTodo() {
  const onSuccess = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: TodoPatch }) => todoApi.updateTodo(id, patch),
    onSuccess,
  });
}

export function useDeleteTodo() {
  const onSuccess = useInvalidateTodos();
  return useMutation({ mutationFn: todoApi.deleteTodo, onSuccess });
}
