# Nhà Vườn Cấp 4 – mặt bằng 2D và mô hình 3D (web prototype)

> English: [README.md](README.md) · Demo: https://fighttechvn.github.io/home-3d/

Trang web xem nhà vườn cấp 4 (7,0 × 19,3 m) dựng lại từ bản vẽ: bản vẽ 2D, mô hình 3D, đi dạo bằng nhân vật,
sắp xếp nội thất, vật liệu thật, ngày/đêm và quay video tham quan.

## Chạy thử

Trang dùng ES module nên cần mở qua máy chủ tĩnh (mở trực tiếp file `index.html` sẽ không chạy):

```bash
python3 -m http.server 8080
```

Rồi mở `http://localhost:8080`. Three.js 0.147 nằm sẵn trong `vendor/three/` (giấy phép MIT), không cần mạng.

## Cấu trúc

```
index.html                 khung giao diện (không có logic)
styles/
  base.css                 màu, chữ, khung ứng dụng, thanh công cụ, bảng phòng
  plan-2d.css              bản vẽ SVG
  viewer-3d.css            lớp phủ của mô hình 3D: nhãn, bản đồ nhỏ, joystick
  furniture-editor.css     thư viện đồ, danh sách đồ, thanh đồ đang chọn
  video-tour.css           hộp thoại quay video
scripts/
  main.js                  khởi động theo thứ tự
  core/                    tiện ích dùng chung, không phụ thuộc tính năng nào
    dom.js                 truy vấn DOM, định dạng số, lưu cài đặt nhỏ
    geometry.js            vector 2D, đa giác
    random.js              số ngẫu nhiên có hạt giống
    events.js              kênh sự kiện giữa các tính năng (danh sách sự kiện ở đầu file)
    app-state.js           trạng thái chung (chế độ xem, phòng/đồ đang chọn, đang đi dạo...)
    room-selection.js      chọn phòng
  data/                    số liệu thuần, sửa ở đây khi cần chỉnh bản vẽ
    house-plan.js          tường, cửa, cửa sổ, phòng, khu đất, cây
    furniture-catalog.js   đồ theo bản vẽ, thư viện đồ dùng, tên loại đồ
    camera-views.js        góc nhìn 3D
    lighting-fixtures.js   mặt trời, mặt trăng, đèn ban đêm
    tour-shots.js          các cảnh của video tham quan
  model/
    wall-geometry.js       tách tường thành đoạn/cung, gắn cửa vào tường
    furniture-store.js     kho đồ nội thất, phát sự kiện khi thay đổi
  plan2d/                  bản vẽ 2D
    svg-shapes.js          đổi đơn vị (m → cm) và hình SVG cơ bản
    furniture-symbols.js   ký hiệu đồ nhìn từ trên
    plan-renderer.js       dựng SVG mặt bằng và lớp đồ nội thất
    plan-viewport.js       vừa khung, phóng to, kéo, chạm chọn phòng
  viewer3d/                mô hình 3D
    viewer-context.js      đối tượng cảnh dùng chung, cài đặt hiển thị
    viewer.js              khởi tạo, đổi kích thước, vòng lặp vẽ
    primitives.js          khối hình cơ bản
    texture-utils.js       tạo vân bằng canvas, bản đồ pháp tuyến
    materials.js           vật liệu cơ bản
    materials-realistic.js vật liệu thật (PBR) và bầu trời ban ngày
    realistic-mode.js      bật/tắt vật liệu thật
    house-builder.js       nền, sàn, tường, cửa, mái
    site-builder.js        sân cỏ, cây, hàng rào
    furniture-models.js    mô hình 3D của từng loại đồ
    furniture-scene.js     đồng bộ mô hình đồ với kho đồ
    lighting.js            ánh sáng ngày/đêm, đèn trong nhà và sân vườn
    display-settings.js    nút mái, cắt tường, nội thất, nhãn
    camera-controller.js   góc nhìn, bay camera, góc nhìn trong phòng
    room-labels.js         nhãn tên phòng nổi
  features/
    walk/                  đi dạo: nhân vật, va chạm, bản đồ nhỏ, điều khiển
    furniture-editor/      sắp xếp đồ và lưu bố cục
    video-tour/            video tham quan
  ui/
    room-panel.js          danh sách phòng và thẻ thông tin
    view-mode.js           chuyển 2D/3D, địa chỉ #2d / #3d
```

## Quy ước

- Đơn vị mét. Trên mặt bằng: x sang phải, y xuống dưới; trong 3D, y của mặt bằng là trục z.
- Các tính năng không gọi thẳng vào nhau khi có thể tránh: chúng báo qua `core/events.js`.
- Bố cục nội thất lưu theo định dạng mới (`type`, `center`, `size`, `rotation`…). Bố cục lưu từ phiên bản cũ
  (`t`, `c`, `s`, `r`…) được tự chuyển đổi khi tải (`model/furniture-store.js`).
