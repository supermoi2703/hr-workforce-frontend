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

Khi `NEXT_PUBLIC_AUTH_MODE=mock` (mặc định), ứng dụng đăng nhập giả lập: đổi vai trò bằng nút
**Vai trò** trên header để kiểm tra menu và phân quyền. Backend không chạy thì vẫn dùng được giao
diện, chỉ các lệnh gọi API báo lỗi kết nối.

Trước khi mở PR: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## 2. Thêm một màn hình

Ví dụ màn hình "Nghỉ phép" (`/leave`):

1. **Menu**: mục đã có sẵn trong `src/components/shared/app-shell/navigation.ts`, nhóm của người phụ
   trách. Chưa có trang thật thì mục menu tự mở trang "Đang phát triển". Sửa tên, icon, quyền (`access`)
   trong nhóm của mình nếu cần.
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
- Hiển thị lỗi cho người dùng: `getErrorMessage(error)` từ `lib/api/errors`.

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
  `money` lương, `neutral` quản trị. Icon trên sidebar tô theo màu này (khai báo `tone` của nhóm/mục trong
  `navigation.ts`). Dùng `<IconTile icon={...} tone="leave" />` và cùng tông đó cho badge/biểu đồ của module.
- Có người trong danh sách thì dùng `<UserAvatar name={...} seed={mã nhân viên hoặc id} />`: hiện chữ cái đầu trên màu
  riêng của từng người (cùng người luôn cùng màu), có ảnh thì truyền thêm `imageUrl`.
- Font Be Vietnam Pro, 3 độ đậm 400/500/600. Bảng và thẻ `<time>` tự dùng chữ số đều chiều rộng.
- Trang chủ (`src/app/(dashboard)/page.tsx`) có chỗ chờ sẵn cho dữ liệu thật:
  - Hàng chỉ số (`METRICS`): truyền `value` và `detail` khi module có dữ liệu, vd. giờ vào hôm nay, số ngày phép còn lại.
  - Dải tuần (`_components/week-strip.tsx`): gắn trạng thái từng ngày qua prop `dayContent` (theo ngày `yyyy-MM-dd`).
  - Không đặt số liệu giả: chưa có dữ liệu thì để trống, ô tự hiện "Chưa có dữ liệu".
