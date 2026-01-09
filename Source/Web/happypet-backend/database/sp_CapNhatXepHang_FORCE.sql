USE HAPPYPET
GO

-- 🔥 PHIÊN BẢN FORCE: Bỏ check ngày, chạy được bất cứ lúc nào (dùng cho test/fix data)
CREATE OR ALTER PROC sp_CapNhatXepHang_FORCE
    @Nam INT -- Năm cần xếp hạng (Ví dụ: 2025)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    PRINT N'⚠️ ĐANG CHẠY CHẾ ĐỘ FORCE - BỎ QUA CHECK NGÀY 31/12'
    PRINT N'📅 Xếp hạng cho năm: ' + CAST(@Nam AS NVARCHAR(4))

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
        -- Xóa dữ liệu CỦA NĂM NAY (nếu lỡ đã chạy trước đó)
        DELETE FROM XEP_HANG_NAM WHERE Nam = @Nam;
        PRINT N'🗑️ Đã xóa dữ liệu cũ năm ' + CAST(@Nam AS NVARCHAR(4))

        -- Insert dữ liệu mới
        INSERT INTO XEP_HANG_NAM (MaKH, MaHang, Nam, TongChiTieu, NgayCapNhat)
        SELECT 
            MaKH, 
            MaHangMoi, 
            @Nam, 
            TongTienNamNay, 
            GETDATE()
        FROM @BangXepHangMoi;

        DECLARE @SoKhachDaXepHang INT = @@ROWCOUNT;
        PRINT N'✅ Đã xếp hạng cho ' + CAST(@SoKhachDaXepHang AS NVARCHAR(10)) + N' khách hàng'

        COMMIT TRANSACTION;
        
        -- In kết quả kiểm tra
        PRINT N''
        PRINT N'📊 KẾT QUẢ XẾP HẠNG NĂM ' + CAST(@Nam AS NVARCHAR(4)) + ':'
        SELECT 
            XHN.MaHang,
            HTV.TenHang,
            COUNT(*) AS SoLuongKhach
        FROM XEP_HANG_NAM XHN
        JOIN HANG_TV HTV ON XHN.MaHang = HTV.MaHang
        WHERE XHN.Nam = @Nam
        GROUP BY XHN.MaHang, HTV.TenHang
        ORDER BY XHN.MaHang;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

PRINT N'✅ Đã tạo SP sp_CapNhatXepHang_FORCE (không check ngày)'
PRINT N'💡 Sử dụng: EXEC sp_CapNhatXepHang_FORCE 2025'
GO
