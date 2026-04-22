# Leaderboard Red-Black Tree (RBT) - Hướng dẫn tập trung vào môn học

## 1) Ứng dụng này làm được gì?
Ứng dụng mô phỏng bảng xếp hạng người chơi và trực quan hóa dữ liệu bằng cây Red-Black Tree.

Các khả năng chính:
- Nhận dữ liệu điểm số người chơi từ API backend (PHP + MySQL).
- Lưu mỗi người chơi vào cây đỏ-đen để tìm/xếp hạng hiệu quả.
- Hỗ trợ cập nhật điểm, chèn node mới, xóa/chèn lại node khi dữ liệu thay đổi.

## 2) CÂY ĐỎ-ĐEN ở đâu?
Toàn bộ phần cài đặt cấu trúc dữ liệu và thuật toán RBT nằm ở:
- `public/assets/js/rbt.js`

Các hàm quan trọng cần đọc:
- `rotateLeft`, `rotateRight`: phép quay trái/phải.
- `insert`, `fixInsert`: chèn node và cân bằng lại theo tính chất RBT.
- `delete`, `fixDelete`: xóa node và cân bằng lại.
- `compareKeys`: quy tắc so sánh key để giữ cây có thứ tự.

## 3) Các file liên quan trực tiếp đến logic xếp hạng
- `public/assets/js/app.js`: đồng bộ dữ liệu API vào cây (diff delete/insert), tính rank, vẽ SVG.
- `api/get_scores.php`: API lấy danh sách người chơi.
- `api/post_score.php`: API cập nhật điểm.
- `app/Services/LeaderboardService.php`: truy vấn MySQL và sắp xếp dữ liệu.

## 4) Workflow dữ liệu (để hiểu bản chất thuật toán)
1. Frontend gọi API lấy danh sách người chơi.
2. Dữ liệu mới được so sánh với state cũ.
3. Người chơi bị xóa (khỏi CSDL) -> `tree.delete(...)`.
4. Người chơi mới -> `tree.insert(...)`.
5. Người chơi đổi điểm -> xóa key cũ rồi chèn key mới.
6. Sau khi cập nhật cây, giao diện vẽ lại node/cạnh và tính lại rank.