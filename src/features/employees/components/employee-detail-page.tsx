"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  InfoIcon,
  PencilIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UserXIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { getEmployeeError } from "../error-messages";
import { useEmployee, useOrgUnits, useProvisionAccount, useRefreshEmployee, useSensitive } from "../hooks";
import { getEmployeeActions, needsAccountUnlock } from "../rules";
import type { EmployeeDetail } from "../types";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeOverview, PersonalOverview } from "./employee-overview";
import { EmployeeStatusBadge } from "./employee-status-badge";
import { SensitiveSection } from "./sensitive-section";
import { StatusDialog } from "./status-dialog";

const LIST_PATH = "/employees";
const TABS = ["overview", "personal", "sensitive", "contracts", "history"] as const;
type DetailTab = (typeof TABS)[number];

type EmployeeDetailPageProps = {
  id: string;
  /** Nội dung tab "Hợp đồng" (feature không import nhau: route ghép vào). Chỉ hiện khi có contract:read. */
  renderContracts?: (employee: EmployeeDetail) => ReactNode;
  /** Nội dung tab "Lịch sử" (route ghép vào). Chỉ hiện và chỉ tải khi có employee:manage và đang mở tab. */
  renderHistory?: (employee: EmployeeDetail) => ReactNode;
};

/** Chi tiết một hồ sơ (employee:read): thông tin công việc, cá nhân, nhạy cảm theo quyền; sửa / đổi trạng thái / cấp tài khoản. */
export function EmployeeDetailPage({ id, renderContracts, renderHistory }: EmployeeDetailPageProps) {
  const t = useTranslations("Employees.Detail");
  const query = useEmployee(id);

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("back")}
    </Link>
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    // id sai định dạng (400) hoặc không tồn tại / ngoài phạm vi (404).
    const notFound = isApiError(query.error) && (query.error.status === 404 || query.error.status === 400);
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState
            icon={<UserXIcon />}
            title={t("notFound")}
            description={t("notFoundDescription")}
            className="border border-dashed"
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </>
    );
  }

  return (
    <>
      {backLink}
      <EmployeeDetailView employee={query.data} renderContracts={renderContracts} renderHistory={renderHistory} />
    </>
  );
}

