import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import AsyncDropdownSelect from "./AsyncDropdownSelect";
import Swal from "sweetalert2";

const formatMonthValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof value === "string" && value.length >= 7) {
    return value.slice(0, 7);
  }
  return "";
};

const formatMonthLabel = (value) => {
  if (!value) return "";
  const date = new Date(`${value}-01T00:00:00`);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  }
  return value;
};

const buildTaskRow = (task = {}) => ({
  title: task.title || "",
  goal: task.goal ?? task.target ?? "",
  actual: task.actual ?? task.result ?? "",
});

const getCompletionPercent = (task) => {
  const goal = Number(task.goal) || 0;
  const actual = Number(task.actual) || 0;
  if (goal <= 0 && actual <= 0) return 0;
  if (goal <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / goal) * 100));
};

const toNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatPercentValue = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
};

export default function KpiDetailModal({ kpiId, onDeleted, onClose, reloadKpis }) {
  const [form, setForm] = useState(null);
  const [summary, setSummary] = useState(null);
  const [readOnly, setReadOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

  useEffect(() => {
    fetch(`/kpis/${kpiId}/json`, { headers: { Accept: "application/json" } })
      .then(res => res.json())
      .then(({ kpi, tasks, overallProgress }) => {
        const month = formatMonthValue(kpi.start_date || kpi.end_date);
        const normalized = (Array.isArray(tasks) ? tasks : [])
          .map(t => buildTaskRow({ title: t.title, goal: t.target, actual: t.actual }));

        setForm({
          month,
          name: kpi.name,
          note: kpi.note || "",
          tasks: normalized.length ? normalized : [buildTaskRow()],
        });

        setSummary({
          monthLabel: formatMonthLabel(month),
          percent: typeof overallProgress === "number" ? overallProgress : (kpi.percent ?? 0),
          status: kpi.status,
        });
      })
      .catch(() => Swal.fire("Lỗi", "Không thể tải dữ liệu KPI", "error"));
  }, [kpiId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateTaskField = (index, field, value) => {
    setForm((prev) => {
      const tasks = [...prev.tasks];
      tasks[index] = { ...tasks[index], [field]: value };
      return { ...prev, tasks };
    });
  };

  const addTask = () => {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, buildTaskRow()],
    }));
  };

  const removeTask = (index) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const handleCancel = () => setReadOnly(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = new URLSearchParams();
      payload.append("_method", "PUT");
      payload.append("month", form.month);
      payload.append("name", form.name);
      payload.append("note", form.note);

      form.tasks.forEach((task, index) => {
        payload.append(`task_titles[${index}]`, task.title);
        payload.append(`target_progresses[${index}]`, toNumeric(task.goal));
        payload.append(`completed_units[${index}]`, toNumeric(task.actual));
      });

      const res = await fetch(`/kpis/${kpiId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-TOKEN": csrf,
          Accept: "application/json",
        },
        body: payload,
      });

      if (!res.ok) {
        const errorRes = await res.json();
        if (errorRes.errors) {
          const messages = Object.values(errorRes.errors).flat().join("\n");
          Swal.fire("Lỗi", messages, "error");
        } else {
          Swal.fire("Lỗi", errorRes.message || "Không thể cập nhật KPI", "error");
        }
        return;
      }

      await Swal.fire("Thành công", "Cập nhật KPI thành công", "success");
      onClose();
      reloadKpis?.();
      setReadOnly(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể cập nhật KPI", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: "Xoá KPI?",
      text: "Hành động này không thể hoàn tác!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/kpis/${kpiId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf,
        },
      });

      if (!res.ok) throw new Error("Không thể xoá KPI");

      onDeleted?.(kpiId);
      await Swal.fire("Đã xoá", "KPI đã được xoá", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể xoá KPI", "error");
    }
  };

  if (!form) {
    return <p className="text-muted">Đang tải...</p>;
  }

  return (
    <Form onSubmit={handleSubmit} className="kpi-detail-form">
      {summary && (
        <div className="kpi-detail-hero">
          <div>
            <p className="text-uppercase text-muted mb-1">Tháng</p>
            <h5 className="mb-0">{summary.monthLabel}</h5>
          </div>
          <div className="text-end">
            {summary.status && (
              <span className={`kpi-detail-status ${summary.status === "Đã hoàn thành" ? "kpi-detail-status--done" : "kpi-detail-status--pending"}`}>
                {summary.status}
              </span>
            )}
            <p className="text-uppercase text-muted mb-1 mt-2">Tiến độ</p>
            <span className="kpi-detail-progress">{formatPercentValue(summary.percent ?? 0)}%</span>
          </div>
        </div>
      )}

      <Row className="g-3 mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Tháng</Form.Label>
            <Form.Control
              type="month"
              name="month"
              value={form.month}
              onChange={handleChange}
              disabled={readOnly}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Tên Deadline/KPI</Form.Label>
            <Form.Control
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={readOnly}
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group>
            <Form.Label>Ghi chú</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="note"
              value={form.note}
              onChange={handleChange}
              disabled={readOnly}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="kpi-task-section">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Công việc liên quan</h6>
          {!readOnly && (
            <Button type="button" variant="outline-primary" size="sm" onClick={addTask}>
              + Thêm công việc
            </Button>
          )}
        </div>

        <div className="kpi-task-list">
          {form.tasks.map((task, index) => {
            const completion = getCompletionPercent(task);
            return (
              <div key={`kpi-task-${index}`} className="kpi-task-card">
                <div className="kpi-task-card__top">
                  <span className="kpi-task-card__badge">#{index + 1}</span>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => removeTask(index)}
                    >
                      Xoá
                    </Button>
                  )}
                </div>

                <AsyncDropdownSelect
                  name={`task_titles[${index}]`}
                  api="/api/titles"
                  field="title_name"
                  value={task.title}
                  onChange={(e) => updateTaskField(index, "title", e.target.value)}
                  creatable
                  disabled={readOnly}
                />

                <Row className="g-3 mt-1">
                  <Col md={6}>
                    <Form.Label className="kpi-task-card__label">Mục tiêu</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={task.goal}
                      onChange={(e) => updateTaskField(index, "goal", e.target.value)}
                      placeholder="Nhập mục tiêu"
                      disabled={readOnly}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="kpi-task-card__label">Số đạt</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={task.actual}
                      onChange={(e) => updateTaskField(index, "actual", e.target.value)}
                      placeholder="Nhập số đạt"
                      disabled={readOnly}
                    />
                  </Col>
                </Row>

                <div className="kpi-task-card__footer">
                  <span>Hoàn thành {completion}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        {readOnly ? (
          <>
            <Button variant="primary" onClick={() => setReadOnly(false)}>Sửa</Button>
            <Button variant="danger" onClick={handleDelete}>Xoá</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleCancel}>Huỷ</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </>
        )}
      </div>
    </Form>
  );
}
