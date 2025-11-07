
import ReactDOM from 'react-dom';
import React, { useEffect } from 'react';
export default function Modal({ isOpen, title, children, footer, onClose }) {
  if (!isOpen) return null; // Không render modal nếu chưa mở

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  


  return ReactDOM.createPortal(
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="modal-footer">
              {footer}
              <button className="btn btn-secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
