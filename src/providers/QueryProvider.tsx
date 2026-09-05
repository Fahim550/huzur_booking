'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000, // 30s base stale time
          gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });

    // 1. Search Results: 60s staleTime (frequently changing but shareable), no window focus refetch
    client.setQueryDefaults(['huzurs-search'], {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

    // 2. Personalized Dashboard Queries: 15s staleTime with background refetch on window focus
    const dashboardQueryKeys = [
      ['organizer-requests'],
      ['huzur-calendar'],
      ['huzur-dashboard'],
      ['admin-metrics'],
      ['admin-huzur-queue'],
      ['my-bookings'],
    ];
    for (const key of dashboardQueryKeys) {
      client.setQueryDefaults(key, {
        staleTime: 15 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
      });
    }

    // 3. Static Reference Data (Divisions/Districts/Upazilas): 24h staleTime
    client.setQueryDefaults(['locations'], {
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 48 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
