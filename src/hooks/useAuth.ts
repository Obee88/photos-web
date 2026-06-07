import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { User } from '../api/types'

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/auth/me').catch(() => null),
    staleTime: 5 * 60_000,
    retry: false,
  })
  return { user: user ?? null, isLoading }
}
