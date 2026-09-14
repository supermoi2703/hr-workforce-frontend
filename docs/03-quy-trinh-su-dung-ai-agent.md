# Quy trình sử dụng AI agent hỗ trợ code

> Áp dụng cho cả 2 repo. Mục tiêu: tận dụng AI (Claude Code, GitHub Copilot, ChatGPT, hoặc công cụ
> tương tự) để tăng tốc độ, nhưng không đánh đổi bằng chất lượng/an toàn code hoặc mất kiểm soát
> về việc ai thực sự hiểu và chịu trách nhiệm cho từng dòng code trong hệ thống.

## 1. Nguyên tắc xuyên suốt

1. **AI là công cụ hỗ trợ, không phải người chịu trách nhiệm.** Người mở PR luôn là người chịu
   trách nhiệm cuối cùng cho code trong PR đó, kể cả khi phần lớn do AI sinh ra. "AI viết vậy" không
   phải lý do hợp lệ khi bị hỏi tại sao code sai trong lúc review hoặc bảo vệ đồ án.
2. **Không paste nguyên khối code AI sinh ra mà không đọc.** Đọc hiểu từng phần trước khi đưa vào
   commit — đặc biệt là phần liên quan tính toán (lương, số ngày phép) và phân quyền.
3. **AI không được tự quyết định nghiệp vụ chưa rõ.** Khi tài liệu đặc tả còn mơ hồ hoặc thiếu
   (ví dụ: "chưa chốt số ngày phép mặc định"), không để AI tự bịa ra một con số/luật rồi code theo —
   phải dừng lại, hỏi người trong nhóm hoặc đánh dấu `TODO` rõ ràng kèm câu hỏi.
4. **Không đưa bí mật thật vào prompt**: connection string thật, JWT secret, API key, dữ liệu
   nhân sự thật (nếu có) không được dán vào cửa sổ chat với AI, kể cả để "nhờ debug". Dùng dữ liệu
   giả lập.

## 2. Trước khi để AI code

- Task nên được mô tả cụ thể, tham chiếu đúng mục trong `dac-ta-yeu-cau-hrms-chi-tiet.md`
  (business rule, tiêu chí chấp nhận) thay vì mô tả chung chung — AI diễn giải yêu cầu mơ hồ càng
  dễ sai nghiệp vụ.
- Task lớn nên chia nhỏ theo từng luồng nghiệp vụ (ví dụ tách riêng "tạo đơn nghỉ phép" và
  "luồng duyệt 2 cấp") thay vì giao nguyên một module — chia nhỏ để mỗi phần còn review được, thay
  vì nhận về một khối diff khổng lồ không ai đọc kỹ nổi.
- Với phần logic tính toán quan trọng (payroll, leave balance), nên yêu cầu AI viết test trước
  hoặc cùng lúc với code, không tách rời "để viết test sau" — dễ bị quên.

## 3. Trong lúc dùng AI agent

- Luôn build/chạy test cục bộ sau khi AI sửa code, trước khi tiếp tục yêu cầu AI làm việc khác
  hoặc trước khi commit — không để lỗi dồn lại nhiều bước rồi mới phát hiện.
- Với agent có quyền chạy lệnh/sửa nhiều file cùng lúc (agentic, ví dụ Claude Code): review diff
  tổng thể trước khi commit, không chỉ tin vào việc "agent nói đã chạy test pass".
- Không để AI tự ý sửa lại một migration Flyway đã merge vào `main` — nếu cần đổi schema, luôn tạo
  migration mới (xem mục 2, tài liệu `01-quy-uoc-du-an-va-cau-truc-file.md`).
- Không để AI tự ý đổi API contract (tên field DTO, endpoint) đã được domain khác dùng mà không
  báo — việc này phá vỡ tích hợp giữa các domain do người khác sở hữu.

## 4. Checklist an toàn khi review code do AI sinh ra

Ngoài checklist review PR thông thường (xem `02-quy-trinh-git.md` mục 3), với code có AI hỗ trợ
cần soi thêm các lỗi AI hay mắc:

- [ ] Không có endpoint nào thiếu `@PreAuthorize`/kiểm tra vai trò (AI hay quên khi sinh
  controller mới, hoặc copy từ endpoint public rồi quên thêm).
- [ ] Không có câu query nối chuỗi SQL thủ công với input người dùng (SQL injection) — phải dùng
  JPA/parameterized query.
- [ ] Không log ra thông tin nhạy cảm (mật khẩu, token, lương, CCCD) dù chỉ ở mức log debug.
- [ ] Không có exception bị nuốt lặng lẽ (`catch (Exception e) {}` rỗng) — AI đôi khi thêm try-catch
  cho "chắc ăn" nhưng làm mất lỗi.
- [ ] Không có số liệu/ngưỡng nghiệp vụ (số ngày phép, % bảo hiểm, giờ làm chuẩn) bị AI tự đặt mặc
  định khác với tài liệu đặc tả hoặc khác với cấu hình đã thống nhất trong nhóm.
- [ ] Comment/tên biến do AI sinh có nhất quán ngôn ngữ với phần còn lại của codebase không (tránh
  file tiếng Anh xen tiếng Việt lộn xộn).
- [ ] Dependency mới AI thêm vào có thật sự cần thiết, có license phù hợp, có phải bản mới nhất ổn
  định không — không thêm thư viện chỉ vì AI quen dùng nó.

## 5. Khai báo trong PR

Nếu phần lớn logic trong PR do AI agent sinh ra (không tính auto-complete từng dòng nhỏ), ghi rõ
trong mô tả PR, ví dụ: *"Phần luồng duyệt nghỉ phép được viết với hỗ trợ của Claude Code, đã đọc
và chỉnh sửa lại theo business rule ở mục M5"*. Việc này không phải để "xin lỗi vì dùng AI" — mà để
reviewer biết nên soi phần nghiệp vụ kỹ hơn phần cú pháp.

## 6. Công cụ review có sẵn (khi dùng Claude Code)

Nếu thành viên nào dùng Claude Code, có thể tận dụng các lệnh có sẵn thay vì chỉ tự đọc diff bằng
mắt:

- `/code-review` — rà lỗi đúng/sai logic và điểm có thể đơn giản hoá trên diff hiện tại, trước khi
  mở PR.
- `/security-review` — rà lỗ hổng bảo mật cơ bản trên các thay đổi đang chờ commit.

Đây là công cụ hỗ trợ thêm, **không thay thế** review chéo giữa người với người theo mục 3 của
`02-quy-trinh-git.md`.

## 7. Khi nào không nên dùng AI agent

- Khi chưa hiểu rõ bản thân yêu cầu nghiệp vụ — nên tự đọc và làm rõ với nhóm trước, không nhờ AI
  "đoán hộ" rồi coi kết quả AI trả về là đúng.
- Khi cần quyết định kiến trúc ảnh hưởng nhiều domain (đổi cấu trúc bảng dùng chung, đổi cơ chế
  auth) — nên bàn trong nhóm trước, AI chỉ hỗ trợ triển khai sau khi đã thống nhất hướng.
