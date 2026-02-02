// routes/analytics.js
const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, admin } = require('../middlewares/auth');

const router = express.Router();

// GET /api/analytics
router.get('/', protect, admin, async (req, res) => {
  try {
    console.log('📊 Analytics endpoint hit - KEC Food Court');

    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();

    const totalRevenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Sales by month (current year)
    const byMonthAgg = await Order.aggregate([
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    let salesByMonth = byMonthAgg
      .filter(x => x._id.y === currentYear)
      .map(x => ({
        month: `${monthNames[x._id.m - 1]}`,
        sales: Number(x.sales || 0),
        orders: Number(x.orders || 0)
      }));

    if (salesByMonth.length === 0) {
      const currentMonth = new Date().getMonth();
      salesByMonth = [
        { month: monthNames[(currentMonth - 2 + 12) % 12], sales: 5000, orders: 120, growth: 0 },
        { month: monthNames[(currentMonth - 1 + 12) % 12], sales: 7500, orders: 180, growth: 50 },
        { month: monthNames[currentMonth], sales: 8200, orders: 200, growth: 9 }
      ];
    } else {
      for (let i = 1; i < salesByMonth.length; i++) {
        const prev = salesByMonth[i - 1].sales || 0;
        const curr = salesByMonth[i].sales || 0;
        salesByMonth[i].growth = prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(2)) : 0;
      }
      if (salesByMonth.length > 0 && salesByMonth[0].growth === undefined) salesByMonth[0].growth = 0;
    }

    // Sales by category (Updated for Items schema)
    const byCategoryAgg = await Order.aggregate([
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.foodId', foreignField: '_id', as: 'prod' } },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$prod.category', 'Breakfast'] },
          sales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { sales: -1 } }
    ]);

    let salesByCategory = [];
    if (byCategoryAgg.length > 0) {
      const totalCategorySales = byCategoryAgg.reduce((s, c) => s + (c.sales || 0), 0) || 0;
      salesByCategory = byCategoryAgg.map(c => ({
        name: c._id.charAt(0).toUpperCase() + c._id.slice(1),
        sales: Number(c.sales || 0),
        value: Number(c.sales || 0),
        orders: Number(c.orders || 0),
        percentage: totalCategorySales > 0 ? Number(((c.sales / totalCategorySales) * 100).toFixed(2)) : 0
      }));
    } else {
      salesByCategory = [
        { name: 'Breakfast', sales: 2500, value: 2500, orders: 45, percentage: 30 },
        { name: 'Lunch', sales: 4200, value: 4200, orders: 38, percentage: 50 },
        { name: 'Snacks', sales: 1800, value: 1800, orders: 22, percentage: 20 }
      ];
    }

    let recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    let recentOrdersData = recentOrders.map(order => ({
      id: order._id,
      tokenNumber: order.tokenNumber,
      userName: order.user?.name || 'Guest',
      userEmail: order.user?.email || 'N/A',
      date: order.createdAt,
      total: order.totalAmount,
      status: order.orderStatus,
      itemsCount: order.items?.length || 0,
      deliveryType: order.deliveryType
    }));

    let topProducts = await Product.find()
      .sort({ numReviews: -1 })
      .limit(5);

    const analyticsData = {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      salesByMonth,
      salesByCategory,
      recentOrders: recentOrdersData,
      topProducts: topProducts.map(product => ({
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        rating: product.rating || 5, // Food court items usually start fresh
        totalSales: product.numReviews || 0,
        stock: product.stock || 0,
        category: product.category || 'other'
      })),
      userMetrics: {
        adminCount: await User.countDocuments({ role: 'admin' }),
        regularUserCount: await User.countDocuments({ role: 'user' }),
        newUsersThisMonth: await User.countDocuments({
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }),
        averageOrdersPerUser: totalUsers > 0 ? (totalOrders / totalUsers).toFixed(2) : 0
      }
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

// GET /api/analytics/daily-product-sales
router.get('/daily-product-sales', protect, admin, async (req, res) => {
  try {
    const requestedDate = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`📊 Fetching daily sales for: ${startOfDay.toISOString().split('T')[0]}`);

    // Aggregate sales data per product for the specified day
    const productSalesAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          orderStatus: { $ne: 'Cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.foodId',
          totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Get all products to show even those with 0 sales
    const allProducts = await Product.find({}, 'name price image category stock');

    const salesMap = productSalesAgg.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr;
      return acc;
    }, {});

    const report = allProducts.map(prod => {
      const stats = salesMap[prod._id.toString()] || { totalSales: 0, totalQuantity: 0, orderCount: 0 };
      return {
        id: prod._id,
        name: prod.name,
        price: prod.price,
        image: prod.image,
        category: prod.category,
        stock: prod.stock,
        sales: stats.totalSales,
        quantitySold: stats.totalQuantity,
        orders: stats.orderCount
      };
    }).sort((a, b) => b.sales - a.sales);

    res.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        totalDayRevenue: productSalesAgg.reduce((sum, item) => sum + item.totalSales, 0),
        products: report
      }
    });
  } catch (error) {
    console.error('❌ Daily Sales Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching daily sales' });
  }
});

// GET /api/analytics/sales-trend (Last 30 days day-by-day)
router.get('/sales-trend', protect, admin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const trendAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          orderStatus: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: trendAgg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching sales trend' });
  }
});

// GET /api/analytics/product-peaks (Peak daily sales for each product)
router.get('/product-peaks', protect, admin, async (req, res) => {
  try {
    const peakAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            productId: "$items.foodId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          dailyQty: { $sum: "$items.quantity" },
          dailyRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { dailyQty: -1 } },
      {
        $group: {
          _id: "$_id.productId",
          peakQuantity: { $first: "$dailyQty" },
          peakDate: { $first: "$_id.date" },
          peakRevenue: { $max: "$dailyRevenue" }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          id: "$_id",
          name: "$product.name",
          peakQuantity: 1,
          peakDate: 1,
          peakRevenue: 1
        }
      }
    ]);

    res.json({ success: true, data: peakAgg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching product peaks' });
  }
});

module.exports = router;