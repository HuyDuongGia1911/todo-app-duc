import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiBell, FiClock } from 'react-icons/fi';

const formatRelativeTime = timestamp => {
  if (!timestamp) return '';
  const target = new Date(timestamp);
  if (Number.isNaN(target.getTime())) return '';

  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return target.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const formatDateShort = timestamp => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

const priorityClass = priority => {
  switch (priority) {
    case 'Khẩn cấp':
      return 'priority-danger';
    case 'Cao':
      return 'priority-warning';
    case 'Trung bình':
      return 'priority-info';
    case 'Thấp':
      return 'priority-muted';
    default:
      return 'priority-muted';
  }
};

const notificationTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'priority', label: 'Cần chú ý' },
  { key: 'assignments', label: 'Công việc mới' },
  { key: 'system', label: 'Đề xuất & khác' },
  { key: 'unread', label: 'Chưa đọc' },
];

const transformSystemNotification = (raw, role) => {
  const data = raw?.data || {};
  const base = {
    id: raw?.id,
    category: 'system',
    title: data.title || 'Thông báo hệ thống',
    subtitle: data.review_note || data.message || undefined,
    created_at: raw?.created_at,
    read_at: raw?.read_at,
    badge: null,
    badgeVariant: 'info',
    link: '/notifications',
  };

  if (raw?.type?.includes('TaskProposalSubmitted')) {
    const submitter = data.submitted_by?.name || 'Nhân viên';
    base.title = `${submitter} vừa gửi đề xuất mới`;
    base.subtitle = data.title;
    base.badge = data.type === 'kpi' ? 'KPI' : 'Công việc';
    base.badgeVariant = 'warning';
    base.link = '/management/proposals';
  }

  if (raw?.type?.includes('TaskProposalReviewed')) {
    base.title = `Đề xuất "${data.title}" đã được ${data.status === 'approved' ? 'chấp thuận' : 'từ chối'}`;
    base.subtitle = data.review_note || undefined;
    base.badge = data.status === 'approved' ? 'Đã duyệt' : 'Bị từ chối';
    base.badgeVariant = data.status === 'approved' ? 'success' : 'danger';
    base.link = role === 'Admin' || role === 'Trưởng phòng' ? '/management/proposals' : '/proposals';
  }

  if (raw?.type?.includes('TaskPingNotification')) {
    const sender = data.sender?.name || 'Quản lý';
    base.title = `${sender} vừa ping một công việc`;
    base.subtitle = data.message || 'Vui lòng kiểm tra task được giao.';
    base.badge = 'Ping';
    base.badgeVariant = 'info';
    base.link = data.task_id ? `/tasks?highlight_task=${data.task_id}` : '/tasks';
  }

  return base;
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(null);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const fetchUrl = '/api/tasks/latest-assignments';
  const currentUserRole = window.currentUserRole || '';

  const fetchNotifications = useCallback(
    async (isSilent = false) => {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [taskResponse, systemResponse] = await Promise.all([
          fetch(fetchUrl, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          }),
          fetch('/api/notifications/feed', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          }),
        ]);

        if (!taskResponse.ok || !systemResponse.ok) {
          throw new Error('Request failed');
        }

        const taskData = await taskResponse.json();
        const systemData = await systemResponse.json();

        const tasks = (Array.isArray(taskData) ? taskData : []).map(item => ({
          ...item,
          id: String(item.id),
          category: 'task',
        }));

        const system = (Array.isArray(systemData?.data) ? systemData.data : []).map(n =>
          transformSystemNotification(n, currentUserRole)
        );

        setItems([...system, ...tasks]);
        setError(null);
      } catch (err) {
        console.warn('Không thể tải thông báo', err);
        setError('Không thể tải thông báo, vui lòng thử lại.');
      } finally {
        if (isSilent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fetchUrl, currentUserRole]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const stats = useMemo(() => {
    const overdue = items.filter(item => item.category === 'task' && item.alert_level === 'overdue').length;
    const dueSoon = items.filter(item => item.category === 'task' && item.alert_level === 'due_soon').length;
    const unread = items.filter(item => !item.read_at).length;
    return {
      total: items.length,
      overdue,
      dueSoon,
      unread,
    };
  }, [items]);

  const hasUnreadItems = useMemo(() => {
    return items.some(item => !item.read_at);
  }, [items]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'priority':
        return items.filter(item => item.category === 'task' && item.type === 'deadline_alert');
      case 'assignments':
        return items.filter(item => item.category === 'task');
      case 'system':
        return items.filter(item => item.category === 'system');
      case 'unread':
        return items.filter(item => !item.read_at);
      default:
        return items;
    }
  }, [items, activeTab]);

  const assignedLabel = item => {
    if (item.category === 'system') {
      return item.subtitle || 'Thông báo hệ thống';
    }
    const name = item.assigned_by?.name || 'Người giao không xác định';
    const statusText = item.my_status ? ` • ${item.my_status}` : '';
    return `${name}${statusText}`;
  };

  const markTaskAsRead = async taskId => {
    setItems(prev =>
      prev.map(item =>
        item.id === String(taskId) && !item.read_at
          ? { ...item, read_at: new Date().toISOString() }
          : item
      )
    );

    try {
      await fetch(`/api/tasks/${taskId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-CSRF-TOKEN': csrf,
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });
    } catch (err) {
      console.warn('Không thể đánh dấu đã đọc', err);
    }
  };

  const markSystemNotificationAsRead = async notificationId => {
    setItems(prev =>
      prev.map(item =>
        item.id === notificationId && !item.read_at
          ? { ...item, read_at: new Date().toISOString() }
          : item
      )
    );

    try {
      await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-CSRF-TOKEN': csrf,
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });
    } catch (err) {
      console.warn('Không thể đánh dấu thông báo đã đọc', err);
    }
  };

  const handleItemClick = async item => {
    if (!item?.id) return;

    if (item.category === 'system') {
      await markSystemNotificationAsRead(item.id);
      if (item.link) {
        window.location.assign(item.link);
      }
      return;
    }

    await markTaskAsRead(item.id);
    window.location.assign(`/tasks?highlight_task=${item.id}`);
  };

  const handleMarkAllRead = async () => {
    if (!hasUnreadItems || markingAll) {
      return;
    }

    setMarkingAll(true);
    const nowIso = new Date().toISOString();

    try {
      await Promise.all([
        fetch('/api/tasks/mark-all-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-CSRF-TOKEN': csrf,
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        }),
        fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-CSRF-TOKEN': csrf,
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        }),
      ]);
      setItems(prev => prev.map(item => (item.read_at ? item : { ...item, read_at: nowIso })));
    } catch (err) {
      console.warn('Không thể đánh dấu tất cả đã đọc', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const renderList = () => {
    if (loading) {
      return <div className="notification-empty-state">Đang tải thông báo...</div>;
    }

    if (error) {
      return (
        <div className="notification-empty-state">
          <p className="mb-3">{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => fetchNotifications()}>
            Thử lại
          </button>
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return <div className="notification-empty-state">Không có thông báo trong mục này.</div>;
    }

    return filteredItems.map(item => {
      const isSystem = item.category === 'system';
      const isAlert = !isSystem && item.type === 'deadline_alert';
      const isUnread = !item.read_at;
      const alertLabel = !isSystem && item.alert_level === 'overdue'
        ? 'Quá hạn'
        : !isSystem && item.alert_level === 'due_soon'
          ? 'Sắp đến hạn'
          : null;

      return (
        <div key={`${item.id}-${item.created_at || item.assigned_at || ''}`} className="notification-feed__item">
          <button
            type="button"
            className={`notification-item${isUnread ? ' notification-item-unread' : ''}${isAlert ? ' notification-item-alert' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="notification-item__meta notification-item__meta--top">
              <span>
                <FiClock size={14} />
                {formatRelativeTime(isSystem ? item.created_at : item.assigned_at)}
              </span>
              {!isSystem && item.deadline_at && <span>Hạn: {formatDateShort(item.deadline_at)}</span>}
            </div>
            <div className="notification-item__content">
              <div className="notification-item__main">
                <div className="notification-item__title" title={item.title}>
                  {item.title}
                </div>
                <div className="notification-item__subtitle" title={assignedLabel(item)}>
                  {assignedLabel(item)}
                </div>
              </div>
              <div className="notification-item__badges">
                {alertLabel && (
                  <span className={`notification-alert notification-alert--${item.alert_level}`}>
                    {alertLabel}
                  </span>
                )}
                {isSystem && item.badge && (
                  <span className={`notification-alert notification-alert--${item.badgeVariant || 'info'}`}>
                    {item.badge}
                  </span>
                )}
                {!isSystem && (
                  <span className={`priority-pill ${priorityClass(item.priority)}`}>
                    {item.priority || 'Không rõ'}
                  </span>
                )}
              </div>
            </div>
            {!isSystem && item.alert_message && (
              <div className="notification-item__note">{item.alert_message}</div>
            )}
          </button>
        </div>
      );
    });
  };

  return (
    <div className="notifications-page">
      <section className="workspace-hero">
        <div>
          <p className="workspace-hero__eyebrow">Thông báo</p>
          <h1 className="workspace-hero__title">Hộp thông báo công việc</h1>
          <p className="workspace-hero__subtitle">
            Theo dõi những việc vừa được giao, các deadline quan trọng và cập nhật tiến độ theo thời gian thực.
          </p>
          <div className="notifications-page__meta">
            <div className="notifications-page__stat">
              <span>Tổng cộng</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="notifications-page__stat">
              <span>Chưa đọc</span>
              <strong>{stats.unread}</strong>
            </div>
            <div className="notifications-page__stat">
              <span>Sắp đến hạn</span>
              <strong>{stats.dueSoon}</strong>
            </div>
            <div className="notifications-page__stat">
              <span>Quá hạn</span>
              <strong>{stats.overdue}</strong>
            </div>
          </div>
        </div>
        <div className="workspace-hero__actions">
          <button
            type="button"
            className="btn btn-outline-light"
            onClick={handleMarkAllRead}
            disabled={!hasUnreadItems || markingAll}
          >
            {markingAll ? 'Đang đánh dấu...' : 'Đánh dấu tất cả đã đọc'}
          </button>
          <button
            type="button"
            className="glow-button"
            onClick={() => fetchNotifications(true)}
            disabled={isRefreshing}
          >
            <FiBell size={16} />
            {isRefreshing ? 'Đang cập nhật...' : 'Làm mới danh sách'}
          </button>
          <a href="/tasks" className="btn btn-outline-light">
            Tới bảng công việc
          </a>
        </div>
      </section>

      <div className="workspace-card">
        <div className="notification-tabs">
          {notificationTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`notification-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="notification-feed">{renderList()}</div>
      </div>
    </div>
  );
}
