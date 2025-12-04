import React, { useRef, useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import AsyncDropdownSelect from '../AsyncDropdownSelect';

export default function TaskAddFormAdmin({ onSuccess, onCancel }) {
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
    user_ids: [],
    assigned_by: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(files);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
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
    if (!form.user_ids.length) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn ít nhất một người nhận!', 'warning');
      return;
    }
    if (!form.assigned_by) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn Người giao!', 'warning');
      return;
    }

    try {
      setSubmitting(true);

      // 1) Kiểm tra trùng
      const checkRes = await fetch('/tasks/check-exist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({
          title: form.title,
          task_date: form.task_date,
        }),
      });
      const checkResult = await checkRes.json();
      if (checkResult.exists) {
        const confirm = await Swal.fire({
          icon: 'warning',
          title: 'Công việc đã tồn tại',
          text: 'Công việc này đã có trong ngày. Bạn có muốn thêm tiếp không?',
          showCancelButton: true,
          confirmButtonText: 'Vẫn thêm',
          cancelButtonText: 'Huỷ',
        });
        if (!confirm.isConfirmed) {
          setSubmitting(false);
          return;
        }
      }

      // 2) Tạo qua endpoint Admin
      const userIds = form.user_ids
        .map(value => Number(value))
        .filter(id => !Number.isNaN(id));

      const payload = new FormData();
      payload.append('title', form.title.trim());
      payload.append('task_date', form.task_date);
      payload.append('deadline_at', form.deadline_at || form.task_date);
      payload.append('status', 'Chưa hoàn thành');

      if (form.priority) payload.append('priority', form.priority);
      if (form.shift) payload.append('shift', form.shift);
      if (form.type) payload.append('type', form.type);
      if (form.supervisor) payload.append('supervisor', form.supervisor);
      if (form.detail) payload.append('detail', form.detail);
      if (form.file_link) payload.append('file_link', form.file_link);

      const normalizedProgress =
        form.progress === '' || form.progress === null
          ? null
          : Math.max(0, Math.min(100, Number(form.progress)));
      if (normalizedProgress !== null && !Number.isNaN(normalizedProgress)) {
        payload.append('progress', String(normalizedProgress));
      }

      if (form.assigned_by) {
        payload.append('assigned_by', String(form.assigned_by));
      }

      if (userIds.length) {
        payload.append('user_id', String(userIds[0]));
        userIds.forEach(id => payload.append('user_ids[]', String(id)));
      }

      attachments.forEach(file => payload.append('attachments[]', file));

      const res = await fetch('/management/tasks', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrf,
        },
        body: payload,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error:', errorText);
        throw new Error('Lỗi khi thêm công việc');
      }

      const task = await res.json();
      onSuccess?.(task);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setForm({
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
        user_ids: [],
        assigned_by: '',
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể thêm công việc', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
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

        {/* Người phụ trách (merge supervisors + users, có avatar) */}
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
            <Form.Select name="priority" value={form.priority} onChange={handleChange} required>
              <option value="">-- Chọn --</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
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

        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Đính kèm tệp (Word/PDF/Excel...)</Form.Label>
            <Form.Control
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              onChange={handleAttachmentChange}
              ref={fileInputRef}
            />
            <small className="text-muted d-block mt-2">Mỗi tệp tối đa 10MB.</small>
            {attachments.length > 0 && (
              <ul className="attachment-list mt-2">
                {attachments.map((file, idx) => (
                  <li key={`${file.name}-${idx}`} className="attachment-list__item d-flex justify-content-between align-items-center">
                    <span>{file.name}</span>
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => removeAttachment(idx)}
                    >
                      Gỡ
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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

        {/* ✅ MỚI: Người dùng (assignee) – dùng AsyncDropdownSelect với users */}
        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người nhận</Form.Label>
            <AsyncDropdownSelect
              name="user_ids"
              label=""
              api="/api/users"
              field="name"
              valueKey="id"
              labelKey="name"
              multiple
              value={form.user_ids}
              onChange={(values) => setForm(prev => ({ ...prev, user_ids: values }))}
              creatable={false}
            />
          </Form.Group>
          <small className="text-muted">* Có thể chọn nhiều người nhận, hệ thống vẫn lưu người đầu tiên vào trường kế thừa.</small>
        </Col>

        {/* Người giao */}
        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người giao</Form.Label>
            <AsyncDropdownSelect
              name="assigned_by"
              label=""
              api="/api/users"
              field="name"
              valueKey="id"     // ✅ giá trị submit = id
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
          {submitting ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </Form>
  );
}
