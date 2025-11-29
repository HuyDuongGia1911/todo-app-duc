import React, { ReactNode, useEffect } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'fullscreen';
  dialogClassName?: string;
}

const sizeClassMap: Record<Exclude<ModalProps['size'], undefined | 'md'>, string> = {
  sm: 'modal-sm',
  lg: 'modal-lg',
  xl: 'modal-xl',
  xxl: 'modal-xxl',
  fullscreen: 'modal-fullscreen',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  footer,
  onClose,
  size = 'lg',
  dialogClassName,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const dialogClasses = ['modal-dialog'];
  let sizeClass = '';

  if (size && size !== 'md') {
    sizeClass = sizeClassMap[size];
  }

  if (sizeClass) {
    dialogClasses.push(sizeClass);
  }

  if (dialogClassName) {
    dialogClasses.push(dialogClassName);
  }

  const portal = ReactDOM.createPortal(
    <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className={dialogClasses.join(' ')}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">{children}</div>

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

  return <>{portal}</>;
};

export default Modal;