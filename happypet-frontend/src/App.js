
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import React, { useEffect } from 'react';

import { ToastContainer, toast } from 'react-toastify'; // 1. Import thư viện
import 'react-toastify/dist/ReactToastify.css'; // 2. Import CSS cho nó đẹp
// Import 3 trang chính
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Home from './pages/Home'; // <-- Dòng này đang bị mờ nè
import MyPets from './pages/customer/MyPets'; 
import Profile from './pages/Profile';
import Booking from './pages/customer/Booking';
import SelectVaccine from './pages/customer/SelectVaccine';
import CompleteProfile from './pages/auth/CompleteProfile';
import MyBookings from './pages/customer/MyBooking';
import Products from './pages/customer/Products';
import Cart from './pages/customer/Cart';
import History from './pages/customer/History';
import Services from './pages/Services'; 
import ForgotPassword from './pages/auth/ForgotPassword';
function App() {

// 🔥 UPDATE: VIETSUB LỖI (PHIÊN BẢN CHUYÊN NGHIỆP)
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message) => {
      let msg = String(message);

      // --- KHU VỰC DỊCH LỖI ---

      // 1. Lỗi trùng lặp (Violation of PRIMARY KEY / duplicate key)
      if (msg.includes('Violation of PRIMARY KEY') || msg.includes('duplicate key')) {
          msg = "Thao tác thất bại: Dữ liệu này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
      }
      
      // 2. Lỗi khóa ngoại (REFERENCE constraint) - Ví dụ: Xóa Pet đang có bệnh án
      else if (msg.includes('REFERENCE constraint') || msg.includes('conflicted with the REFERENCE')) {
          msg = "Không thể xóa: Dữ liệu này đang được sử dụng hoặc liên kết với các bản ghi khác.";
      }

      // 3. Lỗi kết nối (Network Error)
      else if (msg.includes('Network Error')) {
          msg = "Lỗi kết nối máy chủ. Vui lòng kiểm tra đường truyền hoặc thử lại sau.";
      }

      // 4. Lỗi dữ liệu quá dài (String or binary data would be truncated)
      else if (msg.includes('String or binary data would be truncated')) {
          msg = "Dữ liệu nhập vào quá dài so với quy định. Vui lòng nhập ngắn gọn hơn.";
      }

      // -------------------------------------------

      // Hiển thị Toast
      const lowerMsg = msg.toLowerCase();
      // Nếu là thông báo thành công
      if (lowerMsg.includes('thành công') || lowerMsg.includes('success') || lowerMsg.includes('hoàn tất')) {
         toast.success(msg);
      } 
      // Nếu là thông báo lỗi (ưu tiên đỏ)
      else if (lowerMsg.includes('lỗi') || lowerMsg.includes('thất bại') || lowerMsg.includes('error') || lowerMsg.includes('không thể') || lowerMsg.includes('tồn tại')) {
         toast.error(msg); 
      } 
      // Các thông báo thường
      else {
         toast.info(msg);
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <Router>
      <Navbar />
      
      {/* 3. Đặt cái thùng chứa thông báo ở đây để nó hiện lên trên cùng */}
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/my-pets" element={<MyPets />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/select-vaccine" element={<SelectVaccine />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/history" element={<History />} />
          <Route path="/services" element={<Services />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* ... các route khác ... */}
      </Routes>
    </Router>
  );
}

export default App;