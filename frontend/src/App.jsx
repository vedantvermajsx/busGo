import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import BookingConfirm from './pages/BookingConfirm.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isHydrated } = useAuthStore(s => ({ 
    isAuthenticated: s.isAuthenticated, 
    isHydrated: s.isHydrated 
  }));

  if (!isHydrated) return null; // Or a loading spinner
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const hydrate = useAuthStore(s => s.hydrate);
  useEffect(() => hydrate(), []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="book" element={<PrivateRoute><BookingConfirm /></PrivateRoute>} />
        <Route path="my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
