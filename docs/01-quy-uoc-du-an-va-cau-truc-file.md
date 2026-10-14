# Quy ước dự án & cấu trúc file

> Áp dụng cho cả 2 repo: `hr-workforce-backend` và `hr-workforce-frontend`. Tài liệu này được
> duy trì đồng bộ ở cả hai repo — khi sửa, sửa ở cả hai nơi trong cùng 1 PR (hoặc 2 PR liên kết).
>
> Tài liệu tổng quan (`00-project-overview.md`) và phân công (`04-phan-cong-nhiem-vu.md`) chỉ đặt ở
> repo backend; repo frontend trỏ sang (xem `docs/README.md` của frontend).

## 1. Nguyên tắc phân việc

Dự án tổ chức theo **Domain-Driven, mỗi thành viên sở hữu trọn vẹn 1 domain nghiệp vụ** (từ tầng
dữ liệu/logic backend đến màn hình frontend tương ứng), thay vì chia theo tầng kỹ thuật
(1 người chỉ backend, 1 người chỉ frontend). Phạm vi xem tại `00-project-overview.md`; ai phụ trách
domain/module nào, chủ sở hữu phần dùng chung và service public giữa các module xem tại
`04-phan-cong-nhiem-vu.md` (repo backend). Phân công có thể điều chỉnh sau mỗi sprint.

Sở hữu 1 domain không có nghĩa là người khác không được đụng vào code đó. Bất kỳ ai cũng có thể mở
PR sửa domain của người khác (báo trước, đi qua review bình thường) — chỉ là domain owner có trách
nhiệm review chính và nắm rõ nghiệp vụ domain mình nhất.

## 2. Cấu trúc thư mục backend (Spring Boot)

Tổ chức theo module nghiệp vụ (vertical slice) dưới `modules/`, không gom `controller/`,
`service/`, `repository/` chung cho toàn hệ thống. Cấu trúc dưới đây lấy theo code thực tế của
module `auth`/`user` (nhánh `cuongvv/features/authentication`) — dùng 2 module này làm mẫu:

```
src/main/java/com/hrmworkforce/backend/
├── common/                    # Dùng chung, KHÔNG chứa logic nghiệp vụ của module nào
│   ├── entity/                  # BaseEntity (id uuidv7, created/updated_at/by, version)
│   ├── exception/               # BusinessException, ErrorCode, GlobalExceptionHandler
│   ├── response/                # ApiResponse<T>, PageResponse<T>, FieldErrorResponse
│   ├── security/                # AuthenticatedUser
│   └── util/                    # Hàm tiện ích thuần
├── config/                    # Bean cấu hình: Security, CORS, OpenAPI, JPA auditing, Clock...
├── infrastructure/            # Kết nối hạ tầng ngoài: mail, redis...
└── modules/                   # Mỗi module nghiệp vụ một package
    ├── auth/, user/             # Đã có — Cường
    ├── employee/, approval/, audit/, policy/        # Dự kiến — Cường
    ├── attendance/, timesheet/, leave/, payroll/    # Dự kiến — Trường
    ├── organization/, calendar/, skill/, project/,
    │   allocation/, dashboard/, notification/       # Dự kiến — Quang
    └── ai/                      # Tính năng AI, tách riêng để dễ bật/tắt và đổi hạ tầng
```

Tên module ở trên là **dự kiến**: người phụ trách được đặt tên khác khi tạo module, nhưng phải giữ
một module một package và cập nhật lại danh sách này. Phân công chi tiết xem `04-phan-cong-nhiem-vu.md`.

Thư mục con trong một module (chỉ tạo thư mục nào cần dùng):

| Thư mục | Vai trò |
|---|---|
| `controller/` | `@RestController` — tầng tiếp xúc HTTP |
| `dto/request/`, `dto/response/` | DTO vào/ra của API |
| `service/` | `@Service` — logic nghiệp vụ, transaction boundary |
| `repository/` | Spring Data repository |
| `entity/`, `enums/` | `@Entity` (kế thừa `BaseEntity`), enum nghiệp vụ |
| `mapper/` | MapStruct mapper entity ↔ DTO |
| `event/`, `constant/` | Spring event, hằng số (vd. mã permission) |
| `README.md` | Mô tả module: cấu trúc, luồng chính, quan hệ với module khác |

Quy tắc phụ thuộc: `controller` → `service` → `repository`/`entity`. Một module **không** gọi
thẳng vào `repository`/`entity` của module khác — muốn lấy dữ liệu thì gọi qua **service public**
của module đó (danh sách service public và chủ sở hữu: `04-phan-cong-nhiem-vu.md` mục 4.2). Khi hai
module cần gọi ngược nhau, một chiều đi qua Spring event để tránh phụ thuộc vòng (xem
`modules/auth/README.md`).

Lỗi nghiệp vụ ném `BusinessException` với `ErrorCode`; controller trả `ApiResponse.ok(...)`, danh
sách phân trang trả `PageResponse` (trang bắt đầu từ 0).

Migration schema đặt tại `src/main/resources/db/migration/`, quản lý bằng Flyway. Không sửa lại một
file migration đã merge vào `main` và đã chạy trên môi trường chung — muốn sửa thì tạo migration
mới. Migration thêm permission mới phải gán permission đó cho role `ADMIN`.

