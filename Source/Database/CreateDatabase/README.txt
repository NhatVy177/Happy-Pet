CREATE DATABASE HAPPYPET
GO

USE HAPPYPET
GO

-----------------------------------------------------------------------------------------------------
-- PHẦN 1: TẠO TẤT CẢ CÁC BẢNG 
-----------------------------------------------------------------------------------------------------

-- 15. Bảng PHIEU_KHAM_BENH
CREATE TABLE PHIEU_KHAM_BENH (
    MaPhieu        nchar(10) NOT NULL PRIMARY KEY,
    MaTC           nchar(10) NOT NULL,
    TrieuChung     nvarchar(200) NOT NULL,
    ChanDoan       nvarchar(200) NOT NULL,
    NgayHenTaiKham date,
    TongTienKham   decimal(18,2) DEFAULT 0 NOT NULL CHECK (TongTienKham >= 0)
);

-- 16. Bảng MAT_HANG
CREATE TABLE MAT_HANG (
    MaMatHang    nchar(10) NOT NULL PRIMARY KEY,
    TenMatHang   nvarchar(50) NOT NULL,
    HangSX       nvarchar(50),
    NgaySanXuat  date,
    NgayHetHan   date,
    DonGia       decimal(18,2) NOT NULL CHECK (DonGia >= 0),
    Loai         varchar(3) NOT NULL CHECK (Loai IN ('T','VC','SPK'))
);

-- 17. Bảng THUOC
CREATE TABLE THUOC (
    MaThuoc     nchar(10) NOT NULL PRIMARY KEY,
    TacDungPhu  nvarchar(200),
    DangBaoChe  nvarchar(70),
    LoaiThuoc   nvarchar(70)
);

-- 18. Bảng CT_DON_THUOC
CREATE TABLE CT_DON_THUOC (
    MaThuoc   nchar(10) NOT NULL,
    MaPhieu   nchar(10) NOT NULL,
    LieuLuong nvarchar(50),
    SoLuong   int NOT NULL CHECK (SoLuong >= 0),
    ThanhTien decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaThuoc, MaPhieu)
);

-- 19. Bảng SAN_PHAM_KHAC
CREATE TABLE SAN_PHAM_KHAC (
    MaSP    nchar(10) NOT NULL PRIMARY KEY,
    LoaiSP  nvarchar(70)
);

-- 20. Bảng VACCINE
CREATE TABLE VACCINE (
    MaVaccine     nchar(10) NOT NULL PRIMARY KEY,
    ChongChiDinh  nvarchar(200)
);

-- 21. Bảng PHIEU_TIEM_VACCINE
CREATE TABLE PHIEU_TIEM_VACCINE (
    MaPhieu nchar(10) NOT NULL PRIMARY KEY,
    MaTC    nchar(10) NOT NULL
);

-- 22. Bảng CT_TIEM_VC
CREATE TABLE CT_TIEM_VC (
    MaVaccine nchar(10) NOT NULL,
    MaPhieu   nchar(10) NOT NULL,
    NhacLai   date,
    LieuLuong nvarchar(70),
    ThanhTien decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaVaccine, MaPhieu)
);

-- 23. Bảng GOI_TIEM_VC
CREATE TABLE GOI_TIEM_VC (
    MaGoi           nchar(10) NOT NULL PRIMARY KEY,
    TenGoi          nvarchar(50),
    ThoiHan         int NOT NULL CHECK (ThoiHan >= 0),
    GiamGia         decimal(18,2) NOT NULL CHECK (GiamGia >= 0),
    SoMuiTuongUng   int NOT NULL CHECK (SoMuiTuongUng >= 0),
    GhiChu          nvarchar(100)
);

-- 24. Bảng DANG_KI_GOI_TIEM
CREATE TABLE DANG_KI_GOI_TIEM (
    MaPhieu    nchar(10) NOT NULL,
    MaVaccine  nchar(10) NOT NULL,
    MaGoi      nchar(10) NOT NULL,
    NgayHetHan date,
    HieuLuc    bit NOT NULL,
    ThanhTien  decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaPhieu, MaVaccine, MaGoi)
);

-- 25. Bảng PHIEU_MUA_HANG
CREATE TABLE PHIEU_MUA_HANG (
    MaPhieu nchar(10) NOT NULL PRIMARY KEY
);

-- 26. Bảng CT_MUA_HANG
CREATE TABLE CT_MUA_HANG (
    MaPhieu   nchar(10) NOT NULL,
    MaMatHang nchar(10) NOT NULL,
    SoLuong   int NOT NULL CHECK (SoLuong >= 0),
    ThanhTien decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaPhieu, MaMatHang)
);

-- 27. Bảng DANH_GIA_SP
CREATE TABLE DANH_GIA_SP (
    MaPhieu       nchar(10) NOT NULL,
    MaMatHang     nchar(10) NOT NULL,
    DiemChatLuong decimal(4,2) NOT NULL CHECK (DiemChatLuong >= 0),
    BinhLuan      nvarchar(200),
    NgayDang      date,
    PRIMARY KEY (MaPhieu, MaMatHang)
);

