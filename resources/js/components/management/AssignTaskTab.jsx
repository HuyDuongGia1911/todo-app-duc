import React, { useEffect, useMemo, useState } from "react";
import { Button, Badge, Form, Table, Row, Col } from "react-bootstrap";
import Select from "react-select";
import Swal from "sweetalert2";
import AsyncDropdownSelect from "../AsyncDropdownSelect"

const PRIORITY_OPTIONS = ["Khẩn cấp", "Cao", "Trung bình", "Thấp"];
const STATUS_OPTIONS = ["Chưa hoàn thành", "Đã hoàn thành"];

export default function AssignTaskTab() {
  // ================== state ==================
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    user_ids: [],        // ✅ nhiều người
    task_date: "",
    deadline_at: "",
    shift: "",
    type: "",
    title: "",
    supervisor: "",
    priority: "",
    progress: "",
    detail: "",
    file_link: "",
    status: "Chưa hoàn thành",
    newUserName: "",     // ✅ tạo user nhanh
  });

  const [filters, setFilters] = useState({
    user_id: null,
    start: "",
    end: "",
  });

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // ================== init load ==================
  useEffect(() => {
    (async () => {
      try {
        const [tRes, uRes] = await Promise.all([
          fetch("/management/assign/tasks", { headers: { Accept: "application/json" } }),
          fetch("/api/users"),
        ]);
        const [tData, uData] = await Promise.all([tRes.json(), uRes.json()]);
        setTasks(Array.isArray(tData) ? tData : []);
        setUsers(Array.isArray(uData) ? uData : []);
      } catch (e) {
        Swal.fire("Lỗi", "Không tải được dữ liệu", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ================== helpers ==================
  const userOptions = users.map(u => ({ value: u.id, label: u.name }));
  const toDate = (s) => s ? new Date(s) : null;
  const formatVN = (s) => {
    const d = toDate(s);
    return d ? d.toLocaleDateString('vi-VN') : "-";
  };
  const priorityColor = (p) => ({
    "Khẩn cấp": "danger",
    "Cao": "warning",
    "Trung bình": "primary",
    "Thấp": "secondary"
  }[p] || "light");

  // ================== actions ==========================
  // do ansssssssssssssss
  const reload = async () => {
    const qs = new URLSearchParams();
    if (filters.user_id) qs.set("user_id", String(filters.user_id));
    if (filters.start) qs.set("start", filters.start);
    if (filters.end) qs.set("end", filters.end);

    const res = await fetch("/management/assign/tasks?" + qs.toString(), { headers: { Accept: "application/json" } });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  };

  const handleCreateUser = async () => {
    const name = form.newUserName.trim();
    if (!name) return Swal.fire("Thiếu tên", "Nhập tên người dùng mới", "warning");

    try {
      const res = await fetch("/management/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrf,
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email: name.replace(/\s+/g, '').toLowerCase() + "@example.com",
          password: "123456", // nên dùng password hợp lệ
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Server error:", errText);
        throw new Error("Tạo user thất bại");
      }

      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setForm((prev) => ({
        ...prev,
        newUserName: "",
        user_ids: [...prev.user_ids, newUser.id],
      }));
      Swal.fire("Thành công", "Đã tạo user mới", "success");
    } catch (e) {
      Swal.fire("Lỗi", "Không thể tạo user, xem console để biết thêm chi tiết", "error");
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return Swal.fire("Thiếu", "Vui lòng nhập Tên task", "warning");
    if (!form.task_date) return Swal.fire("Thiếu", "Vui lòng chọn Ngày", "warning");
    if (!form.user_ids.length) return Swal.fire("Thiếu", "Vui lòng chọn ít nhất 1 người nhận", "warning");

    const payload = {
      ...form,
      progress: form.progress === "" ? null : Math.max(0, Math.min(100, Number(form.progress))),
      deadline_at: form.deadline_at || form.task_date,
    };

    try {
      const res = await fetch("/management/assign/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf, Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Lỗi khi tạo task");
      }
      const created = await res.json();
      setTasks(prev => [created, ...prev]);
      // reset form (trừ ngày/ưu tiên nếu muốn)
      setForm(prev => ({
        ...prev,
        title: "",
        shift: "",
        type: "",
        supervisor: "",
        detail: "",
        file_link: "",
        priority: "",
        progress: "",
        user_ids: [],
        newUserName: "",
      }));
      Swal.fire("Thành công", "Đã giao việc", "success");
    } catch (e) {
      Swal.fire("Lỗi", "Không thể giao việc", "error");
    }
  };

  const handleDelete = async (taskId) => {
    const ok = await Swal.fire({ title: "Xoá task?", icon: "warning", showCancelButton: true });
    if (!ok.isConfirmed) return;
    try {
      const res = await fetch(`/management/assign/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "X-CSRF-TOKEN": csrf, Accept: "application/json" },
      });
      if (!res.ok) throw new Error();
      setTasks(prev => prev.filter(t => t.id !== taskId));
      Swal.fire("Đã xoá", "", "success");
    } catch {
      Swal.fire("Lỗi", "Không thể xoá task", "error");
    }
  };

  // ================== UI ==================
  if (loading) return <div className="p-3">Đang tải…</div>;

  return (
    <div className="p-3">
      <h2 className="fw-bold mb-3">Giao việc cho người dùng</h2>

      {/* FORM GIAO VIỆC MỚI */}
      <div className="card p-3 mb-4">
        <h5 className="mb-3">Giao việc mới</h5>

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            {/* Người nhận (multi) */}
            <Col md={12}>
              <Form.Label>Người nhận</Form.Label>
              <Select
                isMulti
                options={userOptions}
                value={userOptions.filter(opt => form.user_ids.includes(opt.value))}
                onChange={(opts) => setForm(prev => ({ ...prev, user_ids: (opts || []).map(o => o.value) }))}
                placeholder="-- Chọn user --"
                classNamePrefix="react-select"
              />
              <div className="d-flex gap-2 mt-2">
                <Form.Control
                  type="text"
                  placeholder="Tên user mới"
                  value={form.newUserName}
                  onChange={e => setForm(prev => ({ ...prev, newUserName: e.target.value }))}
                />
                <Button variant="outline-primary" onClick={handleCreateUser}>+ Tạo</Button>
              </div>
            </Col>

            <Col md={6}>
              <Form.Label>Ngày</Form.Label>
              <Form.Control type="date" value={form.task_date}
                onChange={e => setForm(prev => ({ ...prev, task_date: e.target.value }))} />
            </Col>
            <Col md={6}>
              <Form.Label>Deadline</Form.Label>
              <Form.Control
                type="date"
                value={form.deadline_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deadline_at: e.target.value }))
                }
              />
            </Col>

            <Col md={6}>
              <Form.Label>Ca</Form.Label>
              <AsyncDropdownSelect
                name="shift"
                label=""
                api="/api/shifts"
                field="shift_name"
                value={form.shift}
                onChange={(e) => {
                  const val = e?.target?.value || e;
                  setForm((prev) => ({ ...prev, shift: val }));
                }}
                creatable
              />
            </Col>


            <Col md={6}>
              <Form.Label>Loại</Form.Label>
              <AsyncDropdownSelect
                name="type"
                label=""
                api="/api/types"
                field="type_name"
                value={form.type}
                onChange={(e) => {
                  const val = e?.target?.value || e;
                  setForm((prev) => ({ ...prev, type: val }));
                }}
                creatable
              />
            </Col>


            <Col md={6}>
              <Form.Label>Tên task</Form.Label>
              <AsyncDropdownSelect
                name="title"
                label=""
                api="/api/titles"            // ✅ API backend
                field="title_name"           // ✅ cột trong DB titles
                value={form.title}
                onChange={(e) => {
                  const val = e?.target?.value || e;
                  setForm(prev => ({ ...prev, title: val }));
                }}
                creatable                    // ✅ cho phép nhập mới
              />
            </Col>

            <Col md={6}>
              <Form.Label>Người phụ trách</Form.Label>
              <AsyncDropdownSelect
                name="supervisor"
                label=""
                api="/api/supervisors"       // ✅ API backend
                field="supervisor_name"
                value={form.supervisor}
                onChange={(e) => {
                  const val = e?.target?.value || e;
                  setForm(prev => ({ ...prev, supervisor: val }));
                }}
                creatable
              />
            </Col>


            <Col md={6}>
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Col>

            <Col md={6}>
              <Form.Label>Ưu tiên</Form.Label>
              <Form.Select value={form.priority}
                onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                <option value="">-- Chọn --</option>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </Col>

            <Col md={6}>
              <Form.Label>Mục tiêu </Form.Label>
              <Form.Control type="number" min={0} max={100} placeholder="0 - 100"
                value={form.progress}
                onChange={e => setForm(prev => ({ ...prev, progress: e.target.value }))} />
            </Col>

            <Col md={6}>
              <Form.Label>File link (phân tách bằng ,)</Form.Label>
              <Form.Control placeholder="https://..., https://..."
                value={form.file_link}
                onChange={e => setForm(prev => ({ ...prev, file_link: e.target.value }))} />
            </Col>

            <Col md={12}>
              <Form.Label>Chi tiết</Form.Label>
              <Form.Control as="textarea" rows={3}
                value={form.detail}
                onChange={e => setForm(prev => ({ ...prev, detail: e.target.value }))} />
            </Col>
          </Row>

          <div className="mt-3">
            <Button type="submit">Giao việc</Button>
          </div>
        </Form>
      </div>

      {/* BỘ LỌC */}
      <div className="card p-3 mb-3">
        <Row className="g-2">
          <Col md={3}>
            <Select
              isClearable
              placeholder="Lọc theo người nhận"
              options={userOptions}
              value={userOptions.find(o => o.value === filters.user_id) || null}
              onChange={(opt) => setFilters(prev => ({ ...prev, user_id: opt?.value || null }))}
            />
          </Col>
          <Col md={3}>
            <Form.Control type="date" value={filters.start} onChange={e => setFilters(prev => ({ ...prev, start: e.target.value }))} />
          </Col>
          <Col md={3}>
            <Form.Control type="date" value={filters.end} onChange={e => setFilters(prev => ({ ...prev, end: e.target.value }))} />
          </Col>
          <Col md={3}>
            <Button variant="secondary" onClick={reload}>Lọc</Button>
          </Col>
        </Row>
      </div>

      {/* BẢNG DANH SÁCH */}
      <div className="card p-3">
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light text-center">
              <tr>
                <th>Ngày</th>
                <th>Deadline</th>
                <th>Task</th>
                <th>Người nhận</th>

                <th>Người giao</th>
                <th>Người phụ trách</th>
                <th>Ưu tiên</th>
                <th>Tiến độ</th>
                <th>Mục tiêu</th>
                <th>Trạng thái</th>
                <th>HĐ</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    Không có công việc
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const assignedBy = t.assigned_by_user?.name || "—";
                  const supervisor = t.supervisor || "—";
                  const usersArray = Array.isArray(t.users) ? t.users : [];
                  const doneCount = t.done_count ?? usersArray.filter((u) => u.pivot?.status === "Đã hoàn thành").length;
                  const totalCount = usersArray.length || 1;

                  return (
                    <tr key={t.id} className={t.status === "Đã hoàn thành" ? "task-done-row" : ""}>
                      <td className="text-center">{formatVN(t.task_date)}</td>
                      <td className="text-center">{formatVN(t.deadline_at || t.task_date)}</td>
                      <td className="fw-bold text-primary text-center">{t.title}</td>

                      {/* Người nhận */}
                      <td className="text-center">
                        {usersArray.length > 0 ? (
                          <div className="d-flex flex-column align-items-center">
                            {usersArray.map((u, idx) => {
                              const matched = users.find((x) => x.id === u.id);
                              const avatarUrl = matched?.avatar
                                ? (matched.avatar.startsWith("http") ? matched.avatar : `/storage/${matched.avatar}`)
                                : "https://www.w3schools.com/howto/img_avatar.png";
                              return (
                                <div key={idx} className="d-flex align-items-center gap-1 mb-1">
                                  <img
                                    src={avatarUrl}
                                    alt="avatar"
                                    width="24"
                                    height="24"
                                    className="rounded-circle shadow-sm"
                                  />
                                  <span className="text-truncate">{matched?.name || u.name || "-"}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-muted">—</div>
                        )}
                      </td>

                      {/* Người giao */}
                      {/* Người giao */}
                      <td className="text-center">
                        {(() => {
                          const assigner = users.find(u => u.name === t.assigned_by_user?.name);
                          const avatarUrl = assigner?.avatar
                            ? (assigner.avatar.startsWith("http") ? assigner.avatar : `/storage/${assigner.avatar}`)
                            : "https://www.w3schools.com/howto/img_avatar.png";
                          return (
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <img
                                src={avatarUrl}
                                alt="avatar"
                                width="28"
                                height="28"
                                className="rounded-circle shadow-sm"
                              />
                              <span className="text-truncate">{assigner?.name || t.assigned_by_user?.name || "—"}</span>
                            </div>
                          );
                        })()}
                      </td>


                      {/* Người phụ trách */}
                      {/* Người phụ trách */}
                      <td className="text-center">
                        {(() => {
                          const sup = users.find(u => u.name === t.supervisor);
                          const avatarUrl = sup?.avatar
                            ? (sup.avatar.startsWith("http") ? sup.avatar : `/storage/${sup.avatar}`)
                            : "https://www.w3schools.com/howto/img_avatar.png";
                          return (
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <img
                                src={avatarUrl}
                                alt="avatar"
                                width="28"
                                height="28"
                                className="rounded-circle shadow-sm"
                              />
                              <span className="text-truncate">{sup?.name || t.supervisor || "—"}</span>
                            </div>
                          );
                        })()}
                      </td>


                      {/* Ưu tiên */}
                      <td className="text-center">
                        <Badge bg={priorityColor(t.priority)}>{t.priority || "-"}</Badge>
                      </td>

                      {/* Tiến độ (dạng x/y) */}
                      <td className="text-center" title={`Hoàn thành: ${doneCount}/${totalCount}`}>
                        {doneCount}/{totalCount}
                      </td>

                      {/* Mục tiêu */}
                      <td className="text-center">{t.progress ?? 0}</td>

                      {/* Trạng thái */}
                      <td className="text-center">{t.status}</td>

                      {/* Hành động */}
                      <td className="text-center">
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(t.id)}>
                          Xoá
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </Table>
        </div>
      </div>
    </div>
  );
}
