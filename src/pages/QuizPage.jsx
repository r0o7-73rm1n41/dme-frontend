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

  const questionIntervalRef = useRef(null);
  const statusIntervalRef = useRef(null);
  const statusPollCountRef = useRef(0);
  const statusBackoffRef = useRef(30000); // Start with 30 second fallback polling

  // Function to poll current question
  const pollCurrentQuestion = async () => {
    try {
      const res = await API.get('/quiz/current-question');
      const question = res.data;
      setCurrentQuestion(question);
      const expiresAt = new Date(question.expiresAt);
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setDisabled(remaining <= 0);
      setSelectedAnswer(null); // Reset for new question
    } catch (error) {
      if (error.response?.status === 404) {
        setQuizState('ENDED');
      } else {
        console.error('Failed to poll question:', error);
        showAlert('Failed to load question: ' + (error?.response?.data?.message || error.message), 'danger');
      }
    }
  };

  // Connect socket and listen for quiz events
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
        // Force refresh current question when question advances
        pollCurrentQuestion();
      }
    };

    socket.on('quiz-state-changed', handleQuizStateChanged);
    socket.on('question-advanced', handleQuestionAdvanced);

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
      socket.emit('leave-quiz', today);
    };
  }, [user]); // Only depend on user

  // Fallback polling with exponential backoff (30s to 5min max)
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await API.get('/quiz/status');
        setQuizState(res.data.state);
        setQuizError(null);
        // Reset backoff on success
        statusBackoffRef.current = 30000;
        statusPollCountRef.current = 0;
      } catch (error) {
        console.error('Failed to poll status:', error);
        setQuizError(error?.response?.data?.message || error.message);
        statusPollCountRef.current += 1;
        // Exponential backoff: 30s, 1min, 2min, 5min max
        statusBackoffRef.current = Math.min(30000 * Math.pow(2, statusPollCountRef.current), 300000);
      }
    };

    // Start polling after 30 seconds, then use backoff interval
    const timeoutId = setTimeout(() => {
      pollStatus();
      statusIntervalRef.current = setInterval(pollStatus, statusBackoffRef.current);
    }, 30000);

    return () => {
      clearTimeout(timeoutId);
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  // When quiz is LIVE, poll current question every 1 second
  useEffect(() => {
    if (quizState === 'LIVE') {
      // Join the quiz first
      const joinQuiz = async () => {
        try {
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          await API.post(`/quiz/join/${today}`);
        } catch (error) {
          console.error('Failed to join quiz:', error);
        }
      };

      joinQuiz();

      // Initial poll
      pollCurrentQuestion();
      
      // Fallback poll every 30 seconds (reduced from 1 second to prevent rate limiting)
      questionIntervalRef.current = setInterval(pollCurrentQuestion, 30000);

      return () => {
        if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
      };
    } else {
      setCurrentQuestion(null);
      setTimeLeft(15);
      setDisabled(false);
    }
  }, [quizState]);

  const handleAnswerSelect = async (optionIndex) => {
    if (disabled || !currentQuestion) return;

    setSelectedAnswer(optionIndex);
    setDisabled(true);

    try {
      await API.post('/quiz/answer', {
        questionId: currentQuestion.questionId,
        selectedOptionIndex: optionIndex
      });
      // Clear selection immediately after submitting
      setSelectedAnswer(null);
    } catch (error) {
      showAlert('Failed to submit answer: ' + (error?.response?.data?.message || error.message), 'danger');
      setDisabled(false); // Allow retry
      setSelectedAnswer(null); // Clear selection on error
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
    return (
      <div className="quiz-container">
        <div className="quiz-wrapper">
          <div className="quiz-status-message">
            <div className="quiz-status-icon">📅</div>
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
            <div className="quiz-countdown">
              Quiz begins in a few hours
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
                return (
                  <button
                    key={index}
                    className={`quiz-option ${selectedAnswer === index ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={disabled}
                  >
                    <span className="quiz-option-letter">{letters[index]}</span>
                    <span className="quiz-option-text">{option}</span>
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