> **Đề xuất, chờ chốt:** nhiều người cùng thêm migration trên các nhánh song song sẽ trùng số
> (`V8`, `V9`...). Đề xuất từ nay đánh số theo thời gian: `V<yyyyMMdd>_<n>__<mo_ta_ngan>.sql`, ví dụ
> `V20261020_1__create_org_tables.sql`. Các file `V1`–`V7` đã có giữ nguyên (số mới luôn lớn hơn).

## 3. Cấu trúc thư mục frontend (Next.js App Router)

Tổ chức feature-based theo domain để khớp với cách chia việc backend:

```
src/
├── app/                       # Route của Next.js App Router
│   ├── (auth)/                  # Route group: login, đổi mật khẩu
│   ├── (dashboard)/              # Route group: layout có sidebar sau khi đăng nhập
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── lab/                  # Trang AI Lab (thử nghiệm), vd. lab/face, lab/policy-qa
│   │   └── ...                  # 1 thư mục con / domain, khớp tên domain backend
│   └── layout.tsx, page.tsx
│
├── features/                  # Logic + UI riêng theo domain (không phải route)
│   └── <domain>/
│       ├── components/          # Component chỉ dùng trong domain này
│       ├── hooks/                # React Query hooks, custom hooks
│       ├── api.ts                # Hàm gọi API của domain (dùng chung 1 http client)
│       └── types.ts              # Kiểu dữ liệu khớp DTO backend của domain
│
├── components/ui/              # shadcn/ui — component nền tảng dùng chung toàn app
├── components/shared/          # Component dùng chung nhưng không thuộc shadcn (layout, nav, DataTable...)
└── lib/                        # http client, kiểu ApiResponse/PageResponse, utils thuần
    └── auth/                    # Phiên đăng nhập, token, useCurrentUser (chủ sở hữu: Cường)
```

Quy tắc: component trong `features/<domain>/components` không được import từ
`features/<domain-khac>/`. Cần dùng chung thì nâng lên `components/shared/`.

`components/shared/` và `lib/` là phần dùng chung (chủ sở hữu xem `04-phan-cong-nhiem-vu.md` mục
4.1). Muốn sửa props/interface đang có ở đây thì báo chủ sở hữu và sửa luôn mọi nơi đang dùng trong
cùng PR; ưu tiên thêm tùy chọn mới thay vì đổi cái cũ.

Frontend gọi backend qua đường dẫn tương đối `/api/...`. **Đề xuất, chờ chốt** (`04` mục 7, C7):
Next.js `rewrites` chuyển tiếp `/api/*` sang backend, để frontend và backend cùng origin (không cần
CORS khi dev, cookie refresh token hoạt động bình thường).

## 4. Quy ước đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Package Java | lowercase, không gạch dưới | `com.hrmworkforce.backend.modules.leave` |
| Class Java | PascalCase | `LeaveRequestService`, `LeaveBalanceRepository` |
| Biến, method Java | camelCase | `calculateRemainingDays()` |
| Hằng số Java | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Thư mục/file TypeScript | kebab-case | `leave-request-form.tsx` |
| Component React | PascalCase (tên export) | `export function LeaveRequestForm()` |
| Biến, hàm TypeScript | camelCase | `getRemainingLeaveDays()` |
| Nhánh git | `<github>/<loai>/<mo-ta-ngan>` | `quangnn/feature/org-office` (xem `02-quy-trinh-git.md`) |
| Bảng CSDL | snake_case, số nhiều | `leave_requests`, `employee_history` |
| Endpoint REST | `/api/` + kebab-case, số nhiều, danh từ; không có tiền tố version | `/api/leave-requests`, `/api/employees` |

## 5. File không commit / phải có bản mẫu

Mọi file chứa bí mật (connection string thật, JWT secret, API key) **không bao giờ** commit.
Repo chỉ giữ file mẫu:

- Backend: `application.yaml.example` → mỗi người tự copy thành `application.yaml` (đã bị
  `.gitignore` chặn) và điền giá trị thật cục bộ.
- Frontend: `.env.example` → copy thành `.env.local`.

Khi thêm một biến môi trường mới, **bắt buộc** cập nhật file `.example` tương ứng trong cùng PR —
tránh tình trạng người khác pull code về chạy không lên vì thiếu biến mà không biết.

## 6. Definition of Done cho một tính năng

Một tính năng được coi là "xong" khi đủ các điều sau, không chỉ là "chạy được trên máy mình":

- [ ] Code nằm đúng module, đúng thư mục (`controller`/`service`/`repository`...) theo mục 2.
- [ ] Có unit test cho logic nghiệp vụ quan trọng (đặc biệt luồng tính toán, luồng phê duyệt).
- [ ] API mới có tài liệu Swagger tự sinh đầy đủ (không thiếu mô tả tham số).
- [ ] Có xử lý lỗi rõ ràng (dùng `BusinessException`/`ErrorCode` chung, không để lộ stack trace).
- [ ] Frontend tương ứng xử lý được cả trạng thái loading, lỗi, rỗng — không chỉ happy path.
- [ ] Đã tự kiểm thử phân quyền: thử gọi API/xem trang bằng vai trò không đủ quyền.
- [ ] PR đã được ít nhất 1 người khác review và approve (xem
  [`02-quy-trinh-git.md`](02-quy-trinh-git.md)).
