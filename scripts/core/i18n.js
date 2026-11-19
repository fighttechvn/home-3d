/**
 * Ngôn ngữ giao diện. Chuỗi gốc trong mã là tiếng Việt; bảng EN dưới đây dịch theo đúng chuỗi gốc.
 *
 * Chọn ngôn ngữ: ?lang=en|vi trên địa chỉ, nếu không có thì theo <html lang> (bản nhúng trên trang
 * giới thiệu tiếng Anh đặt lang="en"). Module này phải được nạp đầu tiên trong main.js: nó dịch
 * dữ liệu dùng chung (tên phòng, tên đồ, cảnh video) trước khi các module khác đọc tới.
 * Các file trong scripts/data/ giữ nguyên tiếng Việt vì scripts/export-shared-data.mjs đọc chúng.
 */
import { ROOMS, FLOOR_FINISH_NAMES } from '../data/house-plan.js';
import {
  FURNITURE_TYPE_NAMES, PLAN_FURNITURE_TAGS, PLAN_TEXT_NOTES, LIBRARY_CATEGORIES, FURNITURE_LIBRARY,
} from '../data/furniture-catalog.js';
import { TOUR_SHOTS } from '../data/tour-shots.js';

const SUPPORTED = ['vi', 'en'];

function pickLanguage() {
  let requested = null;
  try { requested = new URLSearchParams(location.search).get('lang'); } catch { /* không có location */ }
  if (requested && SUPPORTED.includes(requested.toLowerCase())) return requested.toLowerCase();
  const declared = (document.documentElement.lang || 'vi').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(declared) ? declared : 'vi';
}

export const LANG = pickLanguage();
export const NUMBER_LOCALE = LANG === 'en' ? 'en-US' : 'vi-VN';

