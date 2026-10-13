import { ConstructionIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "./page-header";

const OWNER_NAMES: Record<string, string> = {
  cuongvv: "Cường",
  truongnd: "Trường",
  quangnn: "Quang",
};

type ComingSoonProps = {
  title: string;
  owner?: string;
  task?: string;
};

/** Trang tạm cho mục menu chưa có màn hình thật. */
export function ComingSoon({ title, owner, task }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ConstructionIcon />
          </EmptyMedia>
          <EmptyTitle>Đang phát triển</EmptyTitle>
          <EmptyDescription>
            Chức năng này đang được xây dựng
            {task && <> (việc {task}</>}
            {owner && <>{task ? ", " : " ("}phụ trách: {OWNER_NAMES[owner] ?? owner}</>}
            {(task || owner) && ")"}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
