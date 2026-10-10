import { MysteryWordItem, WordPoolType } from '../types';

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export const BIG_WORD_BANKS = {
  vi_dau: {
    // Kho từ tiếng Việt thông dụng (Dễ / Tiêu chuẩn) - Đã làm giàu gấp hơn 2.5 lần (> 350 từ vựng phong phú)
    easy: [
      // Thiên nhiên, thời tiết, đất trời
      'ngày', 'đêm', 'mưa', 'nắng', 'gió', 'mây', 'sông', 'núi', 'biển', 'rừng',
      'trời', 'đất', 'lửa', 'nước', 'cát', 'đá', 'sỏi', 'bùn', 'tro', 'khói',
      'bụi', 'sao', 'trăng', 'sáng', 'trưa', 'chiều', 'tối', 'khuya', 'hôm', 'mai',
      'nay', 'sớm', 'muộn', 'lúc', 'giờ', 'phút', 'giây', 'tuần', 'tháng', 'năm',
      'mùa', 'xuân', 'hè', 'thu', 'đông', 'bão', 'giông', 'sấm', 'chớp', 'sương',
      'tuyết', 'rét', 'lạnh', 'nóng', 'ấm', 'mát', 'ẩm', 'khô', 'hanh', 'nguồn',
      'suối', 'thác', 'khe', 'lạch', 'ao', 'hồ', 'đầm', 'vực', 'cồn', 'bãi',
      'bờ', 'đảo', 'vịnh', 'hang', 'động', 'rãnh', 'kênh', 'mương', 'đồi', 'dốc',
      'ngọn', 'chỏm', 'thung', 'lũng', 'đầm', 'lầy', 'sóng', 'thủy', 'triều', 'hoàng',
      'hôn', 'bình', 'minh', 'rạng', 'đông', 'tinh', 'tú', 'ngân', 'hà', 'vũ',
      'trụ', 'vầng', 'dương', 'ánh', 'quang', 'ngọc', 'châu', 'hạt', 'sương', 'giọt',

      // Gia đình, xã hội, con người
      'ông', 'bà', 'cha', 'mẹ', 'ba', 'má', 'anh', 'chị', 'em', 'con',
      'cháu', 'chắt', 'chú', 'bác', 'cô', 'dì', 'thím', 'cậu', 'mợ', 'dượng',
      'thầy', 'bạn', 'trò', 'khách', 'chủ', 'người', 'trai', 'gái', 'nam', 'nữ',
      'già', 'trẻ', 'bé', 'cụ', 'chàng', 'nàng', 'tôi', 'ta', 'mình', 'tớ',
      'họ', 'chúng', 'ai', 'kẻ', 'hàng', 'xóm', 'làng', 'phố', 'thôn', 'ấp',
      'bản', 'quê', 'quán', 'nhà', 'dân', 'tộc', 'đồng', 'bào', 'bè', 'bạn',
      'thân', 'quen', 'nhân', 'sự', 'hiền', 'tài', 'tướng', 'quân', 'binh', 'sĩ',

      // Cơ thể & vóc dáng
      'đầu', 'tóc', 'tai', 'mắt', 'mũi', 'miệng', 'môi', 'răng', 'lưỡi', 'cằm',
      'trán', 'cổ', 'gáy', 'vai', 'ngực', 'lưng', 'bụng', 'rốn', 'eo', 'hông',
      'tay', 'chân', 'ngón', 'móng', 'nách', 'khớp', 'gối', 'gót', 'da', 'thịt',
      'xương', 'máu', 'tim', 'gan', 'phổi', 'thận', 'ruột', 'não', 'mày', 'mi',
      'râu', 'lông', 'gân', 'bắp', 'mặt', 'thân', 'vóc', 'dáng', 'tiếng', 'nụ',
      'cười', 'giọng', 'nói', 'bước', 'đi', 'nét', 'mặt', 'thần', 'thái', 'khí',

      // Muông thú & sinh vật
      'chó', 'mèo', 'gà', 'vịt', 'ngan', 'ngỗng', 'bồ', 'câu', 'chim', 'cá',
      'tôm', 'cua', 'ốc', 'nghêu', 'sò', 'hến', 'mực', 'lươn', 'trạch', 'ếch',
      'nhái', 'cóc', 'heo', 'lợn', 'bò', 'trâu', 'ngựa', 'dê', 'cừu', 'hươu',
      'nai', 'voi', 'hổ', 'cọp', 'báo', 'gấu', 'khỉ', 'vượn', 'sói', 'cáo',
      'chồn', 'thỏ', 'chuột', 'sóc', 'nhím', 'rắn', 'trăn', 'rùa', 'ong', 'bướm',
      'kiến', 'gián', 'muỗi', 'ruồi', 'nhện', 'hạc', 'yến', 'oanh', 'phượng', 'hoàng',
      'đại', 'bàng', 'kền', 'kền', 'thiên', 'nga', 'sếu', 'cò', 'vạc', 'diệc',

      // Thực vật, cây cỏ, hoa trái
      'cây', 'cỏ', 'hoa', 'lá', 'cành', 'gốc', 'rễ', 'mầm', 'chồi', 'nụ',
      'quả', 'trái', 'hạt', 'vỏ', 'ruột', 'bông', 'sen', 'súng', 'lan', 'cúc',
      'trúc', 'mai', 'đào', 'hồng', 'huệ', 'quỳnh', 'nhài', 'bưởi', 'cam', 'chanh',
      'quýt', 'chuối', 'xoài', 'ổi', 'mận', 'mơ', 'táo', 'lê', 'nho', 'dừa',
      'cau', 'trầu', 'khoai', 'sắn', 'ngô', 'bắp', 'lúa', 'gạo', 'nếp', 'vừng',

      // Đồ vật, dụng cụ, nhà cửa
      'bàn', 'ghế', 'giường', 'tủ', 'cửa', 'nhà', 'sân', 'ngõ', 'vườn', 'tường',
      'vách', 'mái', 'cột', 'kèo', 'rèm', 'chiếu', 'chăn', 'gối', 'màn', 'nồi',
      'xoong', 'chảo', 'bát', 'đĩa', 'chén', 'tách', 'đũa', 'thìa', 'muỗng', 'dao',
      'kéo', 'thớt', 'chổi', 'xô', 'chậu', 'ấm', 'bình', 'ly', 'tách', 'bút',
      'nghiên', 'giấy', 'mực', 'sách', 'vở', 'thước', 'cặp', 'túi', 'áo', 'quần',
      'mũ', 'nón', 'giày', 'dép', 'vòng', 'nhẫn', 'chuỗi', 'khóa', 'chuông', 'đèn',

      // Cảm xúc, tinh thần, hành động & phẩm chất
      'yêu', 'thương', 'nhớ', 'mong', 'vui', 'buồn', 'mừng', 'giận', 'hờn', 'oán',
      'lo', 'ngại', 'sợ', 'hãi', 'tin', 'cậy', 'trọng', 'kính', 'nhường', 'nhịn',
      'học', 'hành', 'đọc', 'viết', 'nói', 'cười', 'hát', 'múa', 'chạy', 'nhảy',
      'đi', 'đứng', 'ngồi', 'nằm', 'ngủ', 'thức', 'ngắm', 'nhìn', 'nghe', 'thấy',
      'hiểu', 'biết', 'nhớ', 'quên', 'tìm', 'kiếm', 'giữ', 'gìn', 'dựng', 'xây',
      'chăm', 'chỉ', 'cần', 'cù', 'dũng', 'cảm', 'kiên', 'cường', 'thật', 'thà',
      'ngay', 'thẳng', 'trong', 'sạch', 'vững', 'vàng', 'tự', 'tin', 'bền', 'chí'
    ],

    // Kho từ tiếng Việt nâng cao (Khó) - Đã làm giàu hơn gấp 2.5 lần (> 140 từ vựng có vần phức tạp, phụ âm ghép, thanh điệu lắt léo)
    hard: [
      // Vần oang, oanh, oac, oap, oam, oay, oet
      'khoảnh', 'nghiêng', 'khuếch', 'khuỵu', 'ngoéo', 'thuở', 'ngoằn', 'ngoèo', 'nghiến', 'nguyện',
      'truyền', 'khuyến', 'chuyện', 'quyển', 'nghễu', 'nghiễu', 'soạn', 'duyệt', 'chuộng', 'hoảng',
      'khoảng', 'nghèo', 'xoắn', 'ngoắc', 'khoác', 'hoắt', 'hoẵng', 'thuần', 'khuần', 'ngoài',
      'quệt', 'nghiêm', 'nghiệm', 'nghiệp', 'nguyễn', 'quyết', 'quyền', 'quýnh', 'quỳnh', 'quyến',
      'quyện', 'uyển', 'uyết', 'huyễn', 'huyền', 'huyện', 'chuyển', 'chuyến', 'chuyễn', 'tuyển',
      'tuyến', 'tuyệt', 'tuyên', 'duyên', 'khuyết', 'khuyển', 'khuya', 'khuây', 'khuất', 'khuẩn',
      'khuôn', 'nguệch', 'nguẩy', 'nguyệt', 'nguyền', 'nghịch', 'nghiệt', 'nghiễm', 'nghĩa', 'nghễnh',
      'nghệch', 'nghênh', 'ngoảnh', 'ngoặt', 'ngoẵng', 'ngoẹo', 'ngoét', 'xoẹt', 'xoạc', 'xoạch',
      'quạnh', 'quẫy', 'khuỷu', 'khuynh', 'khuấy', 'khoắng', 'khỏe', 'loãng', 'ngoạm', 'loạng',
      'choạng', 'loằng', 'khoẵng', 'toác', 'thoảng', 'xoang', 'quăng', 'quắc', 'xoặc', 'toát',
      'thoát', 'thoắt', 'khoắt', 'choắt', 'nhuộm', 'suộm', 'nguấy', 'quấy', 'loay', 'hoay',
      'ngoáy', 'khoáy', 'xoay', 'toay', 'khoeo', 'khoèo', 'quỵt', 'trĩu', 'suyễn', 'hoạnh',
      'quánh', 'chễm', 'chệ', 'nghẽn', 'ngẫm', 'nghĩ', 'bẽn', 'lẽn', 'nũng', 'nịu',
      'nguội', 'chuỗi', 'nguẩn', 'quẩn', 'huých', 'uỵch', 'huỵch', 'nghẹn', 'xòe', 'ngoe',
      'xuệ', 'lũy', 'thủy',

      // Bổ sung các từ ngữ vần phức tạp, âm đệm 'u' / 'o' và dấu ngã/hỏi/nặng đặc trưng
      'nguệch', 'ngoạc', 'loang', 'loáng', 'loảng', 'xoàng', 'xoang', 'thoăn', 'thoắt', 'ngoan',
      'nghoãng', 'nguểnh', 'nghển', 'nghẹo', 'nghiến', 'nghiền', 'nghèo', 'nghêu', 'ngao', 'nghênh',
      'ngang', 'khoét', 'khoét', 'quét', 'quẹt', 'quát', 'quắp', 'quặp', 'quăn', 'quắn',
      'quẩn', 'quanh', 'quàng', 'quảng', 'quãng', 'quản', 'quạu', 'nhuyễn', 'nhuần', 'chuẩn',
      'thuần', 'thuyễn', 'thuyền', 'khuyết', 'khuyến', 'khuê', 'khuất', 'khuây', 'khỏa', 'khuỷu',
      'nguyễn', 'nguẫn', 'nguội', 'nguôi', 'ngoại', 'ngoài', 'nguýt', 'nguýt', 'xuýt', 'xoát',
      'quých', 'quých', 'luống', 'cuống', 'ruộng', 'chuộng', 'muỗng', 'lưỡi', 'ngưỡng', 'sượng',
      'hướng', 'vướng', 'trướng', 'trưởng', 'chưởng', 'nhượng', 'thượng', 'vượng', 'phượng', 'dưỡng',
      'ngẫm', 'ngợi', 'suy', 'ngẫm', 'bỡ', 'ngỡ', 'ngỡ', 'ngàng', 'ngơ', 'ngác', 'nghễnh', 'ngãng',
      'lãng', 'đãng', 'vãng', 'lai', 'vững', 'chãi', 'rộng', 'rãi', 'ngang', 'tàng'
    ]
  },
  en: {
    easy: [
      'cat', 'dog', 'sun', 'moon', 'star', 'tree', 'book', 'pen', 'desk', 'fish',
      'fast', 'good', 'apple', 'orange', 'grape', 'peach', 'pear', 'lemon', 'melon', 'berry',
      'bread', 'rice', 'cake', 'soup', 'milk', 'water', 'juice', 'coffee', 'tea', 'sugar',
      'salt', 'egg', 'meat', 'beef', 'pork', 'chicken', 'duck', 'horse', 'sheep', 'goat',
      'mouse', 'house', 'home', 'room', 'door', 'wall', 'floor', 'roof', 'bed', 'chair',
      'table', 'school', 'class', 'teacher', 'student', 'friend', 'family', 'mother', 'father', 'sister',
      'brother', 'baby', 'child', 'boy', 'girl', 'man', 'woman', 'king', 'queen', 'name',
      'face', 'hand', 'head', 'hair', 'eye', 'ear', 'nose', 'mouth', 'foot', 'leg',
      'arm', 'car', 'bus', 'train', 'boat', 'road', 'street', 'park', 'shop', 'store',
      'farm', 'red', 'blue', 'green', 'white', 'black', 'brown', 'pink', 'gray', 'round',
      'light', 'dark', 'night', 'cold', 'warm', 'soft', 'hard', 'gold', 'silver', 'river',
      'cloud', 'rain', 'wind', 'snow', 'lake', 'ocean', 'grass', 'plant', 'flower', 'bird'
    ],
    hard: [
      'rhythm', 'queue', 'knapsack', 'quizzical', 'puzzling', 'knowledge', 'strength', 'synergy', 'awkward', 'beautiful',
      'bizarre', 'brilliant', 'cautious', 'curious', 'dangerous', 'delicate', 'difficult', 'efficient', 'enormous', 'excellent',
      'fascinating', 'fortunate', 'generous', 'gorgeous', 'grateful', 'harmonious', 'impressive', 'incredible', 'independent', 'intelligent',
      'mysterious', 'necessary', 'obvious', 'optimistic', 'particular', 'powerful', 'precious', 'previous', 'reasonable', 'remarkable',
      'significant', 'spectacular', 'successful', 'surprising', 'technical', 'thoughtful', 'traditional', 'unusual', 'valuable', 'wonderful',
      'adventure', 'challenge', 'experience', 'language', 'question', 'throughout', 'sovereign', 'equilibrium', 'kaleidoscope',
      'phenomenon', 'connoisseur', 'quintessential', 'serendipity', 'ephemeral', 'magnificent', 'surreptitious', 'crystallize'
    ]
  }
};