const EN = {
  // khung trang
  'Nhà Vườn Cấp 4': 'Garden House',
  'NHÀ VƯỜN CẤP 4  ·  7,0 × 19,3 m': 'GARDEN HOUSE  ·  7.0 × 19.3 m',
  '7,0 × 19,3 m': '7.0 × 19.3 m',
  '· 2 phòng ngủ · ≈ 135 m²': '· 2 bedrooms · ≈ 135 m²',
  'Chế độ xem': 'View mode',
  'Bản vẽ 2D': '2D plan',
  'Mô hình 3D': '3D model',
  'Mặt bằng 2D': '2D floor plan',
  'Phóng to': 'Zoom in',
  'Thu nhỏ': 'Zoom out',
  'Vừa khung': 'Fit',
  'Nội thất': 'Furniture',
  'Kích thước': 'Dimensions',
  'Sắp xếp đồ': 'Arrange furniture',
  'Kéo để di chuyển · Cuộn hoặc chụm 2 ngón để phóng to · Chạm vào phòng để xem chi tiết':
    'Drag to pan · Scroll or pinch to zoom · Tap a room for details',
  'Đi dạo': 'Walk',
  'Góc thứ 3': 'Third person',
  'Mắt nhân vật': 'First person',
  'Toàn cảnh': 'Overview',
  'Nhìn từ trên': 'Top down',
  'Mặt tiền': 'Front',
  'Từ sân vườn': 'From the garden',
  'Ngày': 'Day',
  'Đêm': 'Night',
  'Đèn trong nhà': 'Indoor lights',
  'Đèn sân vườn': 'Garden lights',
  'Vật liệu thật': 'Realistic materials',
  'Mái': 'Roof',
  'Cắt tường': 'Cut walls',
  'Nhãn': 'Labels',
  'Quay video': 'Record video',
  'Đồ đang chọn': 'Selected item',
  'Xoay 90°': 'Rotate 90°',
  'Xoay 15°': 'Rotate 15°',
  'Nhân bản': 'Duplicate',
  'Ẩn': 'Hide',
  'Hiện lại': 'Show',
  'Xóa': 'Delete',
  'Xóa {name}': 'Delete {name}',
  'Bỏ chọn': 'Deselect',
  'Xong': 'Done',
  'Các phòng': 'Rooms',
  'Thư viện đồ dùng': 'Furniture library',
  'Chọn một món để đặt vào giữa khung nhìn, sau đó kéo nó tới chỗ muốn đặt (trên bản vẽ 2D hoặc trong 3D).':
    'Pick an item to drop it in the middle of the view, then drag it where you want it (on the 2D plan or in 3D).',
  'Đồ trong nhà': 'Furniture in the house',
  'Khôi phục theo bản vẽ': 'Reset to the drawing',
  'Bấm lần nữa để khôi phục': 'Click again to reset',
  'Thông số ước lượng': 'Estimated specs',
  'Kích thước phủ bì': 'Overall size',
  '7.000 × 19.300 mm': '7,000 × 19,300 mm',
  'Diện tích xây dựng': 'Built area',
  '≈ 135,1 m²': '≈ 135.1 m²',
  'Chiều cao trần': 'Ceiling height',
  '3.400 mm': '3,400 mm',
  'Bo góc tường': 'Wall corner radius',
  'Tường bao / ngăn': 'Exterior / interior walls',
  'Kích thước được đo lại từ bản vẽ trong video, lấy mốc là kích thước 3000 mm ghi trên bản vẽ. Sai số khoảng ±10 cm. Mái bằng và sân vườn được dựng thêm để dễ hình dung.':
    'Dimensions were measured from the drawing in a video, scaled from the 3000 mm dimension marked on it, so expect about ±10 cm. The flat roof and the garden were added to help you picture it.',
  'Video tham quan nhà': 'House tour video',
  'Đóng': 'Close',
  'Chất lượng': 'Quality',
  'Ban đêm': 'Night',
  'Xem trước': 'Preview',
  'Quay & xuất video': 'Record & export',
  'Dừng': 'Stop',
  'Lưu video': 'Save video',
  'Ngôn ngữ': 'Language',

  // gợi ý 3D
  'Kéo để xoay · Cuộn hoặc chụm để thu phóng · Chuột phải hoặc 2 ngón để di chuyển · Bấm Đi dạo để điều khiển nhân vật':
    'Drag to orbit · Scroll or pinch to zoom · Right-drag or two fingers to pan · Press Walk to control a character',
  'Kéo để nhìn quanh · Cuộn để tiến, lùi · Nhấn W A S D hoặc nút Đi dạo để đi tiếp từ đây':
    'Drag to look around · Scroll to move forward or back · Press W A S D or Walk to keep walking from here',
  'W A S D hoặc phím mũi tên: đi · Shift: chạy · Kéo: xoay camera · Cuộn: xa, gần · V: mắt nhân vật · Esc: thoát':
    'W A S D or arrow keys: walk · Shift: run · Drag: turn camera · Scroll: closer, farther · V: first person · Esc: exit',
  'W / S: đi tới, lùi · A / D: quay trái, phải · Shift: chạy · Kéo: nhìn quanh · V: góc thứ 3 · Esc: thoát':
    'W / S: forward, back · A / D: turn left, right · Shift: run · Drag: look around · V: third person · Esc: exit',
  'Không mở được chế độ 3D trên thiết bị này (cần WebGL). Bản vẽ 2D vẫn dùng được.':
    "3D can't open on this device (it needs WebGL). The 2D plan still works.",
  'Không tải được thư viện Three.js': "Couldn't load Three.js",
  'Mô hình 3D, kéo để xoay': '3D model, drag to orbit',
  'Đang tạo vật liệu thật… {percent}%': 'Building realistic materials… {percent}%',
  'Không tạo được vật liệu thật trên thiết bị này.': "Realistic materials aren't available on this device.",
  'Bản đồ nhỏ, chạm để đưa nhân vật tới đó': 'Mini map, tap to move the character there',
  'Chạm để dịch chuyển': 'Tap to teleport',
  'Đang ở <b>{room}</b>': 'In <b>{room}</b>',
  'Xem phòng này trong 3D': 'See this room in 3D',
  'Xem trên bản vẽ 2D': 'See it on the 2D plan',
  'SÂN VƯỜN': 'GARDEN',
  'MẶT TIỀN': 'FRONT',
  'Mặt bằng nhà vườn cấp 4': 'Garden house floor plan',

  // sắp xếp đồ, lưu bố cục
  'Thêm {name}': 'Add {name}',
  'Đã lưu trên trình duyệt này': 'Saved in this browser',
  'Đang lưu…': 'Saving…',
  'Đã lưu vào tài khoản của bạn': 'Saved to your account',
  'Chưa lưu được lên tài khoản, đã lưu trên trình duyệt này': "Couldn't save to your account; saved in this browser",
  'Đã tải bố cục đã lưu': 'Loaded your saved layout',

  // video tham quan
  'Mô hình 3D dựng từ bản vẽ mặt bằng · 7,0 × 19,3 m': '3D model built from the floor plan · 7.0 × 19.3 m',
  'Đang quay…': 'Recording…',
  'Đang phát…': 'Playing…',
  '{state} {elapsed} / {total} giây': '{state} {elapsed} / {total} s',
  'Không bắt đầu ghi được video trên trình duyệt này. Đang phát xem trước.':
    "This browser couldn't start recording. Playing a preview instead.",
  'Đã dừng.': 'Stopped.',
  'Đã phát xong. Bấm Quay & xuất video để tạo tệp video.': 'Preview finished. Press Record & export to make a video file.',
  'Đang hoàn tất tệp video…': 'Finishing the video file…',
  'Không ghi được khung hình nào. Hãy thử lại với 720p.': 'No frames were recorded. Try again at 720p.',
  'Video đã sẵn sàng. Bấm Lưu video để tải về.': 'The video is ready. Press Save video to download it.',
  'Xong: video {width}×{height}, {size} MB (.{extension}).': 'Done: {width}×{height} video, {size} MB (.{extension}).',
  'Trang đang mở ở nơi không cho phép lưu tệp. Video vẫn xem được ở khung trên.':
    "This page can't save files here. You can still watch the video above.",
  'Đã gửi video đi.': 'Video sent.',
  'Đã lưu video.': 'Video saved.',
  'Bạn đã huỷ lưu video. Có thể bấm Lưu video lần nữa.': 'Saving was cancelled. You can press Save video again.',
  'Đang có một hộp thoại lưu khác, thử lại sau giây lát.': 'Another save dialog is open. Try again in a moment.',
  'Video quá lớn, hãy quay lại ở 720p.': 'The video is too large. Record it again at 720p.',
  'Không lưu được video ở đây. Video vẫn xem được ở khung trên.': "The video can't be saved here. You can still watch it above.",
  'Camera lia qua {count} cảnh: từ trên cao, mặt tiền, từng phòng rồi ra sân vườn. Dài khoảng {seconds} giây.':
    'The camera moves through {count} shots: from above, the front, each room, then out to the garden. About {seconds} seconds.',
  'Trình duyệt này không hỗ trợ ghi video. Bạn vẫn có thể bấm Xem trước.': "This browser can't record video. You can still press Preview.",
  'Bấm Xem trước hoặc Quay & xuất video': 'Press Preview or Record & export',

  // phòng
  'Phòng ngủ 1': 'Bedroom 1',
  'Phòng ngủ 2': 'Bedroom 2',
  'WC · Tắm': 'Bathroom',
  'WC': 'WC',
  'Lavabo': 'Washbasin',
  'Hành lang': 'Hallway',
  'Phòng ăn': 'Dining room',
  'Bếp + Bar': 'Kitchen + bar',
  'Sinh hoạt chung': 'Family area',
  'Phòng khách': 'Living room',
  'Tiền sảnh': 'Foyer',
  'Sảnh': 'Porch',
  'Sảnh bên': 'Side terrace',
  'Sân vườn': 'Garden',
  'Phòng ngủ chính: giường 1m8 tựa tường hông, tủ áo dài 3,7 m, bàn làm việc, sofa đọc sách đặt sát cửa kính lớn nhìn ra vườn.':
    'Main bedroom: a 1.8 m bed against the side wall, a 3.7 m wardrobe, a desk, and a reading sofa by the large glass door to the garden.',
  'Khu tắm đứng có vách kính, bồn cầu, cửa sổ lấy sáng cao.': 'Walk-in shower with a glass screen, toilet, and a high window for light.',
  'Lavabo đặt ngoài khu WC, mở vòm ra hành lang để dùng chung.': 'The washbasin sits outside the WC, under an arch onto the hallway, so everyone can use it.',
  'Nối phòng ăn với cửa sau ra sân vườn, dẫn vào phòng ngủ 1 và lavabo.': 'Links the dining room to the back door and garden, and leads to bedroom 1 and the washbasin.',
  'Bàn ăn 6 ghế dưới đèn thả gỗ, cửa sổ hông. Góc tường bo tròn R350 dẫn sang phòng ngủ 2.':
    'A six-seat dining table under a wooden pendant, with a side window. A rounded R350 corner leads to bedroom 2.',
  'Giường 1m5, bàn học cạnh cửa sổ, tủ áo và kệ thấp. Cửa vòm gỗ mở từ phòng ăn.':
    'A 1.5 m bed, a study desk by the window, a wardrobe and a low cabinet. A wooden arched door opens from the dining room.',
  'Tủ lạnh, tủ đồ khô, bếp chữ I dọc tường có cửa sổ trên chậu rửa, đảo bar bo tròn với 2 ghế cao.':
    'Fridge, pantry, a single-wall kitchen with a window over the sink, and a rounded bar island with two stools.',
  'Góc làm việc đôi, mặt hông là cửa kính xếp mở toàn bộ ra sảnh bên và vườn.':
    'A desk for two. The side wall is a folding glass door that opens fully onto the side terrace and garden.',
  'Sofa văng dài, bộ bàn trà tròn lồng nhau trên thảm, kệ TV dọc vách, cửa sổ lớn ra mặt tiền.':
    'A long sofa, nesting round coffee tables on a rug, a TV console along the wall, and a large front window.',
  'Cửa chính rộng 0,9 m, tủ giày sát tường.': 'A 0.9 m front door and a shoe cabinet against the wall.',
  'Lối vào chính có mái che, lùi vào trong mặt tiền.': 'The covered main entrance, set back into the front.',
  'Hiên sàn gỗ bên ngoài cửa kính xếp, đặt ghế thư giãn và cây xanh.': 'A wooden deck outside the folding glass door, with lounge chairs and plants.',

  // vật liệu sàn
  'Sàn gỗ': 'Wood floor',
  'Gạch 60×120': '60×120 tiles',
  'Gạch chống trơn': 'Non-slip tiles',
  'Đá lát sảnh': 'Stone paving',
  'Sàn gỗ ngoài trời': 'Outdoor decking',

  // loại đồ và thư viện
  'Giường': 'Bed',
  'Tab đầu giường': 'Nightstand',
  'Tranh treo tường': 'Wall art',
  'Bàn làm việc': 'Desk',
  'Ghế': 'Chair',
  'Sofa thư giãn': 'Loveseat',
  'Bàn tròn': 'Round table',
  'Tủ quần áo': 'Wardrobe',
  'Kệ thấp': 'Low cabinet',
  'Sen tắm': 'Shower',
  'Vách kính tắm': 'Shower screen',
  'Bồn cầu': 'Toilet',
  'Bàn ăn': 'Dining table',
  'Đèn thả': 'Pendant lamp',
  'Cây cảnh': 'Plant',
  'Tủ lạnh': 'Fridge',
  'Tủ đồ khô': 'Pantry',
  'Tủ bếp dưới': 'Base cabinet',
  'Chậu rửa': 'Sink',
  'Bếp từ': 'Induction hob',
  'Đảo bar': 'Bar island',
  'Ghế bar': 'Bar stool',
  'Bàn làm việc đôi': 'Double desk',
  'Thảm': 'Rug',
  'Sofa văng': 'Sofa',
  'Đèn cây': 'Floor lamp',
  'Kệ TV': 'TV console',
  'TV': 'TV',
  'Tủ giày': 'Shoe cabinet',
  'Ghế thư giãn': 'Lounge chair',
  'Ghế bành': 'Armchair',
  'Kệ sách': 'Bookshelf',
  'Tủ ngăn kéo': 'Dresser',
  'Bồn tắm': 'Bathtub',
  'Ghế băng gỗ': 'Wooden bench',
  'BAR': 'BAR',
  'TẮM': 'SHOWER',
  'Tất cả': 'All',
  'Phòng ngủ': 'Bedroom',
  'Bếp & ăn': 'Kitchen & dining',
  'Phòng tắm': 'Bathroom',
  'Trang trí': 'Decor',
  'Ngoài trời': 'Outdoor',
  'Sofa văng 3 chỗ': '3-seat sofa',
  'Bàn trà tròn': 'Round coffee table',
  'Giường đôi 1m8': '1.8 m double bed',
  'Giường 1m5': '1.5 m bed',
  'Giường đơn 1m': '1 m single bed',
  'Bàn ăn chữ nhật': 'Rectangular dining table',
  'Bàn ăn tròn': 'Round dining table',
  'Ghế ăn': 'Dining chair',
  'Đảo bếp': 'Kitchen island',
  'Đèn thả bàn ăn': 'Dining pendant',
  'Cây cảnh lớn': 'Large plant',
  'Cây nhỏ': 'Small plant',
  'Bàn cà phê': 'Bistro table',
  'Chậu rửa mặt': 'Washbasin',
  'Bàn trang điểm': 'Dressing table',

  // cảnh video
  '7,0 × 19,3 m · 2 phòng ngủ · sân vườn': '7.0 × 19.3 m · 2 bedrooms · garden',
  'Sảnh vào lùi trong, cửa kính lớn ra vườn trước': 'A set-back entrance and a large glass door to the front garden',
  'Sofa văng, bàn trà tròn lồng nhau, kệ TV': 'Sofa, nesting round coffee tables, TV console',
  'Bếp chữ I dọc tường, đảo bar bo tròn': 'Single-wall kitchen and a rounded bar island',
  'Cửa kính xếp mở toàn bộ ra sảnh bên': 'A folding glass door that opens fully onto the side terrace',
  'Bàn ăn 6 ghế, góc tường bo tròn R350': 'Six-seat dining table, rounded R350 corner',
  'Cửa vòm gỗ, bàn học cạnh cửa sổ': 'Wooden arched door, study desk by the window',
  'Cửa kính lớn hai mặt nhìn ra vườn': 'Large glass doors on two sides facing the garden',
  'Hiên gỗ, lối đá dẫn ra vườn': 'Wooden deck and a stone path into the garden',
  'Mặt bằng tổng thể': 'Whole floor plan',
  'Diện tích xây dựng ≈ 135 m²': 'Built area ≈ 135 m²',
  // AR / VR
  'AR / VR': 'AR / VR',
  'Xem AR / VR': 'View in AR / VR',
  'Xem nhà bằng AR qua camera hoặc kính VR': 'See the house in camera AR or a VR headset',
  'Đang chuẩn bị mô hình…': 'Preparing the model…',
  'AR: mô hình thu nhỏ 1:30': 'AR: 1:30 scale model',
  'Đặt nhà thu nhỏ lên bàn hoặc sàn qua camera. Chụm 2 ngón để phóng to, thu nhỏ.': 'Place a miniature house on a table or the floor through the camera. Pinch to resize.',
  'AR: kích thước thật 1:1': 'AR: life size 1:1',
  'Đặt nhà đúng kích thước ra sân hoặc bãi trống rồi đi vào bên trong.': 'Place the house at full size in a yard or open space, then walk inside.',
  'AR qua camera': 'Camera AR',
  'Hướng camera xuống sàn, chạm để đặt nhà. Đổi được giữa 1:30 và 1:1.': 'Point the camera at the floor and tap to place the house. Switch between 1:30 and 1:1.',
  'Kính VR': 'VR headset',
  'Đứng trong nhà đúng tỉ lệ. Bấm cò hoặc chạm màn hình để sang phòng tiếp theo.': 'Stand inside the house at true scale. Pull the trigger or tap the screen to move to the next room.',
  'Nhìn quanh bằng con quay': 'Look around with the gyroscope',
  'Tắt nhìn bằng con quay': 'Turn off gyroscope look',
  'Đi dạo ở mắt nhân vật, xoay máy để nhìn quanh như đang đứng trong nhà.': 'Walk at eye level and turn your device to look around as if you were standing inside.',
  'Kính Cardboard (2 mắt)': 'Cardboard viewer (stereo)',
  'Chia đôi màn hình cho kính thực tế ảo bằng bìa. Chạm màn hình để đi tới.': 'Split the screen for a cardboard VR viewer. Tap the screen to walk forward.',
  'Tải file USDZ': 'Download USDZ file',
  'Mô hình 1:1 ({size}) để mở bằng Quick Look trên iPhone, iPad, Mac hoặc gửi qua AirDrop.': 'Life-size model ({size}) to open with Quick Look on iPhone, iPad or Mac, or send by AirDrop.',
  'Muốn xem AR qua camera, mở trang này bằng Safari trên iPhone, iPad hoặc Chrome trên điện thoại Android.': 'For camera AR, open this page in Safari on iPhone or iPad, or in Chrome on an Android phone.',
  'AR Quick Look của Apple sẽ mở camera. Di chuyển máy chậm để dò mặt sàn.': 'Apple AR Quick Look opens the camera. Move your device slowly so it can find the floor.',
  'Không tạo được mô hình AR trên thiết bị này.': 'Could not build the AR model on this device.',
  'Không mở được AR trên thiết bị này.': 'Could not start AR on this device.',
  'Không mở được kính VR trên thiết bị này.': 'Could not start VR on this device.',
  'Thoát AR': 'Exit AR',
  'Thu nhỏ 1:30': 'Scale 1:30',
  'Kích thước thật 1:1': 'Life size 1:1',
  'Chạm chỗ khác để dời nhà · Đi quanh để xem': 'Tap elsewhere to move the house · Walk around to look',
  'Hướng camera xuống sàn, chạm vào vòng tròn để đặt nhà': 'Point the camera at the floor and tap the ring to place the house',
  'Thoát kính': 'Exit viewer',
  'Xoay ngang máy và đặt vào kính Cardboard · Chạm màn hình để đi tới': 'Turn your phone sideways and put it in the Cardboard viewer · Tap the screen to walk forward',
  'Cần cho phép truy cập chuyển động và hướng của máy để nhìn quanh bằng con quay.': 'Allow access to motion and orientation to look around with the gyroscope.',
  'Không đọc được con quay trên thiết bị này.': 'Could not read the gyroscope on this device.',
  'Xoay máy để nhìn quanh · Joystick hoặc W A S D để đi · Kéo để xoay thêm': 'Turn your device to look around · Joystick or W A S D to walk · Drag to turn further',
  // Mô hình 3D của người dùng
  'Mở file 3D': 'Open 3D file',
  'Về ngôi nhà': 'Back to the house',
  'Mở mô hình .glb, .gltf, .obj hoặc .stl trên máy để xem 3D, AR và VR': 'Open a .glb, .gltf, .obj or .stl model from your device to view in 3D, AR and VR',
  '{name} · Kéo để xoay · Cuộn hoặc chụm để thu phóng · Bấm AR / VR để xem qua camera hoặc kính': '{name} · Drag to orbit · Scroll or pinch to zoom · Tap AR / VR to view through the camera or a headset',
  'Chọn file .glb, .gltf, .obj hoặc .stl.': 'Choose a .glb, .gltf, .obj or .stl file.',
  'File lớn quá (tối đa 200 MB).': 'The file is too large (200 MB max).',
  'Đang mở {name}…': 'Opening {name}…',
  'Nếu thiếu vân hoặc hình, chọn cùng lúc file .gltf với file .bin và ảnh đi kèm.': 'If textures or parts are missing, select the .gltf together with its .bin and image files.',
  'Không mở được file này. Thử xuất lại thành .glb.': 'Could not open this file. Try exporting it again as .glb.',
  'Mô hình nén (Draco / KTX2 / Meshopt) chưa đọc được. Xuất lại .glb không nén.': 'Compressed models (Draco / KTX2 / Meshopt) are not supported yet. Export an uncompressed .glb.',
  'File không có hình 3D nào để hiển thị.': 'The file has no 3D geometry to show.',
  'AR: đặt mô hình lên bàn': 'AR: place the model on a table',
  'Thu nhỏ còn khoảng {size}, đặt lên bàn hoặc sàn qua camera. Chụm 2 ngón để phóng to, thu nhỏ.': 'Scaled to about {size} to place on a table or the floor through the camera. Pinch to resize.',
  'AR: kích thước thật': 'AR: life size',
  'Đặt đúng kích thước theo file ({size}).': 'Place it at the size stored in the file ({size}).',
  'Hướng camera xuống sàn, chạm để đặt mô hình. Đổi được giữa bản thu nhỏ và kích thước thật ({size}).': 'Point the camera at the floor and tap to place the model. Switch between a miniature and life size ({size}).',
  'Đứng cạnh mô hình ở kích thước thật. Bấm cò hoặc chạm màn hình để đi vòng quanh.': 'Stand next to the model at life size. Pull the trigger or tap the screen to walk around it.',
  'Mô hình kích thước thật ({size}) để mở bằng Quick Look trên iPhone, iPad, Mac hoặc gửi qua AirDrop.': 'Life-size model ({size}) to open with Quick Look on iPhone, iPad or Mac, or send by AirDrop.',
  'Mở file 3D khác': 'Open another 3D file',
  '.glb, .gltf, .obj hoặc .stl trên máy. File chỉ đọc trên trình duyệt, không tải lên đâu cả.': '.glb, .gltf, .obj or .stl from your device. Files are read in the browser and never uploaded.',
  'Về ngôi nhà vườn': 'Back to the garden house',
  'Đóng mô hình đang xem.': 'Close the current model.',
  'Mở mô hình 3D của bạn': 'Open your own 3D model',
  '.glb, .gltf, .obj hoặc .stl trên máy, xem 3D rồi xem AR / VR như ngôi nhà. File chỉ đọc trên trình duyệt, không tải lên đâu cả.': '.glb, .gltf, .obj or .stl from your device, viewed in 3D, AR and VR like the house. Files are read in the browser and never uploaded.',
  'Bản thu nhỏ': 'Miniature',
  'Kích thước thật': 'Life size',
  'Hướng camera xuống sàn rồi chạm để đặt mô hình': 'Point the camera at the floor and tap to place the model',
  'Chạm chỗ khác để dời mô hình': 'Tap elsewhere to move the model',
};

