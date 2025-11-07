import './bootstrap';
import { createRoot } from 'react-dom/client';
import React from 'react';

import Dashboard from './pages/Dashboard';
import TaskIndex from './pages/TaskIndex';
import ProfilePage from './pages/ProfilePage';
import SummaryIndex from './pages/SummaryIndex';
import KpiPage from './pages/KpiPage';

// Import các tab quản lý
import UsersTab from './components/management/UsersTab.jsx';
import TasksTab from './components/management/TasksTab.tsx';
import KpiTab from './components/management/KpiTab.jsx';
import ReportsTab from './components/management/ReportsTab.tsx';
import AssignTaskTab from './components/management/AssignTaskTab.jsx';

// CSS
import '../css/app.css';
// Mount Dashboard
const elDashboard = document.getElementById('react-dashboard');
if (elDashboard) {
  const props = {
    userName: elDashboard.dataset.username,
    taskCount: elDashboard.dataset.taskcount,
    dashboardData: JSON.parse(elDashboard.dataset.dashboard),
  };
  createRoot(elDashboard).render(<Dashboard {...props} />);
}

// Mount TaskIndex
const elTaskList = document.getElementById('react-task-list');
if (elTaskList) {
  const tasks = JSON.parse(elTaskList.dataset.tasks);
  createRoot(elTaskList).render(<TaskIndex tasks={tasks} />);
}
// Mount Profile
const elProfile = document.getElementById('profile-app');
if (elProfile) {
  createRoot(elProfile).render(<ProfilePage />);
}
// ---- Mount vào #summary-app ----
const elSummary = document.getElementById('summary-app');
if (elSummary) {
  const root = createRoot(elSummary);
  root.render(<SummaryIndex />);
}
// Mount KPI
const elKpi = document.getElementById('kpi-app');
if (elKpi) {
  const props = {
    initialKpis: JSON.parse(elKpi.dataset.kpis),
    filters: JSON.parse(elKpi.dataset.filters),
  };
  createRoot(elKpi).render(<KpiPage {...props} />);
}
// ----- Mount cho nhóm Quản lý (mỗi trang một mount point) -----
const elMgmtUsers = document.getElementById('management-users-app');
if (elMgmtUsers) {
  createRoot(elMgmtUsers).render(<UsersTab />);
}

const elMgmtTasks = document.getElementById('management-tasks-app');
if (elMgmtTasks) {
  createRoot(elMgmtTasks).render(<TasksTab />);
}

const elMgmtKpis = document.getElementById('management-kpis-app');
if (elMgmtKpis) {
  createRoot(elMgmtKpis).render(<KpiTab />);
}

const elMgmtReports = document.getElementById('management-reports-app');
if (elMgmtReports) {
  createRoot(elMgmtReports).render(<ReportsTab />);
}

const elMgmtAssign = document.getElementById('management-assign-app');
if (elMgmtAssign) {
  createRoot(elMgmtAssign).render(<AssignTaskTab />);
}