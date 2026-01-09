USE HAPPYPET
GO

-- 7. Khách hàng xem thông tin cá nhân
CREATE OR ALTER PROC sp_XemThongTinCaNhan
    @MaKH NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION: Kiểm tra khách hàng có tồn tại ko
    IF NOT EXISTS (SELECT 1 FROM KHACH_HANG WHERE MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Mã khách hàng không tồn tại!', 16, 1);
        RETURN;
    END

    -- 2. TRUY VẤN THÔNG TIN
    SELECT 
        -- Thông tin cơ bản
        U.MaUser AS MaKhachHang,
        U.HoTen,
        TK.TenDangNhap,
        U.NgaySinh,
        U.GioiTinh,
        KH.SDT,
        KH.Email,
        KH.CCCD,
        
        -- Thông tin điểm tích lũy hiện tại
        ISNULL(KH.TongDiemTichLuy, 0) AS DiemTichLuy,

        -- 🔥 FIX: Lấy hạng từ năm GẦN NHẤT (không nhất thiết phải năm ngoái)
        -- Vì có thể chưa chốt năm ngoái, hoặc data test có năm khác
        ISNULL(HTV.TenHang, N'Thành viên mới') AS HangThanhVien,
        ISNULL(HTV.MaHang, 'C01') AS MaHang,
        ISNULL(HTV.KhuyenMaiUuTien, 0) AS GiamGiaThanhVien,  -- 🔥 THÊM % giảm giá
        
        -- Hiển thị mức chi tiêu đã chốt
        ISNULL(XHN.TongChiTieu, 0) AS TongChiTieuNamNgoai

    FROM KHACH_HANG KH
    JOIN [USER] U ON KH.MaKH = U.MaUser
    JOIN TAI_KHOAN TK ON KH.MaKH = TK.MaUser
    
    -- 🔥 LEFT JOIN với subquery lấy XẾP HẠNG NĂM GẦN NHẤT
    LEFT JOIN (
        SELECT TOP 1 MaKH, MaHang, TongChiTieu, Nam
        FROM XEP_HANG_NAM
        WHERE MaKH = @MaKH
        ORDER BY Nam DESC  -- Lấy năm mới nhất
    ) XHN ON KH.MaKH = XHN.MaKH
    
    -- LEFT JOIN bảng tên hạng để lấy tên hiển thị
    LEFT JOIN HANG_TV HTV ON XHN.MaHang = HTV.MaHang

    WHERE KH.MaKH = @MaKH;
END;
GO

PRINT N'✅ Đã fix sp_XemThongTinCaNhan - Lấy hạng từ năm gần nhất'
GO
