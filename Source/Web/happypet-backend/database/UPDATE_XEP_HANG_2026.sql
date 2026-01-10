USE HAPPYPET
GO

-- CẬP NHẬT XẾP HẠNG HỘI VIÊN NĂM 2026 (BỎ CHECK NGÀY 31/12)
-- Chạy script này để update xếp hạng cho khách hàng năm 2026

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Nam INT = 2026;

PRINT N'🔄 Bắt đầu cập nhật xếp hạng hội viên năm ' + CAST(@Nam AS NVARCHAR(10));

-- =========================================================
-- 1. BẢNG TẠM TÍNH TỔNG CHI TIÊU
-- =========================================================
DECLARE @BangChiTieu TABLE (
    MaKH NCHAR(10), 
    TongTien DECIMAL(18,2)
);

INSERT INTO @BangChiTieu (MaKH, TongTien)
SELECT 
    KH.MaKH,
    ISNULL(SUM(DonHang.ThanhTien), 0) AS TongTien
FROM KHACH_HANG KH
LEFT JOIN (
    -- Doanh thu offline
    SELECT P.MaKH, HD.TongThanhTienSC AS ThanhTien
    FROM PHIEU_DICH_VU P
    JOIN HD_TRUC_TIEP HD ON P.MaPhieu = HD.MaPhieu
    WHERE YEAR(P.TG_ThucHienDV) = @Nam AND P.TrangThai = 'DHT'
    
    UNION ALL
    
    -- Doanh thu online
    SELECT P.MaKH, HDO.TongThanhTienSC AS ThanhTien
    FROM PHIEU_DICH_VU P
    JOIN HD_TRUC_TUYEN HDO ON P.MaPhieu = HDO.MaPhieu
    WHERE YEAR(P.TG_ThucHienDV) = @Nam AND P.TrangThai = 'DHT'
) AS DonHang ON KH.MaKH = DonHang.MaKH
GROUP BY KH.MaKH;

DECLARE @SoKhach INT = (SELECT COUNT(*) FROM @BangChiTieu);
PRINT N'✅ Đã tính tổng chi tiêu của ' + CAST(@SoKhach AS NVARCHAR(10)) + N' khách hàng';

-- =========================================================
-- 2. TÍNH TOÁN HẠNG MỚI
-- =========================================================
DECLARE @BangXepHangMoi TABLE (
    MaKH NCHAR(10),
    MaHangMoi VARCHAR(10),
    TongTienNamNay DECIMAL(18,2)
);

INSERT INTO @BangXepHangMoi (MaKH, MaHangMoi, TongTienNamNay)
SELECT 
    CT.MaKH,
    CASE 
        -- LOGIC 1: C03 (VIP)
        -- Lên thẳng nếu chi >= 12tr HOẶC Giữ hạng nếu cũ là C03 và chi >= 8tr
        WHEN CT.TongTien >= 12000000 THEN 'C03'
        WHEN XH_Cu.MaHang = 'C03' AND CT.TongTien >= 8000000 THEN 'C03'

        -- LOGIC 2: C02 (Thân thiết)
        -- Lên hạng nếu chi >= 5tr HOẶC Giữ hạng nếu cũ là C02 và chi >= 3tr
        WHEN CT.TongTien >= 5000000 THEN 'C02'
        WHEN XH_Cu.MaHang = 'C02' AND CT.TongTien >= 3000000 THEN 'C02'

        -- LOGIC 3: C01 (Cơ bản)
        ELSE 'C01'
    END AS MaHangMoi,
    CT.TongTien
FROM @BangChiTieu CT
LEFT JOIN XEP_HANG_NAM XH_Cu ON CT.MaKH = XH_Cu.MaKH AND XH_Cu.Nam = @Nam - 1;

PRINT N'✅ Đã tính hạng mới cho khách hàng';

-- =========================================================
-- 3. GHI VÀO BẢNG XEP_HANG_NAM
-- =========================================================
BEGIN TRANSACTION;

    -- Xóa dữ liệu cũ nếu có
    DELETE FROM XEP_HANG_NAM WHERE Nam = @Nam;
    
    PRINT N'🗑️ Đã xóa dữ liệu xếp hạng cũ năm ' + CAST(@Nam AS NVARCHAR(10));

    -- Insert dữ liệu mới
    INSERT INTO XEP_HANG_NAM (MaKH, Nam, MaHang, TongChiTieu, NgayCapNhat)
    SELECT 
        MaKH, 
        @Nam, 
        MaHangMoi, 
        TongTienNamNay, 
        GETDATE()
    FROM @BangXepHangMoi;

    DECLARE @SoBanGhi INT = @@ROWCOUNT;
    PRINT N'✅ Đã thêm ' + CAST(@SoBanGhi AS NVARCHAR(10)) + N' bản ghi xếp hạng mới';

COMMIT TRANSACTION;

-- =========================================================
-- 4. HIỂN THỊ KẾT QUẢ
-- =========================================================
PRINT N'';
PRINT N'📊 THỐNG KÊ XẾP HẠNG NĂM ' + CAST(@Nam AS NVARCHAR(10));
PRINT N'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT 
    H.TenHang,
    H.KhuyenMaiUuTien AS [Giảm giá %],
    COUNT(XH.MaKH) AS [Số lượng khách]
FROM HANG_TV H
LEFT JOIN XEP_HANG_NAM XH ON H.MaHang = XH.MaHang AND XH.Nam = @Nam
GROUP BY H.MaHang, H.TenHang, H.KhuyenMaiUuTien
ORDER BY H.KhuyenMaiUuTien ASC;

PRINT N'';
PRINT N'🎉 HOÀN TẤT CẬP NHẬT XẾP HẠNG HỘI VIÊN NĂM ' + CAST(@Nam AS NVARCHAR(10));
GO
