import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Summary {
  total: number;
  on_track: number;
  at_risk: number;
  critical: number;
  avg_percent: number;
  month_label: string;
}

interface DistributionBuckets {
  excellent: number;
  good: number;
  warning: number;
  critical: number;
}

interface RiskKpi {
  id: number;
  name: string;
  owner?: string | null;
  percent: number;
  deadline?: string | null;
  days_left: number;
  note?: string | null;
}

interface BlockedTask {
  id: number;
  title: string;
  priority?: string | null;
  deadline?: string | null;
  assigned_by?: string | null;
  owners: string[];
  status: string;
  is_overdue: boolean;
  days_overdue: number;
}

interface SnapshotResponse {
  month: string;
  summary: Summary;
  distribution: DistributionBuckets;
  risk_kpis: RiskKpi[];
  blocked_tasks: BlockedTask[];
}

interface Props {
  defaultMonth: string;
}

interface UserOption {
  id: number;
  name: string;
  email?: string | null;
}

const distributionLabels: Record<keyof DistributionBuckets, string> = {
  excellent: '>= 95% (Xuất sắc)',
  good: '85% - 94%',
  warning: '70% - 84%',
  critical: '< 70%',
};

const priorityVariant: Record<string, string> = {
  'Khẩn cấp': 'danger',
  'Cao': 'warning',
  'Trung bình': 'info',
  'Thấp': 'secondary',
};

