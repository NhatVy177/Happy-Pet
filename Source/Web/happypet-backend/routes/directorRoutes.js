const express = require('express');
const router = express.Router();
const { verifyDirector } = require('../middleware/authMiddleware');
const directorController = require('../controllers/directorController');

// =============================================
// ROUTES CHO GIÁM ĐỐC / CẤP CÔNG TY
// =============================================

// Điều động nhân sự giữa các chi nhánh
router.post('/transfer-employee', verifyDirector, directorController.transferEmployee);

// Thống kê toàn hệ thống
router.get('/revenue/products', verifyDirector, directorController.getProductRevenue);
router.get('/revenue/branches', verifyDirector, directorController.getBranchRevenue);
router.get('/revenue/top-service', verifyDirector, directorController.getTopService);

// Thống kê nhân viên
router.get('/employees/top-rated', verifyDirector, directorController.getTopEmployees);

// Thống kê sản phẩm
router.get('/products/top-rated', verifyDirector, directorController.getTopProducts);

// Quản lý tồn kho tất cả chi nhánh
router.get('/inventory/low-stock', verifyDirector, directorController.getLowStockProducts);
router.post('/inventory/import', verifyDirector, directorController.importStock);

// Quản lý mặt hàng
router.post('/products/add', verifyDirector, directorController.addProduct);

// Hội viên
router.get('/members/stats', verifyDirector, directorController.getMemberStats);
router.post('/members/update-ranks', verifyDirector, directorController.updateMemberRanks);

// Thống kê thú cưng (toàn hệ thống)
router.get('/pets/by-type', verifyDirector, directorController.getPetsByType);

// 🔥 THỐNG KÊ MỚI: Doanh thu bác sĩ, lượt khám, bán hàng
router.get('/revenue/by-doctor', verifyDirector, directorController.getRevenueByDoctor);
router.get('/stats/exams', verifyDirector, directorController.getExamStats);
router.get('/stats/product-sales', verifyDirector, directorController.getProductSalesStats);

// 🔥 QUẢN LÝ NHÂN VIÊN (TOÀN HỆ THỐNG)
router.get('/employees', verifyDirector, directorController.getAllEmployees);
router.post('/employees/add', verifyDirector, directorController.addEmployee);
router.put('/employees/:MaNV', verifyDirector, directorController.updateEmployee);

module.exports = router;
