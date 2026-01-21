// // // // // // // // frontend/src/components/BottomNavBar.jsx
// frontend/src/components/BottomNavBar.jsx
import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import API from "../utils/api";

export default function BottomNavBar({ onProfileClick }) {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);

  // const isDarkMode = document.body.classList.contains("dark");
const [isDarkMode, setIsDarkMode] = useState(
  document.body.classList.contains("dark")
);

useEffect(() => {
  const observer = new MutationObserver(() => {
    setIsDarkMode(document.body.classList.contains("dark"));
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}, []);

  /* Active route detection (FIXES double dot issue) */
  const isActive = (key) => {
    switch (key) {
      case "home":
        return location.pathname === "/" || location.pathname === "/home";
      case "edit":
        return location.pathname === "/edit-blog";
      case "quiz":
        return location.pathname.startsWith("/quiz");
      case "winners":
        return location.pathname === "/winners";
      case "profile":
        return location.pathname === "/profile";
      default:
        return false;
    }
  };

  const handleEditClick = async () => {
    if (unreadCount > 0 && latestNotification?.blog?._id) {
      try {
        await API.patch(`/notifications/read/${latestNotification._id}`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setLatestNotification(null);

        const blogRes = await API.get(`/blogs/${latestNotification.blog._id}`);
        const authorId = blogRes.data?.author?._id;
        if (authorId) {
          navigate(`/user/${authorId}/blogs?highlight=${latestNotification.blog._id}`);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    navigate("/edit-blog");
  };

  const go = (path, protectedRoute = false) => {
    navigate(path);
  };

  return (
    <div className={`bottom-nav ${isDarkMode ? "dark" : ""}`}>

      <div className={`nav-item ${isActive("home") ? "active" : ""}`} onClick={() => go("/home")}>
        <div className="icon-wrap">
          <img src="https://img.icons8.com/?size=100&id=ngY49upLM_vX&format=png&color=000000" alt="home" />
        </div>
      </div>

      <div className={`nav-item ${isActive("edit") ? "active" : ""}`} onClick={handleEditClick}>
        <div className="icon-wrap">
          <img src="https://img.icons8.com/?size=100&id=bvLrlEUfi2ZI&format=png&color=000000" alt="edit" />
          {unreadCount > 0 && (
            <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </div>
      </div>

      <div className={`nav-item ${isActive("quiz") ? "active" : ""}`} onClick={() => go("/quiz", true)}>
        <div className="icon-wrap">
          <img src="https://img.icons8.com/?size=100&id=cRDlJeszVWm0&format=png&color=000000" alt="quiz" />
        </div>
      </div>

      <div className={`nav-item ${isActive("winners") ? "active" : ""}`} onClick={() => go("/winners")}>
        <div className="icon-wrap">
          <img src="https://img.icons8.com/?size=100&id=zeRZbA_1nZ3n&format=png&color=000000" alt="winners" />
        </div>
      </div>

      <div
        className={`nav-item ${isActive("profile") ? "active" : ""}`}
        onClick={() => {
          if (!user) navigate("/login");
          else onProfileClick ? onProfileClick() : navigate("/profile");
        }}
      >
        <div className="icon-wrap">
          <img src="https://img.icons8.com/?size=100&id=85147&format=png" alt="profile" />
        </div>
      </div>

    </div>
  );
}
