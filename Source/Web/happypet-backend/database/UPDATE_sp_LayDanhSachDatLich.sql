USE HAPPYPET
GO

CREATE OR ALTER PROC sp_LayDanhSachDatLich
    @MaCN NCHAR(10),
    @TuNgay DATE,
    @DenNgay DATE,
    @TrangThai VARCHAR(5) = NULL,
    @MaNV_Xem NCHAR(10) = NULL,   
    @Role_Xem NVARCHAR(50) = NULL 
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        RTRIM(P.MaPhieu) AS MaPhieu,
        CONVERT(VARCHAR(23), P.TG_LapPhieu, 121) AS TG_LapPhieu,
        CONVERT(VARCHAR(23), P.TG_ThucHienDV, 121) AS TG_ThucHienDV,               
        RTRIM(P.MaNV) AS MaNV,
        U.HoTen AS TenKhachHang,       
        TC.Ten AS TenThuCung,
        CASE RTRIM(P.LoaiPhieu)
            WHEN 'KB' THEN N'Khám bệnh'
            WHEN 'TV' THEN N'Tiêm vaccine'
            ELSE N'Dịch vụ khác'
        END AS LoaiDichVu,
        RTRIM(ISNULL(P.TrangThai, 'DD')) AS TrangThai,
        KH.SDT,
        HTT.DiaChiGiaoHang AS DiaChi,
        ISNULL(HTT.TongThanhTien, HDTT.TongThanhTienSC) AS TongThanhTien, -- 🔥 LẤY TỪ HD_TRUC_TUYEN HOẶC HD_TRUC_TIEP
        HTT.MaPhieu AS MaHD,  -- Để biết có HD_TRUC_TUYEN không
        HDTT.PhuongThucTT AS PhuongThucTT, -- 🔥 LẤY PHƯƠNG THỨC THANH TOÁN ĐỂ BIẾT ĐÃ XUẤT HÓA ĐƠN CHƯA
        RTRIM(HDTT.MaNV) AS MaNV_XuatHD, -- 🔥 MÃ NHÂN VIÊN XUẤT HÓA ĐƠN (từ HD_TRUC_TIEP)
        RTRIM(P.MaNV) AS MaNV_BacSi, -- 🔥 MÃ BÁC SĨ (từ PHIEU_DICH_VU) - đổi tên để phân biệt
        U_BacSi.HoTen AS TenBacSi -- 🔥 LẤY TÊN BÁC SĨ ĐÃ GÁN
    FROM PHIEU_DICH_VU P
    JOIN KHACH_HANG KH ON P.MaKH = KH.MaKH
    JOIN [USER] U ON KH.MaKH = U.MaUser
    LEFT JOIN [USER] U_BacSi ON P.MaNV = U_BacSi.MaUser -- 🔥 JOIN ĐỂ LẤY TÊN BÁC SĨ
    LEFT JOIN PHIEU_KHAM_BENH PKB ON P.MaPhieu = PKB.MaPhieu
    LEFT JOIN PHIEU_TIEM_VACCINE PTV ON P.MaPhieu = PTV.MaPhieu
    LEFT JOIN THU_CUNG TC ON ISNULL(PKB.MaTC, PTV.MaTC) = TC.MaTC
    LEFT JOIN HD_TRUC_TUYEN HTT ON P.MaPhieu = HTT.MaPhieu
    LEFT JOIN HD_TRUC_TIEP HDTT ON P.MaPhieu = HDTT.MaPhieu -- 🔥 JOIN ĐỂ LẤY PHƯƠNG THỨC TT
    WHERE P.MaCN = @MaCN 
      AND (@TrangThai IS NULL OR RTRIM(P.TrangThai) = @TrangThai)
      AND (
          -- 🔥 LOGIC MỚI: Hiện đơn nếu thỏa 1 trong 2:
          -- 1. Ngày ĐẶT nằm trong khoảng (đơn mới đặt cần xử lý)
          -- 2. Ngày MUỐN NHẬN nằm trong khoảng (đơn đến hạn giao)
          CAST(P.TG_LapPhieu AS DATE) BETWEEN @TuNgay AND @DenNgay
          OR
          CAST(P.TG_ThucHienDV AS DATE) BETWEEN @TuNgay AND @DenNgay
      ) 
      AND (
          -- Cho phép các role nhân viên xem hết
          (RTRIM(@Role_Xem) IN (N'Nhân viên Tiếp tân', N'Nhân viên bán hàng', N'Quản lý chi nhánh', N'Admin'))
          OR 
          -- Bác sĩ chỉ thấy đúng ca của mình (bao gồm 'Bác sĩ thú y')
          (RTRIM(P.MaNV) = RTRIM(@MaNV_Xem))
      )
    ORDER BY P.TG_ThucHienDV ASC
END;
GO

PRINT N'✅ Đã cập nhật stored procedure sp_LayDanhSachDatLich'
PRINT N'   - Thêm JOIN với HD_TRUC_TIEP để lấy PhuongThucTT'
PRINT N'   - Frontend sẽ dùng field này để biết đã xuất hóa đơn chưa'
PRINT N'   - Nếu PhuongThucTT có giá trị (Tiền mặt/Chuyển khoản/Thẻ) => Đã xuất'
GO
