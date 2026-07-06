// ============================================================
// TIMXEDIEN.COM — DỮ LIỆU WEBSITE
// Toàn bộ thông tin liên hệ, giá thuê, đội xe chỉnh sửa TẠI ĐÂY.
// Giá chỉ mang tính tham khảo — cập nhật theo giá thực tế của bạn.
// ============================================================

const CONFIG = {
  brand: "TimXeDien.com",
  slogan: "Thuê xe điện VinFast tự lái — Cần Thơ & Miền Tây",
  hotline: "0939099018",
  hotlineDisplay: "0939.099.018",
  zalo: "https://zalo.me/0939099018",
  email: "timxedien@gmail.com",
  address: "TP. Cần Thơ (giao xe tận nơi khu vực Ninh Kiều, Cái Răng, Bình Thủy)",
  mapLink: "https://maps.google.com/?q=Ninh+Kieu+Can+Tho",
  facebook: "https://facebook.com/timxedien",
  tiktok: "https://tiktok.com/@timxedien",
  // Chính sách chung (giống mô hình Green Future)
  kmPerDay: 300,        // giới hạn km / ngày
  kmPerMonth: 3000,     // giới hạn km / tháng
  deposit: 500000,      // tiền cọc giữ chỗ khi đặt xe (đ)
  deliveryFee: 150000,  // phí giao xe tận nơi nội ô Cần Thơ (đ)
  discount3Day: 0.05,   // giảm 5% khi thuê từ 3 ngày
  discount7Day: 0.10,   // giảm 10% khi thuê từ 7 ngày
  discount6Month: 0.06, // giảm 6% khi thuê từ 6 tháng
  discount12Month: 0.12 // giảm 12% khi thuê từ 12 tháng
};

