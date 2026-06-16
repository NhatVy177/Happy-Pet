import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './Doctor.css';

const VaccineDetail = () => {
    const { maPhieu } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [patientInfo, setPatientInfo] = useState(null);
    const [vaccines, setVaccines] = useState([]);
    const [availableVaccines, setAvailableVaccines] = useState([]);
    const [packages, setPackages] = useState([]);
    const [packageInfo, setPackageInfo] = useState(null); // Thông tin gói tiêm đã đăng ký
    const [shotsFired, setShotsFired] = useState(0); // Số mũi đã tiêm trong gói
    
    // State cho thêm vaccine
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedVaccine, setSelectedVaccine] = useState('');
    const [lieuLuong, setLieuLuong] = useState('1 liều');
    const [isBooster, setIsBooster] = useState(false);
    const [searchVaccine, setSearchVaccine] = useState(''); // 🔥 TÌM KIẾM VACCINE
    
    // State cho thêm gói
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState('');
    const [vaccineForPackage, setVaccineForPackage] = useState('');
    
    // 🔥 State cho xác nhận sức khỏe
    const [healthChecked, setHealthChecked] = useState(false);
    
    // 🔥 State cho lịch sử tiêm
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [vaccineHistory, setVaccineHistory] = useState([]);
    
    // 🔥 State cho check trạng thái hoàn tất
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        fetchData();
    }, [maPhieu]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            // Lấy thông tin bệnh nhân
            const patientRes = await axios.get(`http://localhost:5000/api/doctor/patient-info/${maPhieu}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatientInfo(patientRes.data);
            
            // Lấy danh sách vaccine đã tiêm
            const vaccinesRes = await axios.get(`http://localhost:5000/api/doctor/exam-detail/${maPhieu}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVaccines(vaccinesRes.data.danhSachVaccine || []);
            const goiInfo = vaccinesRes.data.goiTiem;
            setPackageInfo(goiInfo);
            
            // 🔥 Check trạng thái hoàn tất
            const phieuInfo = vaccinesRes.data;
            if (phieuInfo.TrangThai === 'DHT') {
                setIsCompleted(true);
            }
            
            // 🔥 Tính số mũi đã tiêm trong gói từ API check-ongoing-package
            if (goiInfo && patientRes.data.MaTC) {
                try {
                    const checkRes = await axios.get(`http://localhost:5000/api/booking/check-ongoing-package/${patientRes.data.MaTC}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (checkRes.data && checkRes.data.SoMuiDaTiem !== undefined) {
                        setShotsFired(checkRes.data.SoMuiDaTiem);
                        console.log('✅ Số mũi đã tiêm từ API:', checkRes.data.SoMuiDaTiem);
                    }
                } catch (err) {
                    console.log('⚠️ Không lấy được số mũi đã tiêm, dùng logic cũ');
                    // Fallback: đếm vaccine trong phiếu nếu API lỗi
                    const isPhieuHoanTat = phieuInfo.TrangThai === 'DHT';
                    const muiTrongPhieuHienTai = (vaccinesRes.data.danhSachVaccine || []).filter(
                        v => v.MaVaccine === goiInfo.MaVaccine
                    ).length;
                    setShotsFired(isPhieuHoanTat ? muiTrongPhieuHienTai : 0);
                }
            }
            
            // Lấy danh sách vaccine có sẵn
            const availRes = await axios.get('http://localhost:5000/api/doctor/search-medicines', {
                headers: { Authorization: `Bearer ${token}` },
                params: { tuKhoa: '', loai: 'Vaccine' }
            });
            setAvailableVaccines(availRes.data);
            
            // Lấy danh sách gói tiêm
            const packRes = await axios.get('http://localhost:5000/api/doctor/vaccine-packages', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPackages(packRes.data);
            
        } catch (error) {
            console.error('Lỗi:', error);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu!', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Xác nhận sức khỏe (chỉ UI, không lưu DB)
    const handleHealthCheck = () => {
        if (healthChecked) {
            setHealthChecked(false);
            Swal.fire({
                icon: 'info',
                title: 'Đã hủy xác nhận',
                text: 'Thú cưng chưa được xác nhận đủ điều kiện tiêm vaccine.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                title: 'Xác nhận sức khỏe',
                html: `
                    <p>Bác sĩ xác nhận thú cưng <strong>${patientInfo?.TenThuCung || ''}</strong> đủ điều kiện sức khỏe để tiêm vaccine?</p>
                    <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                        ✓ Nhiệt độ bình thường<br/>
                        ✓ Không có dấu hiệu bệnh lý<br/>
                        ✓ Tinh thần tốt
                    </p>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '✓ Xác nhận',
                cancelButtonText: 'Hủy',
                confirmButtonColor: '#4caf50'
            }).then((result) => {
                if (result.isConfirmed) {
                    setHealthChecked(true);
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã xác nhận!',
                        text: 'Thú cưng đủ điều kiện sức khỏe để tiêm vaccine.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
        }
    };
    
    // 🔥 Xem lịch sử tiêm vaccine
    const handleViewHistory = async () => {
        if (!patientInfo?.MaTC) {
            return Swal.fire('Lỗi', 'Không tìm thấy thông tin thú cưng!', 'error');
        }
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/doctor/vaccine-history/${patientInfo.MaTC}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVaccineHistory(res.data);
            setShowHistoryModal(true);
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể tải lịch sử tiêm!', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddVaccine = async () => {
        if (!selectedVaccine) {
            return Swal.fire('Lỗi', 'Vui lòng chọn vaccine!', 'warning');
        }
        
        if (!healthChecked) {
            return Swal.fire({
                icon: 'warning',
                title: 'Chưa xác nhận sức khỏe!',
                text: 'Vui lòng xác nhận thú cưng đủ điều kiện sức khỏe trước khi tiêm vaccine.',
            });
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/doctor/add-vaccine', {
                MaPhieu: maPhieu,
                MaVaccine: selectedVaccine,
                LieuLuong: lieuLuong,
                NhacLai: isBooster ? 1 : 0,
                TheoGoi: isBooster ? 1 : 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Thành công', 'Đã thêm vaccine!', 'success');
            setShowAddModal(false);
            setSelectedVaccine('');
            setLieuLuong('1 liều');
            setIsBooster(false);
            fetchData();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể thêm vaccine!', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPackage = async () => {
        if (!vaccineForPackage || !selectedPackage) {
            return Swal.fire('Lỗi', 'Vui lòng chọn đầy đủ thông tin!', 'warning');
        }
        
        // 🔥 CHẶN ĐĂNG KÝ GÓI MỚI CÙNG VACCINE ĐÃ CÓ GÓI
        if (packageInfo && packageInfo.HieuLuc && vaccineForPackage === packageInfo.MaVaccine) {
            return Swal.fire({
                icon: 'error',
                title: 'Không thể đăng ký!',
                html: `
                    <p>Bạn đã có gói tiêm <strong style="color: #1976d2">${packageInfo.TenGoi}</strong> cho vaccine này!</p>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        📌 Vui lòng hoàn thành gói hiện tại (${shotsFired}/${packageInfo.SoMuiTuongUng} mũi) hoặc chọn vaccine khác.
                    </p>
                `,
            });
        }
        
        if (!healthChecked) {
            return Swal.fire({
                icon: 'warning',
                title: 'Chưa xác nhận sức khỏe!',
                text: 'Vui lòng xác nhận thú cưng đủ điều kiện sức khỏe trước khi tiêm vaccine.',
            });
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/doctor/add-vaccine-package', {
                MaPhieu: maPhieu,
                MaVaccine: vaccineForPackage,
                MaGoi: selectedPackage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Thành công', 'Đã đăng ký gói tiêm!', 'success');
            setShowPackageModal(false);
            setVaccineForPackage('');
            setSelectedPackage('');
            fetchData();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể đăng ký gói!', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveVaccine = async (maVaccine) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Bạn có chắc muốn xóa vaccine này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                await axios.post('http://localhost:5000/api/doctor/remove-vaccine', {
                    MaPhieu: maPhieu,
                    MaVaccine: maVaccine
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire('Thành công', 'Đã xóa vaccine!', 'success');
                fetchData();
            } catch (error) {
                Swal.fire('Lỗi', error.response?.data?.message || 'Không thể xóa!', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleComplete = async () => {
        if (vaccines.length === 0) {
            return Swal.fire('Lỗi', 'Phải thêm ít nhất 1 vaccine trước khi kết thúc!', 'warning');
        }
        
        if (!healthChecked) {
            return Swal.fire({
                icon: 'warning',
                title: 'Chưa xác nhận sức khỏe!',
                text: 'Vui lòng xác nhận thú cưng đủ điều kiện sức khỏe.',
            });
        }

        const result = await Swal.fire({
            title: 'Hoàn tất tiêm vaccine?',
            text: 'Xác nhận đã hoàn thành quy trình tiêm vaccine.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Hoàn tất',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                await axios.post('http://localhost:5000/api/doctor/complete-vaccine', {
                    MaPhieu: maPhieu
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire('Thành công', 'Đã hoàn tất tiêm vaccine!', 'success');
                // 🔥 Không navigate về dashboard, chuyển sang trạng thái hoàn tất
                setIsCompleted(true);
            } catch (error) {
                Swal.fire('Lỗi', error.response?.data?.message || 'Không thể hoàn tất!', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && !patientInfo) {
        return <div className="loading-container">⏳ Đang tải...</div>;
    }

    return (
        <div className="exam-detail-container">
            <div className="exam-header">
                <button onClick={() => navigate('/doctor/dashboard')} className="btn-back">
                    ← Quay lại
                </button>
                <h2>💉 Tiêm Vaccine - #{maPhieu}</h2>
                {/* 🔥 NÚT XEM LỊCH SỬ TIÊM */}
                <button 
                    onClick={handleViewHistory}
                    className="btn-secondary"
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        background: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                    }}
                >
                    📋 Xem Lịch Sử Tiêm
                </button>
            </div>

            {/* Thông tin bệnh nhân */}
            <div className="patient-info-card">
                <h3>🐾 Thông Tin Bệnh Nhân</h3>
                <div className="info-grid">
                    <div><strong>Thú cưng:</strong> {patientInfo?.TenThuCung}</div>
                    <div><strong>Loại:</strong> {patientInfo?.LoaiThuCung}</div>
                    <div><strong>Giống:</strong> {patientInfo?.GiongThuCung || 'N/A'}</div>
                    <div><strong>Chủ nuôi:</strong> {patientInfo?.ChuNuoi}</div>
                    <div><strong>SĐT:</strong> {patientInfo?.SDT}</div>
                </div>
            </div>

            {/* 🔥 NÚT XÁC NHẬN SỨC KHỎE */}
            <div className="health-check-card" style={{
                background: healthChecked ? '#e8f5e9' : '#fff3e0',
                border: `2px solid ${healthChecked ? '#4caf50' : '#ff9800'}`,
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'center'
            }}>
                <h3 style={{margin: '0 0 15px 0', color: healthChecked ? '#4caf50' : '#ff9800'}}>
                    {healthChecked ? '✓ Đã xác nhận sức khỏe' : '⚠️ Chưa xác nhận sức khỏe'}
                </h3>
                <p style={{margin: '0 0 15px 0', fontSize: '0.9em', color: '#666'}}>
                    {healthChecked 
                        ? 'Thú cưng đủ điều kiện sức khỏe để tiêm vaccine' 
                        : 'Vui lòng kiểm tra và xác nhận sức khỏe thú cưng trước khi tiêm'}
                </p>
                <button 
                    onClick={handleHealthCheck}
                    className="btn-primary"
                    style={{
                        background: healthChecked ? '#f44336' : '#4caf50',
                        padding: '12px 30px',
                        fontSize: '16px'
                    }}
                >
                    {healthChecked ? '✕ Hủy xác nhận' : '✓ Xác nhận đủ điều kiện'}
                </button>
            </div>

            {/* Thông tin gói tiêm đã đăng ký (nếu có) - CHỈ HIỆN KHI CÓ GÓI VÀ ĐÃ TIÊM ÍT NHẤT 1 MŨI */}
            {packageInfo && shotsFired > 0 && (
                <div className="section-card" style={{
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    border: '3px solid #ff9800',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)'
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                        <h3 style={{color: '#e65100', margin: 0}}>🎁 Gói Tiêm Đang Áp Dụng</h3>
                        <span style={{
                            background: packageInfo.HieuLuc ? '#4caf50' : '#f44336',
                            color: 'white',
                            padding: '5px 15px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 'bold'
                        }}>
                            {packageInfo.HieuLuc ? '✓ Còn hiệu lực' : '✕ Hết hạn'}
                        </span>
                    </div>
                    
                    <div style={{
                        background: 'white',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid #ffcc80'
                    }}>
                        <div className="info-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div><strong>📦 Tên gói:</strong> <span style={{color: '#1976d2'}}>{packageInfo.TenGoi}</span></div>
                            <div><strong>💉 Vaccine:</strong> {packageInfo.TenVaccine}</div>
                            <div><strong>📊 Tổng số mũi:</strong> {packageInfo.SoMuiTuongUng} mũi</div>
                            <div><strong>📅 Khoảng cách:</strong> {packageInfo.ThoiHan} ngày/mũi</div>
                            <div>
                                <strong>✅ Đã tiêm:</strong> <span style={{
                                    color: '#4caf50',
                                    fontWeight: '700',
                                    fontSize: '16px'
                                }}>{shotsFired}/{packageInfo.SoMuiTuongUng} mũi</span>
                            </div>
                            <div>
                                <strong>⏳ Còn lại:</strong> <span style={{
                                    color: '#f44336',
                                    fontWeight: '700',
                                    fontSize: '16px'
                                }}>{packageInfo.SoMuiTuongUng - shotsFired} mũi</span>
                            </div>
                            <div><strong>🎟️ Giảm giá:</strong> {(packageInfo.GiamGia * 100).toFixed(0)}%</div>
                            <div><strong>⏰ Hết hạn:</strong> {packageInfo.NgayHetHan ? new Date(packageInfo.NgayHetHan).toLocaleDateString('vi-VN') : 'N/A'}</div>
                            <div style={{gridColumn: 'span 2'}}>
                                <strong>💰 Thành tiền gói:</strong> <span style={{color: '#f44336', fontWeight: '700', fontSize: '18px'}}>{packageInfo.ThanhTien?.toLocaleString()} đ</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{
                        padding: '12px',
                        background: shotsFired === 0 ? '#e3f2fd' : '#e8f5e9',
                        borderRadius: '8px',
                        border: `2px dashed ${shotsFired === 0 ? '#1976d2' : '#4caf50'}`,
                        fontSize: '14px'
                    }}>
                        <strong style={{color: shotsFired === 0 ? '#1565c0' : '#2e7d32'}}>
                            {shotsFired === 0 ? '🆕 Gói mới:' : '🔄 Mũi nhắc lại:'}
                        </strong>{' '}
                        {shotsFired === 0 
                            ? 'Đây là gói mới đã đăng ký. Nhấn nút "Tiêm Mũi Đầu" bên dưới để bắt đầu.'
                            : `Đã tiêm mũi ${shotsFired}. Nhấn "Tiêm Mũi Nhắc Lại" để tiêm mũi ${shotsFired + 1} (MIỄN PHÍ trong gói).`
                        }
                    </div>
                </div>
            )}

            {/* Danh sách vaccine đã tiêm */}
            <div className="section-card">`
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h3>💉 Danh Sách Vaccine Đã Chọn ({vaccines.length})</h3>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button 
                            onClick={() => setShowAddModal(true)} 
                            className="btn-primary" 
                            style={{
                                padding: '12px 24px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                            }}
                        >
                            ➕ Thêm Vaccine Lẻ
                        </button>
                        {/* CHỈ HIỆN NÚT TIÊM GÓI KHI CÓ GÓI, CÒN HIỆU LỰC VÀ CHƯA TIÊM ĐỦ */}
                        {packageInfo && packageInfo.HieuLuc && shotsFired > 0 && shotsFired < packageInfo.SoMuiTuongUng ? (
                            <button 
                                onClick={() => {
                                    // Tự động chọn vaccine từ gói và đánh dấu TheoGoi
                                    setSelectedVaccine(packageInfo.MaVaccine);
                                    setLieuLuong(`Mũi ${shotsFired + 1}/${packageInfo.SoMuiTuongUng}`);
                                    setIsBooster(true);
                                    setShowAddModal(true);
                                }}
                                className="btn-secondary"
                                style={{
                                    padding: '12px 24px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    background: '#ff6b6b',
                                    color: 'white',
                                    boxShadow: '0 3px 10px rgba(255, 107, 107, 0.4)'
                                }}
                            >
                                🔄 Tiêm Mũi Nhắc Lại ({shotsFired + 1}/{packageInfo.SoMuiTuongUng})
                            </button>
                        ) : null}
                        
                        <button 
                            onClick={() => setShowPackageModal(true)} 
                            className="btn-secondary"
                            style={{
                                padding: '12px 24px',
                                fontSize: '15px',
                                fontWeight: 'bold'
                            }}
                        >
                            📦 Đăng Ký Gói Mới (Vaccine Khác)
                        </button>
                    </div>
                </div>
                
                {vaccines.length === 0 ? (
                    <div style={{
                        textAlign: 'center', 
                        padding: '40px 20px',
                        background: '#f5f5f5',
                        borderRadius: '8px',
                        border: '2px dashed #ddd'
                    }}>
                        <p style={{fontSize: '18px', color: '#666', marginBottom: '10px'}}>
                            📝 Chưa có vaccine nào được chọn
                        </p>
                        <p style={{fontSize: '14px', color: '#999'}}>
                            Nhấn nút <strong>"Thêm Vaccine Lẻ"</strong> hoặc <strong>"Đăng Ký Gói"</strong> để bắt đầu
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{width: '40%'}}>Tên Vaccine</th>
                                    <th style={{width: '15%'}}>Liều Lượng</th>
                                    <th style={{width: '15%'}}>Mũi Nhắc Lại</th>
                                    <th style={{width: '20%'}}>Thành Tiền</th>
                                    <th style={{width: '10%'}}>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vaccines.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{fontWeight: '500'}}>{item.TenMatHang}</td>
                                        <td style={{textAlign: 'center', fontSize: '15px'}}>
                                            <span style={{
                                                padding: '4px 12px',
                                                background: packageInfo && item.MaVaccine === packageInfo.MaVaccine ? '#fff3e0' : '#e3f2fd',
                                                borderRadius: '4px',
                                                fontWeight: '600',
                                                color: packageInfo && item.MaVaccine === packageInfo.MaVaccine ? '#e65100' : '#1976d2',
                                                border: packageInfo && item.MaVaccine === packageInfo.MaVaccine ? '1px solid #ff9800' : 'none'
                                            }}>
                                                {packageInfo && item.MaVaccine === packageInfo.MaVaccine 
                                                    ? `Mũi ${shotsFired + 1}/${packageInfo.SoMuiTuongUng}` 
                                                    : (item.LieuLuong || '1 liều')}
                                            </span>
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            {item.NhacLai ? (
                                                <span style={{color: '#4caf50', fontWeight: 'bold'}}>✓ Có</span>
                                            ) : (
                                                <span style={{color: '#999'}}>Không</span>
                                            )}
                                        </td>
                                        <td style={{textAlign: 'right', fontWeight: '600', color: '#f44336'}}>
                                            {item.ThanhTien?.toLocaleString()} đ
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            <button 
                                                onClick={() => handleRemoveVaccine(item.MaVaccine)}
                                                className="btn-delete"
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                🗑️ Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{background: '#f5f5f5', fontWeight: 'bold', fontSize: '16px'}}>
                                    <td colSpan="3" style={{textAlign: 'right', padding: '12px'}}>
                                        TỔNG CỘNG:
                                    </td>
                                    <td style={{textAlign: 'right', color: '#f44336', padding: '12px'}}>
                                        {vaccines.reduce((sum, item) => sum + (item.ThanhTien || 0), 0).toLocaleString()} đ
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </>
                )}
            </div>

            {/* 🔥 NÚT HÀNH ĐỘNG: Hoàn tất / Xuất hóa đơn / Đã xuất */}
            <div style={{textAlign: 'center', marginTop: '30px'}}>
                {!isCompleted ? (
                    // Chưa hoàn tất → Hiển thị nút Hoàn tất
                    <button 
                        onClick={handleComplete} 
                        disabled={loading || vaccines.length === 0 || !healthChecked}
                        className="btn-success"
                        style={{
                            padding: '15px 40px', 
                            fontSize: '18px',
                            cursor: (vaccines.length === 0 || !healthChecked) ? 'not-allowed' : 'pointer',
                            opacity: (vaccines.length === 0 || !healthChecked) ? 0.5 : 1
                        }}
                    >
                        ✓ Hoàn Tất Tiêm Vaccine
                    </button>
                ) : (
                    // Đã hoàn tất → Hiển thị badge và nút quay lại
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
                        <div style={{
                            backgroundColor: '#e8f5e9',
                            padding: '15px 25px',
                            borderRadius: '10px',
                            border: '2px solid #4caf50',
                            marginBottom: '10px'
                        }}>
                            <span style={{color: '#4caf50', fontSize: '16px', fontWeight: '600'}}>
                                ✓ Đã hoàn tất tiêm vaccine
                            </span>
                        </div>
                        <p style={{color: '#666', textAlign: 'center', fontSize: '14px'}}>
                            📌 Nhân viên tiếp tân sẽ xuất hóa đơn cho khách hàng
                        </p>
                        <button 
                            onClick={() => navigate('/doctor/dashboard')}
                            className="btn-secondary"
                            style={{padding: '10px 25px', fontSize: '16px'}}
                        >
                            ← Quay lại Dashboard
                        </button>
                    </div>
                )}
            </div>

            {/* Modal thêm vaccine lẻ */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => {
                    setShowAddModal(false);
                    setSelectedVaccine('');
                    setLieuLuong('1 liều');
                    setIsBooster(false);
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{minWidth: '500px'}}>
                        <h3 style={{marginBottom: '20px', color: '#1976d2'}}>➕ Thêm Vaccine Lẻ</h3>
                        
                        {/* 🔥 TÌM KIẾM VACCINE */}
                        <div style={{marginBottom: '15px'}}>
                            <input 
                                type="text"
                                placeholder="🔍 Gõ để tìm vaccine ngay trong danh sách..."
                                value={searchVaccine}
                                onChange={(e) => setSearchVaccine(e.target.value)}
                                className="form-input"
                                style={{width: '100%', padding: '12px', fontSize: '15px', border: '2px solid #1976d2'}}
                            />
                            {searchVaccine && (
                                <small style={{color: '#666', fontSize: '13px', marginTop: '5px', display: 'block'}}>
                                    🔍 Tìm thấy {availableVaccines.filter(v => v.TenMatHang.toLowerCase().includes(searchVaccine.toLowerCase())).length} kết quả
                                </small>
                            )}
                        </div>
                        
                        <div style={{marginBottom: '20px'}}>
                            <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>
                                Chọn vaccine: <span style={{color: 'red'}}>*</span>
                            </label>
                            <select 
                                value={selectedVaccine} 
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedVaccine(value);
                                    // 🔥 AUTO-DETECT: Nếu vaccine này có trong gói hiện tại
                                    if (packageInfo && packageInfo.HieuLuc && value === packageInfo.MaVaccine && shotsFired < packageInfo.SoMuiTuongUng) {
                                        setIsBooster(true); // Tự động tick "Nhắc lại"
                                        setLieuLuong(`Mũi ${shotsFired + 1}/${packageInfo.SoMuiTuongUng}`);
                                    } else {
                                        setIsBooster(false);
                                        setLieuLuong('1 liều');
                                    }
                                }}
                                className="form-input"
                                style={{width: '100%', padding: '10px', fontSize: '14px'}}
                                size="8"
                            >
                                <option value="">-- Chọn vaccine --</option>
                                {availableVaccines
                                    .filter(v => v.TenMatHang.toLowerCase().includes(searchVaccine.toLowerCase()))
                                    .map(v => (
                                        <option key={v.MaMatHang} value={v.MaMatHang}>
                                            {v.TenMatHang} - {v.DonGia?.toLocaleString()} đ (Tồn: {v.SoLuongTon})
                                            {packageInfo && packageInfo.MaVaccine === v.MaMatHang && packageInfo.HieuLuc && shotsFired < packageInfo.SoMuiTuongUng ? ' 🎁 (Có gói)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div style={{marginBottom: '20px'}}>
                            <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>
                                Liều lượng: <span style={{color: 'red'}}>*</span>
                            </label>
                            <input 
                                type="text" 
                                value={lieuLuong}
                                onChange={(e) => setLieuLuong(e.target.value)}
                                className="form-input"
                                placeholder="VD: 1 liều, 1 mũi, 2ml, ..."
                                style={{width: '100%', padding: '10px'}}
                            />
                            <small style={{color: '#666', fontSize: '13px'}}>
                                Nhập liều lượng cụ thể (mặc định: "1 liều")
                            </small>
                        </div>

                        {/* 🔥 THÔNG BÁO NẾU VACCINE NÀY CÓ GÓI */}
                        {packageInfo && packageInfo.HieuLuc && selectedVaccine === packageInfo.MaVaccine && shotsFired < packageInfo.SoMuiTuongUng && (
                            <div style={{
                                padding: '15px',
                                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                borderRadius: '8px',
                                border: '2px solid #1976d2',
                                marginBottom: '20px'
                            }}>
                                <div style={{fontSize: '15px', fontWeight: '600', color: '#1565c0', marginBottom: '8px'}}>
                                    🎁 Bạn đã đăng ký gói: <span style={{color: '#d32f2f'}}>{packageInfo.TenGoi}</span>
                                </div>
                                <div style={{fontSize: '14px', color: '#424242', lineHeight: '1.6'}}>
                                    📌 Tiêm mũi tiếp theo ({shotsFired + 1}/{packageInfo.SoMuiTuongUng}) sẽ được <strong style={{color: '#4caf50'}}>MIỄN PHÍ</strong> trong gói này<br/>
                                    📅 Khoảng cách giữa các mũi: <strong>{packageInfo.ThoiHan} ngày</strong>
                                </div>
                            </div>
                        )}

                        <div style={{
                            padding: '15px', 
                            background: isBooster ? '#e8f5e9' : '#fff3e0', 
                            borderRadius: '8px',
                            border: `2px solid ${isBooster ? '#4caf50' : '#ff9800'}`,
                            marginBottom: '20px'
                        }}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '10px', margin: 0, cursor: 'pointer'}}>
                                <input 
                                    type="checkbox"
                                    checked={isBooster}
                                    onChange={(e) => setIsBooster(e.target.checked)}
                                    style={{width: '18px', height: '18px'}}
                                />
                                <span style={{fontWeight: '600', fontSize: '15px'}}>
                                    {isBooster 
                                        ? '✅ Nhắc lại: Có | Giá: 0đ (Miễn phí theo gói)'
                                        : '🔄 Mũi nhắc lại (theo gói đã đăng ký - Miễn phí)'
                                    }
                                </span>
                            </label>
                        </div>

                        <div className="modal-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <button 
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedVaccine('');
                                    setLieuLuong('1 liều');
                                    setIsBooster(false);
                                }} 
                                className="btn-cancel"
                                style={{padding: '10px 20px'}}
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleAddVaccine} 
                                className="btn-primary"
                                style={{padding: '10px 24px', fontWeight: '600'}}
                            >
                                ✓ Thêm Vaccine
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal đăng ký gói */}
            {showPackageModal && (
                <div className="modal-overlay" onClick={() => {
                    setShowPackageModal(false);
                    setVaccineForPackage('');
                    setSelectedPackage('');
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{minWidth: '500px'}}>
                        <h3 style={{marginBottom: '20px', color: '#1976d2'}}>📦 Đăng Ký Gói Tiêm</h3>
                        
                        {packageInfo && packageInfo.HieuLuc && (
                            <div style={{
                                padding: '12px',
                                background: '#fff3e0',
                                borderRadius: '8px',
                                border: '2px solid #ff9800',
                                marginBottom: '15px',
                                fontSize: '14px'
                            }}>
                                ⚠️ <strong>Lưu ý:</strong> Bạn đã có gói <strong style={{color: '#1976d2'}}>{packageInfo.TenVaccine}</strong>. 
                                Chỉ có thể đăng ký gói cho <strong>vaccine khác</strong>.
                            </div>
                        )}
                        
                        <div style={{marginBottom: '20px'}}>
                            <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>
                                Chọn vaccine: <span style={{color: 'red'}}>*</span>
                            </label>
                            <select 
                                value={vaccineForPackage} 
                                onChange={(e) => setVaccineForPackage(e.target.value)}
                                className="form-input"
                                style={{width: '100%', padding: '10px'}}
                            >
                                <option value="">-- Chọn vaccine --</option>
                                {availableVaccines
                                    .filter(v => !packageInfo || v.MaMatHang !== packageInfo.MaVaccine)
                                    .map(v => (
                                        <option key={v.MaMatHang} value={v.MaMatHang}>
                                            {v.TenMatHang} - {v.DonGia?.toLocaleString()} đ
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div style={{marginBottom: '20px'}}>
                            <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>
                                Chọn gói: <span style={{color: 'red'}}>*</span>
                            </label>
                            <select 
                                value={selectedPackage} 
                                onChange={(e) => setSelectedPackage(e.target.value)}
                                className="form-input"
                                style={{width: '100%', padding: '10px'}}
                            >
                                <option value="">-- Chọn gói --</option>
                                {packages.map(p => (
                                    <option key={p.MaGoi} value={p.MaGoi}>
                                        {p.TenGoi} - {p.SoMuiTuongUng} mũi - Giảm {(p.GiamGia * 100).toFixed(0)}%
                                    </option>
                                ))}
                            </select>
                            <small style={{color: '#666', fontSize: '13px', display: 'block', marginTop: '5px'}}>
                                Gói vaccine áp dụng cho nhiều mũi tiêm, mũi nhắc lại sẽ miễn phí
                            </small>
                        </div>

                        <div className="modal-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <button 
                                onClick={() => {
                                    setShowPackageModal(false);
                                    setVaccineForPackage('');
                                    setSelectedPackage('');
                                }} 
                                className="btn-cancel"
                                style={{padding: '10px 20px'}}
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleAddPackage} 
                                className="btn-primary"
                                style={{padding: '10px 24px', fontWeight: '600'}}
                            >
                                ✓ Đăng Ký Gói
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 🔥 Modal Lịch Sử Tiêm */}
            {showHistoryModal && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{minWidth: '700px', maxHeight: '80vh', overflow: 'auto'}}>
                        <h3 style={{marginBottom: '20px', color: '#1976d2'}}>📋 Lịch Sử Tiêm Vaccine - {patientInfo?.TenThuCung}</h3>
                        
                        {vaccineHistory.length === 0 ? (
                            <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                                <p>Chưa có lịch sử tiêm vaccine</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ngày Tiêm</th>
                                        <th>Vaccine</th>
                                        <th>Liều Lượng</th>
                                        <th>Nhắc Lại</th>
                                        <th>Bác Sĩ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vaccineHistory.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{new Date(item.NgayTiem).toLocaleDateString('vi-VN')}</td>
                                            <td>{item.TenVaccine}</td>
                                            <td>{item.LieuLuong}</td>
                                            <td>{item.NhacLai ? '✓ Nhắc lại' : 'Mũi mới'}</td>
                                            <td>{item.BacSiThucHien || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        
                        <div style={{textAlign: 'center', marginTop: '20px'}}>
                            <button onClick={() => setShowHistoryModal(false)} className="btn-secondary">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VaccineDetail;
