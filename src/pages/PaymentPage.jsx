// frontend/src/pages/PaymentPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import DarkModeToggle from "../components/DarkModeToggle";
import BottomNavBar from "../components/BottomNavBar";
import ProfileDrawer from "../components/ProfileDrawer";
import API from "../utils/api";
import "../styles/global.css";

export default function PaymentPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Check eligibility on load
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const checkEligibility = async () => {
      try {
        const res = await API.get('/me/eligibility');
        setEligible(res.data.eligible);
        setLoading(false);

        // If already eligible, redirect to quiz or home
        if (res.data.eligible) {
          const quizRes = await API.get('/quiz/status');
          if (quizRes.data.state === 'LIVE') {
            navigate('/quiz');
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Failed to check eligibility:', error);
        setLoading(false);
      }
    };

    checkEligibility();
  }, [user, navigate]);

  // Load Razorpay script
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.id = "rzp-checkout-script";
      document.body.appendChild(script);
    }
  }, []);

  // Payment Handler - Connect to Backend API
  const handlePayment = async () => {
    if (!user) return navigate("/login");

    const spinner = document.createElement("div");
    spinner.id = "spinner-overlay";
    spinner.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; justify-content: center; align-items: center;
      z-index: 99999;
    `;
    spinner.innerHTML = `
      <div style="background:white; padding:25px; border-radius:10px; text-align:center;">
        <div style="border:4px solid #ddd; border-top:4px solid #660000;
        border-radius:50%; width:40px; height:40px; margin:auto;
        animation:spin 1s linear infinite;"></div>
        <p style="margin-top:10px;">Processing...</p>
      </div>
      <style>
        @keyframes spin { 0%{transform:rotate(0deg);} 100%{transform:rotate(360deg);} }
      </style>
    `;
    document.body.appendChild(spinner);
    setLoading(true);

    try {
      // Create order via backend API
      const orderResponse = await API.post("/payments/create-order");

      if (orderResponse.data.alreadyPaid) {
        spinner.remove();
        setLoading(false);
        alert("✅ You have already paid for today's quiz!");
        // Check eligibility again after payment
        const res = await API.get('/me/eligibility');
        if (res.data.eligible) {
          navigate("/quiz");
        }
        return;
      }

      if (!window.Razorpay) {
        alert("❌ Razorpay failed to load. Check connection.");
        spinner.remove();
        setLoading(false);
        return;
      }

      const order = orderResponse.data.order;
      if (!order || !order.id) {
        throw new Error("Failed to create payment order");
      }

      // Initialize Razorpay checkout
      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
        amount: order.amount, // Amount in paise
        currency: order.currency || "INR",
        order_id: order.id,
        name: "Daily Mind Education",
        description: "Daily Quiz Entry Fee",
        handler: async function (response) {
          try {
            // Verify payment with backend
            await API.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            // Check eligibility again after payment verification
            const eligibilityRes = await API.get('/me/eligibility');
            if (eligibilityRes.data.eligible) {
              alert("✅ Payment Successful! You are now eligible for today's quiz.");
              spinner.remove();
              setLoading(false);
              navigate("/quiz");
            } else {
              alert("⚠️ Payment received but eligibility not granted. Please contact support.");
              spinner.remove();
              setLoading(false);
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("⚠️ Payment received but verification pending. Please wait a moment and check your eligibility.");
            spinner.remove();
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name || user?.fullName || "Student",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#660000",
        },
        modal: {
          ondismiss: function() {
            spinner.remove();
            setLoading(false);
          }
        }
      });

      rzp.on("payment.failed", function (response) {
        spinner.remove();
        alert("❌ Payment failed: " + (response.error?.description || "Please try again"));
        setLoading(false);
      });

      spinner.remove();
      rzp.open();
    } catch (error) {
      spinner.remove();
      setLoading(false);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to initiate payment";
      alert("❌ " + errorMessage);
      console.error("Payment initiation error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (eligible) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>You are already eligible for today's quiz. Redirecting...</div>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME2.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>PAYMENT</h2>
      </header>

      <div className="payment-container" style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <div className="payment-card" style={{
          background: "#fff", borderRadius: "12px", padding: "30px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginBottom: "20px"
        }}>
          <h2 style={{ marginBottom: "10px", color: "#660000" }}>🎯 Daily Quiz Entry</h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Participate in today's live quiz at 8:00 PM - 8:30 PM IST
          </p>

          <div style={{
            textAlign: "center", marginBottom: "30px", padding: "20px",
            background: "linear-gradient(135deg, #660000, #990000)",
            borderRadius: "12px", color: "white"
          }}>
            <span style={{ fontSize: "24px" }}>₹</span>
            <span style={{ fontSize: "48px", fontWeight: "bold", margin: "0 5px" }}>5</span>
            <span style={{ fontSize: "16px", opacity: "0.9" }}>per quiz</span>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            style={{
              width: "100%", padding: "15px",
              background: loading ? "#aaa" : "#660000",
              color: "white", border: "none", borderRadius: "8px",
              fontSize: "18px", fontWeight: "bold", cursor: "pointer"
            }}
          >
            {loading ? "⌛️Processing..." : "Pay ₹5 & Join Quiz"}
          </button>

          <p style={{ textAlign: "center", marginTop: "10px", color: "#666", fontSize: "14px" }}>
            Secure payments powered by Razorpay
          </p>
        </div>

        <div style={{
          background: "#f8f9fa", padding: "20px", borderRadius: "12px"
        }}>
          <h3 style={{ marginBottom: "15px", color: "#660000" }}>Payment Information</h3>
          <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>One-time payment per quiz</li>
            <li>Valid for today's quiz only</li>
            <li>Refund if quiz is cancelled</li>
            <li>Secure & encrypted payment</li>
          </ul>
        </div>
      </div>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNavBar onProfileClick={() => setDrawerOpen(true)} />
    </>
  );
}
