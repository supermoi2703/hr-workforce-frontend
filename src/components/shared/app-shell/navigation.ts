import {
  BadgeCheckIcon,
  BrainCircuitIcon,
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  FileSignatureIcon,
  FlaskConicalIcon,
  GaugeIcon,
  HouseIcon,
  KeyRoundIcon,
  LayersIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  TreePalmIcon,
  PaletteIcon,
  ReceiptTextIcon,
  ScanFaceIcon,
  SparklesIcon,
  TimerIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import type { Access } from "@/lib/auth/types";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Ai thấy mục này. Bỏ trống = mọi người đã đăng nhập. Backend vẫn phải tự kiểm tra quyền. */
  access?: Access;
  /** Mã việc trong docs/04 (repo backend), hiện ở trang "Đang phát triển". */
  task?: string;
  badge?: string;
  /** Người phụ trách mục này, khi khác người phụ trách cả nhóm. */
  owner?: Owner;
};

type Owner = "cuongvv" | "truongnd" | "quangnn";

export type NavGroup = {
  label: string;
  /** Người phụ trách nhóm menu: chỉ người này sửa các mục trong nhóm. */
  owner: Owner;
  items: NavItem[];
  /** Chỉ hiện khi chạy dev (`next dev`). */
  devOnly?: boolean;
};

const MANAGEMENT: Access = { roles: ["ADMIN", "HR", "MANAGER"] };
const HR_ONLY: Access = { roles: ["ADMIN", "HR"] };

/**
 * Menu chính. Mỗi mục trỏ tới một route trong src/app/(dashboard)/.
 * Mục chưa có trang thật sẽ tự hiện trang "Đang phát triển"; khi làm xong chỉ cần tạo page.tsx
 * đúng đường dẫn, không phải sửa gì ở đây (trừ khi đổi tên/quyền).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tổng quan",
    owner: "quangnn",
    items: [
      { title: "Trang chủ", href: "/", icon: HouseIcon },
      { title: "Dashboard", href: "/dashboard", icon: GaugeIcon, access: MANAGEMENT, task: "3.6" },
      { title: "Việc cần duyệt", href: "/approvals", icon: ClipboardCheckIcon, task: "1.6.2", owner: "cuongvv" },
    ],
  },
  {
    label: "Nhân sự",
    owner: "cuongvv",
    items: [
      { title: "Nhân viên", href: "/employees", icon: UsersIcon, access: MANAGEMENT, task: "1.4" },
      { title: "Hợp đồng", href: "/contracts", icon: FileSignatureIcon, access: HR_ONLY, task: "1.5" },
    ],
  },
  {
    label: "Công & Lương",
    owner: "truongnd",
    items: [
      { title: "Chấm công", href: "/attendance", icon: TimerIcon, task: "2.2" },
      { title: "Bảng công", href: "/timesheets", icon: CalendarDaysIcon, task: "2.3" },
      { title: "Nghỉ phép & WFH", href: "/leave", icon: TreePalmIcon, task: "2.4, 2.5" },
      { title: "Lương", href: "/payroll", icon: WalletIcon, access: HR_ONLY, task: "2.7, 2.8" },
      { title: "Phiếu lương", href: "/payslips", icon: ReceiptTextIcon, task: "2.9" },
    ],
  },
  {
    label: "Tổ chức & Workforce",
    owner: "quangnn",
    items: [
      { title: "Tổ chức", href: "/organization", icon: NetworkIcon, task: "1.3" },
      { title: "Lịch văn phòng", href: "/office-calendar", icon: CalendarClockIcon, access: HR_ONLY, task: "2.1" },
      { title: "Kỹ năng", href: "/skills", icon: BadgeCheckIcon, task: "3.9" },
      { title: "Dự án", href: "/projects", icon: BriefcaseBusinessIcon, task: "3.1, 3.2" },
      { title: "Phân bổ nhân sự", href: "/allocations", icon: LayersIcon, access: MANAGEMENT, task: "3.4" },
    ],
  },
  {
    label: "Thử nghiệm AI",
    owner: "cuongvv",
    items: [
      { title: "Chấm công khuôn mặt", href: "/lab/face", icon: ScanFaceIcon, access: HR_ONLY, task: "AI-1", badge: "Lab", owner: "truongnd" },
      { title: "Hỏi đáp chính sách", href: "/lab/policy-qa", icon: MessageSquareTextIcon, access: HR_ONLY, task: "AI-2", badge: "Lab" },
      { title: "Gợi ý phân bổ", href: "/lab/allocation-suggest", icon: SparklesIcon, access: HR_ONLY, task: "AI-3", badge: "Lab", owner: "quangnn" },
      { title: "Hỏi đáp dữ liệu", href: "/lab/data-qa", icon: BrainCircuitIcon, access: HR_ONLY, task: "AI-4", badge: "Lab" },
    ],
  },
  {
    label: "Quản trị",
    owner: "cuongvv",
    items: [
      { title: "Tài khoản", href: "/admin/users", icon: UserCogIcon, access: { permissions: ["user:read"] }, task: "1.1" },
      { title: "Vai trò & quyền", href: "/admin/roles", icon: KeyRoundIcon, access: { permissions: ["role:read"] }, task: "1.2" },
    ],
  },
  {
    label: "Phát triển",
    owner: "quangnn",
    devOnly: true,
    items: [
      { title: "Component mẫu", href: "/dev/ui", icon: PaletteIcon },
      { title: "Trang lỗi mẫu", href: "/dev/error", icon: FlaskConicalIcon },
    ],
  },
];

const IS_DEV = process.env.NODE_ENV !== "production";

export function getNavGroups(): NavGroup[] {
  return NAV_GROUPS.filter((group) => !group.devOnly || IS_DEV);
}

export type NavMatch = { group: NavGroup; item: NavItem };

/** Tìm mục menu khớp đường dẫn: khớp chính xác, hoặc mục có đường dẫn dài nhất là tiền tố. */
export function findNavMatch(pathname: string): NavMatch | null {
  let best: NavMatch | null = null;
  for (const group of getNavGroups()) {
    for (const item of group.items) {
      const matches =
        item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
      if (matches && (!best || item.href.length > best.item.href.length)) best = { group, item };
    }
  }
  return best;
}
