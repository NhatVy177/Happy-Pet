import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DirectorDashboard.css';

const DirectorDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [branchRevenue, setBranchRevenue] = useState([]);
    const [topService, setTopService] = useState(null);
    const [memberStats, setMemberStats] = useState([]);
    const [petStats, setPetStats] = useState([]);
    
    // 🔥 State mới cho phòng khám
    const [doctorRevenue, setDoctorRevenue] = useState([]);
    const [examStats, setExamStats] = useState([]);
    const [productSales, setProductSales] = useState([]);
    
    // 🔥 State cho quản lý nhân viên
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        HoTen: '',
        NgaySinh: '',
        GioiTinh: 'Nam',
        ChucVu: 'Nhân viên tiếp tân',
        NgayVaoLam: new Date().toISOString().split('T')[0],
        LuongCoBan: '',
        MaCN: '',
        TenDangNhap: '',
        MatKhau: ''
    });
    
    // Filters
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    // Load doanh thu các chi nhánh
    const loadBranchRevenue = () => {
        axios.get(`http://localhost:5000/api/director/revenue/branches?thang=${month}&nam=${year}`, config)
            .then(res => setBranchRevenue(res.data))
            .catch(err => console.error(err));
    };
    
    useEffect(() => {
        loadBranchRevenue();
    }, []);
    
    // Load top dịch vụ
    const loadTopService = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('tuNgay', dateFrom);
        if (dateTo) params.append('denNgay', dateTo);
        
        axios.get(`http://localhost:5000/api/director/revenue/top-service?${params}`, config)
            .then(res => setTopService(res.data))
            .catch(err => console.error(err));
    };
    
    useEffect(() => {
        loadTopService();
    }, []);
    
    // Load thống kê hội viên
    const loadMemberStats = () => {
        axios.get(`http://localhost:5000/api/director/members/stats?nam=${year}`, config)
            .then(res => setMemberStats(res.data))
            .catch(err => console.error(err));
    };
    
    // Load thống kê thú cưng
    const loadPetStats = () => {
        axios.get('http://localhost:5000/api/director/pets/by-type', config)
            .then(res => setPetStats(res.data))
            .catch(err => console.error(err));
    };
    
    // 🔥 Load doanh thu bác sĩ
    const loadDoctorRevenue = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('tuNgay', dateFrom);
        if (dateTo) params.append('denNgay', dateTo);
        
        axios.get(`http://localhost:5000/api/director/revenue/by-doctor?${params}`, config)
            .then(res => setDoctorRevenue(res.data))
            .catch(err => console.error(err));
    };
    
    // 🔥 Load số lượt khám
    const loadExamStats = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('tuNgay', dateFrom);
        if (dateTo) params.append('denNgay', dateTo);
        
        axios.get(`http://localhost:5000/api/director/stats/exams?${params}`, config)
            .then(res => setExamStats(res.data))
            .catch(err => console.error(err));
    };
    
    // 🔥 Load doanh thu bán hàng
    const loadProductSales = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('tuNgay', dateFrom);
        if (dateTo) params.append('denNgay', dateTo);
        
        axios.get(`http://localhost:5000/api/director/stats/product-sales?${params}`, config)
            .then(res => setProductSales(res.data))
            .catch(err => console.error(err));
    };
    
    // 🔥 Load danh sách nhân viên
    const loadEmployees = () => {
        axios.get('http://localhost:5000/api/director/employees', config)
            .then(res => setEmployees(res.data))
            .catch(err => console.error(err));
    };
    
    // Load danh sách chi nhánh
    const loadBranches = () => {
        axios.get('http://localhost:5000/api/branches')
            .then(res => setBranches(res.data))
            .catch(err => console.error(err));
    };
    
    // Thêm nhân viên mới
    const handleAddEmployee = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/api/director/employees/add', newEmployee, config)
            .then(() => {
                alert('Thêm nhân viên thành công!');
                setShowAddForm(false);
                setNewEmployee({
                    HoTen: '',
                    NgaySinh: '',
                    GioiTinh: 'Nam',
                    ChucVu: 'Nhân viên tiếp tân',
                    NgayVaoLam: new Date().toISOString().split('T')[0],
                    LuongCoBan: '',
                    MaCN: '',
                    TenDangNhap: '',
                    MatKhau: ''
                });
                loadEmployees();
            })
            .catch(err => alert(err.response?.data?.message || 'Lỗi thêm nhân viên!'));
    };
    
    // Cập nhật nhân viên
    const handleUpdateEmployee = (e) => {
        e.preventDefault();
        axios.put(`http://localhost:5000/api/director/employees/${editingEmployee.MaNV}`, editingEmployee, config)
            .then(() => {
                alert('Cập nhật thành công!');
                setEditingEmployee(null);
                loadEmployees();
            })
            .catch(err => alert(err.response?.data?.message || 'Lỗi cập nhật!'));
    };
    
    useEffect(() => {
        if (activeTab === 'members') loadMemberStats();
        if (activeTab === 'pets') loadPetStats();
        if (activeTab === 'clinic') {
            loadDoctorRevenue();
            loadExamStats();
            loadProductSales();
        }
        if (activeTab === 'employees') {
            loadEmployees();
            loadBranches();
        }
    }, [activeTab]);
    
    return (
        <div className="director-container">
            <h1 className="dashboard-title">🏢 Bảng Điều Khiển Giám Đốc</h1>
            
            {/* Navigation Tabs */}
            <div className="tab-navigation">
                <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'tab-active' : ''}>
                    📊 Tổng quan
                </button>
                <button onClick={() => setActiveTab('branches')} className={activeTab === 'branches' ? 'tab-active' : ''}>
                    🏪 Chi nhánh
                </button>
                <button onClick={() => setActiveTab('employees')} className={activeTab === 'employees' ? 'tab-active' : ''}>
                    👥 Nhân sự
                </button>
                <button onClick={() => setActiveTab('clinic')} className={activeTab === 'clinic' ? 'tab-active' : ''}>
                    🏥 Phòng khám
                </button>
                <button onClick={() => setActiveTab('members')} className={activeTab === 'members' ? 'tab-active' : ''}>
                    👑 Hội viên
                </button>
                <button onClick={() => setActiveTab('pets')} className={activeTab === 'pets' ? 'tab-active' : ''}>
                    🐾 Thú cưng
                </button>
            </div>
            
            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview-section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h2>Doanh thu toàn hệ thống</h2>
                            <div>
                                <label>Tháng: </label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="12" 
                                    value={month} 
                                    onChange={(e) => setMonth(e.target.value)}
                                    style={{width: '60px', marginLeft: '10px'}}
                                />
                                <label style={{marginLeft: '15px'}}>Năm: </label>
                                <input 
                                    type="number" 
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)}
                                    style={{width: '80px', marginLeft: '10px'}}
                                />
                                <button onClick={loadBranchRevenue} className="btn-primary" style={{marginLeft: '15px'}}>Xem</button>
                            </div>
                        </div>
                        
                        {topService && (
                            <div className="top-service-card">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <h3>🏆 Dịch vụ mang lại doanh thu cao nhất</h3>
                                    <div>
                                        <label>Từ: </label>
                                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                        <label style={{marginLeft: '10px'}}>Đến: </label>
                                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                        <button onClick={loadTopService} className="btn-primary" style={{marginLeft: '10px'}}>Xem</button>
                                    </div>
                                </div>
                                <div className="service-info">
                                    <p className="service-name">{topService.LoaiDichVu}</p>
                                    <p className="service-revenue">{parseInt(topService.TongDoanhThu || 0).toLocaleString()}đ</p>
                                </div>
                            </div>
                        )}
                        
                        <h3 style={{marginTop: '30px'}}>So sánh doanh thu chi nhánh</h3>
                        <div className="branch-comparison">
                            {branchRevenue.map((branch, idx) => (
                                <div key={idx} className="branch-card">
                                    <h4>{branch.TenCN}</h4>
                                    <div className="branch-revenue">
                                        <p><span>Trực tiếp:</span> {parseInt(branch.DoanhThuOffline || 0).toLocaleString()}đ</p>
                                        <p><span>Online:</span> {parseInt(branch.DoanhThuOnline || 0).toLocaleString()}đ</p>
                                        <p className="total"><span>Tổng:</span> {parseInt(branch.TongCong || 0).toLocaleString()}đ</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'branches' && (
                    <div className="branches-section">
                        <h2>Chi tiết doanh thu các chi nhánh</h2>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Chi nhánh</th>
                                    <th>Doanh thu trực tiếp</th>
                                    <th>Doanh thu online</th>
                                    <th>Tổng cộng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchRevenue.map((branch, idx) => (
                                    <tr key={idx}>
                                        <td><strong>{branch.TenCN}</strong></td>
                                        <td>{parseInt(branch.DoanhThuOffline || 0).toLocaleString()}đ</td>
                                        <td>{parseInt(branch.DoanhThuOnline || 0).toLocaleString()}đ</td>
                                        <td className="total-col">{parseInt(branch.TongCong || 0).toLocaleString()}đ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* 🔥 TAB NHÂN SỰ */}
                {activeTab === 'employees' && (
                    <div className="employees-section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2>👥 Quản lý Nhân sự</h2>
                            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
                                {showAddForm ? '❌ Hủy' : '➕ Thêm nhân viên'}
                            </button>
                        </div>

                        {/* Form thêm nhân viên */}
                        {showAddForm && (
                            <div className="form-box" style={{marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px'}}>
                                <h3>➕ Thêm nhân viên mới</h3>
                                <form onSubmit={handleAddEmployee} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                    <div>
                                        <label>Họ tên:</label>
                                        <input type="text" value={newEmployee.HoTen} onChange={(e) => setNewEmployee({...newEmployee, HoTen: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label>Ngày sinh:</label>
                                        <input type="date" value={newEmployee.NgaySinh} onChange={(e) => setNewEmployee({...newEmployee, NgaySinh: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label>Giới tính:</label>
                                        <select value={newEmployee.GioiTinh} onChange={(e) => setNewEmployee({...newEmployee, GioiTinh: e.target.value})}>
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Chức vụ:</label>
                                        <select value={newEmployee.ChucVu} onChange={(e) => setNewEmployee({...newEmployee, ChucVu: e.target.value})}>
                                            <option value="Nhân viên tiếp tân">Nhân viên tiếp tân</option>
                                            <option value="Bác sĩ thú y">Bác sĩ thú y</option>
                                            <option value="Quản lý chi nhánh">Quản lý chi nhánh</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Ngày vào làm:</label>
                                        <input type="date" value={newEmployee.NgayVaoLam} onChange={(e) => setNewEmployee({...newEmployee, NgayVaoLam: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label>Lương cơ bản:</label>
                                        <input type="number" value={newEmployee.LuongCoBan} onChange={(e) => setNewEmployee({...newEmployee, LuongCoBan: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label>Chi nhánh:</label>
                                        <select value={newEmployee.MaCN} onChange={(e) => setNewEmployee({...newEmployee, MaCN: e.target.value})} required>
                                            <option value="">-- Chọn chi nhánh --</option>
                                            {branches.map(b => (
                                                <option key={b.MaCN} value={b.MaCN}>{b.TenCN}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Tên đăng nhập:</label>
                                        <input type="text" value={newEmployee.TenDangNhap} onChange={(e) => setNewEmployee({...newEmployee, TenDangNhap: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label>Mật khẩu:</label>
                                        <input type="password" value={newEmployee.MatKhau} onChange={(e) => setNewEmployee({...newEmployee, MatKhau: e.target.value})} required />
                                    </div>
                                    <div style={{gridColumn: '1 / -1'}}>
                                        <button type="submit" className="btn-primary" style={{width: '100%'}}>➕ Thêm nhân viên</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Bảng danh sách nhân viên */}
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã NV</th>
                                    <th>Họ tên</th>
                                    <th>Ngày sinh</th>
                                    <th>Giới tính</th>
                                    <th>Chức vụ</th>
                                    <th>Lương</th>
                                    <th>Chi nhánh</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    editingEmployee && editingEmployee.MaNV === emp.MaNV ? (
                                        <tr key={emp.MaNV} style={{background: '#fff3cd'}}>
                                            <td>{emp.MaNV}</td>
                                            <td><input type="text" value={editingEmployee.HoTen} onChange={(e) => setEditingEmployee({...editingEmployee, HoTen: e.target.value})} style={{width: '100%'}} /></td>
                                            <td><input type="date" value={editingEmployee.NgaySinh} onChange={(e) => setEditingEmployee({...editingEmployee, NgaySinh: e.target.value})} style={{width: '100%'}} /></td>
                                            <td>
                                                <select value={editingEmployee.GioiTinh} onChange={(e) => setEditingEmployee({...editingEmployee, GioiTinh: e.target.value})} style={{width: '100%'}}>
                                                    <option value="Nam">Nam</option>
                                                    <option value="Nữ">Nữ</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select value={editingEmployee.ChucVu} onChange={(e) => setEditingEmployee({...editingEmployee, ChucVu: e.target.value})} style={{width: '100%'}}>
                                                    <option value="Nhân viên tiếp tân">Nhân viên tiếp tân</option>
                                                    <option value="Bác sĩ thú y">Bác sĩ thú y</option>
                                                    <option value="Quản lý chi nhánh">Quản lý chi nhánh</option>
                                                </select>
                                            </td>
                                            <td><input type="number" value={editingEmployee.LuongCoBan} onChange={(e) => setEditingEmployee({...editingEmployee, LuongCoBan: e.target.value})} style={{width: '100%'}} /></td>
                                            <td>
                                                <select value={editingEmployee.MaCN} onChange={(e) => setEditingEmployee({...editingEmployee, MaCN: e.target.value})} style={{width: '100%'}}>
                                                    {branches.map(b => (
                                                        <option key={b.MaCN} value={b.MaCN}>{b.TenCN}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <button onClick={handleUpdateEmployee} className="btn-primary" style={{marginRight: '5px', padding: '5px 10px'}}>💾</button>
                                                <button onClick={() => setEditingEmployee(null)} className="btn-secondary" style={{padding: '5px 10px'}}>❌</button>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={emp.MaNV}>
                                            <td>{emp.MaNV}</td>
                                            <td><strong>{emp.HoTen}</strong></td>
                                            <td>{new Date(emp.NgaySinh).toLocaleDateString('vi-VN')}</td>
                                            <td>{emp.GioiTinh}</td>
                                            <td>{emp.ChucVu}</td>
                                            <td>{parseInt(emp.LuongCoBan || 0).toLocaleString()}đ</td>
                                            <td>{emp.TenCN}</td>
                                            <td>
                                                <button onClick={() => setEditingEmployee({...emp, NgaySinh: emp.NgaySinh.split('T')[0]})} className="btn-primary" style={{padding: '5px 10px'}}>✏️ Sửa</button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {activeTab === 'members' && (
                    <div className="members-section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h2>Thống kê hội viên theo hạng</h2>
                            <div>
                                <label>Năm: </label>
                                <input 
                                    type="number" 
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)}
                                    style={{width: '100px', marginLeft: '10px'}}
                                />
                                <button onClick={loadMemberStats} className="btn-primary" style={{marginLeft: '15px'}}>Xem</button>
                            </div>
                        </div>
                        <div className="member-cards">
                            {memberStats.map((tier, idx) => (
                                <div key={idx} className="member-card">
                                    <h3>{tier.TenHang}</h3>
                                    <p className="member-count">{tier.SoLuongKhach} khách hàng</p>
                                    <p className="member-discount">Ưu đãi: {tier.PhanTramGiamGia}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'pets' && (
                    <div className="pets-section">
                        <h2>Thống kê thú cưng theo loại và giống</h2>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Loại</th>
                                    <th>Giống</th>
                                    <th>Số lượng</th>
                                    <th>Số chủ nuôi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {petStats.map((pet, idx) => (
                                    <tr key={idx}>
                                        <td>{pet.Loai}</td>
                                        <td>{pet.Giong}</td>
                                        <td><strong>{pet.SoLuong}</strong></td>
                                        <td>{pet.SoChuNuoi}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* 🔥 TAB PHÒNG KHÁM MỚI */}
                {activeTab === 'clinic' && (
                    <div className="clinic-section">
                        <div style={{marginBottom: '30px'}}>
                            <h2>Thống kê phòng khám</h2>
                            <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                                <div>
                                    <label>Từ ngày: </label>
                                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                </div>
                                <div>
                                    <label>Đến ngày: </label>
                                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                </div>
                                <button onClick={() => { loadDoctorRevenue(); loadExamStats(); loadProductSales(); }} className="btn-apply">
                                    Xem thống kê
                                </button>
                            </div>
                        </div>

                        {/* Doanh thu theo bác sĩ */}
                        <div style={{marginBottom: '30px'}}>
                            <h3>📊 Doanh thu theo bác sĩ</h3>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Bác sĩ</th>
                                        <th>Chi nhánh</th>
                                        <th>Số lượt khám</th>
                                        <th>Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctorRevenue.map((doc, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{doc.TenBacSi}</strong></td>
                                            <td>{doc.ChiNhanh}</td>
                                            <td>{doc.SoLuotKham}</td>
                                            <td className="total-col">{parseInt(doc.TongDoanhThu || 0).toLocaleString()}đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Số lượt khám */}
                        <div style={{marginBottom: '30px'}}>
                            <h3>📅 Số lượt khám theo ngày</h3>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th>Chi nhánh</th>
                                        <th>Số lượt khám</th>
                                        <th>Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {examStats.map((exam, idx) => (
                                        <tr key={idx}>
                                            <td>{new Date(exam.Ngay).toLocaleDateString('vi-VN')}</td>
                                            <td>{exam.ChiNhanh}</td>
                                            <td><strong>{exam.SoLuotKham}</strong></td>
                                            <td className="total-col">{parseInt(exam.DoanhThu || 0).toLocaleString()}đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Doanh thu bán hàng */}
                        <div>
                            <h3>🛒 Doanh thu bán sản phẩm</h3>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Loại sản phẩm</th>
                                        <th>Chi nhánh</th>
                                        <th>Số đơn hàng</th>
                                        <th>Tổng số lượng</th>
                                        <th>Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productSales.map((prod, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{prod.TenLoai}</strong></td>
                                            <td>{prod.ChiNhanh}</td>
                                            <td>{prod.SoDonHang}</td>
                                            <td>{prod.TongSoLuong}</td>
                                            <td className="total-col">{parseInt(prod.TongDoanhThu || 0).toLocaleString()}đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DirectorDashboard;