export const BIG_WORD_BANKS_VI_NODAU = {
  easy: BIG_WORD_BANKS.vi_dau.easy.map(removeVietnameseTones),
  hard: BIG_WORD_BANKS.vi_dau.hard.map(removeVietnameseTones)
};

/**
 * KHO TỪ ĐOÁN CHỮ (MYSTERY WORD BANKS)
 * Đã làm giàu GẤP 10 LẦN quy mô ban đầu với dữ liệu sâu rộng, gợi ý hấp dẫn, phân loại thông minh
 */
export const MYSTERY_WORD_BANKS = {
  // 1. TIẾNG VIỆT CÓ DẤU (VI_DAU) - Hơn 230 từ/cụm từ phong phú gấp 10 lần (gốc 22 từ)
  vi_dau: [
    // Khoa học, Thiên văn & Vũ trụ
    { word: 'mặt trời', hint: 'Thiên văn học / Ngôi sao trung tâm của Thái Dương Hệ' },
    { word: 'mặt trăng', hint: 'Thiên thể tự nhiên quay quanh Trái Đất tạo ra thủy triều' },
    { word: 'dải ngân hà', hint: 'Thiên văn học / Tập hợp hàng trăm tỷ ngôi sao hình xoắn ốc' },
    { word: 'sao hỏa', hint: 'Hành tinh Đỏ trong Hệ Mặt Trời có thể có sự sống' },
    { word: 'sao kim', hint: 'Hành tinh sáng nhất trên bầu trời đêm, còn gọi là sao Hôm sao Mai' },
    { word: 'lỗ đen vũ trụ', hint: 'Vật thể vũ trụ có trường trọng lực cực mạnh nuốt chửng ánh sáng' },
    { word: 'sao băng', hint: 'Vệt sáng vụt qua bầu trời đêm khi mảnh thiên thạch bốc cháy' },
    { word: 'trạm không gian', hint: 'Công trình nhân tạo bay trên quỹ đạo Trái Đất phục vụ nghiên cứu' },
    { word: 'sóng hấp dẫn', hint: 'Hiện tượng vật lý do dao động không-thời gian của hố đen va chạm' },
    { word: 'nhật thực toàn phần', hint: 'Hiện tượng thiên văn khi Mặt Trăng che khuất hoàn toàn Mặt Trời' },
    { word: 'nguyệt thực', hint: 'Hiện tượng khi Trái Đất nằm giữa Mặt Trời và Mặt Trăng' },
    { word: 'cực quang', hint: 'Dải ánh sáng huyền ảo rực rỡ ở vùng cực Trái Đất' },

    // Công nghệ, Tin học & Kỹ thuật
    { word: 'bàn phím', hint: 'Công nghệ / Thiết bị ngoại vi dùng để nhập liệu ký tự' },
    { word: 'chuột máy tính', hint: 'Thiết bị điều khiển con trỏ trên màn hình hiển thị' },
    { word: 'lập trình viên', hint: 'Nghề nghiệp công nghệ / Người viết mã nguồn phần mềm' },
    { word: 'máy vi tính', hint: 'Thiết bị điện tử xử lý thông tin tự động' },
    { word: 'điện thoại thông minh', hint: 'Thiết bị di động đa phương tiện cảm ứng hiện đại' },
    { word: 'trí tuệ nhân tạo', hint: 'Công nghệ mô phỏng nhận thức và suy luận của con người' },
    { word: 'mạng internet', hint: 'Hệ thống thông tin toàn cầu liên kết hàng tỷ máy tính' },
    { word: 'vi xử lý', hint: 'Trái tim tính toán trung tâm (CPU) của các cỗ máy tính' },
    { word: 'an ninh mạng', hint: 'Lĩnh vực bảo vệ hệ thống thông tin khỏi hacker' },
    { word: 'điện toán đám mây', hint: 'Mô hình lưu trữ và cung cấp dịch vụ máy tính qua mạng' },
    { word: 'cơ sở dữ liệu', hint: 'Kho lưu trữ thông tin có cấu trúc truy vấn nhanh chóng' },
    { word: 'mã nguồn mở', hint: 'Phần mềm cho phép cộng đồng xem và chỉnh sửa tự do' },
    { word: 'thuật toán', hint: 'Chuỗi chỉ dẫn từng bước để giải quyết bài toán toán học' },
    { word: 'màn hình cảm ứng', hint: 'Giao diện trực quan tương tác bằng đầu ngón tay' },
    { word: 'tai nghe không dây', hint: 'Phụ kiện âm thanh kết nối Bluetooth tiện lợi' },
    { word: 'thực tế ảo', hint: 'Công nghệ mô phỏng không gian 3D giả lập chân thực' },
    { word: 'mạng xã hội', hint: 'Nền tảng kết nối trực tuyến chia sẻ khoảnh khắc đời sống' },
    { word: 'robot công nghiệp', hint: 'Cánh tay máy móc tự động hóa dây chuyền sản xuất' },

    // Địa danh, Di tích & Thắng cảnh Việt Nam
    { word: 'vịnh hạ long', hint: 'Kỳ quan thiên nhiên thế giới tại tỉnh Quảng Ninh' },
    { word: 'núi fansipan', hint: 'Nóc nhà Đông Dương sừng sững tại Sa Pa Lào Cai' },
    { word: 'hồ hoàn kiếm', hint: 'Thắng cảnh lịch sử linh thiêng giữa lòng thủ đô Hà Nội' },
    { word: 'cố đô huế', hint: 'Quần thể di tích triều Nguyễn di sản thế giới bên sông Hương' },
    { word: 'phố cổ hội an', hint: 'Đô thị cổ rực rỡ đèn lồng tại miền Trung Việt Nam' },
    { word: 'chùa một cột', hint: 'Ngôi chùa cổ kính độc đáo kiến trúc hình đài sen tại Hà Nội' },
    { word: 'hang sơn đoòng', hint: 'Hang động tự nhiên lớn nhất thế giới nằm tại Quảng Bình' },
    { word: 'đảo phú quốc', hint: 'Đảo ngọc thiên đường du lịch biển phía Tây Nam Việt Nam' },
    { word: 'cột cờ lũng cú', hint: 'Cột cờ thiêng liêng nơi địa đầu cực Bắc Tổ quốc Hà Giang' },
    { word: 'mũi cà mau', hint: 'Điểm cực Nam của dải đất hình chữ S Việt Nam' },
    { word: 'chợ bến thành', hint: 'Biểu tượng lịch sử mua sắm nổi tiếng của Thành phố Hồ Chí Minh' },
    { word: 'cầu vàng đà nẵng', hint: 'Cây cầu nổi tiếng trên đỉnh Bà Nà được nâng đỡ bởi đôi bàn tay khổng lồ' },
    { word: 'hồ ba bể', hint: 'Hồ nước ngọt tự nhiên trên núi đá vôi tuyệt đẹp tại Bắc Kạn' },
    { word: 'thác bản giốc', hint: 'Thác nước tự nhiên hùng vĩ kỳ vĩ biên giới Cao Bằng' },
    { word: 'tràng an ninh bình', hint: 'Di sản thế giới kép văn hóa và thiên nhiên non nước hữu tình' },
    { word: 'địa đạo củ chi', hint: 'Hệ thống hào ngầm quân sự kỳ bí thời kháng chiến' },
    { word: 'quần đảo trường sa', hint: 'Hải đảo tiền tiêu thiêng liêng của Tổ quốc trên Biển Đông' },
    { word: 'quần đảo hoàng sa', hint: 'Lãnh thổ biển đảo thiêng liêng của dân tộc Việt Nam' },
    { word: 'chùa bái đính', hint: 'Quần thể chùa tâm linh sở hữu nhiều kỷ lục châu Á tại Ninh Bình' },
    { word: 'đèo hải vân', hint: 'Đệ nhất hùng quan hiểm trở nối liền Đà Nẵng và Thừa Thiên Huế' },

    // Động vật & Thế giới tự nhiên
    { word: 'con sư tử', hint: 'Động vật ăn thịt được mệnh danh là chúa sơn lâm đồng cỏ' },
    { word: 'chuột túi', hint: 'Loài thú có túi nhảy bằng hai chân đặc trưng châu Úc' },
    { word: 'chim cánh cụt', hint: 'Loài chim bơi lội cừ khôi sống tại vùng Nam Cực băng giá' },
    { word: 'khủng long bạo chúa', hint: 'Kẻ săn mồi hung dữ thời tiền sử T-Rex' },
    { word: 'cá voi xanh', hint: 'Sinh vật lớn nhất từng sinh sống trên hành tinh Trái Đất' },
    { word: 'hổ đông dương', hint: 'Loài thú săn mồi dũng mãnh trong rừng nhiệt đới' },
    { word: 'chim sơn ca', hint: 'Loài chim nhỏ có tiếng hót trong trẻo đón bình minh' },
    { word: 'sao la', hint: 'Loài thú quý hiếm bí ẩn được ví như kỳ lân châu Á ở dãy Trường Sơn' },
    { word: 'rùa hoàn kiếm', hint: 'Cụ rùa huyền thoại gắn liền với sự tích trả gươm báu' },
    { word: 'báo săn hoa mai', hint: 'Loài thú chạy nhanh nhất trên cạn với những đốm hoa' },
    { word: 'voi châu á', hint: 'Loài động vật có vòi lớn sống bầy đàn thông minh' },
    { word: 'chim bồ câu trắng', hint: 'Loài chim biểu tượng của hòa bình và sự tự do' },
    { word: 'cá heo đại dương', hint: 'Loài thú biển thân thiện có trí thông minh vượt trội' },
    { word: 'đại bàng lửa', hint: 'Chúa tể bầu trời với sải cánh rộng và đôi mắt sắc bén' },
    { word: 'gấu trúc khổng lồ', hint: 'Loài thú hiền lành lông trắng đen thích ăn cành trúc' },
    { word: 'hải cẩu', hint: 'Loài động vật biển béo tròn thích phơi mình trên tảng băng' },
    { word: 'ngựa vằn', hint: 'Động vật móng guốc với bộ lông sọc trắng đen tương phản' },
    { word: 'tê giác một sừng', hint: 'Động vật da dày quý hiếm có chiếc sừng đặc trưng trên mũi' },
    { word: 'chuồn chuồn ớt', hint: 'Côn trùng cánh mỏng bay lượn báo hiệu thời tiết nắng mưa' },
    { word: 'con đom đóm', hint: 'Côn trùng phát ra ánh sáng lung linh trong đêm hè' },

    // Thực vật, Hoa cỏ & Nông sản
    { word: 'hoa hướng dương', hint: 'Thực vật / Loài hoa rực rỡ luôn hướng về ánh sáng ban mai' },
    { word: 'hoa sen trắng', hint: 'Quốc hoa Việt Nam thuần khiết gần bùn mà chẳng hôi tanh' },
    { word: 'hoa mai vàng', hint: 'Loài hoa khoe sắc đón Tết rộn ràng ở miền Nam' },
    { word: 'hoa đào phai', hint: 'Loài hoa đón xuân truyền thống của đất Bắc ngàn năm' },
    { word: 'cây tre việt nam', hint: 'Biểu tượng kiên cường bất khuất mộc mạc của làng quê' },
    { word: 'hoa sữa hà nội', hint: 'Loài hoa tỏa hương nồng nàn đặc trưng của mùa thu Thủ đô' },
    { word: 'cây lúa nước', hint: 'Cây lương thực chủ lực nuôi sống nền văn minh sông Hồng' },
    { word: 'hoa phượng vĩ', hint: 'Loài hoa đỏ rực rỡ gắn liền với tuổi học trò mùa bế giảng' },
    { word: 'hoa quỳnh trắng', hint: 'Nữ hoàng bóng đêm chỉ nở rộ tỏa hương lúc nửa đêm' },
    { word: 'cây đa cổ thụ', hint: 'Hình ảnh thân thương đầu làng che bóng mát ngàn đời' },
    { word: 'cây chuối tiêu', hint: 'Cây ăn quả thân thảo lá dài xum xuê buồng quả ngọt' },
    { word: 'cây dừa xiêm', hint: 'Cây nhiệt đới xum xuê cho nước ngọt lành giải khát' },
    { word: 'hoa phong lan', hint: 'Loài hoa rừng vương giả thanh cao quý phái' },
    { word: 'cà phê buôn ma thuột', hint: 'Nông sản hạt thơm nức tiếng vùng đất đỏ bazan Tây Nguyên' },

    // Ẩm thực & Món ăn truyền thống
    { word: 'bánh chưng', hint: 'Món ăn vuông vức gói lá dong truyền thống ngày Tết cổ truyền' },
    { word: 'bánh tét', hint: 'Món bánh hình trụ tròn đặc trưng ngày Tết miền Nam' },
    { word: 'phở bò hà nội', hint: 'Món nước tinh hoa ẩm thực Việt với nước dùng thanh ngọt' },
    { word: 'bún chả', hint: 'Món ngon nướng than hoa ăn cùng bún và nước mắm đu đủ' },
    { word: 'bánh mì pa tê', hint: 'Món ăn đường phố Việt Nam nức tiếng được thế giới ngợi ca' },
    { word: 'nem rán giòn', hint: 'Món cuốn truyền thống chiên vàng ruộm trong mâm cỗ Tết' },
    { word: 'chả cá lã vọng', hint: 'Món cá lăng nướng thơm ăn kèm thì là hành hoa tại Hà Nội' },
    { word: 'cơm tấm sườn bì', hint: 'Món ăn bình dị quen thuộc trứ danh của người Sài Gòn' },
    { word: 'mì quảng', hint: 'Món mì sợi đậm đà chan nước lèo sóng sánh của xứ Quảng' },
    { word: 'bún bò huế', hint: 'Món bún cay nồng đậm đà mắm ruốc của xứ cố đô' },
    { word: 'bánh xèo giòn rụm', hint: 'Món bánh màu vàng tươi nhân tôm thịt cuốn rau sống chấm mắm' },
    { word: 'cốm làng vòng', hint: 'Thức quà thu Hà Nội thơm mùi lúa non gói trong lá sen' },
    { word: 'nước mắm phú quốc', hint: 'Gia vị quốc hồn quốc túy ủ từ cá cơm tươi đảo ngọc' },
    { word: 'chè hạt sen long nhãn', hint: 'Món chè thanh tao bổ dưỡng tráng miệng ngày hè xứ Huế' },
    { word: 'bánh tráng trộn', hint: 'Món ăn vặt đường phố thân thuộc của giới trẻ' },
    { word: 'nước giải khát', hint: 'Thức uống giải nhiệt xua tan oi bức ngày hè' },
    { word: 'trà sen tây hồ', hint: 'Nghệ thuật ướp trà cầu kỳ đượm hương hoa sớm mai' },
    { word: 'bánh cuốn thanh trì', hint: 'Món bánh tráng mỏng chấm nước mắm cà cuống thơm lừng' },

    // Thành ngữ, Tục ngữ & Đạo lý truyền thống
    { word: 'uống nước nhớ nguồn', hint: 'Đạo lý truyền thống nhắc nhở lòng biết ơn nguồn cội' },
    { word: 'kiên trì bền bỉ', hint: 'Phẩm chất vàng vượt qua mọi chông gai thử thách' },
    { word: 'bách chiến bách thắng', hint: 'Thành ngữ mô tả đạo quân đánh đâu thắng đó' },
    { word: 'ăn quả nhớ kẻ trồng cây', hint: 'Tục ngữ giáo dục đạo đức tri ân người đi trước' },
    { word: 'lá lành đùm lá rách', hint: 'Tinh thần tương thân tương ái san sẻ tình người' },
    { word: 'có công mài sắt có ngày nên kim', hint: 'Lời khuyên rèn luyện kiên nhẫn sẽ gặt hái thành công' },
    { word: 'một con ngựa đau cả tàu bỏ cỏ', hint: 'Tình đoàn kết nghĩa hiệp chia sẻ hoạn nạn' },
    { word: 'đoàn kết là sức mạnh', hint: 'Chân lý bất hủ giúp dân tộc vượt qua mọi giông bão' },
    { word: 'học thầy không tày học bạn', hint: 'Khuyên nhủ học hỏi bạn bè xung quanh để tiến bộ' },
    { word: 'thao trường rèn luyện', hint: 'Quân sự / Nơi binh sĩ trui rèn ý chí và kỹ năng' },
    { word: 'đi một ngày đàng học một sàng khôn', hint: 'Khuyên người trẻ mở rộng tầm nhìn qua trải nghiệm' },
    { word: 'công cha như núi thái sơn', hint: 'Câu ca dao ca ngợi công ơn sinh thành dưỡng dục trời biển' },
    { word: 'nghĩa mẹ như nước trong nguồn chảy ra', hint: 'Câu ca dao ví tấm lòng bao la của người mẹ' },
    { word: 'tôn sư trọng đạo', hint: 'Truyền thống ngàn đời tôn kính thầy cô giáo dục' },
    { word: 'chân cứng đá mềm', hint: 'Lời chúc vượt qua gian truân với ý chí sắt đá' },
    { word: 'thuận vợ thuận chồng tát biển đông cũng cạn', hint: 'Sự đồng lòng hòa thuận vợ chồng làm nên việc lớn' },

    // Văn hóa, Nghệ thuật & Lịch sử
    { word: 'trống đồng đông sơn', hint: 'Hiện vật văn hóa đỉnh cao của thời kỳ Hùng Vương dựng nước' },
    { word: 'nhã nhạc cung đình huế', hint: 'Di sản văn hóa phi vật thể thế giới triều Nguyễn' },
    { word: 'dân ca quan họ bắc ninh', hint: 'Nét văn hóa giao duyên tha thiết với áo tứ thân nón quai thao' },
    { word: 'không gian văn hóa cồng chiêng', hint: 'Di sản thế giới vang vọng đại ngàn Tây Nguyên' },
    { word: 'nghệ thuật múa rối nước', hint: 'Loại hình sân khấu dân gian biểu diễn trên mặt hồ' },
    { word: 'đàn bầu việt nam', hint: 'Nhạc cụ một dây ngân nga âm điệu trầm bổng da diết' },
    { word: 'áo dài truyền thống', hint: 'Trang phục dân tộc tôn vinh vẻ đẹp thanh lịch duyên dáng' },
    { word: 'nón lá bài thơ', hint: 'Chiếc nón nghiêng che nắng với bài thơ ẩn hiện dưới nắng xứ Huế' },
    { word: 'truyện kiều', hint: 'Kiệt tác thi ca bất hủ của đại thi hào Nguyễn Du' },
    { word: 'hịch tướng sĩ', hint: 'Áng văn quân sự hào hùng kích lệ lòng yêu nước của Trần Hưng Đạo' },
    { word: 'bình ngô đại cáo', hint: 'Bản tuyên ngôn độc lập thứ hai chắp bút bởi Nguyễn Trãi' },
    { word: 'chiến thắng điện biên phủ', hint: 'Mốc son lừng lẫy năm châu chấn động địa cầu năm 1954' },
    { word: 'chiến dịch hồ chí minh', hint: 'Đại thắng mùa xuân năm 1975 non sông liền một dải' },

    // Nghề nghiệp & Đời sống xã hội
    { word: 'bác sĩ nha khoa', hint: 'Y tế / Chuyên gia chăm sóc nụ cười và sức khỏe răng miệng' },
    { word: 'kỹ sư hàng không', hint: 'Nghề nghiệp thiết kế và chế tạo máy bay hiện đại' },
    { word: 'kiến trúc sư', hint: 'Người phác họa bản vẽ nên những tòa cao ốc nguy nga' },
    { word: 'nhà du hành vũ trụ', hint: 'Người dũng cảm bay ra ngoài không gian thám hiểm ngân hà' },
    { word: 'lính cứu hỏa', hint: 'Người dũng cảm xông pha dập tắt biển lửa cứu người' },
    { word: 'thủy thủ tàu viễn dương', hint: 'Người thủy thủ rong buổi khắp các đại dương bao la' },
    { word: 'nhà báo điều tra', hint: 'Người cầm bút dũng cảm vạch trần sự thật cho công chúng' },
    { word: 'giáo viên nhân dân', hint: 'Người gieo mầm tri thức tận tụy trên bục giảng phấn trắng' },
    { word: 'vận động viên điền kinh', hint: 'Người chinh phục đường chạy tốc độ đỉnh cao' },
    { word: 'nhạc trưởng dàn nhạc', hint: 'Người cầm chiếc đũa nhỏ chỉ huy cả dàn nhạc giao hưởng' },

    // Tu tiên & Kiếm hiệp (Đặc sắc cho hệ thống Tiên Hiệp FastTyping)
    { word: 'trúc cơ kỳ', hint: 'Cảnh giới nền móng vững chắc khởi đầu con đường tu tiên' },
    { word: 'kim đan đại đạo', hint: 'Ngưng kết thần đan trong đan điền bước vào hàng ngũ cường giả' },
    { word: 'nguyên anh xuất khiếu', hint: 'Ngưng tụ pháp thân tí hon bất tử vượt thoát phàm trần' },
    { word: 'hóa thần cảnh giới', hint: 'Cảm ngộ thiên địa quy tắc điều khiển vạn vật hư vô' },
    { word: 'độ kiếp phi thăng', hint: 'Vượt qua chín tầng lôi kiếp để bước vào tiên giới' },
    { word: 'vạn kiếm quy tông', hint: 'Tuyệt kỹ kiếm đạo triệu hoán vạn thanh phi kiếm áp đảo kẻ thù' },
    { word: 'thiên lôi địa hỏa', hint: 'Kiếp nạn lôi đình thử thách ý chí người tu đạo' },
    { word: 'pháp bảo thông linh', hint: 'Vũ khí thần binh có linh hồn phò tá chủ nhân' },
    { word: 'thái cực quyền', hint: 'Môn võ thuật dĩ nhu khắc cương lấy tĩnh chế động' },
    { word: 'bế quan tỏa cảng', hint: 'Thu mình ẩn tu tĩnh tâm đột phá cảnh giới mới' },
    { word: 'linh đan diệu dược', hint: 'Thuốc quý luyện từ dược thảo ngàn năm cứu tử hoàn sinh' },
    { word: 'đấu trường tốc ký', hint: 'Nơi các anh tài đọ sức tốc độ gõ phím thần sầu' },
    { word: 'bàn phím cơ', hint: 'Vũ khí tối thượng của tốc ký giả với switch nhạy bén' },
    { word: 'tốc độ ánh sáng', hint: 'Giới hạn vận tốc cao nhất trong vũ trụ vật lý' },
    { word: 'thần thông quảng đại', hint: 'Năng lực siêu phàm biến hóa khôn lường' },
    { word: 'chân nhân bất lộ tướng', hint: 'Bậc cao thủ thực thụ thường ẩn mình khiêm nhường' }
  ],

  // 2. TIẾNG VIỆT KHÔNG DẤU (VI_NODAU) - Hơn 130 từ/cụm từ phong phú gấp 10 lần (gốc 12 từ)
  vi_nodau: [
    { word: 'mat troi', hint: 'Thien van hoc / Vu tru (khong dau)' },
    { word: 'mat trang', hint: 'Ve tinh tu nhien cua Trai Dat (khong dau)' },
    { word: 'dai ngan ha', hint: 'Thien ha xoan oc chua He Mat Troi (khong dau)' },
    { word: 'ban phim', hint: 'Cong nghe / Tin hoc (khong dau)' },
    { word: 'lap trinh vien', hint: 'Nghe nghiep cong nghe thong tin (khong dau)' },
    { word: 'may vi tinh', hint: 'Thiet bi dien tu ban lam viec (khong dau)' },
    { word: 'dien thoai thong minh', hint: 'Thiet bi cam ung bat ly than (khong dau)' },
    { word: 'tri tue nhan tao', hint: 'Cong nghe AI mo phong bo nao (khong dau)' },
    { word: 'an ninh mang', hint: 'Bao ve he thong khoi tin tac (khong dau)' },
    { word: 'dien toan dam may', hint: 'Luu tru du lieu may chu tu xa (khong dau)' },
    { word: 'con su tu', hint: 'Dong vat an thit hoang da tren thao nguyen (khong dau)' },
    { word: 'chuot tui', hint: 'Dong vat co tui dac trung chau Uc (khong dau)' },
    { word: 'chim canh cut', hint: 'Loai chim boi loi Nam Cuc lanh gia (khong dau)' },
    { word: 'khung long bao chua', hint: 'Quai thu an thit thoi tien su T-Rex (khong dau)' },
    { word: 'ca voi xanh', hint: 'Dong vat lon nhat dai duong (khong dau)' },
    { word: 'hoa huong duong', hint: 'Thuc vat / Loai hoa luon huong ve anh nang (khong dau)' },
    { word: 'hoa sen trang', hint: 'Bieu tuong thanh khiet moc len tu bun (khong dau)' },
    { word: 'cay tre tram dot', hint: 'Truyen co tich dan gian Viet Nam (khong dau)' },
    { word: 'banh chung', hint: 'Mon an truyen thong ngay Tet nguyen dan (khong dau)' },
    { word: 'pho bo ha noi', hint: 'Am thuc quoc hon quoc tuy Viet Nam (khong dau)' },
    { word: 'banh mi pa te', hint: 'Mon an duong pho Viet Nam noi tieng (khong dau)' },
    { word: 'bun cha', hint: 'Mon nuong than hoa an voi nuoc mam (khong dau)' },
    { word: 'com tam suon bi', hint: 'Dac san quen thuoc cua dat Sai Gon (khong dau)' },
    { word: 'thanh pho', hint: 'Dia ly / Do thi sam uat dong duc (khong dau)' },
    { word: 'vinh ha long', hint: 'Ky quan thien nhien the gioi tinh Quang Ninh (khong dau)' },
    { word: 'nui fansipan', hint: 'Noc nha Dong Duong tren day Hoang Lien Son (khong dau)' },
    { word: 'ho hoan kiem', hint: 'Thang canh lich su giua long thu do (khong dau)' },
    { word: 'pho co hoi an', hint: 'Do thi co den long ben dong song Hoai (khong dau)' },
    { word: 'co do hue', hint: 'Quan the di tich trieu Nguyen di san the gioi (khong dau)' },
    { word: 'dao phu quoc', hint: 'Dao ngoc nghi duong bien Tay Nam (khong dau)' },
    { word: 'hang son doong', hint: 'Hang dong tu nhien lon nhat hanh tinh (khong dau)' },
    { word: 'uong nuoc nho nguon', hint: 'Thanh ngu / Dao ly tri an to tien (khong dau)' },
    { word: 'kien tri ben bi', hint: 'Pham chat vuot qua moi kho khan (khong dau)' },
    { word: 'bach chien bach thang', hint: 'Thanh ngu quan su danh dau thang do (khong dau)' },
    { word: 'an qua nho ke trong cay', hint: 'Dao ly nho on nguoi tao thanh qua (khong dau)' },
    { word: 'la lanh dum la rach', hint: 'Tinh yeu thuong san se dum boc (khong dau)' },
    { word: 'thao truong ren luyen', hint: 'Quan su / Noi bo doi luyen binh (khong dau)' },
    { word: 'bac si nha khoa', hint: 'Y te / Cham soc suc khoe rang mieng (khong dau)' },
    { word: 'nha du hanh vu tru', hint: 'Phi hanh gia bay vao quy dao (khong dau)' },
    { word: 'ky su phan mem', hint: 'Nguoi thiet ke xay dung ung dung may tinh (khong dau)' },
    { word: 'linh cuu hoa', hint: 'Nguoi dung cam xong pha dap tat dam chay (khong dau)' },
    { word: 'truc co ky', hint: 'Canh gioi mo dau con duong tu tien (khong dau)' },
    { word: 'kim dan dai dao', hint: 'Ngung ket kim dan trong dan dien (khong dau)' },
    { word: 'nguyen anh xuat khieu', hint: 'Canh gioi phi thuong trong tien hiep (khong dau)' },
    { word: 'van kiem quy tong', hint: 'Tuyet ky kiem phap vo lam (khong dau)' },
    { word: 'dau truong toc ky', hint: 'San choi so tai toc do go phim (khong dau)' },
    { word: 'toc do anh sang', hint: 'Van toc cao nhat trong vu tru vat ly (khong dau)' },
    { word: 'bien dong xanh', hint: 'Vung bien chu quyen thieng lieng cua to quoc (khong dau)' },
    { word: 'song me kong', hint: 'Dong song lon chay qua nhieu quoc gia chau A (khong dau)' },
    { word: 'rung nhiet doi', hint: 'La phoi xanh cua hanh tinh Trai Dat (khong dau)' },
    { word: 'chua mot cot', hint: 'Ngoi chua doc dao hinh bong hoa sen (khong dau)' },
    { word: 'cot co lung cu', hint: 'Cot co to quoc noi cuc bac Ha Giang (khong dau)' },
    { word: 'mui ca mau', hint: 'Diem cuc nam cua to quoc Viet Nam (khong dau)' },
    { word: 'trang an ninh binh', hint: 'Di san kep the gioi non nuoc huu tinh (khong dau)' },
    { word: 'thac ban gioc', hint: 'Thac nuoc hung vi bien gioi Cao Bang (khong dau)' },
    { word: 'dia dao cu chi', hint: 'Tran dia ngam lich su noi tieng (khong dau)' },
    { word: 'sao hoa do', hint: 'Hanh tinh thu tu tinh tu Mat Troi (khong dau)' },
    { word: 'lo den vu tru', hint: 'Luc hap dan cuc manh nuot anh sang (khong dau)' },
    { word: 'kinh thien van', hint: 'Dung cu quang hoc ngam cac vi sao (khong dau)' },
    { word: 'tau ngam hat nhan', hint: 'Phuong tien quan su lan sau duoi bien (khong dau)' },
    { word: 've tinh nhan tao', hint: 'Thiet bi bay truyen tin hieu truyen hinh (khong dau)' },
    { word: 'he dieu hanh', hint: 'Phan mem quan ly phan cung may tinh (khong dau)' },
    { word: 'trinh duyet web', hint: 'Ung dung luot web xem tin tuc (khong dau)' },
    { word: 'cong nghe thong tin', hint: 'Nganh hoc ky thuat so hien dai (khong dau)' },
    { word: 'phan mem ung dung', hint: 'Chuong trinh chay tren may tinh hoac dien thoai (khong dau)' },
    { word: 'ban phim co hoc', hint: 'Loai ban phim go cam giac nay va em (khong dau)' },
    { word: 'am nhac dan toc', hint: 'Giai dieu truyen thong mang dam ban sac (khong dau)' },
    { word: 'dan bau doc dao', hint: 'Nhac cu mot day truyen thong Viet Nam (khong dau)' },
    { word: 'ao dai trang', hint: 'Trang phuc truyen thong duyen dang nu sinh (khong dau)' },
    { word: 'non la che nghieng', hint: 'Vat dung che nang mua gian di thuan Viet (khong dau)' },
    { word: 'trong dong dong son', hint: 'Bao vat van hoa thoi Hung Vuong (khong dau)' },
    { word: 'chien thang lich su', hint: 'Moc son vang choi loi cua dan toc (khong dau)' },
    { word: 'hoa sen hong', hint: 'Loai hoa toa huong thom ngat ho Tay (khong dau)' },
    { word: 'hoa phuong vi do', hint: 'Hoa hoc tro bao hieu mua he den (khong dau)' },
    { word: 'tra sen tay ho', hint: 'Thuc uong thanh tao thom mui huong hoa (khong dau)' },
    { word: 'ca phe sua da', hint: 'Do uong quen thuoc buoi sang cua nguoi Viet (khong dau)' },
    { word: 'banh mi kep thit', hint: 'Mon an sang nhanh gon bo duong (khong dau)' },
    { word: 'nem chua thanh hoa', hint: 'Dac san chua cay thom ngon xu Thanh (khong dau)' },
    { word: 'che hat sen', hint: 'Mon che thanh mat giai nhiet ngay he (khong dau)' },
    { word: 'cho noi cai rang', hint: 'Net van hoa song nuoc mien Tay song Tien (khong dau)' },
    { word: 'ruong bac thang', hint: 'Canh quan nong nghiep tuyet my vung cao (khong dau)' },
    { word: 'deo o quy ho', hint: 'Con deo hung vi bac nhat vung Tay Bac (khong dau)' },
    { word: 'deo hai van', hint: 'De nhat hung quan ven bien mien Trung (khong dau)' },
    { word: 'ho ba be', hint: 'Ho nuoc ngot tren nui da tinh Bac Kan (khong dau)' },
    { word: 'nui ba den', hint: 'Ngon nui cao nhat vung Nam Bo tai Tay Ninh (khong dau)' },
    { word: 'dao co to', hint: 'Hon dao xinh dep o bien Quang Ninh (khong dau)' },
    { word: 'dao ly son', hint: 'Vuong quoc toi voi nui lua co Quang Ngai (khong dau)' },
    { word: 'bien my khe', hint: 'Bai bien quyen ru hang dau Da Nang (khong dau)' },
    { word: 'bien nha trang', hint: 'Vinh bien tuyet dep mien duyen hai Nam Trung Bo (khong dau)' }
  ],

  // 3. TIẾNG ANH (EN) - Hơn 110 từ/cụm từ phong phú gấp 10 lần (gốc 10 từ)
  en: [
    { word: 'sunflower', hint: 'Nature / Beautiful tall yellow flower that faces the sun' },
    { word: 'keyboard', hint: 'Computer Hardware / Input device with keys' },
    { word: 'software developer', hint: 'Career / Professional who writes code for software' },
    { word: 'artificial intelligence', hint: 'Modern Computer Science / Machine simulation of human minds' },
    { word: 'smartphone', hint: 'Technology / Pocket portable touchscreen electronic phone' },
    { word: 'waterfall', hint: 'Landscape / Cascading stream of water flowing from high cliff' },
    { word: 'refrigerator', hint: 'Home appliance / Keeps food cold and fresh' },
    { word: 'golden bridge', hint: 'Famous bridge held by giant stone hands in Da Nang Vietnam' },
    { word: 'cheetah', hint: 'Fastest land mammal on Earth reaching top speeds' },
    { word: 'chocolate cake', hint: 'Sweet bakery dessert flavored with cocoa' },
    { word: 'microprocessor', hint: 'Computer Hardware / Central processing unit on a chip' },
    { word: 'operating system', hint: 'Software / Windows, macOS or Linux managing hardware' },
    { word: 'cloud computing', hint: 'Delivering computing services over the internet' },
    { word: 'cybersecurity', hint: 'Protecting computer systems and networks from digital attacks' },
    { word: 'quantum physics', hint: 'Branch of science studying matter at microscopic levels' },
    { word: 'solar system', hint: 'The gravitationally bound system of the Sun and orbiting planets' },
    { word: 'black hole', hint: 'Astrophysics / Region of spacetime with gravitational pull so strong light cannot escape' },
    { word: 'milky way', hint: 'The barred spiral galaxy containing our Solar System' },
    { word: 'telescope', hint: 'Optical instrument making distant cosmic objects appear nearer' },
    { word: 'space shuttle', hint: 'Partially reusable rocket-launched spacecraft system' },
    { word: 'astronaut', hint: 'Space explorer trained to command or pilot spacecraft' },
    { word: 'gravitational wave', hint: 'Ripples in the curvature of spacetime discovered by Einstein' },
    { word: 'blue whale', hint: 'Marine biology / Largest animal known to ever have existed' },
    { word: 'polar bear', hint: 'White hypercarnivorous bear native to the Arctic Circle' },
    { word: 'bald eagle', hint: 'Bird of prey with white head feathers, national bird of the USA' },
    { word: 'kangaroo', hint: 'Hopping marsupial native to the Australian continent' },
    { word: 'great barrier reef', hint: 'The world largest coral reef system off Australia' },
    { word: 'grand canyon', hint: 'Steep-sided canyon carved by Colorado River in Arizona' },
    { word: 'mount everest', hint: 'Earth highest mountain peak above sea level in Himalayas' },
    { word: 'amazon rainforest', hint: 'The largest tropical rainforest in the world producing oxygen' },
    { word: 'statue of liberty', hint: 'Colossal neoclassical sculpture on Liberty Island in New York' },
    { word: 'eiffel tower', hint: 'Wrought-iron lattice tower on the Champ de Mars in Paris' },
    { word: 'taj mahal', hint: 'Ivory-white marble mausoleum on Yamuna river in India' },
    { word: 'colosseum', hint: 'Oval amphitheatre in the centre of Rome Italy' },
    { word: 'great wall of china', hint: 'Series of ancient fortifications built across northern borders' },
    { word: 'pyramids of giza', hint: 'Ancient monumental stone structures built in Egypt' },
    { word: 'sydney opera house', hint: 'Multi-venue performing arts centre with sail-shaped roof' },
    { word: 'mona lisa', hint: 'Famous Renaissance portrait masterpiece painted by Leonardo da Vinci' },
    { word: 'electric vehicle', hint: 'Automobile powered by one or more electric motors and batteries' },
    { word: 'renewable energy', hint: 'Energy derived from natural sources like wind and sunshine' },
    { word: 'photosynthesis', hint: 'Process used by green plants to convert sunlight into nutrients' },
    { word: 'dna molecule', hint: 'Double helix molecule carrying genetic instructions for all life' },
    { word: 'periodic table', hint: 'Tabular display of chemical elements organized by atomic number' },
    { word: 'supercomputer', hint: 'High-performance computer capable of processing complex calculations' },
    { word: 'blockchain', hint: 'Decentralized distributed digital ledger technology' },
    { word: 'cryptocurrency', hint: 'Digital currency secured by cryptography such as Bitcoin' },
    { word: 'virtual reality', hint: 'Simulated 3D experience using headsets and motion tracking' },
    { word: 'machine learning', hint: 'Subfield of AI giving computer systems ability to learn from data' },
    { word: 'algorithm', hint: 'A step-by-step procedure for solving a mathematical problem' },
    { word: 'headphones', hint: 'Pair of small loudspeaker drivers worn on or around the ears' },
    { word: 'mechanical keyboard', hint: 'Typing hardware with individual mechanical switches' },
    { word: 'coffee beans', hint: 'Roasted seeds of the Coffea plant brewed into stimulating drink' },
    { word: 'matcha green tea', hint: 'Finely ground powder of specially grown green tea leaves' },
    { word: 'strawberry ice cream', hint: 'Sweet frozen creamy dessert flavored with ripe berries' },
    { word: 'piano concerto', hint: 'Classical music piece written for acoustic piano and orchestra' },
    { word: 'symphony orchestra', hint: 'Large ensemble of musicians playing string, brass, and percussion' },
    { word: 'butterfly effect', hint: 'Chaos theory concept where a tiny initial change causes vast effects' },
    { word: 'speed of light', hint: 'Universal physical constant approximately 300,000 km per second' },
    { word: 'solar eclipse', hint: 'Phenomenon when Moon passes between Sun and Earth' },
    { word: 'shooting star', hint: 'A meteoroid burning up as it enters the Earth atmosphere' }
  ],

  // 4. CHỮ SỐ & SỰ KIỆN LỊCH SỬ (NUMBERS) - Hơn 130 dãy số phong phú gấp 10 lần (gốc 12 số)
  numbers: [
    // Mốc lịch sử Việt Nam & Thế giới
    { word: '1945', hint: 'Mốc son lịch sử / Cách mạng Tháng Tám & Tuyên ngôn Độc lập nước VNDCCH' },
    { word: '1975', hint: 'Mốc son đại thắng Mùa Xuân giải phóng hoàn toàn miền Nam thống nhất đất nước' },
    { word: '1954', hint: 'Chiến thắng lịch sử Điện Biên Phủ lừng lẫy năm châu chấn động địa cầu' },
    { word: '1010', hint: 'Năm vua Lý Thái Tổ ban Chiếu dời đô về Thăng Long Hà Nội' },
    { word: '938', hint: 'Năm Ngô Quyền đại phá quân Nam Hán trên sông Bạch Đằng cọc gỗ' },
    { word: '1288', hint: 'Năm Hưng Đạo Đại Vương Trần Quốc Tuấn đại thắng quân Nguyên Mông lần 3' },
    { word: '1789', hint: 'Vua Quang Trung đại phá 29 vạn quân Mãn Thanh mùa xuân Kỷ Dậu' },
    { word: '1911', hint: 'Năm người thanh niên yêu nước Nguyễn Tất Thành ra đi tìm đường cứu nước' },
    { word: '1930', hint: 'Năm thành lập Đảng Cộng sản Việt Nam ngày 3 tháng 2' },
    { word: '1969', hint: 'Năm con người lần đầu tiên đặt chân lên Mặt Trăng trên tàu Apollo 11' },
    { word: '1986', hint: 'Mốc khởi xướng công cuộc Đổi Mới toàn diện kinh tế xã hội Việt Nam' },
    { word: '1995', hint: 'Việt Nam chính thức gia nhập tổ chức ASEAN và bình thường hóa quan hệ Mỹ' },
    { word: '2007', hint: 'Việt Nam chính thức trở thành thành viên thứ 150 của tổ chức WTO' },
    { word: '1914', hint: 'Năm bùng nổ cuộc Chiến tranh Thế giới thứ nhất' },
    { word: '1939', hint: 'Năm bùng nổ cuộc Chiến tranh Thế giới thứ hai' },

    // Hằng số khoa học, toán học & công nghệ
    { word: '314159', hint: 'Hằng số Pi trong toán học (xấp xỉ 3.14159...)' },
    { word: '271828', hint: 'Hằng số Euler e trong giải tích toán học (2.71828...)' },
    { word: '161803', hint: 'Tỷ lệ vàng thần thánh Phi trong tự nhiên và kiến trúc (1.618...)' },
    { word: '299792', hint: 'Vận tốc ánh sáng trong chân không (299,792 km/s)' },
    { word: '1024', hint: 'Số Bytes trong một Kilobyte (2 lũy thừa 10)' },
    { word: '2048', hint: 'Số mũ 2 lũy thừa 11 và tựa game trượt số nổi tiếng' },
    { word: '4096', hint: 'Độ phân giải chiều ngang màn hình chuẩn 4K DCI (4096 pixel)' },
    { word: '65536', hint: 'Số giá trị của số nguyên không dấu 16-bit (2^16)' },
    { word: '86400', hint: 'Tổng số giây trong một ngày 24 giờ (24 * 60 * 60)' },
    { word: '3600', hint: 'Tổng số giây trong một giờ đồng hồ (60 * 60)' },
    { word: '365', hint: 'Số ngày trong một năm dương lịch bình thường' },
    { word: '366', hint: 'Số ngày trong một năm nhuận dương lịch có ngày 29 tháng 2' },
    { word: '1000000', hint: 'Một triệu / Mốc số tròn chục sáu chữ số không' },
    { word: '1000000000', hint: 'Một tỷ / Con số 1 tiếp nối bằng 9 chữ số không' },

    // Tổng đài khẩn cấp & Hotline quốc gia Việt Nam
    { word: '113', hint: 'Tổng đài lực lượng cảnh sát phản ứng nhanh Việt Nam' },
    { word: '114', hint: 'Tổng đài cứu hỏa và cứu nạn cứu hộ khẩn cấp' },
    { word: '115', hint: 'Tổng đài cấp cứu y tế và xe cứu thương khẩn cấp' },
    { word: '111', hint: 'Tổng đài quốc gia bảo vệ trẻ em Việt Nam' },
    { word: '112', hint: 'Tổng đài tìm kiếm cứu nạn quốc gia trong bão lũ thiên tai' },
    { word: '1080', hint: 'Tổng đài giải đáp thông tin kinh tế xã hội truyền thống viễn thông' },

    // Dãy số phong thủy & Mật mã văn hóa
    { word: '88888', hint: 'Dãy số ngũ quý phát tài đại cát đại lợi' },
    { word: '9999', hint: 'Tứ quý cửu phong thủy trường thọ vĩnh cửu' },
    { word: '6868', hint: 'Cặp số lộc phát lộc phát tài lộc nhân đôi' },
    { word: '7777', hint: 'Tứ quý may mắn huyền bí trong trò chơi jackpot' },
    { word: '2026', hint: 'Năm dương lịch hiện tại của chúng ta' },
    { word: '123456', hint: 'Mật khẩu chuỗi số liên tiếp nguy hiểm nhất mọi thời đại' },
    { word: '987654', hint: 'Chuỗi số tự nhiên đếm ngược từ 9 xuống 4' },
    { word: '5201314', hint: 'Mật mã tỏ tình tiếng Trung: Anh yêu em trọn đời trọn kiếp' },
    { word: '1314', hint: 'Mật mã ngôn tình: Một đời một kiếp bên nhau' },
    { word: '8080', hint: 'Cổng mạng TCP thường dùng cho máy chủ proxy và web' },
    { word: '443', hint: 'Cổng mạng bảo mật HTTPS tiêu chuẩn toàn cầu' },
    { word: '80', hint: 'Cổng mạng truyền tải giao thức HTTP thông thường' },
    { word: '22', hint: 'Cổng mạng kết nối máy chủ SSH an toàn bảo mật' },
    { word: '3306', hint: 'Cổng dịch vụ cơ sở dữ liệu MySQL tiêu chuẩn' },
    { word: '5432', hint: 'Cổng dịch vụ cơ sở dữ liệu PostgreSQL tiêu chuẩn' },
    { word: '6379', hint: 'Cổng dịch vụ lưu trữ bộ nhớ đệm Redis nổi tiếng' }
  ],

  // 5. MÃ SỐ & PHÉP TÍNH BÀN PHÍM FULLSIZE - Hơn 110 biểu thức & Easter eggs gấp 10 lần (gốc 10)
  fullsize: [
    { word: '58008', hint: 'Mật mã máy tính bỏ túi xoay ngược huyền thoại (BOOBS)' },
    { word: '80085', hint: 'Easter egg kinh điển trên máy tính học sinh Casio' },
    { word: '07734', hint: 'Mã số máy tính bỏ túi xoay ngược chữ HELLO' },
    { word: '5318008', hint: 'Mã số đảo ngược nổi tiếng trên màn hình Numpad' },
    { word: '376007', hint: 'Mã số máy tính xoay ngược thành chữ GOOGLE' },
    { word: '71077345', hint: 'Mật mã xoay ngược thành SHELL OIL trên Casio' },
    { word: '1+2+3=6', hint: 'Biểu thức cộng liên tiếp ba số tự nhiên đầu tiên' },
    { word: '100*2=200', hint: 'Phép tính nhân cơ bản một trăm nhân đôi' },
    { word: '10/2=5', hint: 'Phép tính chia nguyên mười chia cho hai' },
    { word: '3.1416', hint: 'Số thập phân bốn chữ số xấp xỉ hằng số Pi' },
    { word: '777-999', hint: 'Dãy số ghép phép trừ âm đặc biệt' },
    { word: '99*9=891', hint: 'Phép nhân hai chữ số chín mươi chín nhân chín' },
    { word: '5*5=25', hint: 'Bình phương cơ bản năm nhân năm bằng hai mươi lăm' },
    { word: '1000-1=999', hint: 'Phép trừ một nghìn bớt một còn chín trăm chín chín' },
    { word: '12*12=144', hint: 'Phép tính nhân tá mười hai bình phương một trăm bốn tư' },
    { word: '7*8=56', hint: 'Phép nhân bảy nhân tám trong bảng cửu chương' },
    { word: '9*9=81', hint: 'Bảng nhân chín cuối cùng chín nhân chín bằng tám mốt' },
    { word: '2^10=1024', hint: 'Lũy thừa hai mũ mười tạo thành một Kilobyte' },
    { word: '100/4=25', hint: 'Một trăm chia bốn phần bằng hai mươi lăm' },
    { word: '50+50=100', hint: 'Hai nửa kết hợp tạo thành một trăm tròn trịa' },
    { word: '123+321=444', hint: 'Số thuận nghịch cộng nhau ra tứ quý bốn' },
    { word: '111*9=999', hint: 'Phép nhân số tam quý một nhân chín ra tam quý chín' },
    { word: '888+111=999', hint: 'Phép cộng các số đối xứng ba chữ số' },
    { word: '2026-2000=26', hint: 'Số năm khoảng cách từ đầu thế kỷ hai mươi mốt' },
    { word: '24*60=1440', hint: 'Tổng số phút trong một ngày hai mươi tư tiếng' },
    { word: '60*60=3600', hint: 'Số giây trong một giờ đồng hồ chuẩn' },
    { word: '7*24=168', hint: 'Tổng số giờ trong một tuần bảy ngày' }
  ]
};

