
# LeaderBoard - Trực quan Cây Đỏ-Đen

Ứng dụng **minh họa Red-Black Tree (RBT)** và Binary Search Tree (BST) để so sánh.

## Tổng quan

- **Giao diện**: Vẽ 2 cây side-by-side bằng SVG (RBT trái, BST phải)
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

```javascript
compareKeys(a, b) {
  // 1. Điểm cao hơn → hạng tốt hơn
  if (a.score !== b.score) {
    return a.score - b.score;
  }
  // 2. Cùng điểm → đạt sớm hơn → hạng tốt hơn
  if (a.scoreAchievedAt !== b.scoreAchievedAt) {
    return a.scoreAchievedAt < b.scoreAchievedAt ? 1 : -1;
  }
  return 0;
}
```

---

## Hàm tìm hạng O(log n) — `getRank(key)`

Thay vì duyệt toàn bộ cây O(n), mỗi node lưu `size` (số node trong cây con):

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
---

## Quy trình khi bạn nhập dữ liệu

1. Nhập **Username** + **Điểm số** → submit
2. Gửi tới API backend (PHP)
3. Backend upsert vào MySQL (nếu score khác → cập nhật `score_achieved_at`)
4. Frontend fetch dữ liệu mới
5. **Đồng bộ cây**:
   - Người chơi mới → `tree.insert()`
   - Người chơi bị xóa → `tree.delete()`
   - Điểm thay đổi → `tree.delete(key cũ)` + `tree.insert(key mới)`
6. Vẽ SVG với animation → **bạn thấy cây xoay, node di chuyển!**

## Ghi chú

- **client_id** được lưu localStorage để khóa username (1 người/device)
- **rate_limit**: 30s giữa 2 lần cập nhật điểm (tránh spam)
- **score_achieved_at**: Chỉ cập nhật khi điểm **thay đổi**
