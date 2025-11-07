import React, { useEffect, useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import AsyncDropdownSelect from '../AsyncDropdownSelect';

const PRIORITY_OPTIONS = ["Khẩn cấp", "Cao", "Trung bình", "Thấp"];
const STATUS_OPTIONS = ["Chưa hoàn thành", "Đã hoàn thành"];

export default function TaskEditFormAdmin({ task, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    task_date: '',
    deadline_at: '',
    shift: '',
    type: '',
    supervisor: '',
    detail: '',
    file_link: '',
    priority: '',
    progress: '',
    status: '',
    user_id: '',     // Người dùng
    assigned_by: '', // Người giao
  });

  const [submitting, setSubmitting] = useState(false);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // Nạp dữ liệu ban đầu từ task
  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title || '',
      task_date: task.task_date || '',
      deadline_at: task.deadline_at || '',
      shift: task.shift || '',
      type: task.type || '',
      supervisor: task.supervisor || '',
      detail: task.detail || '',
      file_link: task.file_link || '',
      priority: task.priority || 'Trung bình',
      progress: (task.progress ?? '') === null ? '' : (task.progress ?? ''),
      status: task.status || 'Chưa hoàn thành',
      user_id: task.user_id ?? task.user?.id ?? '',
      assigned_by: task.assigned_by ?? task.assigned_by_user?.id ?? '',
    });
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.task_date) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập tiêu đề và ngày!', 'warning');
      return;
    }
    if (!form.priority) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn độ ưu tiên!', 'warning');
      return;
    }
    if (!form.user_id) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn Người dùng!', 'warning');
      return;
    }
    if (!form.assigned_by) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn Người giao!', 'warning');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...form,
        deadline_at: form.deadline_at || form.task_date,
        progress:
          form.progress === '' || form.progress === null
            ? null
            : Math.max(0, Math.min(100, Number(form.progress))),
        _method: 'PUT',
      };

      const res = await fetch(`/management/tasks/${task.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        console.error('Server error:', msg);
        throw new Error('Cập nhật thất bại');
      }

      const updated = await res.json(); // kỳ vọng backend đã load user & assignedByUser
      onSuccess?.(updated);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể cập nhật công việc', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
        {/* Ngày / Deadline */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Ngày thực hiện</Form.Label>
            <Form.Control
              type="date"
              name="task_date"
              value={form.task_date}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Deadline</Form.Label>
            <Form.Control
              type="date"
              name="deadline_at"
              value={form.deadline_at}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>

        {/* Tiêu đề */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Tiêu đề</Form.Label>
            <AsyncDropdownSelect
              name="title"
              label=""
              api="/api/titles"
              field="title_name"
              value={form.title}
              onChange={handleChange}
              creatable
            />
          </Form.Group>
        </Col>

        {/* Ca */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Ca</Form.Label>
            <AsyncDropdownSelect
              name="shift"
              label=""
              api="/api/shifts"
              field="shift_name"
              value={form.shift}
              onChange={handleChange}
              creatable
            />
          </Form.Group>
        </Col>

        {/* Loại công việc */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Loại công việc</Form.Label>
            <AsyncDropdownSelect
              name="type"
              label=""
              api="/api/types"
              field="type_name"
              value={form.type}
              onChange={handleChange}
              creatable
            />
          </Form.Group>
        </Col>

        {/* Người phụ trách */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người phụ trách</Form.Label>
            <AsyncDropdownSelect
              name="supervisor"
              label=""
              api="/api/supervisors"
              field="supervisor_name"
              value={form.supervisor}
              onChange={handleChange}
              creatable
            />
          </Form.Group>
        </Col>

        {/* Độ ưu tiên */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Độ ưu tiên</Form.Label>
            <Form.Select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              required
            >
              <option value="">-- Chọn --</option>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        {/* Trạng thái */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Trạng thái</Form.Label>
            <Form.Select
              name="status"
              value={form.status}
              onChange={handleChange}
              required
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        {/* Tiến độ */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Tiến độ</Form.Label>
            <Form.Control
              type="number"
              name="progress"
              min={0}
              max={100}
              value={form.progress}
              onChange={handleChange}
              placeholder="0 - 100"
            />
          </Form.Group>
        </Col>

        {/* File */}
        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">File liên quan</Form.Label>
            <Form.Control
              type="text"
              name="file_link"
              value={form.file_link}
              onChange={handleChange}
              placeholder="Link file, phân cách bằng dấu phẩy"
            />
          </Form.Group>
        </Col>

        {/* Chi tiết */}
        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Chi tiết</Form.Label>
            <Form.Control
              as="textarea"
              name="detail"
              value={form.detail}
              onChange={handleChange}
              rows={3}
            />
          </Form.Group>
        </Col>

        {/* Người dùng (assignee) */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người dùng</Form.Label>
            <AsyncDropdownSelect
              name="user_id"
              label=""
              api="/api/users"
              field="name"
              valueKey="id"
              labelKey="name"
              value={form.user_id}
              onChange={handleChange}
              creatable={false}
            />
          </Form.Group>
        </Col>

        {/* Người giao (assigner) */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người giao</Form.Label>
            <AsyncDropdownSelect
              name="assigned_by"
              label=""
              api="/api/users"
              field="name"
              valueKey="id"
              labelKey="name"
              value={form.assigned_by}
              onChange={handleChange}
              creatable={false}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button variant="secondary" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Cập nhật'}
        </Button>
      </div>
    </Form>
  );
}
