# Hướng dẫn dùng khung frontend

> Cách làm một màn hình mới trên khung có sẵn. Quy ước chung xem `01-quy-uoc-du-an-va-cau-truc-file.md`.
> Ví dụ chạy được cho mọi phần dưới đây: trang `/dev/ui` (chỉ có khi chạy dev), mã nguồn ở
> `src/app/(dashboard)/dev/ui/`.

## 1. Chạy dự án

```bash
cp .env.example .env.local   # sửa BACKEND_URL nếu backend không chạy ở localhost:8080
npm install
npm run dev                  # http://localhost:3000
```

Hai chế độ đăng nhập (`NEXT_PUBLIC_AUTH_MODE` trong `.env.local`, sửa xong chạy lại `npm run dev`):

- `backend` (mặc định): đăng nhập thật ở `/login`. Cần backend + Postgres + Redis đang chạy; tài khoản mẫu
  `admin@test.com` / `Admin12345` (xem `scripts/sql/` của backend).
- `mock`: không cần backend, luôn coi như đã đăng nhập; đổi vai trò bằng nút **Role** trên header để kiểm tra
  menu và phân quyền. Các lệnh gọi API báo lỗi kết nối nếu backend không chạy.

Trước khi mở PR: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## 2. Thêm một màn hình

Ví dụ màn hình "Nghỉ phép" (`/leave`):

1. **Menu**: mục đã có sẵn trong `src/components/shared/app-shell/navigation.ts`, nhóm của người phụ
   trách. Chưa có trang thật thì mục menu tự mở trang "Đang phát triển". Sửa tên, icon, quyền (`access`)
   trong nhóm của mình nếu cần. Nhóm ít dùng đặt `collapsible: true` để thu gọn được (mặc định đóng, tự mở
   khi đang ở trang thuộc nhóm, nhớ trạng thái đóng/mở). Nhóm dùng hằng ngày để luôn mở, tránh menu quá dài.
2. **Trang**: tạo `src/app/(dashboard)/leave/page.tsx`. Trang thật tự thay trang "Đang phát triển".
   Bọc nội dung bằng `<RequireAccess access={...}>` nếu trang giới hạn quyền, mở đầu bằng `<PageHeader>`.
3. **Logic theo domain** trong `src/features/leave/`:

```
features/leave/
├── types.ts        # kiểu dữ liệu khớp DTO backend
├── api.ts          # hàm gọi API, dùng `http` từ lib/api/http-client
├── hooks.ts        # useQuery / useMutation + query key
└── components/     # component chỉ dùng trong domain này
```

Feature không import từ feature khác. Cần dùng chung thì nâng lên `components/shared/` hoặc `lib/`
(báo người phụ trách phần dùng chung).

## 3. Gọi API

```ts
// features/leave/api.ts
import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";

export const getLeaveRequests = (params: PageParams) =>
  http.get<PageResponse<LeaveRequest>>("/api/leave-requests", { query: toPageQuery(params) });

export const createLeaveRequest = (body: CreateLeaveRequest) =>
  http.post<LeaveRequest>("/api/leave-requests", body);
```

- `http` tự gắn token, tự refresh khi hết hạn, trả về `data` của `ApiResponse`, ném `ApiError` khi lỗi
  (`code` là ErrorCode của backend, `fieldErrors` là lỗi theo từng ô).
- Không gọi `fetch` trực tiếp trong feature.
- Upload file: truyền `FormData` làm body.
- Hiển thị lỗi cho người dùng: `const errorMessage = useErrorMessage()` (từ `lib/api/use-error-message`) rồi
  `errorMessage(error)`; câu thông báo theo ngôn ngữ đang chọn (xem mục 8).

## 4. Bảng dữ liệu

Dùng `DataTable` (phân trang/sắp xếp phía server, đã xử lý đủ đang tải / lỗi / rỗng):

```tsx
const col = createDataTableColumns<LeaveRequest>();
const columns = col.columns([ /* khai báo ngoài component */ ]);

const tableState = useDataTableState();
const query = useQuery({
  queryKey: ["leave-requests", tableState.pageParams],
  queryFn: () => getLeaveRequests(tableState.pageParams),
  placeholderData: keepPreviousData,
});
return <DataTable columns={columns} query={query} {...tableState.bind} />;
```

Bảng dùng TanStack Table **v9** (API khác v8). Xem `node_modules/@tanstack/react-table/skills/`.

## 5. Form

react-hook-form + zod + component `Field`. Lỗi validation từ backend gắn vào đúng ô bằng
`applyServerFieldErrors(error, form.setError)` (tên field của form phải trùng tên field trong DTO
backend). Mẫu: `src/app/(dashboard)/dev/ui/_components/form-demo.tsx`.

## 6. Người dùng hiện tại và phân quyền

```tsx
const { user, can, hasRole, hasPermission } = useCurrentUser();
```

