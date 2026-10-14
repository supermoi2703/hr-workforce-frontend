import { notFound } from "next/navigation";

// Các trang /dev/* chỉ dùng khi phát triển, bản build production trả 404.
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
