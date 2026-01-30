// frontend/src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Translation files
const translations = {
  en: {
    // Navigation
    home: "Home",
    edit: "Edit",
    quiz: "Quiz",
    winners: "Winners",
    profile: "Profile",

    // Edit Profile Page
    editProfile: "Edit Profile",
    updateProfile: "Update Profile",
    profilePicture: "Profile Picture",
    profilePreview: "Profile Preview",
    chooseImage: "Choose Image",
    fullName: "Full Name",
    username: "Username",
    emailOptional: "Email (optional)",
    age: "Age",
    enterAge: "Enter your age",
    schoolCoaching: "School/Coaching Name",
    enterSchool: "Enter your School/Coaching name",
    classGrade: "Class/Grade",
    selectClass: "Select Class",
    gender: "Gender",
    other: "Other",
    backToProfile: "← Back to Profile",

    // Quiz Analytics Page
    quizAnalytics: "Quiz Analytics",
    quizPerformance: "Quiz Performance",
    totalQuizzes: "Total Quizzes",
    avgScore: "Avg Score",
    bestScore: "Best Score",
    accuracy: "Accuracy",
    avgRank: "Avg Rank",
    bestRank: "Best Rank",
    quizHistory: "Quiz History",
    noQuizHistory: "No quiz history yet",
    noQuizHistoryDesc: "You haven't participated in any quizzes yet.",
    takeFirstQuiz: "Take Your First Quiz",
    takeTodaysQuiz: "Take Today's Quiz",
    viewWinners: "View Winners",

    // Payment History Page
    paymentHistory: "Payment History",
    trackPayments: "Track all your quiz entry payments",
    noPayments: "No payments yet",
    noPaymentsDesc: "You haven't made any quiz payments yet.",
    makeFirstPayment: "Make First Payment",
    totalPayments: "Total Payments:",
    totalAmount: "Total Amount:",

    // Blog/Notes Pages
    editNotes: "Edit Notes",
    createNote: "Create Note",
    createNoteTitle: "Create note title...",
    writeContent: "Write your note content here... (Max 300 words)",
    pdfUpload: "PDF Upload (Paid Users Only)",
    noFileChosen: "No file chosen",
    pdfRequiresPayment: "PDF upload requires payment. You can publish text notes without payment.",
    publishNote: "Publish Note",
    myNotes: "My Notes",
    latestNotes: "Latest Notes",
    search: "Search...",
    notes: "Notes",

    // Home Page
    createBlog: "Create Blog",
    noBlogs: "No blogs yet",
    loadingBlogs: "Loading blogs...",
    searchBlogs: "Search blogs...",

    // Common buttons and actions
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    close: "Close",
    update: "Update",
    back: "Back",
    next: "Next",
    submit: "Submit",
    yes: "Yes",
    no: "No",

    // Winners page
    top20Winners: "Top 20 Winners",
    rank: "Rank",
    score: "Score",
    time: "Time",

    // Auth related
    login: "Login",
    register: "Register",
    forgotPassword: "Forgot Password",
    resetPassword: "Reset Password",
    sendOTP: "Send OTP",
    verifyOTP: "Verify OTP",
    resendOTP: "Resend OTP",

    // Payment related
    payNow: "Pay Now",
    paymentSuccessful: "Payment Successful",
    paymentFailed: "Payment Failed",
    paymentPending: "Payment Pending",

    // Blog related
    blogs: "Blogs",
    editBlog: "Edit Blog",
    deleteBlog: "Delete Blog",
    like: "Like",
    unlike: "Unlike",
    comments: "Comments",

    // Admin panel
    adminPanel: "Admin Panel",
    manageUsers: "Manage Users",
    manageQuizzes: "Manage Quizzes",
    manageBlogs: "Manage Blogs",
    viewPayments: "View Payments",

    // Error messages
    networkError: "Network error. Please try again.",
    invalidCredentials: "Invalid credentials",
    userNotFound: "User not found",
    quizNotFound: "Quiz not found",
    paymentRequired: "Payment required",
    insufficientPermissions: "Insufficient permissions",

    // Profile related
    name: "Name",
    phone: "Phone",
    email: "Email",
    password: "Password",
    oldPassword: "Old Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",

    // Status messages
    profileUpdated: "Profile updated successfully",
    passwordChanged: "Password changed successfully",
    preferencesSaved: "Preferences saved successfully",
    accountDeleted: "Account deleted successfully",

    // Landing Page
    upcomingQuiz: "Upcoming Quiz",
    quizStartsIn: "Quiz Starts In",
    noQuiz: "No Quiz",
    today: "Today",
    studentsEnrolled: "Students Enrolled",
    registerNow: "Register Now",
    forAssessments: "For Assessments",
    only: "Only",
    goldenOpportunity: "Golden Opportunity for Students",
    competitionDesc: "Daily Mind Education Competition Exam, in which only 2000 students can participate.",
    competitionLevels: "The competition exam will be in two levels:",
    level10: "10th Level",
    level12: "12th Level",
    participateDesc: "Any student up to graduation can participate in this exam.",
    winnersTitle: "There will be a total of 20 Top Performers, Merit Rankers, among whom 6 will receive Academic Rewards, Skill-based Scholarships:",
    firstPrize: "First Top Scholars (2 students): Academic Scholarships upto ₹10,000/-",
    secondPrize: "Second Prize (2 students): upto ₹5,000/-",
    thirdPrize: "Third Prize (2 students): upto ₹2,500/-",
    remainingWinners: "The remaining 14 students will receive Educational Grants upto ₹500/- and all students get free notes",
    freeNotes: "Free PDF Notes – available for any class or subject upon request.",
    administrativeFee: "ADMINISTRATIVE REGISTRATION FEE: ₹5",
    contactInfo: "WhatsApp / Call: 8578986352",
    contactEmail: "Email: dailymind.edu@gmail.com",
    ageVerification: "Age Verification: State that users must be 18+ to pay the entry fee. If they are minors (13-17), you are now legally required to implement a verifiable parental consent mechanism before processing their data.",
    stateRestrictions: "State Restrictions: Add a bold notice: \"Participation in paid contests is strictly prohibited for residents of Andhra Pradesh, Assam, Odisha, Telangana, Tamil Nadu, Nagaland, and Sikkim\".",
    regulations: "This educational platform is intended for students in India. All transactions comply with Indian regulations. Participation is subject to terms and conditions.",

    // Quiz related
    joinQuiz: "Join Quiz",
    viewQuiz: "View Quiz",
    pay5: "Pay ₹5",
    quizLive: "Quiz Live",
    timeLeft: "Time Left",
    question: "Question",

    // Success messages
    quizCompleted: "Quiz completed successfully!",
    blogCreated: "Blog created successfully",
    blogUpdated: "Blog updated successfully",
    blogDeleted: "Blog deleted successfully"
  },
  hi: {

    // Edit Profile Page
    editProfile: "प्रोफ़ाइल संपादित करें",
    updateProfile: "प्रोफ़ाइल अपडेट करें",
    profilePicture: "प्रोफ़ाइल चित्र",
    profilePreview: "प्रोफ़ाइल पूर्वावलोकन",
    chooseImage: "चित्र चुनें",
    fullName: "पूरा नाम",
    username: "उपयोगकर्ता नाम",
    emailOptional: "ईमेल (वैकल्पिक)",
    age: "आयु",
    enterAge: "अपनी आयु दर्ज करें",
    schoolCoaching: "स्कूल/कोचिंग का नाम",
    enterSchool: "अपना स्कूल/कोचिंग का नाम दर्ज करें",
    classGrade: "कक्षा/ग्रेड",
    selectClass: "कक्षा चुनें",
    gender: "लिंग",
    other: "अन्य",
    backToProfile: "← प्रोफ़ाइल पर वापस जाएं",

    // Quiz Analytics Page
    quizAnalytics: "क्विज़ विश्लेषण",
    quizPerformance: "क्विज़ प्रदर्शन",
    totalQuizzes: "कुल क्विज़",
    avgScore: "औसत स्कोर",
    bestScore: "सर्वश्रेष्ठ स्कोर",
    accuracy: "सटीकता",
    avgRank: "औसत रैंक",
    bestRank: "सर्वश्रेष्ठ रैंक",
    quizHistory: "क्विज़ इतिहास",
    noQuizHistory: "कोई क्विज़ इतिहास नहीं",
    noQuizHistoryDesc: "आपने अभी तक किसी क्विज़ में भाग नहीं लिया है।",
    takeFirstQuiz: "अपना पहला क्विज़ लें",
    takeTodaysQuiz: "आज का क्विज़ लें",
    viewWinners: "विजेताओं को देखें",

    // Payment History Page
    paymentHistory: "भुगतान इतिहास",
    trackPayments: "अपने सभी क्विज़ प्रवेश भुगतानों को ट्रैक करें",
    noPayments: "कोई भुगतान नहीं",
    noPaymentsDesc: "आपने अभी तक कोई क्विज़ भुगतान नहीं किया है।",
    makeFirstPayment: "पहला भुगतान करें",
    totalPayments: "कुल भुगतान:",
    totalAmount: "कुल राशि:",

    // Blog/Notes Pages
    editNotes: "नोट्स संपादित करें",
    createNote: "नोट बनाएं",
    createNoteTitle: "नोट का शीर्षक बनाएं...",
    writeContent: "यहां अपनी नोट सामग्री लिखें... (अधिकतम 300 शब्द)",
    pdfUpload: "PDF अपलोड (केवल भुगतान करने वाले उपयोगकर्ताओं के लिए)",
    noFileChosen: "कोई फ़ाइल नहीं चुनी गई",
    pdfRequiresPayment: "PDF अपलोड के लिए भुगतान आवश्यक है। आप भुगतान के बिना टेक्स्ट नोट प्रकाशित कर सकते हैं।",
    publishNote: "नोट प्रकाशित करें",
    myNotes: "मेरे नोट्स",
    latestNotes: "नवीनतम नोट्स",
    search: "खोजें...",
    notes: "नोट्स",

    // Home Page
    createBlog: "ब्लॉग बनाएं",
    noBlogs: "कोई ब्लॉग नहीं",
    loadingBlogs: "ब्लॉग लोड हो रहे हैं...",
    searchBlogs: "ब्लॉग खोजें...",

    // Common UI
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफलता",
    cancel: "रद्द करें",
    confirm: "पुष्टि करें",
    delete: "हटाएं",
    close: "बंद करें",
    save: "सेव करें",
    update: "अपडेट करें",
    back: "वापस",
    next: "अगला",
    submit: "सबमिट करें",
    yes: "हाँ",
    no: "नहीं",

    // Winners Page
    dailyMindEducation: "दैनिक माइंड एजुकेशन",
    quizResults: "क्विज़ परिणाम",
    congratulationsWinners: "विजेताओं को बधाई!",
    resultsNotPublished: "परिणाम अभी प्रकाशित नहीं हुए",
    resultsAvailable: "{date} के लिए परिणाम क्विज़ समाप्त होने के 30 मिनट बाद उपलब्ध होंगे।",
    autoRefreshing: "हर 30 सेकंड में ऑटो-रीफ्रेश हो रहा है...",
    tryDifferentDate: "कोई दूसरी तारीख चुनें या परिणामों का इंतजार करें।",
    congratulationsAll: "सभी विजेताओं को बधाई!",
    joinTomorrowQuiz: "अपनी जीत का मौका पाने के लिए कल के क्विज़ में शामिल हों!",
    selectDate: "तारीख चुनें:",

    // Profile Drawer
    myQuizzesAnalytics: "मेरे क्विज़ विश्लेषण",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",

    // Settings Page
    notifications: "सूचनाएं",
    quizReminders: "क्विज़ रिमाइंडर",
    quizRemindersDesc: "दैनिक क्विज़ शुरू होने से पहले सूचना प्राप्त करें",
    paymentAlerts: "भुगतान अलर्ट",
    paymentAlertsDesc: "भुगतान स्थिति के लिए सूचनाएं",
    winnerAnnouncements: "विजेता घोषणा",
    winnerAnnouncementsDesc: "क्विज़ परिणाम घोषित होने पर सूचना प्राप्त करें",
    account: "खाता",
    profileInformation: "प्रोफ़ाइल जानकारी",
    profileInformationDesc: "अपनी प्रोफ़ाइल विवरण अपडेट करें",
    changePassword: "पासवर्ड बदलें",
    changePasswordDesc: "अपने खाते का पासवर्ड अपडेट करें",
    appPreferences: "ऐप प्राथमिकताएं",
    darkMode: "डार्क मोड",
    darkModeDesc: "लाइट और डार्क थीम के बीच टॉगल करें",
    language: "भाषा",
    languageDesc: "अपनी पसंदीदा भाषा चुनें",
    english: "English",
    hindi: "हिंदी",

    // Landing Page
    upcomingQuiz: "आगामी क्विज़",
    quizStartsIn: "क्विज़ शुरू होता है",
    noQuiz: "कोई क्विज़ नहीं",
    today: "आज",
    studentsEnrolled: "छात्र नामांकित",
    registerNow: "अभी रजिस्टर करें",
    forAssessments: "मूल्यांकन के लिए",
    only: "केवल",
    goldenOpportunity: "छात्रों के लिए सुनहरी अवसर",
    competitionDesc: "दैनिक माइंड एजुकेशन प्रतियोगिता परीक्षा, जिसमें केवल 2000 छात्र भाग ले सकते हैं।",
    competitionLevels: "प्रतियोगिता परीक्षा दो स्तरों में होगी:",
    level10: "10वीं स्तर",
    level12: "12वीं स्तर",
    participateDesc: "स्नातक तक के किसी भी छात्र को इस परीक्षा में भाग ले सकते हैं।",
    winnersTitle: "कुल 20 टॉप परफॉर्मर, मेरिट रैंकर्स होंगे, जिनमें से 6 को अकादमिक रिवार्ड्स, स्किल-बेस्ड स्कॉलरशिप मिलेगी:",
    firstPrize: "पहले टॉप स्कॉलर्स (2 छात्र): अकादमिक स्कॉलरशिप ₹10,000/- तक",
    secondPrize: "दूसरा पुरस्कार (2 छात्र): ₹5,000/- तक",
    thirdPrize: "तीसरा पुरस्कार (2 छात्र): ₹2,500/- तक",
    remainingWinners: "शेष 14 छात्रों को ₹500/- तक एजुकेशनल ग्रांट्स मिलेंगे और सभी छात्रों को फ्री नोट्स मिलेंगे",
    freeNotes: "फ्री PDF नोट्स – किसी भी क्लास या विषय के लिए अनुरोध पर उपलब्ध।",
    administrativeFee: "प्रशासनिक पंजीकरण शुल्क: ₹5",
    contactInfo: "व्हाट्सएप / कॉल: 8578986352",
    contactEmail: "ईमेल: dailymind.edu@gmail.com",
    ageVerification: "आयु सत्यापन: राज्य करें कि उपयोगकर्ताओं को प्रवेश शुल्क का भुगतान करने के लिए 18+ होना चाहिए। यदि वे नाबालिग हैं (13-17), तो अब कानूनी रूप से सत्यापन योग्य अभिभावकीय सहमति तंत्र लागू करना आवश्यक है।",
    stateRestrictions: "राज्य प्रतिबंध: एक बोल्ड नोटिस जोड़ें: \"आंध्र प्रदेश, असम, ओडिशा, तेलंगाना, तमिलनाडु, नागालैंड और सिक्किम के निवासियों के लिए भुगतान किए गए प्रतियोगिताओं में भागीदारी सख्त वर्जित है\"।",
    regulations: "यह शैक्षिक प्लेटफॉर्म भारत के छात्रों के लिए अभिप्रेत है। सभी लेनदेन भारतीय नियमों का पालन करते हैं। भागीदारी नियमों और शर्तों के अधीन है।"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;