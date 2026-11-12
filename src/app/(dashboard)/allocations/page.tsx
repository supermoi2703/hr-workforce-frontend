import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AllocationSchedulePage } from "@/features/projects/components/allocation-schedule-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Allocations.Schedule");
  return { title: t("title") };
}

export default function AllocationsRoute() {
  return (
    <RequireAccess access={{ permissions: ["project:read"] }}>
      <AllocationSchedulePage />
    </RequireAccess>
  );
}
