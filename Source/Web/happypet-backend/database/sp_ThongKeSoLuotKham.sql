USE HAPPYPET
GO

-- 📊 THỐNG KÊ SỐ LƯỢT KHÁM THEO THỜI GIAN
CREATE OR ALTER PROC sp_ThongKeSoLuotKham
    @MaCN NCHAR(10) = NULL,
    @TuNgay DATE = NULL,
    @DenNgay DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @TuNgay IS NULL SET @TuNgay = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
    IF @DenNgay IS NULL SET @DenNgay = EOMONTH(GETDATE());
    
    SELECT 
        CONVERT(DATE, P.TG_LapPhieu) AS Ngay,
        CN.TenCN AS ChiNhanh,
        COUNT(*) AS SoLuotKham,
        SUM(ISNULL(HTT.TongThanhTienSC, 0) + ISNULL(HT.TongThanhTienSC, 0)) AS DoanhThu
    FROM PHIEU_DICH_VU P
    JOIN NHAN_VIEN NV ON P.MaNV = NV.MaNV
    JOIN CHI_NHANH CN ON NV.MaCN = CN.MaCN
    LEFT JOIN HD_TRUC_TUYEN HTT ON P.MaPhieu = HTT.MaPhieu
    LEFT JOIN HD_TRUC_TIEP HT ON P.MaPhieu = HT.MaPhieu
    WHERE 
        P.LoaiPhieu = 'KB'  -- Chỉ phiếu khám bệnh
        AND P.TrangThai IN ('DHT', 'HT')
        AND CAST(P.TG_LapPhieu AS DATE) BETWEEN @TuNgay AND @DenNgay
        AND (@MaCN IS NULL OR NV.MaCN = @MaCN)
    GROUP BY CONVERT(DATE, P.TG_LapPhieu), CN.TenCN
    ORDER BY Ngay DESC, CN.TenCN;
END;
GO

PRINT N'✅ Đã tạo sp_ThongKeSoLuotKham'
GO
