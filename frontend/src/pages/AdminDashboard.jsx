import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiUsers, FiShoppingCart, FiDollarSign, FiTrendingUp, FiDownload, FiRefreshCw, FiPieChart, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';
import { formatPrice, formatDate, getStatusColor } from "../utils/helpers";
import { constructImageUrl } from '../utils/imageUtils';
import { getDemandScore, getDemandLabel, getPrepRecommendation } from '../utils/demandPrediction';
import { downloadDatabaseBackup } from '../services/backupService';
import '../styles/admin.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

// Service Unit Detection Logic
const detectServiceUnit = (product) => {
  const category = product.category?.toLowerCase() || '';

  // 🥤 Juice Counter
  if (category.includes('juice') || category.includes('beverage')) {
    return 'Juice Counter';
  }

  // 🍟 Snack Counter
  if (
    category.includes('snack') ||
    category.includes('dessert') ||
    category.includes('north')
  ) {
    return 'Snack Counter';
  }

  // 🍳 Kitchen (default)
  return 'Kitchen';
};

const groupByServiceUnit = (products) => {
  return {
    Kitchen: products.filter(p => detectServiceUnit(p) === 'Kitchen'),
    Snack: products.filter(p => detectServiceUnit(p) === 'Snack Counter'),
    Juice: products.filter(p => detectServiceUnit(p) === 'Juice Counter')
  };
};

// VTPI Calculation Logic
const calculateVTPI = ({ avgEta, avgStock, rating }) => {
  let score = 0;

  if (avgEta <= 10) score += 40;
  else if (avgEta <= 18) score += 28;
  else score += 15;

  if (avgStock >= 20) score += 30;
  else if (avgStock >= 10) score += 18;
  else score += 10;

  score += Math.min(rating * 6, 30);

  return Math.round(score);
};

const getVTPIStatus = (score) => {
  if (score >= 80) return { label: 'Excellent', color: '#16a34a' };
  if (score >= 60) return { label: 'Stable', color: '#f59e0b' };
  return { label: 'Needs Attention', color: '#dc2626' };
};

