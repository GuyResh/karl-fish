import React, { useState } from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  requiresCount?: number; // number of confirms required
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, title, message, confirmLabel = 'Confirm', onConfirm, requiresCount = 1 }) => {
  const [count, setCount] = useState(0);
  const remaining = Math.max(0, requiresCount - count);

  const handleConfirm = async () => {
    if (remaining > 1) {
      setCount(c => c + 1);
      return;
    }
    await onConfirm();
    setCount(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setCount(0); onClose(); }}
      title={title}
      actions={(
        <>
          <button className="btn btn-secondary" onClick={() => { setCount(0); onClose(); }}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm}>
            {requiresCount > 1 ? `${confirmLabel} (${remaining})` : confirmLabel}
          </button>
        </>
      )}
    >
      <div style={{ whiteSpace: 'pre-wrap' }}>{message}</div>
    </Modal>
  );
};

export default ConfirmModal;


