// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import API from "../utils/api";
import { socket } from "../socket";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import { showAlert } from "../context/AlertContext";
import BottomNavBar from "../components/BottomNavBar";
import ProfileDrawer from "../components/ProfileDrawer";
import DarkModeToggle from "../components/DarkModeToggle";
import "../styles/global.css";
import { getImageURL } from "../utils/imageHelper";

dayjs.extend(relativeTime);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the correct image URL based on the hostname
 * Handles both absolute URLs and relative paths
 */

// export const getImageURL = (imagePath) => {
//   if (!imagePath) return null;

//   // Already a full URL → return as-is
//   if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
//     return imagePath;
//   }

//   const hostname = window?.location?.hostname;
//   const isLocal =
//     hostname === "localhost" || hostname === "127.0.0.1";

//   // Development mode
//   if (isLocal) {
//     return `http://localhost:5000/images/${imagePath}`;
//   }

//   // Production mode
//   return `https://api.dailymindeducation.com/images/${imagePath}`;
// };




// ============================================
// LIKE/VIEW PAIRING ALGORITHM
// ============================================

/**
 * Generate like/view pairs according to the special pairing algorithm
 * 
 * ✅ FINAL EXACT PAIRING RULE
 * 
 * 🔥 THE GENERAL RULE
 * 
 * ⭐ SPECIAL CASES
 * - n = 1 → Likes = L[2], Views = V[1] → { like: 2, view: 1 }
 * - n = 2 → Likes = L[1], Views = V[2] → { like: 1, view: 2 }
 * 
 * ⭐ FOR n ≥ 3 (Apply odd/even logic):
 * - If n is ODD: Likes = L[n], Views = V[n+1]
 * - If n is EVEN: Likes = L[n], Views = V[n-1]
 * 
 * 📋 DETAILED PAIRING RULES:
 * Step 1 (n=1) → Like: 2nd, View: 1st → L[2], V[1]
 * Step 2 (n=2) → Like: 1st, View: 2nd → L[1], V[2]
 * Step 3 (n=3) → Like: 3rd, View: 4th → L[3], V[4]
 * Step 4 (n=4) → Like: 4th, View: 3rd → L[4], V[3]
 * Step 5 (n=5) → Like: 5th, View: 6th → L[5], V[6]
 * Step 6 (n=6) → Like: 6th, View: 5th → L[6], V[5]
 * Step 7 (n=7) → Like: 7th, View: 8th → L[7], V[8]
 * Step 8 (n=8) → Like: 8th, View: 7th → L[8], V[7]
 * 
 * ✅ OUTPUT EXAMPLE (n=8):
 * [
 *   { like: 2, view: 1 },
 *   { like: 1, view: 2 },
 *   { like: 3, view: 4 },
 *   { like: 4, view: 3 },
 *   { like: 5, view: 6 },
 *   { like: 6, view: 5 },
 *   { like: 7, view: 8 },
 *   { like: 8, view: 7 }
 * ]
 * 
 * @param {number} n - Total number of items (blog posts)
 * @returns {Array<{like: number, view: number}>} Array of like/view pairs
 */
const generateLikeViewPairs = (n) => {
  const result = [];

  for (let i = 1; i <= n; i++) {
    if (i === 1) {
      // Special case: n=1 → L[2], V[1]
      result.push({ like: 2, view: 1 });
    } else if (i === 2) {
      // Special case: n=2 → L[1], V[2]
      result.push({ like: 1, view: 2 });
    } else {
      // For n ≥ 3, apply odd/even logic
      if (i % 2 === 1) {
        // Odd: Likes = L[n], Views = V[n+1]
        // Ensure view index doesn't exceed n
        result.push({ like: i, view: i + 1 <= n ? i + 1 : i });
      } else {
        // Even: Likes = L[n], Views = V[n-1]
        result.push({ like: i, view: i - 1 });
      }
    }
  }

  return result;
};

// ============================================
// MAIN HOME PAGE COMPONENT
// ============================================

