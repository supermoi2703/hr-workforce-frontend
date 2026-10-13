import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon />
          </EmptyMedia>
          <EmptyTitle>Không tìm thấy trang</EmptyTitle>
          <EmptyDescription>Đường dẫn không tồn tại hoặc đã bị thay đổi.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Về trang chủ
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