// ---- ĐỘI XE CHO THUÊ ----
// segment: mini | suv | 7cho | dichvu  (dùng cho bộ lọc)
// priceDay: giá thuê / ngày (đ) · priceMonth: giá thuê / tháng (đ)
// overKm: phụ phí vượt km (đ/km)
const FLEET = [
  {
    id: "minio",
    name: "VinFast Minio Green",
    segment: "mini",
    segmentLabel: "Minicar đô thị",
    seats: 4,
    range: "210 km/sạc",
    priceDay: 450000,
    priceMonth: 6500000,
    overKm: 2500,
    img: "images/cars/minio.png",
    grad: ["#0e5c3a", "#083822"],
    tag: "GIÁ RẺ NHẤT",
    desc: "Minicar điện nhỏ gọn, chi phí thấp nhất đội xe. Hợp đi lại nội ô Cần Thơ, đưa đón con, chạy dịch vụ ngắn.",
    features: ["Dễ lái, dễ đỗ trong phố hẹp", "Chi phí vận hành ~200đ/km", "Phù hợp người mới lái"]
  },
  {
    id: "vf3",
    name: "VinFast VF 3",
    segment: "mini",
    segmentLabel: "Mini SUV",
    seats: 4,
    range: "215 km/sạc",
    priceDay: 590000,
    priceMonth: 8500000,
    overKm: 3000,
    img: "images/cars/vf3.png",
    grad: ["#8a6a1d", "#4d3708"],
    tag: "ĐƯỢC THUÊ NHIỀU",
    desc: "Mini SUV quốc dân, cá tính và cực hot. Gầm cao 191mm tự tin đường Miền Tây, chụp hình sống ảo cực chất.",
    features: ["Gầm cao — hợp đường quê, đường ngập nhẹ", "Xe hot, lái là mê", "Sạc nhanh 36 phút (10%→70%)"]
  },
  {
    id: "nerio",
    name: "VinFast Nerio Green",
    segment: "dichvu",
    segmentLabel: "Xe dịch vụ",
    seats: 5,
    range: "300 km/sạc",
    priceDay: 750000,
    priceMonth: 9500000,
    overKm: 3000,
    img: "images/cars/nerio.png",
    grad: ["#134e4a", "#042f2e"],
    tag: "CHẠY DỊCH VỤ",
    desc: "C-SUV 5 chỗ bản dịch vụ — lựa chọn số 1 của anh em tài xế công nghệ tại Cần Thơ. Thuê tháng chạy Xanh SM, Grab hoàn vốn nhanh.",
    features: ["Thuê tháng cho tài xế công nghệ", "Bền bỉ, chi phí/km thấp", "Hỗ trợ đăng ký chạy dịch vụ"]
  },
  {
    id: "vf5",
    name: "VinFast VF 5 Plus",
    segment: "suv",
    segmentLabel: "A-SUV",
    seats: 5,
    range: "326 km/sạc",
    priceDay: 850000,
    priceMonth: 11000000,
    overKm: 3500,
    img: "images/cars/vf5.png",
    grad: ["#1d4ed8", "#172554"],
    tag: "",
    desc: "A-SUV linh hoạt, rộng rãi bất ngờ. Đi làm hằng ngày hay về quê cuối tuần đều gọn gàng, tiết kiệm.",
    features: ["Màn hình 8 inch, ADAS cơ bản", "Cốp rộng cho gia đình nhỏ", "Vua doanh số phân khúc A"]
  },
  {
    id: "vf6",
    name: "VinFast VF 6",
    segment: "suv",
    segmentLabel: "B-SUV",
    seats: 5,
    range: "460 km/sạc",
    priceDay: 990000,
    priceMonth: 13500000,
    overKm: 4000,
    img: "images/cars/vf6.png",
    grad: ["#0f766e", "#134e4a"],
    tag: "GIA ĐÌNH",
    desc: "B-SUV cân bằng nhất đội xe: rộng, êm, tầm hoạt động 460km — Cần Thơ đi Châu Đốc, Hà Tiên khỏi lo sạc giữa đường.",
    features: ["Tầm hoạt động 460 km", "Khoang lái hiện đại, màn 12.9 inch", "Êm ái vượt phân khúc"]
  },
  {
    id: "vf7",
    name: "VinFast VF 7",
    segment: "suv",
    segmentLabel: "C-SUV",
    seats: 5,
    range: "450 km/sạc",
    priceDay: 1190000,
    priceMonth: 16000000,
    overKm: 5000,
    img: "images/cars/vf7.png",
    grad: ["#7c2d12", "#431407"],
    tag: "",
    desc: "C-SUV thể thao, mạnh mẽ — mẫu xe khiến ai cầm lái cũng phải trầm trồ. Hợp đi công tác, tiếp khách, du lịch xa.",
    features: ["Thiết kế phi thuyền ấn tượng", "Bản Plus 349 mã lực, AWD", "Trang bị ADAS cao cấp"]
  },
  {
    id: "vf8",
    name: "VinFast VF 8",
    segment: "suv",
    segmentLabel: "D-SUV",
    seats: 5,
    range: "471 km/sạc",
    priceDay: 1450000,
    priceMonth: 19500000,
    overKm: 6000,
    img: "images/cars/vf8.png",
    grad: ["#334155", "#0f172a"],
    tag: "",
    desc: "D-SUV cao cấp rộng rãi, đầm chắc. Chuyến đi dài cùng cả nhà hay sự kiện quan trọng đều xứng tầm.",
    features: ["Khoang nội thất cao cấp", "Trợ lái nâng cao, màn HUD", "Vận hành đầm chắc cao tốc"]
  },
  {
    id: "vf9",
    name: "VinFast VF 9",
    segment: "7cho",
    segmentLabel: "E-SUV 7 chỗ",
    seats: 7,
    range: "480 km/sạc",
    priceDay: 1890000,
    priceMonth: 25000000,
    overKm: 7000,
    img: "images/cars/vf9.png",
    grad: ["#3f3f46", "#18181b"],
    tag: "CAO CẤP",
    desc: "Flagship 7 chỗ — ghế thương gia, không gian hạng nhất. Đón khách VIP, đi gia đình đông người là chuẩn bài.",
    features: ["7 chỗ, ghế cơ trưởng bản Plus", "Tầm hoạt động 480 km", "Đẳng cấp doanh nhân"]
  },
  {
    id: "limo",
    name: "VinFast Limo Green",
    segment: "7cho",
    segmentLabel: "MPV 7 chỗ",
    seats: 7,
    range: "450 km/sạc",
    priceDay: 1100000,
    priceMonth: 14500000,
    overKm: 4000,
    img: "images/cars/limo.png",
    grad: ["#365314", "#1a2e05"],
    tag: "ĐOÀN & GIA ĐÌNH",
    desc: "MPV điện 7 chỗ rộng rãi — đi Phú Quốc, Hà Tiên, Châu Đốc cả đại gia đình. Bản dịch vụ chạy tour cực kinh tế.",
    features: ["7 chỗ ngồi thoải mái thực sự", "Hợp thuê đi tour, đám tiệc", "Chi phí/ghế thấp nhất đội xe"]
  },
  {
    id: "ecvan",
    name: "VinFast EC Van",
    segment: "dichvu",
    segmentLabel: "Van chở hàng",
    seats: 2,
    range: "250 km/sạc",
    priceDay: 690000,
    priceMonth: 9000000,
    overKm: 3000,
    img: "images/cars/ecvan.png",
    grad: ["#155e75", "#083344"],
    tag: "CHỞ HÀNG",
    desc: "Van điện chở hàng nội ô — giao hàng, chở nông sản, vật tư trong Cần Thơ với chi phí rẻ hơn hẳn xe tải xăng dầu.",
    features: ["Khoang hàng ~2.6 m³", "Vào phố cấm tải giờ linh hoạt hơn", "Hợp hộ kinh doanh, shop online"]
  }
];

