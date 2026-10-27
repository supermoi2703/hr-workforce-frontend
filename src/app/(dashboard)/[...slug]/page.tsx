import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getNavGroups } from "@/components/shared/app-shell/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { RequireAccess } from "@/components/shared/require-access";

// Trang tạm cho các mục menu chưa có màn hình thật. Route cụ thể (vd. app/(dashboard)/leave/page.tsx)
// luôn được ưu tiên hơn route này, nên khi tạo trang thật thì trang tạm tự mất.
// Đường dẫn không có trong menu -> 404.
export default async function PlaceholderPage({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const href = `/${slug.join("/")}`;
  const t = await getTranslations("Nav");

  for (const group of getNavGroups()) {
    const item = group.items.find((candidate) => candidate.href === href);
    if (item) {
      return (
        <RequireAccess access={item.access}>
          <ComingSoon title={t(`items.${item.id}`)} owner={item.owner ?? group.owner} task={item.task} />
        </RequireAccess>
      );
    }
  }
  notFound();
}