export default function ManagementKpiHealthPage({ defaultMonth }: Props) {
  const [month, setMonth] = useState(() => defaultMonth || new Date().toISOString().slice(0, 7));
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [kpiModal, setKpiModal] = useState<{ show: boolean; kpi: RiskKpi | null; userId: string }>({ show: false, kpi: null, userId: '' });
  const [taskModal, setTaskModal] = useState<{ show: boolean; task: BlockedTask | null; userIds: number[] }>({ show: false, task: null, userIds: [] });
  const [pingModal, setPingModal] = useState<{ show: boolean; task: BlockedTask | null; message: string }>({ show: false, task: null, message: '' });
  const [savingKpi, setSavingKpi] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const fetchSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<SnapshotResponse>('/management/kpi-health/snapshot', {
        params: { month },
      });
      setSnapshot(response.data);
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || 'Không thể tải dữ liệu KPI health.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await axios.get<UserOption[]>('/api/users');
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Không thể tải danh sách nhân sự', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

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

  const distributionData = useMemo(() => {
    if (!snapshot?.distribution) return [];
    return (Object.keys(distributionLabels) as Array<keyof DistributionBuckets>).map(key => ({
      bucket: distributionLabels[key],
      value: snapshot.distribution[key] || 0,
    }));
  }, [snapshot]);

  const summary = snapshot?.summary;

  const monthInputMax = new Date().toISOString().slice(0, 7);

  const handleOpenKpiModal = (kpi: RiskKpi) => {
    setKpiModal({ show: true, kpi, userId: '' });
  };

  const handleOpenTaskModal = (task: BlockedTask) => {
    setTaskModal({ show: true, task, userIds: resolveOwnerUserIds(task.owners) });
  };

  const handleOpenPingModal = (task: BlockedTask) => {
    setPingModal({ show: true, task, message: `Nhờ cập nhật tiến độ cho task "${task.title}"` });
  };

  const closeKpiModal = () => setKpiModal(prev => ({ ...prev, show: false }));
  const closeTaskModal = () => setTaskModal(prev => ({ ...prev, show: false }));
  const closePingModal = () => setPingModal(prev => ({ ...prev, show: false }));

  useEffect(() => {
    if (!taskModal.show || !taskModal.task || taskModal.userIds.length > 0) return;
    const resolved = resolveOwnerUserIds(taskModal.task.owners);
    if (resolved.length) {
      setTaskModal(prev => ({ ...prev, userIds: resolved }));
    }
  }, [taskModal.show, taskModal.task, taskModal.userIds.length, resolveOwnerUserIds]);

  const handleSubmitKpiReassign = async () => {
    if (!kpiModal.kpi || !kpiModal.userId) return;
    setSavingKpi(true);
    try {
      await axios.post(
        `/management/kpi-health/kpis/${kpiModal.kpi.id}/reassign`,
        { user_id: Number(kpiModal.userId) },
        { headers: { 'X-CSRF-TOKEN': csrfToken } }
      );
      closeKpiModal();
      await fetchSnapshot();
    } catch (err) {
      console.error(err);
      alert('Không thể chuyển người phụ trách KPI.');
    } finally {
      setSavingKpi(false);
    }
  };

  const handleSubmitTaskReassign = async () => {
    if (!taskModal.task || taskModal.userIds.length === 0) return;
    setSavingTask(true);
    try {
      await axios.post(
        `/management/kpi-health/tasks/${taskModal.task.id}/reassign`,
        { user_ids: taskModal.userIds },
        { headers: { 'X-CSRF-TOKEN': csrfToken } }
      );
      closeTaskModal();
      await fetchSnapshot();
    } catch (err) {
      console.error(err);
      alert('Không thể chuyển giao công việc.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleSubmitPing = async () => {
    if (!pingModal.task || !pingModal.message.trim()) return;
    setPingLoading(true);
    try {
      await axios.post(
        `/management/kpi-health/tasks/${pingModal.task.id}/ping`,
        { message: pingModal.message.trim() },
        { headers: { 'X-CSRF-TOKEN': csrfToken } }
      );
      closePingModal();
    } catch (err) {
      console.error(err);
      alert('Không thể gửi ping, thử lại sau.');
    } finally {
      setPingLoading(false);
    }
  };

  const openMeetingPlanner = (kpi: RiskKpi) => {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Coaching KPI - ${kpi.name}`
    )}&details=${encodeURIComponent('Trao đổi nhanh về KPI đang rủi ro.')}&dates=${formatDate(start)}/${formatDate(end)}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="kpi-health-page">
      <Card className="shadow-sm mb-4">
        <Card.Body className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div>
            <h4 className="mb-1">Báo cáo sức khỏe KPI</h4>
            <p className="text-muted mb-0">Tập trung theo tháng để ưu tiên các KPI/Task bị nghẽn.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <input
              type="month"
              className="form-control"
              style={{ minWidth: 180 }}
              max={monthInputMax}
              value={month}
              onChange={e => setMonth(e.target.value)}
            />
            <Button variant="outline-primary" onClick={fetchSnapshot} disabled={loading}>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {loading && !snapshot ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {[{
              label: 'Tổng KPI',
              value: summary?.total ?? 0,
              helper: summary?.month_label || '',
              variant: 'primary',
            }, {
              label: 'Điểm trung bình',
              value: `${summary?.avg_percent ?? 0}%`,
              helper: 'Yêu cầu >= 90%',
              variant: 'success',
            }, {
              label: 'Đạt chuẩn (>=90%)',
              value: summary?.on_track ?? 0,
              helper: 'On Track',
              variant: 'success',
            }, {
              label: 'Cảnh báo (70-90%)',
              value: summary?.at_risk ?? 0,
              helper: 'Cần coaching',
              variant: 'warning',
            }, {
              label: 'Nguy cấp (<70%)',
              value: summary?.critical ?? 0,
              helper: 'Ưu tiên xử lý',
              variant: 'danger',
            }].map((card, idx) => (
              <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6" key={`${card.label}-${idx}`}>
                <Card className={`border-${card.variant} shadow-sm h-100`}>
                  <Card.Body>
                    <div className="text-muted text-uppercase small">{card.label}</div>
                    <div className="display-6 fw-bold">{card.value}</div>
                    <div className="text-muted small">{card.helper}</div>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-5">
              <Card className="h-100 shadow-sm">
                <Card.Header className="fw-semibold">Phân bổ hiệu suất</Card.Header>
                <Card.Body>
                  {distributionData.length === 0 ? (
                    <p className="text-muted mb-0">Chưa có dữ liệu cho tháng này.</p>
                  ) : (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart data={distributionData} layout="vertical" margin={{ left: 5, right: 20, top: 5, bottom: 5 }}>
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="bucket" type="category" width={150} tick={{ fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${entry.bucket}`} fill={['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'][index] || '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>

            <div className="col-lg-7">
              <Card className="h-100 shadow-sm">
                <Card.Header className="fw-semibold">Top KPI rủi ro</Card.Header>
                <Card.Body className="p-0">
                  {snapshot?.risk_kpis?.length ? (
                    <div className="table-responsive">
                      <Table hover className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Tên KPI</th>
                            <th>Phụ trách</th>
                            <th>% HT</th>
                            <th>Hạn</th>
                            <th>Ghi chú</th>
                            <th className="text-end">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.risk_kpis.map(kpi => (
                            <tr key={kpi.id}>
                              <td className="fw-semibold">{kpi.name}</td>
                              <td>{kpi.owner || '—'}</td>
                              <td>
                                <Badge bg={kpi.percent >= 90 ? 'success' : kpi.percent >= 70 ? 'warning' : 'danger'}>
                                  {kpi.percent}%
                                </Badge>
                              </td>
                              <td>
                                <div>{kpi.deadline ? new Date(kpi.deadline).toLocaleDateString('vi-VN') : '—'}</div>
                                <small className={kpi.days_left < 0 ? 'text-danger' : 'text-muted'}>
                                  {kpi.days_left === 0 && 'Đến hạn hôm nay'}
                                  {kpi.days_left > 0 && `Còn ${kpi.days_left} ngày`}
                                  {kpi.days_left < 0 && `Đã trễ ${Math.abs(kpi.days_left)} ngày`}
                                </small>
                              </td>
                              <td className="text-truncate" style={{ maxWidth: 180 }}>{kpi.note || '—'}</td>
                              <td className="text-end">
                                <div className="d-flex gap-2 justify-content-end flex-wrap">
                                  <Button variant="outline-primary" size="sm" onClick={() => handleOpenKpiModal(kpi)}>
                                    Reassign
                                  </Button>
                                  <Button variant="outline-secondary" size="sm" onClick={() => openMeetingPlanner(kpi)}>
                                    Tạo cuộc họp
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted m-3">Không có KPI nào nằm trong nhóm cảnh báo.</p>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>

          <Card className="shadow-sm">
            <Card.Header className="fw-semibold">Công việc có nguy cơ chậm tiến độ</Card.Header>
            <Card.Body className="p-0">
              {snapshot?.blocked_tasks?.length ? (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Tiêu đề</th>
                        <th>Ưu tiên</th>
                        <th>Trạng thái</th>
                        <th>Chủ trì</th>
                        <th>Người giao</th>
                        <th>Hạn</th>
                        <th className="text-end">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.blocked_tasks.map(task => (
                        <tr key={task.id}>
                          <td className="fw-semibold">{task.title}</td>
                          <td>
                            {task.priority ? (
                              <Badge bg={priorityVariant[task.priority] || 'secondary'}>{task.priority}</Badge>
                            ) : '—'}
                          </td>
                          <td>
                            <Badge bg={task.is_overdue ? 'danger' : 'warning'}>
                              {task.status}
                            </Badge>
                          </td>
                          <td>
                            {task.owners.length ? task.owners.join(', ') : '—'}
                          </td>
                          <td>{task.assigned_by || '—'}</td>
                          <td>
                            <div>{task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '—'}</div>
                            <small className={task.is_overdue ? 'text-danger' : 'text-muted'}>
                              {task.is_overdue
                                ? `${task.days_overdue} ngày trễ`
                                : task.deadline
                                  ? `Còn ${Math.abs(task.days_overdue)} ngày`
                                  : ''}
                            </small>
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-2 flex-wrap justify-content-end">
                              <Button variant="outline-primary" size="sm" onClick={() => handleOpenTaskModal(task)}>
                                Chuyển giao
                              </Button>
                              <Button variant="outline-warning" size="sm" onClick={() => handleOpenPingModal(task)}>
                                Ping chủ trì
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted m-3">Không có công việc nào bị nghẽn trong tháng này.</p>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <Modal show={kpiModal.show} onHide={closeKpiModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Chuyển KPI rủi ro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">KPI: <strong>{kpiModal.kpi?.name}</strong></p>
          <Form.Group className="mb-3">
            <Form.Label>Chọn người phụ trách mới</Form.Label>
            <Form.Select
              disabled={loadingUsers}
              value={kpiModal.userId}
              onChange={e => setKpiModal(prev => ({ ...prev, userId: e.target.value }))}
            >
              <option value="">-- Chọn nhân sự --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          {loadingUsers && <small className="text-muted">Đang tải danh sách nhân sự...</small>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeKpiModal}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={handleSubmitKpiReassign} disabled={!kpiModal.userId || savingKpi}>
            {savingKpi ? 'Đang chuyển...' : 'Chuyển người phụ trách'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={taskModal.show} onHide={closeTaskModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Chuyển giao công việc</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Task: <strong>{taskModal.task?.title}</strong></p>
          <Form.Group>
            <Form.Label>Chọn người nhận (thay thế toàn bộ)</Form.Label>
            <Form.Select
              multiple
              htmlSize={6}
              value={taskModal.userIds.map(String)}
              onChange={e => {
                const values = Array.from(e.target.selectedOptions).map(opt => Number(opt.value));
                setTaskModal(prev => ({ ...prev, userIds: values }));
              }}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <small className="text-muted d-block mt-2">
            * Danh sách người nhận hiện tại sẽ được thay thế bằng lựa chọn mới.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeTaskModal}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={handleSubmitTaskReassign} disabled={taskModal.userIds.length === 0 || savingTask}>
            {savingTask ? 'Đang cập nhật...' : 'Chuyển giao'}
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
            <Form.Label>Nội dung gửi</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={pingModal.message}
              onChange={e => setPingModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Nhập nội dung nhắc nhở"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closePingModal}>
            Huỷ
          </Button>
          <Button variant="warning" onClick={handleSubmitPing} disabled={!pingModal.message.trim() || pingLoading}>
            {pingLoading ? 'Đang gửi...' : 'Gửi ping'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
