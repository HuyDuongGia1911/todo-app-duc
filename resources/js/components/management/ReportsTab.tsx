import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Badge, Form, Table, Spinner } from "react-bootstrap";
import SummaryDetailModal from "../summaries/SummaryDetailModal"

// debounce đơn giản (giữ nguyên logic)
function useDebounce(value: string, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type User = { id: number; name: string; email: string };

type ReportItem = {
  id: number;
  user?: { name?: string; email?: string };
  month?: string;
  title?: string;
  locked?: boolean | number | "0" | "1";
};

type SummaryDetail = {
  id: number;
  month: string;
  title: string;
  content: string;
  locked_at: string | null;
  tasks_cache: any[];
  stats: any;
  kpis: any[];
};

export default function ReportsTab() {
  // filters
  const [keyword, setKeyword] = useState("");
  const [userId, setUserId] = useState("");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [locked, setLocked] = useState(""); // "", "1", "0"
  const [perPage, setPerPage] = useState(20);

  // data
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
const [detailLoading, setDetailLoading] = useState(false);
const [detailSummary, setDetailSummary] = useState<SummaryDetail | null>(null);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20,
  });
  const [loading, setLoading] = useState(false);

  const debouncedKeyword = useDebounce(keyword);

  const queryParams = useMemo(
    () => ({
      page: meta.current_page,
      per_page: perPage,
      keyword: debouncedKeyword || undefined,
      user_id: userId || undefined,
      month: month || undefined,
      from: from || undefined,
      to: to || undefined,
      locked: locked !== "" ? locked : undefined,
    }),
    [meta.current_page, perPage, debouncedKeyword, userId, month, from, to, locked]
  );

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users");
      setUsers(res.data || []);
    } catch (e) {
      console.error("Không tải được users", e);
    }
  };

  const fetchReports = async (params: any = {}) => {
    setLoading(true);
    try {
      const res = await axios.get("/management/reports/data", { params });
      // API backend trả { data:[], current_page, per_page, total, last_page, ... }
      setItems(res.data?.data || []);
      setMeta((m) => ({
        ...m,
        current_page: res.data?.current_page ?? m.current_page,
        last_page: res.data?.last_page ?? m.last_page,
        total: res.data?.total ?? m.total,
        per_page: res.data?.per_page ?? m.per_page,
      }));
    } catch (e) {
      console.error("Lỗi tải báo cáo:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setMeta((m) => ({ ...m, current_page: 1 }));
    fetchReports({ ...queryParams, page: 1 });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > meta.last_page) return;
    setMeta((m) => ({ ...m, current_page: nextPage }));
  };

  const handleUnlock = async (id: number) => {
    try {
      await axios.post(`/management/reports/${id}/unlock`);
      fetchReports(queryParams);
    } catch (e) {
      console.error("Gỡ chốt thất bại:", e);
      alert("Gỡ chốt thất bại!");
    }
  };
  const openReportDetail = async (id: number) => {
  try {
    setDetailOpen(true);
    setDetailLoading(true);

    // Lấy chi tiết báo cáo
    const res = await axios.get(`/summaries/${id}`); // đổi URL nếu cần
    const raw = res.data || {};

    // (Không bắt buộc) Chuẩn hoá 1 chút để hợp modal:
    const mapped: SummaryDetail = {
      id: raw.id,
      month: raw.month,
      title: raw.title,
      content: raw.content,
      locked_at: raw.locked_at ?? (raw.locked ? new Date().toISOString() : null),
      tasks_cache: raw.tasks_cache || [],  // [{title, progress, dates, ...}]
      stats: raw.stats || null,            // {total, done, pending, overdue}
      kpis: raw.kpis || [],                // [{id, name, task_names_array, task_targets}]
    };

    setDetailSummary(mapped);
  } catch (e) {
    alert("Không thể tải chi tiết báo cáo!");
    setDetailOpen(false);
  } finally {
    setDetailLoading(false);
  }
};

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReports(queryParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.current_page, perPage, debouncedKeyword]);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-4 w-100">
        <div className="d-flex flex-column">
          <h2 className="fw-bold mb-1">Danh sách báo cáo</h2>
          <div className="text-muted">Tra cứu & quản trị báo cáo theo bộ lọc</div>
        </div>
      </div>

      {/* Card chính */}
      <div className="card shadow-sm rounded-4 p-4 bg-white">
        {/* Filters — áp dụng input-wrapper + label-inside */}
        <div className="row g-3 align-items-end mb-3">
          <div className="col-md-3">
            <div className="input-wrapper w-100">
              <span className="label-inside">Từ khóa</span>
              <Form.Control
                placeholder="Tiêu đề / nội dung…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <div className="input-wrapper w-100">
              <span className="label-inside">Người dùng</span>
              <Form.Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Tất cả</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>

        

          <div className="col-md-3">
            <div className="input-wrapper w-100">
              <span className="label-inside">Từ tháng</span>
              <Form.Control
                type="month"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <div className="input-wrapper w-100">
              <span className="label-inside">Đến tháng</span>
              <Form.Control
                type="month"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-2">
            <div className="input-wrapper w-100">
              <span className="label-inside">Trạng thái</span>
              <Form.Select value={locked} onChange={(e) => setLocked(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="1">Đã chốt</option>
                <option value="0">Chưa chốt</option>
              </Form.Select>
            </div>
          </div>

          <div className="col-md-2">
            <div className="input-wrapper w-100">
              <span className="label-inside">Hiển thị</span>
              <Form.Select
                value={perPage}
                onChange={(e) => setPerPage(parseInt(e.target.value, 10))}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / trang
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>

          <div className="col-md-12">
            <Button variant="dark" className="rounded-3 py-2 px-3" onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </div>
        </div>

        {/* Filter summary — dùng badge-filter / btn-close-filter / btn-clear-hover */}
        {(keyword || userId || month || from || to || locked !== "") && (
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
            {keyword && (
              <span className="badge-filter">
                Từ khóa: <strong className="ms-1">{keyword}</strong>
                <button className="btn-close-filter" onClick={() => setKeyword("")} aria-label="Xoá từ khóa">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </span>
            )}
            {userId && (
              <span className="badge-filter">
                Người dùng:{" "}
                <strong className="ms-1">
                  {users.find((u) => String(u.id) === String(userId))?.name || userId}
                </strong>
                <button className="btn-close-filter" onClick={() => setUserId("")} aria-label="Xoá người dùng">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </span>
            )}
            {month && (
              <span className="badge-filter">
                Tháng: <strong className="ms-1">{month}</strong>
                <button className="btn-close-filter" onClick={() => setMonth("")} aria-label="Xoá tháng">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </span>
            )}
            {from && (
              <span className="badge-filter">
                Từ: <strong className="ms-1">{from}</strong>
                <button className="btn-close-filter" onClick={() => setFrom("")} aria-label="Xoá từ tháng">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </span>
            )}
            {to && (
              <span className="badge-filter">
                Đến: <strong className="ms-1">{to}</strong>
                <button className="btn-close-filter" onClick={() => setTo("")} aria-label="Xoá đến tháng">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </span>
            )}
            {locked !== "" && (
              <span className="badge-filter">
                Trạng thái: <strong className="ms-1">{locked === "1" ? "Đã chốt" : "Chưa chốt"}</strong>
                <button className="btn-close-filter" onClick={() => setLocked("")} aria-label="Xoá trạng thái">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </span>
            )}

            {/* Clear all */}
            <button
              className="btn-clear-hover"
              onClick={() => {
                setKeyword("");
                setUserId("");
                setMonth("");
                setFrom("");
                setTo("");
                setLocked("");
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="icon" viewBox="0 0 16 16">
                <path d="M5.5 5.5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0v-7zm2-.5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5z" />
                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM5.5 1a.5.5 0 0 0-.5.5V2h6v-.5a.5.5 0 0 0-.5-.5h-5z" />
              </svg>
              <span>Xoá lọc</span>
            </button>
          </div>
        )}

        {/* Kết quả */}
        <div className="mb-2 text-muted">
          {loading ? (
            <span className="d-inline-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" /> Đang tải…
            </span>
          ) : items.length === 0 ? (
            <span>Không có dữ liệu.</span>
          ) : (
            <span>
              Tổng: <strong>{meta.total}</strong> báo cáo
            </span>
          )}
        </div>

        {/* Table */}
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light text-center thead-small">
              <tr>
                <th className="truncate-cell" title="ID">ID</th>
                <th className="truncate-cell" title="User">User</th>
                <th className="truncate-cell" title="Tháng">Tháng</th>
                <th className="truncate-cell" title="Tiêu đề">Tiêu đề</th>
                <th className="truncate-cell" title="Trạng thái">Trạng thái</th>
                <th className="truncate-cell" title="Thao tác">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang tải…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                items.map((r) => {
                  const isLocked =
                    typeof r.locked === "boolean"
                      ? r.locked
                      : String(r.locked) === "1";
                  return (
                    <tr key={r.id}>
                      <td className="text-center truncate-cell" title={String(r.id)}>{r.id}</td>
                      <td className="text-center truncate-cell" title={r.user?.name || "-"}>
                        <div className="fw-semibold">{r.user?.name || "-"}</div>
                        <div className="small text-muted">{r.user?.email || ""}</div>
                      </td>
                      <td className="text-center truncate-cell" title={r.month || "-"}>
                        {r.month || "-"}
                      </td>
                      <td className="text-center fw-semibold text-primary truncate-cell" title={r.title || "-"}>
                        {r.title || "-"}
                      </td>
                      <td className="text-center truncate-cell" title={isLocked ? "Đã chốt" : "Chưa chốt"}>
                        {isLocked ? <Badge bg="dark">Đã chốt</Badge> : <Badge bg="secondary">Chưa chốt</Badge>}
                      </td>
                      <td className="text-center">
                        {isLocked && (
                            <div className="d-flex gap-2 justify-content-center">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            className="rounded-3"
                            onClick={() => openReportDetail(r.id)}
                            title="Xem"
                          >
                            Xem
                          </Button>
                           <Button
                            size="sm"
                            variant="outline-secondary"
                            className="rounded-3"
                            onClick={() => handleUnlock(r.id)}
                            title="Gỡ chốt"
                          >
                            Gỡ chốt
                          </Button>
                          </div>
                        )}
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
          <span>Trang {meta.current_page}/{Math.max(1, meta.last_page)}</span>
          <div>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0 me-2"
              disabled={meta.current_page <= 1}
              onClick={() => handlePageChange(1)}
              aria-label="Trang đầu"
            >
              « Đầu
            </Button>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0 me-2"
              disabled={meta.current_page <= 1}
              onClick={() => handlePageChange(meta.current_page - 1)}
              aria-label="Trang trước"
            >
              ‹ Trước
            </Button>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0 me-2"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => handlePageChange(meta.current_page + 1)}
              aria-label="Trang sau"
            >
              Sau ›
            </Button>
            <Button
              size="sm"
              variant="link"
              className="text-secondary p-0"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => handlePageChange(meta.last_page)}
              aria-label="Trang cuối"
            >
              Cuối »
            </Button>
          </div>
        </div>
      </div>
      {detailOpen && (
  <SummaryDetailModal
    isOpen={detailOpen}
    summary={
      detailSummary || {
        id: 0,
        month: "",
        title: "",
        content: "",
        locked_at: null,
        tasks_cache: [],
        stats: null,
        kpis: [],
      }
    }
    onClose={() => {
      setDetailOpen(false);
      setDetailSummary(null);
    }}
    onSaveContent={async (id: number, content: string) => {
      try {
        const res = await axios.put(`/summaries/${id}`, { content });
        const nextContent = res.data?.content ?? content;
        setDetailSummary((prev) => (prev ? { ...prev, content: nextContent } : prev));
      } catch (error) {
        console.error('Không thể lưu báo cáo', error);
        throw error;
      }
    }}
    onRegenerate={async () => {
      if (!detailSummary) return;
      try {
        await axios.post(`/summaries/${detailSummary.id}/regenerate`);
        openReportDetail(detailSummary.id);
      } catch {
        alert("Không thể tái tạo nội dung!");
      }
    }}
  />
)}
    </>
  );
}
