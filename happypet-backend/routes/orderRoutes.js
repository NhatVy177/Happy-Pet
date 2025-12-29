// const express = require('express');
// const router = express.Router();
// const orderController = require('../controllers/orderController');
// const { route } = require('./authRoutes');
// const { verifyToken } = require('../middleware/authMiddleware'); 
// // Nếu m muốn bắt login mới cho đặt hàng thì mở verifyToken ra

// // router.get('/products', orderController.getProducts);
// // router.post('/init', orderController.createOrder);
// // router.post('/add-item', orderController.addToCart);
// router.post('/complete', orderController.checkout);
// router.get('/history', orderController.getOrderHistory);
// router.post('/cancel', verifyToken, orderController.cancelOrder);

// module.exports = router;

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/history', verifyToken, orderController.getOrderHistory);
router.post('/complete', verifyToken, orderController.checkout); // Đổi sang checkout
router.post('/cancel', verifyToken, orderController.cancelOrder);

module.exports = router;