const calculateMetrics = (items = []) => {
  if (!items.length) return { avgEta: 0, avgStock: 0, rating: 0 };

  return {
    avgEta: Math.round(items.reduce((s, i) => s + (i.eta || 15), 0) / items.length),
    avgStock: Math.round(items.reduce((s, i) => s + (i.stock || 0), 0) / items.length),
    rating: Number((items.reduce((s, i) => s + (i.rating || 0), 0) / items.length).toFixed(1))
  };
};

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
    const intervalId = setInterval(() => {
      loadAnalytics();
    }, 30000); // 30s refresh for live kitchen
    return () => clearInterval(intervalId);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      const normalized = data && typeof data === 'object' && 'data' in data ? data.data : data;
      setAnalytics(normalized);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('AdminDashboard: Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFallbackImage = () => {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100';
  };

  const downloadExcelReport = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Dishes', analytics?.totalProducts || 0],
        ['Total Orders', analytics?.totalOrders || 0],
        ['Total Students', analytics?.totalUsers || 0],
        ['Total Revenue', analytics?.totalRevenue || 0]
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

      // Add service unit breakdown if products are available
      if (analytics?.topProducts) {
        const grouped = groupByServiceUnit(analytics.topProducts);
        const unitData = [
          ['Service Unit', 'Products Count'],
          ['Kitchen', grouped.Kitchen.length],
          ['Snack Counter', grouped.Snack.length],
          ['Juice Counter', grouped.Juice.length]
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(unitData), 'Service Units');
      }

      XLSX.writeFile(workbook, `kec-foodcourt-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { alert('Export failed'); }
  };

  const handleDatabaseBackup = async () => {
    try {
      setBackupLoading(true);
      await downloadDatabaseBackup();
      alert('✅ Backup downloaded successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      alert('❌ Backup failed: ' + error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner"></div>
      <p>Syncing KEC Kitchen Live Operations...</p>
    </div>
  );

  if (!analytics) return <div className="text-center p-4">Station Offline. Please check backend.</div>;

  const salesByMonth = analytics.salesByMonth || [];
  const salesByCategory = analytics.salesByCategory || [];

  // Demand Forecast with Prep Intelligence
  const currentHour = new Date().getHours();

  const demandPriority = {
    'High Demand': 3,
    'Moderate Demand': 2,
    'Low Demand': 1
  };

  const demandForecast = (analytics.topProducts || [])
    .map(product => {
      const score = getDemandScore(product.category, currentHour);
      const demand = getDemandLabel(score);

      const prep = getPrepRecommendation({
        category: product.category,
        demand,
        currentStock: product.stock || 0
      });

      // Mark "Prep-Ready" items (High demand, sufficient stock, no urgent prep)
      const isPrepReady =
        demand === 'High Demand' &&
        prep.recommendedQty === 0 &&
        prep.urgency !== 'High';

      return {
        name: product.name,
        category: product.category,
        demand,
        score,
        ...prep,
        isPrepReady
      };
    })
    .sort((a, b) => demandPriority[b.demand] - demandPriority[a.demand])
    .filter(item => !(item.category.toLowerCase().includes('breakfast') && currentHour >= 12));

  // VTPI Calculations
  const products = analytics.topProducts || [];

  const kitchenItems = products.filter(p => detectServiceUnit(p) === 'Kitchen');
  const snackItems = products.filter(p => detectServiceUnit(p) === 'Snack Counter');
  const juiceItems = products.filter(p => detectServiceUnit(p) === 'Juice Counter');

  const kitchenMetrics = calculateMetrics(kitchenItems);
  const snackMetrics = calculateMetrics(snackItems);
  const juiceMetrics = calculateMetrics(juiceItems);

  const kitchenVTPI = calculateVTPI(kitchenMetrics);
  const snackVTPI = calculateVTPI(snackMetrics);
  const juiceVTPI = calculateVTPI(juiceMetrics);

  return (
    <div className="admin-dashboard">
      <header className="admin-header-bar">
        <div>
          <h1>KEC Kitchen Command Center</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Live campus dining analytics as of {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleDatabaseBackup} 
            disabled={backupLoading}
            className="admin-btn-primary" 
            style={{ background: '#3b82f6' }}
            title="Backup all database collections as ZIP file"
          >
            <FiDownload /> <span>{backupLoading ? 'Backing up...' : 'Backup'}</span>
          </button>
          <button onClick={downloadExcelReport} className="admin-btn-primary" style={{ background: '#10b981' }}>
            <FiDownload /> <span>Export Stats</span>
          </button>
          <button onClick={loadAnalytics} className="admin-btn-primary">
            <FiRefreshCw /> <span>Live Refresh</span>
          </button>
        </div>
      </header>

      {/* Stats Cards Grid */}
      <section className="admin-stats-container">
        <div className="admin-stat-card">
          <div className="admin-stat-icon icon-products"><FiPackage /></div>
          <div className="admin-stat-info">
            <h3>Dishes in Menu</h3>
            <p>{analytics.totalProducts || 0}</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon icon-orders"><FiShoppingCart /></div>
          <div className="admin-stat-info">
            <h3>Kitchen Orders</h3>
            <p>{analytics.totalOrders || 0}</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon icon-users"><FiUsers /></div>
          <div className="admin-stat-info">
            <h3>Active Students</h3>
            <p>{analytics.totalUsers || 0}</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon icon-revenue"><FiDollarSign /></div>
          <div className="admin-stat-info">
            <h3>Daily Revenue</h3>
            <p>{formatPrice(analytics.totalRevenue || analytics.total_revenue || 0)}</p>
          </div>
        </div>
      </section>

      {/* 🔥 SERVICE UNIT HEALTH (VTPI) */}
      <section className="admin-card" style={{ marginBottom: '2.5rem' }}>
        <div className="admin-card-header">
          <h2>Service Unit Health (VTPI)</h2>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: '500' }}>Vendor Throughput Performance Index</span>
        </div>
        <div className="admin-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[{
              title: 'Kitchen',
              score: kitchenVTPI,
              metrics: kitchenMetrics,
              icon: '🍳',
              color: '#3b82f6',
              bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              trend: kitchenVTPI >= 70 ? 'up' : kitchenVTPI >= 50 ? 'stable' : 'down'
            }, {
              title: 'Snack Counter',
              score: snackVTPI,
              metrics: snackMetrics,
              icon: '🍟',
              color: '#f59e0b',
              bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              trend: snackVTPI >= 70 ? 'up' : snackVTPI >= 50 ? 'stable' : 'down'
            }, {
              title: 'Juice Counter',
              score: juiceVTPI,
              metrics: juiceMetrics,
              icon: '🥤',
              color: '#10b981',
              bgGradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              trend: juiceVTPI >= 70 ? 'up' : juiceVTPI >= 50 ? 'stable' : 'down'
            }].map(unit => {
              const status = getVTPIStatus(unit.score);
              const trendIcon = unit.trend === 'up' ? '↑' : unit.trend === 'down' ? '↓' : '→';
              const trendColor = unit.trend === 'up' ? '#16a34a' : unit.trend === 'down' ? '#dc2626' : '#64748b';

              return (
                <div key={unit.title} style={{
                  padding: '0',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  {/* Header with gradient */}
                  <div style={{
                    background: unit.bgGradient,
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{unit.icon}</span>
                      <div>
                        <h3 style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>{unit.title}</h3>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginTop: '0.25rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.25)',
                          fontSize: '0.75rem',
                          color: '#fff',
                          fontWeight: '600'
                        }}>
                          <span style={{ fontSize: '1rem' }}>{trendIcon}</span>
                          <span>{status.label}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '2.25rem',
                        fontWeight: '800',
                        color: '#fff',
                        lineHeight: '1',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {unit.score}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: '600',
                        marginTop: '0.125rem'
                      }}>
                        / 100
                      </div>
                    </div>
                  </div>

                  {/* Metrics body */}
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      {/* ETA Metric */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: `${unit.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem'
                          }}>⏱️</div>
                          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Avg ETA</span>
                        </div>
                        <strong style={{
                          fontSize: '1rem',
                          color: '#1e293b',
                          fontWeight: '700'
                        }}>{unit.metrics.avgEta} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>mins</span></strong>
                      </div>

                      {/* Stock Metric */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: `${unit.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem'
                          }}>📦</div>
                          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Avg Stock</span>
                        </div>
                        <strong style={{
                          fontSize: '1rem',
                          color: '#1e293b',
                          fontWeight: '700'
                        }}>{unit.metrics.avgStock} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>units</span></strong>
                      </div>

                      {/* Rating Metric */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: `${unit.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem'
                          }}>⭐</div>
                          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Rating</span>
                        </div>
                        <strong style={{
                          fontSize: '1rem',
                          color: '#1e293b',
                          fontWeight: '700'
                        }}>{unit.metrics.rating} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ 5.0</span></strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 🔮 DEMAND FORECAST + PREP INTELLIGENCE */}
      <section className="admin-card" style={{ marginBottom: '2.5rem' }}>
        <div className="admin-card-header">
          <h2>Demand Forecast & Prep Intelligence</h2>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: '500' }}>
            Next 30 minutes • Actionable Kitchen Insights • {new Date().toLocaleTimeString()}
          </span>
        </div>
        <div className="admin-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {demandForecast.slice(0, 6).map((item, idx) => {
              const demandColor =
                item.demand === 'High Demand' ? '#dc2626' :
                  item.demand === 'Moderate Demand' ? '#f59e0b' :
                    '#16a34a';

              const urgencyColor =
                item.urgency === 'High' ? '#dc2626' :
                  item.urgency === 'Medium' ? '#f59e0b' :
                    '#16a34a';

              return (
                <div
                  key={idx}
                  style={{
                    padding: '1rem 1.25rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${demandColor}`,
                    border: '1px solid #e2e8f0',
                    borderLeftWidth: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* TOP ROW */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: item.recommendedQty > 0 ? '0.75rem' : '0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#1e293b' }}>
                          {item.name}
                        </div>
                        {item.isPrepReady && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '4px',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            color: '#16a34a'
                          }}>
                            <FiCheckCircle size={10} />
                            <span>READY</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: '500' }}>
                        {item.category}
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.875rem',
                      borderRadius: '6px',
                      background: `${demandColor}15`,
                      border: `1px solid ${demandColor}30`,
                      fontWeight: '700',
                      fontSize: '0.8125rem',
                      color: demandColor,
                      whiteSpace: 'nowrap'
                    }}>
                      {item.demand === 'High Demand' && <FiTrendingUp size={14} />}
                      {item.demand === 'Moderate Demand' && <FiAlertCircle size={14} />}
                      {item.demand === 'Low Demand' && <FiCheckCircle size={14} />}
                      <span>{item.demand}</span>
                    </div>
                  </div>

                  {/* ACTION ROW */}
                  {item.recommendedQty > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: '600' }}>
                        <FiPackage size={16} style={{ color: demandColor }} />
                        <span>Prepare <strong style={{ color: demandColor }}>+{item.recommendedQty}</strong> units now</span>
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '4px',
                        background: `${urgencyColor}10`,
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        color: urgencyColor
                      }}>
                        <FiClock size={12} />
                        <span>{item.urgency} urgency</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shortcuts Row */}
      <div className="admin-card" style={{ marginBottom: '2.5rem' }}>
        <div className="admin-card-header">
          <h2>Kitchen Operations</h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-quick-grid">
            <Link to="/admin/products" className="admin-quick-btn">
              <FiPackage style={{ color: '#3b82f6' }} /> <span>Manage Menu</span>
            </Link>
            <Link to="/admin/orders" className="admin-quick-btn">
              <FiShoppingCart style={{ color: '#ec4899' }} /> <span>Live Orders</span>
            </Link>
            <Link to="/admin/users" className="admin-quick-btn">
              <FiUsers style={{ color: '#22c55e' }} /> <span>Student Base</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Data Visualization Row */}
      <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '2.5rem' }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Revenue Trend (Campus)</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setChartType('line')}
                className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-secondary'}`}
              >Sales</button>
              <button
                onClick={() => setChartType('bar')}
                className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-secondary'}`}
              >Volume</button>
            </div>
          </div>
          <div className="admin-card-body">
            <div style={{ height: '320px' }}>
              {chartType === 'line' ? (
                <Line
                  data={{
                    labels: salesByMonth.map(item => item.month),
                    datasets: [{
                      label: 'Daily Revenue',
                      data: salesByMonth.map(item => item.sales),
                      borderColor: '#0066cc',
                      backgroundColor: 'rgba(0, 102, 204, 0.05)',
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: '#fff',
                      pointBorderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.parsed.y !== null) {
                              label += formatPrice(context.parsed.y);
                            }
                            return label;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: function (value) {
                            return '₹' + value;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <Bar
                  data={{
                    labels: salesByMonth.map(item => item.month),
                    datasets: [{
                      label: 'Orders Count',
                      data: salesByMonth.map(item => item.orders),
                      backgroundColor: 'rgba(56, 189, 248, 0.8)',
                      borderRadius: 6
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Category Performance</h2>
          </div>
          <div className="admin-card-body">
            <div style={{ height: '320px' }}>
              <Pie
                data={{
                  labels: salesByCategory.map(item => item.name),
                  datasets: [{
                    data: salesByCategory.map(item => item.value),
                    backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operational Lists Row */}
      <div className="grid grid-2" style={{ gap: '2rem' }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Live Kitchen Tracker</h2>
            <Link to="/admin/orders" className="admin-link">Full Kitchen View</Link>
          </div>
          <div className="admin-card-body" style={{ padding: '0' }}>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Token #</th>
                    <th>Student</th>
                    <th>Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentOrders.slice(0, 6).map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: '700', color: '#0066cc' }}>{order.tokenNumber}</td>
                      <td>{order.userName}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.deliveryType}</span>
                      </td>
                      <td>
                        <span className={`admin-badge badge-${(order.status || 'Preparing').toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Popular Dishes</h2>
            <Link to="/admin/products" className="admin-link">Kitchen Menu</Link>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {analytics.topProducts.slice(0, 5).map((product, idx) => {
                const serviceUnit = detectServiceUnit(product);
                const unitColors = {
                  'Kitchen': '#3b82f6',
                  'Snack Counter': '#f59e0b',
                  'Juice Counter': '#10b981'
                };

                return (
                  <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '1.25rem', borderBottom: idx === 4 ? 'none' : '1px solid #f1f5f9' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc' }}>
                      <img
                        src={constructImageUrl(product.image)}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = createFallbackImage(); }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: '600', color: '#1e293b' }}>{product.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{formatPrice(product.price)} • {product.totalSales} sold</p>
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          background: `${unitColors[serviceUnit]}15`,
                          color: unitColors[serviceUnit],
                          fontWeight: '600'
                        }}>
                          {serviceUnit}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: `2px solid ${product.isVeg !== false ? '#10b981' : '#ef4444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '2px'
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: product.isVeg !== false ? '#10b981' : '#ef4444' }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;