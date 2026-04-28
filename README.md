
# LeaderBoard - Trực quan Cây Đỏ-Đen

Ứng dụng mô phỏng bảng xếp hạng người chơi và trực quan hóa dữ liệu bằng cấu trúc **Cây Đỏ-Đen (Red-Black Tree)** kết hợp **Cây tìm kiếm nhị phân (Binary Search Tree)** để so sánh.
Mỗi người chơi được biểu diễn là một node. Khi có thao tác **thêm, xóa, hoặc cập nhật điểm**, cây sẽ tự động xử lý logic (chèn, xóa, xoay, đổi màu) và kích hoạt hiệu ứng di chuyển (animation) trực tiếp trên màn hình.

## Tổng quan

- **Backend**: PHP + MySQL lưu dữ liệu người chơi
- **Frontend**: Đồng bộ dữ liệu từ API, cập nhật cây, tính hạng, vẽ animation

Mỗi người chơi là một node. Khi bạn **thêm, xóa, hoặc cập nhật điểm**, cây sẽ tự động **chèn, xóa, xoay, đổi màu** và bạn sẽ **thấy nó di chuyển trên màn hình**.

---

## File cấu trúc dữ liệu

### RBT — Cây đỏ-đen (tự cân bằng)
**File**: `public/assets/js/rbt.js`

**Hàm chính**:
- `insert(player)` — Chèn node mới
- `delete(key)` — Xóa node
- `rotateLeft(x)`, `rotateRight(y)` — Xoay cây để cân bằng
- `fixInsert(node)`, `fixDelete(x)` — Sửa tính chất RBT
- `getRank(key)` — Lấy **hạng** người chơi trong O(log n) bằng Order Statistic
- `compareKeys(a, b)` — So sánh khóa theo quy tắc: điểm, thời gian

**Đặc điểm**: Mỗi node có `size` (số node trong cây con) để tính hạng nhanh.

### BST — Cây tìm kiếm nhị phân (không cân bằng)
**File**: `public/assets/js/bst.js`

**Hàm chính**: `insert`, `delete`, `compareKeys`

**Đặc điểm**: Đơn giản hơn RBT, nhưng có thể mất cân bằng → chèn/xóa/tìm kiếm trở nên chậm.

**Mục đích**: So sánh. Khi dữ liệu hàng loạt theo thứ tự, BST sẽ biến thành dãy thẳng O(n), còn RBT vẫn O(log n).

---

## Quy tắc xếp hạng

Xác định vị trí node (hạng) dựa trên hàm `compareKeys(a, b)` với 2 tiêu chí ưu tiên:

1. **Điểm số:** Điểm cao hơn sẽ có hạng tốt hơn (nằm bên phải cây).
2. **Thời gian:** Nếu điểm bằng nhau, ai đạt được điểm số đó sớm hơn (`scoreAchievedAt` nhỏ hơn) sẽ có hạng tốt hơn.

---

## Hàm tìm hạng O(log n) — `getRank(key)`

Thay vì duyệt toàn bộ cây O(n), ứng dụng lưu thêm thuộc tính `size` (tổng số node trong nhánh) tại mỗi node:

```javascript
getRank(key) {
  let current = this.root;
  let rank = 1;

  while (current !== this.nil) {
    const cmp = this.compareKeys(key, current.key);
    
    if (cmp === 0) {
      rank += current.right.size;  
      return rank;
    }
    
    if (cmp < 0) {
      rank += current.right.size + 1; 
      current = current.left;
    } else {
      current = current.right;
    }
  }

  return -1;
}
```
Quy tắc tính hạng cốt lõi: **Hạng của bạn = 1 + (Tổng số người chơi có điểm cao hơn bạn)**.

Hàm `getRank(key)` sẽ bắt đầu từ đỉnh cây (`root`) đi xuống. Tại mỗi ngã rẽ, nó thực hiện logic sau:

* **Trường hợp 1 (Tìm trúng đích):** Đã tìm thấy node của bạn. Thuật toán sẽ lấy thứ hạng hiện tại cộng thêm toàn bộ số node ở nhánh phải (`right.size` - những người có điểm cao hơn) và trả về kết quả.
* **Trường hợp 2 (Rẽ trái):** Bạn có điểm thấp hơn node hiện tại nên bị đẩy sang trái. Do đó, node hiện tại (`+1`) và toàn bộ nhánh phải của nó (`right.size`) đều lớn điểm hơn bạn. Thuật toán cộng dồn con số này vào biến `rank` rồi mới đi tiếp.
* **Trường hợp 3 (Rẽ phải):** Bạn có điểm cao hơn node hiện tại. Những người ở nhánh trái và node hiện tại đều có điểm thấp hơn bạn, không thể đẩy thứ hạng của bạn xuống. Thuật toán giữ nguyên `rank` và đi tiếp sang phải.
---
