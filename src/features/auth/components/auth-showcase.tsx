import { ClipboardCheckIcon, TimerIcon, TreePalmIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/shared/icon-tile";
import { cn } from "@/lib/utils";

/** Thanh xám tĩnh thay cho chữ (không dùng Skeleton vì Skeleton nhấp nháy như đang tải). */
function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-2 rounded-full bg-muted", className)} />;
}

const TILES = [
  { icon: TimerIcon, tone: "time" },
  { icon: TreePalmIcon, tone: "leave" },
  { icon: ClipboardCheckIcon, tone: "approval" },
] as const;

// Trạng thái từng ngày trong dải tuần: đã chấm công / hôm nay / chưa tới. Chỉ là hình, không phải dữ liệu.
const WEEK = ["done", "done", "done", "today", "future", "future", "future"] as const;

/**
 * Hình minh họa nửa phải trang đăng nhập: cửa sổ app HRM thu nhỏ + một thẻ nổi, dựng bằng component thật
 * nên đúng màu theme và tự đổi theo chế độ tối. Toàn bộ phần hình ẩn với trình đọc màn hình.
 */
export function AuthShowcase() {
  const t = useTranslations("Auth.Showcase");
  return (
    <div className="flex w-full max-w-lg flex-col gap-10">
      <div aria-hidden className="relative pb-12 pl-12">
        {/* Cửa sổ app */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-1.5 border-b px-3 py-2.5">
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <Bar className="ml-3 h-4 w-40 rounded-md" />
          </div>

          <div className="flex">
            <div className="flex w-24 shrink-0 flex-col gap-3 border-r p-3">
              <Bar className="w-14 bg-primary/25" />
              <Bar className="w-16" />
              <Bar className="w-12" />
              <Bar className="w-16" />
              <Bar className="w-10" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
              <Bar className="h-3 w-28 bg-muted-foreground/20" />

              <div className="grid grid-cols-3 gap-2">
                {TILES.map((tile) => (
                  <div key={tile.tone} className="flex flex-col gap-2 rounded-lg border p-2.5">
                    <IconTile icon={tile.icon} tone={tile.tone} className="size-7" />
                    <Bar className="w-10" />
                    <Bar className="h-2.5 w-14 bg-muted-foreground/20" />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 rounded-lg border p-2.5">
                <Bar className="w-16" />
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEK.map((day, index) => (
                    <span
                      key={index}
                      className={cn(
                        "h-8 rounded-md",
                        day === "done" && "bg-success/15",
                        day === "today" && "border border-primary bg-accent",
                        day === "future" && "bg-muted",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ nổi đè lên góc dưới bên trái cửa sổ */}
        <div className="absolute bottom-0 left-0 flex w-60 items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
          <IconTile icon={TreePalmIcon} tone="leave" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bar className="h-2.5 w-20 bg-muted-foreground/20" />
            <Bar className="w-14" />
          </div>
          <Badge variant="success">{t("approved")}</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2 pl-12">
        <h2 className="font-heading text-base font-semibold">{t("title")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("description")}</p>
      </div>
    </div>
  );
}
