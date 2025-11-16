import React, { useEffect, useMemo, useState } from "react";
import { Button, Badge, Form, Table } from "react-bootstrap";
import { FaPlus, FaTrash } from "react-icons/fa";
import { BsPencil } from "react-icons/bs";
import Select, { SingleValue } from "react-select";
import { Sun, Sunrise, Moon } from "lucide-react";
import Swal from "sweetalert2";

import Modal from "../Modal";
import TaskAddFormAdmin from "../forms/TaskAddFormAdmin";
import TaskEditFormAdmin from "../forms/TaskEditFormAdmin";

type OptionType = { value: string; label: string };

interface AdminTask {
  id: number;
  title: string;
  task_date: string;
  deadline_at?: string | null;

  shift?: string | null;
  type?: string | null;
  supervisor?: string | null;
  priority?: string | null;
  progress?: number | null;
  detail?: string | null;
  file_link?: string | null;
  status: "Đã hoàn thành" | "Chưa hoàn thành";

  user?: { id?: number; name?: string } | null;
  assigned_by_user?: { id?: number; name?: string } | null;
}

interface UserLite {
  id: number;
  name: string;
  email?: string;
  avatar?: string | null;
}

export default function TasksTab() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"all" | "done" | "pending" | "overdue">("all");
  const [priorityFilter, setPriorityFilter] = useState<SingleValue<OptionType>>(null);
  const [userFilter, setUserFilter] = useState<SingleValue<OptionType>>(null);
  const [taskDateStart, setTaskDateStart] = useState("");
  const [taskDateEnd, setTaskDateEnd] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/management/tasks", { headers: { Accept: "application/json" } });
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch {
        Swal.fire("Lỗi", "Không tải được danh sách công việc", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => console.warn("Không tải được /api/users"));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, priorityFilter, taskDateStart, taskDateEnd, searchKeyword, userFilter]);

  const parseDate = (input?: string | null) => {
    if (!input) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (dateString?: string | null) => {
    const d = parseDate(dateString || undefined);
    if (!d) return "-";
    return d.toLocaleDateString("vi-VN");
  };

  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case "Khẩn cấp":
        return "danger";
      case "Cao":
        return "warning";
      case "Trung bình":
        return "primary";
      case "Thấp":
        return "secondary";
      default:
        return "light";
    }
  };

  const getCurrentDayInfo = () => {
    const today = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const weekday = days[today.getDay()];
    const date = today.toLocaleDateString("vi-VN");

    const hour = today.getHours();
    let session = "";
    let Icon: any = Sun;
    if (hour < 12) {
      session = "Sáng";
      Icon = Sunrise;
    } else if (hour < 18) {
      session = "Chiều";
      Icon = Sun;
    } else {
      session = "Tối";
      Icon = Moon;
    }
    return { weekday, date, session, Icon };
  };
  const { weekday, date, session, Icon } = getCurrentDayInfo();

  const fallbackAvatar = "https://www.w3schools.com/howto/img_avatar.png";

  const resolveUserByNameOrId = (raw?: { id?: number; name?: string } | null) => {
    if (!raw) return { name: "—", avatar: fallbackAvatar };
    if (raw.id) {
      const byId = users.find((u) => u.id === raw.id);
      if (byId)
        return {
          name: byId.name || raw.name || "—",
          avatar: byId.avatar ? (byId.avatar.startsWith("http") ? byId.avatar : `/storage/${byId.avatar}`) : fallbackAvatar,
        };
    }
    if (raw.name) {
      const byName = users.find((u) => u.name === raw.name);
      if (byName)
        return {
          name: byName.name,
          avatar: byName.avatar ? (byName.avatar.startsWith("http") ? byName.avatar : `/storage/${byName.avatar}`) : fallbackAvatar,
        };
      return { name: raw.name, avatar: fallbackAvatar };
    }
    return { name: "—", avatar: fallbackAvatar };
  };

  const resolveSupervisor = (name?: string | null) => {
    if (!name) return { name: "—", avatar: fallbackAvatar };
    const u = users.find((u) => u.name === name);
    return {
      name,
      avatar: u?.avatar ? (u.avatar.startsWith("http") ? u.avatar : `/storage/${u.avatar}`) : fallbackAvatar,
    };
  };

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((t) => {
      const deadline = parseDate(t.deadline_at || t.task_date);
      const taskDate = parseDate(t.task_date);

      const deadlineStartOfDay = deadline ? new Date(deadline.setHours(0, 0, 0, 0)) : null;
      const todayStartOfDay = new Date(today);

      if (tab === "done" && t.status !== "Đã hoàn thành") return false;

      if (tab === "pending") {
        const notOverdue =
          t.status === "Chưa hoàn thành" &&
          (!!deadlineStartOfDay ? deadlineStartOfDay >= todayStartOfDay : true);
        if (!notOverdue) return false;
      }

      if (tab === "overdue") {
        const isOverdue =
          t.status === "Chưa hoàn thành" &&
          !!deadlineStartOfDay &&
          deadlineStartOfDay < todayStartOfDay;
        if (!isOverdue) return false;
      }

      if (priorityFilter && (t.priority || "") !== priorityFilter.value) return false;

      if (taskDateStart) {
        const start = parseDate(taskDateStart);
        if (start && taskDate && taskDate < start) return false;
      }
      if (taskDateEnd) {
        const end = parseDate(taskDateEnd);
        if (end && taskDate && taskDate > end) return false;
      }

      if (searchKeyword && !t.title.toLowerCase().includes(searchKeyword.toLowerCase())) return false;

      return true;
    });
  }, [tasks, tab, priorityFilter, taskDateStart, taskDateEnd, searchKeyword]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
  const currentTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openEdit = (task: AdminTask) => {
    setEditingTaskId(task.id);
    setShowEditModal(true);
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Xác nhận xoá?",
      text: "Hành động này không thể hoàn tác!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/management/tasks/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-TOKEN": csrf, Accept: "application/json" },
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => prev.filter((t) => t.id !== id));
      Swal.fire("Thành công", "Đã xoá task", "success");
    } catch {
      Swal.fire("Lỗi", "Không thể xoá task", "error");
    }
  };

  const handleToggleStatus = async (task: AdminTask) => {
    const newStatus = task.status === "Đã hoàn thành" ? "Chưa hoàn thành" : "Đã hoàn thành";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      const res = await fetch(`/management/tasks/${task.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrf,
          Accept: "application/json",
        },
        body: JSON.stringify({ _method: "PUT", status: newStatus }),
      });
      if (!res.ok) throw new Error("Update status failed");
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
    }
  };

  if (loading) return <div className="p-3">Đang tải…</div>;

  return (
    <div className="p-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 w-100">
        <div className="d-flex flex-column">
          <h2 className="fw-bold mb-1">Danh sách công việc</h2>
          <div className="d-flex align-items-center text-muted">
            <Icon size={20} className="me-2" />
            <span className="fw-semibold">
              {session}, {weekday} {date}
            </span>
          </div>
        </div>

        <div className="d-flex gap-2">
          {/* ĐÃ BỎ NÚT EXPORT */}
          <Button
            variant="dark"
            className="d-flex align-items-center gap-2 rounded-3 py-2 px-3"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus />
            Thêm công việc
          </Button>
        </div>
      </div>

      <div className="card shadow-sm rounded-4 p-4 bg-white">
        {/* Tabs */}
        <div className="task-tabs d-flex gap-4 mb-4">
          {[
            { key: "all", label: "Tất cả", color: "dark", count: tasks.length },
            {
              key: "done",
              label: "Đã hoàn thành",
              color: "green",
              count: tasks.filter((t) => t.status === "Đã hoàn thành").length,
            },
            {
              key: "pending",
              label: "Chưa hoàn thành",
              color: "orange",
              count: tasks.filter((t) => {
                const d = parseDate(t.deadline_at || t.task_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return t.status === "Chưa hoàn thành" && (!!d ? new Date(d.setHours(0, 0, 0, 0)) >= today : true);
              }).length,
            },
            {
              key: "overdue",
              label: "Quá hạn",
              color: "red",
              count: tasks.filter((t) => {
                const d = parseDate(t.deadline_at || t.task_date);
                if (!d) return false;
                const today = new Date();
                d.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                return t.status === "Chưa hoàn thành" && d < today;
              }).length,
            },
          ].map((tabItem) => (
            <div
              key={tabItem.key}
              className={`task-tab ${tab === tabItem.key ? "active" : ""}`}
              onClick={() => setTab(tabItem.key as typeof tab)}
            >
              <span className="tab-label">{tabItem.label}</span>
              <span className={`tab-badge ${tabItem.color}`}>{tabItem.count}</span>
              {tab === tabItem.key && <div className="tab-underline" />}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="row align-items-center mb-3">
          {/* Người dùng - NEW */}
          <div className="col-md-3">
            <Select
              isClearable
              value={userFilter}
              onChange={setUserFilter}
              options={users.map(u => ({ value: String(u.id), label: u.name }))}
              placeholder="Người dùng"
              classNamePrefix="react-select"
            />
          </div>

          {/* Ưu tiên */}
          <div className="col-md-3">
            <Select
              isClearable
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={["Khẩn cấp", "Cao", "Trung bình", "Thấp"].map(p => ({ value: p, label: p }))}
              placeholder="Độ ưu tiên"
              classNamePrefix="react-select"
            />
          </div>

          <div className="col-md-3">
            <Form.Control
              type="date"
              value={taskDateStart}
              onChange={(e) => setTaskDateStart(e.target.value)}
              placeholder="Từ ngày"
            />
          </div>
          <div className="col-md-3">
            <Form.Control
              type="date"
              value={taskDateEnd}
              onChange={(e) => setTaskDateEnd(e.target.value)}
              placeholder="Đến ngày"
            />
          </div>

          <div className="col-md-3 mt-3">
            <Form onSubmit={(e) => e.preventDefault()}>
              <Form.Control
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm công việc..."
              />
            </Form>
          </div>
        </div>

        {(tab !== "all" || priorityFilter || taskDateStart || taskDateEnd || searchKeyword) && (
          <>
            <div className="mb-2 text-muted">
              {filteredTasks.length === 0 ? (
                <span>Không có công việc nào khớp điều kiện lọc.</span>
              ) : (
                <span>
                  Đã tìm thấy <strong>{filteredTasks.length}</strong> công việc.
                </span>
              )}
            </div>

            <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
              {tab !== "all" && (
                <span className="badge-filter">
                  Trạng thái:{" "}
                  <strong className="ms-1">
                    {{
                      done: "Đã hoàn thành",
                      pending: "Chưa hoàn thành",
                      overdue: "Quá hạn",
                    }[tab]}
                  </strong>
                  <button onClick={() => setTab("all")} className="btn-close-filter" aria-label="Xoá">
                    ×
                  </button>
                </span>
              )}
              {priorityFilter && (
                <span className="badge-filter">
                  Ưu tiên: <strong className="ms-1">{priorityFilter.label}</strong>
                  <button onClick={() => setPriorityFilter(null)} className="btn-close-filter" aria-label="Xoá">
                    ×
                  </button>
                </span>
              )}
              {taskDateStart && (
                <span className="badge-filter">
                  Từ ngày: <strong className="ms-1">{taskDateStart}</strong>
                  <button onClick={() => setTaskDateStart("")} className="btn-close-filter" aria-label="Xoá">
                    ×
                  </button>
                </span>
              )}
              {taskDateEnd && (
                <span className="badge-filter">
                  Đến ngày: <strong className="ms-1">{taskDateEnd}</strong>
                  <button onClick={() => setTaskDateEnd("")} className="btn-close-filter" aria-label="Xoá">
                    ×
                  </button>
                </span>
              )}
              {searchKeyword && (
                <span className="badge-filter">
                  Từ khoá: <strong className="ms-1">{searchKeyword}</strong>
                  <button onClick={() => setSearchKeyword("")} className="btn-close-filter" aria-label="Xoá">
                    ×
                  </button>
                </span>
              )}
              <button
                className="btn-clear-hover"
                onClick={() => {
                  setTab("all");
                  setPriorityFilter(null);
                  setTaskDateStart("");
                  setTaskDateEnd("");
                  setSearchKeyword("");
                }}
              >
                Xoá lọc
              </button>
            </div>
          </>
        )}

        {/* Table */}
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light text-center thead-small">
              <tr>
                <th className="truncate-cell">Ngày</th>
                <th className="truncate-cell">Deadline</th>
                <th className="truncate-cell">Task</th>
                <th className="truncate-cell">Ca</th>
                <th className="truncate-cell">Loại</th>
                <th className="truncate-cell">Người nhận</th>
                <th className="truncate-cell">Người giao</th>
                <th className="truncate-cell">Phụ trách</th>
                <th className="truncate-cell">Tiến độ</th>
                <th className="truncate-cell">Ưu tiên</th>
                <th className="truncate-cell">Chi tiết</th>
                <th className="truncate-cell">File</th>

                <th className="truncate-cell">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {currentTasks.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center text-muted py-4">
                    Không có công việc phù hợp.
                  </td>
                </tr>
              ) : (
                currentTasks.map((t) => {
                  const u = resolveUserByNameOrId(t.user);
                  const a = resolveUserByNameOrId(t.assigned_by_user);
                  const s = resolveSupervisor(t.supervisor || t.user?.name);

                  return (
                    <tr key={t.id}>
                      <td className="text-center truncate-cell" title={formatDate(t.task_date)}>
                        {formatDate(t.task_date)}
                      </td>
                      <td className="text-center truncate-cell" title={formatDate(t.deadline_at || undefined)}>
                        {formatDate(t.deadline_at || undefined)}
                      </td>
                      <td className="text-center fw-bold text-primary truncate-cell" title={t.title}>
                        {t.title}
                      </td>
                      <td className="text-center truncate-cell" title={t.shift || "-"}>
                        {t.shift || "-"}
                      </td>
                      <td className="text-center truncate-cell" title={t.type || "-"}>
                        {t.type || "-"}
                      </td>

                      {/* Người nhận */}
                      <td className="text-center">
                        {Array.isArray(t.users) && t.users.length > 0 ? (
                          <div className="d-flex flex-column align-items-center">
                            {t.users.map((u2, idx) => {
                              const resolved = resolveUserByNameOrId(u2);
                              return (
                                <div key={idx} className="d-flex align-items-center gap-1">
                                  <img src={resolved.avatar} width="24" height="24" className="rounded-circle" />
                                  <span className="text-truncate">{resolved.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-muted">—</div>
                        )}
                      </td>

                      {/* Người giao */}
                      <td className="text-center">
                        {t.assigned_by_user ? (
                          (() => {
                            const resolved = resolveUserByNameOrId(t.assigned_by_user);
                            return (
                              <div className="d-flex flex-column align-items-center">
                                <div className="d-flex align-items-center gap-1">
                                  <img
                                    src={resolved.avatar}
                                    width="24"
                                    height="24"
                                    className="rounded-circle"
                                  />
                                  <span className="text-truncate">{resolved.name}</span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-muted">—</div>
                        )}
                      </td>


                      {/* Phụ trách */}
                      <td className="text-center">
                        <div className="d-flex align-items-center gap-2 justify-content-center truncate-cell" title={s.name}>
                          <img src={s.avatar} alt="avatar" width="32" height="32" className="rounded-circle shadow-sm" />
                          <span className="text-truncate">{s.name}</span>
                        </div>
                      </td>

                      <td className="text-center truncate-cell" title={`${t.progress ?? 0}%`}>
                        {t.progress ?? 0}
                      </td>
                      <td className="text-center truncate-cell">
                        <Badge bg={getPriorityColor(t.priority)}>{t.priority || "-"}</Badge>
                      </td>
                      <td className="text-center truncate-cell" title={t.detail || "-"}>
                        {t.detail || "-"}
                      </td>
                      <td className="text-center truncate-cell" title={t.file_link || "-"}>
                        {t.file_link
                          ? t.file_link.split(",").map((link, i) => (
                            <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer">
                              Link {i + 1}
                              <br />
                            </a>
                          ))
                          : "-"}
                      </td>


                      {/* Hành động: Sửa + Xoá (không còn dấu 3 chấm/Export) */}
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 text-secondary"
                            onClick={() => openEdit(t)}
                            title="Sửa"
                          >
                            <BsPencil size={18} />
                          </Button>

                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 text-danger"
                            onClick={() => handleDelete(t.id)}
                            title="Xoá"
                          >
                            <FaTrash size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>Trang {currentPage}/{totalPages}</span>
          <div>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0 me-2"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
            >
              ‹
            </Button>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
            >
              ›
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Thêm */}
      <Modal isOpen={showAddModal} title="Thêm công việc" onClose={() => setShowAddModal(false)}>
        <TaskAddFormAdmin
          onCancel={() => setShowAddModal(false)}
          onSuccess={(newTask) => {
            setTasks((prev) => [newTask, ...prev]);
            setShowAddModal(false);
            Swal.fire("Thành công", "Đã tạo công việc", "success");
          }}
        />
      </Modal>

      {/* Modal Sửa */}
      <Modal
        isOpen={showEditModal}
        title="Sửa công việc"
        onClose={() => {
          setShowEditModal(false);
          setEditingTaskId(null);
        }}
      >
        <TaskEditFormAdmin
          task={tasks.find((t) => t.id === editingTaskId)}
          onCancel={() => {
            setShowEditModal(false);
            setEditingTaskId(null);
          }}
          onSuccess={(updatedTask) => {
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
            setShowEditModal(false);
            setEditingTaskId(null);
            Swal.fire("Thành công", "Đã cập nhật công việc", "success");
          }}
        />
      </Modal>
    </div>
  );
}
