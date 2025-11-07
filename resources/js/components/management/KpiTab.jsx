// resources/js/components/management/KpiTab.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function KpiTab() {
  const [kpis, setKpis] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", month: "", user_id: "" }); // month: 'YYYY-MM'
  const [editing, setEditing] = useState(null);

  const csrf = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || "Request failed");
    }
    return res.json();
  };

  const loadKpis = async () => {
    setLoading(true);
    try {
      const data = await fetchJson("/management/kpis/data");
      const list = Array.isArray(data) ? data : Array.isArray(data?.kpis) ? data.kpis : [];
      setKpis(list);
    } catch {
      Swal.fire("Lỗi", "Không tải được danh sách KPI", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchJson("/api/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // không chặn UI nếu load users lỗi
    }
  };

  useEffect(() => {
    loadKpis();
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm({ name: "", month: "", user_id: "" });
    setEditing(null);
  };

  const validateForm = () => {
    if (!form.name?.trim()) {
      Swal.fire("Thiếu thông tin", "Vui lòng nhập tên KPI", "warning");
      return false;
    }
    if (!/^\d{4}-\d{2}$/.test(form.month || "")) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn tháng (YYYY-MM)", "warning");
      return false;
    }
    // user_id là tùy chọn vì backend store cho phép null -> mặc định auth()->id()
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const method = editing ? "PUT" : "POST";
    const url = editing ? `/management/kpis/${editing.id}` : "/management/kpis";

    // nếu đang sửa, không gửi user_id vì backend update không nhận
    const payload = editing
      ? { name: form.name, month: form.month, note: undefined }
      : { name: form.name, month: form.month, user_id: form.user_id || undefined };

    try {
      const kpi = await fetchJson(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrf,
        },
        body: JSON.stringify(payload),
      });

      if (editing) {
        setKpis((prev) => prev.map((k) => (k.id === kpi.id ? kpi : k)));
        Swal.fire("Thành công", "Đã cập nhật KPI", "success");
      } else {
        setKpis((prev) => [kpi, ...prev]);
        Swal.fire("Thành công", "Đã tạo KPI", "success");
      }
      resetForm();
    } catch {
      Swal.fire("Lỗi", "Không thể lưu KPI", "error");
    }
  };

  const handleEdit = (kpi) => {
    const month = (kpi.start_date || "").slice(0, 7) || "";
    setForm({
      name: kpi.name || "",
      month,
      user_id: kpi.user_id || "",
    });
    setEditing(kpi);
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Bạn có chắc chắn muốn xóa KPI này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
    });
    if (!confirm.isConfirmed) return;

    try {
      await fetchJson(`/management/kpis/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-TOKEN": csrf },
      });
      setKpis((prev) => prev.filter((k) => k.id !== id));
      Swal.fire("Thành công", "Đã xóa KPI", "success");
    } catch {
      Swal.fire("Lỗi", "Không thể xóa KPI", "error");
    }
  };

  const getUserName = (id) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name : (id ? `#${id}` : "—");
  };

  return (
    <div className="p-3">
      <h3>Quản lý KPI</h3>

      {/* Form thêm/sửa */}
      <div className="card p-3 mb-4">
        <div className="row g-2">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Tên KPI"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="col-md-3">
            <input
              type="month"
              className="form-control"
              placeholder="Tháng (YYYY-MM)"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            />
          </div>

          <div className="col-md-3">
            <select
              className="form-select"
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              disabled={!!editing} // không đổi user khi sửa vì backend update không nhận user_id
            >
              <option value="">— Chọn người dùng (tuỳ chọn) —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 d-flex align-items-stretch">
            <button className="btn btn-primary w-100" onClick={handleSave}>
              {editing ? "Cập nhật" : "Thêm"}
            </button>
          </div>

          {editing && (
            <div className="col-md-2 d-flex align-items-stretch">
              <button className="btn btn-secondary w-100" onClick={resetForm}>
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bảng KPI */}
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th style={{ width: 120 }}>Tháng</th>
              <th>Tên KPI</th>
              <th style={{ width: 220 }}>Người dùng</th>
              <th style={{ width: 140 }}>Mục tiêu</th>
              <th style={{ width: 140 }}>Tiến độ</th>
              <th style={{ width: 160 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  Đang tải...
                </td>
              </tr>
            ) : Array.isArray(kpis) && kpis.length > 0 ? (
              kpis.map((k, i) => (
                <tr key={k.id}>
                  <td>{i + 1}</td>
                  <td>{(k.start_date || "").slice(0, 7)}</td>
                  <td>{k.name}</td>
                  <td>{getUserName(k.user_id)}</td>
                  <td>{k.target ?? 0}</td>
                  <td>{Number(k.progress ?? 0)}%</td>
                  <td>
                    <button
                      className="btn btn-warning btn-sm me-2"
                      onClick={() => handleEdit(k)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(k.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  Không có KPI nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
