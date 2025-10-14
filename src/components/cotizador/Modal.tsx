import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="modal-backdrop fade show" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1}
        style={{ backgroundColor: 'transparent' }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header border-bottom">
              <h5 className="modal-title fw-semibold">{title}</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Close"
              />
            </div>
            
            {/* Body */}
            <div className="modal-body">
              {children}
            </div>
            
            {/* Footer */}
            <div className="modal-footer border-top">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;