import { QueryClient } from '@tanstack/vue-query';
import { ApiFailure } from '@/shared/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      // 4xx won't fix itself; only retry network blips and 5xx.
      retry: (n, e) => n < 2 && !(e instanceof ApiFailure && e.status >= 400 && e.status < 500),
    },
  },
});
