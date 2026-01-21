// frontend/src/context/AlertContext.jsx
import React, { createContext, useContext, useState } from 'react';
import Alert from '../components/Alert';

const AlertContext = createContext();

let globalAddAlert = null;

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

// Global function to show alerts from anywhere
export const showAlert = (message, type = 'danger', duration = 3000) => {
  if (globalAddAlert) {
    globalAddAlert(message, type, duration);
  } else {
    // Fallback to console if context not ready
    console.log(`Alert: ${message}`);
  }
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const addAlert = (message, type = 'danger', duration = 3000) => {
    const id = Date.now() + Math.random();
    setAlerts(prev => [...prev, { id, message, type, duration }]);
  };

  // Set global function
  React.useEffect(() => {
    globalAddAlert = addAlert;
    return () => {
      globalAddAlert = null;
    };
  }, []);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ addAlert }}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        {alerts.map(alert => (
          <Alert
            key={alert.id}
            message={alert.message}
            type={alert.type}
            duration={alert.duration}
            onClose={() => removeAlert(alert.id)}
          />
        ))}
      </div>
    </AlertContext.Provider>
  );
};