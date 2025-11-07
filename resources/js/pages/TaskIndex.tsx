import React, { useEffect, useState } from 'react';
import { Button, Badge, Form, Table } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import Select, { SingleValue } from 'react-select';
import Swal from 'sweetalert2';
import SidebarEditTask from '../components/SidebarEditTask';
import { BsPencil } from 'react-icons/bs';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import { Sun, Sunrise, Moon } from 'lucide-react';
import TaskAddForm from '../components/forms/TaskAddForm';
import TaskEditForm from '../components/forms/TaskEditForm'
import  Modal  from '../components/Modal'
import ExportModal from '../components/ExportModal';
import { Dropdown } from 'react-bootstrap';
import { FaDownload, FaTrash } from 'react-icons/fa';

type OptionType = { value: string; label: string };

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
  status: 'Đã hoàn thành' | 'Chưa hoàn thành';
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
  const [taskList, setTaskList] = useState<Task[]>(tasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tab, setTab] = useState<'all' | 'done' | 'pending' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SingleValue<OptionType>>(null);
  const [taskDateStart, setTaskDateStart] = useState('');
  const [taskDateEnd, setTaskDateEnd] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const itemsPerPage = 7;

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, priorityFilter, taskDateStart, taskDateEnd]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers)
      .catch(err => console.error('Lỗi tải danh sách user', err));
  }, []);

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
      if (tab === 'done' && task.status !== 'Đã hoàn thành') return false;
      if (tab === 'pending' && (task.status !== 'Chưa hoàn thành' || taskDeadline < today)) return false;
     if (tab === 'overdue' && (task.status !== 'Chưa hoàn thành' || taskDeadline >= today)){ console.log(taskDeadline, today); return false;}


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

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'Đã hoàn thành' ? 'Chưa hoàn thành' : 'Đã hoàn thành';
    try {
      const res = await fetch(`/tasks/${task.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Cập nhật trạng thái thất bại');
      setTaskList(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái!');
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

  
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Khẩn cấp':
        return 'danger';
      case 'Cao':
        return 'warning';
      case 'Trung bình':
        return 'primary';
      case 'Thấp':
        return 'secondary';
      default:
        return 'light';
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
    {/* Heading và nút thêm công việc */}
   <div className="d-flex justify-content-between align-items-center mb-4 w-100">
  <div className="d-flex flex-column">
    <h2 className="fw-bold mb-1">Danh sách công việc</h2>
    <div className="d-flex align-items-center text-muted">
      <Icon size={20} className="me-2" />
      <span className="fw-semibold">{session}, {weekday} {date}</span>
    </div>
  </div>

 <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            className="rounded-3 py-2 px-3"
            onClick={() => setShowExportModal(true)}
          >
            <FaDownload className="me-2" />
            Export
          </Button>
          <Button
            variant="dark"
            className="d-flex align-items-center gap-2 rounded-3 py-2 px-3"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus />
            Thêm công việc
          </Button>
        </div>
      </div>


    
    <div className="card shadow-sm rounded-4 p-4 bg-white">
      
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
          { key: 'done', label: 'Đã hoàn thành', color: 'green', count: taskList.filter(t => t.status === 'Đã hoàn thành').length },
          { key: 'pending', label: 'Chưa hoàn thành', color: 'orange', count: taskList.filter(t => t.status === 'Chưa hoàn thành' && new Date(t.deadline_at || t.task_date) >= new Date()).length },
          {
  key: 'overdue',
  label: 'Quá hạn',
  color: 'red',
  count: taskList.filter(t => {
    const taskDeadline = new Date(t.deadline_at || t.task_date);
    taskDeadline.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return t.status === 'Chưa hoàn thành' && taskDeadline < today;
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
      <div className="row align-items-center mb-3">
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
        <div className="col-md-3 text-end">
          <Form onSubmit={e => e.preventDefault()}>
            <div className="d-flex">
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
          </Form>

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
            <span className="badge-filter">
              Trạng thái: <strong className="ms-1">{{
                done: 'Đã hoàn thành',
                pending: 'Chưa hoàn thành',
                overdue: 'Quá hạn',
              }[tab]}</strong>
              <button
                onClick={() => setTab('all')}
                className="btn-close-filter"
                aria-label="Xoá trạng thái"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            </span>
          )}

          {/* Ưu tiên */}
          {priorityFilter && (
            <span className="badge-filter">
              Ưu tiên: <strong className="ms-1">{priorityFilter.label}</strong>
              <button
                onClick={() => setPriorityFilter(null)}
                className="btn-close-filter"
                aria-label="Xoá ưu tiên"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            </span>
          )}

          {/* Từ ngày */}
          {taskDateStart && (
            <span className="badge-filter">
              Từ ngày: <strong className="ms-1">{taskDateStart}</strong>
              <button
                onClick={() => setTaskDateStart('')}
                className="btn-close-filter"
                aria-label="Xoá từ ngày"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            </span>
          )}

          {/* Đến ngày */}
          {taskDateEnd && (
            <span className="badge-filter">
              Đến ngày: <strong className="ms-1">{taskDateEnd}</strong>
              <button
                onClick={() => setTaskDateEnd('')}
                className="btn-close-filter"
                aria-label="Xoá đến ngày"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            </span>
          )}
          {/* Từ khoá */}
          {searchKeyword && (
            <span className="badge-filter">
              Từ khoá: <strong className="ms-1">{searchKeyword}</strong>
              <button
                onClick={() => setSearchKeyword('')}
                className="btn-close-filter"
                aria-label="Xoá từ khoá"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
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
      <div className="table-responsive">
        <Table hover className="align-middle">
          <thead className="table-light text-center thead-small">
            <tr>
              <th className="truncate-cell" title="Ngày">Ngày</th>
              <th className="truncate-cell" title="Deadline">Deadline</th>
              <th className="truncate-cell" title="Task">Task</th>
              <th className="truncate-cell" title="Ca">Ca</th>
              <th className="truncate-cell" title="Loại">Loại</th>
              <th className="truncate-cell" title="Người phụ trách">Phụ trách</th>
              <th className="truncate-cell" title="Tiến độ">Tiến độ</th>
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
               <tr key={task.id} className={task.status === 'Đã hoàn thành' ? 'task-done-row' : ''}>
                  <td className="text-center truncate-cell" title={formatDate(task.task_date)}>{formatDate(task.task_date)}</td>
                  <td className="text-center truncate-cell" title={formatDate(task.deadline_at)}>
                    {formatDate(task.deadline_at)}<br />
                   
                  </td>
                  <td className="text-center fw-bold text-primary truncate-cell" title={task.title}>{task.title}</td>
                  <td className="text-center truncate-cell" title={task.shift || '-'}>{task.shift || '-'}</td>
                  <td className="text-center truncate-cell" title={task.type || '-'}>{task.type || '-'}</td>
                  <td className="text-center">
                    <div className="d-flex align-items-center gap-2 justify-content-center truncate-cell" title={user?.name || task.supervisor || '-'}>
                      <img src={avatar} alt="avatar" width="32" height="32" className="rounded-circle shadow-sm" />
                      <span className="text-truncate">{user?.name || task.supervisor || '-'}</span>
                    </div>
                  </td>
                  <td className="text-center truncate-cell" title={`${task.progress ?? 0}%`}>
                    {task.progress ?? 0}
                  </td>
                  <td className="text-center truncate-cell">
                    <Badge bg={getPriorityColor(task.priority)}>{task.priority || '-'}</Badge>
                  </td>
                  <td className="text-center truncate-cell" title={task.detail || '-'}>{task.detail || '-'}</td>
                  <td className="text-center truncate-cell" title={task.file_link || '-'}>
                    {task.file_link
                      ? task.file_link.split(',').map((link, i) => (
                        <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer">Link {i + 1}<br /></a>
                      ))
                      : '-'}
                  </td>
                   <td className="text-center">
                    <Form.Check type="switch" id={`task-${task.id}`} checked={task.status === 'Đã hoàn thành'} onChange={() => handleToggle(task)} />
                  </td>
                
<td className="text-center">
  <div className="d-flex align-items-center justify-content-center gap-2">
    {/* Nút Sửa */}
    <Button
      size="sm"
      variant="link"
      className="p-0 text-secondary"
      onClick={() => setEditingTask(task)}
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

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <span>Trang {currentPage}/{totalPages}</span>
        <div>
         <Button
  size="sm"
  variant="link"
  className="text-secondary p-0 me-2"
  disabled={currentPage === 1}
  onClick={() => setCurrentPage(p => p - 1)}
  aria-label="Trang trước"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </svg>
</Button>

<Button
  size="sm"
  variant="link"
  className="text-secondary p-0"
  disabled={currentPage === totalPages}
  onClick={() => setCurrentPage(p => p + 1)}
  aria-label="Trang sau"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
  </svg>
</Button>

        </div>
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
        setTaskList(prev => [newTask, ...prev]);
        setShowAddModal(false);
      }}
    />
  </Modal>
)}
<Modal  isOpen={!!editingTask}
   title="Sửa công việc"
   onClose={() => setEditingTask(null)}
>
    <TaskEditForm
      task={editingTask}
      onCancel={() => setEditingTask(null)}
      onSuccess={(updatedTask) => {
        setTaskList(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        setEditingTask(null);
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

