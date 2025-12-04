import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';

type ProposalStatus = 'pending' | 'approved' | 'rejected';

type ProposalType = 'task' | 'kpi';

type Proposal = {
  id: number;
  type: ProposalType;
  title: string;
  description?: string;
  priority?: string;
  expected_deadline?: string | null;
  kpi_month?: string | null;
  kpi_target?: number | null;
  status: ProposalStatus;
  review_note?: string | null;
  user?: { id: number; name: string } | null;
};

type ReportItem = {
  id: number;
  title?: string;
  month?: string;
  locked?: boolean;
  user?: { id?: number; name?: string };
};

type RiskKpi = {
  id: number;
  name: string;
  owner?: string | null;
  percent: number;
  deadline?: string | null;
  days_left: number;
};

type BlockedTask = {
  id: number;
  title: string;
  owners: string[];
  priority?: string | null;
  deadline?: string | null;
  assigned_by?: string | null;
  status: string;
  is_overdue: boolean;
  days_overdue: number;
};

type SnapshotResponse = {
  month: string;
  risk_kpis: RiskKpi[];
  blocked_tasks: BlockedTask[];
};

type UserOption = { id: number; name: string; email?: string | null };

type DecisionAction = 'approve' | 'reject';

const priorityVariant: Record<string, string> = {
  'Khẩn cấp': 'danger',
  'Cao': 'warning',
  'Trung bình': 'info',
  'Thấp': 'secondary',
};

type ApprovalLog = {
  id: number;
  entity_type: string;
  entity_id?: number | null;
  entity_label?: string | null;
  action: string;
  actor_name?: string | null;
  actor_role?: string | null;
  payload?: Record<string, any> | null;
  created_at: string;
};

const actionLabelMap: Record<string, string> = {
  proposal_approved: 'Đã duyệt đề xuất',
  proposal_rejected: 'Đã từ chối đề xuất',
  report_unlocked: 'Gỡ chốt báo cáo',
  kpi_created: 'Tạo KPI',
  kpi_updated: 'Cập nhật KPI',
  kpi_deleted: 'Xoá KPI',
};

const entityLabelMap: Record<string, string> = {
  task_proposal: 'Đề xuất',
  monthly_summary: 'Báo cáo tháng',
  kpi: 'KPI',
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const summarizePayload = (payload?: Record<string, any> | null) => {
  if (!payload) return '—';
  const chunks: string[] = [];
  Object.entries(payload).forEach(([key, val]) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.entries(val as Record<string, any>).forEach(([childKey, childVal]) => {
        chunks.push(`${childKey}: ${formatValue(childVal)}`);
      });
    } else {
      chunks.push(`${key}: ${formatValue(val)}`);
    }
  });
  return chunks.length ? chunks.slice(0, 5).join(' | ') : '—';
};