// ---- ĐIỂM NHẬN XE ----
const PICKUP_POINTS = [
  { id: "vp", label: "Văn phòng TimXeDien — Ninh Kiều, Cần Thơ", fee: 0 },
  { id: "sanbay", label: "Sân bay Quốc tế Cần Thơ (VCA)", fee: 0 },
  { id: "benxe", label: "Bến xe Trung tâm Cần Thơ", fee: 0 },
  { id: "giaotannoi", label: "Giao xe tận nơi nội ô Cần Thơ (+150.000đ)", fee: 150000 }
];

// ---- ĐÁNH GIÁ KHÁCH HÀNG ----
const REVIEWS = [
  {
    name: "Anh Minh Trí",
    role: "Chủ homestay — Ninh Kiều, Cần Thơ",
    stars: 5,
    text: "Thuê VF 6 một tuần đưa khách đi Chợ nổi Cái Răng với Sóc Trăng. Xe sạch, êm, sạc miễn phí trạm V-Green nên gần như không tốn tiền \"xăng\". Sẽ thuê dài hạn cho homestay."
  },
  {
    name: "Chị Ngọc Hân",
    role: "Nhân viên văn phòng — Cái Răng",
    stars: 5,
    text: "Lần đầu lái xe điện mà bên TimXeDien hướng dẫn tận tình từ cách sạc tới đi đường. Giao xe tận chung cư, thủ tục 15 phút là xong. Rất đáng tiền."
  },
  {
    name: "Anh Quốc Bảo",
    role: "Tài xế Xanh SM — Bình Thủy",
    stars: 5,
    text: "Thuê Nerio Green theo tháng chạy dịch vụ, mỗi tháng trừ hết chi phí vẫn dư hơn hẳn chạy xe xăng thuê. Bên này hỗ trợ giấy tờ đăng ký app luôn, quá tiện."
  },
  {
    name: "Chú Sáu Đức",
    role: "Về quê ăn Tết — Việt kiều Úc",
    stars: 5,
    text: "Về Cần Thơ 3 tuần, thuê VF 8 chở cả nhà đi Hà Tiên, Châu Đốc. Xe mạnh, ngồi êm ru, con cháu mê lắm. Năm sau về lại thuê tiếp."
  },
  {
    name: "Chị Thu Thảo",
    role: "Chủ shop online — Ô Môn",
    stars: 5,
    text: "Thuê EC Van giao hàng mỗi ngày, tính ra rẻ hơn thuê xe tải xăng gần 3 triệu mỗi tháng. Xe mới, chạy phố êm mà không sợ khói bụi."
  }
];

