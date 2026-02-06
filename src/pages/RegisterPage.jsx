// // frontend/src/pages/RegisterPage.jsx


// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
// import DarkModeToggle from "../components/DarkModeToggle";
import API from "../utils/api";
import "../styles/global.css";

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1: Form, 2: SMS OTP, 3: Email OTP
  const [form, setForm] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    password: "",
    age: "",
    gender: "",
    schoolName: "",
    class: ""
  });
  const [otpMethod, setOtpMethod] = useState("sms"); // 'sms' or 'email'
  const [smsSessionId, setSmsSessionId] = useState("");
  const [smsOtp, setSmsOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resendTotal, setResendTotal] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { sendOtp, sendEmailOtp, register, getResendRemaining, getResendRemainingEmail, formatSecondsMMSS, normalizePhone, getResendInitialTtl, getResendInitialTtlEmail } = useContext(AuthContext);
  const nav = useNavigate();

  // initialize countdown from persisted storage for the current phone/email
  useEffect(() => {
    if (otpMethod === "sms") {
      const normalized = normalizePhone(form.phone || "");
      if (!normalized) return;
      const rem = getResendRemaining(normalized);
      setResendSeconds(rem);
      const ttl = getResendInitialTtl ? getResendInitialTtl(normalized) : 60;
      setResendTotal(ttl);
    } else {
      if (!form.email) return;
      const rem = getResendRemainingEmail(form.email);
      setResendSeconds(rem);
      const ttl = getResendInitialTtlEmail ? getResendInitialTtlEmail(form.email) : 60;
      setResendTotal(ttl);
    }
  }, [form.phone, form.email, otpMethod, getResendRemaining, getResendRemainingEmail, normalizePhone, getResendInitialTtl, getResendInitialTtlEmail]);

  // Clear irrelevant fields when switching OTP method
  useEffect(() => {
    if (otpMethod === 'sms') {
      setForm(f => ({ ...f, email: '' }));
    } else {
      setForm(f => ({ ...f, phone: '' }));
    }
  }, [otpMethod]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Basic validation
      if (!form.name || !form.password || !form.age || !form.gender || !form.schoolName || !form.class) {
        setError("Please fill in all required fields");
        return;
      }
      
      // Validate age
      const age = parseInt(form.age);
      if (isNaN(age) || age < 13 || age > 99) {
        setError("You must be at least 13 years old to use this platform");
        return;
      }
      
      // Validate phone for SMS method
      if (otpMethod === "sms") {
        if (!form.phone || form.phone.length !== 10) {
          setError("Phone number must be exactly 10 digits");
          return;
        }
      }
      
      // Validate email for email method
      if (otpMethod === "email") {
        if (!form.email || !form.email.includes('@')) {
          setError("Please enter a valid email address");
          return;
        }
      }
      
      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;
      if (!passwordRegex.test(form.password)) {
        setError("Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)");
        return;
      }

      if (otpMethod === "sms") {
        const res = await sendOtp(form.phone);
        const sessionId = res?.data?.sessionId || res?.data?.SessionId || res?.data?.Details || res?.data?.full?.SessionId || "";
        setSmsSessionId(sessionId);

        const rem = getResendRemaining(form.phone);
        setResendSeconds(rem || 60);
        const ttl = getResendInitialTtl ? getResendInitialTtl(normalizePhone(form.phone)) : 60;
        setResendTotal(ttl);

        setStep(2);
      } else {
        // email OTP flow
        if (!form.email) {
          setError("Email is required for Email OTP");
          return;
        }
        await sendEmailOtp(form.email);
        setResendSeconds(getResendRemainingEmail(form.email) || 60);
        const ttl = getResendInitialTtlEmail ? getResendInitialTtlEmail(form.email) : 60;
        setResendTotal(ttl);
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      if (otpMethod === "sms") {
        const rem = getResendRemaining(form.phone);
        if (rem > 0) {
          setResendSeconds(rem);
          setError(err.response?.data?.message || `Please wait ${rem}s before retrying`);
        } else {
          setError(err.response?.data?.message || "Failed to send SMS OTP");
        }
      } else {
        const rem = getResendRemainingEmail(form.email);
        if (rem > 0) {
          setResendSeconds(rem);
          setError(err.response?.data?.message || `Please wait ${rem}s before retrying`);
        } else {
          setError(err.response?.data?.message || "Failed to send Email OTP");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendSms = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    setError("");
    try {
      if (otpMethod === "sms") {
        const sanitizedPhone = String(form.phone).replace(/\D/g, "").replace(/^0+/, "");
        const finalPhone = sanitizedPhone.length > 10 && sanitizedPhone.startsWith("91") ? sanitizedPhone.slice(-10) : (sanitizedPhone.length > 10 ? sanitizedPhone.slice(-10) : sanitizedPhone);

        const res = await sendOtp(finalPhone);
        const sessionId = res?.data?.sessionId || res?.data?.SessionId || res?.data?.Details || res?.data?.full?.SessionId || "";
        setSmsSessionId(sessionId);
        setForm(f => ({ ...f, phone: finalPhone }));

        const rem = getResendRemaining(finalPhone);
        setResendSeconds(rem || 60);
        const ttl = getResendInitialTtl ? getResendInitialTtl(normalizePhone(finalPhone)) : 60;
        setResendTotal(ttl);
      } else {
        // resend email OTP
        if (form.email && form.email.trim() !== "") {
          await sendEmailOtp(form.email);
          setResendSeconds(getResendRemainingEmail(form.email) || 60);
          const ttl = getResendInitialTtlEmail ? getResendInitialTtlEmail(form.email) : 60;
          setResendTotal(ttl);
        }
      }
    } catch (err) {
      console.error("Resend SMS error", err);
      if (otpMethod === "sms") {
        const rem = getResendRemaining(form.phone);
        if (rem > 0) {
          setResendSeconds(rem);
          setError(err.response?.data?.message || `Please wait ${rem}s before retrying`);
        } else {
          setError(err.response?.data?.message || "Failed to resend SMS OTP");
        }
      } else {
        const rem = getResendRemainingEmail(form.email);
        if (rem > 0) {
          setResendSeconds(rem);
          setError(err.response?.data?.message || `Please wait ${rem}s before retrying`);
        } else {
          setError(err.response?.data?.message || "Failed to resend Email OTP");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySmsOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!smsOtp) {
      setError("Please enter SMS OTP");
      setLoading(false);
      return;
    }
    // email is optional, but if provided, include in payload
    if (form.email && form.email.trim() !== "") {
      // ok
    } else {
      // no email, optional
    }

    try {
      const payload = {
        phone: form.phone,
        otp: smsOtp,
        name: form.name,
        password: form.password,
        age: form.age,
        gender: form.gender,
        schoolName: form.schoolName,
        class: form.class
      };
      if (form.email && form.email.trim() !== "") {
        payload.email = form.email;
      }

      const registerRes = await register(payload);
      if (registerRes?.data?.user || registerRes?.data?.token || registerRes?.data?.accessToken) {
        // Registration successful - redirect to edit profile to complete profile
        nav("/edit-profile");
        return;
      }

      // If registration successful but no immediate redirect, show success
      nav("/edit-profile");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!emailOtp) {
        setError("Please enter Email OTP");
        return;
      }

      // Verify email OTP and register
      const res = await API.post("/auth/register", {
        email: form.email,
        otp: emailOtp,
        name: form.name,
        password: form.password,
        age: form.age,
        gender: form.gender,
        schoolName: form.schoolName,
        class: form.class,
        ...(form.phone && { phone: form.phone }) // include phone only if provided
      });
      
      // Store both access and refresh tokens
      const accessToken = res?.data?.accessToken;
      const refreshToken = res?.data?.refreshToken;
      if (accessToken) {
        localStorage.setItem("token", accessToken);
      }
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      
      // Redirect to edit profile after successful registration
      nav("/edit-profile");
      return;
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Email OTP verification failed";
      setError(errorMsg);
      if (err.response?.data?.requiresEmailOtp && err.response?.data?.phoneVerified) {
        setStep(3);
      }
    } finally {
      setLoading(false);
    }
  };

  const progressPct = resendTotal > 0 ? Math.round(((resendTotal - resendSeconds) / resendTotal) * 100) : 0;

  return (
    <>
      {/* <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>REGISTER</h2>
      </header> */}

      <div className="auth-container">
        <div className="auth-box">
          {step === 1 ? (
            <>
            {/* <h1 className="auth-boxh1">Daily Mind Education</h1> */}
            <h2>Create Account</h2>
              <p className="auth-subtitle">Join our community today</p>
              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleSendOtp}>
                <div className="input-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Choose OTP method</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="radio" name="otpMethod" value="sms" checked={otpMethod === 'sms'} onChange={() => setOtpMethod('sms')} /> SMS
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="radio" name="otpMethod" value="email" checked={otpMethod === 'email'} onChange={() => setOtpMethod('email')} /> Email
                    </label>
                  </div>
                </div>

                {otpMethod === 'sms' && (
                  <div className="input-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={form.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setForm({ ...form, phone: value });
                      }}
                      maxLength="10"
                      pattern="\d{10}"
                      title="Phone number must be exactly 10 digits"
                      required
                    />
                    {form.phone && form.phone.length !== 10 && (
                      <small style={{ color: '#d32f2f', marginTop: '5px', display: 'block' }}>
                        Phone number must be exactly 10 digits
                      </small>
                    )}
                  </div>
                )}

                {otpMethod === 'email' && (
                  <div className="input-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                )}

                <small style={{ color: '#999', fontSize: '12px', marginTop: '-8px', marginBottom: '16px', display: 'block' }}>
                  Choose any one method — you'll receive an OTP via the selected method.
                </small>

                <div className="input-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    placeholder="Enter your age"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    min="13"
                    max="99"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Gender *</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>School/Coaching Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your School/Coaching name"
                    value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Class/Grade *</label>
                  <select
                    value={form.class}
                    onChange={(e) => setForm({ ...form, class: e.target.value })}
                    required
                  >
                    <option value="">Select Class</option>
                    <option value="10">10th Class</option>
                    <option value="12">12th Class</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    placeholder="Min 8 chars: uppercase, lowercase, number, special char (@$!%*?&)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength="8"
                  />
                  <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Password must contain: uppercase letter, lowercase letter, number, and special character
                  </small>
                </div>

                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? "⌛️Sending OTP..." : (otpMethod === 'sms' ? 'Send SMS OTP' : 'Send Email OTP')}
                </button>
              </form>
            </>
          ) : step === 2 ? (
            <>
              <h2>Verify SMS OTP</h2>
              <p className="auth-subtitle">Enter the OTP sent to {form.phone}</p>
              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleVerifySmsOtp}>
                <div className="input-group">
                  <label>SMS OTP Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={smsOtp}
                    onChange={(e) => setSmsOtp(e.target.value)}
                    maxLength="6"
                    required
                  />
                </div>

                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? "⌛️Verifying..." : form.email ? "Verify & Continue" : "Verify & Register"}
                </button>
              </form>

              <div className="auth-footer" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" className="back-button" onClick={() => { setStep(1); setSmsOtp(""); setError(""); }}>
                  ← Back to Registration
                </button>

                <div style={{ marginLeft: 'auto', minWidth: 180 }}>
                  <button type="button" className="back-button" onClick={handleResendSms} disabled={loading || resendSeconds > 0}>
                    {resendSeconds > 0 ? `Resend OTP (${formatSecondsMMSS(resendSeconds)})` : 'Resend OTP'}
                  </button>
                  {resendSeconds > 0 && (
                    <div style={{ height: 6, background: '#eee', borderRadius: 4, marginTop: 6 }}>
                      <div style={{ height: 6, borderRadius: 4, background: '#4caf50', width: `${Math.max(0, Math.min(100, progressPct))}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <h2>Verify Email OTP</h2>
              <p className="auth-subtitle">Enter the OTP sent to {form.email}</p>
              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleVerifyEmailOtp}>
                <div className="input-group">
                  <label>Email OTP Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    maxLength="6"
                    required
                  />
                </div>

                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? "⌛️Verifying..." : "Complete Registration"}
                </button>
              </form>

              <div className="auth-footer">
                <button type="button" className="back-button" onClick={() => { setStep(2); setEmailOtp(""); setError(""); }}>
                  ← Back to SMS OTP
                </button>
              </div>
            </>
          )}

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
