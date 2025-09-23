import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FishingDataService } from "../database";
import { FishingSession, FishCatch, AppSettings } from "../types";

// Query Keys
export const queryKeys = {
  settings: ["settings"] as const,
  sessions: ["sessions"] as const,
  session: (id: string) => ["sessions", id] as const,
  sessionStats: ["sessionStats"] as const,
  catches: ["catches"] as const,
  searchSessions: (query: string) => ["sessions", "search", query] as const,
  sessionsByDateRange: (startDate: Date, endDate: Date) =>
    ["sessions", "dateRange", startDate, endDate] as const,
  sessionsByLocation: (
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number
  ) => ["sessions", "location", minLat, maxLat, minLon, maxLon] as const,
};

// Settings hooks
export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => FishingDataService.getSettings(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: AppSettings) =>
      FishingDataService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
};

// Session hooks
export const useSessions = () => {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => FishingDataService.getAllSessions(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSession = (id: string) => {
  return useQuery({
    queryKey: queryKeys.session(id),
    queryFn: () => FishingDataService.getSession(id),
    enabled: !!id,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (session: Omit<FishingSession, "id">) =>
      FishingDataService.createSession(session),
    onMutate: async (newSession) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });

      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData(queryKeys.sessions);

      // Optimistically update to the new value
      const tempId = `temp-${Date.now()}`;
      const optimisticSession: FishingSession = {
        ...newSession,
        id: tempId,
      };

      queryClient.setQueryData(
        queryKeys.sessions,
        (old: FishingSession[] = []) => [optimisticSession, ...old]
      );

      // Return a context object with the snapshotted value
      return { previousSessions };
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSessions) {
        queryClient.setQueryData(queryKeys.sessions, context.previousSessions);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<FishingSession>;
    }) => FishingDataService.updateSession(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });
      await queryClient.cancelQueries({ queryKey: queryKeys.session(id) });

      // Snapshot the previous values
      const previousSessions = queryClient.getQueryData(queryKeys.sessions);
      const previousSession = queryClient.getQueryData(queryKeys.session(id));

      // Optimistically update sessions list
      queryClient.setQueryData(
        queryKeys.sessions,
        (old: FishingSession[] = []) =>
          old.map((session) =>
            session.id === id ? { ...session, ...updates } : session
          )
      );

      // Optimistically update individual session
      queryClient.setQueryData(
        queryKeys.session(id),
        (old: FishingSession | undefined) =>
          old ? { ...old, ...updates } : old
      );

      return { previousSessions, previousSession };
    },
    onError: (_, { id }, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(queryKeys.sessions, context.previousSessions);
      }
      if (context?.previousSession) {
        queryClient.setQueryData(
          queryKeys.session(id),
          context.previousSession
        );
      }
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: queryKeys.session(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FishingDataService.deleteSession(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });
      await queryClient.cancelQueries({ queryKey: queryKeys.session(id) });

      // Snapshot the previous values
      const previousSessions = queryClient.getQueryData(queryKeys.sessions);
      const previousSession = queryClient.getQueryData(queryKeys.session(id));

      // Optimistically update sessions list
      queryClient.setQueryData(
        queryKeys.sessions,
        (old: FishingSession[] = []) =>
          old.filter((session) => session.id !== id)
      );

      // Remove individual session from cache
      queryClient.removeQueries({ queryKey: queryKeys.session(id) });

      return { previousSessions, previousSession };
    },
    onError: (_, id, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(queryKeys.sessions, context.previousSessions);
      }
      if (context?.previousSession) {
        queryClient.setQueryData(
          queryKeys.session(id),
          context.previousSession
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
};

// Session statistics
export const useSessionStats = () => {
  return useQuery({
    queryKey: queryKeys.sessionStats,
    queryFn: () => FishingDataService.getSessionStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Search sessions
export const useSearchSessions = (query: string) => {
  return useQuery({
    queryKey: queryKeys.searchSessions(query),
    queryFn: () => FishingDataService.searchSessions(query),
    enabled: !!query.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Catches hooks
export const useCatches = () => {
  return useQuery({
    queryKey: queryKeys.catches,
    queryFn: async () => {
      const sessions = await FishingDataService.getAllSessions();
      const allCatches: (FishCatch & { session: FishingSession })[] = [];

      sessions.forEach((session) => {
        session.catches.forEach((catch_) => {
          allCatches.push({
            ...catch_,
            session,
          });
        });
      });

      return allCatches;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAddCatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      fishCatch,
    }: {
      sessionId: string;
      fishCatch: Omit<FishCatch, "id">;
    }) => FishingDataService.addCatch(sessionId, fishCatch),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.catches });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
};

export const useUpdateCatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<FishCatch>;
    }) => FishingDataService.updateCatch(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: queryKeys.catches });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
};

export const useDeleteCatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FishingDataService.deleteCatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: queryKeys.catches });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
};

// Date range sessions
export const useSessionsByDateRange = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: queryKeys.sessionsByDateRange(startDate, endDate),
    queryFn: () =>
      FishingDataService.getSessionsByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Location-based sessions
export const useSessionsByLocation = (
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number
) => {
  return useQuery({
    queryKey: queryKeys.sessionsByLocation(minLat, maxLat, minLon, maxLon),
    queryFn: () =>
      FishingDataService.getSessionsByLocation(minLat, maxLat, minLon, maxLon),
    enabled: !!(minLat && maxLat && minLon && maxLon),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
