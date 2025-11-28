import React, { useEffect, useMemo, useState } from 'react';
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
}

interface NotificationBellProps {
  fetchUrl?: string;
  pollInterval?: number;
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
}: NotificationBellProps) {
  const [items, setItems] = useState<AssignmentNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  useEffect(() => {
    let isActive = true;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(fetchUrl, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const data = await response.json();
        if (isActive) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError('Không thể tải thông báo');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, pollInterval);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [fetchUrl, pollInterval]);

  const assignedLabel = (item: AssignmentNotification) => {
    const name = item.assigned_by?.name || 'Người giao không xác định';
    const statusText = item.my_status ? ` • ${item.my_status}` : '';
    return `${name}${statusText}`;
  };

  const badgeCount = useMemo(() => {
    return items.reduce((count, item) => (!item.read_at ? count + 1 : count), 0);
  }, [items]);

  const handleNotificationClick = async (taskId: number) => {
    setItems(prev =>
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
    window.location.assign(`/tasks?highlight_task=${taskId}`);
  };

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
          <div className="fw-semibold">Thông báo</div>
          {isLoading && <Spinner animation="border" size="sm" />}
        </div>

        <div className="notification-body">
          {error && <div className="notification-empty text-danger">{error}</div>}
          {!error && items.length === 0 && !isLoading && (
            <div className="notification-empty text-muted">Bạn chưa có công việc mới.</div>
          )}

          {!error && items.length > 0 && (
            <div>
              {items.map(item => {
                const isUnread = !item.read_at;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item${isUnread ? ' notification-item-unread' : ''}`}
                    onClick={() => handleNotificationClick(item.id)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold text-truncate" title={item.title}>
                          {item.title}
                        </div>
                        <small className="text-muted" title={assignedLabel(item)}>
                          {assignedLabel(item)}
                        </small>
                      </div>
                      <span className={`priority-pill ${priorityClass(item.priority)}`}>
                        {item.priority || 'Không rõ'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between text-muted small mt-2">
                      <span className="d-inline-flex align-items-center gap-1">
                        <FiClock size={14} />
                        {formatRelativeTime(item.assigned_at)}
                      </span>
                      {item.deadline_at && (
                        <span>Hạn: {formatDateShort(item.deadline_at)}</span>
                      )}
                    </div>
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
