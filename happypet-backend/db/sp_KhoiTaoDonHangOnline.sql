CREATE OR ALTER PROC sp_KhoiTaoDonHangOnline
    @MaKhachHang VARCHAR(10),
    @MaChiNhanh VARCHAR(10),
    @DiaChiGiaoHang NVARCHAR(200),
    @HinhThucThanhToan NVARCHAR(20),
    @NgayMuonNhan DATETIMEOFFSET
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validate: require at least 24 hours (use seconds + small tolerance to avoid rounding issues)
        DECLARE @SecondsDiff INT = DATEDIFF(SECOND, SYSUTCDATETIME(), SWITCHOFFSET(@NgayMuonNhan, '+00:00'));
        IF @SecondsDiff < (24 * 60 * 60 - 30)  -- allow 30s tolerance
        BEGIN
            RAISERROR(N'Lỗi: Ngày nhận hàng phải cách hiện tại ít nhất 24 giờ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Tính số ngày theo ngày calendar để quyết định phí
        DECLARE @SoNgayCho INT;
        SET @SoNgayCho = DATEDIFF(DAY, CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AS DATE), CAST(SWITCHOFFSET(@NgayMuonNhan, '+00:00') AS DATE));

        IF @SoNgayCho < 1
        BEGIN
             RAISERROR(N'Lỗi: Ngày nhận hàng phải sau ngày đặt ít nhất 1 ngày.', 16, 1);
             ROLLBACK TRANSACTION;
             RETURN;
        END

        DECLARE @PhiGiaoHang DECIMAL(18,2);
        IF @SoNgayCho = 1 SET @PhiGiaoHang = 35000;
        ELSE IF @SoNgayCho = 2 SET @PhiGiaoHang = 25000;
        ELSE SET @PhiGiaoHang = 15000;

        -- KIỂM TRA ĐỊA LÝ
        DECLARE @DiaChiChiNhanh NVARCHAR(200) = '';
        SELECT @DiaChiChiNhanh = ISNULL(DiaChi, N'') FROM CHI_NHANH WHERE MaCN = @MaChiNhanh;

        DECLARE @KhuVucChiNhanh NVARCHAR(50) = N'';
        IF @DiaChiChiNhanh COLLATE Latin1_General_CI_AI LIKE N'%Hồ Chí Minh%' COLLATE Latin1_General_CI_AI SET @KhuVucChiNhanh = N'Hồ Chí Minh';
        ELSE IF @DiaChiChiNhanh COLLATE Latin1_General_CI_AI LIKE N'%Cần Thơ%' COLLATE Latin1_General_CI_AI SET @KhuVucChiNhanh = N'Cần Thơ';
        ELSE IF @DiaChiChiNhanh COLLATE Latin1_General_CI_AI LIKE N'%Hà Nội%' COLLATE Latin1_General_CI_AI SET @KhuVucChiNhanh = N'Hà Nội';
        ELSE IF @DiaChiChiNhanh COLLATE Latin1_General_CI_AI LIKE N'%Đà Nẵng%' COLLATE Latin1_General_CI_AI SET @KhuVucChiNhanh = N'Đà Nẵng';
        ELSE IF @DiaChiChiNhanh COLLATE Latin1_General_CI_AI LIKE N'%Bình Dương%' COLLATE Latin1_General_CI_AI SET @KhuVucChiNhanh = N'Bình Dương';

        IF @KhuVucChiNhanh = N'' OR (@DiaChiGiaoHang COLLATE Latin1_General_CI_AI NOT LIKE N'%' + @KhuVucChiNhanh + N'%' COLLATE Latin1_General_CI_AI)
        BEGIN
            RAISERROR(N'Lỗi: Chi nhánh chỉ giao nội thành cùng khu vực.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- SINH MÃ PHIẾU
        DECLARE @MaxMaPhieu VARCHAR(10);
        DECLARE @NextID INT;
        DECLARE @MaPhieuMoi NCHAR(10);

        SELECT @MaxMaPhieu = MAX(MaPhieu) FROM PHIEU_DICH_VU WHERE MaPhieu LIKE 'P%';

        IF @MaxMaPhieu IS NULL
            SET @NextID = 1;
        ELSE
            SET @NextID = CAST(SUBSTRING(@MaxMaPhieu, 2, 7) AS INT) + 1;

        SET @MaPhieuMoi = 'P' + RIGHT('0000000' + CAST(@NextID AS VARCHAR(7)), 7);

        -- INSERT
        INSERT INTO PHIEU_DICH_VU (MaPhieu, TG_ThucHienDV, TG_LapPhieu, TrangThai, LoaiPhieu, MaCN, MaNV, MaKH)
        VALUES (@MaPhieuMoi, @NgayMuonNhan, GETDATE(), 'DD', 'MH', @MaChiNhanh, NULL, @MaKhachHang);

        INSERT INTO HD_TRUC_TUYEN (MaPhieu, TongThanhTien, KhuyenMai, DiemQuyDoi, TongThanhTienSC, PhuongThucTT, DiaChiGiaoHang, PhiGiaoHang, TrangThaiHD)
        VALUES (@MaPhieuMoi, 0, 0, 0, 0, @HinhThucThanhToan, @DiaChiGiaoHang, @PhiGiaoHang, 'DTT');

        INSERT INTO PHIEU_MUA_HANG (MaPhieu) VALUES (@MaPhieuMoi);

        COMMIT TRANSACTION;

        SELECT @MaPhieuMoi AS MaPhieu, @PhiGiaoHang AS PhiVanChuyen;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO
