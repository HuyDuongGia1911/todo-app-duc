// KpiPage.jsx
import React, { useMemo, useState } from "react";
import { Button, Form, Table, Badge } from "react-bootstrap";
import Select from "react-select";
import { FaPlus, FaTrash, FaDownload } from "react-icons/fa";
import { BsPencil } from "react-icons/bs";
import { BiDotsVerticalRounded } from "react-icons/bi";
import { Sun, Sunrise, Moon } from "lucide-react";
import Modal from "../components/Modal";
import KpiDetailModal from "../components/KpiDetailModal"
import { useEffect } from "react";
import Swal from "sweetalert2";
import AsyncDropdownSelect from "../components/AsyncDropdownSelect";
const getCsrfToken = () => document.head.querySelector('meta[name="csrf-token"]')?.content || "";

function useDayInfo() {
  const now = new Date();
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const weekday = days[now.getDay()];
  const date = now.toLocaleDateString("vi-VN");
  const hour = now.getHours();
  let session = "Sáng", Icon = Sunrise;
  if (hour >= 12 && hour < 18) { session = "Chiều"; Icon = Sun; }
  if (hour >= 18) { session = "Tối"; Icon = Moon; }
  return { weekday, date, session, Icon };
}

const formatMonth = (d) => (d ? (d.slice(0, 7)) : "");

const isOverdue = (kpi) => {
  const end = new Date(kpi.end_date);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return kpi.status !== "Đã hoàn thành" && end < today;
};

const isPending = (kpi) => {
  const end = new Date(kpi.end_date);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return kpi.status !== "Đã hoàn thành" && end >= today;
};

const statusBadge = (status) =>
  status === "Đã hoàn thành"
    ? <Badge bg="success">Đã hoàn thành</Badge>
    : <Badge bg="secondary">Chưa hoàn thành</Badge>;

const ITEMS_PER_PAGE = 7;

