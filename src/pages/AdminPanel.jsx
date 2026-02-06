// frontend/src/pages/AdminPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminAPI from '../utils/adminApi';
import './AdminPanel.css';

// Import Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Doughnut center text plugin
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();

    const value = chart.data.datasets[0].data[0];
    const fontSize = Math.min(width, height) / 6;

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#660000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(value, width / 2, height / 2);
    ctx.restore();
  }
};


const AdminPanel = () => {
  const navigate = useNavigate();
  const { admin, adminLogout } = useAdminAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarActive, setSidebarActive] = useState(false);
  
  // Debug admin authentication
  useEffect(() => {
    console.log('AdminPanel - Admin state:', admin);
    console.log('AdminPanel - Admin token:', localStorage.getItem('adminToken'));
    console.log('AdminPanel - Regular token:', localStorage.getItem('token'));
  }, [admin]);
  
  // Chart click filtering
  const [userFilter, setUserFilter] = useState(null);
  const [filteredUsers, setFilteredUsers] = useState([]);

  
  // Dashboard data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalRevenue: 0,
    todayUsers: 0
  });
  
  // User management
  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  
  // Quiz management
  const [quizzes, setQuizzes] = useState([]);
  
  // Payment history
  const [payments, setPayments] = useState([]);
  
  // Blog approval
  const [pendingBlogs, setPendingBlogs] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Winners
  const [winners, setWinners] = useState([]);
  const [winnersDate, setWinnersDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Reports
  const [reports, setReports] = useState([]);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizFormData, setQuizFormData] = useState({
    classGrade: 'ALL',
    questions: Array(50).fill().map(() => ({
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0
    }))
  });

  // Debug pending blogs state
  useEffect(() => {
    console.log('🔄 pendingBlogs state changed:', pendingBlogs.length, 'blogs');
  }, [pendingBlogs]);

  const checkAdminAccess = useCallback(() => {
    // Check if admin is logged in
    if (!admin) {
      navigate('/admin-login');
    }
  }, [admin, navigate]);

  useEffect(() => {
    checkAdminAccess();
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkAdminAccess]);
  
  useEffect(() => {
    if (currentView === 'winners') {
      loadWinners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnersDate, currentView]);
  
  useEffect(() => {
    if (currentView === 'reports') {
      loadReports();
    }
  }, [currentView]);
  
  useEffect(() => {
    // Load pending blogs when component mounts or when view changes to blogApproval
    console.log('🔄 useEffect triggered for blogApproval, currentView:', currentView);
    if (currentView === 'blogApproval') {
      console.log('🔄 Calling loadPendingBlogs from useEffect');
      loadPendingBlogs();
    }
  }, [currentView]);

  const loadDashboardData = async () => {
    try {
      // Load dashboard stats
      const statsRes = await AdminAPI.get('/admin/dashboard');
      setStats(statsRes.data);
      
      // Load users
      const usersRes = await AdminAPI.get('/admin/users');
      console.log('Admin API /admin/users response:', usersRes);
      console.log('usersRes.data:', usersRes.data);
      console.log('usersRes.data.users:', usersRes.data.users);
      
      // Debug: Log each user's classGrade
      if (usersRes.data.users && Array.isArray(usersRes.data.users)) {
        usersRes.data.users.forEach((u, idx) => {
          console.log(`User ${idx}: ${u.name} - class="${u.class}", classGrade="${u.classGrade}"`);
        });
      }
      
      setUsers(usersRes.data.users || []);
      
      // Load quizzes
      try {
        const quizzesRes = await AdminAPI.get('/admin/quiz');
        setQuizzes(quizzesRes.data.quizzes || []);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
        setQuizzes([]);
      }
      
      // Load payments
      const paymentsRes = await AdminAPI.get('/admin/payments');
      setPayments(paymentsRes.data.payments || []);
      
      // Load pending blogs if on blog approval view
      if (currentView === 'blogApproval') {
        await loadPendingBlogs();
      }
      
      // Load winners if on winners view
      if (currentView === 'winners') {
        await loadWinners();
      }
      
      // Load reports if on reports view
      if (currentView === 'reports') {
        await loadReports();
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };
  
  const loadWinners = async () => {
    try {
      const res = await AdminAPI.get(`/admin/winners`, { params: { date: winnersDate } });
      setWinners(res.data.winners || []);
    } catch (error) {
      console.error('Failed to load winners:', error);
      setWinners([]);
    }
  };
  
  const loadReports = async () => {
    try {
      const res = await AdminAPI.get('/reports/admin/pending');
      setReports(res.data || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports([]);
    }
  };

  const loadPendingBlogs = async () => {
    try {
      console.log('🔍 loadPendingBlogs called');
      console.log('🔍 AdminAPI baseURL:', AdminAPI.defaults.baseURL);
      console.log('🔍 Admin token in localStorage:', localStorage.getItem('adminToken'));
      console.log('🔍 Making API call to /admin/blogs/pending');
      
      const res = await AdminAPI.get('/admin/blogs/pending');
      
      console.log('✅ Pending blogs API response:', res);
      console.log('✅ Pending blogs data:', res.data);
      console.log('✅ Pending blogs array length:', Array.isArray(res.data) ? res.data.length : 'Not an array');
      
      setPendingBlogs(Array.isArray(res.data) ? res.data : []);
      console.log('🔄 setPendingBlogs called with:', Array.isArray(res.data) ? res.data.length : 0, 'blogs');
    } catch (error) {
      console.error('❌ Failed to load pending blogs:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
    }
  };

  const approveBlog = async (blogId) => {
    try {
      await AdminAPI.post(`/admin/blogs/${blogId}/approve`);
      alert('✅ Blog approved successfully!');
      await loadPendingBlogs();
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve blog:', error);
      alert(error?.response?.data?.message || 'Failed to approve blog');
    }
  };

  const openRejectModal = (blog) => {
    setSelectedBlog(blog);
    setShowRejectModal(true);
  };

  const rejectBlog = async () => {
    if (!selectedBlog) return;
    try {
      await AdminAPI.post(`/admin/blogs/${selectedBlog._id}/reject`, {
        rejectionReason: rejectionReason || 'Content does not meet guidelines'
      });
      alert('✅ Blog rejected successfully!');
      setShowRejectModal(false);
      setSelectedBlog(null);
      setRejectionReason('');
      await loadPendingBlogs();
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject blog:', error);
      alert(error?.response?.data?.message || 'Failed to reject blog');
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate('/admin-login');
  };

  const handleViewChange = (view) => {
    console.log('🔄 handleViewChange called with view:', view);
    console.log('🔄 Previous currentView:', currentView);
    setCurrentView(view);
    setSidebarActive(false);
    // Load pending blogs when switching to blog approval view
    if (view === 'blogApproval') {
      console.log('🔄 Calling loadPendingBlogs from handleViewChange');
      loadPendingBlogs();
    }
    // Load reports when switching to reports view
    if (view === 'reports') {
      loadReports();
    }
  };

  const toggleSidebar = () => {
    setSidebarActive(!sidebarActive);
  };

  // User management functions
  // const openUserForm = (user = null) => {
  //   setEditingUser(user);
  //   setShowUserModal(true);
  // };

  const closeUserForm = () => {
    setEditingUser(null);
    setShowUserModal(false);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    // Implement user create/update logic
    closeUserForm();
    loadDashboardData();
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await AdminAPI.delete(`/admin/users/${userId}`);
        loadDashboardData();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const toggleUserStatus = async (userId, isBlocked) => {
    try {
      if (isBlocked) {
        await AdminAPI.post(`/admin/users/${userId}/unblock`);
      } else {
        await AdminAPI.post(`/admin/users/${userId}/block`);
      }
      loadDashboardData();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };
  
  const verifyPayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to verify this payment?')) {
      try {
        await AdminAPI.post(`/admin/payments/${paymentId}/verify`);
        alert('✅ Payment verified successfully!');
        loadDashboardData();
      } catch (error) {
        console.error('Failed to verify payment:', error);
        alert(error?.response?.data?.message || 'Failed to verify payment');
      }
    }
  };
  
  const rejectPayment = async (paymentId) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      try {
        await AdminAPI.post(`/admin/payments/${paymentId}/reject`, { reason });
        alert('✅ Payment rejected successfully!');
        loadDashboardData();
      } catch (error) {
        console.error('Failed to reject payment:', error);
        alert(error?.response?.data?.message || 'Failed to reject payment');
      }
    }
  };

  // Quiz management functions
  const openQuizForm = (quiz = null) => {
    if (quiz) {
      // Editing existing quiz
      setEditingQuiz({
        ...quiz,
        quizDate: quiz.quizDate || new Date().toISOString().split('T')[0]
      });
      setQuizFormData({
        title: quiz.title || 'Daily Quiz',
        description: quiz.description || 'Daily 50 Question Quiz',
        classGrade: quiz.classGrade || 'ALL',
        quizDate: quiz.quizDate || new Date().toISOString().split('T')[0]
      });
    } else {
      // New quiz
      setQuizFormData({
        title: 'Daily Quiz',
        description: 'Daily 50 Question Quiz',
        classGrade: 'ALL',
        quizDate: new Date().toISOString().split('T')[0],
        questions: Array(50).fill().map(() => ({
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0
        }))
      });
      setEditingQuiz(null);
    }
    setShowQuizModal(true);
  };

  const closeQuizForm = () => {
    setEditingQuiz(null);
    setShowQuizModal(false);
    // Reset form data to default
    setQuizFormData({
      classGrade: 'ALL',
      questions: Array(50).fill().map(() => ({
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0
      }))
    });
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const title = formData.get('title')?.trim() || 'Daily Quiz';
      const description = formData.get('description')?.trim() || 'Daily 50 Question Quiz';
      const classGrade = formData.get('classGrade') || 'ALL';
      const quizDate = formData.get('quizDate') || new Date().toISOString().split('T')[0];
      
      if (editingQuiz) {
        // Editing existing quiz
        await AdminAPI.put(`/admin/quiz/${editingQuiz.quizDate}`, {
          title,
          description,
          classGrade
        });
        alert('✅ Quiz updated successfully!');
      } else {
        // Creating new quiz
        // Get questions from form (for 50 questions)
        const questions = [];
        for (let i = 0; i < 50; i++) {
          const question = formData.get(`question_${i}`);
          const optionA = formData.get(`optionA_${i}`);
          const optionB = formData.get(`optionB_${i}`);
          const optionC = formData.get(`optionC_${i}`);
          const optionD = formData.get(`optionD_${i}`);
          const correctIndex = parseInt(formData.get(`correct_${i}`));
          
          if (question && optionA && optionB && optionC && optionD && !isNaN(correctIndex)) {
            questions.push({
              question: question.trim(),
              options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
              correctIndex: correctIndex
            });
          }
        }
        
        if (questions.length !== 50) {
          alert(`Please provide exactly 50 questions. Currently: ${questions.length}`);
          return;
        }

        await AdminAPI.post('/admin/quiz', {
          quizDate,
          title,
          description,
          questions: questions,
          classGrade: classGrade
        });
        
        alert('✅ Quiz created successfully! Quiz will auto-start at 8:00 PM IST');
      }
      
      closeQuizForm();
      loadDashboardData();
    } catch (error) {
      console.error('Failed to save quiz:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to save quiz';
      alert(`❌ ${errorMsg}`);
    }
  };

  const deleteQuiz = async (quiz) => {
    if (!quiz) return;
    
    const quizDate = quiz.date || quiz.quizDate;
    if (window.confirm(`Are you sure you want to delete the quiz for ${new Date(quizDate).toLocaleDateString()}? This cannot be undone.`)) {
      try {
        await AdminAPI.delete(`/admin/quiz/${quizDate}`);
        alert('✅ Quiz deleted successfully!');
        loadDashboardData();
      } catch (error) {
        console.error('Failed to delete quiz:', error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Failed to delete quiz';
        alert(`❌ ${errorMsg}`);
      }
    }
  };

  // Publish/unpublish quiz (disabled - not implemented)
  const togglePublishQuiz = async (quiz) => {
    alert('Publish functionality is not currently implemented.');
  };

  // Start quiz now (manual)
  const startQuizNow = async (quiz) => {
    if (!quiz) return;
    
    try {
      const quizDate = quiz.date || quiz.quizDate;
      await AdminAPI.put(`/admin/quiz/${quizDate}/start`);
      loadDashboardData();
      alert('✅ Quiz started successfully!');
    } catch (error) {
      console.error('Failed to start quiz:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to start quiz';
      if (errorMsg.includes('already live')) {
        alert('ℹ️ Quiz is already live. No action needed.');
      } else {
        alert(`❌ ${errorMsg}`);
      }
    }
  };

  // CSV upload - now populates form instead of creating quiz
  const [uploading, setUploading] = useState(false);
  const uploadCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // Parse CSV locally
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 51) { // header + 50 questions
        throw new Error(`CSV must contain at least 51 lines (header + 50 questions). Found: ${lines.length}`);
      }
      
      // Parse questions (skip header)
      const questions = [];
      for (let i = 1; i < lines.length && questions.length < 50; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 7) continue; // Now includes points
        
        const [question, optionA, optionB, optionC, optionD, correctAnswer, points] = parts;
        const correctIndex = parseInt(correctAnswer) - 1;
        const pointsValue = parseInt(points) || 1;
        
        if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) continue;
        
        questions.push({
          question: question || '',
          options: [optionA || '', optionB || '', optionC || '', optionD || ''],
          correctIndex: correctIndex,
          points: pointsValue
        });
      }
      
      if (questions.length !== 50) {
        throw new Error(`CSV must contain exactly 50 valid questions. Found: ${questions.length}`);
      }
      
      // Step 1: Create questions via bulk API
      console.log('Creating questions via bulk API...');
      const bulkRes = await AdminAPI.post('/admin/questions/bulk', {
        questions: questions
      });
      
      if (!bulkRes.data.questionIds || bulkRes.data.questionIds.length !== 50) {
        throw new Error('Failed to create questions. Expected 50 question IDs.');
      }
      
      const questionIds = bulkRes.data.questionIds;
      console.log('Questions created successfully:', questionIds.length);
      
      // Step 2: Create quiz with question IDs
      console.log('Creating quiz with question IDs...');
      try {
        await AdminAPI.post('/admin/quiz', {
          questions: questionIds,
          classGrade: 'ALL' // Default for now
        });
        alert('✅ Quiz created successfully from CSV! Questions saved and quiz set to SCHEDULED state.');
      } catch (quizError) {
        console.error('Quiz creation error:', quizError);
        // Check if quiz was actually created despite the error
        try {
          const statusRes = await AdminAPI.get('/admin/quiz/status');
          if (statusRes.data && statusRes.data.quizDate) {
            alert('✅ Quiz was created successfully despite the error! Please refresh the page.');
          } else {
            throw quizError;
          }
        } catch (statusError) {
          throw quizError; // Re-throw the original error
        }
      }
      loadDashboardData();
      
    } catch (err) {
      console.error('CSV upload failed:', err);
      alert(err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = `question,optionA,optionB,optionC,optionD,correctAnswer,points
What is the capital of India?,Delhi,Mumbai,Kolkata,Chennai,1,1
Which planet is known as the Red Planet?,Venus,Mars,Jupiter,Saturn,2,1
What is 2 + 2?,3,4,5,6,2,1
Who wrote Romeo and Juliet?,Charles Dickens,William Shakespeare,Mark Twain,Jane Austen,2,1
What is the largest mammal?,Elephant,Blue whale,Giraffe,Hippopotamus,2,1
What is the chemical symbol for gold?,Go,Au,Ag,Gd,2,1
Which country has the most population?,China,India,USA,Indonesia,1,1
What is the smallest prime number?,1,2,3,4,2,1
Who painted the Mona Lisa?,Vincent van Gogh,Leonardo da Vinci,Pablo Picasso,Michelangelo,2,1
What is the speed of light?,300,000 km/s,300,000 m/s,30,000 km/s,3,000 km/s,1,1
What is the largest ocean?,Atlantic,Pacific,Indian,Arctic,2,1
Which element has the symbol 'O'?,Oxygen,Gold,Silver,Copper,1,1
What is the currency of Japan?,Yen,Dollar,Euro,Pound,1,1
Who discovered gravity?,Isaac Newton,Albert Einstein,Galileo,Charles Darwin,1,1
What is the hardest natural substance?,Diamond,Gold,Silver,Platinum,1,1
Which planet is closest to the Sun?,Venus,Mercury,Earth,Mars,2,1
What is the largest continent?,Asia,Africa,North America,Europe,1,1
Who wrote 'To Kill a Mockingbird'?,Harper Lee,Mark Twain,Ernest Hemingway,F. Scott Fitzgerald,1,1
What is the chemical symbol for water?,H2O,CO2,O2,H2SO4,1,1
Which country is known as the Land of the Rising Sun?,China,Japan,South Korea,Thailand,2,1
What is the largest planet in our solar system?,Saturn,Jupiter,Neptune,Uranus,2,1
Who composed 'The Four Seasons'?,Johann Sebastian Bach,Antonio Vivaldi,Wolfgang Amadeus Mozart,Ludwig van Beethoven,2,1
What is the smallest country in the world?,Monaco,Vatican City,San Marino,Liechtenstein,2,1
Which gas makes up most of Earth's atmosphere?,Oxygen,Nitrogen,Carbon dioxide,Argon,2,1
What is the longest river in the world?,Amazon,Nile,Mississippi,Yangtze,2,1
Who wrote '1984'?,George Orwell,Aldous Huxley,Ray Bradbury,Philip K. Dick,1,1
What is the chemical symbol for iron?,Fe,Ir,In,I,1,1
Which planet is known for its rings?,Jupiter,Saturn,Uranus,Neptune,2,1
What is the largest desert in the world?,Sahara,Antarctic,Arctic,Gobi,2,1
Who painted 'The Starry Night'?,Vincent van Gogh,Claude Monet,Pablo Picasso,Salvador Dali,1,1
What is the chemical symbol for silver?,Si,Ag,Au,Al,2,1
Which country has the most time zones?,Russia,USA,China,Canada,1,1
What is the largest bird in the world?,Ostrich,Emu,Albatross,Condor,1,1
Who wrote 'Pride and Prejudice'?,Charlotte Bronte,Jane Austen,Emily Bronte,Virginia Woolf,2,1
What is the chemical symbol for carbon?,Ca,C,Co,Cu,2,1
Which planet is known as the Evening Star?,Venus,Mercury,Mars,Jupiter,1,1
What is the largest lake in the world?,Caspian Sea,Lake Superior,Lake Victoria,Lake Baikal,1,1
Who composed 'The Nutcracker'?,Pyotr Ilyich Tchaikovsky,Ludwig van Beethoven,Johann Sebastian Bach,Wolfgang Amadeus Mozart,1,1
What is the chemical symbol for nitrogen?,Ni,N,Na,Ne,2,1
Which country is known as the Emerald Isle?,Ireland,Scotland,Wales,England,1,1
What is the largest island in the world?,Greenland,Madagascar,Borneo,New Guinea,1,1
Who wrote 'The Great Gatsby'?,F. Scott Fitzgerald,Ernest Hemingway,Mark Twain,John Steinbeck,1,1
What is the chemical symbol for hydrogen?,H,He,Hi,Hy,1,1
Which planet is known as the Red Planet?,Venus,Mars,Jupiter,Saturn,2,1
What is the largest mountain in the world?,Mount Everest,K2,Kilimanjaro,Denali,1,1
Who painted 'The Last Supper'?,Leonardo da Vinci,Michelangelo,Raphael,Donatello,1,1
What is the chemical symbol for helium?,He,H,Hi,Hy,1,1
Which country is known as the Land of Fire and Ice?,Iceland,Greenland,Norway,Finland,1,1
What is the largest canyon in the world?,Grand Canyon,Colca Canyon,Copper Canyon,Kali Gandaki Gorge,1,1
Who wrote 'The Catcher in the Rye'?,J.D. Salinger,Ernest Hemingway,Mark Twain,John Steinbeck,1,1
What is the chemical symbol for calcium?,Ca,C,Co,Cu,1,1
Which planet is known as the Morning Star?,Venus,Mercury,Mars,Jupiter,1,1`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_template_50_questions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Chart data
  // const studentChartData = {
  //   labels: ['Joined', 'Waiting'],
  //   datasets: [{
  //     data: [stats.totalUsers || 50, 50],
  //     backgroundColor: ['#660000', '#bd882f'],
  //     hoverOffset: 10
  //   }]
  // };
const joined = stats.totalUsers || 0;
const waiting = Math.max(0, 100 - joined);

const studentChartData = {
  labels: ['Joined', 'Waiting'],
  datasets: [
    {
      data: [joined, waiting],
      backgroundColor: ['#660000', '#bd882f'],
      borderWidth: 0,
      hoverOffset: 12
    }
  ]
};



  const liveChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Present',
        data: [3, 4, 2, 3, 5],
        borderColor: '#FF0000',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Waiting',
        data: [2, 1, 3, 4, 2],
        borderColor: '#FFDB58',
        fill: false,
        tension: 0.1
      }
    ]
  };

  const paymentChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [{
      label: 'Revenue (₹)',
      data: [12000, 18000, 15000, 22000, 17000, 25000, 30000],
      backgroundColor: '#007bff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  // const doughnutOptions = {
  //   ...chartOptions,
  //   cutout: '70%'
  // };

  const handleStudentChartClick = (event, elements) => {
  if (!elements.length) return;

  const index = elements[0].index;
  const label = studentChartData.labels[index];

  setUserFilter(label);

  if (label === 'Joined') {
    setFilteredUsers(users.filter(u => !u.isBanned));
  } else {
    setFilteredUsers(users.filter(u => u.isBanned));
  }
};


const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: {
      position: 'bottom'
    }
  },
  onClick: handleStudentChartClick
};


  return (
    <div className="admin-container">
      {/* Mobile Menu Toggle */}
      <button className="menu-toggle" onClick={toggleSidebar}>
        ☰
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarActive && (
        <div 
          className="sidebar-overlay active" 
          onClick={() => setSidebarActive(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarActive ? 'active' : ''}`} id="sidebar">
        <div className="logo3">
      <img src="/imgs/logo-DME2.png" alt="Logo3" />
      </div>
        {/* <div className="logo">
          <img src="/imgs/logoo-DME.png" alt="Logo" onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.textContent = 'DME Admin';
            }} />
            <span style={{ display: 'none' }}>DME Admin</span>
            </div> */}
        <ul id="menuList">
          <li className={currentView === 'dashboard' ? 'active' : ''} onClick={() => handleViewChange('dashboard')}>
            <button type="button" className="nav-link">Dashboard</button>
          </li>
          <li className={currentView === 'userManagement' ? 'active' : ''} onClick={() => handleViewChange('userManagement')}>
            <button type="button" className="nav-link">User Management</button>
          </li>
          <li className={currentView === 'quizManagement' ? 'active' : ''} onClick={() => handleViewChange('quizManagement')}>
            <button type="button" className="nav-link">Quiz Management</button>
          </li>
          <li className={currentView === 'paymentHistory' ? 'active' : ''} onClick={() => handleViewChange('paymentHistory')}>
            <button type="button" className="nav-link">Payment History</button>
          </li>
          <li className={currentView === 'blogApproval' ? 'active' : ''} onClick={() => handleViewChange('blogApproval')}>
            <button type="button" className="nav-link">Blog Approval</button>
          </li>
          <li className={currentView === 'winners' ? 'active' : ''} onClick={() => handleViewChange('winners')}>
            <button type="button" className="nav-link">Winners</button>
          </li>
          <li className={currentView === 'reports' ? 'active' : ''} onClick={() => handleViewChange('reports')}>
            <button type="button" className="nav-link">User Reports</button>
          </li>
          <li className={currentView === 'settings' ? 'active' : ''} onClick={() => handleViewChange('settings')}>
            <button type="button" className="nav-link">Settings</button>
          </li>
          <li onClick={handleLogout}>
            <button type="button" className="nav-link logout">Logout</button>
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      
      <div className="admin-main-content">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="view-section">
            <h1>Daily Mind Education Admin Panel</h1>
            <h2>Welcome, {admin?.fullName || admin?.username}</h2>
            <div className="cards-grid">
              {/* Students Chart */}
              {/* <div className="card">
                <h2>Students Joined</h2>
                <div className="chart-container">
                  <Doughnut data={studentChartData} options={doughnutOptions} />
                </div>
              </div> */}

              <div className="card student-card">
  <h2>Students Joined</h2>

  <div className="chart-container">
    {/* <Doughnut data={studentChartData} options={doughnutOptions} /> */}
    <Doughnut
  data={studentChartData}
  options={doughnutOptions}
  plugins={[centerTextPlugin]}
/>

  </div>

  {/* Numbers below chart */}
  <div className="student-stats">
    <div className="stat-item">
      <span className="label">Total Students</span>
      <strong>{stats.totalUsers}</strong>
    </div>

    <div className="stat-item">
      <span className="label">Joined Today</span>
      <strong>{stats.todayUsers || 0}</strong>
    </div>
  </div>

  {/* Legend */}
  <div className="student-legend">
    <div>
      <span className="dot joined"></span> Joined
    </div>
    <div>
      <span className="dot waiting"></span> Waiting
    </div>
  </div>
</div>


              {/* Live Status Chart */}
              <div className="card">
                <h2>Live Status</h2>
                <div className="chart-container">
                  <Line data={liveChartData} options={chartOptions} />
                </div>
              </div>

              {/* Payment Analysis Card */}
              <div className="card payment-card">
                <h2>Payment Analysis</h2>
                <div className="chart-container">
                  <Bar data={paymentChartData} options={chartOptions} />
                </div>
                <div className="payment-summary">
                  <div><strong>Total Sales:</strong> ₹{stats.totalRevenue || '0'}</div>
                  <div><strong>Transactions:</strong> {payments.length || 0}</div>
                  <div><strong>Pending:</strong> ₹10,000</div>
                </div>
                <div className="recent-payments">
                  <h3>Recent Payments</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 3).map((payment) => (
                        <tr key={payment._id}>
                          <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                          <td>{payment.user?.fullName || 'Unknown'}</td>
                          <td>₹{payment.amount}</td>
                          <td>{payment.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management View */}
        {currentView === 'userManagement' && (
          <div className="view-section">
            <h1>User Management</h1>
            {/* <button className="add-btn" onClick={() => openUserForm()}>New User</button> */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>🆔ID</th>
                        <th>🦕Name</th>
                        <th>💌Email</th>
                        <th>☎Phone</th>
                        <th>🔰Role</th>
                        <th>📊Status</th>
                        <th>
  <span className="live-badge">
    <span className="live-dot"></span>
  🛑Actions
  </span>
</th>

                        {/* <th>🚨Actions</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <React.Fragment key={user._id}>
                          <tr>
                            <td>{user._id.slice(-6)}</td>
                            <td>{user.fullName || user.username}</td>
                            <td>{user.email || 'N/A'}</td>
                            <td>{user.phone}</td>
                            <td>{user.role || 'user'}</td>
                            <td>{user.isBlocked ? 'Banned' : 'Active'}</td>
                            <td>
                              <button className="action-btn" onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}>
                                {expandedUser === user._id ? 'Hide' : 'Details'}
                              </button>
                              <button className="action-btn edit" onClick={() => toggleUserStatus(user._id, user.isBlocked)}>
                                {user.isBlocked ? 'Unban' : 'Ban'}
                              </button>
                              <button className="action-btn delete" onClick={() => deleteUser(user._id)}>Delete</button>
                            </td>
                          </tr>
                          {expandedUser === user._id && (
                            <tr className="user-details-row">
                              <td colSpan="7">
                                <div className="user-details">
                                  <div className="details-grid">
                                    <div className="detail-item">
                                      <strong>Full ID:</strong> {user._id}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Role:</strong> {user.role}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Phone:</strong> {user.phone}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Email:</strong> {user.email || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Phone Verified:</strong> {user.phoneVerified ? 'Yes' : 'No'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Blocked:</strong> {user.isBlocked ? 'Yes' : 'No'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Current Streak:</strong> {user.currentStreak}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Longest Streak:</strong> {user.longestStreak}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Referral Count:</strong> {user.referralCount}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Profile Completed:</strong> {user.profileCompleted ? '✅ Yes' : '❌ No'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Full Name:</strong> {user.fullName || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Username:</strong> {user.username || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Age:</strong> {user.age || user.preferences?.age || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Gender:</strong> {user.gender || user.preferences?.gender || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Class Grade:</strong> {user.classGrade || user.preferences?.classGrade || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>School Name:</strong> {user.schoolName || user.preferences?.schoolName || 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Profile Image:</strong> {user.profileImage || user.preferences?.profileImage ? 
                                        <a href={user.profileImage || user.preferences?.profileImage} target="_blank" rel="noopener noreferrer">View Image</a> : 'N/A'}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Created At:</strong> {new Date(user.createdAt).toLocaleString()}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Updated At:</strong> {new Date(user.updatedAt).toLocaleString()}
                                    </div>
                                    <div className="detail-item">
                                      <strong>Last Login:</strong> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                                    </div>
                                    {user.preferences && Object.keys(user.preferences).length > 0 && (
                                      <div className="detail-item full-width">
                                        <strong>Preferences:</strong>
                                        <pre>{JSON.stringify(user.preferences, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
          </div>
        )}

        {/* Quiz Management View */}
        {currentView === 'quizManagement' && (
          <div className="view-section">
            <h1>Quiz Management</h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <button className="add-btn" onClick={() => openQuizForm()}>Add New Quiz</button>
              <label className="add-btn" style={{ background: '#6c757d', cursor: 'pointer' }}>
                {uploading ? '⌛️Uploading...' : 'Upload CSV (50 Qs)'}
                <input type="file" accept=".csv" onChange={uploadCSV} style={{ display: 'none' }} />
              </label>
              <button className="add-btn" onClick={downloadCSVTemplate} style={{ background: '#28a745' }}>
                
                📥 Download Template
              </button>
            </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Questions</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizzes.map((quiz, index) => (
                        <tr key={quiz.quizDate || quiz._id || index}>
                          <td>{quiz.id || quiz._id?.slice(-6) || quiz.quizDate?.slice(-6) || 'N/A'}</td>
                          <td>{quiz.title || 'Daily Quiz'}</td>
                          <td>{quiz.description || 'Daily 50 Question Quiz'}</td>
                          <td>{quiz.questions || 50}</td>
                          <td>{quiz.date ? new Date(quiz.date).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                          <td>{quiz.status === 'LIVE' ? 'Live' : quiz.status === 'ENDED' ? 'Completed' : quiz.status === 'LOCKED' ? 'Locked' : quiz.status || 'Scheduled'}</td>
                          <td>
                            <button className="action-btn edit" onClick={() => openQuizForm(quiz)}>Edit</button>
                            <button 
                              className="action-btn" 
                              onClick={() => startQuizNow(quiz)}
                              disabled={quiz.status === 'LIVE'}
                              style={{ 
                                opacity: quiz.status === 'LIVE' ? 0.5 : 1,
                                cursor: quiz.status === 'LIVE' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {quiz.status === 'LIVE' ? 'Live' : 'Start Now'}
                            </button>
                            <button className="action-btn delete" onClick={() => deleteQuiz(quiz)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          </div>
        )}

        {/* Payment History View */}
        {currentView === 'paymentHistory' && (
          <div className="view-section">
            <h1>Payment History</h1>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Review and verify payments. Unverified payments need admin approval.
            </p>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Transaction ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>{new Date(payment.createdAt).toLocaleString()}</td>
                          <td>{payment.user?.fullName || payment.user?.username || 'Unknown'}</td>
                          <td>₹{payment.amount}</td>
                          <td>
                            <span style={{
                              color: payment.status === 'completed' ? '#28a745' : payment.status === 'failed' ? '#dc3545' : '#ffc107',
                              fontWeight: 'bold'
                            }}>
                              {payment.status}
                            </span>
                          </td>
                          <td>
                            {payment.verified ? (
                              <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Verified</span>
                            ) : (
                              <span style={{ color: '#ffc107', fontWeight: 'bold' }}>⏳ Pending</span>
                            )}
                          </td>
                          <td>{payment.transactionId || payment.razorpayPaymentId || 'N/A'}</td>
                          <td>
                            {!payment.verified && payment.status === 'completed' && (
                              <>
                                <button 
                                  className="action-btn edit" 
                                  onClick={() => verifyPayment(payment._id)}
                                  style={{ background: '#28a745', marginRight: '5px', fontSize: '12px', padding: '5px 10px' }}
                                >
                                  ✅ Verify
                                </button>
                                <button 
                                  className="action-btn delete" 
                                  onClick={() => rejectPayment(payment._id)}
                                  style={{ fontSize: '12px', padding: '5px 10px' }}
                                >
                                  ❌ Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          </div>
        )}

        {/* Blog Approval View */}
        {currentView === 'blogApproval' && (
          <div className="view-section">
            <h1>Blog Approval</h1>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Review and approve/reject pending blog posts from users
            </p>
            {pendingBlogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>✅ No pending blogs to review</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Content Preview</th>
                      <th>Category</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBlogs.map((blog) => (
                      <tr key={blog._id}>
                        <td>{blog._id.slice(-6)}</td>
                        <td>{blog.title}</td>
                        <td>{blog.author?.fullName || blog.author?.username || 'Unknown'}</td>
                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {blog.content?.substring(0, 100)}...
                        </td>
                        <td>{blog.category || 'general'}</td>
                        <td>{new Date(blog.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button 
                            className="action-btn edit" 
                            onClick={() => approveBlog(blog._id)}
                            style={{ background: '#28a745', marginRight: '5px' }}
                          >
                            ✅ Approve
                          </button>
                          <button 
                            className="action-btn delete" 
                            onClick={() => openRejectModal(blog)}
                          >
                            ❌ Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Winners View */}
        {currentView === 'winners' && (
          <div className="view-section">
            <h1>Quiz Winners</h1>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px' }}>Select Date:</label>
              <input 
                type="date" 
                value={winnersDate}
                onChange={(e) => {
                  setWinnersDate(e.target.value);
                  loadWinners();
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            {winners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No winners found for this date</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>User</th>
                      <th>Score</th>
                      <th>Correct Answers</th>
                      <th>Total Questions</th>
                      <th>Accuracy (%)</th>
                      <th>Time Spent (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((winner) => (
                      <tr key={winner.rank}>
                        <td>
                          <strong style={{ fontSize: '18px', color: winner.rank <= 3 ? '#ffd700' : '#666' }}>
                            #{winner.rank}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {winner.user.profileImage && (
                              <img 
                                src={winner.user.profileImage} 
                                alt={winner.user.fullName}
                                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{winner.user.fullName || winner.user.username}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>@{winner.user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td><strong>{winner.score}</strong></td>
                        <td>{winner.correctAnswers}</td>
                        <td>{winner.totalQuestions}</td>
                        <td><strong style={{ color: '#28a745' }}>{winner.accuracy}%</strong></td>
                        <td>{winner.timeSpent}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reports View */}
        {currentView === 'reports' && (
          <div className="view-section">
            <h1>User Reports</h1>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Review and handle user reports about inappropriate content or behavior
            </p>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>✅ No reports to review</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reported By</th>
                      <th>Reported User</th>
                      <th>Blog</th>
                      <th>Reason</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report._id}>
                        <td>{new Date(report.createdAt).toLocaleString()}</td>
                        <td>{report.reportedBy?.fullName || report.reportedBy?.username || 'Unknown'}</td>
                        <td>{report.reportedUser?.fullName || report.reportedUser?.username || 'Unknown'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {report.blog?.title || 'N/A'}
                        </td>
                        <td>{report.reason}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {report.description || 'N/A'}
                        </td>
                        <td>
                          <span style={{
                            color: report.status === 'pending' ? '#ffc107' : 
                                   report.status === 'resolved' ? '#28a745' : '#666',
                            fontWeight: 'bold'
                          }}>
                            {report.status}
                          </span>
                        </td>
                        <td>
                          {report.status === 'pending' && (
                            <button 
                              className="action-btn edit" 
                              onClick={async () => {
                                try {
                                  await AdminAPI.put(`/reports/admin/${report._id}`, { status: 'resolved' });
                                  alert('Report resolved successfully');
                                  loadReports();
                                } catch (error) {
                                  alert('Failed to resolve report');
                                }
                              }}
                              style={{ background: '#28a745', marginRight: '5px', fontSize: '12px', padding: '5px 10px' }}
                            >
                              ✅ Resolve
                            </button>
                          )}
                          <button 
                            className="action-btn edit" 
                            onClick={() => {
                              if (window.confirm('Ban the reported user?')) {
                                toggleUserStatus(report.reportedUser?._id, false);
                              }
                            }}
                            style={{ background: '#dc3545', marginRight: '5px', fontSize: '12px', padding: '5px 10px' }}
                          >
                            🚫 Ban User
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <div className="view-section">
            <h1>Settings</h1>
            <p>Settings feature coming soon...</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="modal active">
          <div className="modal-content">
            <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleUserSubmit}>
              <label>Name:</label>
              <input type="text" required />
              <label>Email:</label>
              <input type="email" required />
              <label>Phone:</label>
              <input type="text" required />
              <label>Role:</label>
              <select required>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeUserForm}>Cancel</button>
                <button type="submit" className="btn-save">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Modal - 50 Questions Form */}
      {showQuizModal && (
        <div className="modal active" style={{ zIndex: 2000, maxHeight: '90vh', overflow: 'auto' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95vw' }}>
            <h3>{editingQuiz ? 'Edit Quiz' : 'Create Today\'s Quiz (50 Questions)'}</h3>
            <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
              <strong>⚠️ Important:</strong> Quiz must have exactly 50 MCQ questions. Quiz will auto-start at 8:00 PM IST.
              Questions will be locked at 7:50 PM IST.
            </p>
            <form onSubmit={handleQuizSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Quiz Settings */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                border: '2px solid #007bff', 
                borderRadius: '8px',
                backgroundColor: '#f0f8ff'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#007bff' }}>Quiz Settings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                      Quiz Title <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      defaultValue={quizFormData.title}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                      Quiz Date <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="quizDate"
                      required
                      defaultValue={quizFormData.quizDate}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                      Description <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      name="description"
                      rows="2"
                      required
                      defaultValue={quizFormData.description}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      placeholder="Enter quiz description"
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                      Class/Grade <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      name="classGrade"
                      required
                      defaultValue={quizFormData.classGrade}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="ALL">All Classes</option>
                      <option value="10th">10th Class</option>
                      <option value="12th">12th Class</option>
                      <option value="Other">Other</option>
                    </select>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Only students from selected class can participate
                    </p>
                  </div>
                </div>
              </div>
              
              {!editingQuiz && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#660000', marginBottom: '15px' }}>Questions (50 Required)</h4>
                    {Array.from({ length: quizFormData.questions?.length || 50 }, (_, i) => (
                <div key={i} style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#660000', fontSize: '16px' }}>
                    Question {i + 1} / 50
                  </h4>
                  <label>Question Text:</label>
                  <textarea
                    name={`question_${i}`}
                    rows="2"
                    required
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    placeholder={`Enter question ${i + 1}...`}
                    defaultValue={quizFormData.questions?.[i]?.question || ''}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <label>Option A:</label>
                      <input
                        type="text"
                        name={`optionA_${i}`}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        placeholder="Option A"
                        defaultValue={quizFormData.questions?.[i]?.options?.[0] || ''}
                      />
                    </div>
                    <div>
                      <label>Option B:</label>
                      <input
                        type="text"
                        name={`optionB_${i}`}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        placeholder="Option B"
                        defaultValue={quizFormData.questions?.[i]?.options?.[1] || ''}
                      />
                    </div>
                    <div>
                      <label>Option C:</label>
                      <input
                        type="text"
                        name={`optionC_${i}`}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        placeholder="Option C"
                        defaultValue={quizFormData.questions?.[i]?.options?.[2] || ''}
                      />
                    </div>
                    <div>
                      <label>Option D:</label>
                      <input
                        type="text"
                        name={`optionD_${i}`}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        placeholder="Option D"
                        defaultValue={quizFormData.questions?.[i]?.options?.[3] || ''}
                      />
                    </div>
                  </div>
                  <label>Correct Answer:</label>
                  <select
                    name={`correct_${i}`}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '5px' }}
                    defaultValue={quizFormData.questions?.[i]?.correctIndex ?? 0}
                  >
                    <option value="">Select correct option</option>
                    <option value="0">A (Option A)</option>
                    <option value="1">B (Option B)</option>
                    <option value="2">C (Option C)</option>
                    <option value="3">D (Option D)</option>
                  </select>
                </div>
              ))}
              </div>
              )}
              
              <div className="modal-footer" style={{ position: 'sticky', bottom: 0, backgroundColor: 'white', padding: '15px', borderTop: '1px solid #ddd', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={closeQuizForm}>Cancel</button>
                <button type="submit" className="btn-save">{editingQuiz ? 'Update Quiz' : 'Create Quiz (50 Questions)'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Blog Modal */}
      {showRejectModal && selectedBlog && (
        <div className="modal active">
          <div className="modal-content">
            <h3>Reject Blog Post</h3>
            <div style={{ marginBottom: '15px' }}>
              <p><strong>Title:</strong> {selectedBlog.title}</p>
              <p><strong>Author:</strong> {selectedBlog.author?.fullName || selectedBlog.author?.username || 'Unknown'}</p>
            </div>
            <label>Rejection Reason (optional):</label>
            <textarea 
              rows="4" 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection (e.g., inappropriate content, spam, etc.)"
              style={{ width: '100%', padding: '8px', marginTop: '5px', marginBottom: '15px' }}
            ></textarea>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedBlog(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-save" 
                onClick={rejectBlog}
                style={{ background: '#dc3545' }}
              >
                Reject Blog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
