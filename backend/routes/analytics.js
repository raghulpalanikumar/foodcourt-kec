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

    // Sales by day (last 30 days) - total products sold per day
    let salesByDay = [];
    let peakDay = null;

    // Define startDate outside try block so it's available for dish-wise breakdown
    const daysBack = 30;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (daysBack - 1));

    try {
      const byDayAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            totalProductsSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // build a map for quick lookup
      const byDayMap = {};
      byDayAgg.forEach(d => {
        const yyyy = d._id.year;
        const mm = String(d._id.month).padStart(2, '0');
        const dd = String(d._id.day).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        byDayMap[key] = d.totalProductsSold || 0;
      });

      // ensure continuous last-30-days array (include zeros)
      for (let i = 0; i < daysBack; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        salesByDay.push({ date: key, totalProductsSold: byDayMap[key] || 0 });
      }

      // find peak day
      if (salesByDay.length > 0) {
        const maxVal = Math.max(...salesByDay.map(s => s.totalProductsSold));
        peakDay = salesByDay.find(s => s.totalProductsSold === maxVal) || salesByDay[0];
      }
    } catch (err) {
      console.error('Error computing salesByDay:', err.message);
      salesByDay = [];
      peakDay = null;
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

    // Dish-wise breakdown - organized by PRODUCT (not by day)
    let productDailySales = [];
    let topSellingProducts = [];

    try {
      // Get all products to ensure they all appear in the explorer
      const allProductsData = await Product.find({}, 'name price category');
      const productMap = {};

      allProductsData.forEach(p => {
        productMap[p._id.toString()] = {
          productId: p._id.toString(),
          productName: p.name,
          price: p.price,
          totalQuantity: 0,
          totalRevenue: 0,
          dailyBreakdown: {}
        };
      });

      // Get all products sold in last 30 days with their daily breakdown
      const productSalesAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              foodId: '$items.foodId',
              foodName: '$items.foodName' || 'Unknown',
              date: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              }
            },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            price: { $first: '$items.price' }
          }
        }
      ]);

      // Populate productMap with aggregation data
      productSalesAgg.forEach(item => {
        const productId = item._id.foodId.toString();
        const yyyy = item._id.date.year;
        const mm = String(item._id.date.month).padStart(2, '0');
        const dd = String(item._id.date.day).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;

        if (productMap[productId]) {
          productMap[productId].dailyBreakdown[dateKey] = {
            quantity: item.quantity,
            revenue: Number((item.revenue || 0).toFixed(2))
          };

          productMap[productId].totalQuantity += item.quantity;
          productMap[productId].totalRevenue += item.revenue || 0;

          // Update price from order items if available
          if (item.price) productMap[productId].price = item.price;
        }
      });

      // Convert to array and sort by total quantity
      productDailySales = Object.values(productMap)
        .map(product => ({
          productId: product.productId,
          productName: product.productName,
          price: product.price,
          totalQuantity: product.totalQuantity,
          totalRevenue: Number((product.totalRevenue).toFixed(2)),
          dailyBreakdown: product.dailyBreakdown // { "2026-01-05": {quantity, revenue}, ... }
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      // Get top 10 selling products
      topSellingProducts = productDailySales.slice(0, 10).map(p => ({
        productName: p.productName,
        totalQuantity: p.totalQuantity,
        totalRevenue: p.totalRevenue,
        price: p.price
      }));

    } catch (err) {
      console.error('Error computing product-wise daily sales:', err.message);
      productDailySales = [];
      topSellingProducts = [];
    }

    const analyticsData = {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      salesByMonth,
      salesByDay,
      peakDay,
      productDailySales,
      topSellingProducts,
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
        averageOrdersPerUser: totalUsers > 0 ? (totalOrders / totalUsers).toFixed(2) : 0,
        activeUsersToday: await User.countDocuments({
          updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        usersWithOrders: await Order.distinct('user').then(users => users.length),
        usersWithoutOrders: totalUsers - (await Order.distinct('user').then(users => users.length))
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

module.exports = router;