// ---- CÂU HỎI THƯỜNG GẶP ----
const FAQS = [
  {
    q: "Thuê xe cần giấy tờ gì?",
    a: "Bạn chỉ cần: (1) GPLX hạng B còn hiệu lực, (2) CCCD gắn chip hoặc hộ chiếu. Đối chiếu bản gốc khi nhận xe — không giữ giấy tờ gốc, không cần hộ khẩu hay thế chấp xe máy như thuê xe truyền thống."
  },
  {
    q: "Tiền cọc thuê xe là bao nhiêu?",
    a: "Khi đặt xe online bạn chỉ cần cọc giữ chỗ 500.000đ (trừ thẳng vào tiền thuê). Khi nhận xe, tùy dòng xe sẽ có khoản cọc trách nhiệm từ 3–10 triệu đồng hoặc giữ lại bằng tài sản tương đương, hoàn lại đầy đủ khi trả xe không phát sinh."
  },
  {
    q: "Xe điện thì sạc ở đâu, có tốn tiền không?",
    a: "Xe được sạc đầy trước khi giao. Trong thời gian thuê, bạn sạc MIỄN PHÍ tại hệ thống trạm V-Green phủ khắp Cần Thơ và Miền Tây (siêu thị, trạm dừng, cây xăng...). Chúng tôi gửi kèm bản đồ trạm sạc và hướng dẫn chi tiết khi giao xe."
  },
  {
    q: "Giới hạn số km di chuyển như thế nào?",
    a: "Gói ngày: tối đa 300 km/ngày. Gói tháng: tối đa 3.000 km/tháng. Vượt giới hạn tính phụ phí 2.500–7.000đ/km tùy dòng xe (rẻ hơn nhiều so với chi phí xăng). Đi xa hơn, hãy báo trước để được tư vấn gói phù hợp."
  },
  {
    q: "Có giao xe tận nơi không?",
    a: "Có. Miễn phí nhận xe tại văn phòng, sân bay Cần Thơ và bến xe trung tâm. Giao tận nơi trong nội ô Cần Thơ (Ninh Kiều, Cái Răng, Bình Thủy) phụ phí 150.000đ/lượt. Các huyện và tỉnh lân cận vui lòng liên hệ để báo phí."
  },
  {
    q: "Xe đang thuê mà gặp sự cố thì sao?",
    a: "Hotline kỹ thuật trực 24/7. Nếu xe gặp sự cố không do lỗi người thuê, chúng tôi đổi xe khác tương đương trong thời gian sớm nhất hoặc hoàn tiền những ngày chưa sử dụng — cam kết giống mô hình các đơn vị cho thuê xe điện lớn."
  },
  {
    q: "Thuê dài hạn theo tháng/năm có lợi gì?",
    a: "Giá tháng rẻ hơn 40–50% so với thuê lẻ ngày. Thuê từ 6 tháng giảm thêm 6%, từ 12 tháng giảm tới 12%. Bao gồm bảo dưỡng, đăng kiểm, cứu hộ — bạn chỉ việc lái. Đặc biệt phù hợp tài xế dịch vụ và doanh nghiệp."
  },
  {
    q: "Tôi muốn mua lại xe điện đã qua sử dụng thì sao?",
    a: "TimXeDien có chương trình bán xe điện đã qua sử dụng được kiểm định, lịch sử rõ ràng, giá tốt hơn xe mới 15–30%, hỗ trợ trả góp và sang tên trọn gói. Để lại thông tin ở mục Liên hệ, chúng tôi sẽ gửi danh sách xe đang có."
  }
];

