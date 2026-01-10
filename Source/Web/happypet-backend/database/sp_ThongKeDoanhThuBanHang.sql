USE HAPPYPET
GO

-- 📊 THỐNG KÊ DOANH THU BÁN SẢN PHẨM
CREATE OR ALTER PROC sp_ThongKeDoanhThuBanHang
    @MaCN NCHAR(10) = NULL,
    @TuNgay DATE = NULL,
    @DenNgay DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @TuNgay IS NULL SET @TuNgay = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
    IF @DenNgay IS NULL SET @DenNgay = EOMONTH(GETDATE());
    
    SELECT 
        MH.LoaiMH,
        CASE 
            WHEN MH.LoaiMH = 'T' THEN N'Thuốc'
            WHEN MH.LoaiMH = 'VC' THEN N'Vaccine'
            WHEN MH.LoaiMH = 'SPK' THEN N'Sản phẩm khác'
        END AS TenLoai,
        CN.TenCN AS ChiNhanh,
        COUNT(DISTINCT CT.MaPhieu) AS SoDonHang,
        SUM(CT.SoLuong) AS TongSoLuong,
        SUM(CT.ThanhTien) AS TongDoanhThu
    FROM CT_MUA_HANG CT
    JOIN MAT_HANG MH ON CT.MaMatHang = MH.MaMatHang
    JOIN PHIEU_MUA_HANG PMH ON CT.MaPhieu = PMH.MaPhieu
    JOIN PHIEU_DICH_VU PDV ON PMH.MaPhieu = PDV.MaPhieu
    JOIN NHAN_VIEN NV ON PDV.MaNV = NV.MaNV
    JOIN CHI_NHANH CN ON NV.MaCN = CN.MaCN
    WHERE 
        PDV.TrangThai IN ('DTH', 'DHT')
        AND CAST(PDV.TG_LapPhieu AS DATE) BETWEEN @TuNgay AND @DenNgay
        AND (@MaCN IS NULL OR NV.MaCN = @MaCN)
    GROUP BY MH.LoaiMH, CN.TenCN
    ORDER BY TongDoanhThu DESC;
END;
GO

PRINT N'✅ Đã tạo sp_ThongKeDoanhThuBanHang'
GO
