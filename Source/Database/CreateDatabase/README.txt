chèn các bảng + dl, khóa ngoại vào nhá
chú thích tách biệt từng bảng nha
CREATE DATABASE HAPPYPET
GO

USE HAPPYPET
GO

--Tạo bảng (15-29)
-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng PHIEU_KHAM_BENH
CREATE TABLE PHIEU_KHAM_BENH (
    MaPhieu        nchar(10) NOT NULL PRIMARY KEY,
    MaTC           nchar(10) NOT NULL,
    TrieuChung     nvarchar(200) NOT NULL,
    ChanDoan       nvarchar(200) NOT NULL,
    NgayHenTaiKham date,
    TongTienKham   decimal(18,2) DEFAULT 0 NOT NULL CHECK (TongTienKham >= 0)
);

ALTER TABLE PHIEU_KHAM_BENH ADD
	CONSTRAINT FK1_PKB_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu),
	CONSTRAINT FK2_PKB_TC FOREIGN KEY (MaTC) REFERENCES THU_CUNG(MaPhieu)


------------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng MAT_HANG
CREATE TABLE MAT_HANG (
    MaMatHang    nchar(10) NOT NULL PRIMARY KEY,
    TenMatHang   nvarchar(50) NOT NULL,
    HangSX       nvarchar(50),
    NgaySanXuat  date,
    NgayHetHan   date,
    DonGia       decimal(18,2) NOT NULL CHECK (DonGia >= 0),
    Loai         varchar(3) NOT NULL CHECK (Loai IN ('T','VC','SPK'))
);

-- MAT_HANG không có FK


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng THUOC
CREATE TABLE THUOC (
    MaThuoc     nchar(10) NOT NULL PRIMARY KEY,
    TacDungPhu  nvarchar(200),
    DangBaoChe  nvarchar(70),
    LoaiThuoc   nvarchar(70)
);

ALTER TABLE THUOC ADD
    CONSTRAINT FK1_THUOC_MH FOREIGN KEY (MaThuoc) REFERENCES MAT_HANG(MaMatHang);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng CT_DON_THUOC
CREATE TABLE CT_DON_THUOC (
    MaThuoc   nchar(10) NOT NULL,
    MaPhieu   nchar(10) NOT NULL,
    LieuLuong nvarchar(50),
    SoLuong   int NOT NULL CHECK (SoLuong >= 0),
    ThanhTien decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaThuoc, MaPhieu)
);

ALTER TABLE CT_DON_THUOC ADD
    CONSTRAINT FK1_CTDT_THUOC FOREIGN KEY (MaThuoc) REFERENCES THUOC(MaThuoc),
    CONSTRAINT FK2_CTDT_PKB FOREIGN KEY (MaPhieu) REFERENCES PHIEU_KHAM_BENH(MaPhieu);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng SAN_PHAM_KHAC
CREATE TABLE SAN_PHAM_KHAC (
    MaSP    nchar(10) NOT NULL PRIMARY KEY,
    LoaiSP  nvarchar(70)
);

ALTER TABLE SAN_PHAM_KHAC ADD
    CONSTRAINT FK1_SPK_MH FOREIGN KEY (MaSP) REFERENCES MAT_HANG(MaMatHang);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng VACCINE
CREATE TABLE VACCINE (
    MaVaccine     nchar(10) NOT NULL PRIMARY KEY,
    ChongChiDinh  nvarchar(200)
);

ALTER TABLE VACCINE ADD
    CONSTRAINT FK1_VC_MH FOREIGN KEY (MaVaccine) REFERENCES MAT_HANG(MaMatHang);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng PHIEU_TIEM_VACCINE
CREATE TABLE PHIEU_TIEM_VACCINE (
    MaPhieu nchar(10) NOT NULL PRIMARY KEY,
    MaTC    nchar(10) NOT NULL
);

ALTER TABLE PHIEU_TIEM_VACCINE ADD
    CONSTRAINT FK1_PTV_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu),
    CONSTRAINT FK2_PTV_TC FOREIGN KEY (MaTC) REFERENCES THU_CUNG(MaTC);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng CT_TIEM_VC
CREATE TABLE CT_TIEM_VC (
    MaVaccine nchar(10) NOT NULL,
    MaPhieu   nchar(10) NOT NULL,
    NhacLai   date,
    LieuLuong nvarchar(70),
    ThanhTien decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaVaccine, MaPhieu)
);

ALTER TABLE CT_TIEM_VC ADD
    CONSTRAINT FK1_CTV_VC FOREIGN KEY (MaVaccine) REFERENCES VACCINE(MaVaccine),
    CONSTRAINT FK2_CTV_PTV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_TIEM_VACCINE(MaPhieu);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng GOI_TIEM_VC
