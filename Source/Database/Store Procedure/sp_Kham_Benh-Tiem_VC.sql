USE HAPPYPET_test
GO

-- 1. Bác sĩ điền thông tin chẩn đoán và ngày hẹn tái khám vào phiếu.
CREATE OR ALTER PROC sp_CapNhatKetQuaKham
    @MaPhieu NCHAR(10),
    @ChanDoan NVARCHAR(200),
    @NgayHenTaiKham DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    -- Check trạng thái DTH
    IF NOT EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu AND TrangThai = 'DTH')
    BEGIN
        RAISERROR(N'Lỗi: Phiếu không tồn tại hoặc trạng thái không hợp lệ (Phải đang thực hiện)!', 16, 1);
        RETURN;
    END

    -- Check xem phiếu này có phải là phiếu khám bệnh không (Hay là phiếu tiêm vaccine/mua hàng)
    IF NOT EXISTS (SELECT 1 FROM PHIEU_KHAM_BENH WHERE MaPhieu = @MaPhieu)
    BEGIN
        RAISERROR(N'Lỗi: Đây không phải là phiếu khám bệnh, không thể cập nhật chẩn đoán!', 16, 1);
        RETURN;
    END

    -- 2. UPDATE
    BEGIN TRY
        UPDATE PHIEU_KHAM_BENH
        SET ChanDoan = @ChanDoan,
            NgayHenTaiKham = @NgayHenTaiKham
        WHERE MaPhieu = @MaPhieu;
    END TRY
    BEGIN CATCH
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 2. Bác sĩ kê đơn thuốc
CREATE OR ALTER PROC sp_ThemThuocVaoDon
    @MaPhieu NCHAR(10),
    @MaThuoc NCHAR(10),
    @SoLuong INT,
    @LieuLuong NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- [BẮT BUỘC] Để rollback nếu lỗi update kho

    -- 1. VALIDATION
    IF @SoLuong <= 0
    BEGIN
        RAISERROR(N'Lỗi: Số lượng thuốc phải lớn hơn 0!', 16, 1);
        RETURN;
    END

    -- [FIX] Phải Check trạng thái phiếu là DTH mới cho thêm thuốc
    DECLARE @TrangThai VARCHAR(3);
    DECLARE @MaCN NCHAR(10);
    
    SELECT @TrangThai = TrangThai, @MaCN = MaCN 
    FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu;

    IF @MaCN IS NULL
    BEGIN
        RAISERROR(N'Lỗi: Phiếu dịch vụ không tồn tại!', 16, 1);
        RETURN;
    END

    IF @TrangThai <> 'DTH'
    BEGIN
        RAISERROR(N'Lỗi: Chỉ được kê thuốc khi phiếu đang trong quá trình khám (DTH)!', 16, 1);
        RETURN;
    END

    -- Kiểm tra Tồn kho
    DECLARE @TonKhoHienTai INT;
    SELECT @TonKhoHienTai = SoLuongTon FROM TON_KHO WHERE MaCN = @MaCN AND MaMatHang = @MaThuoc;

    IF ISNULL(@TonKhoHienTai, 0) < @SoLuong
    BEGIN
        RAISERROR(N'Lỗi: Kho không đủ thuốc (Tồn: %d)!', 16, 1, @TonKhoHienTai);
        RETURN;
    END

    -- Lấy Đơn giá
    DECLARE @DonGia DECIMAL(18,2);
    SELECT @DonGia = DonGia FROM THUOC WHERE MaThuoc = @MaThuoc;

    -- 2. THỰC HIỆN
    BEGIN TRANSACTION;
    BEGIN TRY
        -- B1: Trừ Kho
        UPDATE TON_KHO
        SET SoLuongTon = SoLuongTon - @SoLuong
        WHERE MaCN = @MaCN AND MaMatHang = @MaThuoc;

        -- B2: Thêm/Update chi tiết đơn thuốc
        IF EXISTS (SELECT 1 FROM CT_DON_THUOC WHERE MaPhieu = @MaPhieu AND MaThuoc = @MaThuoc)
        BEGIN
            UPDATE CT_DON_THUOC
            SET SoLuong = SoLuong + @SoLuong,
                ThanhTien = (SoLuong + @SoLuong) * @DonGia,
                LieuLuong = @LieuLuong
            WHERE MaPhieu = @MaPhieu AND MaThuoc = @MaThuoc;
        END
        ELSE
        BEGIN
            INSERT INTO CT_DON_THUOC (MaThuoc, MaPhieu, LieuLuong, SoLuong, ThanhTien)
            VALUES (@MaThuoc, @MaPhieu, @LieuLuong, @SoLuong, @SoLuong * @DonGia);
        END

        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 3. Xóa thuốc khỏi đơn
CREATE OR ALTER PROC sp_XoaThuocKhoiDon
    @MaPhieu NCHAR(10),
    @MaThuoc NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- [FIX] Check trạng thái
    DECLARE @TrangThai VARCHAR(3);
    DECLARE @MaCN NCHAR(10);
    SELECT @TrangThai = TrangThai, @MaCN = MaCN FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu;

    IF @TrangThai <> 'DTH'
    BEGIN
        RAISERROR(N'Lỗi: Không thể xóa thuốc khi phiếu đã kết thúc hoặc chưa bắt đầu!', 16, 1);
        RETURN;
    END

    -- Lấy số lượng đã kê
    DECLARE @SoLuongDaKe INT;
    SELECT @SoLuongDaKe = SoLuong FROM CT_DON_THUOC WHERE MaPhieu = @MaPhieu AND MaThuoc = @MaThuoc;

    IF @SoLuongDaKe IS NULL
    BEGIN
        RAISERROR(N'Lỗi: Thuốc này không có trong đơn!', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- B1: Xóa khỏi đơn
        DELETE FROM CT_DON_THUOC WHERE MaPhieu = @MaPhieu AND MaThuoc = @MaThuoc;

        -- B2: Hoàn kho
        UPDATE TON_KHO
        SET SoLuongTon = SoLuongTon + @SoLuongDaKe
        WHERE MaCN = @MaCN AND MaMatHang = @MaThuoc;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO

-- 4. Bác sĩ kết thúc khám 
CREATE OR ALTER PROC sp_BacSi_KetThucKham
    @MaPhieu NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    -- Chỉ được kết thúc khi phiếu đang ở trạng thái 'DTH' (Đang thực hiện)
    IF NOT EXISTS (SELECT 1 FROM PHIEU_DICH_VU WHERE MaPhieu = @MaPhieu AND TrangThai = 'DTH')
    BEGIN
        RAISERROR(N'Lỗi: Phiếu này chưa được check-in hoặc đã kết thúc rồi!', 16, 1);
        RETURN;
    END

    -- 2. UPDATE TRẠNG THÁI
    BEGIN TRY
        UPDATE PHIEU_DICH_VU
        SET TrangThai = 'DHT' -- Đánh dấu là Đã Hoàn Thành (về mặt chuyên môn)
        WHERE MaPhieu = @MaPhieu;
    END TRY
    BEGIN CATCH
        DECLARE @Err NVARCHAR(2000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END;
GO