- Chỉ lấy người dùng qua `useCurrentUser()`, không tự đọc token hay gọi `/api/auth/me`.
- Ẩn/hiện nút: `<RequireAccess access={{ roles: ["ADMIN", "HR"] }} fallback={null}>...</RequireAccess>`.
- Ẩn trên giao diện không thay cho kiểm tra quyền ở backend.
- Phiên đăng nhập do `lib/auth` lo hết: tự lấy lại phiên khi F5, tự làm mới token, hết phiên thì đưa về
  `/login` kèm lý do, đồng bộ đăng xuất giữa các tab. Màn hình nghiệp vụ không cần làm gì thêm.
  Cần đăng xuất bằng code (hiếm): `const { signOut } = useAuthActions()`.

## 7. Hiển thị

- Ngày giờ, tiền: `formatDate`, `formatDateTime`, `formatTime`, `formatCurrency` trong `lib/format`
  (luôn theo giờ Việt Nam; chuỗi `yyyy-MM-dd` của backend không bị lệch ngày).
- Thông báo: `toast.success(...)` / `toast.error(...)` từ `sonner`.
- Thao tác khó hoàn tác: `<ConfirmDialog>`.
- Trạng thái: `LoadingState`, `ErrorState`, `EmptyState` trong `components/shared/states`.
- Không đặt màu/kích thước cứng trong màn hình nghiệp vụ; dùng biến theme (`globals.css`) và component chung.
- Bảng màu sáng: nền trang xám nhạt, nội dung trong khối trắng (`Card` hoặc `rounded-xl border bg-card`),
  một màu thương hiệu xanh dương (`primary`) chỉ dùng cho hành động chính, link và mục đang chọn.
- Trạng thái: `<Badge variant="success | warning | info | destructive">` cho đúng giờ/đã duyệt, đi muộn/chờ duyệt,
  WFH/nghỉ có phép, vắng/từ chối.
- Mỗi nhóm chức năng một màu cố định (`DomainTone` trong `components/shared/icon-tile.tsx`): `time` chấm công/bảng công,
  `leave` nghỉ phép/WFH, `approval` việc cần duyệt, `project` tổng quan/dự án/phân bổ/kỹ năng, `people` nhân viên/tổ chức,
  `money` lương, `neutral` quản trị. Dùng `<IconTile icon={...} tone="leave" />` và cùng tông đó cho badge/biểu đồ
  của module. Riêng icon trên sidebar để một màu xám (chỉ mục đang chọn có màu xanh), không tô theo nhóm.
- Có người trong danh sách thì dùng `<UserAvatar name={...} seed={mã nhân viên hoặc id} />`: hiện chữ cái đầu trên màu
  riêng của từng người (cùng người luôn cùng màu), có ảnh thì truyền thêm `imageUrl`.
- Font Be Vietnam Pro, 3 độ đậm 400/500/600. Bảng và thẻ `<time>` tự dùng chữ số đều chiều rộng.
- Trang chủ (`src/app/(dashboard)/page.tsx`) có chỗ chờ sẵn cho dữ liệu thật:
  - Hàng chỉ số (`METRICS`): truyền `value` và `detail` khi module có dữ liệu, vd. giờ vào hôm nay, số ngày phép còn lại.
  - Dải tuần (`_components/week-strip.tsx`): gắn trạng thái từng ngày qua prop `dayContent` (theo ngày `yyyy-MM-dd`).
  - Không đặt số liệu giả: chưa có dữ liệu thì để trống, ô tự hiện "Chưa có dữ liệu".

## 8. Đa ngôn ngữ (tiếng Anh / tiếng Việt)

Dùng [next-intl](https://next-intl.dev). Mặc định tiếng Anh; người dùng đổi bằng nút ngôn ngữ trên header (hoặc ở trang
đăng nhập). Lựa chọn lưu ở cookie `NEXT_LOCALE`, URL không đổi (không có `/en`, `/vi`).

- **Không viết chữ cứng** trong component (kể cả `aria-label`, `placeholder`, câu báo lỗi zod). Thêm key vào **cả**
  `messages/en.json` và `messages/vi.json`; `npm test` báo lỗi nếu hai file lệch key.
- Mỗi domain một namespace riêng, vd `Leave` (đặt thêm cấp con nếu nhiều màn hình: `Leave.List`, `Leave.Form`). Chữ dùng
  chung (Lưu, Hủy, Thử lại...) lấy từ `Common`.

```tsx
// Client Component hoặc Server Component không async
const t = useTranslations("Leave.List");
<PageHeader title={t("title")} />
<p>{t("remaining", { days: 5 })}</p>        // messages: "remaining": "{days} days left"

// Server Component async, generateMetadata
const t = await getTranslations("Leave.List");
```

- Key có kiểu theo `en.json`: gõ sai key thì `npm run typecheck` báo lỗi.
- Mục menu: `navigation.ts` dùng `id` (vd `id: "leave"`), tên hiển thị ở `Nav.items.<id>` trong hai file messages.
- Định dạng ngày giờ, tiền (`lib/format`) chưa đổi theo ngôn ngữ, vẫn kiểu Việt Nam.