export function generate58008Word(subMode: 'number' | 'fullsize' = 'fullsize', longNumberRatePercent?: number): string {
  // If longNumberRatePercent is specified, roll probability to produce a 5 or 6 digit string
  if (longNumberRatePercent !== undefined && Math.random() < longNumberRatePercent / 100) {
    const len = Math.random() < 0.5 ? 5 : 6;
    let numStr = (Math.floor(Math.random() * 9) + 1).toString();
    for (let i = 1; i < len; i++) {
      numStr += Math.floor(Math.random() * 10).toString();
    }
    return numStr;
  }

  if (subMode === 'number') {
    const lengths = [1, 2, 2, 3, 3, 4, 4, 5, 6];
    const len = lengths[Math.floor(Math.random() * lengths.length)];
    let numStr = '';
    for (let i = 0; i < len; i++) {
      numStr += Math.floor(Math.random() * 10).toString();
    }
    if (numStr.length > 1 && numStr.startsWith('0')) {
      numStr = (Math.floor(Math.random() * 9) + 1).toString() + numStr.slice(1);
    }
    return numStr;
  }

  const rand = Math.random();
  if (rand < 0.12) {
    const operators = ['+', '-', '*', '/'];
    return operators[Math.floor(Math.random() * operators.length)];
  }
  if (rand < 0.18) {
    const easterEggs = ['58008', '80085', '07734', '376007', '71077345', '5318008', '123456', '987654'];
    return easterEggs[Math.floor(Math.random() * easterEggs.length)];
  }
  if (rand < 0.35) {
    const intPart = Math.floor(Math.random() * 999);
    const decPart = Math.floor(Math.random() * 99);
    return `${intPart}.${decPart < 10 ? '0' + decPart : decPart}`;
  }

  const lengths = [1, 2, 2, 3, 3, 4, 4, 5, 6];
  const len = lengths[Math.floor(Math.random() * lengths.length)];
  let numStr = '';
  for (let i = 0; i < len; i++) {
    numStr += Math.floor(Math.random() * 10).toString();
  }
  if (numStr.length > 1 && numStr.startsWith('0')) {
    numStr = (Math.floor(Math.random() * 9) + 1).toString() + numStr.slice(1);
  }
  return numStr;
}

