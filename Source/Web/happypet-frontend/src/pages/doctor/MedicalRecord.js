import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const MedicalRecord = ({ maPhieu, thongTinThuCung }) => {
    const [chanDoan, setChanDoan] = useState('');
    const [ngayTaiKham, setNgayTaiKham] = useState('');
    const [donThuoc, setDonThuoc] = useState([]);
    
    // 🔥 STATE TÌM KIẾM THUỐC
    const [searchMedicine, setSearchMedicine] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [showMedicineList, setShowMedicineList] = useState(false);
    
    // Tìm kiếm thuốc
    const handleSearchMedicine = async () => {
        if (!searchMedicine.trim()) {
            Swal.fire('Lỗi', 'Vui lòng nhập tên thuốc', 'warning');
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/doctor/search-medicines?keyword=${searchMedicine}&loai=Thuốc`);
            setMedicines(res.data);
            setShowMedicineList(true);
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Không tìm thấy thuốc', 'error');
        }
    };
    
    // Thêm thuốc vào đơn
    const handleAddMedicine = (medicine) => {
        const exists = donThuoc.find(t => t.MaMatHang === medicine.MaMatHang);
        if (exists) {
            Swal.fire('Thông báo', 'Thuốc đã có trong đơn', 'info');
            return;
        }
        setDonThuoc([...donThuoc, { 
            ...medicine, 
            SoLuong: 1, 
            LieuLuong: '' 
        }]);
        setShowMedicineList(false);
        setSearchMedicine('');
    };
    
    // Xóa thuốc khỏi đơn
    const handleRemoveMedicine = (maThuoc) => {
        setDonThuoc(donThuoc.filter(t => t.MaMatHang !== maThuoc));
    };

    // Lưu chẩn đoán (SP 1)
    const handleSaveInfo = async () => {
        try {
            await axios.post('/api/doctor/update-exam', {
                MaPhieu: maPhieu,
                ChanDoan: chanDoan,
                NgayHenTaiKham: ngayTaiKham
            });
            Swal.fire('Thành công', 'Đã lưu chẩn đoán chuyên môn', 'success');
        } catch (err) { Swal.fire('Lỗi', err.response.data.message, 'error'); }
    };

    // Kết thúc khám (SP 4)
    const handleComplete = async () => {
        const confirm = await Swal.fire({
            title: 'Hoàn tất khám?',
            text: "Phiếu sẽ chuyển sang bộ phận thanh toán!",
            icon: 'question', showCancelButton: true
        });
        if (confirm.isConfirmed) {
            await axios.post('/api/doctor/complete-exam', { MaPhieu: maPhieu });
            window.location.reload(); 
        }
    };

    return (
        <div className="doctor-card" style={{padding: '20px', background: '#fff', borderRadius: '10px'}}>
            <h3>📋 Phiếu Khám: {maPhieu}</h3>
            <p>🐾 Bệnh nhân: <b>{thongTinThuCung.Ten}</b></p>
            <hr/>
            
            <div className="form-group">
                <label>👨‍⚕️ Chẩn đoán bệnh:</label>
                <textarea 
                    className="form-control" 
                    value={chanDoan} 
                    onChange={(e) => setChanDoan(e.target.value)}
                    placeholder="Nhập tình trạng bệnh..."
                />
            </div>

            <div className="form-group" style={{marginTop: '15px'}}>
                <label>📅 Hẹn tái khám (nếu có):</label>
                <input type="date" className="form-control" value={ngayTaiKham} onChange={(e) => setNgayTaiKham(e.target.value)} />
            </div>

            <button onClick={handleSaveInfo} className="btn btn-primary" style={{marginTop: '15px'}}>💾 Lưu kết quả</button>

            <div className="prescription-section" style={{marginTop: '30px'}}>
                <h4>💊 Đơn thuốc</h4>
                
                {/* 🔥 TÌM KIẾM THUỐC */}
                <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                    <input 
                        type="text"
                        className="form-control"
                        placeholder="🔍 Tìm kiếm thuốc..."
                        value={searchMedicine}
                        onChange={(e) => setSearchMedicine(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchMedicine()}
                        style={{flex: 1}}
                    />
                    <button 
                        onClick={handleSearchMedicine}
                        className="btn btn-primary"
                        style={{padding: '10px 20px'}}
                    >
                        🔍 Tìm
                    </button>
                </div>
                
                {/* KẾT QUẢ TÌM KIẾM */}
                {showMedicineList && medicines.length > 0 && (
                    <div style={{
                        maxHeight: '200px', 
                        overflowY: 'auto', 
                        border: '1px solid #ddd', 
                        borderRadius: '5px',
                        marginBottom: '15px'
                    }}>
                        {medicines.map(med => (
                            <div 
                                key={med.MaMatHang}
                                onClick={() => handleAddMedicine(med)}
                                style={{
                                    padding: '10px',
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                                onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                                <strong>{med.TenMatHang}</strong><br/>
                                <small style={{color: '#666'}}>
                                    Giá: {med.DonGia?.toLocaleString()}đ - Tồn: {med.SoLuongTon}
                                </small>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* DANH SÁCH THUỐC ĐÃ KÊ */}
                {donThuoc.length > 0 && (
                    <table className="table" style={{width: '100%', marginTop: '15px'}}>
                        <thead>
                            <tr>
                                <th>Tên thuốc</th>
                                <th>Số lượng</th>
                                <th>Liều lượng</th>
                                <th>Đơn giá</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {donThuoc.map((thuoc, idx) => (
                                <tr key={idx}>
                                    <td>{thuoc.TenMatHang}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={thuoc.SoLuong}
                                            onChange={(e) => {
                                                const newList = [...donThuoc];
                                                newList[idx].SoLuong = e.target.value;
                                                setDonThuoc(newList);
                                            }}
                                            style={{width: '60px', padding: '5px'}}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text"
                                            placeholder="VD: Ngày 2 lần"
                                            value={thuoc.LieuLuong}
                                            onChange={(e) => {
                                                const newList = [...donThuoc];
                                                newList[idx].LieuLuong = e.target.value;
                                                setDonThuoc(newList);
                                            }}
                                            style={{width: '150px', padding: '5px'}}
                                        />
                                    </td>
                                    <td>{thuoc.DonGia?.toLocaleString()}đ</td>
                                    <td>
                                        <button 
                                            onClick={() => handleRemoveMedicine(thuoc.MaMatHang)}
                                            style={{
                                                background: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <button onClick={handleComplete} className="btn btn-success" style={{width: '100%', marginTop: '40px', fontWeight: 'bold'}}>
                🏁 HOÀN TẤT & CHUYỂN THANH TOÁN
            </button>
        </div>
    );
};