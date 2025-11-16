import React, { useEffect, useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import AsyncDropdownSelect from '../AsyncDropdownSelect';
import Swal from 'sweetalert2';

export default function TaskDetailForm({ task, onSuccess, onCancel }) {
  if (!task) return null;

  const [editMode, setEditMode] = useState(false);

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
    setEditMode(false);
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf,
        },
        body: JSON.stringify({
          ...form,
          deadline_at: form.deadline_at || form.task_date,
        }),
      });

      if (!res.ok) throw new Error("Cập nhật thất bại");

      const data = await res.json();
      onSuccess?.(data);
      Swal.fire("Thành công", "Đã cập nhật công việc", "success");
      setEditMode(false);

    } catch (err) {
      Swal.fire("Lỗi", "Không thể cập nhật công việc", "error");
    }
  };

  const disable = !editMode;

  return (
    <Form onSubmit={handleSubmit}>
      <h4 className="mb-3">Chi tiết công việc</h4>

      <Row className="g-3">

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

        {/* PRIORITY */}
        <Col md={6}>
          <Form.Group>
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

        {/* PROGRESS */}
        <Col md={6}>
          <Form.Group>
            <Form.Label className="label-inside">Tiến độ (%)</Form.Label>
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
          <Form.Group>
            <Form.Label className="label-inside">File liên quan</Form.Label>
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
          <Form.Group>
            <Form.Label className="label-inside">Chi tiết</Form.Label>
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

      {/* BUTTON BAR */}
      <div className="d-flex justify-content-end gap-2 mt-4">

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
          <>
            <Button variant="secondary" onClick={() => setEditMode(false)}>
              Huỷ
            </Button>

            <Button type="submit" variant="success">
              Lưu thay đổi
            </Button>
          </>
        )}

      </div>
    </Form>
  );
}