-- 28. Bảng DANH_GIA_DV
CREATE TABLE DANH_GIA_DV (
    MaPhieu        nchar(10) NOT NULL PRIMARY KEY,
    DiemChatLuong  decimal(4,2) NOT NULL CHECK (DiemChatLuong >= 0),
    DiemThaiDoNV   decimal(4,2) NOT NULL CHECK (DiemThaiDoNV >= 0),
    DiemTongThe    decimal(4,2) NOT NULL CHECK (DiemTongThe >= 0),
    BinhLuan       nvarchar(200),
    NgayDang       date
);

-- 29. Bảng TON_KHO
CREATE TABLE TON_KHO (
    MaCN       nchar(10) NOT NULL,
    MaMatHang  nchar(10) NOT NULL,
    SoLuongTon int NOT NULL CHECK (SoLuongTon >= 0),
    PRIMARY KEY (MaCN, MaMatHang)
);



-----------------------------------------------------------------------------------------------------
-- PHẦN 2: THÊM RÀNG BUỘC KHÓA NGOẠI
-----------------------------------------------------------------------------------------------------

-- PHIEU_KHAM_BENH
ALTER TABLE PHIEU_KHAM_BENH ADD
    CONSTRAINT FK1_PKB_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu),
    CONSTRAINT FK2_PKB_TC FOREIGN KEY (MaTC) REFERENCES THU_CUNG(MaTC);

-- THUOC
ALTER TABLE THUOC ADD
    CONSTRAINT FK1_THUOC_MH FOREIGN KEY (MaThuoc) REFERENCES MAT_HANG(MaMatHang);

-- CT_DON_THUOC
ALTER TABLE CT_DON_THUOC ADD
    CONSTRAINT FK1_CTDT_THUOC FOREIGN KEY (MaThuoc) REFERENCES THUOC(MaThuoc),
    CONSTRAINT FK2_CTDT_PKB FOREIGN KEY (MaPhieu) REFERENCES PHIEU_KHAM_BENH(MaPhieu);

-- SAN_PHAM_KHAC
ALTER TABLE SAN_PHAM_KHAC ADD
    CONSTRAINT FK1_SPK_MH FOREIGN KEY (MaSP) REFERENCES MAT_HANG(MaMatHang);

-- VACCINE
ALTER TABLE VACCINE ADD
    CONSTRAINT FK1_VC_MH FOREIGN KEY (MaVaccine) REFERENCES MAT_HANG(MaMatHang);

-- PHIEU_TIEM_VACCINE
ALTER TABLE PHIEU_TIEM_VACCINE ADD
    CONSTRAINT FK1_PTV_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu),
    CONSTRAINT FK2_PTV_TC FOREIGN KEY (MaTC) REFERENCES THU_CUNG(MaTC);

-- CT_TIEM_VC
ALTER TABLE CT_TIEM_VC ADD
    CONSTRAINT FK1_CTV_VC FOREIGN KEY (MaVaccine) REFERENCES VACCINE(MaVaccine),
    CONSTRAINT FK2_CTV_PTV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_TIEM_VACCINE(MaPhieu);

-- DANG_KI_GOI_TIEM
ALTER TABLE DANG_KI_GOI_TIEM ADD
    CONSTRAINT FK1_DK_PTV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_TIEM_VACCINE(MaPhieu),
    CONSTRAINT FK2_DK_VC FOREIGN KEY (MaVaccine) REFERENCES VACCINE(MaVaccine),
    CONSTRAINT FK3_DK_GOI FOREIGN KEY (MaGoi) REFERENCES GOI_TIEM_VC(MaGoi);

-- PHIEU_MUA_HANG
ALTER TABLE PHIEU_MUA_HANG ADD
    CONSTRAINT FK1_PMH_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu);

-- CT_MUA_HANG
ALTER TABLE CT_MUA_HANG ADD
    CONSTRAINT FK1_CTMH_PMH FOREIGN KEY (MaPhieu) REFERENCES PHIEU_MUA_HANG(MaPhieu),
    CONSTRAINT FK2_CTMH_MH FOREIGN KEY (MaMatHang) REFERENCES MAT_HANG(MaMatHang);

-- DANH_GIA_SP
ALTER TABLE DANH_GIA_SP ADD
    CONSTRAINT FK1_DGSP_CTMH FOREIGN KEY (MaPhieu,MaMatHang) REFERENCES CT_MUA_HANG(MaPhieu,MaMatHang);

-- DANH_GIA_DV
ALTER TABLE DANH_GIA_DV ADD
    CONSTRAINT FK1_DGDV_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu);

--TON_KHO
ALTER TABLE TON_KHO ADD
    CONSTRAINT FK1_TK_CN FOREIGN KEY (MaCN) REFERENCES CHI_NHANH(MaCN),
    CONSTRAINT FK2_TK_MH FOREIGN KEY (MaMatHang) REFERENCES MAT_HANG(MaMatHang);