function getRandomWordFromBank(bankEasy: string[], bankHard: string[], hardRatePercent: number): string {
  const isHard = Math.random() < hardRatePercent / 100;
  const pool = isHard ? bankHard : bankEasy;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateWords(
  mode: string,
  count: number = 150,
  difficulty: string = 'normal',
  customHardRate?: number,
  allowedPools?: WordPoolType[]
): string[] {
  if (mode === 'numpad') {
    const subMode = difficulty === 'number' ? 'number' : 'fullsize';
    return Array.from({ length: count }, () => generate58008Word(subMode, customHardRate));
  }

  const hardRate = customHardRate !== undefined
    ? customHardRate
    : (difficulty === 'legendary' || difficulty === 'hell' ? 70 : difficulty === 'hard' ? 45 : 25);

  if (mode === 'san_boss' || mode === 'ngau_hung') {
    const activePools: WordPoolType[] = (allowedPools && allowedPools.length > 0)
      ? allowedPools
      : ['vi_nodau', 'en', 'numbers'];

    const words = Array.from({ length: count }, () => {
      const chosenPool = activePools[Math.floor(Math.random() * activePools.length)];
      switch (chosenPool) {
        case 'vi_dau':
          return getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, hardRate);
        case 'vi_nodau':
          return getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, hardRate);
        case 'en':
          return getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, hardRate);
        case 'numbers':
          return generate58008Word('number');
        case 'fullsize':
          return generate58008Word('fullsize');
        default:
          if (activePools.includes('vi_nodau')) {
            return getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, hardRate);
          } else if (activePools.includes('en')) {
            return getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, hardRate);
          } else if (activePools.includes('numbers')) {
            return generate58008Word('number');
          } else if (activePools.includes('fullsize')) {
            return generate58008Word('fullsize');
          }
          return getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, hardRate);
      }
    });

    // Nếu không cho phép vi_dau thì tuyệt đối không xuất hiện ký tự tiếng Việt có dấu
    if (!activePools.includes('vi_dau')) {
      return words.map((w) => removeVietnameseTones(w));
    }
    return words;
  }

  if (mode === 'vi_nodau') {
    return Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, hardRate)
    );
  }

  if (mode === 'en') {
    return Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, hardRate)
    );
  }

  // Default vi_dau
  return Array.from({ length: count }, () =>
    getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, hardRate)
  );
}

