// src/components/common/Modal.tsx
import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default Modal;
