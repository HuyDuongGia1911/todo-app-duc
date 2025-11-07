import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import UsersTab from '../components/management/UsersTab.jsx';
import TasksTab from '../components/management/TasksTab';
import KpiTab from '../components/management/KpiTab';
import ReportsTab from '../components/management/ReportsTab';
import AssignTaskTab from '../components/management/AssignTaskTab';

function ManagementIndex() {
  const [tab, setTab] = useState('users');

  const renderTab = () => {
    switch (tab) {
      case 'users': return <UsersTab />;
      case 'tasks': return <TasksTab />;
      case 'kpis': return <KpiTab />;
      case 'reports': return <ReportsTab />;
      case 'assign': return <AssignTaskTab />;
      default: return <UsersTab />;
    }
  };

  return (
    <div>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Người dùng</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Công việc</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'kpis' ? 'active' : ''}`} onClick={() => setTab('kpis')}>KPI</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Báo cáo</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'assign' ? 'active' : ''}`} onClick={() => setTab('assign')}>Giao việc</button>
        </li>
      </ul>

      {renderTab()}
    </div>
  );
}


export default ManagementIndex;
