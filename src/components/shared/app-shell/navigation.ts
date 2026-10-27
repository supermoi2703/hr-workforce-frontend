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
  ScrollTextIcon,
  ReceiptTextIcon,
  ScanFaceIcon,
  SparklesIcon,
  TimerIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "next-intl";
import type { Access } from "@/lib/auth/types";

/** Key tên mục / nhóm trong messages (Nav.items / Nav.groups); chữ hiển thị nằm ở messages/<ngôn ngữ>.json. */
export type NavItemId = keyof Messages["Nav"]["items"];
export type NavGroupId = keyof Messages["Nav"]["groups"];

export type NavItem = {
  id: NavItemId;
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
  id: NavGroupId;
  /** Người phụ trách nhóm menu: chỉ người này sửa các mục trong nhóm. */
  owner: Owner;
  items: NavItem[];
  /** Chỉ hiện khi chạy dev (`next dev`). */
  devOnly?: boolean;
  /**
   * Nhóm ít dùng: thu gọn được, mặc định đóng (tự mở khi đang ở trang thuộc nhóm). Nhóm dùng hằng ngày
   * để luôn mở.
   */
  collapsible?: boolean;
};

const MANAGEMENT: Access = { roles: ["ADMIN", "HR", "MANAGER"] };
const HR_ONLY: Access = { roles: ["ADMIN", "HR"] };

/**
 * Menu chính. Mỗi mục trỏ tới một route trong src/app/(dashboard)/.
 * Mục chưa có trang thật sẽ tự hiện trang "Đang phát triển"; khi làm xong chỉ cần tạo page.tsx
 * đúng đường dẫn, không phải sửa gì ở đây (trừ khi đổi tên/quyền).
 * Thêm mục mới: thêm `id` vào Nav.items (hoặc Nav.groups) ở CẢ messages/en.json và messages/vi.json.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    owner: "quangnn",
    items: [
      { id: "home", href: "/", icon: HouseIcon },
      { id: "dashboard", href: "/dashboard", icon: GaugeIcon, access: MANAGEMENT, task: "3.6" },
      { id: "approvals", href: "/approvals", icon: ClipboardCheckIcon, task: "1.6.2", owner: "cuongvv" },
    ],
  },
  {
    id: "people",
    owner: "cuongvv",
    items: [
      { id: "employees", href: "/employees", icon: UsersIcon, access: MANAGEMENT, task: "1.4" },
      { id: "contracts", href: "/contracts", icon: FileSignatureIcon, access: HR_ONLY, task: "1.5" },
    ],
  },
  {
    id: "timePay",
    owner: "truongnd",
    items: [
      { id: "attendance", href: "/attendance", icon: TimerIcon, task: "2.2" },
      { id: "timesheets", href: "/timesheets", icon: CalendarDaysIcon, task: "2.3" },
      { id: "leave", href: "/leave", icon: TreePalmIcon, task: "2.4, 2.5" },
      { id: "payroll", href: "/payroll", icon: WalletIcon, access: HR_ONLY, task: "2.7, 2.8" },
      { id: "payslips", href: "/payslips", icon: ReceiptTextIcon, task: "2.9" },
    ],
  },
  {
    id: "organization",
    owner: "quangnn",
    items: [
      { id: "organization", href: "/organization", icon: NetworkIcon, task: "1.3" },
      { id: "officeCalendar", href: "/office-calendar", icon: CalendarClockIcon, access: HR_ONLY, task: "2.1" },
      { id: "skills", href: "/skills", icon: BadgeCheckIcon, task: "3.9" },
      { id: "projects", href: "/projects", icon: BriefcaseBusinessIcon, task: "3.1, 3.2" },
      { id: "allocations", href: "/allocations", icon: LayersIcon, access: MANAGEMENT, task: "3.4" },
    ],
  },
  {
    id: "aiLab",
    owner: "cuongvv",
    collapsible: true,
    items: [
      { id: "faceAttendance", href: "/lab/face", icon: ScanFaceIcon, access: HR_ONLY, task: "AI-1", badge: "Lab", owner: "truongnd" },
      { id: "policyQa", href: "/lab/policy-qa", icon: MessageSquareTextIcon, access: HR_ONLY, task: "AI-2", badge: "Lab" },
      { id: "allocationSuggest", href: "/lab/allocation-suggest", icon: SparklesIcon, access: HR_ONLY, task: "AI-3", badge: "Lab", owner: "quangnn" },
      { id: "dataQa", href: "/lab/data-qa", icon: BrainCircuitIcon, access: HR_ONLY, task: "AI-4", badge: "Lab" },
    ],
  },
  {
    id: "admin",
    owner: "cuongvv",
    collapsible: true,
    items: [
      { id: "users", href: "/admin/users", icon: UserCogIcon, access: { permissions: ["user:read"] }, task: "1.1" },
      { id: "roles", href: "/admin/roles", icon: KeyRoundIcon, access: { permissions: ["role:read"] }, task: "1.2" },
      { id: "auditLog", href: "/admin/audit-logs", icon: ScrollTextIcon, access: { permissions: ["audit:read"] } },
    ],
  },
  {
    id: "dev",
    owner: "quangnn",
    devOnly: true,
    collapsible: true,
    items: [
      { id: "devUi", href: "/dev/ui", icon: PaletteIcon },
      { id: "devError", href: "/dev/error", icon: FlaskConicalIcon },
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