export default function KpiPage({ initialKpis, filters }) {
  const [kpis, setKpis] = useState(initialKpis || []);
  const [tab, setTab] = useState("all"); // all | done | pending | overdue
  const [monthFilter, setMonthFilter] = useState(filters?.month || "");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({});
  const [filtersState, setFilters] = useState(filters || {});
 const [showAddModal, setShowAddModal] = useState(false);
  const csrfToken = getCsrfToken();
  const { weekday, date, session, Icon } = useDayInfo();

  // ------- Actions -------
  const fetchKpis = async () => {
    try {
      const res = await fetch("/kpis?json=1");
      const data = await res.json();
      setKpis(data.kpis);
      setStats(data.stats);
      setFilters(data.filters);
    } catch (error) {
      console.error("Lỗi khi load KPI:", error);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/kpis/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrfToken },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setKpis((prev) => prev.map((k) => (k.id === id ? { ...k, status: newStatus } : k)));
    } catch {
      alert("Lỗi khi cập nhật trạng thái KPI!");
    }
  };
  const deleteKpi = async (id) => {
    const result = await Swal.fire({
      title: 'Xoá KPI này?',
      text: 'Bạn sẽ không thể hoàn tác thao tác này!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Huỷ',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/kpis/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ _method: 'DELETE' }),
      });
      if (!res.ok) throw new Error('Xoá thất bại');

      setKpis(prev => prev.filter(k => k.id !== id));
      Swal.fire({ icon: 'success', title: 'Đã xoá KPI', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Không thể xoá KPI', text: 'Vui lòng thử lại.' });
    }
  };
  useEffect(() => {
    fetchKpis();
  }, []);


  const openDetail = (id) => {
    setSelectedKpiId(id);
    setShowDetailModal(true);
  };

  const handleDeletedFromDetail = (deletedId) => {
    setKpis((prev) => prev.filter((k) => k.id !== deletedId));
    setShowDetailModal(false);
    setSelectedKpiId(null);
  };


  // ------- Filters / Tabs -------
  const counts = useMemo(() => ({
    all: kpis.length,
    done: kpis.filter(k => k.status === "Đã hoàn thành").length,
    pending: kpis.filter(isPending).length,
    overdue: kpis.filter(isOverdue).length,
  }), [kpis]);

  const filtered = useMemo(() => {
    let list = [...kpis];

    // tab filter
    if (tab === "done") list = list.filter(k => k.status === "Đã hoàn thành");
    if (tab === "pending") list = list.filter(isPending);
    if (tab === "overdue") list = list.filter(isOverdue);

    // month filter (YYYY-MM)
    if (monthFilter) {
      list = list.filter(k => formatMonth(k.start_date || k.end_date) === monthFilter);
    }

    // search by name
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      list = list.filter(k => (k.name || "").toLowerCase().includes(q));
    }

    return list;
  }, [kpis, tab, monthFilter, searchKeyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [tab, monthFilter, searchKeyword]);


 // Form tạo KPI (đơn giản theo form Blade bạn đang dùng)
 const [createForm, setCreateForm] = useState({
   month: "",
   name: "",
   note: "",
   tasks: [{ title: "", target: "" }],
 });

 const addTaskRow = () => {
   setCreateForm((f) => ({ ...f, tasks: [...f.tasks, { title: "", target: "" }] }));
 };
 const removeTaskRow = (idx) => {
   setCreateForm((f) => ({ ...f, tasks: f.tasks.filter((_, i) => i !== idx) }));
 };
 const updateTaskRow = (idx, field, value) => {
   setCreateForm((f) => {
     const tasks = [...f.tasks];
     tasks[idx] = { ...tasks[idx], [field]: value };
     return { ...f, tasks };
   });
 };

 const resetCreateForm = () => {
   setCreateForm({ month: "", name: "", note: "", tasks: [{ title: "", target: "" }] });
 };

 const createKpi = async (e) => {
   e.preventDefault();
   // Chuẩn hoá payload theo Blade create: task_titles[], target_progresses[]
   const payload = {
     month: createForm.month,
     name: createForm.name,
     note: createForm.note,
    task_titles: createForm.tasks.map(t => t.title).filter(Boolean),
     target_progresses: createForm.tasks.map(t => t.target).filter(v => v !== ""),
   };
   if (!payload.month || !payload.name) {
     Swal.fire('Thiếu thông tin', 'Vui lòng nhập Tháng và Tên KPI', 'warning');
     return;
   }
   try {
     const res = await fetch('/kpis', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'X-CSRF-TOKEN': csrfToken,
         'Accept': 'application/json',
       },
       body: JSON.stringify(payload),
     });
     if (!res.ok) throw new Error('Tạo KPI thất bại');
     await Swal.fire({ icon: 'success', title: 'Đã tạo KPI', timer: 1200, showConfirmButton: false });
     setShowAddModal(false);
     resetCreateForm();
     fetchKpis(); // refresh danh sách
   } catch (err) {
     Swal.fire('Lỗi', 'Không thể tạo KPI. Vui lòng thử lại.', 'error');
   }
 };
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 w-100">
        <div className="d-flex flex-column">
          <h2 className="fw-bold mb-1">Danh sách KPI</h2>
          <div className="d-flex align-items-center text-muted">
            <Icon size={20} className="me-2" />
            <span className="fw-semibold">{session}, {weekday} {date}</span>
          </div>
        </div>

        
       <button
   type="button"
   className="btn btn-dark d-flex align-items-center gap-2 rounded-3 py-2 px-3"
   onClick={() => setShowAddModal(true)}
 >
   <FaPlus /> Thêm KPI
 </button>
      </div>
      <div className="card shadow-sm rounded-4 p-4 bg-white">
        {/* Heading + Add button */}


        {/* Tabs */}
        <div className="task-tabs d-flex gap-4 mb-4">
          {[
            { key: "all", label: "Tất cả", color: "dark", count: counts.all },
            { key: "done", label: "Đã hoàn thành", color: "green", count: counts.done },
            { key: "pending", label: "Chưa hoàn thành", color: "orange", count: counts.pending },
            { key: "overdue", label: "Quá hạn", color: "red", count: counts.overdue },
          ].map(t => (
            <div
              key={t.key}
              className={`task-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              role="button"
            >
              <span className="tab-label">{t.label}</span>
              <span className={`tab-badge ${t.color}`}>{t.count}</span>
              {tab === t.key && <div className="tab-underline" />}
            </div>
          ))}
        </div>

        {/* Filters (tháng + search) */}
        <div className="row align-items-center mb-3">
          <div className="col-md-4">
            <Form.Control
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              placeholder="Chọn tháng"
            />
          </div>
          <div className="col-md-8 text-end">
            <Form onSubmit={(e) => e.preventDefault()}>
              <div className="d-flex">
                <Form.Control
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo tên KPI..."
                />
              </div>
            </Form>
          </div>
        </div>

        {(tab !== "all" || monthFilter || searchKeyword) && (
          <div className="mb-2 text-muted">
            {filtered.length === 0 ? (
              <span>Không có KPI nào khớp điều kiện lọc.</span>
            ) : (
              <span>Đã tìm thấy <strong>{filtered.length}</strong> KPI.</span>
            )}
          </div>
        )}

        {/* Filter tags + Clear */}
        {(tab !== "all" || monthFilter || searchKeyword) && (
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
            {tab !== "all" && (
              <span className="badge-filter">
                Trạng thái:{" "}
                <strong className="ms-1">
                  {{ done: "Đã hoàn thành", pending: "Chưa hoàn thành", overdue: "Quá hạn" }[tab]}
                </strong>
                <button className="btn-close-filter" onClick={() => setTab("all")} aria-label="Xoá trạng thái">×</button>
              </span>
            )}
            {monthFilter && (
              <span className="badge-filter">
                Tháng: <strong className="ms-1">{monthFilter}</strong>
                <button className="btn-close-filter" onClick={() => setMonthFilter("")} aria-label="Xoá tháng">×</button>
              </span>
            )}
            {searchKeyword && (
              <span className="badge-filter">
                Từ khoá: <strong className="ms-1">{searchKeyword}</strong>
                <button className="btn-close-filter" onClick={() => setSearchKeyword("")} aria-label="Xoá từ khoá">×</button>
              </span>
            )}
            <button
              className="btn-clear-hover"
              onClick={() => { setTab("all"); setMonthFilter(""); setSearchKeyword(""); }}
            >
              <span>Xoá lọc</span>
            </button>
          </div>
        )}

        {/* Table */}
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light text-center thead-small">
              <tr>
                <th className="truncate-cell" title="Tháng">Tháng</th>
                <th className="truncate-cell" title="Tên KPI">Tên KPI</th>
                <th className="truncate-cell" title="Tiến độ">Tiến độ</th>
                <th className="truncate-cell" title="Trạng thái">Trạng thái</th>
                <th className="truncate-cell" title="Hành động">Hành động</th>
                
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">Không có KPI phù hợp.</td>
                </tr>
              ) : (
                pageData.map((kpi) => (
                <tr key={kpi.id} className={kpi.status === "Đã hoàn thành" ? "kpi-done-row" : ""}>
                    <td className="text-center truncate-cell">{formatMonth(kpi.start_date || kpi.end_date)}</td>
                    <td className="text-center fw-bold text-primary truncate-cell">{kpi.name}</td>
                    <td className="text-center truncate-cell">{kpi.calculated_progress ?? 0}%</td>
                    <td className="text-center">
                      <Form.Check
                        type="switch"
                        id={`kpi-${kpi.id}`}
                        checked={kpi.status === 'Đã hoàn thành'}
                        onChange={() =>
                          updateStatus(
                            kpi.id,
                            kpi.status === 'Đã hoàn thành' ? 'Chưa hoàn thành' : 'Đã hoàn thành'
                          )
                        }
                      />
                    </td>
                    <td className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        {/* Nút mở chi tiết */}
                        <Button
                          size="sm"
                          variant="link"
                          className="p-0 text-secondary"
                          onClick={() => openDetail(kpi.id)}
                          title="Xem chi tiết"
                        >
                          <BsPencil size={18} />
                        </Button>
                        {/* Nút xoá KPI */}
                        <Button
                          size="sm"
                          variant="link"
                          className="p-0 text-danger"
                          onClick={() => deleteKpi(kpi.id)}
                          title="Xoá KPI"
                        >
                          <FaTrash size={18} className="me-2"/>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>Trang {currentPage}/{totalPages}</span>
          <div>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0 me-2"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              aria-label="Trang trước"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
              </svg>
            </Button>

            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              aria-label="Trang sau"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </Button>
          </div>
        </div>


        {/* Modal chi tiết KPI (giống cách bạn đang dùng) */}
        <Modal
          isOpen={showDetailModal && !!selectedKpiId}
          title="Chi tiết KPI"
          onClose={() => { setShowDetailModal(false); setSelectedKpiId(null); }}
        >
          {selectedKpiId && (
            <KpiDetailModal
              kpiId={selectedKpiId}
              onClose={() => { setShowDetailModal(false); setSelectedKpiId(null); }}
              onDeleted={handleDeletedFromDetail}
              reloadKpis={fetchKpis}
            />
          )}
        </Modal>
        {/* Modal: Thêm KPI */}
      <Modal
        isOpen={showAddModal}
        title="Thêm KPI"
        onClose={() => { setShowAddModal(false); }}
      >
        <form onSubmit={createKpi}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Tháng</label>
              <input
                type="month"
                className="form-control"
                value={createForm.month}
                onChange={(e) => setCreateForm(f => ({ ...f, month: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-8">
              <label className="form-label">Tên Deadline/KPI</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: KPI tháng A"
                value={createForm.name}
                onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Công việc (tiêu đề & mục tiêu)</label>
              {createForm.tasks.map((t, idx) => (
                <div key={idx} className="row g-2 align-items-center mb-2">
                  <div className="col-md-7">
                   <AsyncDropdownSelect
   name={`task-${idx}-title`}
   api="/api/titles"             // giống TaskAddForm
   field="title_name"            // field để hiển thị
   value={t.title}
   onChange={(e) => updateTaskRow(idx, 'title', e.target.value)}
   creatable
 />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Mục tiêu"
                      min={0}
                      max={100}
                      value={t.target}
                      onChange={(e) => updateTaskRow(idx, 'target', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 text-end">
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeTaskRow(idx)}>
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
             <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addTaskRow}>
                + Thêm công việc
              </button>
            </div>
            <div className="col-12">
              <label className="form-label">Ghi chú</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Ghi chú (nếu có)"
                value={createForm.note}
                onChange={(e) => setCreateForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Huỷ</button>
            <button type="submit" className="btn btn-primary">Lưu KPI</button>
          </div>
        </form>
      </Modal>
      </div>
    </>
  );
}
