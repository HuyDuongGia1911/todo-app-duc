import React, { useEffect, useMemo, useState } from 'react';
import ChartTaskByDay from '../components/charts/ChartTaskByDay';
import ChartTaskByType from '../components/charts/ChartTaskByType';
import ChartKpiProgress from '../components/charts/ChartKpiProgress';
import Modal from '../components/Modal';

const DETAIL_CONFIG = {
  today: {
    title: 'Task hôm nay',
    description: 'Danh sách công việc cần hoàn tất trong ngày.',
    type: 'task',
  },
  overdue: {
    title: 'Task quá hạn trong tháng',
    description: 'Các task đã trễ deadline trong tháng này và chưa hoàn thành.',
    type: 'task',
  },
  week: {
    title: 'Task tuần này',
    description: 'Toàn bộ công việc được lên lịch trong tuần hiện tại.',
    type: 'task',
  },
  tasksSoon: {
    title: 'Task sắp hết hạn',
    description: 'Công việc có deadline trong 7 ngày tới.',
    type: 'task',
  },
};

const initialPanel = { loading: true, data: [], error: null };

const quickActions = [
  {
    label: 'Thêm công việc',
    description: 'Tạo nhanh task mới cho bản thân',
    icon: 'bi-plus-circle',
    href: '/tasks/create'
  },
  {
    label: 'Xem bảng công việc',
    description: 'Quản lý toàn bộ task đang theo dõi',
    icon: 'bi-kanban',
    href: '/tasks'
  },
  {
    label: 'Quản lý KPI',
    description: 'Theo dõi KPI các tháng',
    icon: 'bi-flag',
    href: '/kpis'
  },
  {
    label: 'Báo cáo tháng',
    description: 'Lập và xuất báo cáo KPI',
    icon: 'bi-clipboard-check',
    href: '/summaries'
  }
];

const formatVietnamDate = () =>
  new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const getSession = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'buổi sáng';
  if (hour < 18) return 'buổi chiều';
  return 'buổi tối';
};

