import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google'; 
import './Login.css';



const Login = () => {
    const [formData, setFormData] = useState({ TenDangNhap: '', MatKhau: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // 1. XỬ LÝ ĐĂNG NHẬP THƯỜNG
    // Xử lý đăng nhập thường
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', formData);
            
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.Role);
            localStorage.setItem('hoten', res.data.HoTen);
            if(res.data.MaUser) localStorage.setItem('MaUser', res.data.MaUser);
            
            // 🔥 THÊM DÒNG NÀY VÀO NÈ MOM:
            alert("Đăng nhập thành công! Chào mừng " + res.data.HoTen); 

            // (Nhờ cái code trong App.js, cái alert này sẽ tự biến thành Toast màu xanh)

            if (res.data.Role === 'ADMIN' || res.data.Role === 'NV') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Lỗi kết nối server!");
        } finally {
            setLoading(false);
        }
    };

    // 2. XỬ LÝ KHI GOOGLE ĐĂNG NHẬP THÀNH CÔNG
    const handleGoogleLoginSuccess = async (googleToken) => {
        setLoading(true);
        try {
            // Gửi token về server check
            const res = await axios.post('http://localhost:5000/api/auth/google-login', {
                token: googleToken
            });

            if (res.data.isNewUser) {
                // 🔥 TRƯỜNG HỢP KHÁCH MỚI: Chuyển sang trang bổ sung thông tin
                // Mang theo Email, Tên, Avatar qua trang kia
                navigate('/complete-profile', { 
                    state: { 
                        email: res.data.email, 
                        name: res.data.name,
                        photo: res.data.photo
                    } 
                });
            } else {
                // 🔥 TRƯỜNG HỢP KHÁCH CŨ: Lưu token và vào luôn
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('role', res.data.Role);
                localStorage.setItem('hoten', res.data.HoTen);
                if(res.data.MaUser) localStorage.setItem('MaUser', res.data.MaUser);
                
                alert("🎉 Đăng nhập Google thành công!");
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Lỗi xử lý Google Login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2 className="login-title">CHÀO MỪNG TRỞ LẠI! 👋</h2>
                <p className="login-subtitle">Vui lòng đăng nhập để tiếp tục</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Tên đăng nhập</label>
                        <input 
                            type="text" 
                            name="TenDangNhap" 
                            value={formData.TenDangNhap} 
                            onChange={handleChange} 
                            placeholder="Nhập tên đăng nhập..." 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Mật khẩu</label>
                        <input 
                            type="password" 
                            name="MatKhau" 
                            value={formData.MatKhau} 
                            onChange={handleChange} 
                            placeholder="Nhập mật khẩu..." 
                            required 
                        />
                    </div>

                    {error && <div className="error-message">⚠️ {error}</div>}

                    <div className="forgot-pass">
                        <Link to="/forgot-password">Quên mật khẩu?</Link>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Đang kiểm tra...' : 'ĐĂNG NHẬP'}
                    </button>
                </form>

                <div className="divider"><span>Hoặc đăng nhập với</span></div>

                {/* --- NÚT GOOGLE CHÍNH CHỦ --- */}
                <div id="google-btn-container" style={{display:'flex', justifyContent:'center', marginTop:'10px'}}>
                    <GoogleLogin
                        onSuccess={credentialResponse => {
                            console.log("Google Token:", credentialResponse);
                            handleGoogleLoginSuccess(credentialResponse.credential);
                        }}
                        onError={() => {
                            console.log('Login Failed');
                            alert("Đăng nhập Google thất bại");
                        }}
                        useOneTap // Tự động hiện popup gợi ý đăng nhập (bao xịn)
                    />
                </div>

                <p className="register-link">
                    Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                </p>

                {/* Link đăng nhập nội bộ */}
                <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px'}}>
                    <p style={{fontSize: '14px', color: '#555'}}>
                        Bạn là nhân viên? <Link to="/admin/login" style={{color: '#d32f2f', fontWeight: 'bold', textDecoration:'underline'}}>Đăng nhập nội bộ</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;