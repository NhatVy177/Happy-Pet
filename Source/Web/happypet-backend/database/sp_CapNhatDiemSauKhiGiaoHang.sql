USE HAPPYPET
GO

-- 🔥 SP CẬP NHẬT ĐIỂM SAU KHI GIAO HÀNG THÀNH CÔNG
-- Gọi khi nhân viên nhấn "Đã nhận hàng" (DTH → HT)
CREATE OR ALTER PROC sp_CapNhatDiemSauKhiGiaoHang
    @MaHD NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @MaKH NCHAR(10);
    DECLARE @TongTien DECIMAL(18, 2);
    DECLARE @DiemCong INT;
    DECLARE @DiemHienTai INT;
    
    -- 1. Lấy thông tin khách hàng và tổng tiền từ hóa đơn
    SELECT 
        @MaKH = P.MaKH,
        @TongTien = H.TongTien
    FROM HOA_DON H
    JOIN PHIEU_DICH_VU P ON H.MaPhieu = P.MaPhieu
    WHERE H.MaHoaDon = @MaHD;
    
    IF @MaKH IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy khách hàng cho hóa đơn này!', 16, 1);
        RETURN;
    END
    
    -- 2. Tính điểm được cộng (1 điểm = 50.000đ)
    SET @DiemCong = FLOOR(@TongTien / 50000);
    
    -- 3. Cộng điểm vào tài khoản khách hàng
    UPDATE KHACH_HANG
    SET TongDiemTichLuy = ISNULL(TongDiemTichLuy, 0) + @DiemCong
    WHERE MaKH = @MaKH;
    
    -- 4. Lấy điểm sau khi cộng
    SELECT @DiemHienTai = TongDiemTichLuy FROM KHACH_HANG WHERE MaKH = @MaKH;
    
    -- 5. Trả về thông báo
    SELECT 
        @MaKH AS MaKhachHang,
        @TongTien AS TongTienDonHang,
        @DiemCong AS DiemDuocCong,
        @DiemHienTai AS DiemConLai,
        N'Đã cộng ' + CAST(@DiemCong AS NVARCHAR(10)) + N' điểm cho khách hàng!' AS Message;
END;
GO

PRINT N'✅ Đã tạo sp_CapNhatDiemSauKhiGiaoHang - Cộng điểm sau khi giao hàng'
GO

-- TEST CASE
-- EXEC sp_CapNhatDiemSauKhiGiaoHang @MaHD = 'P0110261'
