// frontend/src/pages/QuizPage.jsx
import React, { useEffect, useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../utils/api";
import { showAlert } from "../context/AlertContext";
import { socket } from "../socket";
import './QuizPage.css';

export default function QuizPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [quizState, setQuizState] = useState("loading");
  const [quizError, setQuizError] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [answerLocked, setAnswerLocked] = useState(false); // Track if answer is locked
  const [answeredQuestionId, setAnsweredQuestionId] = useState(null); // Track which question was answered
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const questionIntervalRef = useRef(null);
  const statusIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const statusPollCountRef = useRef(0);
  const statusBackoffRef = useRef(60000); // Start with 60 second fallback polling
  const expiresAtRef = useRef(null); // Store expiresAt timestamp

  // F1, F2: Frontend must be passive - always request server state
  const pollCurrentQuestion = async () => {
    try {
      // F1: Always request server for state - do not compute locally
      const res = await API.get('/quiz/current-question');
      const question = res.data;
      setCurrentQuestion(question);
      
      // F2: Respect backend timeRemaining - use server timestamp
      const expiresAt = new Date(question.expiresAt);
      expiresAtRef.current = expiresAt.getTime();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      setDisabled(remaining <= 0);
      setSelectedAnswer(null); // Reset for new question
      setAnswerLocked(false); // Reset answer lock for new question
      setAnsweredQuestionId(null); // Reset answered question ID
    } catch (error) {
      if (error.response?.status === 404) {
        setQuizState('ENDED');
      } else if (error.response?.status !== 401 && error.response?.status !== 429) {
        // Don't log 401 or 429 errors - they're handled elsewhere
        console.error('Failed to poll question:', error);
      }
    }
  };

  // Client-side timer that updates every second based on expiresAt
  useEffect(() => {
    if (quizState === 'LIVE' && expiresAtRef.current && currentQuestion) {
      const updateTimer = () => {
        if (!expiresAtRef.current) return;
        
        const remaining = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        // Disable if timer expired OR answer is locked
        setDisabled(remaining <= 0 || answerLocked);
        
        // If timer expired, automatically proceed to next question
        // This happens for everyone when timer reaches 0, regardless of whether answer was submitted
        if (remaining <= 0) {
          // Wait a bit for server to advance, then fetch new question
          // Server automatically advances every 15 seconds
          setTimeout(() => {
            pollCurrentQuestion();
          }, 300);
        }
      };

      // Update immediately
      updateTimer();

      // Update every second
      timerIntervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [quizState, currentQuestion]);

  // Countdown timer for scheduled quiz
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

    // Update every second when in DRAFT or SCHEDULED state
    if (quizState === 'DRAFT' || quizState === 'SCHEDULED') {
      countdownIntervalRef.current = setInterval(calculateCountdown, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [quizState]);

  useEffect(() => {
    if (!user) return;

    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect();
    }

    // Join today's quiz room
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    socket.emit('join-quiz', today);

    // Listen for quiz state changes
    const handleQuizStateChanged = (data) => {
      console.log('Quiz state changed:', data);
      if (data.quizDate === today) {
        setQuizState(data.toState);
        // Reset backoff on successful state change
        statusBackoffRef.current = 30000;
        statusPollCountRef.current = 0;
      }
    };

    // Listen for question advancement
    const handleQuestionAdvanced = (data) => {
      console.log('Question advanced:', data);
      if (data.quizDate === today) {
        // Force refresh current question when question advances via WebSocket
        pollCurrentQuestion();
      }
    };

    // Listen for new question data via WebSocket (if backend sends it)
    const handleNewQuestion = (data) => {
      if (data.quizDate === today && data.question) {
        setCurrentQuestion(data.question);
        const expiresAt = new Date(data.question.expiresAt);
        expiresAtRef.current = expiresAt.getTime();
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
        setDisabled(remaining <= 0);
        setSelectedAnswer(null);
        setAnswerLocked(false); // Reset answer lock for new question
        setAnsweredQuestionId(null); // Reset answered question ID
      }
    };

    socket.on('quiz-state-changed', handleQuizStateChanged);
    socket.on('question-advanced', handleQuestionAdvanced);
    socket.on('new-question', handleNewQuestion);

    // Initial status fetch
    const fetchInitialStatus = async () => {
      try {
        const res = await API.get('/quiz/status');
        setQuizState(res.data.state);
        setQuizError(null);
      } catch (error) {
        console.error('Failed to fetch initial status:', error);
        setQuizState('ERROR');
        setQuizError(error?.response?.data?.message || error.message);
      }
    };

    fetchInitialStatus();

    return () => {
      socket.off('quiz-state-changed', handleQuizStateChanged);
      socket.off('question-advanced', handleQuestionAdvanced);
      socket.off('new-question', handleNewQuestion);
      socket.emit('leave-quiz', today);
    };
  }, [user]); // Only depend on user

  // Fallback polling with exponential backoff (60s to 5min max) - reduced frequency
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await API.get('/quiz/status');
        setQuizState(res.data.state);
        setQuizError(null);
        // Reset backoff on success
        statusBackoffRef.current = 60000;
        statusPollCountRef.current = 0;
      } catch (error) {
        // Don't log 401 or 429 errors - they're handled elsewhere
        if (error.response?.status !== 401 && error.response?.status !== 429) {
          console.error('Failed to poll status:', error);
        }
        setQuizError(error?.response?.data?.message || error.message);
        statusPollCountRef.current += 1;
        // Exponential backoff: 60s, 2min, 5min max
        statusBackoffRef.current = Math.min(60000 * Math.pow(2, statusPollCountRef.current), 300000);
      }
    };

    // Start polling after 60 seconds, then use backoff interval
    const timeoutId = setTimeout(() => {
      pollStatus();
      statusIntervalRef.current = setInterval(pollStatus, statusBackoffRef.current);
    }, 60000);

    return () => {
      clearTimeout(timeoutId);
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  // F1, F2: When quiz is LIVE, always request server state
  useEffect(() => {
    if (quizState === 'LIVE') {
      // F1: Join the quiz - server controls flow
      const joinQuiz = async () => {
        try {
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          // F1: Use normalized endpoint
          await API.post('/quiz/join', {
            deviceId: navigator.userAgent,
            deviceFingerprint: navigator.userAgent + screen.width + screen.height
          });
        } catch (error) {
          // Don't log 401 or 429 errors
          if (error.response?.status !== 401 && error.response?.status !== 429) {
            console.error('Failed to join quiz:', error);
          }
        }
      };

      joinQuiz();

      // F1: Initial poll to get current question from server
      pollCurrentQuestion();
      
      // F1: Poll server every 15 seconds to sync with server state
      // F2: Always respect backend timeRemaining
      questionIntervalRef.current = setInterval(() => {
        // F1: Always request server state - do not compute locally
        pollCurrentQuestion();
      }, 15000); // Poll every 15 seconds to stay in sync

      return () => {
        if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
      };
    } else {
      setCurrentQuestion(null);
      setTimeLeft(15);
      setDisabled(false);
      setAnswerLocked(false);
      setAnsweredQuestionId(null);
      expiresAtRef.current = null;
    }
  }, [quizState]);

  const handleAnswerSelect = async (optionIndex) => {
    // Prevent clicking if already disabled, locked, or no question
    if (disabled || answerLocked || !currentQuestion) return;
    
    // Prevent answering the same question twice
    if (answeredQuestionId === currentQuestion.questionId) return;

    // Lock answer immediately - cannot be undone
    setSelectedAnswer(optionIndex);
    setDisabled(true);
    setAnswerLocked(true);
    setAnsweredQuestionId(currentQuestion.questionId);

    try {
      // F1: Always submit to server - server controls answer acceptance
      const res = await API.post('/quiz/answer', {
        questionId: currentQuestion.questionId,
        selectedOptionIndex: optionIndex,
        deviceId: navigator.userAgent,
        deviceFingerprint: navigator.userAgent + screen.width + screen.height
      });
      
      // F1: Server response controls UI state
      if (res.data.success) {
        // Answer submitted successfully - keep it locked
        // Don't clear selection - show user their locked answer
      }
    } catch (error) {
      // Even on error, keep answer locked to prevent retries
      // Only show error message
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error.message;
      if (errorMsg.includes('Too many requests')) {
        showAlert('Please wait before submitting again.', 'warning');
      } else {
        showAlert('Failed to submit answer: ' + errorMsg, 'danger');
      }
      // Answer remains locked - cannot retry
    }
  };

  // Render based on quizState
  if (quizState === 'loading') {
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-loading">
            <div className="quiz-loading-spinner"></div>
            <div className="quiz-loading-text">Loading quiz status...</div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'NO_QUIZ') {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = today.getDate();
    const monthName = today.toLocaleDateString('en-US', { month: 'short' });
    const year = today.getFullYear();

    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-status-message">
            <div className="quiz-status-icon calendar-display">
              <div className="calendar-header">{monthName}</div>
              <div className="calendar-day">{dayNumber}</div>
              <div className="calendar-footer">{dayName} • {year}</div>
            </div>
            <div className="quiz-status-title">No Quiz Today</div>
            <div className="quiz-status-description">
              There is no quiz scheduled for today. Check back tomorrow at 8:00 PM IST.
            </div>
            <div className="quiz-action-buttons">
              <button className="quiz-btn-primary" onClick={() => navigate('/')}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'DRAFT' || quizState === 'SCHEDULED') {
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-waiting">
            <div className="quiz-waiting-icon">⏰</div>
            <div className="quiz-waiting-title">Quiz Starting Soon</div>
            <div className="quiz-waiting-text">
              The quiz will start at 8:00 PM IST. Get ready to test your knowledge!
            </div>
            <div className="quiz-countdown-display">
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
        </div>
      </div>
    );
  }

  if (quizState === 'LOCKED') {
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-status-message">
            <div className="quiz-status-icon">🔒</div>
            <div className="quiz-status-title">Quiz Locked</div>
            <div className="quiz-status-description">
              The quiz is currently locked. It will start at 8:00 PM IST.
            </div>
            <div className="quiz-action-buttons">
              <button className="quiz-btn-primary" onClick={() => navigate('/')}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'ENDED' || quizState === 'RESULT_PUBLISHED') {
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-completion">
            <div className="quiz-completion-icon">🎉</div>
            <div className="quiz-completion-title">Quiz Completed!</div>
            <div className="quiz-completion-message">
              The quiz has ended. Check out the winners and your performance.
            </div>
            <div className="quiz-action-buttons">
              <button className="quiz-btn-primary" onClick={() => navigate('/winners')}>
                View Winners
              </button>
              <button className="quiz-btn-secondary" onClick={() => navigate('/')}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if quiz is LIVE but no question yet
  if (quizState === 'LIVE' && !currentQuestion) {
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-loading">
            <div className="quiz-loading-spinner"></div>
            <div className="quiz-loading-text">Loading question...</div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'LIVE' && currentQuestion) {
    const displayQuestionNumber = currentQuestion.questionIndex || 1;
    const progressPercentage = Math.min(((displayQuestionNumber - 1) / 50) * 100, 100);
    const timerClass = timeLeft > 10 ? 'timer-green' : timeLeft > 5 ? 'timer-yellow' : 'timer-red';
    const timerBarWidth = (timeLeft / 15) * 100;

    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-card">
            {/* Quiz Header */}
            <div className="quiz-header">
              <div className="quiz-question-counter">
                <div className="quiz-question-number">
                  Question {displayQuestionNumber} of 50
                </div>
                <div className="quiz-question-progress">
                  {Math.round(progressPercentage)}% Complete
                </div>
              </div>
              <div className={`quiz-timer ${timerClass}`}>
                <div className="timer-bar" style={{ width: `${timerBarWidth}%` }}></div>
                {timeLeft}s
              </div>
            </div>

            {/* Question */}
            <div className="quiz-question">
              <p className="quiz-question-text">{currentQuestion.text}</p>
            </div>

            {/* Answer Options */}
            <div className="quiz-options">
              {currentQuestion.options.map((option, index) => {
                const letters = ['A', 'B', 'C', 'D'];
                const isSelected = selectedAnswer === index;
                const isLocked = answerLocked || disabled;
                return (
                  <button
                    key={index}
                    className={`quiz-option ${isSelected ? 'selected' : ''} ${isLocked ? 'disabled' : ''} ${answerLocked && isSelected ? 'locked' : ''}`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isLocked}
                  >
                    <span className="quiz-option-letter">{letters[index]}</span>
                    <span className="quiz-option-text">{option}</span>
                    {answerLocked && isSelected && <span className="quiz-option-lock">✓ Locked</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Section */}
          <div className="quiz-progress-section">
            <div className="quiz-progress-bar">
              <div 
                className="quiz-progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="quiz-progress-text">
              Progress: {displayQuestionNumber - 1} / 50 questions completed
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'ERROR') {
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-status-message">
            <div className="quiz-status-icon">⚠️</div>
            <div className="quiz-status-title">Error Loading Quiz</div>
            <div className="quiz-status-description">
              {quizError || 'Something went wrong. Please try again.'}
            </div>
            <div className="quiz-action-buttons">
              <button className="quiz-btn-primary" onClick={() => window.location.reload()}>
                Refresh Page
              </button>
              <button className="quiz-btn-secondary" onClick={() => navigate('/')}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-wrapper">
        <div className="quiz-status-message">
          <div className="quiz-status-icon">❓</div>
          <div className="quiz-status-title">Unknown Quiz State</div>
          <div className="quiz-status-description">
            Current state: {quizState}. {quizError ? 'Error: ' + quizError : 'Something went wrong. Please refresh the page or contact support.'}
          </div>
          <div className="quiz-action-buttons">
            <button className="quiz-btn-primary" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
            <button className="quiz-btn-secondary" onClick={() => navigate('/')}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
