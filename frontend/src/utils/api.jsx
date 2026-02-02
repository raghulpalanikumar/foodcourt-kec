import axios from "axios";

// Create a single axios instance with base URL
const API = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000
});

// Attach token automatically for every request if available
API.interceptors.request.use((req) => {
  // Try to get token from localStorage first (for browser compatibility)
  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch (e) {
    // If localStorage is not available, set token to null
    token = null;
  }

  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Smart product extractor function
const extractProducts = (data) => {
  console.log('Extracting products from:', data);
  console.log('Data type:', typeof data);
  console.log('Is array:', Array.isArray(data));

  // If it's already an array, return it
  if (Array.isArray(data)) {
    console.log('Data is array, returning directly');
    return data;
  }

  // If it's null or undefined
  if (!data) {
    console.log('Data is null/undefined, returning empty array');
    return [];
  }

  // If it's not an object, we can't extract from it
  if (typeof data !== 'object') {
    console.log('Data is not object, returning empty array');
    return [];
  }

  console.log('Object keys:', Object.keys(data));

  // Handle your specific case: { success: true, data: { products: [...] } }
  if (data.success && data.data && Array.isArray(data.data.products)) {
    console.log('Found products at data.data.products');
    return data.data.products;
  }

  // Handle case without success flag: { data: { products: [...] } }
  if (data.data && Array.isArray(data.data.products)) {
    console.log('Found products at data.data.products (no success flag)');
    return data.data.products;
  }

  // Try common property names for products array
  const productKeys = ['products', 'data', 'items', 'result', 'docs', 'product'];
  for (const key of productKeys) {
    if (data[key] && Array.isArray(data[key])) {
      console.log(`Found products array at key: ${key}`);
      return data[key];
    }
  }

  // Look for nested objects that might contain arrays
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      console.log(`Checking nested object at key: ${key}`, value);
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (Array.isArray(nestedValue)) {
          console.log(`Found nested array at ${key}.${nestedKey}`);
          return nestedValue;
        }
      }
    }
  }

  // Look for any array in the object
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      console.log(`Found array at key: ${key}, using it`);
      return value;
    }
  }

  // If no arrays found, return empty array
  console.log('No arrays found in object, returning empty array');
  return [];
};

// Smart user extractor function (similar to products)
const extractUsers = (data) => {
  console.log('Extracting users from:', data);

  // If it's already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  // If it's null or undefined
  if (!data) {
    return [];
  }

  // If it's not an object, we can't extract from it
  if (typeof data !== 'object') {
    return [];
  }

  // Handle your backend response: { success: true, data: [...] }
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  }

  // Handle case without success flag: { data: [...] }
  if (Array.isArray(data.data)) {
    return data.data;
  }

  // Try common property names for users array
  const userKeys = ['users', 'data', 'items', 'result', 'docs'];
  for (const key of userKeys) {
    if (data[key] && Array.isArray(data[key])) {
      return data[key];
    }
  }

  // If no arrays found, return empty array
  return [];
};

// Smart order extractor function (similar to products)
const extractOrders = (data) => {
  console.log('Extracting orders from:', data);

  // If it's already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  // If it's null or undefined
  if (!data) {
    return [];
  }

  // If it's not an object, we can't extract from it
  if (typeof data !== 'object') {
    return [];
  }

  // Handle your specific case: { success: true, data: { orders: [...] } }
  if (data.success && data.data && Array.isArray(data.data.orders)) {
    return data.data.orders;
  }

  // Handle case without success flag: { data: { orders: [...] } }
  if (data.data && Array.isArray(data.data.orders)) {
    return data.data.orders;
  }

  // Try common property names for orders array
  const orderKeys = ['orders', 'data', 'items', 'result', 'docs'];
  for (const key of orderKeys) {
    if (data[key] && Array.isArray(data[key])) {
      return data[key];
    }
  }

  // If no arrays found, return empty array
  return [];
};

