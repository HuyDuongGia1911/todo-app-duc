import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [editing, setEditing] = useState(null);
  const csrf = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");

  // Load users
  useEffect(() => {
    fetch("/management/users", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then(setUsers)
      .catch(() => Swal.fire("Lỗi", "Không tải được danh sách user", "error"));
  }, []);

  const resetForm = () => {
    setForm({ name: "", email: "", password: "" });
    setEditing(null);
  };

  // Save user
  const handleSave = async () => {
  const isEdit = !!editing;
  const url = isEdit ? `/management/users/${editing.id}` : "/management/users";
  const payload = { ...form };

  // Nếu edit, dùng POST + _method=PUT
  const method = isEdit ? "POST" : "POST";
  if (isEdit) payload._method = "PUT";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error();
    const user = await res.json();

    if (isEdit) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      Swal.fire("Thành công", "Đã cập nhật người dùng", "success");
    } else {
      setUsers((prev) => [user, ...prev]);
      Swal.fire("Thành công", "Đã thêm người dùng", "success");
    }

    resetForm();
  } catch {
    Swal.fire("Lỗi", "Không thể lưu người dùng", "error");
  }
};


  // Edit user
  const handleEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: "" });
    setEditing(user);
  };

  // Delete user
  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Bạn có chắc chắn muốn xóa?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/management/users/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-TOKEN": csrf },
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== id));
      Swal.fire("Thành công", "Đã xóa người dùng", "success");
    } catch {
      Swal.fire("Lỗi", "Không thể xóa người dùng", "error");
    }
  };

  return (
    <div className="p-3">
      <h3>Quản lý người dùng</h3>

      {/* Form */}
      <div className="card p-3 mb-4">
        <div className="row g-2">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Tên"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <input
              type="email"
              className="form-control"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <input
              type="password"
              className="form-control"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={handleSave}>
              {editing ? "Cập nhật" : "Thêm"}
            </button>
            {editing && (
              <button
                className="btn btn-secondary mt-2 w-100"
                onClick={resetForm}
              >
                Hủy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên</th>
            <th>Email</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id}>
              <td>{i + 1}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => handleEdit(u)}
                >
                  Sửa
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(u.id)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
