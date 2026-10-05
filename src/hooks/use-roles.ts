import { useQuery } from "@tanstack/react-query";
import { learningDb, type AppRole } from "@/lib/learning/db";

/**
 * The signed-in user's roles. Only used to decide what to show: the database
 * policies are what actually enforce access.
 */
export function useRoles(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AppRole[]> => {
      const { data } = await learningDb.from("user_roles").select("role").eq("user_id", userId!);
      return (data ?? []).map((row) => row.role);
    },
  });
}

export function canReviewQuestions(roles: AppRole[] | undefined): boolean {
  return !!roles && (roles.includes("reviewer") || roles.includes("admin"));
}
