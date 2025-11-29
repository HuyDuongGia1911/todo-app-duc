import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import AsyncDropdownSelect from '../AsyncDropdownSelect';
import Swal from 'sweetalert2';
import Select from 'react-select';

export default function TaskDetailForm({ task, onSuccess, onCancel, onModeChange }) {
  if (!task) return null;

  const [editMode, setEditMode] = useState(false);
  const [existingFiles, setExistingFiles] = useState(task.files || []);
  const [newFiles, setNewFiles] = useState([]);
  const [removeFileIds, setRemoveFileIds] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(Array.isArray(task.users) ? task.users.map(u => u.id) : []);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentsBodyRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    task_date: '',
    deadline_at: '',
    shift: '',
    type: '',
    supervisor: '',
    priority: '',
    detail: '',
    file_link: '',
    progress: '',
  });

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const currentUser = useMemo(() => {
    const raw = document.querySelector('meta[name="current-user"]')?.getAttribute('content');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }, []);

  const formatVNDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('vi-VN');
  };

  const getPriorityTone = (priority) => {
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatCommentTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const resolveAvatar = (user) => {
    if (user?.avatar) {
      return user.avatar.startsWith('http') ? user.avatar : `/storage/${user.avatar}`;
    }
    return 'https://www.w3schools.com/howto/img_avatar.png';
  };

  const resetFormState = () => {
    setForm({
      title: task.title || '',
      task_date: task.task_date || '',
      deadline_at: task.deadline_at || '',
      shift: task.shift || '',
      type: task.type || '',
      supervisor: task.supervisor || '',
      priority: task.priority || '',
      detail: task.detail || '',
      file_link: task.file_link || '',
      progress: task.progress || '',
    });
    setExistingFiles(task.files || []);
    setNewFiles([]);
    setRemoveFileIds([]);
    setSelectedUserIds(Array.isArray(task.users) ? task.users.map(u => u.id) : []);
  };

  useEffect(() => {
    let aborted = false;

    fetch('/api/users')
      .then(res => res.json())
      .then(users => {
        if (aborted) return;
        setUserOptions(users.map(user => ({ value: user.id, label: user.name })));
      })
      .catch(() => {});

    return () => {
      aborted = true;
    };
  }, []);
  useEffect(() => {
    resetFormState();
    setEditMode(false);
  }, [task]);

  useEffect(() => {
    if (!task?.id) {
      setComments([]);
      return;
    }

    setCommentsLoading(true);
    fetch(`/tasks/${task.id}/comments`, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('Lỗi tải bình luận');
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          setComments([]);
          return;
        }
        const ordered = [...data].sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
            return 0;
          }
          return timeA - timeB;
        });
        setComments(ordered);
      })
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [task?.id]);

  useEffect(() => {
    onModeChange?.(editMode);
  }, [editMode, onModeChange]);

  useEffect(() => {
    if (!commentsBodyRef.current) return;
    commentsBodyRef.current.scrollTop = commentsBodyRef.current.scrollHeight;
  }, [comments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = new FormData();
      payload.append('_method', 'PUT');
      payload.append('assignees_submitted', '1');

      Object.entries({
        ...form,
        deadline_at: form.deadline_at || form.task_date,
      }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          payload.append(key, value);
        }
      });

      newFiles.forEach(file => payload.append('attachments[]', file));
      removeFileIds.forEach(id => payload.append('remove_attachment_ids[]', id));
      selectedUserIds.forEach(id => payload.append('user_ids[]', id));

      const res = await fetch(`/tasks/${task.id}`, {
        method: 'POST',
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf,
        },
        body: payload,
      });

      if (!res.ok) throw new Error("Cập nhật thất bại");

      const data = await res.json();
      const parsedGoal = Number(form.progress);
      const normalized = {
        ...data,
        task_goal: Number.isFinite(parsedGoal) && parsedGoal > 0
          ? parsedGoal
          : data.task_goal ?? (data.users?.length || 1),
        files: data.files || [],
      };
      onSuccess?.(normalized);
      setExistingFiles(normalized.files);
      setNewFiles([]);
      setRemoveFileIds([]);
      setSelectedUserIds(Array.isArray(normalized.users) ? normalized.users.map(u => u.id) : []);
      Swal.fire("Thành công", "Đã cập nhật công việc", "success");
      setEditMode(false);

    } catch (err) {
      Swal.fire("Lỗi", "Không thể cập nhật công việc", "error");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) {
      return;
    }
    if (!task?.id) {
      return;
    }

    setCommentSubmitting(true);

    try {
      const res = await fetch(`/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({ body: trimmed }),
      });

      if (!res.ok) {
        throw new Error('Gửi bình luận thất bại');
      }

      const newComment = await res.json();
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (err) {
      Swal.fire('Lỗi', 'Không thể gửi bình luận', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const disable = !editMode;

  const toggleRemoveFile = (fileId) => {
    setRemoveFileIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  return (
    <div className="task-detail-layout">
      <div className="task-detail-column">
        <Form onSubmit={handleSubmit} className="task-edit-form">
      <div className="task-edit-panel mb-4">
        <div className="task-edit-header">
          <div>
            <p className="task-edit-subtitle">Đang chỉnh sửa</p>
            <h4 className="task-edit-title">{task.title || 'Chưa đặt tên'}</h4>
          </div>
          <span
            className={`task-priority-pill priority-${getPriorityTone(form.priority || task.priority)}`}
          >
            {form.priority || task.priority || 'Không xác định'}
          </span>
        </div>

        <div className="task-edit-meta">
          <div className="task-edit-meta-item">
            <span>Ngày thực hiện</span>
            <strong>{formatVNDate(form.task_date || task.task_date)}</strong>
          </div>
          <div className="task-edit-meta-item">
            <span>Hạn hoàn thành</span>
            <strong>{formatVNDate(form.deadline_at || task.deadline_at || form.task_date)}</strong>
          </div>
          <div className="task-edit-meta-item">
            <span>Người phụ trách</span>
            <strong>{form.supervisor || task.supervisor || '—'}</strong>
          </div>
        </div>
      </div>

      <div className="task-edit-section">
        <div className="task-edit-section__title">Thông tin chung</div>

        <Row className="g-4">

        {/* TIÊU ĐỀ */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Tiêu đề</Form.Label>
            <AsyncDropdownSelect
              name="title"
              api="/api/titles"
              field="title_name"
              value={form.title}
              onChange={handleChange}
              disabled={disable}
              creatable
            />
          </Form.Group>
        </Col>

        {/* NGÀY */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Ngày</Form.Label>
            <Form.Control
              type="date"
              name="task_date"
              value={form.task_date}
              onChange={handleChange}
              disabled={disable}
            />
          </Form.Group>
        </Col>

        {/* DEADLINE */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Hạn hoàn thành</Form.Label>
            <Form.Control
              type="date"
              name="deadline_at"
              value={form.deadline_at}
              onChange={handleChange}
              disabled={disable}
            />
          </Form.Group>
        </Col>

        {/* CA */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Ca</Form.Label>
            <AsyncDropdownSelect
              name="shift"
              api="/api/shifts"
              field="shift_name"
              value={form.shift}
              onChange={handleChange}
              disabled={disable}
              creatable
            />
          </Form.Group>
        </Col>

        {/* LOẠI */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Loại công việc</Form.Label>
            <AsyncDropdownSelect
              name="type"
              api="/api/types"
              field="type_name"
              value={form.type}
              onChange={handleChange}
              disabled={disable}
              creatable
            />
          </Form.Group>
        </Col>

        {/* NGƯỜI PHỤ TRÁCH */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người phụ trách</Form.Label>
            <AsyncDropdownSelect
              name="supervisor"
              api="/api/supervisors"
              field="supervisor_name"
              value={form.supervisor}
              onChange={handleChange}
              disabled={disable}
              creatable
            />
          </Form.Group>
        </Col>

        {/* NGƯỜI ĐƯỢC GIAO */}
        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người được giao</Form.Label>
            <Select
              isMulti
              isDisabled={disable}
              options={userOptions}
              classNamePrefix="assignee-select"
              placeholder="Chọn người nhận..."
              value={userOptions.filter(opt => selectedUserIds.includes(opt.value))}
              onChange={(options) => setSelectedUserIds((options || []).map(opt => opt.value))}
            />
            <small className="text-muted">Có thể chọn nhiều người; nếu bỏ trống hệ thống sẽ gán chính bạn.</small>
          </Form.Group>
        </Col>

        {/* PRIORITY */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Độ ưu tiên</Form.Label>
            <Form.Select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              disabled={disable}
            >
              <option value="">-- Chọn --</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </Form.Select>
          </Form.Group>
        </Col>

        {/* PROGRESS / GOAL */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Mục tiêu (số lượng)</Form.Label>
            <Form.Control
              type="number"
              name="progress"
              value={form.progress}
              min={0}
              max={100}
              onChange={handleChange}
              disabled={disable}
            />
          </Form.Group>
        </Col>

        {/* FILE */}
        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Chèn link (phân cách bằng dấu phẩy)</Form.Label>
            <Form.Control
              type="text"
              name="file_link"
              value={form.file_link}
              onChange={handleChange}
              placeholder="Nhập link file, phân cách bằng dấu phẩy"
              disabled={disable}
            />
          </Form.Group>
        </Col>

        {/* CHI TIẾT */}
        <Col md={12}>
          <Form.Group className="input-wrapper input-wrapper--textarea">
            <Form.Label className="label-inside">Chi tiết công việc</Form.Label>
            <Form.Control
              as="textarea"
              name="detail"
              rows={4}
              value={form.detail}
              placeholder="Nhập mô tả chi tiết công việc..."
              onChange={handleChange}
              disabled={disable}
            />
          </Form.Group>
        </Col>

        </Row>
      </div>

      <div className="task-edit-section">
        <div className="task-edit-section__title">Tệp đính kèm</div>

        {existingFiles.length === 0 ? (
          <p className="text-muted mb-3">Chưa có tệp nào.</p>
        ) : (
          <ul className="attachment-list mb-3">
            {existingFiles.map(file => {
              const markedForRemoval = removeFileIds.includes(file.id);
              return (
                <li
                  key={file.id}
                  className={`attachment-list__item ${markedForRemoval ? 'attachment-list__item--remove' : ''}`}
                >
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.original_name}
                  </a>
                  <span className="text-muted small">{formatFileSize(file.size)}</span>
                  {editMode && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => toggleRemoveFile(file.id)}
                    >
                      {markedForRemoval ? 'Bỏ xoá' : 'Xoá'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Form.Group className="input-wrapper">
          <Form.Label className="label-inside">Thêm tệp mới</Form.Label>
          <Form.Control
            type="file"
            multiple
            disabled={disable}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={(e) => {
              setNewFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
          {newFiles.length > 0 && (
            <ul className="attachment-list mt-2">
              {newFiles.map((file, idx) => (
                <li key={`${file.name}-${idx}`} className="attachment-list__item">
                  <span>{file.name}</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                  >
                    Gỡ
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Form.Group>
      </div>

      {/* BUTTON BAR */}
      <div className="task-edit-actions">

        {!editMode && (
          <>
            <Button variant="primary" onClick={() => setEditMode(true)}>
              Sửa công việc
            </Button>

            <Button variant="secondary" onClick={onCancel}>
              Đóng
            </Button>
          </>
        )}

        {editMode && (
          <div className="d-flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                resetFormState();
                setEditMode(false);
              }}
            >
              Huỷ
            </Button>

            <Button type="submit" variant="success">
              Lưu thay đổi
            </Button>
          </div>
        )}
      </div>

      </Form>
    </div>

      <aside className="task-comments-panel">
        <div className="task-comments-header">
          <div>
            <p className="section-eyebrow">Trao đổi nội bộ</p>
            <h5>Bình luận công việc</h5>
          </div>
        </div>

        <div className="task-comments-body" ref={commentsBodyRef}>
          {commentsLoading ? (
            <div className="task-comment-skeleton" />
          ) : comments.length === 0 ? (
            <p className="text-muted small">Chưa có bình luận nào. Hãy bắt đầu trao đổi để mọi người nắm rõ tiến độ.</p>
          ) : (
            comments.map(comment => {
              const isMine = currentUser && comment.user?.id === currentUser.id;
              return (
                <div key={comment.id} className={`task-comment ${isMine ? 'task-comment--me' : ''}`}>
                  <div className="task-comment__avatar">
                    <img src={resolveAvatar(comment.user)} alt={comment.user?.name || 'user'} />
                  </div>
                  <div className="task-comment__content">
                    <div className="task-comment__meta">
                      <strong>{comment.user?.name || 'Không rõ'}</strong>
                      <span>{formatCommentTime(comment.created_at)}</span>
                    </div>
                    <p>{comment.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form className="task-comments-form" onSubmit={handleCommentSubmit}>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Nhập bình luận..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleCommentSubmit(e);
              }
            }}
          />
          <div className="task-comments-form__actions">
            <span className="text-muted small">Ctrl + Enter để gửi nhanh</span>
            <Button type="submit" variant="primary" disabled={commentSubmitting || !commentText.trim()}>
              {commentSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
