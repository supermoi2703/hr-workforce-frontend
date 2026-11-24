import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findNavMatch } from "@/components/shared/app-shell/navigation";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { canAccess, hasPermission, hasRole } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/types";
import messages from "../../../messages/vi.json";
import { IncidentDialog } from "./components/incident-dialog";
import { TeamCalendar } from "./components/team-calendar";
import { TimesheetDayDialog } from "./components/timesheet-day-dialog";
import type { AttendanceIncident, EmployeeTimesheet, PeriodStatus, TimesheetDay } from "./types";

const mocks = vi.hoisted(() => ({
  periods: vi.fn(),
  team: vi.fn(),
}));

vi.mock("@/lib/auth/auth-provider", () => ({ useCurrentUser: vi.fn() }));
vi.mock("./hooks", async (importOriginal) => ({
  ...await importOriginal<typeof import("./hooks")>(),
  useAttendanceOffices: () => ({ isPending: false, data: [] }),
  useTimesheetPeriods: mocks.periods,
  useTeamTimesheet: mocks.team,
}));
vi.mock("@/components/ui/dialog", () => {
  // Nội dung portal chỉ xuất hiện trên trình duyệt. Render nội dung để kiểm tra trạng thái ban đầu của form.
  const content = ({ children }: { children?: ReactNode }) => children;
  return {
    Dialog: content, DialogContent: content, DialogHeader: content,
    DialogTitle: content, DialogDescription: content, DialogFooter: content,
  };
});

const user: CurrentUser = {
  id: "user-1",
  email: "hr@example.test",
  displayName: "HR",
  status: "ACTIVE",
  roles: ["HR"],
  permissions: ["attendance:manage"],
  employeeId: "hr-1",
};
const day: TimesheetDay = {
  workDate: "2026-10-01",
  dayType: "WORKING_DAY",
  status: "WORK",
  scheduleSource: "OFFICE",
  scheduledStart: "08:30",
  scheduledEnd: "17:30",
  firstIn: null,
  lastOut: null,
  lateMinutes: 0,
  earlyMinutes: 0,
  workedMinutes: 480,
  paidUnits: 1,
  leavePart: null,
  leaveTypeCode: null,
  remotePart: null,
  outsideOffice: false,
  currentAdjustmentId: null,
};

function sheet(employeeId: string, workDay = day): EmployeeTimesheet {
  return {
    employee: { id: employeeId, employeeCode: employeeId, fullName: employeeId },
    days: [workDay],
    summary: {
      paidUnits: 1, lateCount: 0, lateMinutes: 0, earlyCount: 0, earlyMinutes: 0,
      absentCount: 0, missingOutCount: 0, leaveDays: 0, remoteDays: 0, outsideOfficeCount: 0,
    },
  };
}

function renderTeam(person = user, status: PeriodStatus = "OPEN", days = [sheet("employee-1")]) {
  vi.mocked(useCurrentUser).mockReturnValue({
    user: person,
    status: "authenticated",
    can: (access) => canAccess(person, access),
    hasRole: (role) => hasRole(person, role),
    hasPermission: (permission) => hasPermission(person, permission),
  });
  mocks.periods.mockReturnValue({ data: [{ month: "2026-10", status }] });
  mocks.team.mockReturnValue({ data: days });
  return renderUI(<TeamCalendar month="2026-10" today="2026-10-05" />);
}

function renderUI(component: ReactNode) {
  const client = new QueryClient();
  const markup = renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}>{component}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
  client.clear();
  return markup;
}

describe("team timesheet actions", () => {
  beforeEach(() => vi.resetAllMocks());

  it("UF-1 omits adjustment controls and denies the incident navigation item without attendance:manage", () => {
    const person = { ...user, roles: ["MANAGER"], permissions: ["attendance:read"] };
    const incidentItem = findNavMatch("/timesheets/incidents")?.item;
    expect(incidentItem?.id).toBe("timesheetIncidents");
    expect(canAccess(person, incidentItem?.access)).toBe(false);
    expect(canAccess(user, incidentItem?.access)).toBe(true);
    expect(renderTeam(person)).not.toContain("Sửa công");
  });

  it("UF-2 initially disables Save even with a valid prefilled paid unit value", () => {
    const page = renderUI(
      <TimesheetDayDialog employeeId="employee-1" employeeName="Employee" day={day} canEdit initiallyEditing onClose={vi.fn()} />,
    );
    expect(page).toMatch(/<button\b[^>]*\bdisabled=""[^>]*>Lưu<\/button>/);
  });

  it.each([1.3, 0.55])("UF-3 shows a field error for out-of-step or out-of-range paid units (%s)", (paidUnits) => {
    const page = renderUI(
      <TimesheetDayDialog employeeId="employee-1" employeeName="Employee" day={{ ...day, paidUnits }}
        canEdit initiallyEditing onClose={vi.fn()} />,
    );
    expect(page).toContain('id="adjustment-units-error"');
    expect(page).toContain("Nhập số công từ 0 đến 1, theo bước 0,1.");
  });

  it("UF-6 hides adjustment controls for a locked period and links to that month's late changes", () => {
    const page = renderTeam(user, "LOCKED");
    expect(page).not.toContain("Sửa công");
    expect(page).toContain("Kỳ đã chốt, ghi nhận điều chỉnh kỳ sau");
    expect(page).toContain('href="/timesheets/periods?month=2026-10"');
  });

  it("UF-7 offers editing only for another employee's past day in an open period", () => {
    const page = renderTeam(user, "OPEN", [
      sheet("hr-1"),
      sheet("employee-2"),
      sheet("employee-3", { ...day, workDate: "2026-10-05" }),
      sheet("employee-4", { ...day, workDate: "2026-10-06" }),
    ]);
    expect(page).toContain("Sửa công · employee-2");
    expect(page).not.toMatch(/Sửa công · (hr-1|employee-3|employee-4)/);
  });

  it("UF-9 initially disables confirmation of an incident cancellation without a reason", () => {
    const incident: AttendanceIncident = {
      id: "incident-1", officeId: "office-1", officeName: "Office", reason: "Outage", status: "ACTIVE",
      startAt: "2026-10-01T08:00:00+07:00", endAt: "2026-10-01T09:00:00+07:00",
      createdAt: "2026-10-01T10:00:00+07:00", createdByName: "HR", cancelReason: null,
    };
    const page = renderUI(<IncidentDialog incident={incident} initialOffice="" offices={[]} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(page).toContain("Lý do hủy");
    expect(page).toMatch(/<button\b[^>]*\bdisabled=""[^>]*>Xác nhận hủy<\/button>/);
  });

  it("displays source and incident labels in the day cells", () => {
    const page = renderTeam(user, "OPEN", [
      sheet("employee-2", { ...day, source: "HR_ADJUST" }),
      sheet("employee-3", { ...day, status: "INCIDENT" }),
    ]);
    expect(page).toContain("HR sửa");
    expect(page).toContain("Sự cố hệ thống");
  });
});
