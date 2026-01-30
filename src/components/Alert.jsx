// frontend/src/components/Alert.jsx
import React, { useEffect } from 'react';
import './Alert.css';

const Alert = ({ message, type = 'danger', onClose, autoClose = true, duration = 3000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <div className={`alert ${type}`}>
      <span className="closebtn" onClick={onClose}>&times;</span>
      <strong>{type === 'danger' ? 'Danger!' : type === 'success' ? 'Success!' : 'Info!'}</strong> {message}
    </div>
  );
};

export default Alert;