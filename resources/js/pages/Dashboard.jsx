import React from 'react';
import ChartTaskByDay from '../components/charts/ChartTaskByDay';
import ChartTaskByType from '../components/charts/ChartTaskByType';
import ChartKpiProgress from '../components/charts/ChartKpiProgress';
export default function Dashboard({ userName, taskCount, dashboardData }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="h4 mb-3 text-primary"> Xin chào, <strong>{userName}</strong></h2>
      <p>Bạn đã tạo tổng cộng <strong>{taskCount}</strong> công việc.</p>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3 mt-4">
        <StatCard title="Task hôm nay" value={dashboardData.taskToday} color="primary" icon="bi-calendar-event" />
        <StatCard title="Task quá hạn" value={dashboardData.taskOverdue} color="danger" icon="bi-exclamation-triangle" />
        <StatCard title="KPI sắp hết hạn" value={dashboardData.kpisSoon} color="warning" icon="bi-clock" />
        <StatCard title="Task tuần này" value={dashboardData.weeklyTasks} color="info" icon="bi-bar-chart" />
      </div>
       <div className="row mt-4">
  <div className="col-md-6">
    <ChartTaskByDay />
  </div>
  <div className="col-md-6">
    <ChartTaskByType />
  </div>
  <ChartKpiProgress  />
</div>

    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div className="col">
      <div className={`card border-${color} shadow-sm`}>
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h6 className="text-muted mb-1">{title}</h6>
            <h4 className={`fw-bold text-${color}`}>{value}</h4>
          </div>
          <i className={`bi ${icon} fs-2 text-${color}`}></i>
        </div>
      </div>
    </div>
  );
}
  
