const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middlewares/auth');
const reservationController = require('../controllers/reservationController');

const router = express.Router();


router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const toProducts = (items) => (items || []).map((i) => (i.foodId != null ? { product: i.foodId, name: i.foodName, price: i.price, quantity: i.quantity } : i));
    const rawItems = (order) => order.items || order.products || [];

    const transformedOrders = orders.map((order) => ({
      _id: order._id,
      id: order._id,
      userName: order.user?.name || req.user.name,
      userEmail: order.user?.email || req.user.email,
      user: { name: order.user?.name || req.user.name, email: order.user?.email || req.user.email },
      date: order.createdAt,
      createdAt: order.createdAt,
      items: rawItems(order),
      products: toProducts(rawItems(order)),
      total: order.totalAmount ?? order.total,
      status: order.orderStatus ?? order.status ?? 'pending',
      deliveryType: order.deliveryType,
      deliveryDetails: order.deliveryDetails,
      estimatedWait: order.estimatedWait,
      alternateFood: order.alternateFood,
      shippingAddress: order.shippingAddress
    }));

    res.json({
      success: true,
      data: { orders: transformedOrders }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// ==================
// @desc    Get All Orders (Admin) - Temporarily without admin check
// @route   GET /api/orders/all
// @access  Private 
// ==================
router.get('/all', protect, async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.$or = [{ orderStatus: status }, { status }];
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const toProducts = (items) => (items || []).map((i) => (i.foodId != null ? { product: i.foodId, name: i.foodName, price: i.price, quantity: i.quantity } : i));
    const rawItems = (order) => order.items || order.products || [];

    const transformedOrders = orders.map((order) => ({
      _id: order._id,
      id: order._id,
      userName: order.user?.name || 'Unknown User',
      userEmail: order.user?.email || 'No email',
      user: { name: order.user?.name || 'Unknown User', email: order.user?.email || 'No email' },
      date: order.createdAt,
      createdAt: order.createdAt,
      items: rawItems(order),
      products: toProducts(rawItems(order)),
      total: order.totalAmount ?? order.total,
      status: order.orderStatus ?? order.status ?? 'pending',
      deliveryType: order.deliveryType,
      deliveryDetails: order.deliveryDetails,
      estimatedWait: order.estimatedWait,
      alternateFood: order.alternateFood,
      shippingAddress: order.shippingAddress
    }));

    res.json(transformedOrders); // Return array directly
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// ==================
// @desc    Update Order Status
// @route   PUT /api/orders/:id/status
// @access  Private
// ==================
router.put('/:id/status', protect, [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = order.orderStatus ?? order.status;

    const itemsForStock = order.items || order.products || [];
    if (status === 'cancelled' && currentStatus !== 'Cancelled' && currentStatus !== 'cancelled') {
      try {
        for (const item of itemsForStock) {
          const productId = item.foodId ?? item.product;
          const qty = item.quantity || 0;
          const product = await Product.findById(productId);
          if (product) {
            product.stock += qty;
            await product.save();
          }
        }
      } catch (stockError) {
        console.error('Error restoring stock:', stockError);
      }
    }

    const statusMap = { cancelled: 'Cancelled', delivered: 'Delivered', shipped: 'OutForDelivery', processing: 'Preparing', pending: 'Preparing' };
    order.orderStatus = statusMap[status] || order.orderStatus || status;
    order.updatedAt = new Date();
    await order.save();

    if (status !== 'pending' && order.user && order.user.email) {
      try {
        const { sendOrderStatusUpdateEmail } = require('../utils/emailService');
        await sendOrderStatusUpdateEmail(
          order.user.email,
          order.user.name,
          {
            orderId: order._id.toString().slice(-8),
            total: order.totalAmount ?? order.total,
            shippingAddress: order.shippingAddress
          },
          status
        );
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
});

// ==================
// @desc    Get Single Order
// @route   GET /api/orders/:id
// @access  Private (order owner)
// ==================
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order (temporarily allowing all authenticated users)
    // You can uncomment this later when you have proper role management
    /*
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    */

    const rawItems = order.items || order.products || [];
    const toProducts = (items) => (items || []).map((i) => (i.foodId != null ? { product: i.foodId, name: i.foodName, price: i.price, quantity: i.quantity } : i));
    const transformedOrder = {
      _id: order._id,
      id: order._id,
      userName: order.user?.name || 'Unknown User',
      userEmail: order.user?.email || 'No email',
      user: { name: order.user?.name || 'Unknown User', email: order.user?.email || 'No email' },
      date: order.createdAt,
      createdAt: order.createdAt,
      items: rawItems(order),
      products: toProducts(rawItems(order)),
      total: order.totalAmount ?? order.total,
      status: order.orderStatus ?? order.status ?? 'pending',
      deliveryType: order.deliveryType,
      deliveryDetails: order.deliveryDetails,
      estimatedWait: order.estimatedWait,
      alternateFood: order.alternateFood,
      shippingAddress: order.shippingAddress
    };

    res.json({
      success: true,
      data: { order: transformedOrder }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
});

// ==================
// @desc    Create New Order
// @route   POST /api/orders
// @access  Private (logged-in user)
// ==================
router.post('/', protect, [
  body('products').isArray({ min: 1 }).withMessage('Products array is required'),
  body('products.*.product').notEmpty().withMessage('Product ID is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    console.log('Order creation request body:', req.body);

    // Support both items (Razorpay/ReserveTable) and products (COD) formats
    if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0 && !req.body.products) {
      req.body.products = req.body.items.map((i) => ({
        product: i.foodId || i.id || i.productId,
        name: i.foodName || i.name,
        price: i.price,
        quantity: i.quantity || 1
      }));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const deliveryType = req.body.deliveryType || 'FoodCourt';
    const deliveryDetails = req.body.deliveryDetails || {};

    // ReserveTable: require reservationSlot
    if (deliveryType === 'ReserveTable') {
      if (!req.body.reservationSlot && !deliveryDetails.reservationSlot) {
        return res.status(400).json({
          success: false,
          message: 'Reservation slot is required for table reservation'
        });
      }
      const tableNumberRaw = req.body.reservationTableNumber || deliveryDetails.reservationTableNumber;
      const tableNumber = Number(tableNumberRaw);
      if (!tableNumberRaw || Number.isNaN(tableNumber) || tableNumber < 1 || tableNumber > 5) {
        return res.status(400).json({
          success: false,
          message: 'Please select a valid table (1-5)'
        });
      }
      const slotStart = new Date(req.body.reservationSlot || deliveryDetails.reservationSlot);
      if (isNaN(slotStart.getTime()) || slotStart < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or past reservation time'
        });
      }
      // Today-only enforcement
      const today = new Date();
      const slotDay = new Date(slotStart);
      today.setHours(0, 0, 0, 0);
      slotDay.setHours(0, 0, 0, 0);
      if (slotDay.getTime() !== today.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'Table reservations are available only for today'
        });
      }

      const tableFree = await reservationController.isTableAvailableForSlot(tableNumber, slotStart);
      if (!tableFree) {
        const nextData = await reservationController.getNextAvailableSlot(slotStart.toISOString());
        return res.status(400).json({
          success: false,
          message: `Table ${tableNumber} is not available at this time. Tables will be available after ${nextData.label} due to over rush.`,
          nextAvailable: nextData
        });
      }
    }

    // Shipping address required only for Delivery / Classroom
    let shippingAddress = req.body.shippingAddress;
    if (deliveryType === 'Delivery' || deliveryType === 'Classroom') {
      if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.postalCode || !shippingAddress?.country) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address (address, city, postal code, country) is required for delivery'
        });
        }
    } else {
      shippingAddress = shippingAddress || {
        address: deliveryType === 'ReserveTable' ? 'Table Reservation' : 'Food Court Pickup',
        city: 'Campus',
        postalCode: '000000',
        country: 'India'
      };
    }

    const { products } = req.body;

    // Validate products and calculate total
    let total = 0;
    const orderProducts = [];
    let totalQuantity = 0; // 🔥 Track total quantity for ETA calculation

    console.log(`Processing ${products.length} products...`);
    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      console.log(`[${i + 1}/${products.length}] Finding product: ${item.product}`);
      const product = await Product.findById(item.product);

      if (!product) {
        console.log(`❌ Product not found: ${item.product}`);
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      console.log(`✅ Found: ${product.name}. Stock: ${product.stock}, Requested: ${item.quantity}`);

      if (product.stock < item.quantity) {
        console.log(`❌ Insufficient stock for: ${product.name}`);
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`
        });
      }

      orderProducts.push({
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: item.quantity
      });

      total += product.price * item.quantity;
      totalQuantity += item.quantity; // 🔥 Track total items for ETA

      // Update product stock
      product.stock -= item.quantity;
      console.log(`Updating stock for ${product.name} to ${product.stock}...`);
      await product.save();
      console.log(`Stock updated for ${product.name}.`);
    }

    // ===== 🧠 SMART ETA LOGIC =====
    let estimatedWait = 15; // Base time in minutes

    // Add time based on quantity (3 mins per item)
    estimatedWait += totalQuantity * 3;

    // Peak hour logic (lunch rush)
    const hour = new Date().getHours();
    if (hour >= 12 && hour <= 14) {
      estimatedWait += 5; // Add 5 mins during lunch rush
    }

    console.log(`📊 ETA Calculation: Base=15 + Quantity(${totalQuantity}x3)=${totalQuantity*3} + PeakHour=${hour >= 12 && hour <= 14 ? 5 : 0} = ${estimatedWait} mins`);

    // ===== 🍽️ SMART ALTERNATE FOOD RECOMMENDATION =====
    let alternateFood = null;

    // Get the first product from the order
    const firstProduct = await Product.findById(products[0].product);

    if (firstProduct) {
      console.log(`🔍 Finding alternatives for: ${firstProduct.name} (Category: ${firstProduct.category})`);
      
      // Find similar products (same category, different item, in stock)
      const alternatives = await Product.find({
        category: firstProduct.category,
        _id: { $ne: firstProduct._id }, // Exclude the ordered product
        stock: { $gt: 0 } // Only in-stock items
      }).limit(3);

      if (alternatives.length > 0) {
        // Pick a random alternative from the top 3
        alternateFood = alternatives[Math.floor(Math.random() * alternatives.length)];
        console.log(`✅ Alternate food selected: ${alternateFood.name}`);
      } else {
        console.log(`ℹ️ No alternatives found for category: ${firstProduct.category}`);
      }
    }

    console.log('Creating order in database...');

    const orderPayload = {
      user: req.user._id,
      items: orderProducts.map((p) => ({
        foodId: p.product,
        foodName: p.name,
        price: p.price,
        quantity: p.quantity
      })),
      totalAmount: req.body.totalAmount ? Number(req.body.totalAmount) : total,
      // Payment rules: allow CASH (COD) or ONLINE for all options
      paymentMethod: (req.body.paymentMethod === 'ONLINE' ? 'ONLINE' : 'CASH'),
      paymentStatus: (req.body.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending'),
      estimatedWait,
      alternateFood: alternateFood
        ? { name: alternateFood.name, id: alternateFood._id }
        : null,
      orderStatus: 'Preparing',
      deliveryType: deliveryType === 'ReserveTable' ? 'ReserveTable' : deliveryType === 'Delivery' ? 'Delivery' : deliveryType === 'Pickup' ? 'Pickup' : deliveryType,
      deliveryDetails: { ...deliveryDetails }
    };

    if (deliveryType === 'ReserveTable' && (req.body.reservationSlot || deliveryDetails.reservationSlot)) {
      orderPayload.deliveryDetails.reservationSlot = new Date(req.body.reservationSlot || deliveryDetails.reservationSlot);
      orderPayload.deliveryDetails.reservationTableNumber = Number(req.body.reservationTableNumber || deliveryDetails.reservationTableNumber);
    }

    const order = await Order.create(orderPayload);

    // Create table reservation when deliveryType is ReserveTable
    if (deliveryType === 'ReserveTable' && orderPayload.deliveryDetails.reservationSlot) {
      const reservation = await reservationController.createReservationForOrder(
        req.user._id,
        order._id,
        orderPayload.deliveryDetails.reservationSlot,
        orderPayload.deliveryDetails.reservationTableNumber
      );
      if (reservation) {
        order.deliveryDetails = order.deliveryDetails || {};
        order.deliveryDetails.reservationTableNumber = reservation.tableNumber;
        await order.save();
      }
    }

    console.log('Order created, ID:', order._id);

    await order.populate('user', 'name email');

    const orderItems = order.items || [];
    const productsFormat = orderItems.map((i) => ({
      product: i.foodId,
      name: i.foodName,
      price: i.price,
      quantity: i.quantity
    }));

    const transformedOrder = {
      _id: order._id,
      id: order._id,
      userName: order.user?.name || req.user.name,
      userEmail: order.user?.email || req.user.email,
      user: {
        name: order.user?.name || req.user.name,
        email: order.user?.email || req.user.email
      },
      date: order.createdAt,
      createdAt: order.createdAt,
      items: orderItems,
      products: productsFormat,
      total: order.totalAmount,
      totalAmount: order.totalAmount,
      status: order.orderStatus || 'pending',
      orderStatus: order.orderStatus,
      deliveryType: order.deliveryType,
      deliveryDetails: order.deliveryDetails,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      estimatedWait: order.estimatedWait,
      alternateFood: order.alternateFood,
      shippingAddress: order.deliveryDetails?.address ? { address: order.deliveryDetails.address, city: order.deliveryDetails.city, postalCode: order.deliveryDetails.postalCode, country: order.deliveryDetails.country } : { address: 'Food Court', city: 'Campus', postalCode: '000000', country: 'India' }
    };

    console.log('Sending response to frontend...');
    res.status(201).json({
      success: true,
      data: { order: transformedOrder }
    });

    // Send order confirmation email asynchronously
    if (order.user && order.user.email) {
      console.log('Attempting to send order confirmation email to:', order.user.email);
      try {
        const { sendOrderConfirmationEmail } = require('../utils/emailService');
        await sendOrderConfirmationEmail(
          order.user.email,
          order.user.name,
          {
            orderId: order._id.toString().slice(-8),
            orderDate: order.createdAt,
            items: order.products,
            total: order.totalAmount || order.total,
            shippingAddress: order.shippingAddress
          }
        );
        console.log('Email sending process completed (check email service logs for final status)');
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
      }
    } else {
      console.log('No user email found, skipping confirmation email.');
    }
  } catch (error) {
    console.error('CRITICAL: Error in order creation process:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order: ' + error.message
    });
  }
});

module.exports = router;