CREATE TABLE GOI_TIEM_VC (
    MaGoi           nchar(10) NOT NULL PRIMARY KEY,
    TenGoi          nvarchar(50),
    ThoiHan         int NOT NULL CHECK (ThoiHan >= 0),
    GiamGia         decimal(18,2) NOT NULL CHECK (GiamGia >= 0),
    SoMuiTuongUng   int NOT NULL CHECK (SoMuiTuongUng >= 0),
    GhiChu          nvarchar(100)
);

-- GOI_TIEM_VC không có FK

-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng DANG_KI_GOI_TIEM
CREATE TABLE DANG_KI_GOI_TIEM (
    MaPhieu    nchar(10) NOT NULL,
    MaVaccine  nchar(10) NOT NULL,
    MaGoi      nchar(10) NOT NULL,
    NgayHetHan date,
    HieuLuc    bit NOT NULL,
    ThanhTien  decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaPhieu, MaVaccine, MaGoi)
);

ALTER TABLE DANG_KI_GOI_TIEM ADD
    CONSTRAINT FK1_DK_PTV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_TIEM_VACCINE(MaPhieu),
    CONSTRAINT FK2_DK_VC FOREIGN KEY (MaVaccine) REFERENCES VACCINE(MaVaccine),
    CONSTRAINT FK3_DK_GOI FOREIGN KEY (MaGoi) REFERENCES GOI_TIEM_VC(MaGoi);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng PHIEU_MUA_HANG
CREATE TABLE PHIEU_MUA_HANG (
    MaPhieu nchar(10) NOT NULL PRIMARY KEY
);

ALTER TABLE PHIEU_MUA_HANG ADD
    CONSTRAINT FK1_PMH_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng CT_MUA_HANG
CREATE TABLE CT_MUA_HANG (
    MaPhieu   nchar(10) NOT NULL,
    MaMatHang nchar(10) NOT NULL,
    SoLuong   int NOT NULL CHECK (SoLuong >= 0),
    ThanhTien decimal(18,2) NOT NULL CHECK (ThanhTien >= 0),
    PRIMARY KEY (MaPhieu, MaMatHang)
);

ALTER TABLE CT_MUA_HANG ADD
    CONSTRAINT FK1_CTMH_PMH FOREIGN KEY (MaPhieu) REFERENCES PHIEU_MUA_HANG(MaPhieu),
    CONSTRAINT FK2_CTMH_MH FOREIGN KEY (MaMatHang) REFERENCES MAT_HANG(MaMatHang);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng DANH_GIA_SP
CREATE TABLE DANH_GIA_SP (
    MaPhieu       nchar(10) NOT NULL,
    MaMatHang     nchar(10) NOT NULL,
    DiemChatLuong decimal(4,2) NOT NULL CHECK (DiemChatLuong >= 0),
    BinhLuan      nvarchar(200),
    NgayDang      date,
    PRIMARY KEY (MaPhieu, MaMatHang)
);

ALTER TABLE DANH_GIA_SP ADD
    CONSTRAINT FK1_DGSP_CTMH FOREIGN KEY (MaMatHang) REFERENCES CT_MUA_HANG(MaMatHang),
    CONSTRAINT FK2_DGSP_PMH FOREIGN KEY (MaPhieu) REFERENCES PHIEU_MUA_HANG(MaPhieu);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng DANH_GIA_DV
CREATE TABLE DANH_GIA_DV (
    MaPhieu        nchar(10) NOT NULL PRIMARY KEY,
    DiemChatLuong  decimal(4,2) NOT NULL CHECK (DiemChatLuong >= 0),
    DiemThaiDoNV   decimal(4,2) NOT NULL CHECK (DiemThaiDoNV >= 0),
    DiemTongThe    decimal(4,2) NOT NULL CHECK (DiemTongThe >= 0),
    BinhLuan       nvarchar(200),
    NgayDang       date
);

ALTER TABLE DANH_GIA_DV ADD
    CONSTRAINT FK1_DGDV_PDV FOREIGN KEY (MaPhieu) REFERENCES PHIEU_DV(MaPhieu);


-----------------------------------------------------------------------------------------------------
-- Tạo bảng và ràng buộc khóa ngoại cho bảng TON_KHO
CREATE TABLE TON_KHO (
    MaCN       nchar(10) NOT NULL,
    MaMatHang  nchar(10) NOT NULL,
    SoLuongTon int NOT NULL CHECK (SoLuongTon >= 0),
    PRIMARY KEY (MaCN, MaMatHang)
);

ALTER TABLE TON_KHO ADD
    CONSTRAINT FK1_TK_CN FOREIGN KEY (MaCN) REFERENCES CHI_NHANH(MaCN),
    CONSTRAINT FK2_TK_MH FOREIGN KEY (MaMatHang) REFERENCES MAT_HANG(MaMatHang);
