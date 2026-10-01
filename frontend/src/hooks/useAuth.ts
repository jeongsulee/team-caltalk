// 가입·로그인·내 정보·로그아웃 훅 (FE-03). 컴포넌트는 api 대신 이 훅을 쓴다 (원칙 2.2)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import * as authApi from '../api/authApi';

export const useIsLoggedIn = () => authApi.isLoggedIn();

export const useSignup = () => useMutation({ mutationFn: authApi.signup });

export const useLogin = () => useMutation({ mutationFn: authApi.login });

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: authApi.getMe });

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (user) => queryClient.setQueryData(['me'], user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return () => {
    authApi.logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };
}
