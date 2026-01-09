import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
// 2. 🔥 QUAN TRỌNG: THÊM DÒNG NÀY ĐỂ HẾT LỖI '... is not defined'
import { 
    User, Phone, Mail, Award, Search, Plus, Calendar, 
    CheckCircle, X, FileText, CreditCard, DollarSign 
} from 'lucide-react';

// 1. Gom hết import plugin vào đây
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek'; 

// 2. Import CSS (Dùng chung style)
import './EmployeeDashboard.css';

// 3. Sau khi import xong hết mới chạy lệnh config
dayjs.extend(isBetween);
dayjs.extend(isoWeek);

const ServiceBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);

    // State cho Tabs & Filter
    const [timeTab, setTimeTab] = useState('today');
    const [statusTab, setStatusTab] = useState('all');
    const [serviceTypeTab, setServiceTypeTab] = useState('all'); // Filter mới: all, khambenh, vaccine

    // State cho Modal Check-in
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [currentTicket, setCurrentTicket] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState('');

    // State cho Modal Walk-in
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [walkInData, setWalkInData] = useState({
        MaKH: '',
        MaTC: '',
        LoaiPhieu: 'KB',
        TrieuChung: ''
    });
    
    // State cho tìm kiếm khách hàng
    const [phoneSearch, setPhoneSearch] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPet, setSelectedPet] = useState(null);
    
    // State cho modal xuất hóa đơn
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoiceTicket, setCurrentInvoiceTicket] = useState(null);
    const [invoiceData, setInvoiceData] = useState({
        DiemMuonDung: 0,
        PhuongThucTT: 'Tiền mặt'
    });
    const [invoiceResult, setInvoiceResult] = useState(null);
    
    // State cho form đăng ký khách mới
    const [newCustomerForm, setNewCustomerForm] = useState({
        hoTen: '',
        gioiTinhUser: 'Nam',
        sdt: '',
        diaChi: '',
        tenPet: '',
        loaiPet: '',
        giongPet: '',
        gioiTinhPet: 'Đực',
        ngaySinhPet: '',
        tinhTrangSucKhoe: 'Bình thường',
        loaiPhieu: 'KB',
        trieuChung: ''
    });

    // 1. Logic tính ngày
    const getDateRange = (tab) => {
        const today = dayjs();
        let start, end;

        switch (tab) {
            case 'today':
                start = today;
                end = today;
                break;
            case 'next3':
                start = today;
                end = today.add(2, 'day');
                break;
            case 'week':
                start = today.startOf('isoWeek'); 
                end = today.endOf('isoWeek');     
                break;
            default:
                start = today;
                end = today;
        }
        
        return {
            tuNgay: start.format('YYYY-MM-DD'),
            denNgay: end.format('YYYY-MM-DD')
        };
    };

    // 2. Fetch dữ liệu
    const fetchBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { tuNgay, denNgay } = getDateRange(timeTab);

            const res = await axios.get('http://localhost:5000/api/employee/appointments', {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'ALL', tuNgay, denNgay }
            });

            // Lọc phiếu Dịch vụ (Khám bệnh, Tiêm vaccine)
            const serviceTickets = res.data.filter(item => ['Khám bệnh', 'Tiêm vaccine'].includes(item.LoaiDichVu));
            setBookings(serviceTickets);
        } catch (error) {
            console.error('Lỗi:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/employee/doctors-status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(res.data);
        } catch (error) {
            console.error('Lỗi:', error);
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchDoctors();
        setStatusTab('all');
    }, [timeTab]);

    // 3. Logic lọc Client-side (Đã cập nhật theo giao diện mới)
    const filteredBookings = useMemo(() => {
        let filtered = bookings;

        // Lọc theo loại dịch vụ (Tab mới)
        if (serviceTypeTab === 'khambenh') {
            filtered = filtered.filter(b => b.LoaiDichVu === 'Khám bệnh');
        } else if (serviceTypeTab === 'vaccine') {
            filtered = filtered.filter(b => b.LoaiDichVu === 'Tiêm vaccine');
        }

        // Lọc theo trạng thái
        if (statusTab === 'all') return filtered;
        if (statusTab === 'HT_GROUP') return filtered.filter(o => o.TrangThai === 'DHT' || o.TrangThai === 'HT');
        return filtered.filter(item => item.TrangThai === statusTab);
    }, [bookings, statusTab, serviceTypeTab]);

    const countStatus = (status) => {
        let filtered = bookings;
        
        // Apply service filter first
        if (serviceTypeTab === 'khambenh') {
            filtered = filtered.filter(b => b.LoaiDichVu === 'Khám bệnh');
        } else if (serviceTypeTab === 'vaccine') {
            filtered = filtered.filter(b => b.LoaiDichVu === 'Tiêm vaccine');
        }

        if (status === 'HT_GROUP') return filtered.filter(o => o.TrangThai === 'DHT' || o.TrangThai === 'HT').length;
        return filtered.filter(o => o.TrangThai === status).length;
    };

    // 4. Logic Check-in
    const handleCheckIn = (ticket) => {
        setCurrentTicket(ticket);
        setShowDoctorModal(true);
    };

    const confirmCheckIn = async () => {
        if (!selectedDoctor) return Swal.fire('Lỗi', 'Vui lòng chọn bác sĩ!', 'warning');
        
        const doctor = doctors.find(d => d.MaNV === selectedDoctor);
        if (doctor && doctor.TrangThai === 'Bận') {
            return Swal.fire({ icon: 'error', title: 'Bác sĩ bận!', text: `${doctor.TenNV} đang có ca khám.` });
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/employee/check-in', 
                { MaPhieu: currentTicket.MaPhieu, MaBacSi: selectedDoctor },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Swal.fire('Thành công', 'Check-in thành công!', 'success');
            setShowDoctorModal(false);
            setSelectedDoctor('');
            fetchBookings();
            fetchDoctors();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Thất bại', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 5. Logic xuất hóa đơn
    const handleExportInvoice = async (ticket) => {
        setCurrentInvoiceTicket(ticket);
        setShowInvoiceModal(true);
        setLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5000/api/employee/export-invoice', {
                MaPhieu: ticket.MaPhieu,
                DiemMuonDung: 0, 
                PhuongThucTT: 'Tiền mặt',
                confirm: false 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const diemHienCo = response.data.invoice?.DiemHienCo || response.data.invoice?.DiemHienCoBanDau || 0;
            setInvoiceData({ DiemMuonDung: 0, PhuongThucTT: 'Tiền mặt', DiemHienCo: diemHienCo });
            setInvoiceResult(null);
        } catch (error) {
            console.error('Lỗi lấy thông tin:', error);
            setInvoiceData({ DiemMuonDung: 0, PhuongThucTT: 'Tiền mặt', DiemHienCo: 0 });
        } finally {
            setLoading(false);
        }
    };

    const confirmExportInvoice = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5000/api/employee/export-invoice', {
                MaPhieu: currentInvoiceTicket.MaPhieu,
                DiemMuonDung: parseInt(invoiceData.DiemMuonDung) || 0,
                PhuongThucTT: invoiceData.PhuongThucTT,
                confirm: true 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setInvoiceResult(response.data.invoice);
            
            Swal.fire({
                icon: 'success',
                title: 'Xuất hóa đơn thành công!',
                html: `
                    <div style="text-align: left; padding: 15px;">
                        <h4 style="margin-bottom: 15px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">
                            📋 HÓA ĐƠN #${response.data.invoice.MaHoaDon}
                        </h4>
                        <div style="margin-bottom: 20px; background: #f8f9fa; padding: 12px; border-radius: 6px;">
                            <p style="margin: 5px 0;"><strong>👤 Khách hàng:</strong> ${currentInvoiceTicket.TenKhachHang}</p>
                            <p style="margin: 5px 0;"><strong>🐾 Thú cưng:</strong> ${currentInvoiceTicket.TenThuCung || 'Chưa rõ'}</p>
                            <p style="margin: 5px 0;"><strong>🏥 Dịch vụ:</strong> ${currentInvoiceTicket.LoaiDichVu}</p>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <p style="margin: 8px 0; font-size: 15px;"><strong>💰 Phí dịch vụ:</strong> <span style="color: #7f8c8d;">${response.data.invoice.TienDichVuCoBan} đ</span></p>
                            <p style="margin: 8px 0; font-size: 14px; color: #e74c3c;">🎁 Giảm hạng TV: -${response.data.invoice.GiamHangTV} đ</p>
                            <p style="margin: 8px 0; font-size: 14px; color: #e74c3c;">🎯 Giảm điểm: -${response.data.invoice.GiamDiem} đ</p>
                        </div>
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; color: white; margin-top: 15px;">
                            <p style="margin: 0; font-size: 18px; font-weight: bold;">💳 Khách cần trả: ${response.data.invoice.KhachCanTra} đ</p>
                            <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">💎 Điểm được cộng: +${response.data.invoice.DiemDuocCong} điểm</p>
                        </div>
                    </div>
                `,
                width: '550px',
                confirmButtonText: 'Đóng'
            });

            setShowInvoiceModal(false);
            fetchBookings();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể xuất hóa đơn!', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle Walk-in Modal
    const handlePhoneSearch = async () => {
        if (!phoneSearch || phoneSearch.length < 10) {
            return Swal.fire('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ (10 số)!', 'warning');
        }

        setIsSearching(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/employee/search-customer?sdt=${phoneSearch}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setSearchResult(res.data);
            setIsSearching(false);
        } catch (error) {
            setIsSearching(false);
            Swal.fire('Lỗi', 'Không thể tìm kiếm khách hàng!', 'error');
        }
    };
    
    const handleWalkInSubmit = async () => {
        if (!walkInData.MaKH || !walkInData.MaTC) {
            return Swal.fire('Lỗi', 'Vui lòng nhập đầy đủ Mã khách hàng và Mã thú cưng!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/employee/walk-in', walkInData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            Swal.fire('Thành công', 'Đã tạo phiếu vãng lai!', 'success');
            setShowWalkInModal(false);
            resetWalkInModal();
            fetchBookings();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể tạo phiếu!', 'error');
        }
    };
    
    // Handle tạo phiếu cho khách mới (full info)
    const handleNewCustomerSubmit = async () => {
        const finalSDT = newCustomerForm.sdt || phoneSearch;
        
        if (!newCustomerForm.hoTen || !finalSDT || !newCustomerForm.tenPet || !newCustomerForm.loaiPet) {
            return Swal.fire('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc!', 'warning');
        }
        
        if (finalSDT.length !== 10) {
            return Swal.fire('Lỗi', 'Số điện thoại phải có 10 số!', 'warning');
        }
        
        const payload = {
            SDT: finalSDT,
            HoTen: newCustomerForm.hoTen,
            GioiTinhUser: newCustomerForm.gioiTinhUser || 'Nam',
            DiaChi: newCustomerForm.diaChi || '',
            TenTC: newCustomerForm.tenPet,
            Loai: newCustomerForm.loaiPet,
            Giong: newCustomerForm.giongPet || 'Chưa rõ',
            GioiTinh: newCustomerForm.gioiTinhPet || 'Đực',
            NgSinh: newCustomerForm.ngaySinhPet || null,
            TinhTrangSucKhoe: newCustomerForm.tinhTrangSucKhoe || 'Bình thường',
            LoaiPhieu: newCustomerForm.loaiPhieu,
            TrieuChung: newCustomerForm.trieuChung || ''
        };
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/employee/walk-in-full', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>✅ Đã tạo phiếu vãng lai!</strong></p>
                        <p>📝 Mã phiếu: <strong>${res.data.data.MaPhieuMoi}</strong></p>
                        <p>👤 Khách hàng: ${res.data.data.TenKhachHang}</p>
                        <p>🐾 Thú cưng: ${res.data.data.TenThuCung}</p>
                    </div>
                `,
                confirmButtonText: 'Đóng'
            });
            
            resetWalkInModal();
            fetchBookings();
        } catch (error) {
            console.error('❌ Lỗi tạo phiếu khách mới:', error);
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể tạo phiếu!', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleSelectPet = (pet) => {
        setSelectedPet(pet);
        setWalkInData({
            ...walkInData,
            MaKH: searchResult.customer.MaKH,
            MaTC: pet.MaTC
        });
    };
    
    const resetWalkInModal = () => {
        setShowWalkInModal(false);
        setSearchResult(null);
        setPhoneSearch('');
        setSelectedPet(null);
        setWalkInData({ MaKH: '', MaTC: '', LoaiPhieu: 'KB', TrieuChung: '' });
        setNewCustomerForm({
            hoTen: '', gioiTinhUser: 'Nam', sdt: '', diaChi: '', tenPet: '', loaiPet: '', 
            giongPet: '', gioiTinhPet: 'Đực', ngaySinhPet: '', tinhTrangSucKhoe: 'Bình thường', loaiPhieu: 'KB', trieuChung: ''
        });
    };

    const formatTime = (dateStr) => dayjs(dateStr).format('HH:mm DD/MM');

    const renderStatus = (status) => {
        switch (status) {
            case 'DD': return <span className="status-badge status-waiting">🔵 Chờ Check-in</span>;
            case 'DTH': return <span className="status-badge status-shipping">💉 Đang thực hiện</span>;
            case 'DHT': 
            case 'HT': return <span className="status-badge status-done">✅ Hoàn tất</span>;
            case 'DH': return <span className="status-badge status-cancel">❌ Đã hủy</span>;
            default: return <span className="status-badge">{status}</span>;
        }
    };

    return (
        <div className="dashboard-container">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <div>
                    <h2 className="dashboard-title">🏥 Quản Lý Dịch Vụ Thú Cưng</h2>
                    <p className="dashboard-subtitle">Quản lý check-in khám bệnh, tiêm vaccine và điều phối bác sĩ.</p>
                </div>
                <button 
                    className="btn-primary" 
                    onClick={() => setShowWalkInModal(true)}
                    style={{padding: '12px 24px', fontSize: '16px', fontWeight: 'bold'}}
                >
                    ➕ Tạo phiếu vãng lai
                </button>
            </div>

            {/* 🔥 THANH FILTER GỌN GÀNG (STYLE MỚI) */}
            <div style={{display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap'}}>
                
                {/* 1. SEGMENTED CONTROL: LOẠI DỊCH VỤ */}
                <div style={{
                    display: 'flex', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px', 
                    overflow: 'hidden',
                    backgroundColor: '#f8f9fa'
                }}>
                    <button 
                        onClick={() => setServiceTypeTab('all')}
                        style={{
                            border: 'none',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            backgroundColor: serviceTypeTab === 'all' ? '#e9ecef' : 'transparent',
                            color: serviceTypeTab === 'all' ? '#495057' : '#6c757d',
                            fontWeight: serviceTypeTab === 'all' ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        Tất cả
                    </button>
                    <div style={{width: '1px', backgroundColor: '#ddd'}}></div>
                    <button 
                        onClick={() => setServiceTypeTab('khambenh')}
                        style={{
                            border: 'none',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            backgroundColor: serviceTypeTab === 'khambenh' ? '#e9ecef' : 'transparent',
                            color: serviceTypeTab === 'khambenh' ? '#495057' : '#6c757d',
                            fontWeight: serviceTypeTab === 'khambenh' ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        🩺 Khám bệnh
                    </button>
                    <div style={{width: '1px', backgroundColor: '#ddd'}}></div>
                    <button 
                        onClick={() => setServiceTypeTab('vaccine')}
                        style={{
                            border: 'none',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            backgroundColor: serviceTypeTab === 'vaccine' ? '#e9ecef' : 'transparent',
                            color: serviceTypeTab === 'vaccine' ? '#495057' : '#6c757d',
                            fontWeight: serviceTypeTab === 'vaccine' ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        💉 Tiêm vaccine
                    </button>
                </div>

                {/* 2. DROPDOWN CHO THỜI GIAN */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    backgroundColor: 'white'
                }}>
                    <span style={{marginRight: '8px', fontSize: '1rem', color: '#6c757d'}}>📅</span>
                    <select 
                        value={timeTab}
                        onChange={(e) => setTimeTab(e.target.value)}
                        style={{
                            border: 'none',
                            outline: 'none',
                            color: '#495057',
                            fontSize: '14px',
                            cursor: 'pointer',
                            backgroundColor: 'transparent'
                        }}
                    >
                        <option value="today">Thời gian: Hôm nay</option>
                        <option value="next3">Thời gian: 3 ngày tới</option>
                        <option value="week">Thời gian: Tuần này</option>
                    </select>
                </div>
            </div>

            {/* 3. FILTER TRẠNG THÁI */}
            <div className="tab-sub-filter">
                <div className={`filter-pill ${statusTab === 'all' ? 'active' : ''}`} onClick={() => setStatusTab('all')}>
                    Tất cả <span className="badge-count">{bookings.length}</span>
                </div>
                <div className={`filter-pill ${statusTab === 'DD' ? 'active' : ''}`} onClick={() => setStatusTab('DD')}>
                    🔵 Chờ Check-in <span className="badge-count">{countStatus('DD')}</span>
                </div>
                <div className={`filter-pill ${statusTab === 'DTH' ? 'active' : ''}`} onClick={() => setStatusTab('DTH')}>
                    💉 Đang thực hiện <span className="badge-count">{countStatus('DTH')}</span>
                </div>
                <div className={`filter-pill ${statusTab === 'HT_GROUP' ? 'active' : ''}`} onClick={() => setStatusTab('HT_GROUP')}>
                    ✅ Hoàn tất <span className="badge-count">{countStatus('HT_GROUP')}</span>
                </div>
                <div className={`filter-pill ${statusTab === 'DH' ? 'active' : ''}`} onClick={() => setStatusTab('DH')}>
                    ❌ Đã hủy <span className="badge-count">{countStatus('DH')}</span>
                </div>
            </div>

            {/* 4. BẢNG DỮ LIỆU */}
            <div className="table-card">
                <table className="booking-table">
                    <thead>
                        <tr>
                            <th>Mã phiếu</th>
                            <th>Loại DV</th>
                            <th>Khách hàng & Pet</th>
                            <th>Lịch hẹn</th>
                            <th>Bác sĩ phụ trách</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#888'}}>⏳ Đang tải dữ liệu...</td></tr>
                        ) : filteredBookings.length === 0 ? (
                            <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                                <div style={{fontSize: '40px', marginBottom: '10px'}}>📭</div>
                                Không có lịch hẹn nào.
                            </td></tr>
                        ) : (
                            filteredBookings.map((item, index) => (
                                <tr key={index}>
                                    <td><strong>#{item.MaPhieu}</strong></td>
                                    <td>
                                        {item.LoaiDichVu === 'Khám bệnh' 
                                            ? <span style={{color:'#e67e22', fontWeight:'bold'}}>🩺 Khám bệnh</span> 
                                            : <span style={{color:'#2980b9', fontWeight:'bold'}}>💉 Tiêm vaccine</span>
                                        }
                                    </td>
                                    <td>
                                        <div style={{fontWeight: '600'}}>{item.TenKhachHang}</div>
                                        <div className="text-muted">📞 {item.SDT}</div>
                                        <div className="text-muted">🐶 {item.TenThuCung || 'Chưa rõ'}</div>
                                    </td>
                                    <td style={{fontWeight:'500'}}>{formatTime(item.TG_ThucHienDV)}</td>
                                    <td>{item.TenBacSi ? `👨‍⚕️ ${item.TenBacSi}` : <span style={{color:'#bdc3c7', fontStyle:'italic'}}>Chưa chỉ định</span>}</td>
                                    <td>{renderStatus(item.TrangThai)}</td>
                                    <td>
                                        {/* Nút Check-in */}
                                        {item.TrangThai === 'DD' && (
                                            <button 
                                                className="btn-check-in" 
                                                onClick={() => handleCheckIn(item)}
                                                // Có thể thêm logic disable nếu chưa đến giờ hẹn
                                            >
                                                Check-in
                                            </button>
                                        )}
                                        
                                        {/* Nút Xuất Hóa Đơn (CHỈ KHI ĐÃ HOÀN TẤT - DHT) */}
                                        {item.TrangThai === 'DHT' && (
                                            (item.MaNV_XuatHD && item.MaNV_XuatHD.trim() !== item.MaNV_BacSi?.trim()) ? (
                                                <span className="status-badge status-done">✅ Đã xuất HD</span>
                                            ) : (
                                                <button 
                                                    className="btn-check-in" 
                                                    style={{background: '#27ae60'}}
                                                    onClick={() => handleExportInvoice(item)}
                                                >
                                                    💳 Xuất hóa đơn
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL CHECK-IN */}
            {showDoctorModal && (
                <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>🩺 Check-in & Chọn Bác Sĩ</h3>
                        <p style={{marginBottom: '10px', fontSize: '0.9rem', color: '#666'}}>
                            Chỉ định bác sĩ cho phiếu: <strong>#{currentTicket?.MaPhieu}</strong>
                        </p>
                        
                        <select 
                            className="form-select-custom"
                            value={selectedDoctor} 
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                        >
                            <option value="">-- Chọn bác sĩ --</option>
                            {doctors.map((doc) => (
                                <option key={doc.MaNV} value={doc.MaNV} disabled={doc.TrangThai === 'Bận'}>
                                    {doc.TenNV} {doc.TrangThai === 'Bận' ? '(❌ Bận)' : '(✅ Rảnh)'}
                                </option>
                            ))}
                        </select>

                        <div className="modal-actions">
                            <button onClick={() => setShowDoctorModal(false)} className="btn-cancel">Hủy</button>
                            <button onClick={confirmCheckIn} disabled={loading} className="btn-check-in">
                                {loading ? 'Đang xử lý...' : 'Xác nhận Check-in'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* MODAL WALK-IN (Tạo phiếu vãng lai) - ĐÃ SỬA CSS INLINE */}
            {showWalkInModal && (
                <div className="modal-overlay" onClick={resetWalkInModal}>
                    <div 
                        className="modal-content" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                            maxWidth: '650px', 
                            width: '90%', 
                            padding: '0', 
                            borderRadius: '12px', 
                            overflow: 'hidden', 
                            fontFamily: '"Segoe UI", sans-serif',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Header Modal */}
                        <div style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '15px 20px', 
                            borderBottom: '1px solid #eee',
                            background: '#fff'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={20} /> Tạo Phiếu Vãng Lai
                            </h3>
                            <button 
                                onClick={resetWalkInModal} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        {/* Body Modal (Có cuộn dọc) */}
                        <div style={{ padding: '20px', overflowY: 'auto' }}>
                            
                            {/* BƯỚC 1: TÌM KIẾM SĐT */}
                            {!searchResult && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.95rem' }}>
                                        Nhập số điện thoại khách hàng để bắt đầu:
                                    </p>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '10px', 
                                        maxWidth: '400px', 
                                        margin: '0 auto 20px' // Căn giữa hộp tìm kiếm
                                    }}>
                                        <input 
                                            type="text" 
                                            placeholder="Số điện thoại (10 số)..." 
                                            value={phoneSearch} 
                                            onChange={(e) => setPhoneSearch(e.target.value)} 
                                            maxLength="10"
                                            onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                                            style={{ 
                                                flex: 1, 
                                                padding: '10px 15px', 
                                                border: '1px solid #ddd', 
                                                borderRadius: '8px', 
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                        <button 
                                            onClick={handlePhoneSearch} 
                                            disabled={isSearching} 
                                            style={{ 
                                                padding: '0 20px', 
                                                background: '#3498db', 
                                                color: 'white', 
                                                border: 'none', 
                                                borderRadius: '8px', 
                                                cursor: 'pointer', 
                                                fontWeight: '600',
                                                minWidth: '80px', // Đảm bảo nút không bị co quá nhỏ
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {isSearching ? '...' : <><Search size={18} style={{marginRight:'5px'}}/> Tìm</>}
                                        </button>
                                    </div>
                                    
                                    <button 
                                        onClick={resetWalkInModal} 
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: '#7f8c8d', 
                                            cursor: 'pointer', 
                                            textDecoration: 'underline',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Hủy bỏ
                                    </button>
                                </div>
                            )}

                            {/* BƯỚC 2A: KHÁCH CŨ */}
                            {searchResult && searchResult.found && (
                                <div>
                                    {/* Info Banner */}
                                    <div style={{ 
                                        background: '#f0f9f0', 
                                        border: '1px solid #c3e6cb', 
                                        borderLeft: '4px solid #28a745', 
                                        padding: '15px', 
                                        borderRadius: '6px', 
                                        marginBottom: '20px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '15px',
                                        alignItems: 'center',
                                        fontSize: '0.9rem',
                                        color: '#155724'
                                    }}>
                                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}><User size={16}/> <strong>{searchResult.customer.HoTen}</strong></div>
                                        <div style={{color:'#ccc'}}>|</div>
                                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}><Phone size={16}/> {searchResult.customer.SDT}</div>
                                        <div style={{color:'#ccc'}}>|</div>
                                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}><Award size={16} color="#d35400"/> <strong style={{color:'#d35400'}}>{searchResult.customer.TongDiemTichLuy || 0} điểm</strong></div>
                                    </div>

                                    <h4 style={{ marginBottom: '10px', fontSize: '1rem', color: '#333' }}>🐾 Chọn thú cưng:</h4>
                                    
                                    {/* Pet Grid */}
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                                        gap: '15px', 
                                        marginBottom: '20px' 
                                    }}>
                                        {searchResult.pets.map((pet) => (
                                            <div 
                                                key={pet.MaTC} 
                                                onClick={() => handleSelectPet(pet)}
                                                style={{ 
                                                    padding: '12px', 
                                                    border: selectedPet?.MaTC === pet.MaTC ? '2px solid #3498db' : '1px solid #eee', 
                                                    borderRadius: '10px', 
                                                    cursor: 'pointer', 
                                                    background: selectedPet?.MaTC === pet.MaTC ? '#eaf6ff' : 'white',
                                                    position: 'relative',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    gap: '10px',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div style={{ fontSize: '1.5rem', background: '#f8f9fa', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                                    {pet.Loai === 'Mèo' ? '🐱' : '🐶'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{pet.Ten}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                        {pet.Loai} - {pet.Giong || 'N/A'} {pet.NgSinh && `• ${Math.floor((new Date() - new Date(pet.NgSinh)) / (365.25 * 24 * 60 * 60 * 1000))} tuổi`}
                                                    </div>
                                                </div>
                                                {selectedPet?.MaTC === pet.MaTC && (
                                                    <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#3498db' }}>
                                                        <CheckCircle size={18} fill="#3498db" color="white"/>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Lịch Sử Khám */}
                                    {searchResult.history && searchResult.history.length > 0 && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ marginBottom: '10px', fontSize: '1rem', color: '#333', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                📋 Lịch sử khám gần đây
                                            </h4>
                                            <div style={{ 
                                                maxHeight: '200px', 
                                                overflowY: 'auto', 
                                                border: '1px solid #e0e0e0', 
                                                borderRadius: '8px', 
                                                background: '#fafafa'
                                            }}>
                                                {searchResult.history.slice(0, 5).map((item, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        style={{ 
                                                            padding: '12px 15px', 
                                                            borderBottom: idx < Math.min(searchResult.history.length, 5) - 1 ? '1px solid #e8e8e8' : 'none',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                            <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                                                                {dayjs(item.NgayKham).format('DD/MM/YYYY HH:mm')}
                                                            </span>
                                                            <span style={{ 
                                                                fontSize: '0.75rem', 
                                                                padding: '2px 8px', 
                                                                borderRadius: '12px',
                                                                background: item.TrangThai === 'DHT' ? '#d4edda' : '#fff3cd',
                                                                color: item.TrangThai === 'DHT' ? '#155724' : '#856404'
                                                            }}>
                                                                {item.TrangThai}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: '#555', marginBottom: '3px' }}>
                                                            <strong>{item.LoaiDV}</strong> - BS: {item.BacSi || 'N/A'}
                                                        </div>
                                                        <div style={{ color: '#777', fontSize: '0.8rem' }}>
                                                            Chẩn đoán: {item.ChanDoan || 'Chưa có'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Form Dịch Vụ */}
                                    {selectedPet && (
                                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '5px' }}>Dịch vụ:</label>
                                                    <select 
                                                        value={walkInData.LoaiPhieu} 
                                                        onChange={(e) => setWalkInData({...walkInData, LoaiPhieu: e.target.value})}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                                    >
                                                        <option value="KB">🩺 Khám bệnh</option>
                                                        <option value="TV">💉 Tiêm vaccine</option>
                                                    </select>
                                                </div>
                                                <div style={{ flex: 2 }}>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '5px' }}>Ghi chú / Triệu chứng:</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Nhập ghi chú..." 
                                                        value={walkInData.TrieuChung} 
                                                        onChange={(e) => setWalkInData({...walkInData, TrieuChung: e.target.value})} 
                                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1px solid #f1f2f6' }}>
                                        <button onClick={resetWalkInModal} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', color: '#555', cursor: 'pointer', fontWeight: '600' }}>Hủy</button>
                                        <button 
                                            onClick={handleWalkInSubmit} 
                                            disabled={!selectedPet} 
                                            style={{ 
                                                padding: '10px 25px', 
                                                border: 'none', 
                                                borderRadius: '6px', 
                                                background: '#3498db', 
                                                color: 'white', 
                                                fontWeight: '600', 
                                                cursor: !selectedPet ? 'not-allowed' : 'pointer',
                                                opacity: !selectedPet ? 0.6 : 1
                                            }}
                                        >
                                            Tạo phiếu ngay
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* BƯỚC 2B: KHÁCH MỚI */}
                            {searchResult && !searchResult.found && (
                                <div>
                                    <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #ffe0b2' }}>
                                        <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>🎉 Chào mừng khách hàng mới!</div>
                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>SĐT <strong style={{ color: '#e65100' }}>{phoneSearch}</strong> chưa có trong hệ thống</div>
                                    </div>
                                    
                                    {/* Thông tin khách hàng */}
                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #eee' }}>
                                        <h4 style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            👤 Thông tin khách hàng
                                        </h4>
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            <div>
                                                <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                    👤 Họ tên <span style={{color:'red'}}>*</span>
                                                </label>
                                                <input type="text" placeholder="Nhập họ tên khách hàng" value={newCustomerForm.hoTen} onChange={e => setNewCustomerForm({...newCustomerForm, hoTen: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'0.9rem'}} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                        📱 Số điện thoại <span style={{color:'red'}}>*</span>
                                                    </label>
                                                    <input type="text" value={phoneSearch} disabled style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', background:'#f0f0f0', fontSize:'0.9rem'}} />
                                                </div>
                                                <div>
                                                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                        ⚥ Giới tính <span style={{color:'red'}}>*</span>
                                                    </label>
                                                    <select value={newCustomerForm.gioiTinhUser} onChange={e => setNewCustomerForm({...newCustomerForm, gioiTinhUser: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'0.9rem'}}>
                                                        <option value="Nam">Nam</option>
                                                        <option value="Nữ">Nữ</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                    🏠 Địa chỉ
                                                </label>
                                                <input type="text" placeholder="Nhập địa chỉ (tùy chọn)" value={newCustomerForm.diaChi} onChange={e => setNewCustomerForm({...newCustomerForm, diaChi: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'0.9rem'}} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thông tin thú cưng */}
                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #eee' }}>
                                        <h4 style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            🐾 Thông tin thú cưng
                                        </h4>
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            <div>
                                                <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                    🐶 Tên thú cưng <span style={{color:'red'}}>*</span>
                                                </label>
                                                <input type="text" placeholder="Nhập tên thú cưng" value={newCustomerForm.tenPet} onChange={e => setNewCustomerForm({...newCustomerForm, tenPet: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'0.9rem'}} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                        🦴 Loại <span style={{color:'red'}}>*</span>
                                                    </label>
                                                    <select value={newCustomerForm.loaiPet} onChange={e => setNewCustomerForm({...newCustomerForm, loaiPet: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'0.9rem'}}>
                                                        <option value="">-- Chọn loại --</option>
                                                        <option value="Chó">Chó</option>
                                                        <option value="Mèo">Mèo</option>
                                                        <option value="Chim">Chim</option>
                                                        <option value="Chuột">Chuột</option>
                                                        <option value="Gà">Gà</option>
                                                        <option value="Khác">Khác</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                        ⚥ Giới tính <span style={{color:'red'}}>*</span>
                                                    </label>
                                                    <select value={newCustomerForm.gioiTinhPet} onChange={e => setNewCustomerForm({...newCustomerForm, gioiTinhPet: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'0.9rem'}}>
                                                        <option value="Đực">Đực</option>
                                                        <option value="Cái">Cái</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                    🧬 Giống
                                                </label>
                                                <input type="text" placeholder="VD: Corgi, Munchkin..." value={newCustomerForm.giongPet} onChange={e => setNewCustomerForm({...newCustomerForm, giongPet: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'0.9rem'}} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                        🎂 Ngày sinh
                                                    </label>
                                                    <input type="date" value={newCustomerForm.ngaySinhPet} onChange={e => setNewCustomerForm({...newCustomerForm, ngaySinhPet: e.target.value})} max={dayjs().format('YYYY-MM-DD')} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'0.9rem'}} />
                                                </div>
                                                <div>
                                                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                                        💪 Tình trạng sức khỏe
                                                    </label>
                                                    <select value={newCustomerForm.tinhTrangSucKhoe} onChange={e => setNewCustomerForm({...newCustomerForm, tinhTrangSucKhoe: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'0.9rem'}}>
                                                        <option value="Bình thường">Bình thường</option>
                                                        <option value="Tốt">Tốt</option>
                                                        <option value="Yếu">Yếu</option>
                                                        <option value="Đang điều trị">Đang điều trị</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Dịch vụ cần làm */}
                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
                                        <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'8px', fontSize:'0.85rem', fontWeight:'600', color:'#555'}}>
                                            🩺 Dịch vụ cần làm:
                                        </label>
                                        <select value={newCustomerForm.loaiPhieu} onChange={e => setNewCustomerForm({...newCustomerForm, loaiPhieu: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'0.9rem'}}>
                                            <option value="KB">🩺 Khám bệnh</option>
                                            <option value="TV">💉 Tiêm vaccine</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1px solid #f1f2f6' }}>
                                        <button onClick={resetWalkInModal} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', color: '#555', cursor: 'pointer', fontWeight: '600' }}>Hủy</button>
                                        <button onClick={handleNewCustomerSubmit} disabled={loading} style={{ padding: '10px 25px', border: 'none', borderRadius: '6px', background: '#3498db', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                                            {loading ? 'Đang tạo...' : 'Tạo hồ sơ & Phiếu'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
{/* 🔥 MODAL XUẤT HÓA ĐƠN (ĐÃ SỬA GIAO DIỆN CĂN GIỮA & CHỐNG NHẢY DÒNG) */}
            {showInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div 
                        className="modal-content" 
                        onClick={e => e.stopPropagation()} 
                        style={{ 
                            maxWidth: '480px', 
                            width: '90%', 
                            borderRadius: '16px', 
                            padding: '0', 
                            overflow: 'hidden', 
                            fontFamily: '"Segoe UI", sans-serif',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                        }}
                    >
                        <div style={{ padding: '30px 25px' }}>
                            
                            {/* 1. Header: Căn giữa tuyệt đối */}
                            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <CreditCard size={32} color="#3498db" />
                                    <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem', fontWeight: '800' }}>Xuất Hóa Đơn</h3>
                                </div>
                                <div style={{ height: '3px', width: '50px', background: '#ecf0f1', margin: '0 auto 12px', borderRadius: '10px' }}></div>
                                <p style={{ color: '#7f8c8d', fontSize: '0.95rem', margin: 0 }}>
                                    Phiếu: <strong style={{color:'#2c3e50'}}>#{currentInvoiceTicket?.MaPhieu}</strong>
                                </p>
                            </div>

                            {/* 2. Khung Thông Tin: Màu nền nhẹ, căn giữa nội dung */}
                            <div style={{ 
                                background: '#f8f9fa', 
                                padding: '20px', 
                                borderRadius: '12px', 
                                marginBottom: '25px', 
                                border: '1px solid #edf2f7',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center', // Căn giữa các dòng
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', color: '#333' }}>
                                    <User size={18} style={{ marginRight: '8px', color: '#8e44ad' }} />
                                    <span><strong>Khách hàng:</strong> {currentInvoiceTicket?.TenKhachHang}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', color: '#333' }}>
                                    <span style={{ fontSize: '1.2rem', marginRight: '8px', lineHeight: '1' }}>🐾</span>
                                    <span><strong>Thú cưng:</strong> {currentInvoiceTicket?.TenThuCung || 'Chưa rõ'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', color: '#333' }}>
                                    <FileText size={18} style={{ marginRight: '8px', color: '#e67e22' }} />
                                    <span><strong>Dịch vụ:</strong> {currentInvoiceTicket?.LoaiDichVu}</span>
                                </div>
                            </div>

                            {/* 3. Nhập Điểm: Label căn giữa, Input rộng */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: '8px', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    color: '#555' 
                                }}>
                                    <span style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                        <Award size={18} color="#e84393"/> Điểm tích lũy:
                                    </span>
                                    <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                                        (Có: {invoiceData.DiemHienCo} điểm)
                                    </span>
                                </label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max={invoiceData.DiemHienCo || 0}
                                    value={invoiceData.DiemMuonDung}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setInvoiceData({...invoiceData, DiemMuonDung: val});
                                    }}
                                    placeholder="Nhập số điểm muốn dùng..."
                                    disabled={!invoiceData.DiemHienCo}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px 15px', 
                                        borderRadius: '8px', 
                                        border: '1px solid #dfe6e9', 
                                        fontSize: '16px', 
                                        outline: 'none',
                                        background: (!invoiceData.DiemHienCo) ? '#f5f6fa' : '#fff',
                                        color: '#2d3436',
                                        boxSizing: 'border-box' // Quan trọng để không bị tràn
                                    }}
                                />
                                {(!invoiceData.DiemHienCo || invoiceData.DiemHienCo === 0) && (
                                    <div style={{ color: '#f39c12', fontSize: '13px', marginTop: '6px', textAlign: 'center', fontStyle: 'italic' }}>
                                        ⚠️ Khách hàng chưa có điểm tích lũy
                                    </div>
                                )}
                            </div>

                            {/* 4. Chọn Phương Thức: Label căn giữa */}
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    marginBottom: '8px', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    color: '#555' 
                                }}>
                                    <DollarSign size={18} color="#27ae60" /> Phương thức thanh toán:
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <select 
                                        value={invoiceData.PhuongThucTT} 
                                        onChange={(e) => setInvoiceData({...invoiceData, PhuongThucTT: e.target.value})}
                                        style={{ 
                                            width: '100%', 
                                            padding: '12px 15px', 
                                            borderRadius: '8px', 
                                            border: '1px solid #dfe6e9', 
                                            fontSize: '16px', 
                                            outline: 'none', 
                                            cursor: 'pointer', 
                                            background: '#fff',
                                            appearance: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <option value="Tiền mặt">💵 Tiền mặt</option>
                                        <option value="Chuyển khoản">🏦 Chuyển khoản</option>
                                    </select>
                                    {/* Mũi tên dropdown tùy chỉnh */}
                                    <div style={{ 
                                        position: 'absolute', 
                                        right: '15px', 
                                        top: '50%', 
                                        transform: 'translateY(-50%)', 
                                        pointerEvents: 'none', 
                                        color: '#999',
                                        fontSize: '12px'
                                    }}>▼</div>
                                </div>
                            </div>
                            
                            {/* 5. Footer Buttons: Căn phải, khoảng cách đều */}
                            <div style={{ 
                                display: 'flex', 
                                gap: '12px', 
                                justifyContent: 'flex-end', 
                                paddingTop: '20px', 
                                borderTop: '1px solid #f1f2f6' 
                            }}>
                                <button 
                                    onClick={() => setShowInvoiceModal(false)} 
                                    style={{ 
                                        padding: '12px 24px', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        background: '#f1f2f6', 
                                        color: '#636e72', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={confirmExportInvoice} 
                                    disabled={loading} 
                                    style={{ 
                                        padding: '12px 28px', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        background: '#27ae60', 
                                        color: 'white', 
                                        fontWeight: '700', 
                                        cursor: loading ? 'not-allowed' : 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        opacity: loading ? 0.7 : 1, 
                                        boxShadow: '0 4px 15px rgba(39, 174, 96, 0.25)',
                                        fontSize: '14px'
                                    }}
                                >
                                    {loading ? 'Đang xử lý...' : <><CheckCircle size={18} /> Xác nhận xuất</>}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceBookings;


