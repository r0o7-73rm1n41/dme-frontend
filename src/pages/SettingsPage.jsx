// frontend/src/pages/SettingsPage.jsx
import React, { useState, useContext, useEffect, useRef, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import API from "../utils/api";
import DarkModeToggle from "../components/DarkModeToggle";
import BottomNavBar from "../components/BottomNavBar";
import ProfileDrawer from "../components/ProfileDrawer";
import "../styles/global.css";

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function SettingsPage() {
  const { user, logout } = useContext(AuthContext);
  const { language, changeLanguage, t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    quizReminders: true,
    paymentAlerts: true,
    winnerAnnouncements: true
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const hasShownRateLimitAlertRef = useRef(false);
  const preferencesLoadedRef = useRef(false);

  // Debounced save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const savePreferences = useCallback(debounce(async (prefs) => {
    if (hasShownRateLimitAlertRef.current) return; // Skip if rate limited
    try {
      await API.post('/auth/user/preferences', { preferences: prefs });
    } catch (e) {
      if (e.response?.status === 429) {
        hasShownRateLimitAlertRef.current = true;
        setTimeout(() => { hasShownRateLimitAlertRef.current = false; }, 300000); // 5 min
      }
      // Ignore other errors
    }
  }, 1000), []);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await logout();
        window.location.href = "/login";
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  };

  const handleNotificationChange = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    // persist to server (best-effort)
    savePreferences({ notifications: updated, language });
  };

  // persist notification and language preferences locally (or call API to persist server-side)
  React.useEffect(() => {
    try {
      localStorage.setItem('prefs_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // load preferences from server on mount (best-effort)
  useEffect(() => {
    if (preferencesLoadedRef.current) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await API.get('/auth/user/preferences');
        if (!mounted) return;
        preferencesLoadedRef.current = true;
        const prefs = resp?.data?.preferences || {};
        if (prefs.notifications) setNotifications(prefs.notifications);
        if (prefs.language) setLanguage(prefs.language);
      } catch (e) {
        // fallback to localStorage (already handled)
        console.warn('Could not load preferences from server', e.message || e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('prefs_notifications');
      if (saved) setNotifications(JSON.parse(saved));
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('lang', language);
    } catch (e) {}
    // persist language to server when changed
    savePreferences({ notifications, language });
  }, [language, notifications, savePreferences]);

  const handleLanguageChange = (e) => changeLanguage(e.target.value);

  const handleDeleteAccount = async () => {
    // open confirmation modal
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteProgress(5);

      // enqueue deletion job
      const resp = await API.delete('/auth/delete-account');
      const jobId = resp?.data?.jobId;
      if (!jobId) throw new Error('No jobId returned');

      // poll job status
      const pollInterval = 1500;
  const id = setInterval(async () => {
        try {
          const s = await API.get(`/auth/delete-account/status/${jobId}`);
          const job = s?.data?.job;
          if (!job) return;
          setDeleteProgress(job.progress || 0);
          setStatusMessage(job.message || 'Deleting...');

            if (job.status === 'completed') {
            clearInterval(id);
            setDeleteProgress(100);
            // ensure token cleared
            localStorage.removeItem('token');
            setStatusMessage('Account deleted. Redirecting...');
            setTimeout(() => { window.location.href = '/'; }, 800);
          } else if (job.status === 'failed') {
            clearInterval(id);
            setStatusMessage('Failed: ' + (job.error || 'unknown'));
            alert('Delete failed: ' + (job.error || 'unknown'));
            setDeleting(false);
            setShowConfirmModal(false);
          }
        } catch (e) {
          console.warn('polling job status failed', e.message || e);
        }
      }, pollInterval);

    } catch (err) {
      console.error('Delete enqueue failed:', err);
      setStatusMessage(err.message || 'Failed to start deletion');
      alert('Failed to enqueue deletion: ' + (err.message || 'unknown'));
      setDeleting(false);
      setShowConfirmModal(false);
      setDeleteProgress(0);
    }
  };

  return (
    <>
      <header className="header page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div className="logo">
            <img src="/imgs/logo-DME2.png" alt="Logo" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>{t('SETTINGS')}</h1>
            {/* <div style={{ fontSize: 13, opacity: 0.9 }}>Manage your account and preferences</div> */}
          </div>
        </div>
        <div style={{ position: 'absolute', right: 16, top: 14 }}>
          <DarkModeToggle />
        </div>
      </header>

      <main className="settings-container home-container">
        <div className="settings-section">
          <h3>🔔 {t('Notifications')}</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('Reminders')}</span>
              <span className="setting-desc">{t('Quiz Reminder')}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.quizReminders}
                onChange={() => handleNotificationChange('quizReminders')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('Payment Alerts')}</span>
              <span className="setting-desc">{t('Payment Reminder Alert')}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.paymentAlerts}
                onChange={() => handleNotificationChange('paymentAlerts')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('Winner Announcements')}</span>
              <span className="setting-desc">{t('Winner Announcement Reminder')}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.winnerAnnouncements}
                onChange={() => handleNotificationChange('winnerAnnouncements')}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>👤 {t('Account & Password')}</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('Profile')}</span>
              <span className="setting-desc">{t('Change Profile Information')}</span>
            </div>
            <button 
              className="action-btn"
              onClick={() => window.location.href = "/edit-profile"}
            >
              {t('editProfile')}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('Password')}</span>
              <span className="setting-desc">{t('Change Password')}</span>
            </div>
            {!showChangePassword ? (
              <button 
                className="action-btn"
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="password" placeholder={t('oldPassword')} value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                <input type="password" placeholder={t('newPassword')} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <input type="password" placeholder={t('confirmPassword')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <button className="action-btn" onClick={async () => {
                  // client-side validation
                  if (!oldPassword || !newPassword) return alert('Please Provide Both Old and New Passwords');
                  if (newPassword !== confirmPassword) return alert('New Passwords Do Not Match');
                  try {
                    setStatusMessage('Changing Password...');
                    // server expects currentPassword
                    await API.post('/auth/change-password', { currentPassword: oldPassword, newPassword });
                    setStatusMessage('Password Changed Successfully');
                    setShowChangePassword(false);
                    setOldPassword(''); setNewPassword(''); setConfirmPassword('');
                    setTimeout(() => setStatusMessage(''), 2000);
                  } catch (err) {
                    console.error('Change password failed', err);
                    setStatusMessage(err.message || 'Failed To Change Password');
                    alert('Failed: ' + (err.message || 'unknown'));
                  }
                }}>{t('save')}</button>
                <button className="action-btn" onClick={() => { setShowChangePassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}>{t('cancel')}</button>
              </div>
            )}
          </div>
        </div>

        {/* <aside className="settings-sidebar"> */}
          {/* <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user?.profileImage ? <img src={`/images/${user.profileImage}`} alt="avatar" /> : <div className="avatar-placeholder">{(user?.fullName || user?.phone || 'U').charAt(0)}</div>}
              </div>
              <div className="profile-info">
                <h2>{user?.fullName || 'Unknown'}</h2>
                <p>{user?.email || user?.phone}</p>
              </div>
            </div>
            <div className="profile-stats" style={{ marginTop: 6 }}>
              <div className="stat-item"><h3>Total Quizzes</h3><p>0</p></div>
              <div className="stat-item"><h3>Best Score</h3><p>0</p></div>
              <div className="stat-item"><h3>Avg Rank</h3><p>—</p></div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="action-button primary" onClick={() => window.location.href = '/profile'}>Edit Profile</button>
              <button className="action-button secondary" onClick={() => window.location.href = '/payment-history'}>Payments</button>
            </div>
          </div> */}
        {/* </aside> */}

        <div className="settings-section">
          <h3>📱 {t('App Preferences')}</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('Dark Mode')}</span>
              <span className="setting-desc">{t('Toggle Dark Mode')}</span>
            {/* <DarkModeToggle /> */}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('language')}</span>
              <span className="setting-desc">{t('Change App Language')}</span>
            </div>
            <select className="language-select" value={language} onChange={handleLanguageChange}>
              <option value="en">{t('English')}</option>
              <option value="hi">{t('Hindi')}</option>
            </select>
          </div>
  </div>

          <div className="settings-section">
          <h3>ℹ️ {t('About')}</h3>
          <div className="about-info">
            <div className="about-item">
              <span className="about-label">{t('appVersion')}</span>
              <span className="about-value">1.0.5</span>
            </div>
            <div className="about-item">
              <span className="about-label">{t('buildDate')}</span>
              <span className="about-value">October 2025</span>
            </div>
            <div className="about-item">
              <span className="about-label">{t('developedBy')}</span>
              <span className="about-value">{t('fcityonline')}</span>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div style={{ padding: 12, color: '#d32f2f' }}>{statusMessage}</div>
        )}

        <div className="settings-section danger-zone">
          <h3>⚠️ {t('dangerZone')}</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t('logout')}</span>
              <span className="setting-desc">{t('Logout Account')}</span>
            </div>
            <button 
              className="danger-btn"
              onClick={handleLogout}
            >
              {t('logout')}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              {/* <span className="setting-label">{t('Delete Acount')}</span> */}
              <span className="setting-desc">{t('Delete Account')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="danger-btn2" onClick={handleDeleteAccount}>{t('Delete Account')}</button>
            </div>
          </div>
        </div>
        </main>

      {showConfirmModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            {!deleting ? (
              <>
                <h4>{t('deleteAccount')} — {t('confirm')}?</h4>
                <p>This will permanently delete your account, your blogs, quiz history, payments and cannot be undone.</p>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Please confirm to proceed. This action is irreversible.</div>
                <div className="modal-actions">
                  <button className="btn cancel" onClick={() => setShowConfirmModal(false)}>{t('cancel')}</button>
                  <button className="btn confirm" onClick={confirmDelete}>{t('deleteAccount')}</button>
                </div>
              </>
            ) : (
              <div className="delete-progress">
                <div className="spinner-small" aria-hidden></div>
                <div style={{ flex: 1 }}>
                  <div className="progress-text">Deleting your account — please wait...</div>
                  <div style={{ marginTop: 8 }} className="progress-bar-background">
                    <div className="progress-bar-fill" style={{ width: `${deleteProgress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ProfileDrawer 
        key={user?._id || 'no-user'} 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />
      <BottomNavBar onProfileClick={() => setDrawerOpen(true)} />
    </>
  );
}