function EmployeeDetailView({
  employee,
  renderContracts,
  renderHistory,
}: {
  employee: EmployeeDetail;
  renderContracts?: EmployeeDetailPageProps["renderContracts"];
  renderHistory?: EmployeeDetailPageProps["renderHistory"];
}) {
  const t = useTranslations("Employees.Detail");
  const tAccount = useTranslations("Employees.Account");
  const tEmployeeErrors = useTranslations("Employees.Errors");
  const tErrors = useTranslations("Errors");
  const { hasPermission } = useCurrentUser();
  const org = useOrgUnits();
  const refresh = useRefreshEmployee();
  const provision = useProvisionAccount(employee.id);
  const actions = getEmployeeActions(employee, hasPermission);

  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [unitHeadWarning, setUnitHeadWarning] = useState(false);

  const showContracts = renderContracts !== undefined && hasPermission("contract:read");
  const showHistory = renderHistory !== undefined && actions.viewHistory;
  const visibleTab: Record<DetailTab, boolean> = {
    overview: true,
    personal: employee.personal !== null,
    sensitive: actions.viewSensitive,
    contracts: showContracts,
    history: showHistory,
  };
  const tabs = TABS.filter((tab) => visibleTab[tab]);
  const requested = useSearchParams().get("tab");
  const tab: DetailTab = tabs.includes(requested as DetailTab) ? (requested as DetailTab) : "overview";
  const sensitive = useSensitive(employee.id, actions.viewSensitive && tab === "sensitive");

  function changeTab(value: unknown) {
    const next = String(value) as DetailTab;
    if (next !== tab && tabs.includes(next)) window.history.pushState(null, "", `?tab=${next}`);
  }

  const provisionAccount = () =>
    provision.mutateAsync().then(
      () => toast.success(tAccount("success", { email: employee.workEmail })),
      (error: unknown) => {
        const { message, stale } = getEmployeeError(error, tEmployeeErrors, tErrors);
        toast.error(message);
        if (stale) void refresh(employee.id);
        throw error;
      },
    );

  const hasMenu = actions.changeStatus || actions.provisionAccount;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={employee.fullName} seed={employee.id} size="lg" />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
              <span className="truncate">{employee.fullName}</span>
              <EmployeeStatusBadge status={employee.status} />
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{employee.employeeCode}</span> · {employee.workEmail}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Nhật ký đã lọc sẵn theo hồ sơ này (feature employees không import audit: chỉ dùng đường dẫn). */}
          {actions.viewAuditLog && (
            <Link
              href={`/admin/audit-logs?${new URLSearchParams({ targetType: "EMPLOYEE", targetId: employee.id, targetLabel: employee.fullName })}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ScrollTextIcon /> {t("viewAuditLog")}
            </Link>
          )}
          {actions.edit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <PencilIcon /> {t("edit")}
            </Button>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                {t("actions")} <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {actions.changeStatus && (
                  <DropdownMenuItem onClick={() => setStatusOpen(true)}>
                    <RefreshCwIcon /> {t("changeStatus")}
                  </DropdownMenuItem>
                )}
                {actions.provisionAccount && (
                  <DropdownMenuItem onClick={() => setProvisionOpen(true)}>
                    <UserPlusIcon /> {t("createAccount")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {unitHeadWarning && (
        <Alert className="max-w-2xl">
          <TriangleAlertIcon />
          <AlertDescription>
            {t("unitHeadWarning", { name: employee.fullName })}{" "}
            <Link href="/organization" className="font-medium">
              {t("openOrganization")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Vào làm lại mà tài khoản vẫn khóa: backend không tự mở khóa. */}
      {needsAccountUnlock(employee) && (
        <Alert className="max-w-2xl">
          <InfoIcon />
          <AlertDescription>
            {t("unlockHint")}{" "}
            {actions.viewAccount && employee.account && (
              <Link href={`/admin/users/${employee.account.userId}`} className="font-medium">
                {t("openAccount")}
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={changeTab} className="gap-6">
        {tabs.length > 1 && (
          <TabsList variant="line">
            {tabs.map((value) => (
              <TabsTrigger key={value} value={value} className="px-3">
                {t(`tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        <TabsContent value="overview">
          <EmployeeOverview
            employee={employee}
            lookup={org.lookup}
            linkManager
            linkAccount={actions.viewAccount}
          />
        </TabsContent>
        {employee.personal && (
          <TabsContent value="personal">
            <PersonalOverview personal={employee.personal} />
          </TabsContent>
        )}
        {actions.viewSensitive && (
          <TabsContent value="sensitive">
            <SensitiveSection query={sensitive} employeeId={employee.id} />
          </TabsContent>
        )}
        {showContracts && <TabsContent value="contracts">{renderContracts(employee)}</TabsContent>}
        {showHistory && <TabsContent value="history">{tab === "history" && renderHistory(employee)}</TabsContent>}
      </Tabs>

      {actions.edit && <EmployeeFormDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />}
      {actions.changeStatus && (
        <StatusDialog
          employee={employee}
          open={statusOpen}
          onOpenChange={setStatusOpen}
          onUnitHeadWarning={() => setUnitHeadWarning(true)}
        />
      )}
      {actions.provisionAccount && (
        <ConfirmDialog
          open={provisionOpen}
          onOpenChange={setProvisionOpen}
          title={tAccount("title")}
          description={tAccount("description", { email: employee.workEmail })}
          confirmLabel={tAccount("confirm")}
          onConfirm={provisionAccount}
        />
      )}
    </>
  );
}
