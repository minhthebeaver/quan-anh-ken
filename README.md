# 🍻 Quán Anh Ken — Nhậu Online (v2)
☎ 098 864 9841 · Quán nhậu vỉa hè Sài Gòn 3D, multiplayer realtime (Three.js + Socket.IO). Tiền ảo.

## Chạy
```bash
npm install
npm start
```
Mở http://localhost:3000

## Có gì mới ở v2
- **Bàn theo nhóm, sát nhau hơn**: bàn tâm sự 4 người, nhóm bạn 6, gia đình 8, công ty 12, tiệc lớn 16 (bàn inox ghép dài). 13 bàn trống – 88 ghế.
- **Chọn nhân vật Nam / Nữ**, kiểu tóc theo giới tính; mặt, tóc, áo, tay chi tiết hơn.
- **Ví 500.000đ** mỗi người. Gọi món, xe đẩy, mời phục vụ đều trừ tiền theo giá quán thật (bia 25k, trà đá 5k, khăn lạnh 2k, ốc 85k, lẩu 250k…).
- **Mời phục vụ ngồi nâng ly** (Em Vy, Em Thảo, Anh Long): 50.000đ / 5 phút, ngồi ghế trống gần bạn nhất, cụng ly – trò chuyện – nhập hội “Dzô”.
- **Rửa chén kiếm tiền**: bồn rửa góc phải trong quán, 5.000đ/cái (kỳ sạch ~3 giây/cái).
  Chống lạm dụng: server kiểm tra thời gian kỳ tối thiểu, mã từng cái chén, phải đứng tại bồn; tối đa 12 cái/5 phút (≈ 2 chai) và 36 cái/giờ.
- Ví giữ theo trình duyệt (vào lại vẫn còn tiền); mỗi mạng tối đa 20 ví mới / 12 giờ.
- Bỏ mái che, thay bằng dây đèn vàng giăng ngang; bảng hiệu **QUÁN ANH KEN** chữ tự co vừa khung.
- Đồ hoạ: vật liệu phản chiếu (inox, chai, nền gạch), đồ lặt vặt trên bàn, rác vỏ đậu, ban công – cây cảnh, quạt, TV, bình gas, thùng đá…

## Phím
| Phím | Tác dụng |
|---|---|
| WASD / Shift | Đi / chạy |
| Kéo chuột, cuộn | Xoay / zoom camera |
| E | Ngồi / đứng dậy / rửa chén |
| Space | Hô “Dzô” / bấm đúng nhịp (khi rửa chén: kỳ) |
| R · G | Uống · đổi ly bia ⇄ trà đá |
| M · N · B | Thực đơn · mời phục vụ · hoá đơn |
| 1 · 2 · 3 | Oẳn tù tì · xoay chai · xúc xắc |
| F | Mua đồ xe đẩy |
| Enter | Chat (nút Bàn/Quán đổi phạm vi) |
| H | Ẩn giao diện |

## Hiệu năng
Gộp mesh tĩnh theo vật liệu, instancing cho ghế/két bia/bóng đèn/rác, không shadow map, 4–6 đèn điểm,
tự chuyển đồ hoạ tiết kiệm khi FPS thấp (nút HD/SD).

## Deploy (Render)
Build `npm install`, Start `npm start`. Dữ liệu ví lưu trong RAM (server khởi động lại sẽ reset).

🚫 Đã uống rượu bia thì không lái xe.
