import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import AsyncDropdownSelect from "../AsyncDropdownSelect";
import Swal from "sweetalert2";

const initialFormState = {
  title: "",
  task_date: "",
  deadline_at: "",
  shift: "",
  type: "",
  supervisor: "",
  priority: "",
  detail: "",
  file_link: "",
  progress: "",
  status: "",
  assigned_by: "",
  user_ids: [],
};

const normalizeUserIds = (task) => {
  if (!task) return [];
  if (Array.isArray(task.users) && task.users.length) {
    return task.users
      .map((u) => (u?.id != null ? String(u.id) : null))
      .filter(Boolean);
  }
  if (task.user_id) {
    return [String(task.user_id)];
  }
  return [];
};

export default function TaskEditFormAdmin({ task, onSuccess, onCancel }) {
  if (!task) return null;

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title || "",
      task_date: task.task_date || "",
      deadline_at: task.deadline_at || "",
      shift: task.shift || "",
      type: task.type || "",
      supervisor: task.supervisor || "",
      priority: task.priority || "",
      detail: task.detail || "",
      file_link: task.file_link || "",
      progress: task.progress ?? "",
      status: task.status || "Chưa hoàn thành",
      assigned_by: task.assigned_by_user?.id
        ? String(task.assigned_by_user.id)
        : task.assigned_by
          ? String(task.assigned_by)
          : "",
      user_ids: normalizeUserIds(task),
    });
    setEditMode(false);
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userIds = (form.user_ids || [])
        .map((value) => Number(value))
        .filter((id) => !Number.isNaN(id));

      const payload = {
        title: form.title,
        task_date: form.task_date,
        deadline_at: form.deadline_at || form.task_date,
        shift: form.shift || null,
        type: form.type || null,
        supervisor: form.supervisor || null,
        priority: form.priority || null,
        detail: form.detail || null,
        file_link: form.file_link || null,
        status: form.status || "Chưa hoàn thành",
        progress:
          form.progress === "" || form.progress === null
            ? null
            : Math.max(0, Math.min(100, Number(form.progress))),
        assigned_by: form.assigned_by ? Number(form.assigned_by) : null,
        user_ids: userIds,
        user_id: userIds[0] ?? null,
      };

      const res = await fetch(`/management/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Lỗi cập nhật");

      const data = await res.json();
      Swal.fire("Thành công", "Đã cập nhật công việc", "success");
      onSuccess?.(data);
      setEditMode(false);
    } catch (error) {
      console.error(error);
      Swal.fire("Lỗi", "Không thể cập nhật công việc", "error");
    }
  };

  const disable = !editMode;

  return (
    <Form onSubmit={handleSubmit}>
      <h4 className="mb-3">Chi tiết công việc</h4>

      <Row className="g-3">
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
              placeholder="Nhập hoặc chọn tiêu đề công việc"
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
              disabled={disable}
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
              disabled={disable}
            />
          </Form.Group>
        </Col>

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
              placeholder="Chọn hoặc nhập ca làm"
            />
          </Form.Group>
        </Col>

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
              placeholder="Chọn hoặc nhập loại công việc"
            />
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người nhận</Form.Label>
            <AsyncDropdownSelect
              name="user_ids"
              api="/api/users"
              field="name"
              valueKey="id"
              labelKey="name"
              multiple
              value={form.user_ids}
              onChange={(values) => setForm((prev) => ({ ...prev, user_ids: values }))}
              disabled={disable}
              placeholder="Chọn một hoặc nhiều người nhận"
            />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người giao</Form.Label>
            <AsyncDropdownSelect
              name="assigned_by"
              api="/api/users"
              field="name"
              valueKey="id"
              labelKey="name"
              value={form.assigned_by}
              onChange={handleChange}
              disabled={disable}
              placeholder="Chọn người giao"
            />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Người phụ trách</Form.Label>
            <AsyncDropdownSelect
              name="supervisor"
              api="/api/users"
              field="name"
              valueKey="name"
              labelKey="name"
              value={form.supervisor}
              onChange={handleChange}
              disabled={disable}
              placeholder="Chọn người phụ trách"
            />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Độ ưu tiên</Form.Label>
            <Form.Select name="priority" value={form.priority} onChange={handleChange} disabled={disable}>
              <option value="">-- Chọn độ ưu tiên --</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Trạng thái</Form.Label>
            <Form.Select name="status" value={form.status} onChange={handleChange} disabled={disable}>
              <option value="Chưa hoàn thành">Chưa hoàn thành</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Tiến độ (%)</Form.Label>
            <Form.Control
              type="number"
              name="progress"
              min={0}
              max={100}
              value={form.progress}
              onChange={handleChange}
              disabled={disable}
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
              disabled={disable}
            />
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Group className="input-wrapper">
            <Form.Label className="label-inside">Chi tiết</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="detail"
              value={form.detail}
              onChange={handleChange}
              disabled={disable}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-4">
        {!editMode ? (
          <>
            <Button variant="primary" onClick={() => setEditMode(true)}>
              Sửa công việc
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Đóng
            </Button>
          </>
        ) : (
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
