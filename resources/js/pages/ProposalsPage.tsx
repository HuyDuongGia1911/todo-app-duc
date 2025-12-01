import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Card, Form, Spinner } from 'react-bootstrap';

interface Proposal {
  id: number;
  type: 'task' | 'kpi';
  title: string;
  description?: string;
  priority?: string;
  expected_deadline?: string | null;
  kpi_month?: string | null;
  kpi_target?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  user_read_at?: string | null;
}

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
}

const statusBadgeClass = (status: Proposal['status']) => {
  switch (status) {
    case 'approved':
      return 'badge bg-success';
    case 'rejected':
      return 'badge bg-danger';
    default:
      return 'badge bg-warning text-dark';
  }
};

const defaultFormState = {
  type: 'task' as 'task' | 'kpi',
  title: '',
  description: '',
  priority: 'Trung bình',
  expected_deadline: '',
  kpi_month: '',
  kpi_target: '',
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultFormState);
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = useMemo(() => (form.type === 'task' ? 'Công việc' : 'KPI'), [form.type]);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/task-proposals', {
        params: {
          status: filters.status || undefined,
          type: filters.type || undefined,
          page,
        },
      });
      setProposals(res.data?.data || []);
      setMeta({
        current_page: res.data?.current_page ?? 1,
        last_page: res.data?.last_page ?? 1,
        total: res.data?.total ?? 0,
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách đề xuất.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.type]);

  useEffect(() => {
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const payload = new FormData();
    payload.append('type', form.type);
    payload.append('title', form.title);
    if (form.description) payload.append('description', form.description);
    if (form.priority) payload.append('priority', form.priority);
    if (form.expected_deadline && form.type === 'task') {
      payload.append('expected_deadline', form.expected_deadline);
    }
    if (form.type === 'kpi') {
      payload.append('kpi_month', form.kpi_month);
      payload.append('kpi_target', form.kpi_target);
    }
    if (files) {
      Array.from(files).forEach(file => payload.append('attachments[]', file));
    }

    try {
      await axios.post('/task-proposals', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(defaultFormState);
      setFiles(null);
      await fetchProposals();
    } catch (err) {
      console.error(err);
      alert('Không thể gửi đề xuất. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (proposal: Proposal) => {
    if (proposal.status !== 'pending') {
      alert('Chỉ có thể xoá đề xuất đang chờ duyệt.');
      return;
    }
    if (!confirm('Xoá đề xuất này?')) return;
    try {
      await axios.delete(`/task-proposals/${proposal.id}`);
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
    } catch (err) {
      console.error(err);
      alert('Không thể xoá đề xuất.');
    }
  };

  const handleMarkRead = async (proposal: Proposal) => {
    if (proposal.user_read_at) return;
    try {
      await axios.post(`/task-proposals/${proposal.id}/mark-read`);
      setProposals(prev =>
        prev.map(p => (p.id === proposal.id ? { ...p, user_read_at: new Date().toISOString() } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const canSubmit = form.title.trim().length > 0 && (!submitting);

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">Đề xuất {typeLabel}</h2>
          <p className="text-muted mb-0">Gửi ý tưởng công việc mới hoặc KPI cho quản lý phê duyệt.</p>
        </div>
        <div className="d-flex gap-2">
          <Form.Select
            value={filters.type}
            onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
            style={{ width: 160 }}
          >
            <option value="">Tất cả loại</option>
            <option value="task">Công việc</option>
            <option value="kpi">KPI</option>
          </Form.Select>
          <Form.Select
            value={filters.status}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{ width: 160 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
          </Form.Select>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <Form.Label>Loại đề xuất</Form.Label>
                <Form.Select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'task' | 'kpi' }))}
                >
                  <option value="task">Công việc</option>
                  <option value="kpi">KPI</option>
                </Form.Select>
              </div>
              <div className="col-md-5">
                <Form.Label>Tiêu đề *</Form.Label>
                <Form.Control
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="col-md-4">
                <Form.Label>Mức ưu tiên</Form.Label>
                <Form.Select
                  value={form.priority}
                  onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                  disabled={form.type === 'kpi'}
                >
                  <option value="Khẩn cấp">Khẩn cấp</option>
                  <option value="Cao">Cao</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Thấp">Thấp</option>
                </Form.Select>
              </div>
              <div className="col-md-8">
                <Form.Label>Mô tả</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Nêu rõ lý do, lợi ích và phạm vi..."
                />
              </div>
              {form.type === 'task' && (
                <div className="col-md-4">
                  <Form.Label>Hạn dự kiến</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.expected_deadline}
                    onChange={e => setForm(prev => ({ ...prev, expected_deadline: e.target.value }))}
                  />
                </div>
              )}
              {form.type === 'kpi' && (
                <>
                  <div className="col-md-4">
                    <Form.Label>Tháng KPI *</Form.Label>
                    <Form.Control
                      type="month"
                      value={form.kpi_month}
                      onChange={e => setForm(prev => ({ ...prev, kpi_month: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <Form.Label>Chỉ tiêu *</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={form.kpi_target}
                      onChange={e => setForm(prev => ({ ...prev, kpi_target: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}
              <div className="col-md-6">
                <Form.Label>Đính kèm (tuỳ chọn)</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={event => setFiles((event.target as HTMLInputElement).files)}
                />
                <div className="form-text">Tối đa 10MB mỗi file.</div>
              </div>
              <div className="col-md-6 d-flex align-items-end justify-content-end">
                <Button type="submit" disabled={!canSubmit} className="px-4">
                  {submitting ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                  Gửi đề xuất
                </Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Danh sách đề xuất</h5>
              <p className="text-muted mb-0">{meta.total} mục</p>
            </div>
          </div>
          {loading ? (
            <div className="text-center my-4"><Spinner animation="border" /></div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : proposals.length === 0 ? (
            <p className="text-muted">Chưa có đề xuất nào.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Loại</th>
                    <th>Thông tin</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(proposal => (
                    <tr key={proposal.id}>
                      <td>
                        <div className="fw-semibold">{proposal.title}</div>
                        <div className="text-muted small">
                          Tạo lúc {proposal.created_at ? new Date(proposal.created_at).toLocaleString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td>{proposal.type === 'task' ? 'Công việc' : 'KPI'}</td>
                      <td>
                        {proposal.type === 'task' && proposal.expected_deadline && (
                          <div>Hạn: {new Date(proposal.expected_deadline).toLocaleDateString('vi-VN')}</div>
                        )}
                        {proposal.type === 'kpi' && proposal.kpi_month && (
                          <div>Tháng: {proposal.kpi_month}</div>
                        )}
                        {proposal.kpi_target && <div>Chỉ tiêu: {proposal.kpi_target}</div>}
                        {proposal.priority && <div>Ưu tiên: {proposal.priority}</div>}
                      </td>
                      <td>
                        <span className={statusBadgeClass(proposal.status)}>
                          {proposal.status === 'pending' && 'Chờ duyệt'}
                          {proposal.status === 'approved' && 'Đã duyệt'}
                          {proposal.status === 'rejected' && 'Bị từ chối'}
                        </span>
                        {proposal.review_note && (
                          <div className="small text-muted mt-1">Ghi chú: {proposal.review_note}</div>
                        )}
                      </td>
                      <td className="text-end">
                        {proposal.status === 'pending' && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="me-2"
                            onClick={() => handleDelete(proposal)}
                          >
                            Xoá
                          </Button>
                        )}
                        {proposal.status !== 'pending' && !proposal.user_read_at && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleMarkRead(proposal)}
                          >
                            Đánh dấu đã xem
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta.last_page > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>Trang {meta.current_page}/{meta.last_page}</span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                >
                  Trước
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage(prev => Math.min(meta.last_page, prev + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
