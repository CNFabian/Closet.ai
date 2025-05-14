import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/Auth/PrivateRoute';
/*
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
*/
import DataAnalysis from './pages/DataAnalysisPage'


const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<DataAnalysis />} />
  
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <Profile />
        </PrivateRoute>
      } />
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

export default AppRoutes;