import './bootstrap';
import '../css/app.css';
import { createRoot } from 'react-dom/client';
import React from 'react';
import NotificationsPage from './pages/NotificationsPage.jsx';

const notificationsRoot = document.getElementById('notifications-app');
if (notificationsRoot) {
  createRoot(notificationsRoot).render(<NotificationsPage />);
}

