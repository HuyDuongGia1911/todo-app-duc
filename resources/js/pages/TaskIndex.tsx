import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import Select, { SingleValue } from 'react-select';
import Swal from 'sweetalert2';
import SidebarEditTask from '../components/SidebarEditTask';
import { BsPencil } from 'react-icons/bs';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import { Sun, Sunrise, Moon } from 'lucide-react';
import TaskAddForm from '../components/forms/TaskAddForm';
import TaskEditForm from '../components/forms/TaskEditForm'
import Modal from '../components/Modal'
import ExportModal from '../components/ExportModal';
import { Dropdown } from 'react-bootstrap';
import { FaDownload, FaTrash } from 'react-icons/fa';

type OptionType = { value: string; label: string };

interface TaskFile {
  id: number;
  original_name: string;
  url: string;
  size: number;
}

interface Task {
  id: number;
  title: string;
  task_date: string;
  deadline_at?: string;
  created_at: string;
  shift?: string;
  type?: string;
  supervisor?: string;
  priority?: string;
  progress?: number;
  detail?: string;
  file_link?: string;
  files?: TaskFile[];
  status: 'Đã hoàn thành' | 'Chưa hoàn thành';
  task_goal?: number;
  done_count?: number;   // số người hoàn thành
  total_count?: number;  // tổng số người nhận
  users?: any[];
  my_status?: 'Đã hoàn thành' | 'Chưa hoàn thành' | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

interface Props {
  tasks: Task[];
}

export default function TaskIndex({ tasks }: Props) {
  const currentUserMeta = document.querySelector('meta[name="current-user"]')?.getAttribute('content') || '';
  let currentUserId: number | null = null;
  let currentUserName = 'admin';

  try {
    if (currentUserMeta) {
      const parsed = JSON.parse(currentUserMeta);
      currentUserId = parsed?.id ?? null;
      currentUserName = parsed?.name ?? 'admin';
    }
  } catch (error) {
    console.warn('Không thể parse thông tin người dùng hiện tại', error);
  }

  const normalizeTasks = (list: Task[]): Task[] =>
    list.map(t => {
      const hasUsers = Array.isArray(t.users) && t.users.length > 0;
      const supervisorName = t.supervisor?.trim().toLowerCase();
      const currentName = currentUserName?.trim().toLowerCase();
      const selfAssigned = !hasUsers && supervisorName && currentName && supervisorName === currentName;

      const fallbackUserId = currentUserId ?? 0;
      const usersArray = hasUsers
        ? t.users
        : selfAssigned
          ? [{ id: fallbackUserId, name: t.supervisor, pivot: { status: t.status } }]
          : [];

      const total = usersArray.length;
      const done = usersArray.filter((u: any) => u.pivot?.status === 'Đã hoàn thành').length;

      const goal = t.task_goal ?? (total || 1);
      const progress = hasUsers || total > 0
        ? t.progress ?? 0
        : t.status === 'Đã hoàn thành'
          ? 100
          : 0;

      const myPivotStatus = currentUserId
        ? usersArray.find((u: any) => u.id === currentUserId)?.pivot?.status ?? null
        : selfAssigned
          ? t.status
          : null;

      return {
        ...t,
        users: usersArray,
        files: Array.isArray(t.files) ? t.files : [],
        total_count: total,
        done_count: done,
        task_goal: goal,
        progress,
        my_status: myPivotStatus ?? t.my_status ?? (selfAssigned ? t.status : null),
      };
    });

  const getStatusForMe = (task: Task) => task.my_status ?? task.status;
  const isTaskDoneForMe = (task: Task) => getStatusForMe(task) === 'Đã hoàn thành';

  const [taskList, setTaskList] = useState<Task[]>(() => normalizeTasks(tasks));
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tab, setTab] = useState<'all' | 'done' | 'pending' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SingleValue<OptionType>>(null);
  const [taskDateStart, setTaskDateStart] = useState('');
  const [taskDateEnd, setTaskDateEnd] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [highlightTaskId, setHighlightTaskId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('highlight_task');
    return id ? Number(id) : null;
  });
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const itemsPerPage = 7;
  const taskStats = useMemo(() => {
    const total = taskList.length;
    const done = taskList.filter(isTaskDoneForMe).length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = taskList.filter(task => {
      const deadline = new Date(task.deadline_at || task.task_date);
      deadline.setHours(0, 0, 0, 0);
      return !isTaskDoneForMe(task) && deadline < now;
    }).length;
    const inProgress = Math.max(total - done, 0);
    const upcoming = Math.max(inProgress - overdue, 0);
    return { total, done, overdue, upcoming };
  }, [taskList]);
