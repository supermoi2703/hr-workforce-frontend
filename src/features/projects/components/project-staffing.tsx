"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { pendingRequests } from "../allocation-rules";
import type { Project } from "../types";
import { useAllocationRequests } from "../work-hooks";
import { ProposeAllocationDialog } from "./allocation-dialogs";
import { PersonChip } from "./badges";

/**
 * Đưa người vào dự án bằng đề xuất phân bổ có duyệt (3.4) và xem đề xuất đang chờ. Đổi %, gia hạn, kết thúc sớm của từng
 * thành viên nằm ở bảng người tham gia.
 */
export function ProjectStaffing({ project }: { project: Project }) {
  const t = useTranslations("Allocations");
  const tMembers = useTranslations("Projects.Members");
  const [proposing, setProposing] = useState(false);
  const requests = useAllocationRequests(project.id, project.can.viewAllocation);
  const pending = pendingRequests(requests.data ?? []);
  const canPropose = project.can.manageMembers && project.status === "ACTIVE";

  if (!canPropose && pending.length === 0) return null;

  return (
    <section className="grid gap-3">
      {canPropose && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setProposing(true)}>
            <UserPlusIcon /> {t("propose")}
          </Button>
          <p className="text-sm text-muted-foreground">{t("proposeShortHint")}</p>
        </div>
      )}
      {pending.length > 0 && (
        <div className="rounded-lg border">
          <h3 className="px-3 pt-3 text-sm font-medium">{t("pendingTitle", { count: pending.length })}</h3>
          <ul className="divide-y px-3">
            {pending.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <PersonChip person={request.employee} />
                </span>
                <span className="tabular-nums">{request.percent}%</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {formatDate(request.fromDate)} – {request.toDate ? formatDate(request.toDate) : tMembers("noEnd")}
                </span>
                {request.approvalRequestId && (
                  <Link
                    href={`/approvals/${encodeURIComponent(request.approvalRequestId)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t("openApproval")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ProposeAllocationDialog project={project} open={proposing} onOpenChange={setProposing} />
    </section>
  );
}
