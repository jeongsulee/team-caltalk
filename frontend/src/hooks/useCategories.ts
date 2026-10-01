// 카테고리 CRUD 훅 (FR-08)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as categoryApi from '../api/categoryApi';

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: categoryApi.listCategories });

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['categories'] });
}

export function useCreateCategory() {
  const onSuccess = useInvalidateCategories();
  return useMutation({ mutationFn: categoryApi.createCategory, onSuccess });
}

export function useRenameCategory() {
  const onSuccess = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => categoryApi.renameCategory(id, name),
    onSuccess,
  });
}

// BR-09: 삭제된 카테고리의 할일이 '기본'으로 옮겨지므로 할일 쿼리도 무효화
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