export default function Dashboard({ userName, taskCount, dashboardData }) {
  const [detailPanels, setDetailPanels] = useState({
    today: { ...initialPanel },
    overdue: { ...initialPanel },
    week: { ...initialPanel },
    tasksSoon: { ...initialPanel },
  });
  const [detailModal, setDetailModal] = useState({ open: false, filter: null });

  const greeting = useMemo(() => `Chào ${getSession()}, ${userName}`, [userName]);
  const todayLabel = useMemo(() => formatVietnamDate(), []);

  const updatePanel = (filter, payload) => {
    setDetailPanels(prev => ({
      ...prev,
      [filter]: { ...prev[filter], ...payload },
    }));
  };

  const loadPanel = (filter) => {
    if (!DETAIL_CONFIG[filter]) return;
    updatePanel(filter, { loading: true, error: null });
    fetch(`/api/dashboard/tasks?filter=${filter}`)
      .then(res => {
        if (!res.ok) throw new Error('Fetch error');
        return res.json();
      })
      .then(data => {
        updatePanel(filter, { loading: false, data: data.tasks || [] });
      })
      .catch(() => {
        updatePanel(filter, { loading: false, error: 'Không thể tải danh sách công việc.' });
      });
  };

  useEffect(() => {
    ['today', 'overdue', 'week', 'tasksSoon'].forEach(loadPanel);
  }, []);

  const openDetailModal = (filter) => {
    if (!detailPanels[filter]?.data.length && !detailPanels[filter]?.loading) {
      loadPanel(filter);
    }
    setDetailModal({ open: true, filter });
  };

  const closeDetailModal = () => setDetailModal({ open: false, filter: null });

  const renderTaskList = (filter, limit = 4) => {
    const panel = detailPanels[filter];
    if (panel.loading) return <p className="text-muted mb-0">Đang tải...</p>;
    if (panel.error) return <p className="text-danger mb-0">{panel.error}</p>;
    if (!panel.data.length) return <p className="text-muted mb-0">Không có dữ liệu.</p>;

    return (
      <ul className="dashboard-task-list">
        {panel.data.slice(0, limit).map(task => (
          <li key={task.id} className="dashboard-task-list__item">
            <div>
              <p className="dashboard-task-list__title">{task.title}</p>
              <small className="text-muted">Ngày làm: {task.task_date || '—'} · Deadline: {task.deadline_at || '—'}</small>
            </div>
            <a href={task.url} className="btn btn-sm btn-outline-primary">Chi tiết</a>
          </li>
        ))}
      </ul>
    );
  };

  const renderModalBody = () => {
    if (!detailModal.filter) return null;
    const panel = detailPanels[detailModal.filter];
    const meta = DETAIL_CONFIG[detailModal.filter];
    if (!panel || !meta) return null;

    if (panel.loading) return <p className="text-muted">Đang tải danh sách...</p>;
    if (panel.error) return <p className="text-danger mb-2">{panel.error}</p>;
    if (!panel.data.length) {
      return <p className="text-muted">Không có công việc nào.</p>;
    }

    return (
      <ul className="list-group">
        {panel.data.map(task => (
          <li key={task.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>{task.title}</strong>
                <div className="text-muted small">
                  Ngày làm: {task.task_date || '—'} | Deadline: {task.deadline_at || '—'}
                </div>
                <span className="badge bg-light text-dark me-2">{task.status}</span>
                <span className="badge bg-secondary">{task.priority || 'Không rõ'}</span>
              </div>
              <a href={task.url} className="btn btn-sm btn-outline-primary">Chi tiết</a>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const filterMeta = detailModal.filter ? DETAIL_CONFIG[detailModal.filter] : null;

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero card border-0 shadow-sm">
        <div>
          <p className="dashboard-hero__eyebrow">{todayLabel}</p>
          <h2 className="dashboard-hero__title">{greeting}</h2>
          <p className="dashboard-hero__subtitle">
            Bạn đã tạo tổng cộng <strong>{taskCount}</strong> công việc. Duy trì nhịp độ nhé!
          </p>
        </div>
        <div className="dashboard-hero__meta">
          <div>
            <span className="text-muted">Task sắp hết hạn</span>
            <p className="h3 mb-0">{dashboardData.tasksSoon}</p>
          </div>
          <div>
            <span className="text-muted">Task tuần này</span>
            <p className="h3 mb-0">{dashboardData.weeklyTasks}</p>
          </div>
        </div>
        <a href="/tasks/create" className="btn btn-light text-primary dashboard-hero__cta">
          <i className="bi bi-plus-lg me-2"></i>Tạo task mới
        </a>
      </section>

      <section className="dashboard-stat-grid">
        <StatCard
          title="Task hôm nay"
          value={dashboardData.taskToday}
          colorClass="primary"
          icon="bi-calendar-check"
          onClick={() => openDetailModal('today')}
          hint="Danh sách công việc cần làm trong ngày"
        />
        <StatCard
          title="Task quá hạn trong tháng"
          value={dashboardData.taskOverdue}
          colorClass="danger"
          icon="bi-exclamation-octagon"
          onClick={() => openDetailModal('overdue')}
          hint="Đang trễ deadline, cần ưu tiên"
        />
        <StatCard
          title="Task sắp hết hạn"
          value={dashboardData.tasksSoon}
          colorClass="warning"
          icon="bi-hourglass-split"
          onClick={() => openDetailModal('tasksSoon')}
          hint="Deadline trong 7 ngày tới"
        />
        <StatCard
          title="Task tuần này"
          value={dashboardData.weeklyTasks}
          colorClass="info"
          icon="bi-calendar-week"
          onClick={() => openDetailModal('week')}
          hint="Công việc trong tuần hiện tại"
        />
      </section>

      <section className="dashboard-card quick-actions">
        <div className="dashboard-card__header">
          <div>
            <h5 className="mb-1">Lối tắt thao tác</h5>
            <p className="text-muted mb-0">Tiết kiệm thời gian với các thao tác quen thuộc</p>
          </div>
        </div>
        <div className="quick-actions__grid">
          {quickActions.map(action => (
            <a key={action.label} href={action.href} className="quick-action">
              <div className="quick-action__icon">
                <i className={`bi ${action.icon}`}></i>
              </div>
              <div>
                <p className="quick-action__title">{action.label}</p>
                <p className="quick-action__desc">{action.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="row g-4">
        <div className="col-lg-6">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h5 className="mb-1">Công việc hôm nay</h5>
                <p className="text-muted mb-0">Tập trung xử lý các task đang trong ngày</p>
              </div>
              <button className="btn btn-link p-0" onClick={() => openDetailModal('today')}>Xem tất cả</button>
            </div>
            {renderTaskList('today')}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h5 className="mb-1">Sát deadline</h5>
                <p className="text-muted mb-0">Task quá hạn trong tháng hiện tại</p>
              </div>
              <button className="btn btn-link p-0" onClick={() => openDetailModal('overdue')}>Xem tất cả</button>
            </div>
            {renderTaskList('overdue')}
          </div>
        </div>
      </section>

      <section className="row g-4">
        <div className="col-lg-4">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h5 className="mb-1">Task tuần này</h5>
                <p className="text-muted mb-0">Nắm lịch làm việc trong tuần</p>
              </div>
              <button className="btn btn-link p-0" onClick={() => openDetailModal('week')}>Xem tất cả</button>
            </div>
            {renderTaskList('week', 5)}
          </div>
        </div>
        <div className="col-lg-8">
          <div className="dashboard-card chart-card">
            <ChartKpiProgress />
          </div>
        </div>
      </section>

      <section className="row g-4">
        <div className="col-lg-6">
          <div className="dashboard-card chart-card">
            <ChartTaskByDay />
          </div>
        </div>
        <div className="col-lg-6">
          <div className="dashboard-card chart-card">
            <ChartTaskByType />
          </div>
        </div>
      </section>

      <Modal
        isOpen={detailModal.open}
        title={filterMeta?.title || 'Danh sách'}
        onClose={closeDetailModal}
      >
        {filterMeta && <p className="text-muted small mb-3">{filterMeta.description}</p>}
        {renderModalBody()}
      </Modal>
    </div>
  );
}

function StatCard({ title, value, colorClass, icon, hint, onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <div className={`dashboard-stat-card ${clickable ? 'is-clickable' : ''}`} onClick={onClick}>
      <div className={`dashboard-stat-card__icon dashboard-stat-card__icon--${colorClass} text-${colorClass}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div>
        <p className="dashboard-stat-card__label">{title}</p>
        <p className="dashboard-stat-card__value">{value}</p>
        {hint && <p className="dashboard-stat-card__hint">{hint}</p>}
      </div>
    </div>
  );
}
  
