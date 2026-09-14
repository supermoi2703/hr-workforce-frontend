# Quy trình Git

> Áp dụng cho cả 2 repo: `hr-workforce-backend` và `hr-workforce-frontend`. Mỗi repo có branch
> protection và PR riêng trên GitHub, nhưng quy tắc dưới đây là chung cho cả hai.

## 1. Mô hình nhánh

Dùng **GitHub Flow** rút gọn — phù hợp nhóm 3 người, không cần nhánh `develop` trung gian gây
thêm bước merge thừa:

- **`main`** — nhánh bảo vệ (protected branch). Luôn ở trạng thái chạy được, không push thẳng.
  Merge vào `main` sẽ tự động deploy (xem CI/CD trong tài liệu hạ tầng).
- **`feature/<domain>-<mo-ta-ngan>`** — nhánh làm tính năng mới, tách từ `main`.
  Ví dụ: `feature/leave-approval-flow`, `feature/payroll-run-period`.
- **`fix/<mo-ta-ngan>`** — sửa lỗi phát hiện trong lúc phát triển (chưa lên `main`/đã lên nhưng
  không khẩn cấp).
- **`hotfix/<mo-ta-ngan>`** — sửa lỗi khẩn cấp đang ảnh hưởng bản đã deploy, xem mục 5.
- **`chore/<mo-ta-ngan>`** — việc không phải tính năng/lỗi: cấu hình CI, nâng cấp dependency,
  dọn code.

Không đặt tên nhánh chung chung kiểu `fix-bug`, `update`, `test123`.

## 2. Quy trình làm một tính năng

1. Cập nhật `main` mới nhất, tạo nhánh từ đó: `git checkout main && git pull && git checkout -b feature/...`.
2. Commit theo [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(leave): thêm luồng duyệt cấp 2`, `fix(payroll): sửa sai số làm tròn lương`,
   `docs: cập nhật hướng dẫn cài đặt`. Prefix phổ biến: `feat`, `fix`, `refactor`, `test`,
   `docs`, `chore`, `style`, `perf`.
3. Trước khi mở PR: `git fetch origin && git rebase origin/main` để giải quyết conflict cục bộ,
   không để reviewer phải gỡ conflict giúp.
4. Push nhánh, mở **Pull Request** vào `main`. Điền đủ PR description (xem mục 4).
5. CI (build + test + lint) phải xanh. PR đỏ CI không được review, tác giả tự sửa trước.
6. Cần **tối thiểu 1 approval** từ người khác trong nhóm (không tự approve PR của mình).
   Ưu tiên người review là người không sở hữu domain đó, để có góc nhìn "người ngoài đọc code
   lần đầu có hiểu không" — domain owner review sâu nghiệp vụ, người còn lại review chéo về mặt
   đọc hiểu/an toàn/quy ước chung.
7. Sau khi được approve: **squash merge** vào `main` (giữ lịch sử `main` gọn, 1 PR = 1 commit).
   Xoá nhánh sau khi merge.

## 3. Review chéo — cách phân công

Với nhóm 3 người, áp dụng luân phiên: mỗi PR domain của người A được review chính bởi 1 trong 2
người còn lại, xoay vòng đều để cả 3 người đều nắm được toàn bộ hệ thống chứ không chỉ domain của
mình — điều này quan trọng vì hội đồng bảo vệ có thể hỏi bất kỳ ai về bất kỳ phần nào.

Checklist tối thiểu khi review một PR (dù reviewer không rành sâu domain đó):

- [ ] Code có nằm đúng vị trí theo [`01-quy-uoc-du-an-va-cau-truc-file.md`](01-quy-uoc-du-an-va-cau-truc-file.md) không?
- [ ] Có endpoint/màn hình nào thiếu kiểm tra phân quyền không?
- [ ] Có business rule nào trong tài liệu đặc tả bị code làm sai/bỏ sót không?
- [ ] Có secret, connection string, dữ liệu nhạy cảm nào bị commit nhầm không?
- [ ] Test có che được nhánh lỗi (invalid input, không đủ quyền, dữ liệu biên) hay chỉ test
  happy path?
- [ ] Nếu PR có phần code do AI agent hỗ trợ sinh ra — xem thêm checklist riêng tại
  [`03-quy-trinh-su-dung-ai-agent.md`](03-quy-trinh-su-dung-ai-agent.md).

## 4. Nội dung một PR cần có

- **Tiêu đề**: theo Conventional Commits, mô tả đúng thay đổi chính.
- **Mô tả**: làm gì, tại sao, ảnh hưởng domain nào khác không.
- **Cách test**: các bước đã tự kiểm thử thủ công (nếu có).
- **Ảnh chụp màn hình** (với PR frontend có thay đổi UI).
- Đánh dấu rõ nếu phần lớn code trong PR do AI agent sinh ra (xem mục AI-assisted trong tài liệu
  03) để reviewer biết cần soi kỹ hơn phần logic nghiệp vụ.

## 5. Quy trình sửa lỗi (bug thường vs hotfix)

**Bug phát hiện trong lúc phát triển, chưa gấp:** tạo nhánh `fix/...` từ `main`, đi qua PR/review
bình thường như mục 2.

**Hotfix khẩn cấp** (lỗi đang ảnh hưởng bản demo/production đã deploy):

1. Tạo nhánh `hotfix/<mo-ta>` từ `main`.
2. Sửa tối thiểu đúng phạm vi lỗi, không tiện tay refactor thêm.
3. Vẫn bắt buộc mở PR và có review — được phép rút gọn xuống review nhanh (1 người xác nhận qua
   PR hoặc gọi nhanh trong nhóm) nhưng **không bỏ qua PR/review hoàn toàn**, trừ trường hợp
   production sập hoàn toàn và không ai khác online — khi đó merge trước, mở issue ghi lại để
   review bù ngay sau.
4. Sau khi merge, kiểm tra lại môi trường demo/production đã hết lỗi.

## 6. Xử lý conflict & lịch sử git

- Rebase nhánh của mình lên `main`, không merge `main` ngược vào nhánh feature (giữ lịch sử
  thẳng, dễ đọc).
- Không dùng `git push --force` lên `main`. Chỉ force-push nhánh feature của chính mình sau khi
  rebase, và chỉ khi chưa có ai khác cùng làm trên nhánh đó.
- Không rewrite lịch sử của `main` (không amend/rebase commit đã lên `main`).

## 7. Thiết lập branch protection cho `main` (làm 1 lần/repo trên GitHub, không có `gh` CLI nên
làm qua giao diện web)

Vào **Settings → Branches → Add branch ruleset** (hoặc *Branch protection rules* tuỳ giao diện
GitHub hiện tại) cho nhánh `main` của từng repo, bật:

- Require a pull request before merging.
- Require approvals: **1**.
- Require status checks to pass before merging → chọn job CI (sau khi CI skeleton được thêm).
- Do not allow bypassing the above settings (áp dụng cả cho admin, tránh tiện tay push thẳng).
- Require branches to be up to date before merging (tránh merge nhánh cũ, bỏ sót conflict logic).