// ---- KHU VỰC HOẠT ĐỘNG ----
const AREAS = [
  {
    name: "Cần Thơ",
    status: "active",
    statusLabel: "ĐANG HOẠT ĐỘNG",
    desc: "Giao nhận xe toàn TP. Cần Thơ: Ninh Kiều, Cái Răng, Bình Thủy, Ô Môn, Thốt Nốt. Nhận xe tại sân bay VCA và bến xe trung tâm.",
    spots: ["Ninh Kiều", "Cái Răng", "Bình Thủy", "Sân bay VCA", "Ô Môn", "Thốt Nốt"]
  },
  {
    name: "Miền Tây",
    status: "soon",
    statusLabel: "SẮP RA MẮT",
    desc: "Vĩnh Long, Đồng Tháp, An Giang, Kiên Giang, Sóc Trăng, Hậu Giang... Đăng ký trước để nhận ưu đãi khai trương từng tỉnh.",
    spots: ["Vĩnh Long", "Long Xuyên", "Châu Đốc", "Rạch Giá", "Sóc Trăng", "Vị Thanh"]
  },
  {
    name: "Phú Quốc",
    status: "soon",
    statusLabel: "DỰ KIẾN 2026",
    desc: "Thuê xe điện vi vu đảo ngọc — nhận xe tại sân bay Phú Quốc. Để lại thông tin để trở thành khách hàng đầu tiên với ưu đãi tới 30%.",
    spots: ["Sân bay Phú Quốc", "Dương Đông", "An Thới", "Grand World"]
  }
];

// ---- TRẠNG THÁI ĐƠN THUÊ (dùng chung website + tài khoản + admin) ----
const ORDER_STATUS = {
  new:        { label: "Chờ xác nhận",  icon: "🕐", color: "#0369a1", step: 0 },
  confirmed:  { label: "Đã xác nhận",   icon: "✅", color: "#059669", step: 1 },
  delivering: { label: "Đang giao xe",  icon: "🚚", color: "#b45309", step: 2 },
  renting:    { label: "Đang thuê",     icon: "🚗", color: "#7c3aed", step: 3 },
  completed:  { label: "Hoàn tất",      icon: "🏁", color: "#15803d", step: 4 },
  cancelled:  { label: "Đã hủy",        icon: "✖️", color: "#b91c1c", step: -1 }
};

