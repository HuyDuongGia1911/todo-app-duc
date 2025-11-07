import React, { useEffect, useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import AsyncDropdownSelect from '../AsyncDropdownSelect';
import Swal from 'sweetalert2';

export default function TaskEditForm({ task, onSuccess, onCancel }) {
  if (!task) return null;

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

  const [submitting, setSubmitting] = useState(false);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  useEffect(() => {
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
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const res = await fetch(`/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({
          ...form,
          deadline_at: form.deadline_at || form.task_date,
        }),
      });

      if (!res.ok) throw new Error('Cập nhật thất bại');

      const data = await res.json();
      onSuccess?.(data);
    } catch (err) {
      Swal.fire('Lỗi', 'Cập nhật thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
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

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Ngày</Form.Label>
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
            <Form.Label className="label-inside">Hạn hoàn thành</Form.Label>
            <Form.Control
              type="date"
              name="deadline_at"
              value={form.deadline_at}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>

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

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Độ ưu tiên</Form.Label>
            <Form.Select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="">-- Chọn --</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </Form.Select>
          </Form.Group>
        </Col>

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
            placeholder="0"
          />
        </Form.Group>
      </Col>
      
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
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button variant="secondary" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </Form>
  );
}
