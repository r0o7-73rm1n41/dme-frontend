// // // frontend/src/pages/PaymentHistoryPage.jsx

import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import API from "../utils/api";
import DarkModeToggle from "../components/DarkModeToggle";
import BottomNavBar from "../components/BottomNavBar";
import ProfileDrawer from "../components/ProfileDrawer";
import "../styles/global.css";

export default function PaymentHistoryPage() {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    loadPaymentHistory();
  }, [user]);
  
  const loadPaymentHistory = async () => {
    try {
      const response = await API.get("/payments/history");
      const data = response?.data;
      // Accept multiple response shapes from backend
      if (Array.isArray(data)) {
        setPayments(data);
      } else if (Array.isArray(data?.payments)) {
        setPayments(data.payments);
      } else if (Array.isArray(data?.data)) {
        setPayments(data.data);
      } else {
        console.warn("Unexpected payments response shape, expected array. Falling back to empty list:", data);
        setPayments([]);
      }
    } catch (error) {
      console.error("Failed to load payment history:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  const formatAmount = (amount) => {
    if (!amount || isNaN(amount)) return '₹0.00';
    // Amount is stored in paise (500 = ₹5), but some might be in rupees
    const amountInRupees = amount < 100 ? amount : amount / 100;
    return `₹${amountInRupees.toFixed(2)}`;
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME2.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>{t('paymentHistory').toUpperCase()}</h2>
      </header>

      <div className="payment-history-container">
        <div className="history-header">
          <h2>💳 {t('paymentHistory')}</h2>
          <p>{t('trackPayments')}</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>⌛️{t('loadingPaymentHistory')}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3>{t('noPayments')}</h3>
            <p>{t('noPaymentsDesc')}</p>
            <button 
              className="pay-btn"
              onClick={() => window.location.href = "/payment"}
              >
              {t('makeFirstPayment')}
            </button>
          </div>
        ) : (
          <div className="payments-list">
            {payments.map((payment, index) => {
              // Handle both Payment model and legacy user.payments array
              const paymentDate = payment.createdAt || payment.date || payment.timestamp || new Date();
              const quizDate = payment.forDate || payment.quizDate || null;
              const paymentId = payment.razorpayPaymentId || payment.paymentId || payment.razorpay_order_id || `Payment ${index + 1}`;
              const amount = payment.amount || 0;
              const status = payment.status || 'completed';
              
              return (
                <div key={payment._id || payment.id || `payment-${index}`} className="payment-item">
                  <div className="payment-info">
                    <div className="payment-header">
                      <h4>{t('dailyQuizEntry')}</h4>
                      <span className={`status ${status}`}>
                        {status === 'completed' ? '✅' : '⏳'} {t(status)}
                      </span>
                    </div>
                    <div className="payment-details">
                      <div className="detail-row">
                        <span className="label">{t('amount')}:</span>
                        <span className="amount">{formatAmount(amount)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">{t('date')}:</span>
                        <span className="date">
                          {paymentDate && !isNaN(new Date(paymentDate).getTime()) 
                            ? formatDate(paymentDate) 
                            : t('dateNotAvailable')}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">{t('paymentId')}:</span>
                        <span className="payment-id">{paymentId || 'N/A'}</span>
                      </div>
                      {quizDate && (
                        <div className="detail-row">
                          <span className="label">{t('quizDate')}:</span>
                          <span className="quiz-date">
                            {!isNaN(new Date(quizDate).getTime()) 
                              ? formatDate(quizDate) 
                              : t('notSpecified')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="payment-actions">
                    {status === 'completed' && (
                      <span className="success-badge">{t('paymentSuccessful')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="payment-summary">
          <div className="summary-item">
            <span className="summary-label">{t('totalPayments')}:</span>
            <span className="summary-value">{payments.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('totalAmount')}:</span>
            <span className="summary-value">
              {formatAmount(payments.reduce((sum, p) => sum + p.amount, 0))}
            </span>
          </div>
        </div>
      </div>

      <ProfileDrawer 
        key={user?._id || 'no-user'} 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        />
      <BottomNavBar onProfileClick={() => setDrawerOpen(true)} />
    </>
  );
}
