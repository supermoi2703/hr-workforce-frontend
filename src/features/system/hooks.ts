import { useQuery } from "@tanstack/react-query";
import { getBackendHealth } from "./api";

export const systemKeys = {
  health: ["system", "health"] as const,
};

export function useBackendHealth() {
  return useQuery({
    queryKey: systemKeys.health,
    queryFn: ({ signal }) => getBackendHealth(signal),
    refetchInterval: 30_000,
    retry: false,
  });
}
