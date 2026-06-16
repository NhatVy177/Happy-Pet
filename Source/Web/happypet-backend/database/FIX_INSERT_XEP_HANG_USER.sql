USE HAPPYPET
GO

-- Kiểm tra user U030034 có trong XEP_HANG_NAM chưa
SELECT * FROM XEP_HANG_NAM WHERE MaKH = 'U030034'
GO

-- Nếu chưa có, INSERT hạng C02 (Thân thiết) cho user này
IF NOT EXISTS (SELECT 1 FROM XEP_HANG_NAM WHERE MaKH = 'U030034')
BEGIN
    INSERT INTO XEP_HANG_NAM (MaKH, Nam, MaHang, TongChiTieu)
    VALUES ('U030034', 2025, 'C02', 5000000);  -- 5 triệu để đạt hạng C02
    
    PRINT N'✅ Đã thêm hạng C02 cho user U030034'
END
ELSE
BEGIN
    -- Nếu đã có nhưng sai hạng, UPDATE lại
    UPDATE XEP_HANG_NAM
    SET MaHang = 'C02', TongChiTieu = 5000000
    WHERE MaKH = 'U030034';
    
    PRINT N'✅ Đã cập nhật hạng C02 cho user U030034'
END
GO

-- Xem lại kết quả
SELECT 
    XHN.MaKH, 
    XHN.Nam, 
    XHN.MaHang, 
    HTV.TenHang,
    XHN.TongChiTieu
FROM XEP_HANG_NAM XHN
JOIN HANG_TV HTV ON XHN.MaHang = HTV.MaHang
WHERE XHN.MaKH = 'U030034'
GO

-- Test SP
EXEC sp_XemThongTinCaNhan 'U030034'
GO
