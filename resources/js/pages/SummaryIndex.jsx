// resources/js/pages/SummaryIndex.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Form, Table, Button, Badge } from 'react-bootstrap';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import SummaryDetailModal from '../components/summaries/SummaryDetailModal';
import { Sun, Sunrise, Moon } from 'lucide-react';
import { FaPlus, FaTrash, FaLock, FaEye } from 'react-icons/fa';

const ITEMS_PER_PAGE = 7;

export default function SummaryIndex() {
  // ---------- Day info ----------
  const getDayInfo = () => {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const weekday = days[now.getDay()];
    const date = now.toLocaleDateString('vi-VN');
    const hour = now.getHours();
    let session = 'Sáng', Icon = Sunrise;
    if (hour >= 12 && hour < 18) { session = 'Chiều'; Icon = Sun; }
    if (hour >= 18) { session = 'Tối'; Icon = Moon; }
    return { weekday, date, session, Icon };
  };
  const { weekday, date, session, Icon } = getDayInfo();

  // ---------- State ----------
  const [summaries, setSummaries] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ month: '', title: '', content: '' });
  const [previewing, setPreviewing] = useState(false);

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // UI: tabs, filters, search
  // tab: all | locked | unlocked
  const [tab, setTab] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');

  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // loading/error
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');



  // ---------- Data fetch ----------
  const fetchSummaries = () => {
    setLoading(true);
    setLoadError('');
    fetch('/summaries', { headers: { Accept: 'application/json' } })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setSummaries)
      .catch(() => {
        setLoadError('Không tải được dữ liệu!');
        Swal.fire('Lỗi', 'Không tải được dữ liệu!', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchSummaries, []);

  // ---------- Actions ----------
  const handleAdd = async () => {
    if (!form.month || !/^\d{4}-\d{2}$/.test(form.month)) {
      Swal.fire('Thiếu dữ liệu', 'Vui lòng chọn tháng hợp lệ (YYYY-MM)!', 'warning');
      return;
    }
    try {
      const res = await fetch('/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Lỗi khi thêm báo cáo');
      const newSummary = await res.json();
      setSummaries(prev => [newSummary, ...prev]);
      Swal.fire('Thành công', 'Đã thêm báo cáo!', 'success');
      setShowAddModal(false);
      setForm({ month: '', title: '', content: '' });
    } catch {
      Swal.fire('Lỗi', 'Không thể thêm báo cáo!', 'error');
    }
  };

  const fetchPreview = async (month) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch(`/summaries/preview?month=${month}`);
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setForm(f => ({
        ...f,
        title: payload.title || f.title,
        content: payload.content || f.content,
      }));
    } catch {
      Swal.fire('Lỗi', 'Không tạo được gợi ý nội dung báo cáo!', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: 'Bạn chắc chắn xoá?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/summaries/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': csrf },
      });
      if (!res.ok) throw new Error();
      setSummaries(prev => prev.filter(s => s.id !== id));
      Swal.fire('Đã xoá', 'Báo cáo đã được xoá!', 'success');
    } catch {
      Swal.fire('Lỗi', 'Không thể xoá!', 'error');
    }
  };

  const handleLock = async (id) => {
    const confirm = await Swal.fire({
      title: 'Chốt báo cáo?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Chốt',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/summaries/${id}/lock`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': csrf },
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setSummaries(prev => prev.map(s => (s.id === id ? { ...s, locked_at: result.locked_at } : s)));
      Swal.fire('Thành công', 'Báo cáo đã được chốt!', 'success');
    } catch {
      Swal.fire('Lỗi', 'Không thể chốt!', 'error');
    }
  };

  const handleOpenSummary = async (id) => {
    try {
      const regenRes = await fetch(`/summaries/${id}/regenerate`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': csrf,
          Accept: 'application/json',
        },
      });
      if (!regenRes.ok) throw new Error('regenerate_failed');

      const res = await fetch(`/summaries/${id}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('fetch_failed');

      const data = await res.json();
      setViewing(data);
    } catch {
      Swal.fire('Lỗi', 'Không thể mở chi tiết báo cáo!', 'error');
    }
  };

  // ---------- Tabs: counts ----------
  const counts = useMemo(() => ({
    all: summaries.length,
    locked: summaries.filter(s => !!s.locked_at).length,
    unlocked: summaries.filter(s => !s.locked_at).length,
  }), [summaries]);

  // ---------- Filtering ----------
  const filtered = useMemo(() => {
    let list = [...summaries];

    // tab filter
    if (tab === 'locked') list = list.filter(s => !!s.locked_at);
    if (tab === 'unlocked') list = list.filter(s => !s.locked_at);

    // month filter (YYYY-MM exact)
    if (monthFilter) {
      list = list.filter(s => (s.month || '').slice(0, 7) === monthFilter);
    }

    // search by title (lowercase contains)
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      list = list.filter(s => (s.title || '').toLowerCase().includes(q));
    }

    return list;
  }, [summaries, tab, monthFilter, searchKeyword]);
  const formatMonth = (value) => {
  if (!value) return '';
  // value dạng "YYYY-MM"
  const [year, month] = value.split('-');
  return `${month}/${year}`;
};
  // ---------- Pagination ----------
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [tab, monthFilter, searchKeyword]);

  // clamp currentPage when filtered shrinks
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  
  // ---------- Render ----------
  return (
    <>
      {/* Header */}
      <section className="workspace-hero mb-4">
        <div>
          <p className="workspace-hero__eyebrow">Media Reports</p>
          <h2 className="workspace-hero__title">Tổng kết chiến dịch</h2>
          <p className="workspace-hero__subtitle">
            Định vị hiệu quả truyền thông với báo cáo trực quan và các chỉ số dễ theo dõi.
          </p>
          <div className="workspace-hero__info">
            <Icon size={18} />
            <span>{session}, {weekday} {date}</span>
          </div>
          <div className="workspace-metrics">
            {[
              { label: 'Báo cáo', value: counts.all },
              { label: 'Đã chốt', value: counts.locked },
              { label: 'Đang mở', value: counts.unlocked },
            ].map(metric => (
              <div className="workspace-metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="workspace-hero__actions">
          <button
            className="glow-button"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus /> Thêm báo cáo
          </button>
        </div>
      </section>

      <div className="workspace-card">
        {/* Tabs (giống KpiPage) */}
        <div className="task-tabs d-flex gap-4 mb-4">
          {[
            { key: 'all', label: 'Tất cả', color: 'dark', count: counts.all },
            { key: 'locked', label: 'Đã chốt', color: 'green', count: counts.locked },
            { key: 'unlocked', label: 'Chưa chốt', color: 'orange', count: counts.unlocked },
          ].map(t => (
            <div
              key={t.key}
              className={`task-tab ${tab === t.key ? 'active' : ''}`}
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
        <div className="workspace-filters mb-3">
          <div className="row g-3 w-100">
            <div className="col-md-4">
              <Form.Control
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                placeholder="Chọn tháng"
              />
            </div>
            <div className="col-md-8">
              <Form.Control
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo tiêu đề báo cáo..."
              />
            </div>
          </div>
        </div>

        {(tab !== 'all' || monthFilter || searchKeyword) && (
          <div className="mb-2 text-muted">
            {filtered.length === 0 ? (
              <span>Không có báo cáo nào khớp điều kiện lọc.</span>
            ) : (
              <span>Đã tìm thấy <strong>{filtered.length}</strong> báo cáo.</span>
            )}
          </div>
        )}

        {/* Filter tags + Clear */}
        {(tab !== 'all' || monthFilter || searchKeyword) && (
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
            {tab !== 'all' && (
              <span className="workspace-filter-pill">
                Trạng thái:
                <strong>
                  {{ locked: 'Đã chốt', unlocked: 'Chưa chốt' }[tab]}
                </strong>
                <button
                  onClick={() => setTab('all')}
                  aria-label="Xoá trạng thái"
                >×</button>
              </span>
            )}
            {monthFilter && (
              <span className="workspace-filter-pill">
                Tháng: <strong>{monthFilter}</strong>
                <button
                  onClick={() => setMonthFilter('')}
                  aria-label="Xoá tháng"
                >×</button>
              </span>
            )}
            {searchKeyword && (
              <span className="workspace-filter-pill">
                Từ khoá: <strong>{searchKeyword}</strong>
                <button
                  onClick={() => setSearchKeyword('')}
                  aria-label="Xoá từ khoá"
                >×</button>
              </span>
            )}
            <button
              className="btn-clear-hover"
              onClick={() => { setTab('all'); setMonthFilter(''); setSearchKeyword(''); }}
            >
              <span>Xoá lọc</span>
            </button>
          </div>
        )}

        {/* Table */}
        <div className="workspace-table-shell">
          <div className="table-responsive">
            <Table hover className="align-middle">
            <thead className="table-light text-center thead-small">
              <tr>
                <th>Tháng</th>
                <th>Tiêu đề</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">Đang tải...</td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    {loadError || 'Chưa có báo cáo nào.'}
                  </td>
                </tr>
              ) : pageData.map(s => (
                <tr key={s.id}>
                 <td className="text-center">{formatMonth(s.month)}</td>
                  <td className="fw-semibold text-primary truncate-cell">{s.title}</td>
                  <td className="text-center">
                    {s.locked_at
                      ? <Badge bg="success">Đã chốt</Badge>
                      : <Badge bg="secondary">Chưa chốt</Badge>}
                  </td>
                  <td className="text-center">
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        size="sm"
                        variant="link"
                        className="p-0 text-info"
                        onClick={() => handleOpenSummary(s.id)}
                        title="Xem chi tiết"
                      >
                        <FaEye />
                      </Button>
                      {!s.locked_at && (
                        <>
                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 text-danger"
                            onClick={() => handleDelete(s.id)}
                            title="Xoá báo cáo"
                          >
                            <FaTrash />
                          </Button>
                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 text-warning"
                            onClick={() => handleLock(s.id)}
                            title="Chốt báo cáo"
                          >
                            <FaLock />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span>Trang {currentPage}/{totalPages}</span>
          <nav className="workspace-pagination">
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                  </svg>
                </button>
              </li>
              <li className="page-item disabled">
                <span className="page-link">{currentPage}/{totalPages}</span>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Trang sau"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Modal thêm báo cáo */}
      <Modal isOpen={showAddModal} title="Thêm báo cáo tháng" onClose={() => setShowAddModal(false)}>
        <form onSubmit={e => { e.preventDefault(); handleAdd(); }}>
          <div className="mb-3">
            <label className="form-label">Tháng</label>
            <input type="month" className="form-control" value={form.month}
              onChange={e => {
                const { value } = e.target;
                setForm(f => ({ ...f, month: value }));
                fetchPreview(value);
              }} required />
            {previewing && <small className="text-muted">Đang sinh nội dung tự động...</small>}
          </div>
          <div className="mb-3">
            <label className="form-label">Tiêu đề</label>
            <input type="text" className="form-control" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Nội dung (tuỳ chọn)</label>
            <textarea className="form-control" rows={3} value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Huỷ</button>
            <button type="submit" className="btn btn-primary">Lưu báo cáo</button>
          </div>
        </form>
      </Modal>

      {/* Modal chi tiết báo cáo */}
      {viewing && (
        <SummaryDetailModal
          isOpen={!!viewing}
          summary={viewing}
          onClose={() => setViewing(null)}
          onSaveContent={(id, content) => {
            const update = summaries.find(s => s.id === id);
            if (!update) return;
            update.content = content;
            setSummaries([...summaries]);
          }}
          onRegenerate={() => handleOpenSummary(viewing.id)}
        />
      )}
    </>
  );
}
