// frontend/src/pages/LandingPage.jsx
import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import DarkModeToggle from "../components/DarkModeToggle";
import BottomNavBar from "../components/BottomNavBar";
import ProfileDrawer from "../components/ProfileDrawer";
import API from "../utils/api";
import { showAlert } from "../context/AlertContext";
import { socket } from "../socket";
import "../styles/global.css";
import AnimatedContent from "../components/AnimatedContent";
import { requestNotificationPermission, showQuizReadyNotification, showQuizStartedNotification } from "../utils/notifications";
import { io } from "socket.io-client";

export default function LandingPage() {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quizState, setQuizState] = useState("loading");
  const [joinedCount, setJoinedCount] = useState(0);
  const [quizReady, setQuizReady] = useState(false);
  const [readyMessage, setReadyMessage] = useState("");
  const [quizClass, setQuizClass] = useState(null);
  const [eligible, setEligible] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const totalStudents = 2000;

  // Listen for quiz state changes via socket
  useEffect(() => {
    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect();
    }

    // Join today's quiz room
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    socket.emit('join-quiz', today);

    // Listen for quiz state changes
    const handleQuizStateChanged = (data) => {
      console.log('LandingPage: Quiz state changed:', data);
      if (data.quizDate === today) {
        setQuizState(data.toState);
      }
    };

    socket.on('quiz-state-changed', handleQuizStateChanged);

    // Initial status fetch
    const fetchInitialStatus = async () => {
      try {
        const res = await API.get('/quiz/status');
        setQuizState(res.data.state);
      } catch (error) {
        console.error('Failed to fetch initial quiz status:', error);
        setQuizState('ERROR');
      }
    };

    fetchInitialStatus();

    return () => {
      socket.off('quiz-state-changed', handleQuizStateChanged);
      socket.emit('leave-quiz', today);
    };
  }, []);

  // Check user eligibility if logged in
  useEffect(() => {
    if (!user) return;

    const checkEligibility = async () => {
      try {
        const res = await API.get('/me/eligibility');
        setEligible(res.data.eligible);
      } catch (error) {
        console.error('Failed to check eligibility:', error);
      }
    };

    checkEligibility();
  }, [user]);

  // Load joined count and quiz class
  useEffect(() => {
    const loadQuizInfo = async () => {
      try {
        // Load joined count
        try {
          const countResponse = await API.get('/payments/today-paid-count');
          if (countResponse.data && typeof countResponse.data.count === 'number') {
            setJoinedCount(countResponse.data.count);
          }
        } catch (error) {
          console.warn('Failed to load joined count:', error?.response?.data?.message || error.message);
        }

        // Load quiz class if user is logged in
        if (user) {
          try {
            const quizResponse = await API.get('/quiz/today');
            if (quizResponse.data?.exists && quizResponse.data?.quiz) {
              const quizData = quizResponse.data.quiz;
              const classToShow = quizData.classGrade || user?.classGrade || 'ALL';
              setQuizClass(classToShow);
            } else {
              setQuizClass(user?.classGrade || null);
            }
          } catch (error) {
            if (error?.response?.status === 401) {
              setQuizClass(user?.classGrade || null);
            } else {
              console.warn('Failed to load quiz info:', error?.response?.data?.message || error.message);
              setQuizClass(user?.classGrade || null);
            }
          }
        } else {
          setQuizClass(null);
        }
      } catch (error) {
        console.warn('Error loading quiz info:', error);
      }
    };

    loadQuizInfo();
    const interval = setInterval(async () => {
      try {
        const response = await API.get('/payments/today-paid-count');
        if (response.data && typeof response.data.count === 'number') {
          setJoinedCount(response.data.count);
        }
      } catch (error) {
        // Silent fail
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Setup notifications and socket connection
  useEffect(() => {
    requestNotificationPermission();

    if (!user || !localStorage.getItem('token')) {
      return;
    }

    const getSocketBase = () => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/api$/, "");
      }
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:5000";
      }
      return `${protocol}//${hostname}${port && port !== '80' && port !== '443' && port !== '3000' ? ':' + port : ''}`;
    };
    const apiUrl = getSocketBase();
    const socket = io(apiUrl, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('quiz-ready', (data) => {
      console.log('🔔 Quiz ready event received:', data);
      setQuizReady(true);
      setReadyMessage(data.message || 'Quiz starting in 1 minute! Join now!');
      showQuizReadyNotification(data);
    });

    socket.on('quiz-started', (data) => {
      console.log('🎯 Quiz started event received:', data);
      setQuizReady(false);
      setReadyMessage('');
      showQuizStartedNotification(data);
    });

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error (non-critical):', error.message);
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Countdown timer for upcoming quiz (8 PM IST)
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      
      // Calculate 8:00 PM IST
      const quizTime = new Date(today + 'T20:00:00');
      const diffMs = quizTime - now;

      if (diffMs <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setCountdown({ hours, minutes, seconds });
    };

    // Calculate immediately
    calculateCountdown();

    // Update every second
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleJoin = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    // If already eligible, go to quiz or home based on state
    if (eligible) {
      if (quizState === 'LIVE') {
        navigate('/quiz');
      } else {
        navigate('/');
      }
      return;
    }

    // Not eligible, go to payment
    navigate('/payment');
  };

  // Load Razorpay script once
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME2.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>{t('UPCOMING QUIZ')}</h2>
      </header>

      {/* Quiz Ready Banner */}
      {quizReady && (
        <div style={{
          background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
          color: 'white',
          padding: '15px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '18px',
          animation: 'pulse 1s infinite'
        }}>
          🔔 {readyMessage}
        </div>
      )}

      <div className="container">
        <div className="class">
          {quizClass ? `Class ${quizClass === '10th' ? '10th' : quizClass === '12th' ? '12th' : quizClass === 'Other' ? 'Other' : ''}` : t('upcomingQuiz')}
        </div>
        <div className="quiz-time">{t('quizStartsIn')}</div>
        <div className="time-highlight">08:00 PM to 08:30 PM</div>

        {/* Status and Countdown Display */}
        <div className="countdown-wrapper">
          {/* Countdown Timer Section */}
          <div className="countdown-timer-section">
            <div className="countdown-display">
              <div className="countdown-block">
                <div className="countdown-number">{String(countdown.hours).padStart(2, '0')}</div>
                <div className="countdown-label">Hours</div>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-block">
                <div className="countdown-number">{String(countdown.minutes).padStart(2, '0')}</div>
                <div className="countdown-label">Minutes</div>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-block">
                <div className="countdown-number">{String(countdown.seconds).padStart(2, '0')}</div>
                <div className="countdown-label">Seconds</div>
              </div>
            </div>
          </div>

          {/* Status Badge Section */}
          <div className="status-badge-section">
            {quizState === 'loading' && (
              <div className="countdown-item">
                <span className="icon">⏳</span>
                <span>{t('loading')}</span>
                <div className="label">Status</div>
              </div>
            )}

            {quizState === 'NO_QUIZ' && (
              <div className="countdown-item">
                <span className="icon">🚫</span>
                <span>{t('noQuiz')}</span>
                <div className="label">{t('today')}</div>
              </div>
            )}

            {quizState === 'DRAFT' && (
              <div className="countdown-item">
                <span className="icon">📝</span>
                <span>Draft</span>
                <div className="label">Mode</div>
              </div>
            )}

            {quizState === 'SCHEDULED' && (
              <div className="countdown-item">
                <span className="icon">📅</span>
                <span>Scheduled</span>
                <div className="label">For Later</div>
              </div>
            )}

            {quizState === 'LOCKED' && (
              <div className="countdown-item">
                <span className="icon">🔒</span>
                <span>Locked</span>
                <div className="label">Starting Soon</div>
              </div>
            )}

            {quizState === 'LIVE' && (
              <div className="countdown-item">
                <span className="icon">🎯</span>
                <span>Live</span>
                <div className="label">Now</div>
              </div>
            )}

            {(quizState === 'ENDED' || quizState === 'RESULT_PUBLISHED') && (
              <div className="countdown-item">
                <span className="icon">🏁</span>
                <span>Ended</span>
                <div className="label">Results Out</div>
              </div>
            )}

            {quizState === 'ERROR' && (
              <div className="countdown-item">
                <span className="icon">❌</span>
                <span>Error</span>
                <div className="label">Loading Status</div>
              </div>
            )}
        </div>
        </div>

        {/* Progress bar */}
        <div className="progress-container" style={{ width: "100%", margin: "10px 0" }}>
          <div
            style={{
              backgroundColor: "#ddd",
              borderRadius: "10px",
              height: "5px",
              width: "100%",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min((joinedCount / totalStudents) * 100, 100)}%`,
                backgroundColor: "#4caf50",
                borderRadius: "10px",
                transition: "width 0.5s ease-in-out",
              }}
            ></div>
          </div>
          <div style={{ textAlign: "center", marginTop: "5px", fontWeight: "bold" }}>
            {joinedCount}+ {t('studentsEnrolled')}
          </div>
        </div>

        {/* Animated Join Section */}
        <AnimatedContent
          distance={150}
          direction="vertical"
          duration={1.2}
          ease="elastic.out(1, 0.5)"
          initialOpacity={0.2}
          animateOpacity
          scale={1.05}
          threshold={0.3}
          delay={0.0}
          triggerOnScroll={false}
        >
          <div className="price-row">
            <div className="price-left">
              <h6>{t('registerNow')}</h6>
              <h6>{t('forAssessments')}</h6>
              <div className="price">{t('only')} ₹5</div>
            </div>
            <button className="join-btn" onClick={handleJoin}>
              {user ? (eligible ? (quizState === 'LIVE' ? t('joinQuiz') : t('viewQuiz')) : t('pay5')) : 'LOGIN'}
            </button>
          </div>
        </AnimatedContent>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h3>
          ✨✨✨✨✨{" "}
          <span className="highlight">
            {t('Golden Opportunity ')}
            {t('For Students ✨✨✨✨')}
          </span>{" "}
          ✨
        </h3>

        <p>
          <strong>{t('competitionDesc')}</strong>
        </p>

        <p>{t('competitionLevels')}</p>
        <ul>
          <li>📘 {t('level10')}</li>
          <li>📗 {t('level12')}</li>
        </ul>

        <p>
          <strong>{t('participateDesc')}</strong>
        </p>

        <p>
          🏆 {t('winnersTitle')}
        </p>
        <ul>
          <li>🥇 {t('firstPrize')}</li>
          <li>🥈 {t('secondPrize')}</li>
          <li>🥉 {t('thirdPrize')}</li>
        </ul>

        <p>
          🔸 {t('remainingWinners')}
        </p>

        <p>
          📘 <strong>{t('freeNotes')}</strong>
        </p>

        <p className="fee">
          <strong>{t('administrativeFee')}</strong>
        </p>

        <div className="contact">
          <p>
            📲 <strong>{t('contactInfo')}</strong>
          </p>
          <p>
            📧 <strong>{t('contactEmail')}</strong>
          </p>
          <div className="t-and-c">
            <h6>{t('ageVerification')}</h6>
            <h6>{t('stateRestrictions')}</h6>
            <h6>
              {t('regulations')}
            </h6>

          </div>
        </div>
      </div>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNavBar onProfileClick={() => setDrawerOpen(true)} />
    </>
  );
}