USE HAPPYPET
GO

-- SỬA LẠI SP BỎ CHECK NGÀY 31/12
CREATE OR ALTER PROC sp_CapNhatXepHangHoiVien
    @Nam INT -- Năm cần xếp hạng (Ví dụ: 2026)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- =========================================================
    -- 🔥 ĐÃ BỎ LOGIC BẢO VỆ NGÀY 31/12 - CÓ THỂ CHẠY BẤT CỨ LÚC NÀO
    -- =========================================================
    
    PRINT N'🔄 Bắt đầu cập nhật xếp hạng năm ' + CAST(@Nam AS NVARCHAR(10));

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
            WHEN CT.TongTien >= 12000000 THEN 'C03'
            WHEN XH_Cu.MaHang = 'C03' AND CT.TongTien >= 8000000 THEN 'C03'

            -- LOGIC 2: C02 (Thân thiết)
            WHEN CT.TongTien >= 5000000 THEN 'C02'
            WHEN XH_Cu.MaHang = 'C02' AND CT.TongTien >= 3000000 THEN 'C02'

            -- LOGIC 3: C01 (Cơ bản)
            ELSE 'C01'
        END AS MaHangMoi,
        CT.TongTien
    FROM @BangChiTieu CT
    LEFT JOIN XEP_HANG_NAM XH_Cu 
        ON CT.MaKH = XH_Cu.MaKH AND XH_Cu.Nam = (@Nam - 1);

    -- =========================================================
    -- 3. CẬP NHẬT VÀO DATABASE
    -- =========================================================
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Xóa dữ liệu năm này (nếu đã có)
        DELETE FROM XEP_HANG_NAM WHERE Nam = @Nam;

        -- Insert dữ liệu mới
        INSERT INTO XEP_HANG_NAM (MaKH, MaHang, Nam, TongChiTieu, NgayCapNhat)
        SELECT 
            MaKH, 
            MaHangMoi, 
            @Nam, 
            TongTienNamNay, 
            GETDATE()
        FROM @BangXepHangMoi;

        COMMIT TRANSACTION;
        
        PRINT N'✅ Cập nhật xếp hạng thành công cho năm ' + CAST(@Nam AS NVARCHAR(4));
        
        -- In kết quả
        SELECT MaHang, COUNT(*) AS SoLuongKhach
        FROM XEP_HANG_NAM 
        WHERE Nam = @Nam
        GROUP BY MaHang
        ORDER BY MaHang;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

PRINT N'🔧 Đã sửa SP - giờ có thể chạy bất cứ lúc nào!';
PRINT N'';
PRINT N'📝 Để cập nhật xếp hạng năm 2026, chạy:';
PRINT N'   EXEC sp_CapNhatXepHangHoiVien @Nam = 2026';
GO

-- CHẠY LUÔN CHO NĂM 2026
EXEC sp_CapNhatXepHangHoiVien @Nam = 2026;
GO
