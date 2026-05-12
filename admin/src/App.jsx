import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminStore } from './store/adminStore.js';
import AdminLayout from './components/AdminLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Trips from './pages/Trips.jsx';
import TripDetails from './pages/TripDetails.jsx';
import Bookings from './pages/Bookings.jsx';
import Stops from './pages/Stops.jsx';
import Buses from './pages/Buses.jsx';

const Guard = ({ children }) => {
  const ok = useAdminStore(s => s.isAuthenticated);
  return ok ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // zustand persist hydration check
    const unsub = useAdminStore.persist.onFinishHydration(() => setIsHydrated(true));
    if (useAdminStore.persist.hasHydrated()) setIsHydrated(true);
    return () => unsub();
  }, []);

  if (!isHydrated) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><AdminLayout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="trips" element={<Trips />} />
        <Route path="trips/:id" element={<TripDetails />} />
        <Route path="buses" element={<Buses />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="stops" element={<Stops />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