const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const makeRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Handle body data properly
  if (options.body) {
    config.data = options.body;
    delete config.body;
  }

  try {
    const response = await API.request({
      url: endpoint,
      ...config
    });
    return response.data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Cart API methods - Define BEFORE using in the main api object
const cartAPI = {
  // Get user's cart
  getCart: async () => {
    try {
      const response = await API.get('/cart');
      return response.data;
    } catch (err) {
      console.error("API error fetching cart:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to fetch cart');
    }
  },

  // Add item to cart
  addToCart: async (cartItem) => {
    try {
      const response = await API.post('/cart/add', cartItem);
      return response.data;
    } catch (err) {
      console.error("API error adding to cart:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to add item to cart');
    }
  },

  // Update cart item quantity
  updateCartItem: async (productId, quantity) => {
    try {
      // Validate productId
      if (!productId || productId === 'undefined') {
        throw new Error('Invalid product ID');
      }

      console.log('API: Updating cart item:', productId, 'quantity:', quantity);

      const response = await API.put(`/cart/update/${productId}`, { quantity });
      return response.data;
    } catch (err) {
      console.error("API error updating cart item:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to update cart item');
    }
  },

  // Remove item from cart
  removeFromCart: async (productId) => {
    try {
      // Validate productId
      if (!productId || productId === 'undefined') {
        throw new Error('Invalid product ID');
      }

      console.log('API: Removing cart item:', productId);

      const response = await API.delete(`/cart/remove/${productId}`);
      return response.data;
    } catch (err) {
      console.error("API error removing from cart:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to remove item from cart');
    }
  },

  // Clear entire cart
  clearCart: async () => {
    try {
      const response = await API.delete('/cart/clear');
      return response.data;
    } catch (err) {
      console.error("API error clearing cart:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to clear cart');
    }
  },

  // Sync local cart with server cart (for login)
  syncCart: async (localCartItems) => {
    try {
      const response = await API.post('/cart/sync', { localCartItems });
      return response.data;
    } catch (err) {
      console.error("API error syncing cart:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to sync cart');
    }
  },

  // Get cart item count
  getCartCount: async () => {
    try {
      const response = await API.get('/cart/count');
      return response.data;
    } catch (err) {
      console.error("API error getting cart count:", err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to get cart count');
    }
  }
};

// Main API export object
export const api = {
  // Products API methods
  getProducts: async (filters = {}) => {
    try {
      const params = {};
      if (filters.category && filters.category !== "all") params.category = filters.category;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.search) params.search = filters.search;
      const response = await API.get("/products", { params });
      return extractProducts(response.data);
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to fetch products');
    }
  },

  getProduct: async (id) => {
    const response = await API.get(`/products/${id}`);
    return response.data;
  },

  addProduct: async (productData) => {
    const response = await API.post("/products", productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await API.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await API.delete(`/products/${id}`);
    return response.data;
  },

  getProductsByIds: async (ids) => {
    const idString = Array.isArray(ids) ? ids.join(',') : ids;
    const response = await API.get(`/products/by-ids?ids=${idString}`);
    return extractProducts(response.data);
  },

  // Users API methods
  getUsers: async () => {
    try {
      const response = await API.get("/users");
      return extractUsers(response.data);
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to fetch users');
    }
  },

  getUserStats: async () => {
    const response = await API.get('/users/stats/overview');
    return response.data.success ? response.data.data : response.data;
  },

  // Orders API methods
  getOrders: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') queryParams.append(key, filters[key]);
    });
    return makeRequest(`/orders/all${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  },

  getUserOrders: async () => {
    const response = await makeRequest('/orders');
    return response.data?.orders || response.orders || response;
  },

  getOrder: async (orderId) => {
    const response = await makeRequest(`/orders/${orderId}`);
    return response.data?.order || response.order || response;
  },

  createOrder: async (orderData) => {
    const response = await makeRequest('/orders', { method: 'POST', body: JSON.stringify(orderData) });
    return response.order || response;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await makeRequest(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    return response.order || response;
  },

  // Analytics API methods
  getAnalytics: async () => {
    const response = await API.get('/analytics');
    return response.data;
  },

  getDailySales: async (date) => {
    const response = await API.get('/analytics/daily-product-sales', { params: { date } });
    return response.data;
  },

  getSalesTrend: async () => {
    const response = await API.get('/analytics/sales-trend');
    return response.data;
  },

  getProductPeaks: async () => {
    const response = await API.get('/analytics/product-peaks');
    return response.data;
  },

  // Auth API methods
  login: async (credentials) => {
    return makeRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  },

  register: async (userData) => {
    return makeRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  },

  getProfile: async () => makeRequest('/auth/me'),

  updateProfile: async (userData) => {
    return makeRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(userData) });
  },

  // Cart methods (referencing cartAPI)
  getCart: cartAPI.getCart,
  addToCart: cartAPI.addToCart,
  updateCartItem: cartAPI.updateCartItem,
  removeFromCart: cartAPI.removeFromCart,
  clearCart: cartAPI.clearCart,
  syncCart: cartAPI.syncCart,
  getCartCount: cartAPI.getCartCount,

  // Review methods
  createReview: async (reviewData) => {
    const response = await API.post('/reviews', reviewData);
    return response.data;
  },

  getProductReviews: async (productId) => {
    const response = await API.get(`/reviews/product/${productId}`);
    return response.data.data || [];
  },

  getReviewableProducts: async () => {
    const response = await API.get('/reviews/user/reviewable-products');
    return response.data.data || [];
  },

  // Table Reservations
  getTableReservations: async (filters = {}) => {
    const params = {};
    if (filters.date) params.date = filters.date;
    if (filters.upcoming) params.upcoming = filters.upcoming;
    const response = await API.get('/reservations/admin/all', { params });
    return response.data;
  },

  // Generic methods
  post: async (endpoint, data) => API.post(endpoint, data),
  get: async (endpoint) => API.get(endpoint),
};

// Export both the main api and cartAPI separately
export { cartAPI };
export default API;