// ---- XE ĐIỆN ĐÃ QUA SỬ DỤNG (trang xe-cu.html) ----
// status: available (đang bán) | deposit (đã cọc) | sold (đã bán)
const USED_CARS = [
  {
    id: "uc-vf3-24",
    name: "VinFast VF 3 2024",
    year: 2024, km: 12000, battery: 98,
    price: 250000000, priceNew: 302000000,
    img: "images/cars/vf3.png", grad: ["#8a6a1d", "#4d3708"],
    status: "available",
    tags: ["Chính chủ Cần Thơ", "Bảo hành hãng đến 2031", "Sạc miễn phí V-Green"],
    desc: "Xe gia đình ít đi, còn như mới. Đã kiểm định 105 điểm tại xưởng, pin zin 98%, chưa đâm đụng, chưa ngập nước."
  },
  {
    id: "uc-minio-24",
    name: "VinFast Minio Green 2024",
    year: 2024, km: 8000, battery: 99,
    price: 215000000, priceNew: 269000000,
    img: "images/cars/minio.png", grad: ["#0e5c3a", "#083822"],
    status: "available",
    tags: ["1 chủ từ mới", "Odo chuẩn 8.000 km", "Hợp chạy dịch vụ"],
    desc: "Minio chạy thử dịch vụ 6 tháng, giữ gìn kỹ. Hoàn hảo cho người mới bắt đầu chạy xe điện dịch vụ nội ô."
  },
  {
    id: "uc-vf5-23",
    name: "VinFast VF 5 Plus 2023",
    year: 2023, km: 35000, battery: 95,
    price: 420000000, priceNew: 529000000,
    img: "images/cars/vf5.png", grad: ["#1d4ed8", "#172554"],
    status: "available",
    tags: ["Full bảo dưỡng hãng", "Đã dán PPF + phim 3M", "Bao test hãng/thợ"],
    desc: "VF 5 Plus bản đủ, lịch sử bảo dưỡng đầy đủ tại hãng, tặng kèm bộ phụ kiện đã lắp trị giá 15 triệu."
  },
  {
    id: "uc-vf6-23",
    name: "VinFast VF 6 Plus 2023",
    year: 2023, km: 25000, battery: 96,
    price: 585000000, priceNew: 765000000,
    img: "images/cars/vf6.png", grad: ["#0f766e", "#134e4a"],
    status: "deposit",
    tags: ["Bản Plus full ADAS", "Chính chủ nữ sử dụng", "Rẻ hơn xe mới 180 triệu"],
    desc: "VF 6 Plus màu đẹp, trang bị trợ lái đầy đủ. Xe đã có khách cọc — để lại thông tin để nhận xe tương tự."
  },
  {
    id: "uc-vf8-22",
    name: "VinFast VF 8 Eco 2022",
    year: 2022, km: 45000, battery: 92,
    price: 750000000, priceNew: 1200000000,
    img: "images/cars/vf8.png", grad: ["#334155", "#0f172a"],
    status: "available",
    tags: ["Rẻ hơn xe mới 450 triệu", "D-SUV rộng rãi", "Hỗ trợ góp 70%"],
    desc: "VF 8 Eco pin thuê đã chuyển đổi sở hữu pin. Xe doanh nhân đi kỹ, nội thất còn thơm mùi da."
  },
  {
    id: "uc-nerio-24",
    name: "VinFast Nerio Green 2024",
    year: 2024, km: 30000, battery: 94,
    price: 390000000, priceNew: 468000000,
    img: "images/cars/nerio.png", grad: ["#134e4a", "#042f2e"],
    status: "sold",
    tags: ["Xe dịch vụ hoàn vốn nhanh", "Đã bán — nhận đặt xe tương tự"],
    desc: "Đã bán trong 5 ngày. Dòng xe dịch vụ rất được săn đón — đăng ký nhận thông báo khi có xe về."
  }
];

// Cam kết khi mua xe cũ tại TimXeDien
const USED_COMMITS = [
  { icon: "🔬", title: "Kiểm định 105 điểm", desc: "Pin, động cơ, khung gầm, lịch sử va chạm — kiểm tra theo checklist chuẩn hãng, công khai kết quả." },
  { icon: "🔋", title: "Bảo hành pin 12 tháng", desc: "Cam kết dung lượng pin đúng công bố, bảo hành thêm 12 tháng cho pin & động cơ ngoài bảo hành hãng." },
  { icon: "🔄", title: "7 ngày đổi trả", desc: "Không ưng ý trong 7 ngày đầu / 300km — đổi xe khác hoặc hoàn tiền (trừ phí đăng ký nếu có)." },
  { icon: "📄", title: "Sang tên trọn gói", desc: "Lo toàn bộ công chứng, thuế phí, đăng ký biển số. Hỗ trợ trả góp tới 70% qua ngân hàng đối tác." }
];

// ---- PHỤ KIỆN XE ĐIỆN (trang phu-kien.html) ----
const ACCESSORY_CATS = [
  { id: "sac", label: "⚡ Sạc & thiết bị điện" },
  { id: "baove", label: "🛡️ Bảo vệ xe" },
  { id: "noithat", label: "🛋️ Nội thất & tiện nghi" },
  { id: "congnghe", label: "📷 Công nghệ" }
];

