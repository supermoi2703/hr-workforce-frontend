"use client";

import { AssignOvertimeButton } from "@/features/overtime/components/assign-overtime-button";
import { ProjectOvertimeTab } from "@/features/overtime/components/project-overtime-tab";
import { ProjectDetailPage } from "@/features/projects/components/project-detail-page";

/**
 * Ghép trang dự án với phần làm thêm giờ: tab "Làm thêm giờ" và nút "Giao làm thêm giờ" trong chi tiết task, chỉ cho PM.
 * Feature không import nhau, và page.tsx là Server Component nên không truyền được hàm render: việc ghép nằm ở đây.
 */
export function ProjectPage({ code }: { code: string }) {
  return (
    <ProjectDetailPage
      code={code}
      renderOvertime={(project) => (project.myRole === "PM" ? <ProjectOvertimeTab projectId={project.id} /> : null)}
      renderTaskActions={(task, project) => (
        <AssignOvertimeButton
          target={{
            taskId: task.card.id,
            taskKey: task.card.key,
            taskTitle: task.card.title,
            assignee: task.card.assignee ? { id: task.card.assignee.id, fullName: task.card.assignee.fullName } : null,
          }}
          eligibility={{
            isProjectManager: project.myRole === "PM",
            projectActive: project.status === "ACTIVE",
            taskStatus: task.card.status,
            hasSubtasks: task.children.length > 0,
          }}
        />
      )}
    />
  );
}
