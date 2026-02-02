import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShoppingBag,
  FiTruck,
  FiShield,
  FiHeadphones,
  FiArrowRight,
  FiClock,
  FiAward,
  FiHeart,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiCheckCircle,
  FiZap,
  FiSun,
  FiMoon,
  FiCoffee
} from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import { api } from '../utils/api';
import Carousel from '../components/Carousel';
import Image from '../components/Image';
import '../styles/home.css';
import '../styles/features.css';
import '../styles/categories.css';
import '../styles/featured-products.css';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const products = await api.getProducts();
        const featured = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
        setFeaturedProducts(featured);
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    {
      name: 'Breakfast Special',
      description: 'Traditional South Indian delights',
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
      link: '/products?category=breakfast',
      icon: '🌅',
      color: 'from-orange-400 to-pink-500'
    },
    {
      name: 'Executive Lunch',
      description: 'Full meals & varieties',
      image: 'https://static.vecteezy.com/system/resources/previews/040/703/949/non_2x/ai-generated-royal-feast-master-the-art-of-chicken-biryani-at-home-generative-ai-photo.jpg',
      link: '/products?category=lunch',
      icon: '🍛',
      color: 'from-green-400 to-emerald-500'
    },
    {
      name: 'Snacks & Chats',
      description: 'Quick bites & evening treats',
      image: 'https://img.freepik.com/premium-photo/high-view-snacks-white-background-4k-hd-photo-product-design_1193781-35885.jpg?w=2000',
      link: '/products?category=snacks',
      icon: '🍟',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      name: 'Fresh Juices',
      description: 'Healthy & refreshing drinks',
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
      link: '/products?category=juices',
      icon: '🥤',
      color: 'from-blue-400 to-cyan-500'
    },
    {
      name: 'Biryani Corner',
      description: 'Aromatic & flavorful biryanis',
      image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
      link: '/products?category=biryani',
      icon: '🥘',
      color: 'from-red-500 to-orange-600'
    },
    {
      name: 'Dessert Hub',
      description: 'Sweet endings & delicacies',
      image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
      link: '/products?category=desserts',
      icon: '🍨',
      color: 'from-pink-400 to-red-500'
    }
  ];

  const testimonials = [
    {
      name: 'Karthik Rajendran',
      role: 'Final Year CSE',
      image: 'https://i.pravatar.cc/150?img=12',
      text: 'The best food court on campus! Quick service, great taste, and very affordable. The online ordering system is a lifesaver!',
      rating: 5
    },
    {
      name: 'Priya Selvam',
      role: 'Third Year ECE',
      image: 'https://i.pravatar.cc/150?img=45',
      text: 'Love the variety and quality! The breakfast dosas are amazing, and the lunch thali is value for money. Highly recommend!',
      rating: 5
    },
    {
      name: 'Arjun Kumar',
      role: 'Second Year Mech',
      image: 'https://i.pravatar.cc/150?img=33',
      text: 'Clean, hygienic, and delicious food. The staff is friendly and the ambiance is great for hanging out with friends.',
      rating: 5
    }
  ];

  const timeSlots = [
    {
      icon: <FiSun className="w-6 h-6" />,
      title: 'Breakfast',
      time: '7:00 AM - 10:00 AM',
      gradient: 'from-orange-400 to-yellow-400',
      popular: 'Idli, Dosa, Pongal'
    },
    {
      icon: <FiCoffee className="w-6 h-6" />,
      title: 'Lunch',
      time: '12:00 PM - 3:00 PM',
      gradient: 'from-green-400 to-emerald-500',
      popular: 'Meals, Biryani, Curries'
    },
    {
      icon: <FiMoon className="w-6 h-6" />,
      title: 'Evening Snacks',
      time: '4:00 PM - 8:00 PM',
      gradient: 'from-purple-400 to-pink-500',
      popular: 'Samosa, Bajji, Juices'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
        }

        /* Enhanced Hero Carousel Styles */
        .enhanced-hero {
          position: relative;
          overflow: hidden;
        }

        .parallax-bg {
          transform: translateY(${scrollY * 0.5}px);
          transition: transform 0.1s ease-out;
        }

        /* Floating Animation */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        /* Pulse Animation */
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }

        /* Gradient Text */
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Enhanced Feature Cards */
        .enhanced-feature-card {
          background: white;
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(59, 130, 246, 0.08);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .enhanced-feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6);
          background-size: 200% 100%;
          animation: gradientSlide 3s linear infinite;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .enhanced-feature-card:hover::before {
          opacity: 1;
        }

        @keyframes gradientSlide {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        .enhanced-feature-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 20px 60px rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .enhanced-feature-card .icon-container {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          font-size: 2.5rem;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          transition: all 0.3s ease;
        }

        .enhanced-feature-card:hover .icon-container {
          transform: rotate(5deg) scale(1.1);
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        /* Enhanced Category Cards */
        .enhanced-category-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          height: 400px;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .enhanced-category-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
          z-index: 1;
          transition: all 0.4s ease;
        }

        .enhanced-category-card:hover::before {
          background: linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.9) 100%);
        }

        .enhanced-category-card:hover {
          transform: translateY(-16px) scale(1.03);
          box-shadow: 0 25px 60px rgba(59, 130, 246, 0.3);
        }

        .enhanced-category-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .enhanced-category-card:hover img {
          transform: scale(1.15);
        }

        .category-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 2rem;
          z-index: 2;
          color: white;
          transform: translateY(0);
          transition: transform 0.4s ease;
        }

        .enhanced-category-card:hover .category-content {
          transform: translateY(-10px);
        }

        .category-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: inline-block;
          transition: transform 0.4s ease;
        }

        .enhanced-category-card:hover .category-icon {
          transform: scale(1.2) rotate(5deg);
        }

        /* Order Process Section */
        .process-container {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
          padding: 6rem 0;
          position: relative;
          overflow: hidden;
        }

        .process-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: moveBackground 20s linear infinite;
        }

        @keyframes moveBackground {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .process-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 2.5rem;
          text-align: center;
          color: white;
          transition: all 0.4s ease;
          position: relative;
          z-index: 1;
        }

        .process-card:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .process-step {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: #3b82f6;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          border: 4px solid white;
        }

        .process-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          display: block;
        }

        .process-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .process-desc {
          font-size: 1rem;
          opacity: 0.9;
          line-height: 1.6;
        }

        /* Testimonial Card */
        .testimonial-card {
          background: white;
          border-radius: 24px;
          padding: 3rem;
          box-shadow: 0 20px 60px rgba(59, 130, 246, 0.15);
          transition: all 0.4s ease;
          border: 2px solid #eff6ff;
        }

        .testimonial-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 80px rgba(59, 130, 246, 0.25);
          border-color: #3b82f6;
        }

        .testimonial-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 4px solid white;
          margin: -75px auto 1.5rem;
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2);
          object-fit: cover;
          position: relative;
          z-index: 2;
        }

        .star-rating {
          display: flex;
          justify-content: center;
          gap: 6px;
          color: #fbbf24;
          font-size: 1.25rem;
          margin: 0.5rem 0 1.5rem;
        }

        .quote-icon {
          font-size: 4rem;
          color: rgba(59, 130, 246, 0.1);
          position: absolute;
          top: 2rem;
          left: 2rem;
          font-family: serif;
          line-height: 1;
        }

        /* Time Slot Cards */
        .time-slot-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          transition: all 0.4s ease;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .time-slot-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }

        .time-slot-card:hover::before {
          transform: scaleX(1);
        }

        .time-slot-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .time-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .time-slot-card:hover .time-icon {
          transform: scale(1.1) rotate(5deg);
        }

        /* Newsletter Section */
        .newsletter-section {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
          padding: 6rem 0;
          position: relative;
          overflow: hidden;
        }

        .newsletter-bg-shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(40px);
        }

        .newsletter-form {
          display: flex;
          gap: 1rem;
          max-width: 600px;
          margin: 2rem auto 0;
          flex-wrap: wrap;
        }

        .newsletter-input {
          flex: 1;
          min-width: 250px;
          padding: 1.2rem 1.5rem;
          border-radius: 16px;
          border: none;
          font-size: 1rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .newsletter-input:focus {
          outline: none;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .newsletter-button {
          background: white;
          color: #3b82f6;
          border: none;
          padding: 1.2rem 3rem;
          border-radius: 16px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .newsletter-button:hover {
          background: #f0f9ff;
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        }

        /* Floating Badges */
        
        /* Loading Spinner */
        .enhanced-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #eff6ff;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .enhanced-category-card {
            height: 300px;
          }
          
          .stat-number {
            font-size: 2.5rem;
          }

          .newsletter-form {
            flex-direction: column;
          }

          .newsletter-input,
          .newsletter-button {
            width: 100%;
          }
        }

        /* Scroll-triggered animations */
        .fade-in-up {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 0.8s ease forwards;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }

        /* Button Hover Effects */
        .btn-enhanced {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 1rem 2.5rem;
          border-radius: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-enhanced:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
        }

        /* Section Headers */
        .section-header-enhanced {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-header-enhanced h2 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-header-enhanced p {
          font-size: 1.2rem;
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Decorative Elements */
        .decorative-circle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          opacity: 0.5;
          z-index: 0;
        }
      `}</style>

      {/* Enhanced Hero Carousel */}
      <div className="enhanced-hero parallax-bg">
        <Carousel
          slides={[
            {
              image: 'https://wallpapers.com/images/hd/food-4k-1pf6px6ryqfjtnyr.jpg',
              badge: 'KEC Premium Dining',
              title: 'Exquisite Flavors, Campus Convenience',
              subtitle: 'Elevating your college dining experience with premium cuisines and a vibrant, modern atmosphere.',
              primaryCta: { href: '/products', label: "Explore Today's Menu" },
              secondaryCta: { href: '/products?category=lunch', label: 'Lunch Specials' },
            },
            {
              image: 'https://wallpapers.com/images/hd/food-4k-3gsi5u6kjma5zkj0.jpg',
              badge: 'Authentic Heritage',
              title: 'Traditional South Indian Delicacies',
              subtitle: 'Savor the golden-crisp Dosas and fluffy Idlis, crafted with traditional recipes and premium ingredients.',
              primaryCta: { href: '/products?category=breakfast', label: 'Breakfast Menu' },
              secondaryCta: { href: '/products', label: 'View Full Menu' },
            },
            {
              image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop',
              badge: 'Community & Vibes',
              title: 'The Social Hub of Campus Life',
              subtitle: 'Take a break from the labs and reconnect with friends over delicious treats and refreshing juices.',
              primaryCta: { href: '/products', label: 'Order Now' },
              secondaryCta: { href: '#newsletter', label: 'Get Daily Updates' },
            },
          ]}
        />
      </div>

      {/* Enhanced Features Section */}
      <section style={{ padding: '6rem 0', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>
        <div className="decorative-circle" style={{ width: '400px', height: '400px', top: '-200px', right: '-200px' }}></div>
        <div className="decorative-circle" style={{ width: '300px', height: '300px', bottom: '-150px', left: '-150px' }}></div>

        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
          <div className="section-header-enhanced fade-in-up">
            <h2>Why Choose KEC Food Court?</h2>
            <p>Experience the perfect blend of taste, quality, and convenience</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div className="enhanced-feature-card fade-in-up stagger-1">
              <div className="icon-container">
                🥗
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e293b' }}>
                100% Hygienic
              </h3>
              <p style={{ color: '#64748b', lineHeight: '1.7' }}>
                Strict quality standards and fresh ingredients used daily. FSSAI certified kitchen with regular health inspections.
              </p>
            </div>

            <div className="enhanced-feature-card fade-in-up stagger-2">
              <div className="icon-container">
                ⚡
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e293b' }}>
                Quick Pickup
              </h3>
              <p style={{ color: '#64748b', lineHeight: '1.7' }}>
                Order online through our portal and skip the long queues. Get your food in under 5 minutes!
              </p>
            </div>

            <div className="enhanced-feature-card fade-in-up stagger-3">
              <div className="icon-container">
                🎓
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e293b' }}>
                Student Pricing
              </h3>
              <p style={{ color: '#64748b', lineHeight: '1.7' }}>
                Wallet-friendly rates designed for students. Full meals starting from just ₹50!
              </p>
            </div>


          </div>
        </div>
      </section>

      {/* Order Process Section */}
      <section className="process-container">
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
          <div className="section-header-enhanced" style={{ marginBottom: '5rem' }}>
            <h2 style={{ color: 'white', background: 'none', WebkitTextFillColor: 'white' }}>How It Works</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Get your favorite meal in four simple steps</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
            <div className="process-card fade-in-up stagger-1">
              <div className="process-step">1</div>
              <span className="process-icon">🔍</span>
              <h3 className="process-title">Browse Menu</h3>
              <p className="process-desc">Explore varied cuisines from South Indian classics to quick chats and juices.</p>
            </div>

            <div className="process-card fade-in-up stagger-2">
              <div className="process-step">2</div>
              <span className="process-icon">🛒</span>
              <h3 className="process-title">Add to Cart</h3>
              <p className="process-desc">Pick your favorites, customize toppings, and add them to your virtual tray.</p>
            </div>

            <div className="process-card fade-in-up stagger-3">
              <div className="process-step">3</div>
              <span className="process-icon">💳</span>
              <h3 className="process-title">Secure Pay</h3>
              <p className="process-desc">Complete your transaction quickly with our safe and integrated payment gateway.</p>
            </div>

            <div className="process-card fade-in-up stagger-4">
              <div className="process-step">4</div>
              <span className="process-icon">🍱</span>
              <h3 className="process-title">Quick Pickup</h3>
              <p className="process-desc">Receive a notification when it's ready and collect your hot meal from the counter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timing Slots Section */}
      <section style={{ padding: '6rem 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div className="section-header-enhanced">
            <h2>Our Operating Hours</h2>
            <p>Serving delicious food throughout the day</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {timeSlots.map((slot, index) => (
              <div key={index} className="time-slot-card">
                <div className={`time-icon bg-gradient-to-br ${slot.gradient}`} style={{ color: 'white' }}>
                  {slot.icon}
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                  {slot.title}
                </h3>
                <p style={{ fontSize: '1.1rem', color: '#3b82f6', fontWeight: '600', marginBottom: '1rem' }}>
                  {slot.time}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                  Popular: {slot.popular}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Categories */}
      <section style={{ padding: '6rem 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div className="section-header-enhanced">
            <h2>Explore Our Food Zones</h2>
            <p>From traditional South Indian breakfast to quick evening refreshments</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {categories.map((category) => (
              <Link key={category.name} to={category.link} className="enhanced-category-card">
                <Image
                  src={category.image}
                  alt={category.name}
                  fallback="/assets/no-image-placeholder.svg"
                />
                <div className="category-content">
                  <div className="category-icon">{category.icon}</div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {category.name}
                  </h3>
                  <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '1rem' }}>
                    {category.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>
                    View Menu <FiArrowRight />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: '6rem 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div className="section-header-enhanced">
            <h2>Today's Specials</h2>
            <p>Don't miss out on our chef's daily recommendations</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <div className="enhanced-spinner"></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/products" className="btn-enhanced">
              Explore Full Food Menu
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{ padding: '6rem 0', background: 'linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div className="section-header-enhanced">
            <h2>What Students Say</h2>
            <p>Real feedback from our valued customers</p>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="testimonial-card" style={{ marginTop: '4rem', textAlign: 'center', position: 'relative' }}>
              <div className="quote-icon">"</div>
              <img
                src={testimonials[activeTestimonial].image}
                alt={testimonials[activeTestimonial].name}
                className="testimonial-avatar"
              />
              <div className="star-rating">
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                  <FiStar key={i} style={{ fill: '#fbbf24', stroke: '#fbbf24' }} />
                ))}
              </div>
              <p style={{ fontSize: '1.25rem', color: '#334155', lineHeight: '1.8', marginBottom: '2rem', fontStyle: 'italic', fontWeight: '500' }}>
                "{testimonials[activeTestimonial].text}"
              </p>
              <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
                  {testimonials[activeTestimonial].name}
                </h4>
                <p style={{ color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>
                  {testimonials[activeTestimonial].role}
                </p>
              </div>
            </div>

            {/* Testimonial Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  style={{
                    width: index === activeTestimonial ? '40px' : '12px',
                    height: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: index === activeTestimonial ? '#3b82f6' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div >
      </section >

      {/* Newsletter */}
      < section className="newsletter-section" >
        <div className="newsletter-bg-shape" style={{ width: '400px', height: '400px', top: '-200px', right: '-200px' }}></div>
        <div className="newsletter-bg-shape" style={{ width: '300px', height: '300px', bottom: '-150px', left: '-150px' }}></div>

        <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>
            Never Miss a Special!
          </h2>
          <p style={{ fontSize: '1.2rem', opacity: 0.95, marginBottom: '2rem', color: 'white' }}>
            Subscribe to get daily updates on the menu and special festive delicacies.
          </p>

          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email address"
              className="newsletter-input"
              required
            />
            <button type="submit" className="newsletter-button">
              Subscribe Now
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '1rem' }}>
              <FiCheckCircle size={20} /> No spam ever
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '1rem' }}>
              <FiCheckCircle size={20} /> Exclusive deals
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '1rem' }}>
              <FiCheckCircle size={20} /> Unsubscribe anytime
            </div>
          </div>
        </div>
      </section >
    </div >
  );
};

export default Home;
