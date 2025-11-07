import React from 'react';
import { Modal, Button } from 'react-bootstrap';



export default function ExportModal({ show, onClose, onExport }) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Xuất dữ liệu</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Bạn muốn xuất bảng hiện tại hay toàn bộ dữ liệu?</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Huỷ</Button>
        <Button variant="outline-primary" onClick={() => onExport('all')}>
          Xuất tất cả
        </Button>
        <Button variant="primary" onClick={() => onExport('filtered')}>
          Xuất bảng hiện tại
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