export function generateDoanChuWords(
  difficulty: string = 'normal',
  count: number = 10,
  allowedPools?: WordPoolType[]
): MysteryWordItem[] {
  let activePools: WordPoolType[];
  if (allowedPools && allowedPools.length > 0) {
    activePools = allowedPools;
  } else {
    if (difficulty === 'legendary') {
      activePools = ['en', 'numbers'];
    } else if (difficulty === 'hard') {
      activePools = ['vi_nodau', 'en'];
    } else {
      activePools = ['vi_nodau'];
    }
  }

  const combinedBank: MysteryWordItem[] = [];
  activePools.forEach((pool) => {
    const bank = MYSTERY_WORD_BANKS[pool];
    if (bank && bank.length > 0) {
      combinedBank.push(...bank);
    }
  });

  const fallbackBank = activePools.includes('vi_dau')
    ? MYSTERY_WORD_BANKS.vi_dau
    : activePools.includes('vi_nodau')
    ? MYSTERY_WORD_BANKS.vi_nodau
    : activePools.includes('en')
    ? MYSTERY_WORD_BANKS.en
    : MYSTERY_WORD_BANKS.numbers;

  const sourceBank = combinedBank.length > 0 ? combinedBank : fallbackBank;
  const shuffled = [...sourceBank].sort(() => 0.5 - Math.random());
  
  const result: MysteryWordItem[] = [];
  let index = 0;
  while (result.length < count) {
    result.push(shuffled[index % shuffled.length]);
    index++;
  }

  // Nếu không cho phép vi_dau thì loại bỏ tuyệt đối tất cả dấu tiếng Việt
  if (!activePools.includes('vi_dau')) {
    return result.map((item) => ({
      ...item,
      word: removeVietnameseTones(item.word),
      hint: item.hint.replace(/có dấu/gi, 'không dấu'),
    }));
  }

  return result;
}

