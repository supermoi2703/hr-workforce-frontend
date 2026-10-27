import { ConstructionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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

/** Trang tạm cho mục menu chưa có màn hình thật. Dùng được cả ở Server Component. */
export function ComingSoon({ title, owner, task }: ComingSoonProps) {
  const t = useTranslations("States");
  const details = [
    task && t("comingSoonTask", { task }),
    owner && t("comingSoonOwner", { owner: OWNER_NAMES[owner] ?? owner }),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ConstructionIcon />
          </EmptyMedia>
          <EmptyTitle>{t("comingSoonTitle")}</EmptyTitle>
          <EmptyDescription>
            {t("comingSoonDescription")}
            {details.length > 0 && <span className="block">{details.join(" · ")}</span>}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
