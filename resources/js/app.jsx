import './bootstrap';
import { createRoot } from 'react-dom/client';
import React from 'react';

import Dashboard from './pages/Dashboard';
import TaskIndex from './pages/TaskIndex';
import TaskCreatePage from './pages/TaskCreatePage';
import ProfilePage from './pages/ProfilePage';
import SummaryIndex from './pages/SummaryIndex';
import KpiPage from './pages/KpiPage';
import NotificationBell from './components/NotificationBell';
import ActivityJournalPage from './pages/ActivityJournalPage';
import ProposalsPage from './pages/ProposalsPage';
import ManagementProposalsPage from './pages/ManagementProposalsPage';
import ManagementKpiHealthPage from './pages/ManagementKpiHealthPage';

// Import các tab quản lý
import UsersTab from './components/management/UsersTab.jsx';
import TasksTab from './components/management/TasksTab.tsx';
import KpiTab from './components/management/KpiTab.jsx';
import ReportsTab from './components/management/ReportsTab.tsx';
import AssignTaskTab from './components/management/AssignTaskTab.jsx';
import ApprovalCenterTab from './components/management/ApprovalCenterTab';

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
// Mount Task create page
const elTaskCreate = document.getElementById('react-task-create');
if (elTaskCreate) {
  createRoot(elTaskCreate).render(
    <TaskCreatePage
      redirectUrl={elTaskCreate.dataset.redirect}
      backUrl={elTaskCreate.dataset.back}
    />
  );
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
const elActivity = document.getElementById('activity-journal-app');
if (elActivity) {
  createRoot(elActivity).render(<ActivityJournalPage />);
}
const elProposals = document.getElementById('proposals-app');
if (elProposals) {
  createRoot(elProposals).render(<ProposalsPage />);
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

const elMgmtKpiHealth = document.getElementById('management-kpi-health-app');
if (elMgmtKpiHealth) {
  createRoot(elMgmtKpiHealth).render(
    <ManagementKpiHealthPage defaultMonth={elMgmtKpiHealth.dataset.defaultMonth || ''} />
  );
}

const elMgmtReports = document.getElementById('management-reports-app');
if (elMgmtReports) {
  createRoot(elMgmtReports).render(<ReportsTab />);
}

const elMgmtAssign = document.getElementById('management-assign-app');
if (elMgmtAssign) {
  createRoot(elMgmtAssign).render(<AssignTaskTab />);
}

const elMgmtProposals = document.getElementById('management-proposals-app');
if (elMgmtProposals) {
  createRoot(elMgmtProposals).render(<ManagementProposalsPage />);
}

const elMgmtApprovalCenter = document.getElementById('management-approval-center-app');
if (elMgmtApprovalCenter) {
  createRoot(elMgmtApprovalCenter).render(<ApprovalCenterTab />);
}

const elSidebarNotifications = document.getElementById('sidebar-notifications-root');
if (elSidebarNotifications) {
  createRoot(elSidebarNotifications).render(<NotificationBell placement="sidebar" />);
}

