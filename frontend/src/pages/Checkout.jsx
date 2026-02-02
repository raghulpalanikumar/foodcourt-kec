import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiTruck, FiLock, FiCheck, FiDollarSign, FiCreditCard, FiShield, FiShoppingCart, FiClock, FiMapPin, FiPackage } from 'react-icons/fi';
import { useCart } from '../context/cartContext';
import { useAuth } from '../context/authContext';
import { api } from '../utils/api';
import { formatPrice } from '../utils/helpers';
import Image from '../components/Image';
import { constructImageUrl } from '../utils/imageUtils';

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  // Payment method (COD allowed for all options)
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // 🔥 NEW: State for Smart Queue Intelligence
  const [orderIntel, setOrderIntel] = useState(null);

  // Check for Buy Now item
  const buyNowItem = location.state?.buyNowItem;
  const isBuyNow = !!buyNowItem;

  // Use either buyNowItem (as an array) or cartItems
  const checkoutItems = isBuyNow ? [buyNowItem] : cartItems;

  useEffect(() => {
    console.log('Checkout component - Checkout items:', checkoutItems);
    console.log('Checkout component - Mode:', isBuyNow ? 'Buy Now' : 'Cart Checkout');
  }, [checkoutItems, isBuyNow]);

  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    email: user?.email || '',
    phone: '',
    deliveryType: 'Pickup', // Pickup | Delivery | ReserveTable
    tableNumber: '',
    classroomInfo: '',
    department: '',
    block: '',
    reservationSlot: '',
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [nextAvailableTime, setNextAvailableTime] = useState(null);
  const [reservationLoading, setReservationLoading] = useState(false);
  const todayStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const [availableTables, setAvailableTables] = useState([]);
  const [takenTables, setTakenTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [tablesError, setTablesError] = useState('');
  const [selectedTable, setSelectedTable] = useState('');

  // (No restriction: COD allowed for ReserveTable too)

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Calculate totals
  const subtotal = isBuyNow
    ? (buyNowItem.price * buyNowItem.quantity)
    : getCartTotal();

  const shipping = formData.shippingMethod === 'express' ? 19.99 : subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderResponse = await api.post('/payments/create-order', {
        amount: total, // Send standard units, backend handles conversion to paise
        currency: 'INR',
        receipt: `order_rcpt_${Date.now()}`
      });

      console.log('Razorpay Order Response:', orderResponse.data);

      if (!orderResponse.data || !orderResponse.data.order) {
        throw new Error('Failed to create Razorpay order');
      }

      const razorpayOrder = orderResponse.data.order;

      // Use Razorpay key from environment variables
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RgPhDkqd6kwdDQ',
        amount: razorpayOrder.amount, // Already in paise from backend
        currency: razorpayOrder.currency,
        name: "Starlit & Co",
        description: "Order Payment",
        order_id: razorpayOrder.id,
        handler: handleRazorpaySuccess,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: "#0066cc"
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };


      const razorpay = new window.Razorpay(options);
      razorpay.open();
      razorpay.on('payment.failed', (response) => {
        setLoading(false);
        alert(`Payment failed: ${response.error.description}`);
      });
    } catch (error) {
      console.error('Error initializing Razorpay:', error);
      setLoading(false);
      alert('Failed to initialize payment. Please try again.');
    }
  };

  const handleRazorpaySuccess = async (paymentResponse) => {
    setLoading(true);
    try {
      // Log payment response for debugging
      console.log('Payment response:', paymentResponse);

      // Skip verification for now
      console.log('Skipping payment verification for development');

      const orderData = {
        items: checkoutItems.map((item) => ({
          foodId: item.productId || item.id || item._id,
          foodName: item.name,
          price: item.price,
          quantity: item.quantity || 1
        })),
        paymentMethod: 'ONLINE',
        paymentStatus: 'Paid',
        paymentId: paymentResponse.razorpay_payment_id,
        deliveryType: formData.deliveryType,
        deliveryDetails: {
          classroomInfo: formData.classroomInfo,
          department: formData.department,
          block: formData.block,
          ...(formData.deliveryType === 'ReserveTable' && {
            reservationSlot: formData.reservationSlot,
            reservationTableNumber: Number(selectedTable)
          })
        },
        reservationSlot: formData.deliveryType === 'ReserveTable' ? formData.reservationSlot : undefined,
        reservationTableNumber: formData.deliveryType === 'ReserveTable' ? Number(selectedTable) : undefined,
        totalAmount: total
      };

      // Create order
      const response = await api.post('/orders', orderData);
      console.log('Order created:', response.data);

      // 🔥 Capture ETA + alternate food from Razorpay order
      setOrderIntel({
        estimatedWait: response.data.data?.order?.estimatedWait || null,
        alternateFood: response.data.data?.order?.alternateFood || null
      });

      // Clear cart and show success
      // Clear cart only if it's not a direct buy now
      if (!isBuyNow) {
        clearCart();
      }
      setOrderPlaced(true);
      setLoading(false);

      // Redirect to order success page or show success message
      alert('Order placed successfully!');
      navigate('/orders');
    } catch (error) {
      console.error('Order creation failed:', error);
      setLoading(false);
      alert('Payment was successful but there was an issue creating your order. Please contact support with payment ID: ' +
        (paymentResponse.razorpay_payment_id || 'N/A'));
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    alert(`Payment error: ${error?.message || 'Something went wrong with the payment'}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.deliveryType === 'ReserveTable') {
      if (!formData.reservationSlot) {
        alert('Please select a time slot for your table reservation.');
        return;
      }
      if (!selectedTable) {
        alert('Please select a table.');
        return;
      }
      if (availableSlots.length === 0 && nextAvailableTime) {
        alert(`Tables will be available after ${nextAvailableTime.label} due to over rush. Please choose another time.`);
        return;
      }
    }

    setLoading(true);

    try {
      if (paymentMethod === 'razorpay') {
        await handleRazorpayPayment();
      } else {
        // COD flow (including ReserveTable)
        const orderData = {
          items: checkoutItems.map((item) => ({
            foodId: item.productId || item.id || item._id,
            foodName: item.name,
            price: item.price,
            quantity: item.quantity || 1
          })),
          totalAmount: total,
          paymentMethod: 'CASH',
          deliveryType: formData.deliveryType,
          deliveryDetails: {
            classroomInfo: formData.classroomInfo,
            department: formData.department,
            block: formData.block,
            ...(formData.deliveryType === 'ReserveTable' && {
              reservationSlot: formData.reservationSlot,
              reservationTableNumber: Number(selectedTable)
            })
          },
          reservationSlot: formData.deliveryType === 'ReserveTable' ? formData.reservationSlot : undefined,
          reservationTableNumber: formData.deliveryType === 'ReserveTable' ? Number(selectedTable) : undefined,
          shippingAddress: {
            address:
              formData.deliveryType === 'Pickup'
                ? 'Food Court Pickup'
                : formData.deliveryType === 'ReserveTable'
                  ? 'Table Reservation'
                  : formData.classroomInfo || 'Delivery',
            city: 'Campus',
            postalCode: '000000',
            country: 'India'
          }
        };

        const response = await api.post('/orders', orderData);
        setOrderIntel({
          estimatedWait: response.data.data?.order?.estimatedWait || null,
          alternateFood: response.data.data?.order?.alternateFood || null
        });

        if (!isBuyNow) clearCart();
        setOrderPlaced(true);
      }
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      alert('There was an issue creating your order. Please try again.');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (checkoutItems.length === 0 && !orderPlaced) {
      navigate('/cart');
    }
  }, [checkoutItems.length, orderPlaced, navigate]);

  const fetchSlots = useCallback(async () => {
    if (formData.deliveryType !== 'ReserveTable') return;

    setReservationLoading(true);
    setAvailableSlots([]);
    setNextAvailableTime(null);
    setTablesError(null);

    try {
      console.log('Fetching slots from /reservations/availability...');
      // Pass the local todayStr to synchronize date with server
      const response = await api.get(`/reservations/availability?date=${todayStr}`);
      console.log('Slots response:', response);

      if (response.data?.success) {
        const slots = response.data.data.slots || [];
        setAvailableSlots(slots);

        // 🔥 Auto-select first NON-FULL slot for theater-like experience
        if (slots.length > 0 && !formData.reservationSlot) {
          const firstAvailable = slots.find(s => !s.isFull);
          if (firstAvailable) {
            handleInputChange({ target: { name: 'reservationSlot', value: firstAvailable.slotStart } });
          }
        }

        const validSlots = slots.filter(s => !s.isFull);
        if (validSlots.length === 0) {
          console.log('No slots for today, fetching next available...');
          const nextRes = await api.get('/reservations/next-available');
          if (nextRes.data?.success) {
            setNextAvailableTime(nextRes.data.data);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setTablesError('Failed to load timings. Please try again.');
    } finally {
      setReservationLoading(false);
    }
  }, [formData.deliveryType, todayStr, formData.reservationSlot, handleInputChange]);

  // Fetch available reservation slots when ReserveTable is selected
  useEffect(() => {
    if (formData.deliveryType === 'ReserveTable') {
      fetchSlots();
    } else {
      setAvailableSlots([]);
      setNextAvailableTime(null);
      setAvailableTables([]);
      setSelectedTable('');
    }
  }, [formData.deliveryType, fetchSlots]);

  // Fetch table availability for selected slot (today only)
  useEffect(() => {
    if (formData.deliveryType !== 'ReserveTable' || !formData.reservationSlot) {
      setAvailableTables([]);
      setTakenTables([]);
      setTablesLoading(false);
      setTablesLoaded(false);
      setTablesError('');
      setSelectedTable('');
      return;
    }
    let cancelled = false;
    setTablesLoading(true);
    setTablesLoaded(false);
    setTablesError('');
    setSelectedTable('');
    api.get(`/reservations/tables?slotStart=${encodeURIComponent(formData.reservationSlot)}`)
      .then((res) => {
        if (!cancelled && res.data?.success && res.data?.data) {
          const avail = res.data.data.availableTables || [];
          const taken = res.data.data.takenTables || [];
          setAvailableTables(avail);
          setTakenTables(taken);
          setTablesLoaded(true);

          // 🔥 Auto-select first free table
          if (avail.length > 0) {
            setSelectedTable(String(avail[0]));
          }

          if (avail.length === 0) {
            return api.get(`/reservations/next-available?from=${encodeURIComponent(formData.reservationSlot)}`);
          }
        }
      })
      .then((nextRes) => {
        if (!cancelled && nextRes?.data?.success && nextRes?.data?.data) {
          setNextAvailableTime(nextRes.data.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableTables([]);
          setTakenTables([]);
          setTablesError('Could not load table availability. Please retry.');
        }
      });
    return () => { cancelled = true; };
  }, [formData.deliveryType, formData.reservationSlot]);

  // Success screen
  if (orderPlaced) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="text-center" style={{ padding: '4rem 0' }}>
          <div className="card" style={{
            maxWidth: '500px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, #eef6ff 0%, #f0f9ff 100%)',
            border: '1px solid #e0f2fe',
            boxShadow: '0 10px 25px rgba(0, 102, 204, 0.1)'
          }}>
            <div className="card-body" style={{ padding: '3rem 2rem' }}>
              <div style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 2rem',
                background: 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0, 102, 204, 0.3)'
              }}>
                <FiCheck size={48} color="white" />
              </div>
              <h1 style={{
                color: '#059669',
                marginBottom: '1rem',
                fontSize: '2rem',
                fontWeight: '700'
              }}>
                Order Placed Successfully!
              </h1>
              <p style={{
                color: '#1f2937',
                marginBottom: '2rem',
                fontSize: '1.125rem',
                lineHeight: '1.6'
              }}>
                Thank you for your purchase. You will receive an order confirmation email shortly.
              </p>

              {/* 🔥 SMART QUEUE INTELLIGENCE - Show after order placement */}
              {orderIntel && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '2px solid #0066cc',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  textAlign: 'left'
                }}>
                  <h4 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#0066cc',
                    marginBottom: '1rem',
                    fontSize: '1.125rem',
                    fontWeight: '600'
                  }}>
                    <FiClock size={20} /> Smart Queue Intelligence
                  </h4>

                  {orderIntel.estimatedWait && (
                    <p style={{
                      fontSize: '1rem',
                      color: '#1f2937',
                      marginBottom: '0.75rem'
                    }}>
                      <strong>Estimated Wait Time:</strong>
                      <span style={{
                        color: '#0066cc',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        marginLeft: '0.5rem'
                      }}>
                        {orderIntel.estimatedWait} minutes
                      </span>
                    </p>
                  )}

                  {orderIntel.alternateFood && (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '1rem'
                    }}>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                        ⚡ Faster Option Available:
                      </p>
                      <p style={{
                        fontSize: '1rem',
                        color: '#0066cc',
                        fontWeight: '600',
                        margin: 0
                      }}>
                        {orderIntel.alternateFood.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-primary"
                  style={{
                    background: '#0066cc',
                    border: 'none',
                    color: 'white',
                    padding: '0.875rem 2rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    boxShadow: '0 8px 20px rgba(0, 102, 204, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  View Orders
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="btn btn-secondary"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #0066cc',
                    color: '#0066cc',
                    padding: '0.875rem 2rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    boxShadow: '0 8px 20px rgba(0, 102, 204, 0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(79, 172, 254, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 172, 254, 0.3)';
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 10px 25px rgba(0, 102, 204, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white'
          }}>Checkout</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
            Complete your order in just a few steps
          </p>
          <button
            type="button"
            onClick={() => {
              setFormData({
                firstName: user?.name?.split(' ')[0] || '',
                lastName: user?.name?.split(' ')[1] || '',
                email: user?.email || '',
                phone: '',
                deliveryType: 'Pickup',
                tableNumber: '',
                classroomInfo: '',
                department: '',
                block: '',
                reservationSlot: '',
              });
              setSelectedTable('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              marginTop: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              backdropFilter: 'blur(4px)'
            }}
          >
            Reset Form
          </button>
        </div>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-3" style={{ gap: '2rem', alignItems: 'start' }}>
          {/* Left Column - Forms */}
          <div style={{ gridColumn: '1 / 3', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Shipping Information */}
            <div className="card" style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <div className="card-header" style={{
                background: '#0066cc',
                color: 'white',
                borderBottom: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiShoppingCart size={20} color="white" />
                  <h3 style={{ margin: 0, color: 'white' }}>Dining & Delivery Options</h3>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      className="form-input"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      className="form-input"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">How would you like your food? *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                      border: `2px solid ${formData.deliveryType === 'Pickup' ? '#0066cc' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', background: formData.deliveryType === 'Pickup' ? 'rgba(0,102,204,0.08)' : '#f9fafb'
                    }}>
                      <input type="radio" name="deliveryType" value="Pickup" checked={formData.deliveryType === 'Pickup'} onChange={handleInputChange} />
                      <FiMapPin size={22} color={formData.deliveryType === 'Pickup' ? '#0066cc' : '#6b7280'} />
                      <div>
                        <strong>Pickup</strong> — Manually pick up and have food at your own place. FREE • 15–20 mins
                      </div>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                      border: `2px solid ${formData.deliveryType === 'Delivery' ? '#0066cc' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', background: formData.deliveryType === 'Delivery' ? 'rgba(0,102,204,0.08)' : '#f9fafb'
                    }}>
                      <input type="radio" name="deliveryType" value="Delivery" checked={formData.deliveryType === 'Delivery'} onChange={handleInputChange} />
                      <FiTruck size={22} color={formData.deliveryType === 'Delivery' ? '#0066cc' : '#6b7280'} />
                      <div>
                        <strong>Delivery</strong> — Delivered by our food court. • 15–20 mins
                      </div>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                      border: `2px solid ${formData.deliveryType === 'ReserveTable' ? '#0066cc' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', background: formData.deliveryType === 'ReserveTable' ? 'rgba(0,102,204,0.08)' : '#f9fafb'
                    }}>
                      <input type="radio" name="deliveryType" value="ReserveTable" checked={formData.deliveryType === 'ReserveTable'} onChange={handleInputChange} />
                      <FiPackage size={22} color={formData.deliveryType === 'ReserveTable' ? '#0066cc' : '#6b7280'} />
                      <div>
                        <strong>Reserve table</strong> — Dine at food court at your scheduled time (30 mins per reservation). FREE
                      </div>
                    </label>
                  </div>
                </div>

                {formData.deliveryType === 'ReserveTable' && (
                  <div className="form-group" style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Choose time slot (Today: {todayStr}) *</label>
                      <button
                        type="button"
                        onClick={fetchSlots}
                        disabled={reservationLoading}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: '#0ea5e9',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {reservationLoading ? 'Refreshing...' : 'Refresh Timings'}
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontSize: '0.875rem' }}>Select Time Slot</label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        {availableSlots.map((slot) => {
                          const isSelected = formData.reservationSlot === slot.slotStart;
                          return (
                            <button
                              key={slot.slotStart}
                              type="button"
                              disabled={slot.isFull || reservationLoading}
                              onClick={() => {
                                setSelectedTable('');
                                handleInputChange({ target: { name: 'reservationSlot', value: slot.slotStart } });
                              }}
                              style={{
                                padding: '0.75rem 0.5rem',
                                borderRadius: '10px',
                                border: isSelected ? '2px solid #0066cc' : '1px solid #e5e7eb',
                                background: slot.isFull ? '#f3f4f6' : isSelected ? '#ffffff' : '#ffffff',
                                cursor: slot.isFull ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.25rem',
                                opacity: slot.isFull ? 0.6 : 1,
                                position: 'relative',
                                boxShadow: isSelected ? '0 4px 12px rgba(0, 102, 204, 0.15)' : 'none',
                                transform: isSelected ? 'translateY(-2px)' : 'none',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={(e) => {
                                if (!slot.isFull && !isSelected) {
                                  e.currentTarget.style.borderColor = '#0066cc';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.05)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!slot.isFull && !isSelected) {
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              {isSelected && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  color: '#0066cc'
                                }}>
                                  <FiCheck size={12} />
                                </div>
                              )}
                              <span style={{
                                fontWeight: '700',
                                color: slot.isFull ? '#9ca3af' : isSelected ? '#0066cc' : '#1f2937',
                                fontSize: '0.9rem'
                              }}>
                                {slot.label}
                              </span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                color: slot.isFull ? '#ef4444' : isSelected ? '#0066cc' : '#059669',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em'
                              }}>
                                {slot.isFull ? 'Full' : `${slot.remainingTables} TBL`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {availableSlots.length === 0 && !reservationLoading && !nextAvailableTime && (
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>No time slots are currently available for today.</p>
                      )}
                    </div>

                    {formData.reservationSlot && (
                      <div style={{ marginTop: '1rem', animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                            Interactive Table Map
                          </span>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ffffff', border: '1px solid #e2e8f0' }}></div>
                              Free
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fee2e2' }}></div>
                              Booked
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(0,102,204,0.12)', border: '1px solid #0066cc' }}></div>
                              Selected
                            </div>
                          </div>
                        </div>

                        {tablesError && (
                          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#b91c1c', background: '#fef2f2', padding: '0.5rem', borderRadius: '4px' }}>
                            {tablesError}
                          </p>
                        )}

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: '0.75rem',
                          background: 'rgba(255,255,255,0.5)',
                          padding: '1rem',
                          borderRadius: '12px',
                          border: '1px dashed #cbd5e1'
                        }}>
                          {[1, 2, 3, 4, 5].map((t) => {
                            const isAvailable = tablesLoaded ? availableTables.includes(t) : false;
                            const isSelected = String(selectedTable) === String(t);
                            const isTaken = tablesLoaded ? takenTables.includes(t) : false;

                            return (
                              <button
                                key={t}
                                type="button"
                                disabled={!tablesLoaded || (!isAvailable && !isSelected)}
                                onClick={() => setSelectedTable(String(t))}
                                style={{
                                  aspectRatio: '1',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  borderRadius: '12px',
                                  border: isSelected ? '2px solid #0066cc' : '1px solid #e2e8f0',
                                  background: !tablesLoaded ? '#f8fafc' : isTaken ? '#fee2e2' : isSelected ? 'rgba(0,102,204,0.1)' : '#ffffff',
                                  color: isTaken ? '#ef4444' : isSelected ? '#0066cc' : '#475569',
                                  cursor: (!tablesLoaded || (isTaken && !isSelected)) ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: isSelected ? '0 4px 12px rgba(0,102,204,0.15)' : 'none',
                                  transform: isSelected ? 'scale(1.05)' : 'none',
                                  opacity: (isTaken && !isSelected) ? 0.7 : 1
                                }}
                              >
                                <span style={{ fontSize: '1rem', fontWeight: 800 }}>T{t}</span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                  {!tablesLoaded ? '...' : isTaken ? 'Booked' : isSelected ? 'Selected' : 'Free'}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                            {tablesLoading ? 'Updating real-time status...' : selectedTable ? `You have selected Table ${selectedTable}` : 'Please tap a free table to reserve it'}
                          </p>
                        </div>
                      </div>
                    )}
                    {reservationLoading && <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Loading available slots…</p>}
                    {!reservationLoading && (availableSlots.length === 0 || availableSlots.every(s => s.isFull)) && nextAvailableTime && (
                      <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: '#b45309', fontWeight: '600', background: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                        <FiClock style={{ marginRight: '0.5rem' }} />
                        Tables will be available after <strong>{nextAvailableTime.label}</strong> {nextAvailableTime.isToday ? 'today' : ''} due to over rush.
                      </p>
                    )}
                    {!reservationLoading && availableSlots.length === 0 && !nextAvailableTime && (
                      <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                        All reservation slots for today are closed. Please try another day or check back tomorrow.
                      </p>
                    )}
                  </div>
                )}

                {formData.deliveryType === 'Delivery' && (
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label">Block / Building *</label>
                      <input type="text" name="block" className="form-input" placeholder="e.g., MBA Block / C1" value={formData.block} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Room / Location *</label>
                      <input type="text" name="classroomInfo" className="form-input" placeholder="e.g., Room 204" value={formData.classroomInfo} onChange={handleInputChange} required />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Department (optional)</label>
                  <input type="text" name="department" className="form-input" placeholder="e.g., CSE / ECE" value={formData.department} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card" style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <div className="card-header" style={{
                background: '#0052a3',
                color: 'white',
                borderBottom: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiDollarSign size={20} color="white" />
                  <h3 style={{ margin: 0, color: 'white' }}>Payment Method</h3>
                  <FiLock size={16} color="white" style={{ marginLeft: 'auto' }} />
                </div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: '1rem' }}>
                  {/* Cash on Delivery */}
                  <div
                    onClick={() => setPaymentMethod('cod')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: paymentMethod === 'cod' ? 'rgba(16, 185, 129, 0.1)' : '#f9fafb',
                      border: `2px solid ${paymentMethod === 'cod' ? '#10b981' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${paymentMethod === 'cod' ? '#10b981' : '#9ca3af'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {paymentMethod === 'cod' && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981'
                        }} />
                      )}
                    </div>
                    <FiDollarSign size={24} color={paymentMethod === 'cod' ? '#10b981' : '#6b7280'} />
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: paymentMethod === 'cod' ? '#10b981' : '#1f2937' }}>
                        Cash on Delivery
                      </h4>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                        Pay when you receive your order
                      </p>
                    </div>
                  </div>

                  {/* Razorpay Payment */}
                  <div
                    onClick={() => setPaymentMethod('razorpay')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: paymentMethod === 'razorpay' ? 'rgba(59, 130, 246, 0.1)' : '#f9fafb',
                      border: `2px solid ${paymentMethod === 'razorpay' ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${paymentMethod === 'razorpay' ? '#3b82f6' : '#9ca3af'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {paymentMethod === 'razorpay' && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6'
                        }} />
                      )}
                    </div>
                    <FiCreditCard size={24} color={paymentMethod === 'razorpay' ? '#3b82f6' : '#6b7280'} />
                    <div>
                      <h4 style={{
                        margin: '0 0 0.25rem 0',
                        color: paymentMethod === 'razorpay' ? '#3b82f6' : '#1f2937'
                      }}>
                        Pay Online (Razorpay)
                      </h4>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                        Credit/Debit Card, UPI, Net Banking
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {paymentMethod === 'razorpay' && (
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FiShield size={18} color="#3b82f6" />
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Secure payment powered by Razorpay. Your payment information is encrypted.
                    </span>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', fontSize: '0.875rem' }}>
                      COD enabled
                    </h4>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Pay when you receive your order.
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="card" style={{
              position: 'sticky',
              top: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <div className="card-header" style={{
                background: '#0052a3',
                color: 'white',
                borderBottom: 'none'
              }}>
                <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiShoppingCart size={20} color="white" />
                  Order Summary
                </h3>
              </div>
              <div className="card-body">
                {/* Cart Items */}
                <div style={{ marginBottom: '1.5rem' }}>
                  {checkoutItems.map((item, index) => (
                    <div
                      key={item.id || item._id || `item-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          marginRight: '1rem',
                          position: 'relative',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          backgroundColor: '#f3f4f6',
                        }}
                      >
                        <Image
                          src={constructImageUrl(item.image)}
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '0.25rem',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </div>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Shipping:</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax:</span>
                    <span>{formatPrice(tax)}</span>
                  </div>

                  <hr />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '600' }}>
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                  style={{
                    background: loading
                      ? '#e5e7eb'
                      : '#0066cc',
                    border: 'none',
                    color: loading ? '#9ca3af' : 'white',
                    padding: '1rem 2rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '1.125rem',
                    boxShadow: loading
                      ? 'none'
                      : '0 8px 20px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                >
                  {loading ? (
                    'Processing...'
                  ) : (
                    <>
                      <FiDollarSign />
                      Pay {formatPrice(total)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;