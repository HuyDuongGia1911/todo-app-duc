import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import AsyncDropdownSelect from "./AsyncDropdownSelect";
import Swal from "sweetalert2";

export default function KpiDetailModal({ kpiId, onDeleted, onClose, reloadKpis }) {
  const [form, setForm] = useState(null);
  const [readOnly, setReadOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

 useEffect(() => {
  fetch(`/kpis/${kpiId}/json`, {
    headers: { Accept: "application/json" }
  })
    .then(res => res.json())
    .then(({ kpi, tasks }) => {
      const month = (kpi.start_date || '').slice(0, 7);
      setForm({
        month,
        name: kpi.name,
        note: kpi.note || "",
        tasks: tasks.map(t => ({ title: t.title, target: t.target })),
      });
    })
    .catch(() => Swal.fire("Lỗi", "Không thể tải dữ liệu KPI", "error"));
}, [kpiId]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateTaskTitle = (index, value) => {
    const newTasks = [...form.tasks];
    newTasks[index].title = value;
    setForm((prev) => ({ ...prev, tasks: newTasks }));
  };

  const updateTaskTarget = (index, value) => {
    const newTasks = [...form.tasks];
    newTasks[index].target = value;
    setForm((prev) => ({ ...prev, tasks: newTasks }));
  };

  const addTask = () => {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { title: "", target: "" }],
    }));
  };

  const removeTask = (index) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const handleCancel = () => {
    setReadOnly(true);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  try {
const payload = new URLSearchParams();
payload.append('_method', 'PUT');
payload.append('month', form.month);
payload.append('name', form.name);
payload.append('note', form.note);
form.tasks.forEach((t, i) => {
  payload.append(`task_titles[${i}]`, t.title);
  payload.append(`target_progresses[${i}]`, t.target);
});


const res = await fetch(`/kpis/${kpiId}`, {
  method: 'POST', // <-- CHÚ Ý
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-CSRF-TOKEN': csrf,
    'Accept': 'application/json',
  },
  body: payload,
});


    if (!res.ok) {
      const errorRes = await res.json();
      console.error("Chi tiết lỗi:", errorRes);

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
    reloadKpis?.()
    setReadOnly(true);
  } catch (err) {
    console.error("Lỗi không xác định:", err);
    Swal.fire("Lỗi", "Không thể cập nhật KPI (lỗi không xác định)", "error");
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

    // Gọi callback TRƯỚC khi hiển thị Swal
    onDeleted?.(kpiId);

    await Swal.fire("Đã xoá", "KPI đã được xoá", "success");
  } catch (err) {
    console.error(err);
    await Swal.fire("Lỗi", "Không thể xoá KPI", "error");
  }
};


  if (!form) return <p>Đang tải...</p>;

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
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

        <Col md={12}>
          <Form.Group>
            <Form.Label>Tên Deadline</Form.Label>
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
              rows={2}
              name="note"
              value={form.note}
              onChange={handleChange}
              disabled={readOnly}
            />
          </Form.Group>
        </Col>
      </Row>

      <hr />
      <h6>Công việc liên quan</h6>
      {form.tasks.map((t, i) => (
        <Row key={i} className="g-2 align-items-center mb-2">
          <Col md={6}>
            <AsyncDropdownSelect
              name={`task_titles[${i}]`}
              api="/api/titles"
              field="title_name"
              value={t.title}
              onChange={(e) => updateTaskTitle(i, e.target.value)}
              creatable
              disabled={readOnly}
            />
          </Col>
          <Col md={4}>
            <Form.Control
              type="number"
              value={t.target}
              onChange={(e) => updateTaskTarget(i, e.target.value)}
              placeholder="Mục tiêu"
              disabled={readOnly}
            />
          </Col>
          <Col md={2}>
            {!readOnly && (
              <Button variant="danger" size="sm" onClick={() => removeTask(i)}>
                X
              </Button>
            )}
          </Col>
        </Row>
      ))}
      {!readOnly && (
        <Button variant="secondary" onClick={addTask} size="sm" className="mt-2">
          + Thêm công việc
        </Button>
      )}

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
              {submitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </>
        )}
      </div>
    </Form>
  );
}
