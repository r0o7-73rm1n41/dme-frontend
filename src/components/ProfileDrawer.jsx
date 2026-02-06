import React, { useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import { getImageURL } from "../utils/imageHelper";

export default function ProfileDrawer({ open, onClose }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const getInitials = () => {
    if (!user) return "U";
    const name = user.fullName || user.name || user.username || "User";
    return name.charAt(0).toUpperCase();
  };

  // ✅ Phone formatter: adds + before 91
  const formatPhone = (phone) => {
    if (!phone) return "";
    const str = phone.toString();

    if (str.startsWith("91")) {
      return `+${str}`;
    }

    return `+${str}`;
  };

  return (
    <>
      {/* Overlay */}
      <div className={`overlay ${open ? "active" : ""}`} onClick={onClose}></div>

      {/* Drawer */}
      <aside className={`drawer left-drawer ${open ? "open" : ""}`}>
        <div className="drawer-header">
          <h2>{t("profile")}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="profile-pic" style={{ position: "relative" }}>
          {user?.profileImage ? (
            <>
              <img
                src={getImageURL(user.profileImage)}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                  const fallback =
                    e.target.parentElement?.querySelector(".profile-pic-fallback");
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="profile-pic-fallback"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "linear-gradient(to bottom, #3b060e, #200307)",
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  fontWeight: "bold",
                  color: "#fff",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                {getInitials()}
              </div>
            </>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "linear-gradient(to bottom, #3b060e, #200307)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              {getInitials()}
            </div>
          )}
        </div>

        <div className="profile-info">
          <h3>{user?.fullName || user?.name || user?.username || "User"}</h3>
          <p>
            {user?.phone
              ? formatPhone(user.phone)
              : user?.email || ""}
          </p>
        </div>

        <div className="sidebar-item" onClick={() => (window.location.href = "/edit-profile")}>
          👤 {t("Edit Profile")}
        </div>
        <div className="sidebar-item" onClick={() => (window.location.href = "/quiz-analytics")}>
          📜 {t("Quiz Analytics")}
        </div>
        <div className="sidebar-item" onClick={() => (window.location.href = "/payment-history")}>
          💳 {t("Payment History")}
        </div>
        <div className="sidebar-item" onClick={() => (window.location.href = "/settings")}>
          ⚙️ {t("Settings")}
        </div>
        <div
          className="sidebar-item"
          onClick={async () => {
            await logout();
            onClose();
            window.location.href = "/login";
          }}
        >
          🚪 {t("logout")}
        </div>
      </aside>
    </>
  );
}

// // // // frontend/src/components/ProfileDrawer.jsx
// import React, { useEffect, useContext } from "react";
// import { AuthContext } from "../context/AuthContext";
// import { useTranslation } from "../context/LanguageContext";
// import { getImageURL } from "../utils/imageHelper";

// export default function ProfileDrawer({ open, onClose }) {
//   const { user, logout } = useContext(AuthContext);
//   const { t } = useTranslation();

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (e.key === "Escape") onClose();
//     };
//     document.addEventListener("keydown", handleKeyDown);
//     return () => document.removeEventListener("keydown", handleKeyDown);
//   }, [onClose]);

//   useEffect(() => {
//     document.body.style.overflow = open ? "hidden" : "";
//   }, [open]);

//   const getInitials = () => {
//     if (!user) return "U";
//     const name = user.fullName || user.name || user.username || "User";
//     return name.charAt(0).toUpperCase();
//   };

//   return (
//     <>
//       {/* Overlay */}
//       <div className={`overlay ${open ? "active" : ""}`} onClick={onClose}></div>

//       {/* Drawer */}
//       <aside className={`drawer left-drawer ${open ? "open" : ""}`}>
//         <div className="drawer-header">
//           <h2>{t('profile')}</h2>
//           <button className="close-btn" onClick={onClose}>
//             ×
//           </button>
//         </div>

//         <div className="profile-pic" style={{ position: "relative" }}>
//           {user?.profileImage ? (
//             <>
//               <img
//                 src={getImageURL(user.profileImage)}
//                 alt="Profile"
//                 style={{
//                   width: "100%",
//                   height: "100%",
//                   borderRadius: "50%",
//                   objectFit: "cover",
//                   position: "absolute",
//                   top: 0,
//                   left: 0,
//                 }}
//                 onError={(e) => {
//                   e.target.style.display = "none";
//                   const fallback = e.target.parentElement?.querySelector(".profile-pic-fallback");
//                   if (fallback) fallback.style.display = "flex";
//                 }}
//               />
//               <div
//                 className="profile-pic-fallback"
//                 style={{
//                   width: "100%",
//                   height: "100%",
//                   borderRadius: "50%",
//                   background: "linear-gradient(to bottom, #3b060e, #200307)",
//                   display: "none",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontSize: "32px",
//                   fontWeight: "bold",
//                   color: "#fff",
//                   position: "absolute",
//                   top: 0,
//                   left: 0,
//                 }}
//               >
//                 {getInitials()}
//               </div>
//             </>
//           ) : (
//             <div
//               style={{
//                 width: "100%",
//                 height: "100%",
//                 borderRadius: "50%",
//                 background: "linear-gradient(to bottom, #3b060e, #200307)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontSize: "32px",
//                 fontWeight: "bold",
//                 color: "#fff",
//               }}
//             >
//               {getInitials()}
//             </div>
//           )}
//         </div>

//         <div className="profile-info">
//           <h3>{user?.fullName || user?.name || user?.username || "User"}</h3>
//           <p>{
//           // user?.phone || user?.email || ""}
//           {user?.phone ? formatPhone(user.phone) : user?.email || ""}
//           </p>
//         </div>

//         <div className="sidebar-item" onClick={() => (window.location.href = "/edit-profile")}>
//           👤 {t('editProfile')}
//         </div>
//         <div className="sidebar-item" onClick={() => (window.location.href = "/quiz-analytics")}>
//           📜 {t('myQuizzesAnalytics')}
//         </div>
//         <div className="sidebar-item" onClick={() => (window.location.href = "/payment-history")}>
//           💳 {t('paymentHistory')}
//         </div>
//         <div className="sidebar-item" onClick={() => (window.location.href = "/settings")}>
//           ⚙️ {t('settings')}
//         </div>
//         <div
//           className="sidebar-item"
//           onClick={async () => {
//             await logout();
//             onClose();
//             window.location.href = "/login";
//           }}
//         >
//           🚪 {t('logout')}
//         </div>
//       </aside>
//     </>
//   );
// }