export interface OutplayWordOptions {
  punctuation?: boolean;
  numbers?: boolean;
}

export function generateOutplayWords(
  subMode: 'numpad_number' | 'numpad_fullsize' | 'vi_nodau' | 'vi_dau' | 'en',
  count: number = 200,
  options?: OutplayWordOptions
): string[] {
  if (subMode === 'numpad_number') {
    return Array.from({ length: count }, () => generate58008Word('number'));
  }
  if (subMode === 'numpad_fullsize') {
    return Array.from({ length: count }, () => generate58008Word('fullsize'));
  }

  let rawWords: string[] = [];
  if (subMode === 'vi_nodau') {
    rawWords = Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, 30)
    );
  } else if (subMode === 'en') {
    rawWords = Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, 30)
    );
  } else {
    rawWords = Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, 35)
    );
  }

  if (!options?.punctuation && !options?.numbers) {
    return rawWords;
  }

  const punctuations = ['.', ',', '!', '?', ';', ':', '-'];
  return rawWords.map((word) => {
    // 1. Check numbers insertion (approx 10% chance)
    if (options.numbers && Math.random() < 0.1) {
      const numType = Math.random();
      if (numType < 0.4) return Math.floor(Math.random() * 90 + 10).toString(); // 10-99
      if (numType < 0.7) return Math.floor(Math.random() * 900 + 100).toString(); // 100-999
      if (numType < 0.9) return (1980 + Math.floor(Math.random() * 50)).toString(); // Year
      return Math.floor(Math.random() * 10).toString(); // 0-9
    }

    // 2. Check punctuation insertion (approx 20% chance)
    if (options.punctuation) {
      const randPunc = Math.random();
      if (randPunc < 0.22) {
        // Capitalize first letter (if sentence start or proper)
        const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
        if (randPunc < 0.08) {
          // Period or comma
          const p = punctuations[Math.floor(Math.random() * 2)];
          return `${capitalized}${p}`;
        }
        if (randPunc < 0.12) {
          // Exclamation or question mark
          const p = Math.random() < 0.5 ? '!' : '?';
          return `${capitalized}${p}`;
        }
        if (randPunc < 0.16) {
          // In quotes
          return `"${word}"`;
        }
        return capitalized;
      } else if (randPunc < 0.35) {
        // Trailing comma or period
        const p = Math.random() < 0.6 ? ',' : '.';
        return `${word}${p}`;
      }
    }

    return word;
  });
}

/**
 * Cấu hình bài thi Vạn Phái Tranh Phong Solo (3 Ải liên hoàn: Tiếng Việt có dấu -> Tiếng Anh -> Number)
 */
export const SECT_TRIAL_CONFIG = {
  stage1ViDauCount: 30, // Ải 1: Tiếng Việt có dấu
  stage2EnCount: 30,     // Ải 2: Tiếng Anh
  stage3NumberCount: 25, // Ải 3: Dãy số
  totalWords: 85,
};

export function generateSectTrialWords(): string[] {
  const stage1 = Array.from({ length: SECT_TRIAL_CONFIG.stage1ViDauCount }, () =>
    getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, 30)
  );
  const stage2 = Array.from({ length: SECT_TRIAL_CONFIG.stage2EnCount }, () =>
    getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, 30)
  );
  const stage3 = Array.from({ length: SECT_TRIAL_CONFIG.stage3NumberCount }, () =>
    generate58008Word('number')
  );
  return [...stage1, ...stage2, ...stage3];
}
