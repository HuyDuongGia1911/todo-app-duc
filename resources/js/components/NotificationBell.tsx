import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import { FiBell, FiClock } from 'react-icons/fi';

interface AssignedByInfo {
  id: number | null;
  name: string | null;
  avatar: string | null;
}

interface AssignmentNotification {
  id: number;
  title: string;
  deadline_at?: string | null;
  priority?: string | null;
  status?: string | null;
  assigned_at: string;
  my_status?: string | null;
  my_progress?: number | null;
  assigned_by?: AssignedByInfo | null;
  read_at?: string | null;
  type?: 'assignment' | 'deadline_alert';
  alert_level?: 'due_soon' | 'overdue' | null;
  alert_message?: string | null;
}

interface SystemNotification {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info';
  created_at?: string | null;
  read_at?: string | null;
  link?: string | null;
}

type NotificationPlacement = 'hero' | 'sidebar';

interface NotificationBellProps {
  fetchUrl?: string;
  pollInterval?: number;
  placement?: NotificationPlacement;
}

const formatRelativeTime = (timestamp?: string) => {
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

const formatDateShort = (timestamp?: string | null) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

const priorityClass = (priority?: string | null) => {
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

export default function NotificationBell({
  fetchUrl = '/api/tasks/latest-assignments',
  pollInterval = 60000,
  placement = 'hero',
}: NotificationBellProps) {
  const [taskItems, setTaskItems] = useState<AssignmentNotification[]>([]);
  const [systemItems, setSystemItems] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const isSidebarVariant = placement === 'sidebar';
  const isNotificationsPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/notifications');
  const currentUserRole = (window as any)?.currentUserRole ?? '';

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      const { showLoading = true } = options;
      if (showLoading) {
        setIsLoading(true);
      }

      const fetchAssignments = async () => {
        const response = await fetch(fetchUrl, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
      };

      const fetchSystemNotifications = async () => {
        const response = await fetch('/api/notifications/feed', {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];
        return list.map(transformSystemNotification(currentUserRole));
      };

      try {
        const [assignments, systems] = await Promise.all([
          fetchAssignments(),
          fetchSystemNotifications(),
        ]);

        if (!isMountedRef.current) {
          return;
        }

        setTaskItems(assignments);
        setSystemItems(systems);
        setError(null);
      } catch (err) {
        if (isMountedRef.current) {
          setError('Không thể tải thông báo');
        }
      } finally {
        if (isMountedRef.current && showLoading) {
          setIsLoading(false);
        }
      }
    },
    [fetchUrl, currentUserRole]
  );

  useEffect(() => {
    fetchNotifications();
    const intervalId = window.setInterval(() => fetchNotifications({ showLoading: false }), pollInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchNotifications, pollInterval]);

  useEffect(() => {
    const handleExternalRefresh = () => fetchNotifications({ showLoading: false });
    window.addEventListener('notifications:refresh', handleExternalRefresh);
    return () => window.removeEventListener('notifications:refresh', handleExternalRefresh);
  }, [fetchNotifications]);

  const assignedLabel = (item: AssignmentNotification) => {
    const name = item.assigned_by?.name || 'Người giao không xác định';
    const statusText = item.my_status ? ` • ${item.my_status}` : '';
    return `${name}${statusText}`;
  };

  const badgeCount = useMemo(() => {
    const unreadTasks = taskItems.reduce((count, item) => (!item.read_at ? count + 1 : count), 0);
    const unreadSystem = systemItems.reduce((count, item) => (!item.read_at ? count + 1 : count), 0);
    return unreadTasks + unreadSystem;
  }, [taskItems, systemItems]);

  const hasUnreadItems = useMemo(() => {
    return taskItems.some(item => !item.read_at) || systemItems.some(item => !item.read_at);
  }, [taskItems, systemItems]);

  const broadcastRefresh = () => {
    window.dispatchEvent(new CustomEvent('notifications:refresh'));
  };

  const handleNotificationClick = async (taskId: number) => {
    setTaskItems(prev =>
      prev.map(item =>
        item.id === taskId && !item.read_at
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

    setIsOpen(false);
    broadcastRefresh();
    window.location.assign(`/tasks?highlight_task=${taskId}`);
  };

  const handleSystemNotificationClick = async (notification: SystemNotification) => {
    if (!notification.read_at) {
      await markSystemNotificationAsRead(notification.id);
    }

    setIsOpen(false);
    if (notification.link) {
      window.location.assign(notification.link);
    }
  };

  const markSystemNotificationAsRead = async (notificationId: string) => {
    setSystemItems(prev =>
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
      console.warn('Không thể đánh dấu thông báo hệ thống đã đọc', err);
    }
    broadcastRefresh();
  };

  const handleMarkAllRead = async () => {
    if (!hasUnreadItems || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);
    const nowIso = new Date().toISOString();

    try {
      await Promise.all([
        (async () => {
          const response = await fetch('/api/tasks/mark-all-read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-CSRF-TOKEN': csrf,
              Accept: 'application/json',
            },
            credentials: 'same-origin',
          });

          if (!response.ok) {
            throw new Error('Request failed');
          }

          setTaskItems(prev => prev.map(item => (item.read_at ? item : { ...item, read_at: nowIso })));
        })(),
        (async () => {
          const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-CSRF-TOKEN': csrf,
              Accept: 'application/json',
            },
            credentials: 'same-origin',
          });

          if (!response.ok) {
            throw new Error('Request failed');
          }

          setSystemItems(prev => prev.map(item => (item.read_at ? item : { ...item, read_at: nowIso })));
        })(),
      ]);
      broadcastRefresh();
    } catch (err) {
      console.warn('Không thể đánh dấu tất cả đã đọc', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const renderSystemItems = () => {
    if (systemItems.length === 0) {
      return null;
    }

    return (
      <div className="notification-section">
        <div className="notification-section__title">Đề xuất & thông báo</div>
        {systemItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`notification-item${!item.read_at ? ' notification-item-unread' : ''}`}
            onClick={() => handleSystemNotificationClick(item)}
          >
            <div className="notification-item__meta notification-item__meta--top">
              <span>
                <FiClock size={14} />
                {formatRelativeTime(item.created_at)}
              </span>
            </div>
            <div className="notification-item__content">
              <div className="notification-item__main">
                <div className="notification-item__title" title={item.title}>
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="notification-item__subtitle" title={item.subtitle}>
                    {item.subtitle}
                  </div>
                )}
              </div>
              {item.badge && (
                <div className="notification-item__badges">
                  <span className={`notification-alert notification-alert--${item.badgeVariant || 'info'}`}>
                    {item.badge}
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  if (isSidebarVariant) {
    return (
      <a
        href="/notifications"
        className={`nav-link sidebar-notification-link ${isNotificationsPage ? 'active' : ''}`}
        data-label="Thông báo"
        aria-label="Đi tới trang thông báo"
      >
        <span className="sidebar-notification-icon">
          <FiBell size={18} />
          {badgeCount > 0 && (
            <span className="sidebar-notification-dot" aria-live="polite">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </span>
        <span className="nav-label">Thông báo</span>
        {badgeCount > 0 && (
          <span className="sidebar-notification-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>
        )}
      </a>
    );
  }

  return (
    <Dropdown align="end" show={isOpen} onToggle={setIsOpen} className="notification-dropdown">
      <Dropdown.Toggle
        as="button"
        className="btn btn-light border notification-bell no-caret-dropdown"
        aria-label="Thông báo công việc"
      >
        <FiBell size={18} />
        {badgeCount > 0 && (
          <span className="notification-dot" aria-live="polite">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-menu shadow">
        <div className="notification-header">
          <div className="notification-header__title">
            <div className="fw-semibold">Thông báo</div>
            {isLoading && <Spinner animation="border" size="sm" />}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary notification-mark-all-btn"
            onClick={handleMarkAllRead}
            disabled={!hasUnreadItems || isMarkingAll}
          >
            {isMarkingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
          </button>
        </div>

        <div className="notification-body">
          {error && <div className="notification-empty text-danger">{error}</div>}
          {!error && taskItems.length === 0 && systemItems.length === 0 && !isLoading && (
            <div className="notification-empty text-muted">Bạn chưa có công việc mới.</div>
          )}

          {!error && (taskItems.length > 0 || systemItems.length > 0) && (
            <div>
              {renderSystemItems()}
              {taskItems.map(item => {
                const isAlert = item.type === 'deadline_alert';
                const isUnread = !item.read_at;
                const alertLabel = item.alert_level === 'overdue'
                  ? 'Quá hạn'
                  : item.alert_level === 'due_soon'
                    ? 'Sắp đến hạn'
                    : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item${isUnread ? ' notification-item-unread' : ''}${isAlert ? ' notification-item-alert' : ''}`}
                    onClick={() => handleNotificationClick(item.id)}
                  >
                    <div className="notification-item__meta notification-item__meta--top">
                      <span>
                        <FiClock size={14} />
                        {formatRelativeTime(item.assigned_at)}
                      </span>
                      {item.deadline_at && (
                        <span>Hạn: {formatDateShort(item.deadline_at)}</span>
                      )}
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
                        <span className={`priority-pill ${priorityClass(item.priority)}`}>
                          {item.priority || 'Không rõ'}
                        </span>
                      </div>
                    </div>
                    {item.alert_message && (
                      <div className="notification-item__note">{item.alert_message}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="notification-footer">
          <a className="btn btn-sm btn-outline-primary w-100" href="/tasks">
            Xem tất cả công việc
          </a>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

const transformSystemNotification = (currentUserRole: string) => (raw: any): SystemNotification => {
  const data = raw?.data || {};
  const base: SystemNotification = {
    id: raw?.id,
    type: raw?.type,
    title: data.title || 'Thông báo hệ thống',
    subtitle: data.review_note || data.message || undefined,
    created_at: raw?.created_at,
    read_at: raw?.read_at,
    link: '/notifications',
    badge: null,
    badgeVariant: 'info',
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
    base.link = currentUserRole === 'Admin' || currentUserRole === 'Trưởng phòng'
      ? '/management/proposals'
      : '/proposals';
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
