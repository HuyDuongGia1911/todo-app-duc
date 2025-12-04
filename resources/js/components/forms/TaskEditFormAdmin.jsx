import React, { useEffect, useRef, useState } from "react";
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
  const [existingFiles, setExistingFiles] = useState(task.files || []);
  const [newFiles, setNewFiles] = useState([]);
  const [removeFileIds, setRemoveFileIds] = useState([]);

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

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
    setExistingFiles(task.files || []);
    setNewFiles([]);
    setRemoveFileIds([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

      const payload = new FormData();
      payload.append("_method", "PUT");
      payload.append("title", form.title);
      payload.append("task_date", form.task_date);
      payload.append("deadline_at", form.deadline_at || form.task_date);
      payload.append("status", form.status || "Chưa hoàn thành");

      if (form.shift) payload.append("shift", form.shift);
      if (form.type) payload.append("type", form.type);
      if (form.supervisor) payload.append("supervisor", form.supervisor);
      if (form.priority) payload.append("priority", form.priority);
      if (form.detail) payload.append("detail", form.detail);
      if (form.file_link) payload.append("file_link", form.file_link);

      const normalizedProgress =
        form.progress === "" || form.progress === null
          ? null
          : Math.max(0, Math.min(100, Number(form.progress)));
      if (normalizedProgress !== null && !Number.isNaN(normalizedProgress)) {
        payload.append("progress", String(normalizedProgress));
      }

      if (form.assigned_by) {
        payload.append("assigned_by", String(form.assigned_by));
      }

      if (userIds.length) {
        payload.append("user_id", String(userIds[0]));
        userIds.forEach((id) => payload.append("user_ids[]", String(id)));
      } else {
        payload.append("user_id", "");
      }

      newFiles.forEach((file) => payload.append("attachments[]", file));
      removeFileIds.forEach((id) => payload.append("remove_attachment_ids[]", id));

      const res = await fetch(`/management/tasks/${task.id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf,
        },
        body: payload,
      });

      if (!res.ok) throw new Error("Lỗi cập nhật");

      const data = await res.json();
      Swal.fire("Thành công", "Đã cập nhật công việc", "success");
      onSuccess?.(data);
      setEditMode(false);
      setExistingFiles(data.files || []);
      setNewFiles([]);
      setRemoveFileIds([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Lỗi", "Không thể cập nhật công việc", "error");
    }
  };

  const disable = !editMode;

  const toggleRemoveFile = (fileId) => {
    setRemoveFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

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
            <Form.Label className="label-inside">Tệp đính kèm</Form.Label>
            {existingFiles.length === 0 ? (
              <p className="text-muted mb-2">Chưa có tệp nào.</p>
            ) : (
              <ul className="attachment-list mb-2">
                {existingFiles.map((file) => {
                  const marked = removeFileIds.includes(file.id);
                  return (
                    <li
                      key={file.id}
                      className={`attachment-list__item d-flex justify-content-between align-items-center ${marked ? 'attachment-list__item--remove' : ''}`}
                    >
                      <div>
                        <a href={file.url} target="_blank" rel="noreferrer" className="me-2">
                          {file.original_name}
                        </a>
                        <small className="text-muted">{formatFileSize(file.size)}</small>
                      </div>
                      {editMode && (
                        <Button variant="link" size="sm" type="button" onClick={() => toggleRemoveFile(file.id)}>
                          {marked ? 'Bỏ xoá' : 'Xoá'}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <Form.Control
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => {
                setNewFiles(Array.from(e.target.files || []));
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={disable}
              ref={fileInputRef}
            />
            <small className="text-muted d-block mt-2">Mỗi tệp tối đa 10MB.</small>
            {newFiles.length > 0 && (
              <ul className="attachment-list mt-2">
                {newFiles.map((file, idx) => (
                  <li key={`${file.name}-${idx}`} className="attachment-list__item d-flex justify-content-between align-items-center">
                    <span>{file.name}</span>
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Gỡ
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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
