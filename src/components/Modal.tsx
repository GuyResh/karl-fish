import React, { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <div className="modal-header"><h3 className="card-title">{title}</h3></div>}
        <div className="modal-body">
          {children}
        </div>
        {actions && (
          <div className="modal-actions">
            {actions}
          </div>
        )}
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content {
          background: #fff; border-radius: 8px; width: min(520px, 92vw);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;
        }
        .modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid #eee; }
        .modal-body { padding: 1rem 1.25rem; }
        .modal-actions { padding: 0.75rem 1.25rem; display: flex; gap: 0.5rem; justify-content: flex-end; border-top: 1px solid #eee; }
      `}</style>
    </div>
  );
};

export default Modal;


