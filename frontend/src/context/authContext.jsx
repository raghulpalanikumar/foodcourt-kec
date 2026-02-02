import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

export const AuthProvider = ({ children, initialRole }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(initialRole || 'user');
  const [loading, setLoading] = useState(true);

  // Function to clear auth data
  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    setUserRole('user'); // Reset to default role

    // Clear session storage (tab-specific)
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');

    // Also clear localStorage just in case older data exists
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  useEffect(() => {
    // Session is now tab-specific (sessionStorage)
    // This achieves the "New tab = signed out" behavior
    const savedUser = sessionStorage.getItem('user');
    const savedToken = sessionStorage.getItem('token');
    const savedRole = localStorage.getItem('userRole');

    if (savedUser && savedToken) {
      if (isTokenExpired(savedToken)) {
        clearAuthData();
        setLoading(false);
      } else {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setToken(savedToken);
          setUserRole(userData.role || savedRole || 'user');

          // Verify with backend that the session is truly valid
          const verifySession = async () => {
            try {
              const response = await fetch('http://localhost:5000/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${savedToken}`
                }
              });

              if (!response.ok) {
                clearAuthData();
              } else {
                const data = await response.json();
                if (data.success) {
                  setUser(data.data.user);
                }
              }
            } catch (err) {
              
            } finally {
              setLoading(false);
            }
          };
          verifySession();
        } catch (error) {
          
          clearAuthData();
          setLoading(false);
        }
      }
    } else {
      if (savedRole) setUserRole(savedRole);
      setLoading(false);
    }
  }, []);

  // Window Focus Listener - Refresh validity when returning to tab
  useEffect(() => {
    const handleFocus = () => {
      if (token && isTokenExpired(token)) {
        clearAuthData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const { user, token } = responseData.data;

        setUser(user);
        setToken(token);
        setUserRole(user.role);

        // ✅ Critical: Use sessionStorage for Tab Isolation
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('token', token);

        // Preference persists across tabs
        localStorage.setItem('userRole', user.role);

        return { success: true, user };
      } else {
        return { success: false, message: responseData.message };
      }
    } catch (error) {
      
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const { user, token } = responseData.data;

        setUser(user);
        setToken(token);
        setUserRole(user.role);

        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('token', token);
        localStorage.setItem('userRole', user.role);

        return { success: true, user };
      } else {
        return { success: false, message: responseData.message };
      }
    } catch (error) {
      
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    clearAuthData();
  };

  const updateProfile = async (userData) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const updatedUser = responseData.data.user;
        setUser(updatedUser);
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      } else {
        return { success: false, message: responseData.message };
      }
    } catch (error) {
      
      return { success: false, message: 'Profile update failed. Please try again.' };
    }
  };

  const validateSession = () => {
    if (token && isTokenExpired(token)) {
      logout();
      return false;
    }
    return true;
  };

  const value = {
    user,
    token,
    userRole,
    loading,
    login,
    register,
    logout,
    updateProfile,
    setUserRole,
    validateSession,
    setUser: (userData) => {
      setUser(userData);
      if (userData) {
        sessionStorage.setItem('user', JSON.stringify(userData));
      } else {
        sessionStorage.removeItem('user');
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
