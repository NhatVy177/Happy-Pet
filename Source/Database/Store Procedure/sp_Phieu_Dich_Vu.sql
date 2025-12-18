USE HAPPYPET
GO

-- 1. Khách hàng đặt lịch hẹn qua web
CREATE OR ALTER PROC sp_DatLichHen
    @MaKH NCHAR(10),
    @MaTC NCHAR(10), 
    @MaCN NCHAR(10),
    @LoaiPhieu VARCHAR(2), 
    @NgayHen DATE,
    @GioHen TIME,           
    @TrieuChung NVARCHAR(200) = NULL 
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    -- 1. VALIDATION CƠ BẢN
    IF @LoaiPhieu NOT IN ('KB', 'TV')
    BEGIN
        RAISERROR(N'Lỗi: Loại phiếu không hợp lệ (Chỉ nhận KB hoặc TV)', 16, 1);
        RETURN;
    END

    IF @MaTC IS NULL
    BEGIN
        RAISERROR(N'Lỗi: Vui lòng chọn thú cưng cần khám hoặc tiêm phòng!', 16, 1);
        RETURN;
    END

    -- Check thời gian
    DECLARE @ThoiGianHen DATETIME = CAST(@NgayHen AS DATETIME) + CAST(@GioHen AS DATETIME);
    IF @ThoiGianHen < GETDATE()
    BEGIN
        RAISERROR(N'Lỗi: Thời gian hẹn không hợp lệ (Phải lớn hơn hiện tại)!', 16, 1);
        RETURN;
    END

    -- 2. CHECK GIỜ MỞ CỬA
    DECLARE @GioMoCua TIME, @GioDongCua TIME;
    SELECT @GioMoCua = Giomocua, @GioDongCua = Giodongcua 
    FROM CHI_NHANH WHERE MaCN = @MaCN;

    IF @GioHen < @GioMoCua OR @GioHen > @GioDongCua
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh không làm việc vào giờ này!', 16, 1);
        RETURN;
    END

	-- 3. KIỂM TRA DỊCH VỤ TẠI CHI NHÁNH
    IF @LoaiPhieu = 'KB' AND NOT EXISTS (
        SELECT 1 
        FROM DV_CN 
        WHERE MaCN = @MaCN AND MaLoaiDV = (SELECT MaLoaiDV FROM LOAI_DICH_VU WHERE MaLoaiDV='DV01')
    )
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh này không cung cấp dịch vụ Khám bệnh!', 16, 1);
        RETURN;
    END

    IF @LoaiPhieu = 'TV' AND NOT EXISTS (
        SELECT 1 
        FROM DV_CN 
        WHERE MaCN = @MaCN AND MaLoaiDV = (SELECT MaLoaiDV FROM LOAI_DICH_VU WHERE MaLoaiDV ='DV02')
    )
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh này không cung cấp dịch vụ Tiêm vaccine!', 16, 1);
        RETURN;
    END


    BEGIN TRANSACTION;
    BEGIN TRY
        -- 4. TẠO MÃ PHIẾU TỰ ĐỘNG (An toàn)
        DECLARE @MaPhieu NCHAR(10);
        DECLARE @HauTo INT;
        
        -- Thêm (UPDLOCK, HOLDLOCK) để tránh 2 người cùng lấy 1 số
        SELECT @HauTo = ISNULL(MAX(CAST(RIGHT(MaPhieu, 7) AS INT)), 0)
        FROM PHIEU_DICH_VU WITH (UPDLOCK, HOLDLOCK)
        WHERE LEFT(MaPhieu, 1) = 'P' AND ISNUMERIC(RIGHT(MaPhieu, 7)) = 1;

        SET @MaPhieu = 'P' + RIGHT('0000000' + CAST(@HauTo + 1 AS VARCHAR(7)), 7); 

		-- Vòng lặp while kiểm tra mã phiếu mới sinh có trùng với mã cũ không
		WHILE EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu)
		BEGIN
			SET @HauTo = @HauTo + 1;
			SET @MaPhieu = 'P' + RIGHT('0000000' + CAST(@HauTo AS VARCHAR(7)), 7);
		END
        -- 5. INSERT DỮ LIỆU
        -- Insert Bảng Cha
        INSERT INTO PHIEU_DICH_VU (MaPhieu, TG_ThucHienDV, TG_LapPhieu, TrangThai, LoaiPhieu, MaCN, MaNV, MaKH)
        VALUES (@MaPhieu, @ThoiGianHen, GETDATE(), 'DD', @LoaiPhieu, @MaCN, NULL, @MaKH);
        
        -- Insert Bảng Con
        IF @LoaiPhieu = 'KB'
        BEGIN
            INSERT INTO PHIEU_KHAM_BENH (MaPhieu, MaTC, TrieuChung, ChanDoan, NgayHenTaiKham)
            VALUES (@MaPhieu, @MaTC, ISNULL(@TrieuChung, N'Chưa rõ'), NULL, NULL);
        END
        ELSE IF @LoaiPhieu = 'TV'
        BEGIN
            INSERT INTO PHIEU_TIEM_VACCINE (MaPhieu, MaTC)
            VALUES (@MaPhieu, @MaTC);
        END

        COMMIT TRANSACTION;
        SELECT @MaPhieu AS MaPhieuMoi; 
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 2. Nhân viên tạo phiếu DV cho khách trực tiếp tại cửa hàng
CREATE OR ALTER PROC sp_TaoPhieuTrucTiep
    @MaKH NCHAR(10),
    @MaTC NCHAR(10) = NULL,
    @MaCN NCHAR(10),
    @MaNV NCHAR(10), 
    @LoaiPhieu VARCHAR(2), 
    @TrieuChung NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. VALIDATION
    IF (@LoaiPhieu IN ('KB', 'TV') AND @MaTC IS NULL)
    BEGIN
        RAISERROR(N'Lỗi: Vui lòng chọn thú cưng để tạo phiếu khám hoặc tiêm!', 16, 1);
        RETURN;
    END

    -- Check giờ mở cửa
    IF NOT EXISTS (
        SELECT 1 FROM CHI_NHANH 
        WHERE MaCN = @MaCN 
        AND CAST(GETDATE() AS TIME) BETWEEN Giomocua AND Giodongcua
    )
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh hiện đang đóng cửa!', 16, 1);
        RETURN;
    END


	IF @LoaiPhieu = 'KB' AND NOT EXISTS (
        SELECT 1 
        FROM DV_CN 
        WHERE MaCN = @MaCN AND MaLoaiDV = (SELECT MaLoaiDV FROM LOAI_DICH_VU WHERE MaLoaiDV='DV01')
    )
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh này không cung cấp dịch vụ Khám bệnh!', 16, 1);
        RETURN;
    END

    IF @LoaiPhieu = 'TV' AND NOT EXISTS (
        SELECT 1 
        FROM DV_CN 
        WHERE MaCN = @MaCN AND MaLoaiDV = (SELECT MaLoaiDV FROM LOAI_DICH_VU WHERE MaLoaiDV ='DV02')
    )
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh này không cung cấp dịch vụ Tiêm vaccine!', 16, 1);
        RETURN;
    END

	IF @LoaiPhieu = 'MH' AND NOT EXISTS (
        SELECT 1 
        FROM DV_CN 
        WHERE MaCN = @MaCN AND MaLoaiDV = (SELECT MaLoaiDV FROM LOAI_DICH_VU WHERE MaLoaiDV ='DV03')
    )
    BEGIN
        RAISERROR(N'Lỗi: Chi nhánh này không cung cấp dịch vụ Bán hàng!', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 2. TẠO MÃ PHIẾU
        DECLARE @MaPhieu NCHAR(10);
        DECLARE @HauTo INT;
        
        -- Locking
        SELECT @HauTo = ISNULL(MAX(CAST(RIGHT(MaPhieu, 7) AS INT)), 0)
        FROM PHIEU_DICH_VU WITH (UPDLOCK, HOLDLOCK)
        WHERE LEFT(MaPhieu, 1) = 'P' AND ISNUMERIC(RIGHT(MaPhieu, 7)) = 1;

        SET @MaPhieu = 'P' + RIGHT('0000000' + CAST(@HauTo + 1 AS VARCHAR(7)), 7);
		WHILE EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu)
		BEGIN
			SET @HauTo = @HauTo + 1;
			SET @MaPhieu = 'P' + RIGHT('0000000' + CAST(@HauTo AS VARCHAR(7)), 7);
		END
        -- 3. INSERT
        -- Với khách vãng lai, TG_ThucHienDV là thời điểm hiện tại
        INSERT INTO PHIEU_DICH_VU (MaPhieu, TG_ThucHienDV, TG_LapPhieu, TrangThai, LoaiPhieu, MaCN, MaNV, MaKH)
        VALUES (@MaPhieu, GETDATE(), GETDATE(), 'DD', @LoaiPhieu, @MaCN, @MaNV, @MaKH);
        
        -- Insert Bảng con
        IF @LoaiPhieu = 'KB'
        BEGIN
             INSERT INTO PHIEU_KHAM_BENH (MaPhieu, MaTC, TrieuChung) 
             VALUES (@MaPhieu, @MaTC, ISNULL(@TrieuChung, N'Khám trực tiếp'));
        END
        ELSE IF @LoaiPhieu = 'TV'
        BEGIN
             INSERT INTO PHIEU_TIEM_VACCINE (MaPhieu, MaTC) 
             VALUES (@MaPhieu, @MaTC);
        END
        ELSE IF @LoaiPhieu = 'MH'
        BEGIN
             INSERT INTO PHIEU_MUA_HANG (MaPhieu) VALUES (@MaPhieu);
        END

        COMMIT TRANSACTION;
        SELECT @MaPhieu AS MaPhieuMoi;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 3. Nhân viên check in khi khách (đã đặt lịch trước) tới cửa hàng, gán bác sĩ phụ trách
