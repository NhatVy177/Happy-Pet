// const { sql, config } = require('../config/db'); // Lấy cả sql và config


// const orderService = {
//     // Thêm hàm lấy danh sách chi nhánh
//     getBranches: async () => {
//         const response = await axios.get('http://localhost:5000/api/branches');
//         return response.data;
//     },

//     // 1. Tra cứu sản phẩm
//     searchProducts: async (tuKhoa, loaiMH) => {
//         await sql.connect(config); // Phải connect trước khi tạo request
//         const request = new sql.Request();
//         request.input('TuKhoa', sql.NVarChar, tuKhoa || null);
//         request.input('LoaiMH', sql.VarChar, loaiMH || null);
//         const result = await request.execute('sp_TraCuuSanPham');
//         return result.recordset;
//     },

//     // 1b. Tra cứu sản phẩm theo chi nhánh
//     searchProductsByBranch: async (maChiNhanh, tuKhoa, loaiMH) => {
//     await sql.connect(config);
//     const request = new sql.Request();
//     request.input('MaChiNhanh', sql.VarChar, maChiNhanh);
//     request.input('TuKhoa', sql.NVarChar, tuKhoa || null);
//     request.input('LoaiMH', sql.VarChar, loaiMH || null);

//     const result = await request.execute('sp_TraCuuSanPham_TheoChiNhanh');
//     return result.recordset;
//   },
//     // 2. Khởi tạo đơn hàng (Giỏ hàng)
//     initOrder: async (data) => {
//         await sql.connect(config); 
//         const request = new sql.Request();
//         request.input('MaKhachHang', sql.VarChar, data.maKhachHang);
//         request.input('MaChiNhanh', sql.VarChar, data.maChiNhanh);
//         request.input('DiaChiGiaoHang', sql.NVarChar, data.diaChiGiaoHang);
//         request.input('HinhThucThanhToan', sql.NVarChar, data.hinhThucThanhToan);
//         request.input('NgayMuonNhan', sql.Date, data.ngayMuonNhan);
        
//         const result = await request.execute('sp_KhoiTaoDonHangOnline');
//         return result.recordset[0]; 
//     },

//     // 3. Thêm sản phẩm vào đơn
//     addItemToOrder: async (maPhieu, maMatHang, soLuong) => {
//         await sql.connect(config);
//         const request = new sql.Request();
//         request.input('MaPhieu', sql.NChar, maPhieu);
//         request.input('MaMatHang', sql.NChar, maMatHang);
//         request.input('SoLuong', sql.Int, soLuong);
        
//         await request.execute('sp_ThemSanPhamVaoDon');
//         return { success: true };
//     },

//     // 4. Hoàn tất đơn hàng (Chốt đơn)
//     completeOrder: async (maPhieu, diemDung) => {
//         await sql.connect(config);
//         const request = new sql.Request();
//         request.input('MaPhieu', sql.NChar, maPhieu);
//         request.input('DiemMuonDung', sql.Int, diemDung || 0);
        
//         const result = await request.execute('sp_HoanTatDonHangOnline');
//         return result.recordset[0]; 
//     }
// };

// module.exports = orderService;


// const { sql, connectDB } = require('../config/db');

// /**
//  * Service xử lý nghiệp vụ đơn hàng và gọi các Stored Procedure
//  * Tất cả các hàm đều sử dụng pool từ connectDB() để đảm bảo không bị lỗi 'request of undefined'
//  */
// const orderService = {

//     // 1. Tra cứu sản phẩm tổng quát (Dùng cho nội bộ hoặc search chung)
//     searchProducts: async (tuKhoa, loaiMH) => {
//         const pool = await connectDB(); 
//         const result = await pool.request()
//             .input('TuKhoa', sql.NVarChar, tuKhoa || null)
//             .input('LoaiMH', sql.VarChar, loaiMH || null)
//             .execute('sp_TraCuuSanPham');
//         return result.recordset;
//     },

//     // 2. Tra cứu sản phẩm theo chi nhánh (Dùng cho Shop Online - Có check tồn kho và loại bỏ Vaccine/Thuốc kê đơn)
//     searchProductsByBranch: async (maChiNhanh, tuKhoa, loaiMH) => {
//         const pool = await connectDB();
//         const result = await pool.request()
//             .input('MaChiNhanh', sql.VarChar, maChiNhanh)
//             .input('TuKhoa', sql.NVarChar, tuKhoa || null)
//             .input('LoaiMH', sql.VarChar, loaiMH || null)
//             .execute('sp_TraCuuSanPham_TheoChiNhanh_Online'); // Sử dụng SP online mới của cậu
//         return result.recordset;
//     },

//     // 3. Khởi tạo đơn hàng mới (Khi giỏ hàng đang trống)
//     initOrder: async (data) => {
//         const pool = await connectDB();
//         const result = await pool.request()
//             .input('MaKhachHang', sql.VarChar, data.maKhachHang)
//             .input('MaChiNhanh', sql.VarChar, data.maChiNhanh)
//             .input('DiaChiGiaoHang', sql.NVarChar, data.diaChiGiaoHang)
//             .input('HinhThucThanhToan', sql.NVarChar, data.hinhThucThanhToan || 'Tiền mặt')
//             .input('NgayMuonNhan', sql.Date, data.ngayMuonNhan)
//             .execute('sp_KhoiTaoDonHangOnline');
//         return result.recordset[0]; 
//     },

