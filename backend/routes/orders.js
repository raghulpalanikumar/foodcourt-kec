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
      items: order.items, // Use correct items field
      products: order.items, // Keep both for compatibility
      total: order.totalAmount, // Use correct totalAmount field
      totalAmount: order.totalAmount, // Explicitly include totalAmount
      status: order.orderStatus || 'Preparing',
      orderStatus: order.orderStatus || 'Preparing',
      estimatedWait: order.estimatedWait, // ETA
      alternateFood: order.alternateFood, // Recommended alternative
      shippingAddress: order.shippingAddress,
      deliveryType: order.deliveryType,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      tokenNumber: order.tokenNumber
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
      items: order.products,
      products: order.products,
      total: order.totalAmount, // Map totalAmount to total for compatibility
      totalAmount: order.totalAmount, // Explicitly include totalAmount
      tokenNumber: order.tokenNumber,
      status: order.status || order.orderStatus || 'pending', // Check both status fields
      orderStatus: order.orderStatus || order.status || 'pending',
      deliveryType: order.deliveryType,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      estimatedWait: order.estimatedWait, // ETA
      alternateFood: order.alternateFood, // Recommended alternative
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
      items: order.products,
      products: order.products,
      total: order.total,
      status: order.status || 'pending',
      estimatedWait: order.estimatedWait, // ETA
      alternateFood: order.alternateFood, // Recommended alternative
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
router.post('/', protect, async (req, res) => {
  try {
    console.log('Order creation request body:', req.body);

    // 🛠️ NORMALIZATION: Support both "items" and "products" formats from frontend
    let products = req.body.products;
    const items = req.body.items;

    if (items && Array.isArray(items) && items.length > 0 && (!products || !Array.isArray(products) || products.length === 0)) {
      products = items.map((i) => ({
        product: i.foodId || i.id || i.productId || i._id,
        name: i.foodName || i.name,
        price: i.price,
        quantity: i.quantity || 1
      }));
      // Ensure req.body.products is set for any downstream code
      req.body.products = products;
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No products or items provided in order.'
      });
    }

    const deliveryType = req.body.deliveryType || 'FoodCourt';
    const deliveryDetails = req.body.deliveryDetails || {};

    // ReserveTable: require reservationSlot
    if (deliveryType === 'ReserveTable') {
      const slotStart = new Date(req.body.reservationSlot || deliveryDetails.reservationSlot);
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
      // Today-only enforcement
      const now = new Date();
      const today = new Date();
      const slotDay = new Date(slotStart);
      today.setHours(0, 0, 0, 0);
      slotDay.setHours(0, 0, 0, 0);

      // Grace period: Allow slots that started up to 15 mins ago
      if (isNaN(slotStart.getTime()) || slotStart.getTime() < now.getTime() - (15 * 60 * 1000)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or past reservation time'
        });
      }

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

    console.log(`📊 ETA Calculation: Base=15 + Quantity(${totalQuantity}x3)=${totalQuantity * 3} + PeakHour=${hour >= 12 && hour <= 14 ? 5 : 0} = ${estimatedWait} mins`);

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
    
    // 🔥 CRITICAL FIX: Include totalAmount and paymentMethod in order creation
    const order = await Order.create({
      user: req.user._id,
      products: orderProducts,
      
      // 🔥 REQUIRED: totalAmount from frontend (or calculated total as fallback)
      totalAmount: req.body.totalAmount ? Number(req.body.totalAmount) : total,
      total: req.body.totalAmount ? Number(req.body.totalAmount) : total, // For backward compatibility
      
      // 🔥 REQUIRED: paymentMethod from frontend
      paymentMethod: req.body.paymentMethod || 'CASH',
      
      // 🔥 REQUIRED: paymentStatus based on payment method
      paymentStatus: req.body.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending',
      
      // 🔥 ETA: Dynamic estimated wait time
      estimatedWait, // Smart calculation based on quantity + peak hours
      
      // 🍽️ ALTERNATE FOOD: Intelligent recommendation
      alternateFood: alternateFood
        ? { name: alternateFood.name, id: alternateFood._id }
        : null,
      
      shippingAddress,
      
      status: 'pending' // Set default status
    });

    console.log('Order created, ID:', order._id);
    console.log('Order totalAmount:', order.totalAmount);
    console.log('Order paymentMethod:', order.paymentMethod);
    console.log('Order estimatedWait:', order.estimatedWait, 'minutes');
    console.log('Order alternateFood:', order.alternateFood);
    console.log('Populating order details...');
    
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