export default function ApprovalCenterTab() {
  const [proposalLoading, setProposalLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [snapshotMonth, setSnapshotMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [users, setUsers] = useState<UserOption[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<ApprovalLog[]>([]);
  const [logMeta, setLogMeta] = useState<{ total: number }>({ total: 0 });
  const [logFilters, setLogFilters] = useState<{ entityType: string; action: string }>(() => ({ entityType: 'all', action: 'all' }));

  const currentRole = (
    typeof window !== 'undefined' && (window as any).currentUserRole
      ? String((window as any).currentUserRole)
      : ''
  ).trim();
  const canUseKpiHealth = currentRole === 'Trưởng phòng';

  const [decisionModal, setDecisionModal] = useState<{ show: boolean; proposal: Proposal | null; action: DecisionAction | null; note: string; linkTaskId: string; linkKpiId: string; submitting: boolean }>(
    { show: false, proposal: null, action: null, note: '', linkTaskId: '', linkKpiId: '', submitting: false }
  );

  const [taskModal, setTaskModal] = useState<{ show: boolean; task: BlockedTask | null; userIds: number[]; saving: boolean }>(
    { show: false, task: null, userIds: [], saving: false }
  );

  const [pingModal, setPingModal] = useState<{ show: boolean; task: BlockedTask | null; message: string; submitting: boolean }>(
    { show: false, task: null, message: '', submitting: false }
  );

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await axios.get<UserOption[]>('/api/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Không thể tải danh sách người dùng', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchProposals = async () => {
    setProposalLoading(true);
    try {
      const res = await axios.get('/management/proposals/data', { params: { status: 'pending', per_page: 5 } });
      setProposals(res.data?.data || []);
    } catch (error) {
      console.error('Không thể tải đề xuất', error);
      alert('Tải đề xuất thất bại');
    } finally {
      setProposalLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportLoading(true);
    try {
      const res = await axios.get('/management/reports/data', { params: { locked: 1, per_page: 5 } });
      setReports(res.data?.data || []);
    } catch (error) {
      console.error('Không thể tải báo cáo', error);
      alert('Tải báo cáo thất bại');
    } finally {
      setReportLoading(false);
    }
  };

  const fetchSnapshot = async () => {
    if (!canUseKpiHealth) return;
    setSnapshotLoading(true);
    try {
      const res = await axios.get<SnapshotResponse>('/management/kpi-health/snapshot', { params: { month: snapshotMonth } });
      setSnapshot(res.data);
    } catch (error) {
      console.error('Không thể tải KPI health snapshot', error);
      alert('Tải dữ liệu KPI health thất bại');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const fetchApprovalLogs = useCallback(async (filters?: { entityType: string; action: string }) => {
    const effectiveFilters = filters ?? logFilters;
    setLogsLoading(true);
    try {
      const params: Record<string, any> = { per_page: 8 };
      if (effectiveFilters.entityType !== 'all') {
        params.entity_type = effectiveFilters.entityType;
      }
      if (effectiveFilters.action !== 'all') {
        params.action = effectiveFilters.action;
      }
      const res = await axios.get('/management/approval-logs/data', { params });
      setLogs(res.data?.data || []);
      setLogMeta({ total: res.data?.total || 0 });
    } catch (error) {
      console.error('Không thể tải nhật ký phê duyệt', error);
      alert('Không thể tải nhật ký phê duyệt');
    } finally {
      setLogsLoading(false);
    }
  }, [logFilters]);

  useEffect(() => {
    fetchProposals();
    fetchReports();
    if (canUseKpiHealth) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseKpiHealth]);

  useEffect(() => {
    if (!canUseKpiHealth) {
      setSnapshot(null);
      setSnapshotLoading(false);
      return;
    }
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotMonth, canUseKpiHealth]);

  useEffect(() => {
    fetchApprovalLogs();
  }, [fetchApprovalLogs]);

  const resolveOwnerUserIds = useCallback(
    (owners: string[] = []) => {
      if (!owners.length || users.length === 0) return [];
      const normalized = owners
        .map(owner => owner?.trim().toLowerCase())
        .filter(Boolean) as string[];
      if (!normalized.length) return [];
      return users
        .filter(user => {
          const name = user.name?.trim().toLowerCase();
          const email = user.email?.trim().toLowerCase();
          return (name && normalized.includes(name)) || (email && normalized.includes(email));
        })
        .map(user => user.id);
    },
    [users]
  );

  const openDecisionModal = (proposal: Proposal, action: DecisionAction) => {
    setDecisionModal({
      show: true,
      proposal,
      action,
      note: '',
      linkTaskId: '',
      linkKpiId: '',
      submitting: false,
    });
  };

  const closeDecisionModal = () => {
    setDecisionModal(prev => ({ ...prev, show: false }));
  };

  const submitDecision = async () => {
    if (!decisionModal.proposal || !decisionModal.action) return;
    setDecisionModal(prev => ({ ...prev, submitting: true }));
    try {
      const { proposal, action, note, linkTaskId, linkKpiId } = decisionModal;
      await axios.post(`/management/proposals/${proposal.id}/${action}`, {
        review_note: note || undefined,
        linked_task_id: proposal.type === 'task' ? linkTaskId || undefined : undefined,
        linked_kpi_id: proposal.type === 'kpi' ? linkKpiId || undefined : undefined,
      });
      closeDecisionModal();
      fetchProposals();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || 'Không thể cập nhật đề xuất';
      alert(msg);
      setDecisionModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleUnlockReport = async (reportId: number) => {
    try {
      await axios.post(`/management/reports/${reportId}/unlock`);
      fetchReports();
    } catch (error) {
      console.error(error);
      alert('Không thể gỡ chốt báo cáo');
    }
  };

  const openTaskModal = (task: BlockedTask) => {
    const resolved = resolveOwnerUserIds(task.owners);
    setTaskModal({ show: true, task, userIds: resolved, saving: false });
  };

  const closeTaskModal = () => setTaskModal(prev => ({ ...prev, show: false }));

  const submitTaskReassign = async () => {
    if (!taskModal.task || taskModal.userIds.length === 0) return;
    setTaskModal(prev => ({ ...prev, saving: true }));
    try {
      await axios.post(
        `/management/kpi-health/tasks/${taskModal.task.id}/reassign`,
        { user_ids: taskModal.userIds },
        { headers: { 'X-CSRF-TOKEN': csrfToken } }
      );
      closeTaskModal();
      fetchSnapshot();
    } catch (error) {
      console.error(error);
      alert('Không thể chuyển giao công việc');
      setTaskModal(prev => ({ ...prev, saving: false }));
    }
  };

  const openPingModal = (task: BlockedTask) => {
    setPingModal({ show: true, task, message: `Nhờ cập nhật tiến độ cho task "${task.title}"`, submitting: false });
  };

  const closePingModal = () => setPingModal(prev => ({ ...prev, show: false }));

  const submitPing = async () => {
    if (!pingModal.task || !pingModal.message.trim()) return;
    setPingModal(prev => ({ ...prev, submitting: true }));
    try {
      await axios.post(
        `/management/kpi-health/tasks/${pingModal.task.id}/ping`,
        { message: pingModal.message.trim() },
        { headers: { 'X-CSRF-TOKEN': csrfToken } }
      );
      closePingModal();
    } catch (error) {
      console.error(error);
      alert('Không thể gửi ping');
      setPingModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const proposalSection = (
    <Card className="shadow-sm h-100">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Đề xuất chờ duyệt</h5>
          <small className="text-muted">Task & KPI do nhân viên gửi lên</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={fetchProposals} disabled={proposalLoading}>
            {proposalLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button variant="link" size="sm" href="/management/proposals" target="_blank" rel="noreferrer">
            Xem tất cả
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Người gửi</th>
                <th>Chi tiết</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {proposalLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" /> Đang tải...
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">Không có đề xuất nào</td>
                </tr>
              ) : (
                proposals.map(item => (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.title}</td>
                    <td>{item.type === 'task' ? 'Công việc' : 'KPI'}</td>
                    <td>{item.user?.name || '—'}</td>
                    <td>
                      {item.priority && <div>Ưu tiên: {item.priority}</div>}
                      {item.expected_deadline && <div>Hạn: {new Date(item.expected_deadline).toLocaleDateString('vi-VN')}</div>}
                      {item.kpi_month && <div>Tháng KPI: {item.kpi_month}</div>}
                      {item.kpi_target && <div>Chỉ tiêu: {item.kpi_target}</div>}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <Button size="sm" variant="outline-success" onClick={() => openDecisionModal(item, 'approve')}>
                          Duyệt
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => openDecisionModal(item, 'reject')}>
                          Từ chối
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  const reportsSection = (
    <Card className="shadow-sm h-100">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Báo cáo đã chốt</h5>
          <small className="text-muted">Gỡ chốt nhanh các báo cáo bị khoá</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={fetchReports} disabled={reportLoading}>
            {reportLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button variant="link" size="sm" href="/management/reports" target="_blank" rel="noreferrer">
            Xem tất cả
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Tiêu đề</th>
                <th>Người gửi</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reportLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" /> Đang tải...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">Không có báo cáo đã chốt</td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    <td>{report.month || '—'}</td>
                    <td className="fw-semibold">{report.title || '—'}</td>
                    <td>{report.user?.name || '—'}</td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-secondary" className="me-2" href={`/summaries/${report.id}`} target="_blank" rel="noreferrer">
                        Xem
                      </Button>
                      <Button size="sm" variant="outline-primary" onClick={() => handleUnlockReport(report.id)}>
                        Gỡ chốt
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  const blockedTasks = snapshot?.blocked_tasks || [];

  const tasksSection = (
    <Card className="shadow-sm h-100">
      <Card.Header className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Task rủi ro</h5>
          <small className="text-muted">Các công việc đang bị nghẽn tiến độ</small>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <Form.Control
            type="month"
            value={snapshotMonth}
            max={new Date().toISOString().slice(0, 7)}
            onChange={e => setSnapshotMonth(e.target.value)}
            style={{ width: 140 }}
          />
          <Button variant="outline-secondary" size="sm" onClick={fetchSnapshot} disabled={snapshotLoading}>
            {snapshotLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button variant="link" size="sm" href="/management/kpi-health" target="_blank" rel="noreferrer">
            Mở KPI Health
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Ưu tiên</th>
                <th>Chủ trì</th>
                <th>Trạng thái</th>
                <th>Hạn</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {snapshotLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" /> Đang tải...
                  </td>
                </tr>
              ) : blockedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">Không có task nào bị nghẽn</td>
                </tr>
              ) : (
                blockedTasks.slice(0, 5).map(task => (
                  <tr key={task.id}>
                    <td className="fw-semibold">{task.title}</td>
                    <td>
                      {task.priority ? (
                        <Badge bg={priorityVariant[task.priority] || 'secondary'}>{task.priority}</Badge>
                      ) : '—'}
                    </td>
                    <td>{task.owners.length ? task.owners.join(', ') : '—'}</td>
                    <td>
                      <Badge bg={task.is_overdue ? 'danger' : 'warning'}>
                        {task.status}
                      </Badge>
                    </td>
                    <td>
                      <div>{task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '—'}</div>
                      <small className={task.is_overdue ? 'text-danger' : 'text-muted'}>
                        {task.is_overdue ? `${task.days_overdue} ngày trễ` : `Còn ${Math.abs(task.days_overdue)} ngày`}
                      </small>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <Button size="sm" variant="outline-primary" onClick={() => openTaskModal(task)}>
                          Chuyển giao
                        </Button>
                        <Button size="sm" variant="outline-warning" onClick={() => openPingModal(task)}>
                          Ping
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  const logsSection = (
    <Card className="shadow-sm h-100">
      <Card.Header className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Nhật ký phê duyệt</h5>
          <small className="text-muted">{`Tổng ${logMeta.total} bản ghi khả dụng`}</small>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Form.Select
            size="sm"
            value={logFilters.entityType}
            onChange={e => setLogFilters(prev => ({ ...prev, entityType: e.target.value }))}
            className="w-auto"
          >
            <option value="all">Tất cả loại</option>
            <option value="task_proposal">Đề xuất</option>
            <option value="monthly_summary">Báo cáo</option>
            <option value="kpi">KPI</option>
          </Form.Select>
          <Form.Select
            size="sm"
            value={logFilters.action}
            onChange={e => setLogFilters(prev => ({ ...prev, action: e.target.value }))}
            className="w-auto"
          >
            <option value="all">Tất cả thao tác</option>
            <option value="proposal_approved">Đã duyệt</option>
            <option value="proposal_rejected">Đã từ chối</option>
            <option value="report_unlocked">Gỡ chốt báo cáo</option>
            <option value="kpi_created">Tạo KPI</option>
            <option value="kpi_updated">Cập nhật KPI</option>
            <option value="kpi_deleted">Xoá KPI</option>
          </Form.Select>
          <Button variant="outline-secondary" size="sm" onClick={() => fetchApprovalLogs()} disabled={logsLoading}>
            {logsLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Sự kiện</th>
                <th>Đối tượng</th>
                <th>Người thao tác</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" /> Đang tải...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">Chưa có thao tác nào</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="fw-semibold">{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                      <small className="text-muted">{entityLabelMap[log.entity_type] || log.entity_type}</small>
                    </td>
                    <td>
                      <div className="fw-semibold">{actionLabelMap[log.action] || log.action}</div>
                      <small className="text-muted text-uppercase">{log.action}</small>
                    </td>
                    <td>
                      <div className="fw-semibold">{log.entity_label || (log.entity_id ? `#${log.entity_id}` : '—')}</div>
                      <div className="small text-muted mt-1">{summarizePayload(log.payload)}</div>
                    </td>
                    <td>
                      <div>{log.actor_name || '—'}</div>
                      <small className="text-muted">{log.actor_role || ''}</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  const decisionLabel = useMemo(() => {
    if (!decisionModal.action) return '';
    return decisionModal.action === 'approve' ? 'Phê duyệt' : 'Từ chối';
  }, [decisionModal.action]);

  return (
    <div className="approval-center-tab">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="mb-1">Approval Center</h2>
          <p className="text-muted mb-0">Gom nhanh các thao tác duyệt đề xuất, gỡ chốt báo cáo và xử lý task nghẽn.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => {
            fetchProposals();
            fetchReports();
            if (canUseKpiHealth) {
              fetchSnapshot();
            }
            fetchApprovalLogs();
          }}>
            Làm mới tất cả
          </Button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12">
          {proposalSection}
        </div>
        <div className={canUseKpiHealth ? 'col-xl-6 col-lg-12' : 'col-12'}>
          {reportsSection}
        </div>
        {canUseKpiHealth && (
          <div className="col-xl-6 col-lg-12">
            {tasksSection}
          </div>
        )}
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          {logsSection}
        </div>
      </div>

      <Modal show={decisionModal.show} onHide={closeDecisionModal}>
        <Modal.Header closeButton>
          <Modal.Title>{decisionLabel} đề xuất</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Đang xử lý: <strong>{decisionModal.proposal?.title}</strong></p>
          <Form.Group className="mb-3">
            <Form.Label>Ghi chú gửi nhân viên</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={decisionModal.note}
              onChange={e => setDecisionModal(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Nêu lý do / hướng dẫn cụ thể"
            />
          </Form.Group>
          {decisionModal.action === 'approve' && decisionModal.proposal?.type === 'task' && (
            <Form.Group className="mb-3">
              <Form.Label>Liên kết Task hiện có (tuỳ chọn)</Form.Label>
              <Form.Control
                type="number"
                value={decisionModal.linkTaskId}
                onChange={e => setDecisionModal(prev => ({ ...prev, linkTaskId: e.target.value }))}
                placeholder="Nhập ID task thực tế"
              />
            </Form.Group>
          )}
          {decisionModal.action === 'approve' && decisionModal.proposal?.type === 'kpi' && (
            <Form.Group className="mb-3">
              <Form.Label>Liên kết KPI hiện có (tuỳ chọn)</Form.Label>
              <Form.Control
                type="number"
                value={decisionModal.linkKpiId}
                onChange={e => setDecisionModal(prev => ({ ...prev, linkKpiId: e.target.value }))}
                placeholder="Nhập ID KPI thực tế"
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDecisionModal}>Huỷ</Button>
          <Button variant={decisionModal.action === 'approve' ? 'success' : 'danger'} onClick={submitDecision} disabled={decisionModal.submitting}>
            {decisionModal.submitting ? 'Đang xử lý...' : decisionLabel}
          </Button>
        </Modal.Footer>
      </Modal>

      {canUseKpiHealth && (
        <>
          <Modal show={taskModal.show} onHide={closeTaskModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Chuyển giao công việc</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-3">Task: <strong>{taskModal.task?.title}</strong></p>
              <Form.Group>
                <Form.Label>Người nhận mới</Form.Label>
                <Form.Select
                  multiple
                  disabled={usersLoading}
                  value={taskModal.userIds.map(String)}
                  onChange={e => {
                    const next = Array.from(e.target.selectedOptions).map(opt => Number(opt.value));
                    setTaskModal(prev => ({ ...prev, userIds: next }));
                  }}
                  htmlSize={6}
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </Form.Select>
                <small className="text-muted d-block mt-2">Danh sách người nhận sẽ được thay thế.</small>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeTaskModal}>Huỷ</Button>
              <Button variant="primary" onClick={submitTaskReassign} disabled={taskModal.userIds.length === 0 || taskModal.saving}>
                {taskModal.saving ? 'Đang cập nhật...' : 'Chuyển giao'}
              </Button>
            </Modal.Footer>
          </Modal>

          <Modal show={pingModal.show} onHide={closePingModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Ping chủ trì</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-3">Task: <strong>{pingModal.task?.title}</strong></p>
              <Form.Group>
                <Form.Label>Nội dung</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={pingModal.message}
                  onChange={e => setPingModal(prev => ({ ...prev, message: e.target.value }))}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closePingModal}>Huỷ</Button>
              <Button variant="warning" onClick={submitPing} disabled={!pingModal.message.trim() || pingModal.submitting}>
                {pingModal.submitting ? 'Đang gửi...' : 'Gửi ping'}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </div>
  );
}