const ACCESSORIES = [
  { id: "pk-sacdiddong", cat: "sac", icon: "🔌", name: "Sạc di động 3,5kW", price: "3,5 – 6 triệu", desc: "Sạc mọi nơi có ổ điện gia đình. Vật bất ly thân cho chủ xe điện ở trọ, chung cư chưa có trạm." },
  { id: "pk-wallbox", cat: "sac", icon: "⚡", name: "Trụ sạc treo tường 7,4kW", price: "12 – 18 triệu (trọn gói lắp đặt)", desc: "Sạc đầy qua đêm nhanh gấp đôi. Khảo sát điện nhà miễn phí tại Cần Thơ, lắp trong 1 buổi." },
  { id: "pk-capsac", cat: "sac", icon: "🧵", name: "Cáp sạc & adapter dự phòng", price: "800k – 2,5 triệu", desc: "Cáp Type 2 các độ dài, adapter chuyển đổi — dự phòng khi đi tỉnh xa, về quê." },
  { id: "pk-ppf", cat: "baove", icon: "🛡️", name: "Dán PPF chống trầy toàn xe", price: "15 – 45 triệu", desc: "Phim bảo vệ sơn tự phục hồi vết xước nhẹ — giữ giá xe khi bán lại, hợp khí hậu nắng mưa Miền Tây." },
  { id: "pk-phim", cat: "baove", icon: "🕶️", name: "Phim cách nhiệt 3M / LLumar", price: "4 – 8 triệu", desc: "Giảm nóng rõ rệt, tiết kiệm pin điều hòa — món đáng tiền nhất cho xe điện xứ nóng." },
  { id: "pk-ceramic", cat: "baove", icon: "✨", name: "Phủ ceramic bóng sơn", price: "3 – 12 triệu", desc: "Bóng đẹp 2-3 năm, hạn chế ố nước mưa axít, dễ rửa xe. Thi công tại xưởng đối tác Cần Thơ." },
  { id: "pk-tham", cat: "noithat", icon: "🧩", name: "Thảm sàn 6D theo xe", price: "1,2 – 2,5 triệu", desc: "Cắt chuẩn theo từng dòng VinFast, chống nước — hợp mùa mưa và những chuyến về quê." },
  { id: "pk-bocghe", cat: "noithat", icon: "🛋️", name: "Bọc ghế da Nappa", price: "8 – 15 triệu", desc: "Nâng cấp nội thất như bản cao cấp, dễ vệ sinh khi chở trẻ nhỏ, chạy dịch vụ." },
  { id: "pk-gheem", cat: "noithat", icon: "👶", name: "Ghế an toàn trẻ em ISOFIX", price: "2 – 5 triệu", desc: "Chuẩn an toàn châu Âu, lắp khớp ISOFIX có sẵn trên xe VinFast. Tư vấn chọn theo tuổi bé." },
  { id: "pk-camera", cat: "congnghe", icon: "📷", name: "Camera hành trình trước–sau", price: "2 – 6 triệu", desc: "Ghi hình 2K/4K, xem lại qua app — bằng chứng va chạm, giám sát khi cho thuê lại xe." },
  { id: "pk-tpms", cat: "congnghe", icon: "🛞", name: "Cảm biến áp suất lốp TPMS", price: "1,5 – 3 triệu", desc: "Theo dõi lốp realtime — lốp non hơi làm hao pin đáng kể, món này hoàn vốn nhanh." },
  { id: "pk-bom", cat: "congnghe", icon: "💨", name: "Bơm lốp điện + bộ cứu hộ", price: "700k – 1,8 triệu", desc: "Bơm pin sạc, vá lốp khẩn cấp, đèn tín hiệu — bộ đồ nghề gọn cho mọi chuyến đi Miền Tây." }
];
