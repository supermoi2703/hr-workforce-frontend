# Tài liệu dự án

Tài liệu chung của dự án HRM & Workforce, gồm 2 repo `hr-workforce-backend` và `hr-workforce-frontend`.

| Tài liệu | Nội dung | Vị trí |
|---|---|---|
| `00-project-overview.md` | Tổng quan dự án, phạm vi, actor, workflow nghiệp vụ | Repo backend |
| [`01-quy-uoc-du-an-va-cau-truc-file.md`](01-quy-uoc-du-an-va-cau-truc-file.md) | Quy ước code, cấu trúc thư mục backend + frontend, Definition of Done | Cả 2 repo (giữ đồng bộ) |
| [`02-quy-trinh-git.md`](02-quy-trinh-git.md) | Đặt tên nhánh, quy trình PR, review, hotfix | Cả 2 repo (giữ đồng bộ) |
| [`03-quy-trinh-su-dung-ai-agent.md`](03-quy-trinh-su-dung-ai-agent.md) | Quy tắc dùng AI agent khi code | Cả 2 repo (giữ đồng bộ) |
| `04-phan-cong-nhiem-vu.md` | Lịch sprint, phân công, chủ sở hữu phần dùng chung, service public giữa các module, các điểm cần chốt | Repo backend |

`00` và `04` chỉ đặt ở repo backend để có một nguồn duy nhất (`04` thay đổi sau mỗi sprint):

- Trên GitHub: <https://github.com/supermoi2703/hr-workforce-backend/tree/main/docs>
  (trước khi nhánh `docs` được merge: <https://github.com/supermoi2703/hr-workforce-backend/tree/docs/docs>)
- Trên máy, khi clone 2 repo cạnh nhau: `../hr-workforce-backend/docs/`

Khi sửa `01`, `02`, `03`: sửa ở cả 2 repo trong cùng lúc (2 PR liên kết).
