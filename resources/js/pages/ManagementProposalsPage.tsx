import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Form, Modal, Spinner } from 'react-bootstrap';

type ProposalStatus = 'pending' | 'approved' | 'rejected';

interface Proposal {
  id: number;
  type: 'task' | 'kpi';
  title: string;
  description?: string;
  priority?: string;
  expected_deadline?: string | null;
  kpi_month?: string | null;
  kpi_target?: number | null;
  attachments?: Array<{ name?: string; url?: string }>;
  status: ProposalStatus;
  review_note?: string | null;
  review_note_preview?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  reviewer?: { id: number; name: string } | null;
  user?: { id: number; name: string; avatar?: string | null } | null;
}

interface ProposalCounts {
  pending: number;
  approved: number;
  rejected: number;
}

interface ListResponse {
  data: Proposal[];
  meta: { counts: ProposalCounts };
  current_page: number;
  last_page: number;
  total: number;
}

interface DecisionPayload {
  review_note?: string;
  linked_task_id?: string;
  linked_kpi_id?: string;
}

export default function ManagementProposalsPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [filters, setFilters] = useState({ status: 'pending', type: '' });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ counts: ProposalCounts; current_page: number; last_page: number; total: number }>(
    { counts: { pending: 0, approved: 0, rejected: 0 }, current_page: 1, last_page: 1, total: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [modalProposal, setModalProposal] = useState<Proposal | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionPayload, setDecisionPayload] = useState<DecisionPayload>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get<ListResponse>('/management/proposals/data', {
        params: {
          status: filters.status || undefined,
          type: filters.type || undefined,
          page,
        },
      });
      setItems(res.data.data || []);
      setMeta({
        counts: res.data.meta?.counts || { pending: 0, approved: 0, rejected: 0 },
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      });
    } catch (err) {
      console.error(err);
      alert('Không thể tải danh sách đề xuất.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.type]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const openDecisionModal = (proposal: Proposal, action: 'approve' | 'reject') => {
    setModalProposal(proposal);
    setDecisionAction(action);
    setDecisionPayload({ review_note: '', linked_task_id: '', linked_kpi_id: '' });
  };

  const handleDecision = async () => {
    if (!modalProposal || !decisionAction) return;
    setSubmitting(true);
    try {
      const url = `/management/proposals/${modalProposal.id}/${decisionAction}`;
      await axios.post(url, decisionPayload);
      setModalProposal(null);
      setDecisionAction(null);
      setDecisionPayload({});
      await fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Không thể cập nhật đề xuất.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const decisionLabel = decisionAction === 'approve' ? 'Phê duyệt' : 'Từ chối';

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Phê duyệt đề xuất</h2>
          <p className="text-muted mb-0">Kiểm soát các đề xuất công việc/KPI do nhân viên gửi lên.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Form.Select
            value={filters.type}
            onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
            style={{ width: 180 }}
          >
            <option value="">Tất cả loại</option>
            <option value="task">Công việc</option>
            <option value="kpi">KPI</option>
          </Form.Select>
          <Form.Select
            value={filters.status}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{ width: 180 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt ({meta.counts.pending})</option>
            <option value="approved">Đã duyệt ({meta.counts.approved})</option>
            <option value="rejected">Đã từ chối ({meta.counts.rejected})</option>
          </Form.Select>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {[
          { key: 'pending' as ProposalStatus, label: 'Chờ duyệt', variant: 'warning' },
          { key: 'approved' as ProposalStatus, label: 'Đã duyệt', variant: 'success' },
          { key: 'rejected' as ProposalStatus, label: 'Bị từ chối', variant: 'danger' },
        ].map(card => (
          <div className="col-md-4" key={card.key}>
            <Card className={`border-${card.variant} shadow-sm`}>
              <Card.Body>
                <div className="text-uppercase text-muted small">{card.label}</div>
                <div className="display-6 fw-bold">{meta.counts[card.key] ?? 0}</div>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center my-4"><Spinner animation="border" /></div>
          ) : items.length === 0 ? (
            <p className="text-muted">Không có đề xuất nào phù hợp bộ lọc.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Loại</th>
                    <th>Người gửi</th>
                    <th>Chi tiết</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(proposal => (
                    <tr key={proposal.id}>
                      <td>
                        <div className="fw-semibold">{proposal.title}</div>
                        <div className="text-muted small">Tạo lúc {proposal.created_at ? new Date(proposal.created_at).toLocaleString('vi-VN') : '—'}</div>
                      </td>
                      <td>{proposal.type === 'task' ? 'Công việc' : 'KPI'}</td>
                      <td>
                        <div className="fw-semibold">{proposal.user?.name || '—'}</div>
                      </td>
                      <td>
                        {proposal.priority && <div>Ưu tiên: {proposal.priority}</div>}
                        {proposal.expected_deadline && <div>Hạn: {new Date(proposal.expected_deadline).toLocaleDateString('vi-VN')}</div>}
                        {proposal.kpi_month && <div>Tháng KPI: {proposal.kpi_month}</div>}
                        {proposal.kpi_target && <div>Chỉ tiêu: {proposal.kpi_target}</div>}
                      </td>
                      <td>
                        <span className={`badge ${proposal.status === 'pending' ? 'bg-warning text-dark' : proposal.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                          {proposal.status === 'pending' && 'Chờ duyệt'}
                          {proposal.status === 'approved' && 'Đã duyệt'}
                          {proposal.status === 'rejected' && 'Đã từ chối'}
                        </span>
                        {proposal.review_note && (
                          <div className="small text-muted mt-1">Ghi chú: {proposal.review_note}</div>
                        )}
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => setModalProposal(proposal)}
                        >
                          Chi tiết
                        </Button>
                        {proposal.status === 'pending' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => openDecisionModal(proposal, 'approve')}
                            >
                              Duyệt
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDecisionModal(proposal, 'reject')}
                            >
                              Từ chối
                            </Button>
                          </>
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
                <Button variant="outline-secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                  Trước
                </Button>
                <Button variant="outline-secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage(prev => Math.min(meta.last_page, prev + 1))}>
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!modalProposal && !decisionAction} onHide={() => setModalProposal(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết đề xuất</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>{modalProposal?.title}</h5>
          <p className="text-muted">Loại: {modalProposal?.type === 'task' ? 'Công việc' : 'KPI'}</p>
          <p>{modalProposal?.description || 'Không có mô tả.'}</p>
          {modalProposal?.attachments?.length ? (
            <div>
              <div className="fw-semibold">Đính kèm:</div>
              <ul>
                {modalProposal.attachments.map((file, idx) => (
                  <li key={idx}>
                    <a href={file.url} target="_blank" rel="noreferrer">{file.name || 'File'}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Modal.Body>
      </Modal>

      <Modal show={!!decisionAction} onHide={() => { setDecisionAction(null); setModalProposal(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>{decisionLabel} đề xuất</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Đang xử lý: <strong>{modalProposal?.title}</strong></p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Ghi chú gửi nhân viên</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={decisionPayload.review_note || ''}
                onChange={e => setDecisionPayload(prev => ({ ...prev, review_note: e.target.value }))}
                placeholder="Nêu rõ lý do phê duyệt/từ chối, hướng dẫn tiếp theo..."
              />
            </Form.Group>
            {decisionAction === 'approve' && (
              <>
                {modalProposal?.type === 'task' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Liên kết Task hiện có (tuỳ chọn)</Form.Label>
                    <Form.Control
                      type="number"
                      value={decisionPayload.linked_task_id || ''}
                      onChange={e => setDecisionPayload(prev => ({ ...prev, linked_task_id: e.target.value }))}
                      placeholder="Nhập ID task thực tế vừa tạo"
                    />
                  </Form.Group>
                )}
                {modalProposal?.type === 'kpi' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Liên kết KPI hiện có (tuỳ chọn)</Form.Label>
                    <Form.Control
                      type="number"
                      value={decisionPayload.linked_kpi_id || ''}
                      onChange={e => setDecisionPayload(prev => ({ ...prev, linked_kpi_id: e.target.value }))}
                      placeholder="Nhập ID KPI tương ứng"
                    />
                  </Form.Group>
                )}
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setDecisionAction(null); setModalProposal(null); }}>
            Huỷ
          </Button>
          <Button variant={decisionAction === 'approve' ? 'success' : 'danger'} onClick={handleDecision} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : decisionLabel}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