const TABLES = { en: EN };

/** Dịch một chuỗi gốc tiếng Việt; {tên} được thay bằng vars[tên]. Chuỗi chưa có bản dịch giữ nguyên. */
export function t(text, vars) {
  const table = TABLES[LANG];
  let result = (table && table[text]) ?? text;
  if (vars) result = result.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
  return result;
}

const TRANSLATED_ATTRIBUTES = ['aria-label', 'title', 'placeholder'];

/** Dịch chữ tĩnh trong index.html: từng nút văn bản và các thuộc tính dành cho trình đọc màn hình. */
export function translateDocument(root = document.body) {
  document.documentElement.lang = LANG;
  if (LANG === 'vi') return;
  document.title = t(document.title);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const raw = node.nodeValue, trimmed = raw.trim();
    if (!trimmed) continue;
    const translated = t(trimmed);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }
  for (const element of root.querySelectorAll(TRANSLATED_ATTRIBUTES.map(name => `[${name}]`).join(','))) {
    for (const name of TRANSLATED_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value) element.setAttribute(name, t(value));
    }
  }
}

/** Dịch dữ liệu dùng chung tại chỗ (các module khác đọc cùng đối tượng). */
function localizeData() {
  if (LANG === 'vi') return;
  for (const room of ROOMS) {
    room.name = t(room.name);
    if (room.shortName) room.shortName = t(room.shortName);
    if (room.description) room.description = t(room.description);
    if (room.dimensionsText) room.dimensionsText = room.dimensionsText.replace(/(\d),(\d)/g, '$1.$2');
  }
  for (const map of [FLOOR_FINISH_NAMES, FURNITURE_TYPE_NAMES, PLAN_FURNITURE_TAGS]) {
    for (const key of Object.keys(map)) map[key] = t(map[key]);
  }
  for (const note of PLAN_TEXT_NOTES) note.text = t(note.text);
  for (const category of LIBRARY_CATEGORIES) category[1] = t(category[1]);
  for (const entry of FURNITURE_LIBRARY) entry.name = t(entry.name);
  for (const shot of TOUR_SHOTS) {
    shot.title = t(shot.title);
    if (shot.subtitle) shot.subtitle = t(shot.subtitle);
  }
}

localizeData();

/** Nút chuyển ngôn ngữ trong thanh tiêu đề: đổi ?lang= và tải lại (giữ #2d / #3d). */
export function initLanguageSwitch() {
  const button = document.getElementById('language-switch');
  if (!button) return;
  const other = LANG === 'en' ? 'vi' : 'en';
  button.textContent = other === 'vi' ? 'Tiếng Việt' : 'English';
  button.lang = other;
  button.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('lang', other);
    location.href = url.toString();
  });
}
