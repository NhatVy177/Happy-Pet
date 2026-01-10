USE HAPPYPET
GO

-- THỐNG KÊ DOANH THU PHÒNG KHÁM THEO BÁC SĨ
CREATE OR ALTER PROC sp_ThongKeDoanhThuBacSi
    @MaCN NCHAR(10) = NULL,  -- Nếu NULL = tất cả chi nhánh (cho Giám đốc)
    @TuNgay DATE = NULL,
    @DenNgay DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Mặc định: tháng hiện tại
    IF @TuNgay IS NULL SET @TuNgay = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
    IF @DenNgay IS NULL SET @DenNgay = EOMONTH(GETDATE());
    
    SELECT 
        NV.MaNV,
        U.HoTen AS TenBacSi,
        CN.TenCN AS ChiNhanh,
        COUNT(DISTINCT P.MaPhieu) AS SoLuotKham,
        SUM(ISNULL(HTT.TongThanhTienSC, 0) + ISNULL(HT.TongThanhTienSC, 0)) AS TongDoanhThu
    FROM PHIEU_DICH_VU P
    JOIN NHAN_VIEN NV ON P.MaNV = NV.MaNV
    JOIN [USER] U ON NV.MaNV = U.MaUser
    JOIN CHI_NHANH CN ON NV.MaCN = CN.MaCN
    LEFT JOIN HD_TRUC_TUYEN HTT ON P.MaPhieu = HTT.MaPhieu
    LEFT JOIN HD_TRUC_TIEP HT ON P.MaPhieu = HT.MaPhieu
    WHERE 
        P.LoaiPhieu IN ('KB', 'TV')  -- Khám bệnh + tiêm vaccine
        AND P.TrangThai IN ('DHT', 'HT')  -- Đã hoàn tất
        AND CAST(P.TG_LapPhieu AS DATE) BETWEEN @TuNgay AND @DenNgay
        AND (@MaCN IS NULL OR NV.MaCN = @MaCN)
    GROUP BY NV.MaNV, U.HoTen, CN.TenCN
    ORDER BY TongDoanhThu DESC;
END;
GO