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
          <img src="./public/imgs/dbd63161-eb86-463d-85f0-9f242e42d048.png" alt="home" />
        </div>
      </div>

      <div className={`nav-item ${isActive("edit") ? "active" : ""}`} onClick={handleEditClick}>
        <div className="icon-wrap">
          <img src="./public/imgs/3da7463a-197e-4501-9775-b8d053a1356f.png" alt="edit" />
          {unreadCount > 0 && (
            <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </div>
      </div>

      <div className={`nav-item ${isActive("quiz") ? "active" : ""}`} onClick={() => go("/quiz", true)}>
        <div className="icon-wrap">
          <img src="./public/imgs/9ca41b3b-36d0-4b1e-9a9d-cc0ca1b43d4f.png" alt="quiz" />
        </div>
      </div>

      <div className={`nav-item ${isActive("winners") ? "active" : ""}`} onClick={() => go("/winners")}>
        <div className="icon-wrap">
          <img src="./public/imgs/06ae374d-372f-4968-8ffb-7b25c9960064.png" alt="winners" />
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
