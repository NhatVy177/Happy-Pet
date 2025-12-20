USE HAPPYPET
GO

-- 1. Đăng ký tài khoản cho khách hàng
-- Thêm phần liên kết với hồ sơ cũ
CREATE OR ALTER PROC sp_DangKyTaiKhoanKH
    @TenDangNhap VARCHAR(30),
    @MatKhau VARCHAR(70),
    @HoTen NVARCHAR(50),
    @NgaySinh DATE,
    @GioiTinh NVARCHAR(3),
    @SDT VARCHAR(10),
    @Email VARCHAR(50) = NULL,
    @CCCD CHAR(12) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Xử lý NULL cho chuỗi rỗng
    IF @Email = '' SET @Email = NULL;
    IF @CCCD = '' SET @CCCD = NULL;

    -- 1. VALIDATION (Kiểm tra dữ liệu đầu vào)
    
    -- Check định dạng SĐT
    IF LEN(@SDT) <> 10 OR LEFT(@SDT, 1) <> '0' OR @SDT LIKE '%[^0-9]%'
    BEGIN
        RAISERROR(N'Lỗi: Số điện thoại không đúng định dạng!', 16, 1);
        RETURN;
    END

    -- Check định dạng CCCD
    IF @CCCD IS NOT NULL
    BEGIN
        IF LEN(@CCCD) <> 12 OR LEFT(@CCCD, 1) <> '0' OR @CCCD LIKE '%[^0-9]%'
        BEGIN
            RAISERROR(N'Lỗi: CCCD phải có 12 số, bắt đầu bằng số 0 và không có ký tự chữ!', 16, 1);
            RETURN;
        END
    END

    -- Check trùng Tên đăng nhập (Bắt buộc duy nhất)
    IF EXISTS (SELECT 1 FROM TAI_KHOAN WHERE TenDangNhap = @TenDangNhap)
    BEGIN
        RAISERROR(N'Lỗi: Tên đăng nhập đã tồn tại!', 16, 1);
        RETURN;
    END

    -- Check trùng Email (Trừ trường hợp chính khách hàng đó đang cập nhật)
    IF @Email IS NOT NULL AND EXISTS (
        SELECT 1 FROM KHACH_HANG 
        WHERE Email = @Email AND SDT <> @SDT -- Khác SĐT nghĩa là của người khác
    )
    BEGIN
        RAISERROR(N'Lỗi: Email này đã được người khác sử dụng!', 16, 1);
        RETURN;
    END

    -- 2. XỬ LÝ LOGIC CRM (KHỚP HỒ SƠ)

    DECLARE @MaUserExisting NCHAR(10) = NULL;

    -- Kiểm tra xem SĐT này đã có trong bảng KHACH_HANG chưa?
    SELECT @MaUserExisting = MaKH FROM KHACH_HANG WHERE SDT = @SDT;

    BEGIN TRANSACTION;
    BEGIN TRY
        
        -- TRƯỜNG HỢP 1: KHÁCH ĐÃ TỪNG ĐẾN QUÁN (SĐT ĐÃ CÓ)
        IF @MaUserExisting IS NOT NULL
        BEGIN
            -- Kiểm tra xem khách này đã có tài khoản online chưa?
            IF EXISTS (SELECT 1 FROM TAI_KHOAN WHERE MaUser = @MaUserExisting)
            BEGIN
                -- Nếu có rồi thì báo lỗi
                RAISERROR(N'Lỗi: Số điện thoại này đã được đăng ký tài khoản rồi!', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END

            -- Nếu chưa có tài khoản online -> THỰC HIỆN CẬP NHẬT (KHỚP HỒ SƠ)
            
            -- A. Cập nhật bảng [USER] (Cập nhật họ tên, ngày sinh mới nhất khách nhập)
            UPDATE [USER]
            SET HoTen = @HoTen,
                NgaySinh = @NgaySinh,
                GioiTinh = @GioiTinh
            WHERE MaUser = @MaUserExisting;

            -- B. Cập nhật bảng KHACH_HANG (Email, CCCD nếu có)
            UPDATE KHACH_HANG
            SET Email = ISNULL(@Email, Email), -- Nếu khách nhập email mới thì lấy, ko thì giữ cũ
                CCCD = ISNULL(@CCCD, CCCD)
            WHERE MaKH = @MaUserExisting;

            -- C. Tạo tài khoản đăng nhập (INSERT vào TAI_KHOAN)
            INSERT INTO TAI_KHOAN (TenDangNhap, MatKhau, MaUser)
            VALUES (@TenDangNhap, @MatKhau, @MaUserExisting);

            -- Thông báo
            COMMIT TRANSACTION;
            SELECT @MaUserExisting as MaUserMoi, N'Đăng ký thành công! Đã đồng bộ với hồ sơ cũ tại cửa hàng.' as ThongBao;
        END

        -- TRƯỜNG HỢP 2: KHÁCH MỚI TINH (SĐT CHƯA CÓ)
        ELSE
        BEGIN
            -- --- TỰ ĐỘNG SINH MÃ USER
            DECLARE @MaUserNew NCHAR(10);
            DECLARE @MaxID INT;

            SELECT @MaxID = MAX(CAST(RIGHT(MaUser, 6) AS INT)) FROM [USER];
            IF @MaxID IS NULL SET @MaxID = 0;
            
            SET @MaxID = @MaxID + 1;
            SET @MaUserNew = 'U' + RIGHT('000000' + CAST(@MaxID AS VARCHAR(6)), 6);

            -- Vòng lặp check trùng mã (An toàn)
            WHILE EXISTS (SELECT 1 FROM [USER] WHERE MaUser = @MaUserNew)
            BEGIN
                SET @MaxID = @MaxID + 1;
                SET @MaUserNew = 'U' + RIGHT('000000' + CAST(@MaxID AS VARCHAR(6)), 6);
            END

            -- A. Insert bảng [USER]
            INSERT INTO [USER] (MaUser, HoTen, NgaySinh, GioiTinh, LoaiUser)
            VALUES (@MaUserNew, @HoTen, @NgaySinh, @GioiTinh, 'KH');

            -- B. Insert bảng TAI_KHOAN
            INSERT INTO TAI_KHOAN (TenDangNhap, MatKhau, MaUser)
            VALUES (@TenDangNhap, @MatKhau, @MaUserNew);

            -- C. Insert bảng KHACH_HANG
            INSERT INTO KHACH_HANG (MaKH, SDT, Email, CCCD, TongDiemTichLuy)
            VALUES (@MaUserNew, @SDT, @Email, @CCCD, 0);

            COMMIT TRANSACTION;
            SELECT @MaUserNew as MaUserMoi, N'Đăng ký mới thành công!' as ThongBao;
        END

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = N'Lỗi hệ thống: ' + ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO
-- 2. Khách hàng đăng nhập vào tài khoản (cho KH và NV)
CREATE OR ALTER PROC sp_DangNhap
    @TenDangNhap VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        TK.TenDangNhap,
        TK.MatKhau, -- Lấy mật khẩu hash về để Node.js so sánh
        U.MaUser,
        U.HoTen,
        U.LoaiUser,
        NV.ChucVu,
        NV.MaCN
    FROM TAI_KHOAN TK
    JOIN [USER] U ON TK.MaUser = U.MaUser
    LEFT JOIN NHAN_VIEN NV ON U.MaUser = NV.MaNV
    WHERE TK.TenDangNhap = @TenDangNhap;
END;
GO

-- 3. Đổi mật khẩu
CREATE OR ALTER PROC sp_DoiMatKhau
    @TenDangNhap VARCHAR(30),
    @MatKhauMoi VARCHAR(70)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE TAI_KHOAN
        SET MatKhau = @MatKhauMoi
        WHERE TenDangNhap = @TenDangNhap;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- 4. Cập nhật thông tin khách hàng
CREATE OR ALTER PROC sp_CapNhatThongTinKH
    @MaUser NCHAR(10),
    @HoTen NVARCHAR(50),
    @NgaySinh DATE,
    @GioiTinh NVARCHAR(3),
    @Email VARCHAR(50) = NULL, -- Thêm = NULL để không bắt buộc
    @CCCD CHAR(12) = NULL      -- Thêm = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Để tránh lỗi khi validate và lưu vào DB cho sạch
    IF @Email = '' SET @Email = NULL;
    IF @CCCD = '' SET @CCCD = NULL;

    -- 1. VALIDATION
    -- Check User có tồn tại không
    IF NOT EXISTS (SELECT 1 FROM [USER] WHERE MaUser = @MaUser)
    BEGIN
        RAISERROR(N'Lỗi: Người dùng không tồn tại!', 16, 1);
        RETURN;
    END

    -- Check định dạng Email (CHỈ CHECK NẾU CÓ NHẬP)
    IF @Email IS NOT NULL AND @Email NOT LIKE '%_@__%.__%'
    BEGIN
        RAISERROR(N'Lỗi: Định dạng Email không hợp lệ!', 16, 1);
        RETURN;
    END

    -- Check trùng Email (CHỈ CHECK NẾU CÓ NHẬP)
    IF @Email IS NOT NULL AND EXISTS (SELECT 1 FROM KHACH_HANG WHERE Email = @Email AND MaKH <> @MaUser)
    BEGIN
        RAISERROR(N'Lỗi: Email này đã được sử dụng bởi tài khoản khác!', 16, 1);
        RETURN;
    END

    -- Check CCCD (CHỈ CHECK NẾU CÓ NHẬP)
    IF @CCCD IS NOT NULL
    BEGIN
        IF LEN(@CCCD) <> 12 OR LEFT(@CCCD, 1) <> '0' OR @CCCD LIKE '%[^0-9]%'
        BEGIN
            RAISERROR(N'Lỗi: CCCD phải có 12 số, bắt đầu bằng số 0 và không có ký tự chữ!', 16, 1);
            RETURN;
        END
    END

    -- Check ngày sinh
    IF @NgaySinh >= GETDATE()
    BEGIN
        RAISERROR(N'Lỗi: Ngày sinh không hợp lệ!', 16, 1);
        RETURN;
    END

    -- 2. THỰC HIỆN UPDATE
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Update bảng USER
        UPDATE [USER]
        SET HoTen = @HoTen,
            NgaySinh = @NgaySinh,
            GioiTinh = @GioiTinh
        WHERE MaUser = @MaUser;

        -- Update bảng KHACH_HANG
        -- Nếu @Email là NULL thì trong DB sẽ được cập nhật thành NULL (xóa email cũ)
        UPDATE KHACH_HANG
        SET Email = @Email,
            CCCD = @CCCD
        WHERE MaKH = @MaUser;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = N'Lỗi hệ thống: ' + ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- 5. Thêm thú cưng
CREATE OR ALTER PROC sp_ThemThuCung
    @MaKH NCHAR(10),
    @TenTC NVARCHAR(50),
    @Loai NVARCHAR(30),        
    @Giong NVARCHAR(30),      
    @NgaySinh DATE,
    @GioiTinh NVARCHAR(3),
    @TinhTrangSucKhoe NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    -- Check Khách hàng tồn tại
    IF NOT EXISTS (SELECT 1 FROM KHACH_HANG WHERE MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Mã khách hàng không tồn tại!', 16, 1);
        RETURN;
    END

    -- Check ngày sinh thú cưng
    IF @NgaySinh >= GETDATE()
    BEGIN
        RAISERROR(N'Lỗi: Ngày sinh thú cưng phải nhỏ hơn ngày hiện tại!', 16, 1);
        RETURN;
    END

    -- 2. TỰ ĐỘNG SINH MÃ (Format: TC000001)
    DECLARE @MaTC NCHAR(10);
    DECLARE @MaxID INT;

    SELECT @MaxID = MAX(CAST(RIGHT(MaTC, 6) AS INT)) FROM THU_CUNG;
    IF @MaxID IS NULL SET @MaxID = 0;
    
    SET @MaTC = 'TC' + RIGHT('000000' + CAST(@MaxID + 1 AS VARCHAR(6)), 6);

    -- 3. INSERT
    BEGIN TRY
        INSERT INTO THU_CUNG (MaTC, Ten, Loai, Giong, NgSinh, GioiTinh, TinhTrangSucKhoe, MaKH)
        VALUES (@MaTC, @TenTC, @Loai, @Giong, @NgaySinh, @GioiTinh, @TinhTrangSucKhoe, @MaKH);
        
        -- Trả về Mã TC mới tạo để App có thể hiển thị ngay
        SELECT @MaTC AS NewMaTC;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = N'Lỗi thêm thú cưng: ' + ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- 6. Cập nhật thông tin thú cưng
CREATE OR ALTER PROC sp_CapNhatThuCung
    @MaKH NCHAR(10),       -- Để check xem có đúng chủ không
    @MaTC VARCHAR(20),     -- Mã thú (VARCHAR 20 cho khớp với DB)
    @TenTC NVARCHAR(50),
    @Loai NVARCHAR(20),    -- Thêm Loài (form có sửa loài)
    @Giong NVARCHAR(50),
    @NgaySinh DATE,       
    @GioiTinh NVARCHAR(10),   
    @TinhTrangSucKhoe NVARCHAR(100) 
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Check xem thú cưng có tồn tại và ĐÚNG CHỦ không
    IF NOT EXISTS (SELECT 1 FROM THU_CUNG WHERE MaTC = @MaTC AND RTRIM(MaKH) = RTRIM(@MaKH))
    BEGIN
        RAISERROR(N'Lỗi: Không tìm thấy thú cưng hoặc bạn không phải chủ sở hữu!', 16, 1);
        RETURN;
    END

    -- 2. Check ngày sinh
    IF @NgaySinh >= GETDATE()
    BEGIN
        RAISERROR(N'Lỗi: Ngày sinh phải nhỏ hơn ngày hiện tại!', 16, 1);
        RETURN;
    END

    -- 3. Update
    BEGIN TRY
        UPDATE THU_CUNG
        SET Ten = @TenTC,
            Loai = @Loai,         -- Update luôn loại cho đầy đủ
            Giong = @Giong,
            NgSinh = @NgaySinh,      
            GioiTinh = @GioiTinh,   
            TinhTrangSucKhoe = @TinhTrangSucKhoe
        WHERE MaTC = @MaTC AND RTRIM(MaKH) = RTRIM(@MaKH);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
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

        -- Logic lấy Hạng của năm ngoái (Năm hiện tại - 1)
        -- Nếu tìm không thấy thì coi như là "Thành viên mới" hoặc hạng mặc định C01
        ISNULL(HTV.TenHang, N'Thành viên mới') AS HangThanhVien,
        ISNULL(HTV.MaHang, 'C01') AS MaHang, -- Trả về mã hạng để Frontend dễ xử lý icon/màu sắc
        
        -- Hiển thị mức chi tiêu đã chốt năm ngoái
        ISNULL(XHN.TongChiTieu, 0) AS TongChiTieuNamNgoai

    FROM KHACH_HANG KH
    JOIN [USER] U ON KH.MaKH = U.MaUser
    JOIN TAI_KHOAN TK ON KH.MaKH = TK.MaUser
    
    -- LEFT JOIN bảng xếp hạng với điều kiện lấy dữ liệu năm ngoái
    LEFT JOIN XEP_HANG_NAM XHN ON KH.MaKH = XHN.MaKH 
                               AND XHN.Nam = (YEAR(GETDATE()) - 1)
    
    -- LEFT JOIN bảng tên hạng để lấy tên hiển thị
    LEFT JOIN HANG_TV HTV ON XHN.MaHang = HTV.MaHang

    WHERE KH.MaKH = @MaKH;
END;
GO

EXEC sp_XemThongTinCaNhan U000001
GO

-- 8. Khách hàng xem lịch sử mua sắm
CREATE OR ALTER PROC sp_XemLichSuMuaSam
    @MaKH NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    IF NOT EXISTS (SELECT 1 FROM KHACH_HANG WHERE MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Mã khách hàng không tồn tại!', 16, 1);
        RETURN;
    END

    -- 2. TRUY VẤN
    SELECT 
        PDV.MaPhieu,
        PDV.TG_ThucHienDV AS NgayMua,
        MH.TenMatHang,
        CT.SoLuong,
        FORMAT(CT.ThanhTien, 'N0', 'vi-VN') + ' VNĐ' AS ThanhTien, 
        CN.TenCN AS ChiNhanhMua,
        PDV.TrangThai
    FROM PHIEU_DICH_VU PDV
    JOIN CT_MUA_HANG CT ON PDV.MaPhieu = CT.MaPhieu
    JOIN MAT_HANG MH ON CT.MaMatHang = MH.MaMatHang
    JOIN CHI_NHANH CN ON PDV.MaCN = CN.MaCN
    WHERE PDV.MaKH = @MaKH 
      AND PDV.LoaiPhieu = 'MH'
    ORDER BY PDV.TG_ThucHienDV DESC; -- Sắp xếp từ mới nhất đến cũ nhất
END;
GO

EXEC sp_XemLichSuMuaSam U000274
GO

-- 9. Khách hàng xem lịch sử khám bệnh của một thú cưng
CREATE OR ALTER PROC sp_XemLichSuKhamBenh
    @MaKH NCHAR(10),
    @MaTC NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION & SECURITY CHECK
    -- Kiểm tra thú cưng có tồn tại không
    IF NOT EXISTS (SELECT 1 FROM THU_CUNG WHERE MaTC = @MaTC)
    BEGIN
        RAISERROR(N'Lỗi: Mã thú cưng không tồn tại!', 16, 1);
        RETURN;
    END

    -- Kiểm tra quyền sở hữu: Thú cưng này có thuộc về Khách hàng này không?
    IF NOT EXISTS (SELECT 1 FROM THU_CUNG WHERE MaTC = @MaTC AND MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Bạn không có quyền xem lịch sử của thú cưng này!', 16, 1);
        RETURN;
    END

    -- 2. TRUY VẤN
    SELECT 
        PDV.TG_ThucHienDV AS NgayKham,
        PKB.TrieuChung,
        PKB.ChanDoan,
        PKB.NgayHenTaiKham,
        U_BS.HoTen AS BacSiKham,
        CN.TenCN AS NoiKham
    FROM PHIEU_KHAM_BENH PKB
    JOIN PHIEU_DICH_VU PDV ON PKB.MaPhieu = PDV.MaPhieu
    LEFT JOIN NHAN_VIEN NV ON PDV.MaNV = NV.MaNV
    LEFT JOIN [USER] U_BS ON NV.MaNV = U_BS.MaUser
    JOIN CHI_NHANH CN ON PDV.MaCN = CN.MaCN
    WHERE PKB.MaTC = @MaTC
    ORDER BY PDV.TG_ThucHienDV DESC;
END;
GO

-- 10. Khách hàng xem lịch sử tiêm phòng của một thú cưng
CREATE OR ALTER PROC sp_XemLichSuTiemPhong
    @MaKH NCHAR(10),
    @MaTC NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION & SECURITY CHECK
    IF NOT EXISTS (SELECT 1 FROM THU_CUNG WHERE MaTC = @MaTC)
    BEGIN
        RAISERROR(N'Lỗi: Mã thú cưng không tồn tại!', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM THU_CUNG WHERE MaTC = @MaTC AND MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Bạn không có quyền xem lịch sử của thú cưng này!', 16, 1);
        RETURN;
    END

    -- 2. TRUY VẤN
    SELECT 
        PDV.TG_ThucHienDV AS NgayTiem,
        MH.TenMatHang AS TenVaccine,
        CTV.LieuLuong,
        CASE 
            WHEN CTV.NhacLai = 1 THEN N'Có' 
            ELSE N'Không' 
        END AS CanNhacLai,
        U_BS.HoTen AS NguoiTiem,
        CN.TenCN AS NoiTiem
    FROM PHIEU_TIEM_VACCINE PTV
    JOIN PHIEU_DICH_VU PDV ON PTV.MaPhieu = PDV.MaPhieu
    JOIN CT_TIEM_VC CTV ON PTV.MaPhieu = CTV.MaPhieu
    JOIN VACCINE V ON CTV.MaVaccine = V.MaVaccine
    JOIN MAT_HANG MH ON V.MaVaccine = MH.MaMatHang
    LEFT JOIN NHAN_VIEN NV ON PDV.MaNV = NV.MaNV
    LEFT JOIN [USER] U_BS ON NV.MaNV = U_BS.MaUser
    JOIN CHI_NHANH CN ON PDV.MaCN = CN.MaCN
    WHERE PTV.MaTC = @MaTC
    ORDER BY PDV.TG_ThucHienDV DESC;
END;
GO


-- 11. Khách hàng xem danh sách thú cưng
CREATE OR ALTER PROC sp_XemDanhSachThuCung
    @MaKH NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        MaTC,
        Ten, --Bỏ as TenThuCung cho web dễ nhận diện
        Loai,      
        Giong,     
        NgSinh,
        GioiTinh,
        TinhTrangSucKhoe,
        -- Tính tuổi cho khách dễ nhìn
        DATEDIFF(MONTH, NgSinh, GETDATE()) / 12 AS TuoiNam,
        DATEDIFF(MONTH, NgSinh, GETDATE()) % 12 AS TuoiThang
    FROM THU_CUNG
    WHERE MaKH = @MaKH
    ORDER BY Ten ASC;
END;
GO

-- 12. Tra cứu danh sách sản phẩm
CREATE OR ALTER PROC sp_TraCuuSanPham
    @TuKhoa NVARCHAR(80) = NULL, -- Tìm theo tên
    @LoaiMH VARCHAR(3) = NULL    -- Lọc theo loại: T (Thuốc), VC (Vaccine), SPK (Khác)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        MH.MaMatHang,
        MH.TenMatHang,
        MH.HangSX,
        MH.LoaiMH,
        FORMAT(MH.DonGia, 'N0', 'vi-VN') + ' VNĐ' AS DonGia,
        
        -- Tính tổng tồn kho của tất cả chi nhánh để báo "Còn hàng" hay "Hết hàng"
        CASE 
            WHEN SUM(TK.SoLuongTon) > 0 THEN N'Còn hàng'
            ELSE N'Hết hàng'
        END AS TinhTrang
    FROM MAT_HANG MH
    LEFT JOIN TON_KHO TK ON MH.MaMatHang = TK.MaMatHang
    WHERE 
        (@TuKhoa IS NULL OR MH.TenMatHang LIKE N'%' + @TuKhoa + '%')
        AND
        (@LoaiMH IS NULL OR MH.LoaiMH = @LoaiMH)
    GROUP BY MH.MaMatHang, MH.TenMatHang, MH.HangSX, MH.LoaiMH, MH.DonGia
    ORDER BY MH.TenMatHang ASC;
END;
GO

-- 13. Khách hàng xem lịch sử sử dụng các dịch vụ của hệ thống
CREATE OR ALTER PROC sp_XemLichSuHoatDong
    @MaKH NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. VALIDATION
    IF NOT EXISTS (SELECT 1 FROM KHACH_HANG WHERE MaKH = @MaKH)
    BEGIN
        RAISERROR(N'Lỗi: Mã khách hàng không tồn tại!', 16, 1);
        RETURN;
    END

    -- 2. TRUY VẤN TỔNG HỢP
    SELECT 
        PDV.MaPhieu,
        PDV.TG_ThucHienDV AS ThoiGian,
        
        -- Cột Loại dịch vụ (Tiếng Việt)
        CASE PDV.LoaiPhieu
            WHEN 'KB' THEN N'Khám bệnh'
            WHEN 'TV' THEN N'Tiêm Vaccine'
            WHEN 'MH' THEN N'Mua hàng'
        END AS LoaiDichVu,

        -- Cột Tên Thú Cưng (Logic: Mua hàng thì không có thú cưng cụ thể)
        CASE PDV.LoaiPhieu
            WHEN 'KB' THEN ISNULL(TC_KB.Ten, N'--') -- Lấy tên từ phiếu khám
            WHEN 'TV' THEN ISNULL(TC_TV.Ten, N'--') -- Lấy tên từ phiếu tiêm
            ELSE N'--'                               -- Mua hàng
        END AS TenThuCung,

        -- Cột Tổng tiền (Lấy từ HD Trực tiếp HOẶC HD Trực tuyến)
        -- Dùng hàm COALESCE để lấy giá trị không NULL đầu tiên tìm thấy
        FORMAT(
            COALESCE(HD1.TongThanhTienSC, HD2.TongThanhTienSC, 0), 
            'N0', 'vi-VN'
        ) + ' VNĐ' AS TongTien,

        -- Cột Trạng thái (Dịch mã sang tiếng Việt)
        CASE PDV.TrangThai
            WHEN 'DD'  THEN N'Đã đặt lịch'
            WHEN 'DTH' THEN N'Đang thực hiện'
            WHEN 'DHT' THEN N'Đã hoàn thành'
            WHEN 'DH'  THEN N'Đã hủy'
            ELSE N'Không xác định'
        END AS TrangThai,

        CN.TenCN AS ChiNhanh

    FROM PHIEU_DICH_VU PDV
    
    -- Join để lấy tên thú cưng (Nếu là phiếu Khám bệnh)
    LEFT JOIN PHIEU_KHAM_BENH PKB ON PDV.MaPhieu = PKB.MaPhieu
    LEFT JOIN THU_CUNG TC_KB ON PKB.MaTC = TC_KB.MaTC
    
    -- Join để lấy tên thú cưng (Nếu là phiếu Tiêm vaccine)
    LEFT JOIN PHIEU_TIEM_VACCINE PTV ON PDV.MaPhieu = PTV.MaPhieu
    LEFT JOIN THU_CUNG TC_TV ON PTV.MaTC = TC_TV.MaTC

    -- Join lấy tiền (Hóa đơn trực tiếp)
    LEFT JOIN HD_TRUC_TIEP HD1 ON PDV.MaPhieu = HD1.MaPhieu
    -- Join lấy tiền (Hóa đơn trực tuyến)
    LEFT JOIN HD_TRUC_TUYEN HD2 ON PDV.MaPhieu = HD2.MaPhieu

    -- Join lấy tên chi nhánh
    JOIN CHI_NHANH CN ON PDV.MaCN = CN.MaCN

    WHERE PDV.MaKH = @MaKH
    ORDER BY PDV.TG_ThucHienDV DESC; -- Mới nhất hiện lên đầu
END;
GO

-- 14. Khách hàng xem thông tin của các chi nhánh (Kèm danh sách dịch vụ)
CREATE OR ALTER PROC sp_XemDanhSachChiNhanh
    @TuKhoa NVARCHAR(100) = NULL -- Nhập tên/địa chỉ để tìm. Nếu để NULL thì hiện tất cả.
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        CN.MaCN,
        CN.TenCN,
        CN.DiaChi,
        CN.SDT,
        
        -- Format giờ
        LEFT(CAST(CN.Giomocua AS VARCHAR), 5) AS GioMoCua,
        LEFT(CAST(CN.Giodongcua AS VARCHAR), 5) AS GioDongCua,

        -- [LOGIC REAL-TIME] Trạng thái mở cửa
        CASE 
            WHEN CAST(GETDATE() AS TIME) BETWEEN CN.Giomocua AND CN.Giodongcua 
            THEN N'Đang mở cửa'
            ELSE N'Đã đóng cửa'
        END AS TrangThaiHoatDong,

        -- [MỚI] Gom nhóm các dịch vụ thành 1 chuỗi (VD: Khám bệnh, Tiêm vaccine)
        ISNULL((
            SELECT STRING_AGG(LDV.TenLoaiDV, N', ') WITHIN GROUP (ORDER BY LDV.TenLoaiDV)
            FROM DV_CN D
            JOIN LOAI_DICH_VU LDV ON D.MaLoaiDV = LDV.MaLoaiDV
            WHERE D.MaCN = CN.MaCN
        ), N'Đang cập nhật') AS DichVuHoTro

    FROM CHI_NHANH CN
    WHERE 
        (@TuKhoa IS NULL OR 
         CN.TenCN LIKE N'%' + @TuKhoa + '%' OR 
         CN.DiaChi LIKE N'%' + @TuKhoa + '%')
    ORDER BY CN.TenCN ASC;
END;
GO

-- 15. Khách hàng xóa thú cưng (chưa có lịch sử tiêm/khám)
CREATE OR ALTER PROCEDURE sp_XoaThuCung
    @MaKH NCHAR(10),
    @MaTC NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. KIỂM TRA QUYỀN SỞ HỮU & TỒN TẠI
    DECLARE @ChuSoHuu NCHAR(10);
    SELECT @ChuSoHuu = MaKH FROM THU_CUNG WHERE MaTC = @MaTC;

    IF @ChuSoHuu IS NULL
    BEGIN
        RAISERROR(N'Lỗi: Thú cưng không tồn tại!', 16, 1);
        RETURN;
    END

    IF @ChuSoHuu <> @MaKH
    BEGIN
        RAISERROR(N'Lỗi: Bạn không có quyền xóa thú cưng của người khác!', 16, 1);
        RETURN;
    END

    -- 2. KIỂM TRA RÀNG BUỘC DỮ LIỆU (Có lịch sử khám/tiêm chưa?)
    -- Check bảng PHIEU_KHAM_BENH
    IF EXISTS (SELECT 1 FROM PHIEU_KHAM_BENH WHERE MaTC = @MaTC)
    BEGIN
        RAISERROR(N'Lỗi: Không thể xóa thú cưng đã có hồ sơ khám bệnh (Dữ liệu cần lưu trữ lịch sử).', 16, 1);
        RETURN;
    END

    -- Check bảng PHIEU_TIEM_VACCINE
    IF EXISTS (SELECT 1 FROM PHIEU_TIEM_VACCINE WHERE MaTC = @MaTC)
    BEGIN
        RAISERROR(N'Lỗi: Không thể xóa thú cưng đã có hồ sơ tiêm vaccine.', 16, 1);
        RETURN;
    END

    -- 3. THỰC HIỆN XÓA
    BEGIN TRANSACTION;
    BEGIN TRY
        DELETE FROM THU_CUNG WHERE MaTC = @MaTC;
        
        COMMIT TRANSACTION;
        PRINT N'Đã xóa thú cưng thành công.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

