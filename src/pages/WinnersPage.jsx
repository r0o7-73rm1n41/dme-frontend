// frontend/src/pages/WinnersPage.jsx
// At the top of your file
import * as motion from "motion/react-client";
import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import Confetti from "react-confetti";
import DarkModeToggle from "../components/DarkModeToggle";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import API from "../utils/api";
import "../styles/global.css";
import { getImageURL } from "../utils/imageHelper";


export default function WinnersPage() {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const { date } = useParams(); // Optional date parameter
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [quizDate, setQuizDate] = useState(null);
  const [resultPublished, setResultPublished] = useState(false);
  const [autoRefreshTimer, setAutoRefreshTimer] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const autoRefreshRef = useRef(null);

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Trigger confetti on page load
  useEffect(() => {
    setShowConfetti(true);
    // Extended duration so confetti slowly falls after burst before disappearing
    const timer = setTimeout(() => setShowConfetti(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadWinners(selectedDate);

    const today = new Date().toISOString().split("T")[0];
    if (selectedDate !== today) return;

    const timeout = setTimeout(() => {
      autoRefreshRef.current = setInterval(() => {
        loadWinners(selectedDate);
      }, 30000);
    }, 30 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [selectedDate]);

  const loadWinners = async (dateParam) => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = '/quiz/winners';
      const params = dateParam ? { quizDate: dateParam } : {};
      const response = await API.get(endpoint, { params });
      
      if (response.data.winners && response.data.winners.length > 0) {
        setWinners(response.data.winners);
        setTotalParticipants(response.data.totalParticipants || 0);
        setQuizDate(response.data.quizDate);
        setResultPublished(true);
      } else {
        setWinners([]);
        setTotalParticipants(0);
        setQuizDate(dateParam ? new Date(dateParam) : new Date());
        setResultPublished(false);
      }
    } catch (error) {
      console.error("Failed to load winners:", error);
      setError("Failed to load winners data");
      setWinners([]);
      setResultPublished(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // const getPrizeAmount = (rank) => {
  //   if (rank === 1 || rank === 2) return "10,000";
  //   if (rank === 3 || rank === 4) return "5,000";
  //   if (rank === 5 || rank === 6) return "2,500";
  //   return "500";
  // };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <>
      {/* Left bottom corner - explosive burst */}
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          numberOfPieces={300}
          initialVelocityX={{ min: 30, max: 100 }}
          initialVelocityY={{ min: -100, max: -50 }}
          gravity={1.2}
          friction={0.92}
          confettiSource={{ x: 20, y: windowDimensions.height - 20, w: 40, h: 40 }}
          style={{ position: 'fixed', zIndex: 9999 }}
          recycle={false}
        />
      )}

      {/* Right bottom corner - explosive burst */}
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          numberOfPieces={300}
          initialVelocityX={{ min: -100, max: -30 }}
          initialVelocityY={{ min: -100, max: -50 }}
          gravity={1.2}
          friction={0.92}
          confettiSource={{ x: windowDimensions.width - 20, y: windowDimensions.height - 20, w: 40, h: 40 }}
          style={{ position: 'fixed', zIndex: 9999 }}
          recycle={false}
        />
      )}

      <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME2.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>{t('WINNERS')}</h2>
      </header>

      <div className="winners-container">
        <div className="winners-header">
          {/* <div className="wnr-container"> */}
          <h2>Quiz Results</h2>
          <h2>Daily Mind Education</h2>
          {/* <div className="trophy-icon" aria-label="Trophy">
            <img alt="quiz" src="https://img.icons8.com/?size=100&amp;id=cRDlJeszVWm0&amp;format=png&amp;color=000000" ></img>
          <p>Top 20 Winners - {formatDate(quizDate)}</p>
          </div> */}

  <div className="confetti-area">
          <div className="trophy-icon" aria-label="Trophy">
    <img className="trophy-confetti" 
         alt="quiz" 
        //  src="https://img.icons8.com/?size=100&id=cRDlJeszVWm0&format=png&color=000000" />
                 src="./public/imgs/9ca41b3b-36d0-4b1e-9a9d-cc0ca1b43d4f.png" />
  </div>
 <p>{t('top20Winners')} - {formatDate(quizDate)}</p>
</div>



          {/* <p>Total 50 Questions Answered</p> */}
          <h3>Congratulations To The Winners!</h3>

<div className="credits-wrapper">
  <div className="credits-scroll">
    {[
      "Pramod Kumar - 25 (5 min 48 sec)",
      "Gulshan Singh Rajput - 25 (5 min 50 sec)",
      "Suman Kumar - 25 (6 min 02 sec)",
      "Suraj Kumar - 25 (6 min 02 sec)",
      "Rajesh Maraiya - 25 (6 min 02 sec)",
      "Monam Kumari - 25 (6 min 02 sec)"
    ].map((name, i) => (
      <div key={i} className="winnerr">{name}</div>
    ))}

    {/* duplicate list for seamless loop */}
    {[
      "Pramod Kumar - 25 (5 min 48 sec)",
      "Gulshan Singh Rajput - 25 (5 min 50 sec)",
      "Suman Kumar - 25 (6 min 02 sec)",
      "Suraj Kumar - 25 (6 min 02 sec)",
      "Rajesh Maraiya - 25 (6 min 02 sec)",
      "Monam Kumari - 25 (6 min 02 sec)"
    ].map((name, i) => (
      <div key={"dup_" + i} className="winnerr">{name}</div>
    ))}
  </div>
</div>


          {/* </div> */}
          
          {/* Date Selector */}
          <div style={{ margin: '20px 0' }}>
            <label htmlFor="date-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
              Select Date:
            </label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
              style={{
                padding: '8px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
            />
          </div>

          {totalParticipants > 0 && (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '50px',
              marginBottom: '20px',
              textAlign: 'center',
              border: 'double 4px',
              color: 'lightgray',
            }}>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'rgb(0 123 255)' }}>
                Total Participants: {totalParticipants}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px' }}>⌛️{t('loading')}...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
            <h3>{t('error')}</h3>
            <p>{error}</p>
            <button 
              onClick={() => loadWinners(selectedDate)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        ) : winners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3>⏳ Yet Results Not Published...</h3>
            <p>Results For {formatDate(quizDate)} Will Be Available After The Quiz Ends.</p>
            {selectedDate === new Date().toISOString().split('T')[0] && (
              <p style={{ color: '#666', fontSize: '14px' }}>Automatic Refreshing Please wait...</p>
            )}
            <p>Select From A Different Date Or Wait For The Results.</p>
          </div>
        ) : (
//           <div className="winners-list">
//             {winners.map((winner, index) => (
//               <div 
//                 key={index} 
//                 className={`winner-card ${winner.rank <= 3 ? 'top-three' : ''}`}
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   padding: '15px',
//                   margin: '10px 0',
//                   backgroundColor: winner.rank <= 3 ? '#ffffffff' : '#fff',
//                   border: winner.rank <= 3 ? '2px solid #ffffffff' : '1px solid #ffffffff',
//                   borderRadius: '10px',
//                   boxShadow: winner.rank <= 3 ? '0 4px 8px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
//                 }}
//               >

//                 <div className="rank" style={{ marginRight: '20px', minWidth: '60px' }}>
//                   {winner.rank <= 3 ? (
//                     <span className="medal" style={{ fontSize: '30px' }}>
//                       {getMedalEmoji(winner.rank)}
//                     </span>
//                   ) : (
//                     <span 
//                       className="rank-number" 
//                       style={{ 
//                         fontSize: '24px', 
//                         fontWeight: 'bold',
//                         color: '#6c757d'
//                       }}
//                     >
//                       #{winner.rank}
//                     </span>
//                   )}
//                 </div>
                
//                 <div className="winner-info" style={{ flex: 1 }}>
//                   <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px',  }}>
//                     {winner.user.profileImage ? (
//                       <img 
//                         src={`http://localhost:5000/images/${winner.user.profileImage}`}
//                         alt="Profile"
//                         style={{
//                           width: '40px',
//                           height: '40px',
//                           borderRadius: '50%',
//                           marginRight: '10px',
//                           objectFit: 'cover'
//                         }}
//                         onError={(e) => {
//                           e.target.style.display = 'none';
//                         }}
//                       />
//                     ) : (
//                       <div 
//                         style={{
//                           width: '40px',
//                           height: '40px',
//                           borderRadius: '50%',
//                           backgroundColor: '#007bff',
//                           color: 'white',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           marginRight: '10px',
//                           fontSize: '16px',
//                           fontWeight: 'bold'
//                         }}
//                       >
//                         {winner.user.fullName?.charAt(0)?.toUpperCase() || winner.user.username?.charAt(0)?.toUpperCase() || 'U'}
//                       </div>
//                     )}
//                     {/* <h3 style={{ margin: 0, fontSize: '18px' }}>
//                       {winner.user.fullName || winner.user.username || 'Anonymous'}
//                       </h3> */}
//                     {/* <h3 className={winner.rank === 1 ? "shimmer" : ""} style={{ margin: 0, fontSize: '18px' }}>
//   {winner.user.fullName || winner.user.username || 'Anonymous'}
  
//   {winner.rank === 1 && <span className="badge gold">GOLD</span>}
//   {winner.rank === 2 && <span className="badge silver">SILVER</span>}
//   {winner.rank === 3 && <span className="badge bronze">BRONZE</span>}
//   </h3> */}

//   {winner.rank === 1 && <span className="crown">👑</span>}
// <h3 className={winner.rank === 1 ? "shimmer" : ""} style={{ margin: 0, fontSize: '13px', position: 'relative' }}>

//   {winner.user.fullName || winner.user.username || 'Anonymous'}
//   {winner.rank === 1 && <span className="badge gold">WINNER</span>}
//   {winner.rank === 2 && <span className="badge silver">WINNER</span>}
//   {winner.rank === 3 && <span className="badge bronze">WINNER</span>}

// </h3>

//                   </div>
                  
//                   <div style={{ display: 'flex', gap: '2px', fontSize: '14px', color: '#6c757d' }}>
//                     <span>Score: <strong>{winner.score}</strong></span>
//                     <span>Correct: <strong>{winner.correctAnswers}/{winner.totalQuestions}</strong></span>
//                     <span>Accuracy: <strong>{winner.accuracy}%</strong></span>
//                     <span>Time: <strong>{Math.floor(winner.timeSpent / 60)}m {winner.timeSpent % 60}s</strong></span>
//                   </div>
//                 </div>
                
//               </div>
//             ))}
//           </div>
<div className="winners-list">
  {winners.map((winner, index) => (
    <motion.div
      key={index}
      className={`winner-card ${winner.rank <= 3 ? 'top-three' : ''}`}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 16px rgba(0,0,0,0.2)" }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        margin: '10px 0',
        backgroundColor: winner.rank <= 3 ? '#ffffffff' : '#fff',
        border: winner.rank <= 3 ? '2px solid #ffffffff' : '1px solid #ffffffff',
        borderRadius: '10px',
        boxShadow: winner.rank <= 3 ? '0 4px 8px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
      }}
    >
      {/* The rest of your winner content stays the same */}
      <div className="rank" style={{ marginRight: '20px', minWidth: '60px' }}>
        {winner.rank <= 3 ? (
          <span className="medal" style={{ fontSize: '30px' }}>
            {getMedalEmoji(winner.rank)}
          </span>
        ) : (
          <span 
            className="rank-number" 
            style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}
          >
            #{winner.rank}
          </span>
        )}
      </div>

      <div className="winner-info" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          {winner.user.profileImage ? (
            <img 
              // src={`http://localhost:5000/images/${winner.user.profileImage}`}
              src={getImageURL(winner.user.profileImage)}
              alt="Profile"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                marginRight: '10px',
                objectFit: 'cover'
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#007bff',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '10px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {winner.user.fullName?.charAt(0)?.toUpperCase() || winner.user.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}

          {winner.rank === 1 && <span className="crown">👑</span>}
          <h3 className={winner.rank === 1 ? "shimmer" : ""} style={{ margin: 0, fontSize: '13px', position: 'relative' }}>
            {winner.user.fullName || winner.user.username || 'Anonymous'}
            {winner.rank === 1 && <span className="badge gold">WINNER</span>}
            {winner.rank === 2 && <span className="badge silver">WINNER</span>}
            {winner.rank === 3 && <span className="badge bronze">WINNER</span>}
          </h3>
        </div>
        
        
        <div style={{ display: 'flex', gap: '2px', fontSize: '14px', color: '#6c757d' }}>
          <span>{t('score')}: <strong>{winner.score}</strong></span>
          <span>Correct: <strong>{winner.correctAnswers}/{winner.totalQuestions}</strong></span>
          <span>{t('accuracy')}: <strong>{winner.accuracy}%</strong></span>
          <span>{t('time')}: <strong>{Math.floor(winner.timeSpent / 60)}m {winner.timeSpent % 60}s</strong></span>
        </div>
      </div>
    </motion.div>
  ))}
</div>

        )}

        <div className="winners-footer" style={{ textAlign: 'center', marginTop: '1px', padding: '20px' }}>
          <p style={{ fontSize: '11px', marginBottom: '1px' }}>🎉 Congratulations to all winners!</p>
          <p style={{ color: '#6c757d' }}>Join tomorrow's quiz for your chance to win!</p>
          
          {user && (
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={() => window.location.href = '/quiz'}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('joinQuiz')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}



