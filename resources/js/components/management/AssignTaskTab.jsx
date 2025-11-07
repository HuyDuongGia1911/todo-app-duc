import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AsyncDropdownSelect from "../AsyncDropdownSelect";

export default function AssignTaskTab() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ user_id: "", start: "", end: "" });
  const [mineOnly, setMineOnly] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    user_id: "",
    task_date: "",
    shift: "",
    type: "",
    title: "",
    supervisor: "",
    priority: "",
    progress: 0,
    detail: "",
    file_link: "",
    status: "Chưa hoàn thành",
  });

  const csrf =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ||
    "";

  // ---------- helpers ----------
  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      user_id: "",
      task_date: "",
      shift: "",
      type: "",
      title: "",
      supervisor: "",
      priority: "",
      progress: 0,
      detail: "",
      file_link: "",
      status: "Chưa hoàn thành",
    });
  };

  // ---------- load users ----------
  useEffect(() => {
    fetch("/api/users", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() =>
        Swal.fire("Lỗi", "Không tải được danh sách người dùng", "error")
      );
  }, []);

  // ---------- fetch tasks (lọc) ----------
  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.start) params.append("start", filters.start);
      if (filters.end) params.append("end", filters.end);
      if (mineOnly) params.append("mine", "1");

      const res = await fetch(`/management/assign/tasks?${params.toString()}`, {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      Swal.fire("Lỗi", "Không tải được danh sách công việc", "error");
    }
  };

  // ---------- create / update ----------
  const handleSave = async () => {
    if (!form.user_id) {
      Swal.fire("Thiếu dữ liệu", "Vui lòng chọn người nhận", "warning");
      return;
    }
    if (!form.task_date) {
      Swal.fire("Thiếu dữ liệu", "Vui lòng chọn ngày", "warning");
      return;
    }
    if (!form.title) {
      Swal.fire("Thiếu dữ liệu", "Vui lòng nhập tên task", "warning");
      return;
    }

    // payload FE: đặt mặc định priority & chuẩn hóa progress số
    const payload = {
      ...form,
      priority:
        form.priority && String(form.priority).trim() !== ""
          ? form.priority
          : "Trung bình",
      progress: Number(form.progress || 0),
    };

    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `/management/assign/tasks/${editing.id}`
      : "/management/assign/tasks";

    try {
      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": csrf,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("SERVER ERROR:", t);
        throw new Error();
      }

      const saved = await res.json();
      if (editing) {
        setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
        Swal.fire("Thành công", "Đã cập nhật công việc!", "success");
      } else {
        setTasks((prev) => [saved, ...prev]);
        Swal.fire("Thành công", "Đã giao công việc!", "success");
      }

      resetForm();
    } catch {
      Swal.fire("Lỗi", "Không thể lưu công việc", "error");
    }
  };

  const handleEdit = (task) => {
    setEditing(task);
    setForm({
      user_id: task.user_id || "",
      task_date: task.task_date || "",
      shift: task.shift || "",
      type: task.type || "",
      title: task.title || "",
      supervisor: task.supervisor || "",
      priority: task.priority || "",
      progress: task.progress || 0,
      detail: task.detail || "",
      file_link: task.file_link || "",
      status: task.status || "Chưa hoàn thành",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Bạn chắc chắn muốn xoá công việc này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/management/assign/tasks/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": csrf,
        },
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => prev.filter((t) => t.id !== id));
      Swal.fire("Đã xoá", "Công việc đã được xoá!", "success");
    } catch {
      Swal.fire("Lỗi", "Không thể xoá công việc", "error");
    }
  };

  return (
    <div className="p-3">
      <h3 className="mb-3">Giao việc cho người dùng</h3>

      {/* Form giao / sửa */}
      <div className="card p-3 mb-4">
        <h5 className="mb-3">
          {editing ? "Cập nhật công việc" : "Giao việc mới"}
        </h5>

        <div className="row g-2">
          {/* Người nhận */}
          <div className="col-md-4">
            <label className="form-label">Người nhận</label>
            <select
              className="form-select"
              name="user_id"
              value={form.user_id}
              onChange={onFieldChange}
            >
              <option value="">-- Chọn user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Ngày */}
          <div className="col-md-3">
            <label className="form-label">Ngày</label>
            <input
              type="date"
              className="form-control"
              name="task_date"
              value={form.task_date || ""}
              onChange={onFieldChange}
            />
          </div>

          {/* Ca */}
          <div className="col-md-5">
            <AsyncDropdownSelect
              label="Ca"
              name="shift"
              field="shift_name"
              api="/api/shifts"
              value={form.shift}
              onChange={onFieldChange}
              creatable
            />
          </div>

          {/* Loại */}
          <div className="col-md-6">
            <AsyncDropdownSelect
              label="Loại"
              name="type"
              field="type_name"
              api="/api/types"
              value={form.type}
              onChange={onFieldChange}
              creatable
            />
          </div>

          {/* Tên task */}
          <div className="col-md-6">
            <AsyncDropdownSelect
              label="Tên task"
              name="title"
              field="title_name"
              api="/api/titles"
              value={form.title}
              onChange={onFieldChange}
              creatable
            />
          </div>

          {/* Người phụ trách */}
          <div className="col-md-6">
            <AsyncDropdownSelect
              label="Người phụ trách"
              name="supervisor"
              field="supervisor_name"
              api="/api/supervisors"
              value={form.supervisor}
              onChange={onFieldChange}
              creatable
            />
          </div>

          {/* Trạng thái */}
          <div className="col-md-6">
            <AsyncDropdownSelect
              label="Trạng thái"
              name="status"
              field="status_name"
              api="/api/statuses"
              value={form.status}
              onChange={onFieldChange}
              creatable
            />
          </div>

          {/* Ưu tiên */}
          <div className="col-md-4">
            <label className="form-label">Ưu tiên</label>
            <select
              name="priority"
              className="form-select"
              value={form.priority || ""}
              onChange={onFieldChange}
            >
              <option value="">-- Chọn --</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>
          </div>

          {/* Tiến độ */}
          <div className="col-md-2">
            <label className="form-label">Mục tiêu</label>
            <input
              type="number"
              className="form-control"
              name="progress"
              value={form.progress || 0}
              onChange={onFieldChange}
            />
          </div>

          {/* File link */}
          <div className="col-md-6">
            <label className="form-label">File link (phân tách bằng ,)</label>
            <input
              type="text"
              className="form-control"
              name="file_link"
              value={form.file_link || ""}
              onChange={onFieldChange}
            />
          </div>

          {/* Chi tiết */}
          <div className="col-12">
            <label className="form-label">Chi tiết</label>
            <textarea
              className="form-control"
              rows={2}
              name="detail"
              value={form.detail || ""}
              onChange={onFieldChange}
            />
          </div>

          <div className="col-12 d-flex gap-2 mt-2">
            <button className="btn btn-primary" onClick={handleSave}>
              {editing ? "Cập nhật" : "Giao việc"}
            </button>
            {editing && (
              <button className="btn btn-secondary" onClick={resetForm}>
                Huỷ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="card p-3 mb-4">
        <h5 className="mb-3">Bộ lọc</h5>
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label">User</label>
            <select
              className="form-select"
              value={filters.user_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, user_id: e.target.value }))
              }
            >
              <option value="">-- Chọn user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label">Từ ngày</label>
            <input
              type="date"
              className="form-control"
              value={filters.start}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Đến ngày</label>
            <input
              type="date"
              className="form-control"
              value={filters.end}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>

          <div className="col-md-3 d-flex align-items-end">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="mineOnly"
                checked={mineOnly}
                onChange={(e) => setMineOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="mineOnly">
                Chỉ xem việc tôi giao
              </label>
            </div>
          </div>

          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-outline-primary w-100" onClick={fetchTasks}>
              Lọc
            </button>
          </div>
        </div>
      </div>

      {/* Bảng task */}
      <div className="card p-3">
        <h5 className="mb-3">Danh sách công việc</h5>

        <table className="table table-bordered table-sm align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Người nhận</th>
              <th>Người giao</th>
              <th>Ngày</th>
              <th>Ca</th>
              <th>Loại</th>
              <th>Tên task</th>
              <th>Người phụ trách</th>
              <th>Ưu tiên</th>
              <th>Tiến độ</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center text-muted">
                  Không có công việc
                </td>
              </tr>
            ) : (
              tasks.map((t, i) => {
                const receiver =
                  t.user ?? users.find((u) => u.id === t.user_id);
                return (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <td>
                      {receiver
                        ? `${receiver.name} (${receiver.email})`
                        : t.user_id}
                    </td>
                    <td>{t.assigned_by_user?.name || t.assigned_by || "-"}</td>
                    <td>{t.task_date}</td>
                    <td>{t.shift}</td>
                    <td>{t.type}</td>
                    <td>{t.title}</td>
                    <td>{t.supervisor}</td>
                    <td>{t.priority}</td>
                    <td>{t.progress}%</td>
                    <td>{t.status}</td>
                    <td>
                      <button
                        className="btn btn-warning btn-sm me-1"
                        onClick={() => handleEdit(t)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(t.id)}
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