// duc
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, priorityFilter, taskDateStart, taskDateEnd]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers)
      .catch(err => console.error('Lỗi tải danh sách user', err));
  }, []);
  useEffect(() => {
    setTaskList(normalizeTasks(tasks));
  }, [tasks]);



  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const applyFilters = (): Task[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return taskList.filter(task => {
      const taskDeadline = new Date(task.deadline_at || task.task_date);
      taskDeadline.setHours(0, 0, 0, 0);

      // Bộ lọc theo tab
      const isDoneForMe = isTaskDoneForMe(task);
      if (tab === 'done' && !isDoneForMe) return false;
      if (tab === 'pending' && (isDoneForMe || taskDeadline < today)) return false;
      if (tab === 'overdue' && (isDoneForMe || taskDeadline >= today)) {
        return false;
      }


      // Bộ lọc ưu tiên
      if (priorityFilter && task.priority !== priorityFilter.value) return false;

      // Bộ lọc ngày
      const taskDate = new Date(task.task_date);
      if (taskDateStart && taskDate < new Date(taskDateStart)) return false;
      if (taskDateEnd && taskDate > new Date(taskDateEnd)) return false;

      // Bộ lọc tiêu đề
      if (searchKeyword && !task.title.toLowerCase().includes(searchKeyword.toLowerCase())) return false;


      return true;
    });
  };


  const filteredTasks = applyFilters();
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const currentTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (!highlightTaskId) return;
    const targetIndex = filteredTasks.findIndex(task => task.id === highlightTaskId);
    if (targetIndex === -1) return;
    const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [highlightTaskId, filteredTasks, currentPage]);

  useEffect(() => {
    if (!highlightTaskId) return;

    let highlightTimer: number | undefined;
    let cleanupClass: number | undefined;
    let cleanupState: number | undefined;

    const clearHighlightParam = () => {
      setHighlightTaskId(null);
      const params = new URLSearchParams(window.location.search);
      params.delete('highlight_task');
      const newQuery = params.toString();
      const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    };

    highlightTimer = window.setTimeout(() => {
      const row = document.getElementById(`task-row-${highlightTaskId}`);
      if (!row) {
        clearHighlightParam();
        return;
      }

      row.classList.add('task-row-highlight');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });

      cleanupClass = window.setTimeout(() => {
        row.classList.remove('task-row-highlight');
      }, 1200);

      cleanupState = window.setTimeout(clearHighlightParam, 1400);
    }, 200);

    return () => {
      if (highlightTimer) window.clearTimeout(highlightTimer);
      if (cleanupClass) window.clearTimeout(cleanupClass);
      if (cleanupState) window.clearTimeout(cleanupState);
    };
  }, [highlightTaskId, currentTasks]);

  const handleToggle = async (task: Task) => {
    const newStatus = isTaskDoneForMe(task) ? 'Chưa hoàn thành' : 'Đã hoàn thành';
    try {
      const res = await fetch(`/tasks/${task.id}/user-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Cập nhật trạng thái thất bại');
      const data = await res.json();

      setTaskList(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                status: data.task_status ?? t.status,
                my_status: data.my_status ?? newStatus,
                progress: t.progress,
                total_count: data.total_count ?? t.total_count,
                done_count: data.done_count ?? t.done_count,
                task_goal: t.task_goal ?? data.total_count ?? t.total_count ?? 1,
              }
            : t
        )
      );


    } catch (err) {
      Swal.fire('Lỗi', 'Không thể cập nhật trạng thái!', 'error');
    }
  };



  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Xác nhận xoá?',
      text: 'Bạn không thể hoàn tác thao tác này!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Huỷ',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/tasks/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({ _method: 'DELETE' }),
      });
      if (!res.ok) throw new Error('Lỗi xoá');
      setTaskList(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Không thể xoá công việc');
    }
  };


  const clampProgress = (value?: number) => Math.max(0, Math.min(100, value ?? 0));

  const getPriorityTone = (priority?: string) => {
    switch (priority) {
      case 'Khẩn cấp':
        return 'danger';
      case 'Cao':
        return 'warning';
      case 'Trung bình':
        return 'info';
      case 'Thấp':
        return 'muted';
      default:
        return 'muted';
    }
  };
  const getCurrentDayInfo = () => {
    const today = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const weekday = days[today.getDay()];
    const date = today.toLocaleDateString('vi-VN');

    const hour = today.getHours();
    let session = '';
    let Icon = Sun; // default

    if (hour < 12) {
      session = 'Sáng';
      Icon = Sunrise;
    } else if (hour < 18) {
      session = 'Chiều';
      Icon = Sun;
    } else {
      session = 'Tối';
      Icon = Moon;
    }


    return { weekday, date, session, Icon };
  };
  const { weekday, date, session, Icon } = getCurrentDayInfo();
  const handleExport = (type: 'filtered' | 'all') => {
    const params = new URLSearchParams();

    params.set('type', type);
    if (type === 'filtered') {
      if (tab !== 'all') params.set('status_tab', tab);
      if (priorityFilter) params.set('priority', priorityFilter.value);
      if (taskDateStart) params.set('task_date_start', taskDateStart);
      if (taskDateEnd) params.set('task_date_end', taskDateEnd);
      if (searchKeyword) params.set('search', searchKeyword);
    }

    // Đóng modal trước khi export
    setShowExportModal(false);

    // Mở file export
    window.open(`/tasks/export?${params.toString()}`, '_blank');
  };
  return (

    <>
      <section className="workspace-hero mb-4">
        <div>
          <p className="workspace-hero__eyebrow">Media Workflow</p>
          <h2 className="workspace-hero__title">Danh sách công việc</h2>
          <p className="workspace-hero__subtitle">
            Theo dõi tiến độ chiến dịch theo thời gian thực và cộng tác cùng team truyền thông.
          </p>
          <div className="workspace-hero__info">
            <Icon size={18} />
            <span>{session}, {weekday} {date}</span>
          </div>

          <div className="workspace-metrics">
            {[{ label: 'Tổng việc', value: taskStats.total }, { label: 'Hoàn thành', value: taskStats.done }, { label: 'Sắp đến hạn', value: taskStats.upcoming }, { label: 'Quá hạn', value: taskStats.overdue }].map(metric => (
              <div className="workspace-metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="workspace-hero__actions">
          <button className="btn btn-outline-light rounded-4 px-4" onClick={() => setShowExportModal(true)}>
            <FaDownload className="me-2" /> Xuất báo cáo
          </button>
          <button className="glow-button" onClick={() => setShowAddModal(true)}>
            <FaPlus /> Thêm công việc
          </button>
        </div>
      </section>

      <div className="workspace-card tasks-board-card">

        {/* {editingTask && (
        <SidebarEditTask
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updated) => {
            setTaskList(prev => prev.map(t => (t.id === updated.id ? updated : t)));
            setEditingTask(null);
          }}
        />
      )} */}

        {/* Tabs */}
        <div className="task-tabs d-flex gap-4 mb-4">
          {[
            { key: 'all', label: 'Tất cả', count: taskList.length, color: 'dark' },
            { key: 'done', label: 'Đã hoàn thành', color: 'green', count: taskList.filter(isTaskDoneForMe).length },
            { key: 'pending', label: 'Chưa hoàn thành', color: 'orange', count: taskList.filter(t => {
              const deadline = new Date(t.deadline_at || t.task_date);
              const today = new Date();
              deadline.setHours(0,0,0,0);
              today.setHours(0,0,0,0);
              return !isTaskDoneForMe(t) && deadline >= today;
            }).length },
            {
              key: 'overdue',
              label: 'Quá hạn',
              color: 'red',
              count: taskList.filter(t => {
                const taskDeadline = new Date(t.deadline_at || t.task_date);
                taskDeadline.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                return !isTaskDoneForMe(t) && taskDeadline < today;
              }).length,
            }

          ].map(tabItem => (
            <div
              key={tabItem.key}
              className={`task-tab ${tab === tabItem.key ? 'active' : ''}`}
              onClick={() => setTab(tabItem.key as typeof tab)}
            >
              <span className="tab-label">{tabItem.label}</span>
              <span className={`tab-badge ${tabItem.color}`}>{tabItem.count}</span>
              {tab === tabItem.key && <div className="tab-underline" />}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="workspace-filters mb-3">
          <div className="row g-3 w-100">
            <div className="col-md-3">
              <Select
                isClearable
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={['Khẩn cấp', 'Cao', 'Trung bình', 'Thấp'].map(p => ({ value: p, label: p }))}
                placeholder="Độ ưu tiên"
              />
            </div>
            <div className="col-md-3">
              <Form.Control type="date" value={taskDateStart} onChange={e => setTaskDateStart(e.target.value)} />
            </div>
            <div className="col-md-3">
              <Form.Control type="date" value={taskDateEnd} onChange={e => setTaskDateEnd(e.target.value)} />
            </div>
            <div className="col-md-3">
              <Form.Control
                type="text"
                value={searchKeyword}
                onChange={e => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm công việc..."
              />
            </div>
          </div>
        </div>
        {(tab !== 'all' || priorityFilter || taskDateStart || taskDateEnd || searchKeyword) && (
          <div className="mb-2 text-muted">
            {filteredTasks.length === 0 ? (
              <span>Không có công việc nào khớp điều kiện lọc.</span>
            ) : (
              <span>Đã tìm thấy <strong>{filteredTasks.length}</strong> công việc.</span>
            )}
          </div>
        )}

        {/* Filter summary tags */}
        {(tab !== 'all' || priorityFilter || taskDateStart || taskDateEnd || searchKeyword) && (
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">

            {/* Trạng thái */}
            {tab !== 'all' && (
              <span className="workspace-filter-pill">
                Trạng thái: <strong>{{
                  done: 'Đã hoàn thành',
                  pending: 'Chưa hoàn thành',
                  overdue: 'Quá hạn',
                }[tab]}</strong>
                <button onClick={() => setTab('all')} aria-label="Xoá trạng thái">×</button>
              </span>
            )}

            {/* Ưu tiên */}
            {priorityFilter && (
              <span className="workspace-filter-pill">
                Ưu tiên: <strong>{priorityFilter.label}</strong>
                <button onClick={() => setPriorityFilter(null)} aria-label="Xoá ưu tiên">×</button>
              </span>
            )}

            {/* Từ ngày */}
            {taskDateStart && (
              <span className="workspace-filter-pill">
                Từ ngày: <strong>{taskDateStart}</strong>
                <button onClick={() => setTaskDateStart('')} aria-label="Xoá từ ngày">×</button>
              </span>
            )}

            {/* Đến ngày */}
            {taskDateEnd && (
              <span className="workspace-filter-pill">
                Đến ngày: <strong>{taskDateEnd}</strong>
                <button onClick={() => setTaskDateEnd('')} aria-label="Xoá đến ngày">×</button>
              </span>
            )}
            {/* Từ khoá */}
            {searchKeyword && (
              <span className="workspace-filter-pill">
                Từ khoá: <strong>{searchKeyword}</strong>
                <button onClick={() => setSearchKeyword('')} aria-label="Xoá từ khoá">×</button>
              </span>
            )}
            {/* Nút clear all */}
            <button
              className="btn-clear-hover"
              onClick={() => {
                setTab('all');
                setPriorityFilter(null);
                setTaskDateStart('');
                setTaskDateEnd('');
                setSearchKeyword('');
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="icon"
              >
                <path d="M5.5 5.5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0v-7zm2-.5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5z" />
                <path
                  fillRule="evenodd"
                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM5.5 1a.5.5 0 0 0-.5.5V2h6v-.5a.5.5 0 0 0-.5-.5h-5z"
                />
              </svg>
              <span>Xoá lọc</span>
            </button>



          </div>
        )}

        {/* Table */}
        <div className="workspace-table-shell">
          <div className="table-responsive task-table-wrapper">
            <Table hover className="align-middle task-table">
            <thead className="table-light text-center thead-small">
              <tr>
                <th className="truncate-cell" title="Ngày">Ngày</th>
                <th className="truncate-cell" title="Deadline">Deadline</th>
                <th className="truncate-cell" title="Task">Task</th>
                <th className="truncate-cell" title="Ca">Ca</th>
                <th className="truncate-cell" title="Loại">Loại</th>
                <th className="truncate-cell" title="Người được giao">Người được giao</th>
                <th className="truncate-cell" title="Người phụ trách">Phụ trách</th>
                <th className="truncate-cell" title="Tiến độ">Tiến độ</th>
                <th className="truncate-cell" title="Mục tiêu">Mục tiêu</th>
                <th className="truncate-cell" title="Ưu tiên">Ưu tiên</th>
                <th className="truncate-cell" title="Chi tiết">Chi tiết</th>
                <th className="truncate-cell" title="File">File</th>
                <th className="truncate-cell" title="Trạng thái">Trạng thái</th>
                <th className="truncate-cell" title="Hành động">  </th>

              </tr>
            </thead>
            <tbody>
              {currentTasks.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center text-muted py-4">Không có công việc phù hợp.</td>
                </tr>
              ) : currentTasks.map(task => {
                const user = users.find(u => u.name === task.supervisor);
                const avatar = user?.avatar ? `/storage/${user.avatar}` : 'https://www.w3schools.com/howto/img_avatar.png';

                return (
                    <tr
                    key={task.id}
                    id={`task-row-${task.id}`}
                    className={`task-row ${isTaskDoneForMe(task) ? 'task-done-row task-row-done' : ''}`}
                  >
                    <td className="text-center truncate-cell" title={formatDate(task.task_date)}>{formatDate(task.task_date)}</td>
                    <td className="text-center truncate-cell" title={formatDate(task.deadline_at)}>
                      {formatDate(task.deadline_at)}<br />

                    </td>
                    <td className="text-center fw-bold text-primary truncate-cell" title={task.title}>{task.title}</td>
                    <td className="text-center truncate-cell" title={task.shift || '-'}>{task.shift || '-'}</td>
                    <td className="text-center truncate-cell" title={task.type || '-'}>{task.type || '-'}</td>
                    <td className="text-center">
                      {Array.isArray(task.users) && task.users.length > 0 ? (
                        <div className="d-flex flex-column align-items-center gap-1 task-assignee-list">
                          {task.users.map((u: any, idx: number) => {
                            const matched = users.find((x) => x.id === u.id);
                            const avatarUrl = matched?.avatar
                              ? (matched.avatar.startsWith("http") ? matched.avatar : `/storage/${matched.avatar}`)
                              : "https://www.w3schools.com/howto/img_avatar.png";
                            return (
                              <div key={idx} className="d-flex align-items-center gap-2 task-assignee-item">
                                <img
                                  src={avatarUrl}
                                  alt="avatar"
                                  width="24"
                                  height="24"
                                  className="rounded-circle shadow-sm"
                                />
                                <span className="text-truncate">{matched?.name || u.name || "-"}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-muted">—</div>
                      )}
                    </td>

                    <td className="text-center">
                      <div className="d-flex align-items-center gap-2 justify-content-center truncate-cell" title={user?.name || task.supervisor || '-'}>
                        <img src={avatar} alt="avatar" width="32" height="32" className="rounded-circle shadow-sm" />
                        <span className="text-truncate">{user?.name || task.supervisor || '-'}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      {(() => {
                        const participants = Math.max(
                          1,
                          task.total_count
                            ?? (Array.isArray(task.users) ? task.users.length : 0)
                            ?? 1,
                        );
                        const done = Math.min(
                          participants,
                          task.done_count
                            ?? (Array.isArray(task.users)
                              ? task.users.filter((u: any) => u.pivot?.status === 'Đã hoàn thành').length
                              : 0),
                        );
                        const percent = clampProgress((done / participants) * 100);
                        return (
                          <div className="task-progress-bar" title={`Đã hoàn thành ${done}/${participants}`}>
                            <div className="task-progress-bar__track">
                              <div className="task-progress-bar__fill" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="task-progress-bar__value">{done}/{participants}</span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="text-center">
                      {(() => {
                        const goal = Math.max(1, task.task_goal ?? task.total_count ?? 1);
                        return (
                          <span
                            className="task-goal-chip"
                            title={`Mục tiêu: ${goal}`}
                          >
                            {goal}
                          </span>
                        );
                      })()}
                    </td>


                    <td className="text-center">
                      <span className={`task-priority-pill priority-${getPriorityTone(task.priority)}`}>
                        {task.priority || 'Không'}
                      </span>
                    </td>
                    <td className="text-center truncate-cell" title={task.detail || '-'}>{task.detail || '-'}</td>
                    <td className="text-center truncate-cell" title="Tệp đính kèm">
                      {Array.isArray(task.files) && task.files.length > 0 && (
                        <div className="d-flex flex-column gap-1 mb-1">
                          {task.files.map(file => (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="attachment-pill"
                            >
                              {file.original_name}
                            </a>
                          ))}
                        </div>
                      )}
                      {task.file_link
                        ? task.file_link.split(',').map((link, i) => (
                          <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer">Link {i + 1}<br /></a>
                        ))
                        : (!task.files || task.files.length === 0 ? '-' : null)}
                    </td>
                    <td className="text-center">
                      <Form.Check type="switch" id={`task-${task.id}`} checked={isTaskDoneForMe(task)} onChange={() => handleToggle(task)} />
                    </td>

                    <td className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        {/* Nút Sửa */}
                        <Button
                          size="sm"
                          variant="link"
                          className="p-0 text-secondary"
                          onClick={() => {
                            setEditingTask(task);
                            setIsEditingMode(false);
                          }}
                          title="Sửa"
                        // disabled={task.status === 'Đã hoàn thành'}
                        >
                          <BsPencil size={18} />
                        </Button>

                        {/* Nút 3 chấm không có mũi tên */}
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            as="button"
                            size="sm"
                            className="btn p-0 text-secondary no-caret-dropdown"
                            title="Tuỳ chọn khác"
                          // disabled={task.status === 'Đã hoàn thành'}
                          >
                            <BiDotsVerticalRounded size={20} />
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => handleDelete(task.id)}>
                              <FaTrash className="me-2" /> Xoá
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setShowExportModal(true)}>
                              <FaDownload className="me-2" /> Export
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </td>





                  </tr>
                );
              })}
            </tbody>

            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>Trang {currentPage}/{totalPages || 1}</span>
          <nav className="workspace-pagination">
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                  </svg>
                </button>
              </li>
              <li className="page-item disabled">
                <span className="page-link">{currentPage}/{totalPages || 1}</span>
              </li>
              <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  aria-label="Trang sau"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          title="Thêm công việc" onClose={() => setShowAddModal(false)}
        >
          <TaskAddForm
            onCancel={() => setShowAddModal(false)}
            onSuccess={(newTask) => {
              const normalized = normalizeTasks([newTask])[0];
              setTaskList(prev => [normalized, ...prev]);
              setShowAddModal(false);
            }}
          />
        </Modal>
      )}
      <Modal
        isOpen={!!editingTask}
        title={isEditingMode ? 'Sửa công việc' : 'Chi tiết công việc'}
        size="xl"
        dialogClassName="modal-extra-wide"
        onClose={() => {
          setEditingTask(null);
          setIsEditingMode(false);
        }}
      >
        <TaskEditForm
          task={editingTask}
          onCancel={() => {
            setEditingTask(null);
            setIsEditingMode(false);
          }}
          onModeChange={setIsEditingMode}
          onSuccess={(updatedTask) => {
            const normalized = normalizeTasks([updatedTask])[0];
            setTaskList(prev => prev.map(t => t.id === normalized.id ? normalized : t));
            setEditingTask(null);
            setIsEditingMode(false);
          }}
        />
      </Modal>


      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

    </>


  );
}