export default function HomePage() {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState([]);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed countdown state - using LandingPage countdown instead

  /**
   * Load blogs from backend and display ALL posts sorted by engagement
   * 
   * INSTAGRAM/FACEBOOK STYLE SORTING:
   * 1. Fetch all blogs from backend
   * 2. Calculate engagement score (views + likes)
   * 3. Sort by engagement (descending) - most viewed/liked first
   * 4. Display ALL posts in sorted order
   * 5. Auto-refresh every 15 seconds + WebSocket for instant updates
   */
// const [page, setPage] = useState(0); // page number starting from 0
// const [hasMore, setHasMore] = useState(true); // to control if more posts are available
// const [loadingMore, setLoadingMore] = useState(false); // loading indicator for infinite scroll

  const loadBlogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch ALL blogs (no pagination) for home page feed
      const { data } = await API.get("/blogs?getAll=true");

      // Validate response
      if (!data.blogs || !Array.isArray(data.blogs)) {
        setBlogs([]);
        return;
      }

      console.log("📊 Total blogs fetched:", data.blogs.length);

      // ✅ STEP 1: Map blogs with engagement metrics
      const mapped = data.blogs.map((b) => ({
        ...b,
        likesCount: b.likesCount || 0,
        viewsCount: b.viewsCount || b.views || 0,
        liked: b.liked || false,
        engagementScore: (b.viewsCount || b.views || 0) + (b.likesCount || 0), // Views first, then likes
      }));

      console.log("📈 Engagement Scores:", mapped.map((b) => ({
        title: b.content?.substring(0, 30) + "...",
        views: b.viewsCount,
        likes: b.likesCount,
        engagement: b.engagementScore,
      })));

      // ✅ STEP 2: Sort by algorithm: Top Views → Top Liked → Low Liked/Views
      // Algorithm: Most Viewed first, then Most Liked, then alternating, then low engagement
      
      // Sort by views descending (top views first)
      const sortedByViews = [...mapped].sort((a, b) => {
        if (b.viewsCount !== a.viewsCount) return b.viewsCount - a.viewsCount;
        return b.likesCount - a.likesCount; // Tie-breaker: likes
      });
      
      // Sort by likes descending (top liked)
      const sortedByLikes = [...mapped].sort((a, b) => {
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        return b.viewsCount - a.viewsCount; // Tie-breaker: views
      });
      
      // Create optimized feed: Top Views → Top Liked → Alternating → Low Engagement
      const sorted = [];
      const usedIndices = new Set();
      
      // Step 1: Add top viewed blogs first (top 10 most viewed)
      const topViews = sortedByViews.slice(0, Math.min(10, sortedByViews.length));
      topViews.forEach(item => {
        if (!usedIndices.has(item._id.toString())) {
          sorted.push(item);
          usedIndices.add(item._id.toString());
        }
      });
      
      // Step 2: Add top liked blogs (top 10 most liked, excluding already added)
      const topLikes = sortedByLikes.slice(0, Math.min(10, sortedByLikes.length));
      topLikes.forEach(item => {
        if (!usedIndices.has(item._id.toString())) {
          sorted.push(item);
          usedIndices.add(item._id.toString());
        }
      });
      
      // Step 3: Alternate remaining high-engagement posts (views and likes)
      const remaining = mapped.filter(item => !usedIndices.has(item._id.toString()));
      const highEngagement = remaining.filter(item => item.engagementScore > 0)
        .sort((a, b) => b.engagementScore - a.engagementScore);
      
      // Alternate between views and likes for high engagement posts
      const highViews = [...highEngagement].sort((a, b) => b.viewsCount - a.viewsCount);
      const highLikes = [...highEngagement].sort((a, b) => b.likesCount - a.likesCount);
      const maxHigh = Math.max(highViews.length, highLikes.length);
      
      for (let i = 0; i < maxHigh; i++) {
        if (i < highViews.length && !usedIndices.has(highViews[i]._id.toString())) {
          sorted.push(highViews[i]);
          usedIndices.add(highViews[i]._id.toString());
        }
        if (i < highLikes.length && !usedIndices.has(highLikes[i]._id.toString())) {
          sorted.push(highLikes[i]);
          usedIndices.add(highLikes[i]._id.toString());
        }
      }
      
      // Step 4: Add low engagement posts (low liked/low views) at the end
      const lowEngagement = remaining
        .filter(item => !usedIndices.has(item._id.toString()))
        .sort((a, b) => {
          // Sort by engagement score ascending (lowest first)
          if (a.engagementScore !== b.engagementScore) {
            return a.engagementScore - b.engagementScore;
          }
          // Then by date (newest first)
          return new Date(b.createdAt || b.publishedAt || 0) - new Date(a.createdAt || a.publishedAt || 0);
        });
      
      lowEngagement.forEach(item => {
        if (!usedIndices.has(item._id.toString())) {
          sorted.push(item);
          usedIndices.add(item._id.toString());
        }
      });

      console.log("🎯 Posts sorted by engagement (views first, then likes)");
      sorted.forEach((b, idx) => {
        console.log(`  #${idx + 1}: "${b.content?.substring(0, 40)}..." - 👁️ ${b.viewsCount} views | ❤️ ${b.likesCount} likes = ${b.engagementScore} engagement`);
      });

      // ✅ STEP 3: Assign pairing indices based on SORTED position (for reference)
      const pairs = generateLikeViewPairs(sorted.length);
      const pairedBlogs = sorted.map((b, idx) => ({
        ...b,
        position: idx + 1, // Position in sorted list (1-based)
        likeIndex: pairs[idx].like,
        viewIndex: pairs[idx].view,
      }));

      console.log("ℹ️ Pairing Reference (for tracking):", pairedBlogs.map((b) => ({
        position: b.position,
        title: b.content?.substring(0, 30),
        pairingPattern: `L[${b.likeIndex}]V[${b.viewIndex}]`,
        actualStats: `L=${b.likesCount}|V=${b.viewsCount}`,
      })));

      console.log(`✅ Displaying ALL ${pairedBlogs.length} posts sorted by engagement`);

      setBlogs(pairedBlogs);
    } catch (err) {
      showAlert("Error loading notes: " + (err?.response?.data?.message || err.message), "danger");
      setError(err.message || "💀⚰️Failed to load notes");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load blogs on component mount
   * Set up DUAL update system:
   * 1. 15-second polling for periodic refresh
   * 2. Real-time WebSocket for instant updates
   * 
   * Instagram/Facebook Style: Feed auto-updates without user action
   */
  useEffect(() => {
    loadBlogs();

    // ✅ 15-SECOND AUTO-REFRESH (like Instagram auto-refresh)
    const interval = setInterval(() => {
      console.log("📱 Auto-refreshing feed (15s interval)...");
      loadBlogs();
    }, 15000);

    // ✅ REAL-TIME WEBSOCKET UPDATES (instant post appearance)
    // Listen for new blogs created
    const handleNewBlog = (newBlog) => {
      console.log("🔥 New blog received via WebSocket:", newBlog);
      loadBlogs(); // Reload to apply pairing and filter
    };

    // Listen for blog updates (likes, views)
    const handleBlogUpdate = (updatedBlog) => {
      console.log("🔄 Blog updated via WebSocket:", updatedBlog);
      loadBlogs(); // Reload to apply pairing and filter
    };

    // Listen for blog like events
    const handleBlogLiked = (data) => {
      console.log("👍 Blog liked via WebSocket:", data);
      loadBlogs(); // Reload to apply pairing and filter
    };

    // Listen for blog view events
    const handleBlogViewed = (data) => {
      console.log("👁️ Blog viewed via WebSocket:", data);
      loadBlogs(); // Reload to apply pairing and filter
    };

    // Register WebSocket listeners
    socket.on("blog:created", handleNewBlog);
    socket.on("blog:updated", handleBlogUpdate);
    socket.on("blog:liked", handleBlogLiked);
    socket.on("blog:viewed", handleBlogViewed);

    // Cleanup: Remove listeners and interval on unmount
    return () => {
      clearInterval(interval);
      socket.off("blog:created", handleNewBlog);
      socket.off("blog:updated", handleBlogUpdate);
      socket.off("blog:liked", handleBlogLiked);
      socket.off("blog:viewed", handleBlogViewed);
    };
  }, [loadBlogs]);
  // Countdown timer moved to LandingPage

  /**
   * Toggle like on a blog post and update UI immediately
   */
  const toggleLike = async (id) => {
    try {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await API.post(`/blogs/${id}/like`);
      
      // Update blog state optimistically
      setBlogs((prev) =>
        prev.map((b) =>
          b._id === id
            ? {
                ...b,
                liked: data.liked,
                likesCount: data.likesCount,
              }
            : b
        )
      );
    } catch (err) {
      console.error("Like toggle error:", err);
    }
  };

  /**
   * Filter blogs based on search query
   * (Auto-filtering by pairing indices already done in loadBlogs)
   */
  const filtered = blogs.filter(
    (b) =>
      b.content.toLowerCase().includes(search.toLowerCase()) ||
      (b.user?.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.user?.fullName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME2.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>{t('notes').toUpperCase()}</h2>
      </header>

      <div className="home-container">
        <h2>{t('latestNotes')}</h2>
        
        {/* Auto-Update Info - Instagram Style
        <div style={{
          backgroundColor: "#e3f2fd",
          border: "1px solid #2196f3",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "15px",
          fontSize: "13px",
          color: "#1565c0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <strong>🔄 {t('autoUpdatingFeed')}:</strong> {t('mostViewedLikedPosts')}
            <br />
            <span style={{ fontSize: "12px", opacity: 0.8 }}>{t('updatesEvery15s')}</span>
          </div>
          <span style={{ fontSize: "20px", animation: "spin 2s linear infinite" }}>🔄</span>
        </div>

        {/* CSS for spinning animation */}
        {/* <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>  */}

        <input
          id="searchBar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
        />

        <div id="postListHome">
          {filtered.length > 0 ? (
            filtered.map((b) => (
              <PostCard
                key={b._id}
                post={b}
                onLike={() => toggleLike(b._id)}
                currentUser={user}
              />
            ))
          ) : (
            <div style={{ 
              textAlign: "center", 
              padding: "40px 20px",
              backgroundColor: "#ffffff02",
              borderRadius: "8px",
              marginTop: "20px"
            }}>
              {loading && <p>⏳{t('loadingNotes')}</p>}
              {/* <p style={{ fontSize: "18px", color: "#666", marginBottom: "10px" }}>
                📊 No trending posts yet
              </p>
              <p style={{ fontSize: "13px", color: "#999" }}>
                Feed updates every 15 seconds. Most viewed & liked posts appear here automatically.
                {search && " Clear your search to see all trending posts."}
              </p> */}
            </div>
          )}
        </div>

        {error && <p style={{ color: "red" }}>{t('error')}: {error}</p>}
      </div>

      <ProfileDrawer
        key={user?._id || "no-user"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <BottomNavBar onProfileClick={() => setDrawerOpen(true)} />
    </>
  );
}


// ============================================
// POST CARD COMPONENT
// ============================================

/**
 * PostCard Component
 * Displays a single blog post in the feed
 * Includes like, report, and block functionality
 */
function PostCard({ post, onLike, currentUser }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const menuRef = useRef(null);

  const isLong = post.content.length > 300;
  const shortContent = isLong
    ? post.content.slice(0, 300) + "..."
    : post.content;
  const timestamp = `${dayjs(post.createdAt).format("MMM D, YYYY")} • ${dayjs(
    post.createdAt
  ).fromNow()}`;

  const postAuthorId = post.author?._id || post.user?._id;
  const isOwnPost = currentUser && postAuthorId === currentUser._id;

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Check if user is blocked by current user
   */
  useEffect(() => {
    if (currentUser && postAuthorId && !isOwnPost) {
      API.get(`/reports/check/${postAuthorId}`)
        .then((res) => setIsBlocked(res.data.blockedByMe))
        .catch(() => setIsBlocked(false));
    }
  }, [currentUser, postAuthorId, isOwnPost]);

  /**
   * Handle report submission
   */
  const handleReport = async () => {
    if (!reportReason) return alert("Please select a reason");
    try {
      const reportedUserId = post.author?._id || post.userId;
      if (!reportedUserId) return alert("Unable to report this user");
      
      await API.post("/reports/user", {
        blogId: post._id,
        reportedUserId: reportedUserId,
        reason: reportReason,
        description: reportDescription,
      });
      alert("Report submitted successfully. Admin will review it.");
      setShowReportModal(false);
      setReportReason("");
      setReportDescription("");
      setMenuOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || t('failedToSubmitReport'));
    }
  };

  /**
   * Handle user block
   */
  const handleBlock = async () => {
    if (
      !window.confirm(
        `${t('confirmBlock')} ${
          post.author?.fullName || post.author?.username || t('thisUser')
        }?`
      )
    ) {
      return;
    }
    try {
      await API.post("/reports/block", { userId: postAuthorId });
      alert(t('userBlockedSuccessfully'));
      setIsBlocked(true);
      setMenuOpen(false);
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || t('failedToBlockUser'));
    }
  };

  /**
   * Handle user unblock
   */
  const handleUnblock = async () => {
    try {
      await API.post("/reports/unblock", { userId: postAuthorId });
      alert(t('userUnblockedSuccessfully'));
      setIsBlocked(false);
      setMenuOpen(false);
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || t('failedToUnblockUser'));
    }
  };

  return (
    <div className="post-card" style={{ marginBottom: 16, position: "relative" }}>
      {/* ===== POST HEADER ===== */}
      <div
        className="post-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
<a
  href={`/user/${postAuthorId}/blogs`}
  style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", flex: 1 }}
>
  <div style={{ position: "relative", width: 40, height: 40 }}>
    {post.author?.profileImage || post.user?.profileImage ? (
      <img
        className="user-icon"
        src={getImageURL(post.author?.profileImage || post.user?.profileImage)}
        alt={post.author?.username || post.user?.username || "User"}
        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        onError={(e) => {
          e.target.onerror = null; // prevent infinite loop
          e.target.style.display = "none";
          const fallback = e.target.nextSibling;
          if (fallback) fallback.style.display = "flex";
        }}
      />
    ) : null}

    {/* Fallback Initial */}
    <div
      className="user-initial"
      style={{
        display: post.author?.profileImage || post.user?.profileImage ? "none" : "flex",
        backgroundColor: "var(--color-primary)",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "15px",
        fontWeight: "bold",
        color: "#fff",
        width: 40,
        height: 40,
        borderRadius: "50%",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      {(
        post.author?.fullName ||
        post.author?.username ||
        post.user?.fullName ||
        post.user?.username ||
        "U"
      )
        .charAt(0)
        .toUpperCase()}
    </div>
  </div>

  <div style={{ marginLeft: "10px" }}>
    <div className="username">
      {post.author?.fullName || post.author?.username || post.user?.fullName || post.user?.username || "Unknown"}
    </div>
    <div className="timestamp">{timestamp}</div>
  </div>
</a>

        </div>

        {/* Menu Button (for non-own posts) */}
        {currentUser && !isOwnPost && (
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                padding: "5px 10px",
                color: "#666",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⋮
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "35px",
                  right: "0",
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                  minWidth: "150px",
                  padding: "5px 0",
                }}
              >
                {!isBlocked ? (
                  <>
                    <button
                      onClick={() => {
                        setShowReportModal(true);
                        setMenuOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 15px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      🚩 {t('Report')}
                    </button>
                    <button
                      onClick={handleBlock}
                      style={{
                        width: "100%",
                        padding: "10px 15px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      🚫 {t('Block User')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleUnblock}
                    style={{
                      width: "100%",
                      padding: "10px 15px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ✅ {t('unblockUser')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== REPORT MODAL ===== */}
      {showReportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setShowReportModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "10px",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{t('reportPost')}</h3>
            <label style={{ display: "block", marginBottom: "10px" }}>
              Reason:
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">{t('selectReason')}</option>
                <option value="spam">{t('spam')}</option>
                <option value="inappropriate">{t('inappropriateContent')}</option>
                <option value="harassment">{t('harassment')}</option>
                <option value="fake">{t('fakeInformation')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </label>
            <label style={{ display: "block", marginBottom: "10px" }}>
              {t('descriptionOptional')}:
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder={t('provideMoreDetails')}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  minHeight: "80px",
                  resize: "vertical",
                }}
                maxLength={500}
              />
            </label>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                  setReportDescription("");
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleReport}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Submit {t('report')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POST IMAGE ===== */}
      {post.imageUrl && (
        <div style={{ marginTop: "10px", marginBottom: "10px" }}>
          <img
            src={getImageURL(post.imageUrl)}
            alt={post.title || "Blog image"}
            style={{
              width: "100%",
              maxHeight: "400px",
              objectFit: "cover",
              borderRadius: "8px",
              cursor: "pointer"
            }}
            onClick={() => window.open(getImageURL(post.imageUrl), '_blank')}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* ===== POST CONTENT ===== */}
      <div className={`post-content ${expanded ? "expanded" : isLong ? "collapsed" : ""}`}>
        {expanded ? post.content : shortContent}
        {!expanded && isLong && <div className="fade"></div>}
      </div>

      {/* ===== PDF DOWNLOAD ===== */}
      {post.pdfUrl && (
        <div style={{ marginTop: "10px" }}>
          <button
            onClick={async () => {
              if (!currentUser) {
                alert(t('loginToDownloadPdf'));
                window.location.href = "/login";
                return;
              }
              
              try {
                // Check if user has paid
                const paymentStatus = await API.get("/payments/quiz-status");
                if (!paymentStatus.data.hasPaidEver) {
                  alert(t('paymentRequiredPdfDownload'));
                  window.location.href = "/payment";
                  return;
                }
                
                // User has paid, redirect to download endpoint
                window.open(`/api/blogs/${post._id}/pdf`, '_blank');
              } catch (error) {
                console.error("PDF download check error:", error);
                if (error.response?.status === 403) {
                  alert(t('paymentRequiredPdfDownload'));
                  window.location.href = "/payment";
                } else {
                  alert(t('failedToDownloadPdf'));
                }
              }
            }}
            style={{
              color: "#007bff",
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "inherit"
            }}
          >
            📄 {t('downloadPdf')}
          </button>
        </div>
      )}

      {/* ===== READ MORE / SHOW LESS ===== */}
      {isLong && (
        <div
          className="read-more"
          onClick={() => setExpanded((s) => !s)}
          style={{ cursor: "pointer" }}
        >
          {expanded ? t('showLess') : t('readMore')}
        </div>
      )}

      {/* ===== LIKE/VIEW SECTION WITH PAIRING INDICES & ENGAGEMENT RANK ===== */}
      <div className="star-section" style={{ marginTop: "15px", paddingTop: "10px", borderTop: "1px solid #eee" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Like Button */}
          <span
            className="star-icon"
            onClick={onLike}
            style={{
              color: post.liked ? "gold" : "gray",
              cursor: "pointer",
              fontSize: "18px",
            }}
            title={t('likeThisPost')}
          >
            ⭐
          </span>
          <span className="star-count" style={{ fontWeight: "bold" }}>
            {post.likesCount} {t('likes')}
          </span>

          {/* Views Display */}
          {/* <span style={{ fontSize: "14px", color: "#666" }}>
            👁 {post.viewsCount || 0} views
          </span> */}

          {/* Total Engagement */}
          <span style={{ fontSize: "13px", color: "rgb(102, 102, 102)", fontWeight: "500" }}>
            📊 {t('engagement')}: {post.engagementScore || 0}
          </span>

          {/* Position/Rank in Popular Feed */}
          {/* <span
            style={{
              fontSize: "11px",
              color: "#fff",
              backgroundColor: "#ff6b6b",
              padding: "4px 8px",
              borderRadius: "12px",
              fontWeight: "600",
            }}
            title="Position in trending feed (sorted by engagement)"
          >
            #{post.position}
          </span> */}

          {/* Pairing Indices Display */}
          {/* <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              color: "#2e7d32",
              backgroundColor: "#e8f5e9",
              padding: "6px 10px",
              borderRadius: "4px",
              border: "1px solid #4caf50",
              fontWeight: "600",
            }}
            title="Post matches pairing criteria: Likes match Index AND Views match Index"
          >
            ✅ L[{post.likeIndex}]={post.likesCount} | V[{post.viewIndex}]={post.viewsCount}
          </span> */}
        </div>
      </div>
    </div>
  );
}
