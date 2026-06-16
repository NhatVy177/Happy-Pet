-- ============================================
-- SP KIỂM TRA THÚ CƯNG CÓ GÓI VACCINE ĐANG TIÊM DỞ KHÔNG
-- Trả về: MaGoi, SoMuiDaTiem, TongSoMui nếu có gói đang tiêm
-- ============================================
USE HAPPYPET
GO

CREATE OR ALTER PROC sp_KiemTraGoiDangTiem
    @MaTC NCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Tìm gói vaccine đang tiêm (có trong DANG_KI_GOI_TIEM, chưa tiêm đủ)
    SELECT TOP 1
        DK.MaGoi,
        DK.MaVaccine,
        MH.TenMatHang AS TenVaccine,
        GOI.TenGoi,
        GOI.SoMuiTuongUng AS TongSoMui,
        DK.NgayHetHan,
        -- 🔥 Đếm số mũi đã tiêm của gói này (CHỈ PHIẾU ĐÃ HOÀN TẤT)
        -- Lý do: Phải đếm đúng số mũi thực tế đã tiêm, không tính phiếu bị hủy
        ISNULL((
            SELECT COUNT(*) 
            FROM CT_TIEM_VC CT
            INNER JOIN PHIEU_TIEM_VACCINE PTV ON CT.MaPhieu = PTV.MaPhieu
            INNER JOIN PHIEU_DICH_VU PDV2 ON CT.MaPhieu = PDV2.MaPhieu
            WHERE PTV.MaTC = @MaTC
              AND CT.MaVaccine = DK.MaVaccine
              AND PDV2.TrangThai = 'DHT' -- CHỈ TÍNH PHIẾU ĐÃ HOÀN TẤT
              AND PDV2.TG_LapPhieu >= (SELECT P.TG_LapPhieu FROM PHIEU_DICH_VU P WHERE P.MaPhieu = DK.MaPhieu)
        ), 0) AS SoMuiDaTiem,
        -- Số mũi còn lại
        GOI.SoMuiTuongUng - ISNULL((
            SELECT COUNT(*) 
            FROM CT_TIEM_VC CT
            INNER JOIN PHIEU_TIEM_VACCINE PTV ON CT.MaPhieu = PTV.MaPhieu
            INNER JOIN PHIEU_DICH_VU PDV2 ON CT.MaPhieu = PDV2.MaPhieu
            WHERE PTV.MaTC = @MaTC
              AND CT.MaVaccine = DK.MaVaccine
              AND PDV2.TrangThai = 'DHT' -- CHỈ TÍNH PHIẾU ĐÃ HOÀN TẤT
              AND PDV2.TG_LapPhieu >= (SELECT P.TG_LapPhieu FROM PHIEU_DICH_VU P WHERE P.MaPhieu = DK.MaPhieu)
        ), 0) AS SoMuiConLai
    FROM DANG_KI_GOI_TIEM DK
    INNER JOIN GOI_TIEM_VC GOI ON DK.MaGoi = GOI.MaGoi
    INNER JOIN PHIEU_TIEM_VACCINE PTV ON DK.MaPhieu = PTV.MaPhieu
    INNER JOIN MAT_HANG MH ON DK.MaVaccine = MH.MaMatHang
    INNER JOIN PHIEU_DICH_VU PDV ON DK.MaPhieu = PDV.MaPhieu
    WHERE PTV.MaTC = @MaTC
      AND DK.HieuLuc = 1
      -- 🔥 BỎ điều kiện PDV.TrangThai = 'DHT' để tìm gói dù phiếu đăng ký đã hoàn tất hay chưa
      -- Vì khách có thể đến lần 2 (phiếu mới chưa hoàn tất) nhưng gói vẫn còn hiệu lực
      AND (DK.NgayHetHan IS NULL OR DK.NgayHetHan > GETDATE())
      -- CHỈ LẤY GÓI CHƯA TIÊM ĐỦ SỐ MŨI QUY ĐỊNH
      AND GOI.SoMuiTuongUng > ISNULL((
          SELECT COUNT(*) 
          FROM CT_TIEM_VC CT
          INNER JOIN PHIEU_TIEM_VACCINE PTV2 ON CT.MaPhieu = PTV2.MaPhieu
          INNER JOIN PHIEU_DICH_VU PDV3 ON CT.MaPhieu = PDV3.MaPhieu
          WHERE PTV2.MaTC = @MaTC
            AND CT.MaVaccine = DK.MaVaccine
            AND PDV3.TrangThai = 'DHT' -- CHỈ TÍNH PHIẾU ĐÃ HOÀN TẤT
            AND PDV3.TG_LapPhieu >= (SELECT P.TG_LapPhieu FROM PHIEU_DICH_VU P WHERE P.MaPhieu = DK.MaPhieu)
      ), 0)
    -- 🔥 LẤY GÓI CŨ NHẤT (đăng ký đầu tiên) để đếm đủ số mũi từ đầu
    ORDER BY DK.MaPhieu ASC;
    
END;
GO

PRINT N'✅ Đã tạo SP sp_KiemTraGoiDangTiem'
GO
