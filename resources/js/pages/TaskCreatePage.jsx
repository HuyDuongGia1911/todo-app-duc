import React from 'react';
import Swal from 'sweetalert2';
import TaskAddForm from '../components/forms/TaskAddForm';

const buildHighlightUrl = (baseUrl, taskId) => {
  const fallback = `/tasks${taskId ? `?highlight_task=${taskId}` : ''}`;
  if (!baseUrl) {
    return fallback;
  }

  if (!taskId) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}highlight_task=${taskId}`;
};

export default function TaskCreatePage({ redirectUrl, backUrl }) {
  const handleSuccess = (task) => {
    Swal.fire({
      icon: 'success',
      title: 'Đã tạo công việc',
      text: 'Chuyển về danh sách để theo dõi tiến độ.',
      timer: 1600,
      showConfirmButton: false,
    }).then(() => {
      window.location.href = buildHighlightUrl(redirectUrl, task?.id);
    });
  };

  const handleCancel = () => {
    window.location.href = backUrl || redirectUrl || '/tasks';
  };

  return (
    <div className="task-create-page">
      <div className="task-create-card card border-0 shadow-sm">
        <div className="task-create-card__header">
          <div>
            <p className="task-create-eyebrow">Tạo công việc mới</p>
            <h2 className="mb-2">Thông tin chi tiết công việc</h2>
            <p className="text-muted mb-0">Điền đủ dữ liệu để hệ thống tự nhắc việc và giao cho đồng đội.</p>
          </div>
          <button type="button" className="btn btn-outline-secondary" onClick={handleCancel}>
            Quay lại
          </button>
        </div>
        <TaskAddForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