//     // 4. Thêm sản phẩm vào đơn hàng
//     addItemToOrder: async (maPhieu, maMatHang, soLuong) => {
//         const pool = await connectDB();
//         await pool.request()
//             .input('MaPhieu', sql.NChar(10), maPhieu)
//             .input('MaMatHang', sql.NChar(10), maMatHang)
//             .input('SoLuong', sql.Int, soLuong || 1)
//             .execute('sp_ThemSanPhamVaoDon');
//         return { success: true };
//     },

//     // 5. Hoàn tất đơn hàng (Chốt đơn - Áp dụng giảm giá/điểm tích lũy)
//     completeOrder: async (maPhieu, diemDung) => {
//         const pool = await connectDB();
//         const result = await pool.request()
//             .input('MaPhieu', sql.NChar(10), maPhieu)
//             .input('DiemMuonDung', sql.Int, diemDung || 0)
//             .execute('sp_HoanTatDonHangOnline');
        
//         // Trả về object chứa { MaDonHang, TienHang, PhiShip, TongTienGiamGia, TongThanhToan }
//         return result.recordset[0]; 
//     },

//     // 6. Hủy đơn hàng Online (Trong vòng 120 phút)
//     cancelOrder: async (maPhieu) => {
//         const pool = await connectDB();
//         await pool.request()
//             .input('MaPhieu', sql.NChar(10), maPhieu)
//             .execute('sp_HuyDonOnline');
//         return { success: true };
//     }
// };

// module.exports = orderService;

const { sql, connectDB } = require('../config/db');

/**
 * Service xử lý nghiệp vụ đơn hàng và gọi các Stored Procedure
 * Tất cả các hàm đều sử dụng pool từ connectDB() để đảm bảo không bị lỗi 'request of undefined'
 */
const orderService = {

    // 1. Tra cứu sản phẩm tổng quát
    searchProducts: async (tuKhoa, loaiMH) => {
        const pool = await connectDB(); 
        const result = await pool.request()
            .input('TuKhoa', sql.NVarChar, tuKhoa || null)
            .input('LoaiMH', sql.VarChar, loaiMH || null)
            .execute('sp_TraCuuSanPham');
        return result.recordset;
    },

    // 2. Tra cứu sản phẩm theo chi nhánh
    searchProductsByBranch: async (maChiNhanh, tuKhoa, loaiMH) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('MaChiNhanh', sql.VarChar, maChiNhanh)
            .input('TuKhoa', sql.NVarChar, tuKhoa || null)
            .input('LoaiMH', sql.VarChar, loaiMH || null)
            .execute('sp_TraCuuSanPham_TheoChiNhanh_Online'); 
        return result.recordset;
    },

    // 3. Khởi tạo đơn hàng mới
    initOrder: async (data) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('MaKhachHang', sql.VarChar, data.maKhachHang)
            .input('MaChiNhanh', sql.VarChar, data.maChiNhanh)
            // Lưu ý: DiaChiGiaoHang và NgayMuonNhan lúc đầu tạo có thể để null hoặc tạm
            .input('DiaChiGiaoHang', sql.NVarChar, data.diaChiGiaoHang || null)
            .input('HinhThucThanhToan', sql.NVarChar, data.hinhThucThanhToan || 'Tiền mặt')
            .input('NgayMuonNhan', sql.Date, data.ngayMuonNhan || null)
            .execute('sp_KhoiTaoDonHangOnline');
        return result.recordset[0]; 
    },

    // 4. Thêm sản phẩm vào đơn hàng
    addItemToOrder: async (maPhieu, maMatHang, soLuong) => {
        const pool = await connectDB();
        await pool.request()
            .input('MaPhieu', sql.NChar(10), maPhieu)
            .input('MaMatHang', sql.NChar(10), maMatHang)
            .input('SoLuong', sql.Int, soLuong || 1)
            .execute('sp_ThemSanPhamVaoDon');
        return { success: true };
    },

    // 5. Hoàn tất đơn hàng (Chốt đơn)
    completeOrder: async (maPhieu, diemDung, ngayNhanHang, diaChi) => {
        const pool = await connectDB();
        const request = pool.request()
            .input('MaPhieu', sql.NChar(10), maPhieu)
            .input('DiemMuonDung', sql.Int, diemDung || 0);

        // --- CẬP NHẬT 2 BẢNG KHÁC NHAU ---
        if (ngayNhanHang || diaChi) {
             const updateQuery = `
                -- 1. Cập nhật Địa chỉ vào HD_TRUC_TUYEN
                UPDATE HD_TRUC_TUYEN
                SET DiaChiGiaoHang = @DiaChi
                WHERE MaPhieu = @MaPhieu;

                -- 2. Cập nhật Ngày nhận vào PHIEU_DICH_VU (cột TG_ThucHienDV)
                UPDATE PHIEU_DICH_VU
                SET TG_ThucHienDV = @NgayNhan
                WHERE MaPhieu = @MaPhieu;
             `;
             
             await pool.request()
                .input('MaPhieu', sql.NChar(10), maPhieu)
                .input('NgayNhan', sql.Date, ngayNhanHang || null) // Lưu vào TG_ThucHienDV
                .input('DiaChi', sql.NVarChar, diaChi || null)     // Lưu vào DiaChiGiaoHang
                .query(updateQuery);
        }
        
        // Sau đó chạy SP tính tiền như cũ
        const result = await request.execute('sp_HoanTatDonHangOnline');
        return result.recordset[0]; 
    },
    
    // 6. Hủy đơn hàng Online
    cancelOrder: async (maPhieu) => {
        const pool = await connectDB();
        await pool.request()
            .input('MaPhieu', sql.NChar(10), maPhieu)
            .execute('sp_HuyDonOnline');
        return { success: true };
    }
};

module.exports = orderService;