CREATE OR ALTER PROC sp_CheckInKhachHang
    @MaPhieu NCHAR(10),
    @MaNV_PhuTrach NCHAR(10) -- Bác sĩ hoặc NV thực hiện dịch vụ
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- [FIX]

    -- 1. VALIDATION
    IF NOT EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu AND TrangThai = 'DD')
    BEGIN
        RAISERROR(N'Lỗi: Phiếu không tồn tại hoặc trạng thái không hợp lệ (Phải là Đã đặt)!', 16, 1);
        RETURN;
    END

    -- Check Nhân viên đúng chi nhánh
    DECLARE @MaCN_Phieu NCHAR(10);
    SELECT @MaCN_Phieu = MaCN FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu;

    IF NOT EXISTS (SELECT 1 FROM NHAN_VIEN WHERE MaNV = @MaNV_PhuTrach AND MaCN = @MaCN_Phieu)
    BEGIN
        RAISERROR(N'Lỗi: Nhân viên phụ trách không thuộc chi nhánh của phiếu dịch vụ này!', 16, 1);
        RETURN;
    END

    -- 2. UPDATE & INSERT INVOICE
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Không update TG_ThucHienDV để giữ lại giờ hẹn gốc
        UPDATE PHIEU_DICH_VU
        SET TrangThai = 'DTH',        -- Chuyển sang Đang thực hiện
            MaNV = @MaNV_PhuTrach     -- Gán bác sĩ
        WHERE MaPhieu = @MaPhieu;

        -- Tạo Hóa Đơn Trực Tiếp ngay lúc Check-in
        -- Để sau này bác sĩ kê đơn thuốc/dịch vụ thì có chỗ mà lưu tiền
        IF NOT EXISTS (SELECT 1 FROM HD_TRUC_TIEP WHERE MaPhieu = @MaPhieu)
        BEGIN
            INSERT INTO HD_TRUC_TIEP (
                MaPhieu, 
                TongThanhTien, 
                KhuyenMai, 
                DiemQuyDoi, 
                TongThanhTienSC, 
                PhuongThucTT, 
                MaNV
            )
            VALUES (
                @MaPhieu, 
                0, -- Tiền ban đầu = 0
                0, 
                0, 
                0, 
                N'Tiền mặt', -- Mặc định, sẽ update khi thanh toán sau
                @MaNV_PhuTrach
            );
        END

        COMMIT TRANSACTION;
        -- PRINT N'Check-in thành công. Đã tạo hóa đơn rỗng.';
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 4. Khách hàng hủy lịch hẹn qua web
CREATE OR ALTER PROC sp_HuyLichHen
    @MaPhieu NCHAR(10),
    @MaKH NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    -- Check phiếu có thuộc về khách hàng này không
    IF NOT EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu AND MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Phiếu không tồn tại hoặc bạn không có quyền hủy phiếu này!', 16, 1);
        RETURN;
    END

    -- Check trạng thái
    IF EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu AND TrangThai <> 'DD')
    BEGIN
        RAISERROR(N'Lỗi: Không thể hủy phiếu đang thực hiện hoặc đã hoàn thành!', 16, 1);
        RETURN;
    END

    -- 2. UPDATE
    BEGIN TRY
        UPDATE PHIEU_DICH_VU
        SET TrangThai = 'DH' -- Đã hủy
        WHERE MaPhieu = @MaPhieu;
        
        -- PRINT N'Hủy lịch hẹn thành công.';
    END TRY
    BEGIN CATCH
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 5. Phiếu tự động hủy khi quá giờ hẹn 120ph mà phiếu chưa được check in
CREATE OR ALTER PROC sp_TuDongHuyLichHen
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SoLuongHuy INT;

    -- Đếm số lượng phiếu sắp hủy (để báo cáo nếu cần)
    -- Điều kiện: Trạng thái = 'DD' VÀ Thời gian hẹn < (Hiện tại - 120 phút)
    SELECT @SoLuongHuy = COUNT(*)
    FROM PHIEU_DICH_VU
    WHERE TrangThai = 'DD' 
      AND TG_ThucHienDV < DATEADD(MINUTE, -120, GETDATE());

    BEGIN TRY
        -- Thực hiện Update hàng loạt
        UPDATE PHIEU_DICH_VU
        SET TrangThai = 'DH' -- Chuyển thành Đã Hủy
        WHERE TrangThai = 'DD' 
          AND TG_ThucHienDV < DATEADD(MINUTE, -120, GETDATE());

        -- Trả về số lượng đã hủy để log hệ thống biết
        SELECT @SoLuongHuy AS SoPhieuDaHuyTuDong;
    END TRY
    BEGIN CATCH
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 6. Nhân viên xác nhận phiếu đã hoàn tất sau khi khách hàng thực hiện xong
CREATE OR ALTER PROC sp_HoanTatDichVu
    @MaPhieu NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    -- Chỉ được hoàn tất khi phiếu đang ở trạng thái 'DTH' (Đang thực hiện)
    IF NOT EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu AND TrangThai = 'DTH')
    BEGIN
        RAISERROR(N'Lỗi: Phiếu chưa được Check-in hoặc đã hoàn tất trước đó!', 16, 1);
        RETURN;
    END

    -- 2. UPDATE
    BEGIN TRY
        UPDATE PHIEU_DICH_VU
        SET TrangThai = 'DHT' -- Đã hoàn thành
        WHERE MaPhieu = @MaPhieu;

        -- PRINT N'Xác nhận hoàn tất dịch vụ.';
    END TRY
    BEGIN CATCH
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO