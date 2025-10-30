import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, User, UserCheck, X } from 'lucide-react';
import DataService from '../components/services/DataService.jsx';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const validateToken = async () => {
    try {
      const response = await DataService.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
        setLoading(false);
    }
  };


  useEffect(() => {
    validateToken();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await DataService.login(credentials);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      }
      throw new Error(response.message);
    } catch (error) {
      return { success: false, message: error.message || 'Login failed.' };
    }
  };
  
  const socialLogin = async (provider, tokenData) => {
    try {
      const response = await DataService.socialLogin(provider, tokenData);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      }
      throw new Error(response.message);
    } catch (error) {
      return { success: false, message: error.message || `${provider} login failed.` };
    }
  };

  const logout = () => {
    DataService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const register = async (userData) => {
    try {
      const response = await DataService.register(userData);
      return response;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const refreshUser = async () => {
    console.log('Refreshing user data due to permission change...');
    setLoading(true);
    await validateToken();
  };

  const value = { user, isAuthenticated, loading, login, logout, register, socialLogin, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center p-12">Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
export const UnifiedLoginPortal = ({ isOpen, onClose, showRegistration = false }) => {
  const { login, register, socialLogin, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(!showRegistration);
  const [activeTab, setActiveTab] = useState('customer');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginPrivacyContent, setLoginPrivacyContent] = useState(''); 
  const [agreedToLoginPrivacy, setAgreedToLoginPrivacy] = useState(false); 

  const handleGoogleCallbackResponse = async (response) => {
    setLoading(true);
    setError('');
    const result = await socialLogin('google', { credential: response.credential });
    if (result.success) {
        onClose();
    } else {
        setError(result.message || "Login failed.");
    }
    setLoading(false);
  };

  const initializeGoogleGSI = () => {
    if (!window.google || !document.getElementById("googleSignInButton")) {
      setTimeout(initializeGoogleGSI, 100);
      return;
    }
    
    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallbackResponse
        });
        window.google.accounts.id.renderButton(
            document.getElementById("googleSignInButton"),
            { theme: "outline", size: "large", text: "continue_with" } 
        );
    } catch (error) {
        console.error("Error initializing Google Sign-In:", error);
        setError("Could not load Google Sign-In. Please try again.");
    }
  };

  useEffect(() => {
    if (!isOpen) {
        resetForm();
        return;
    };
    const fetchLoginPrivacyContent = async () => {
        try {
            const response = await DataService.fetchContent('loginPrivacy');
            if (response.success && response.data.content) {
                setLoginPrivacyContent(response.data.content);
            }
        } catch (error) {
            console.warn('Login Privacy content not found. Please create it in admin Content Management.');
        }
    };
    fetchLoginPrivacyContent();

    if (!GOOGLE_CLIENT_ID) {
        console.warn('VITE_GOOGLE_CLIENT_ID is not configured in your .env file. Google Login will fail.');
        setError('Google Login is not configured by the administrator.');
    }
    
    const googleScriptId = 'google-gsi-script';
    if (!document.getElementById(googleScriptId) && GOOGLE_CLIENT_ID) {
        const googleScript = document.createElement('script');
        googleScript.id = googleScriptId;
        googleScript.src = 'https://accounts.google.com/gsi/client';
        googleScript.async = true;
        googleScript.defer = true;
        googleScript.onload = initializeGoogleGSI; 
        document.body.appendChild(googleScript);
    } else if (GOOGLE_CLIENT_ID) {
        initializeGoogleGSI();
    }

  }, [isOpen]); 

  useEffect(() => {
    setIsLoginView(!showRegistration);
    setActiveTab(showRegistration ? 'customer' : 'customer');
  }, [showRegistration, isOpen]);
  
  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
    setError('');
    setShowPassword(false);
    setAgreedToLoginPrivacy(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsLoginView(true); 
    resetForm();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let result;
    if (isLoginView) {
      result = await login({ email: formData.email, password: formData.password });
      if (result.success) {
        if (activeTab === 'customer' && result.user.role !== 'customer') {
          logout(); 
          setError('This login is for customers only. Please use the Staff login.');
          setLoading(false);
          return;
        }
        if (activeTab === 'staff' && (result.user.role !== 'admin' && result.user.role !== 'employee')) {
          logout();
          setError('This login is for staff only. Please use the Customer login.');
          setLoading(false);
          return;
        }

        onClose();
        switch (result.user.role) {
          case 'admin': navigate('/owner/dashboard', { replace: true }); break;
          case 'employee': navigate('/employee/dashboard', { replace: true }); break;
          case 'customer': navigate('/my-bookings', { replace: true }); break;
          default: navigate('/');
        }
      } else { setError(result.message); }
    } else {
      if (activeTab === 'staff') {
        setError("Staff cannot register through this form.");
        setLoading(false);
        return;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      
      if (!agreedToLoginPrivacy && activeTab === 'customer') {
          setError("You must agree to the Privacy Policy to create an account.");
          setLoading(false);
          return;
      }
      
      result = await register(formData);
      if (result.success) {
        alert('Registration successful! Please log in.');
        setIsLoginView(true);
        resetForm();
      } else { 
        if (result.errors && result.errors.length > 0) {
          setError(result.errors[0].msg);
        } else {
          setError(result.message); 
        }
      }
    }
    setLoading(false);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'firstName' || name === 'lastName') {
      const filteredValue = value.replace(/[0-9]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
        <div className="p-8">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{isLoginView ? 'Welcome Back' : 'Create Your Account'}</h2>
            </div>

            <div className="flex border-b mb-6">
                <button onClick={() => handleTabChange('customer')} className={`w-1/2 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'customer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}><User size={16}/> Customer</button>
                <button onClick={() => handleTabChange('staff')} className={`w-1/2 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'staff' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}><Shield size={16}/> Staff</button>
            </div>

            {error && <div className="mb-4 text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {!isLoginView && activeTab === 'customer' && (
                <div className="flex gap-4">
                  <input type="text" name="firstName" placeholder="First Name" onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                  <input type="text" name="lastName" placeholder="Last Name" onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                </div>
              )}
              <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Password" value={formData.password} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500"><EyeOff size={18} className={showPassword ? '' : 'hidden'}/><Eye size={18} className={showPassword ? 'hidden' : ''}/></button>
              </div>
              
              {/* policy Checkbox for Registration */}
              {!isLoginView && activeTab === 'customer' && (
                  <div className="flex items-start mt-4">
                      <input 
                        type="checkbox" 
                        id="agreedToLoginPrivacy" 
                        checked={agreedToLoginPrivacy} 
                        onChange={(e) => setAgreedToLoginPrivacy(e.target.checked)} 
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1 flex-shrink-0"
                        required 
                      />
                      <label htmlFor="agreedToLoginPrivacy" className="ml-2 block text-sm text-gray-900">
                          I agree to the {' '}
                          <Link to="/login-privacy" target="_blank" onClick={onClose} className="text-blue-600 hover:underline font-semibold">
                            Login Privacy Policy
                          </Link>
                          .
                      </label>
                  </div>
              )}
              
              {isLoginView && <div className="text-right"><Link to="/forgot-password" onClick={onClose} className="text-sm text-blue-600 hover:underline">Forgot password?</Link></div>}
              
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-blue-400">{loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Create Account')}</button>
            </form>
            
            {activeTab === 'customer' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
                </div>
                {}
                <div className="space-y-3 flex flex-col items-center">
                  <div id="googleSignInButton" className="flex justify-center"></div>
                  {}
                </div>
              </>
            )}

            <p className="mt-6 text-center text-sm text-gray-500">
              {isLoginView && activeTab === 'customer' ? "Don't have an account? " : "Already have an account? "}
              {activeTab === 'customer' && 
                <button onClick={() => { setIsLoginView(!isLoginView); resetForm(); }} className="font-semibold text-blue-600 hover:underline">
                  {isLoginView ? 'Sign up' : 'Sign in'}
                </button>
              }
            </p>
        </div>
      </div>
    </div>
  );
}