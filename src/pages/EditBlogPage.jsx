// // // src/pages/EditBlogPage.jsx

import React, { useState, useEffect } from "react";
import { useTranslation } from "../context/LanguageContext";
import API from "../utils/api";
import DarkModeToggle from "../components/DarkModeToggle";

export default function EditBlogPage() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const MAX_TITLE_WORDS = 30;
  const MAX_CONTENT_WORDS = 300;

  // Helper function to count words
  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const loadMyBlogs = async () => {
    const { data } = await API.get("/blogs/user/me");
    setBlogs(data);
  };

  useEffect(() => {
    loadMyBlogs();
  }, []);

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert(t('pdfSizeLimit'));
      e.target.value = ""; // Clear file input
      return;
    }

    // Check if user has paid (for PDF upload)
    try {
      const paymentStatus = await API.get("/payments/quiz-status");
      if (!paymentStatus.data.hasPaidToday && !paymentStatus.data.hasPaidEver) {
        alert(t('paymentRequiredPdf'));
        e.target.value = ""; // Clear file input
        setPdfFile(null);
        return;
      }
    } catch (err) {
      console.error("Payment check failed:", err);
      // Allow upload attempt - backend will reject if not paid
    }

    setPdfFile(file);
  };

  const createBlog = async () => {
    try {
      // Validate that title and content are not empty
      if (!title.trim()) {
        alert(t('enterTitle'));
        return;
      }

      if (!content.trim()) {
        alert(t('enterContent'));
        return;
      }

      const titleWordCount = countWords(title);
      const contentWordCount = countWords(content);

      // Double check word limits (should not exceed due to input locking)
      if (titleWordCount > MAX_TITLE_WORDS) {
        alert(`${t('titleWordLimit')} ${MAX_TITLE_WORDS} ${t('words')}. ${t('current')}: ${titleWordCount} ${t('words')}.`);
        return;
      }

      if (contentWordCount > MAX_CONTENT_WORDS) {
        alert(`${t('contentWordLimit')} ${MAX_CONTENT_WORDS} ${t('words')}. ${t('current')}: ${contentWordCount} ${t('words')}.`);
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (pdfFile) {
        // formData.append("pdfFile", pdfFile);
        formData.append("pdf", pdfFile);
      }

      // Send the formData to the backend
      await API.post("/blogs", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setTitle("");
      setContent("");
      setPdfFile(null); // Reset the file input
      loadMyBlogs();
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = "Failed to create note";
      
      if (errorData?.message) {
        errorMsg = errorData.message;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMsg += "\n\n" + errorData.errors.join("\n");
        }
      }
      
      alert(errorMsg);
      console.error("Create blog error:", err);
    }
  };

  const deleteBlog = async (id) => {
    if (!window.confirm("Delete note?")) return;
    await API.delete(`/blogs/${id}`);
    loadMyBlogs();
  };

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="/imgs/logo-DME2.png" alt="Logo" />
        </div>
        <DarkModeToggle />
        <h2>{t('editNotes').toUpperCase()}</h2>
      </header>

      <div className="edit-blog-container">
        <div className="edit-blog">
          <div className="create-section">
            <h2>{t('createNote')}</h2>
            <div className="form-group">
              <input
                type="text"
                placeholder={t('createNoteTitle')}
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  const currentWordCount = countWords(title);
                  const newWordCount = countWords(newTitle);
                  
                  // Only allow if not exceeding limit
                  if (newWordCount <= MAX_TITLE_WORDS) {
                    setTitle(newTitle);
                  }
                  // If at limit and trying to add more, completely block it
                }}
                onKeyDown={(e) => {
                  const currentWordCount = countWords(title);
                  // If at max words, only allow backspace, delete, arrow keys, etc.
                  if (currentWordCount >= MAX_TITLE_WORDS) {
                    if (!['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }
                }}
                className="title-input"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', textAlign: 'right' }}>
                {countWords(title)} / {MAX_TITLE_WORDS} {t('words')}
                {countWords(title) === MAX_TITLE_WORDS && (
                  <span style={{ color: '#dc3545', marginLeft: '10px', fontWeight: 'bold' }}>
                    🔒 {t('maximumReached')}
                  </span>
                )}
              </div>
            </div>
            <div className="form-group">
              <textarea
                placeholder={`${t('writeNoteContent')} (${t('max')} 300 ${t('words')})`}
                value={content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  const currentWordCount = countWords(content);
                  const newWordCount = countWords(newContent);
                  
                  // Only allow if not exceeding limit
                  if (newWordCount <= MAX_CONTENT_WORDS) {
                    setContent(newContent);
                  }
                  // If at limit and trying to add more, completely block it
                }}
                onKeyDown={(e) => {
                  const currentWordCount = countWords(content);
                  // If at max words, only allow backspace, delete, arrow keys, etc.
                  if (currentWordCount >= MAX_CONTENT_WORDS) {
                    if (!['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Enter'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }
                }}
                className="content-textarea"
                rows="6"
                maxLength={5000}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', textAlign: 'right' }}>
                {countWords(content)} / {MAX_CONTENT_WORDS} {t('words')}
                {countWords(content) === MAX_CONTENT_WORDS && (
                  <span style={{ color: '#dc3545', marginLeft: '10px', fontWeight: 'bold' }}>
                    🔒 {t('lockedMaximumReached')}
                  </span>
                )}
              </div>
            </div>

            {/* PDF Upload */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('pdfUploadPaidOnly')}
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="pdf-input"
              />
              {pdfFile && (
                <p style={{ marginTop: '5px', color: '#28a745', fontSize: '14px' }}>
                  ✓ {t('selectedPdf')}: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                ⚠️ {t('pdfRequiresPayment')}
              </p>
            </div>

            <button 
              onClick={createBlog} 
              className="publish-btn"
              disabled={!title.trim() || !content.trim()}
            >
              📝 {t('publishNote')}
            </button>
          </div>

          <div className="notes-section">
            <h3>📚 {t('myNotes')} ({blogs.length})</h3>
            {blogs.length === 0 ? (
              <div className="empty-state">
                <p>{t('noNotesYet')}</p>
              </div>
            ) : (
              <div className="notes-grid">
                {blogs.map((b) => (
                  <div key={b._id} className="note-card">
                    <div className="note-content">
                      <h4 className="note-title">{b.title}</h4>
                      <p className="note-preview">
                        {b.content.length > 100 
                          ? `${b.content.substring(0, 100)}...` 
                          : b.content
                        }
                      </p>
                      <span className="note-date">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>

{b.pdfUrl && (
  <div className="pdf-link">
    <a
      href={`https://api.dailymindeducation.com/api/blogs/pdfs/${b.pdfUrl.split("/").pop()}`}
      target="_blank"
      rel="noreferrer"
    >
      {t('pdfFile')}
    </a>
  </div>
)}

                    {/* {b.pdfUrl && ( */}
                      {/* // <div className="note-pdf"> */}
                      {/* //   <a href={b.pdfUrl} target="_blank" rel="noopener noreferrer">PDF File</a> */}
                      {/* // </div> */}
                    {/* // )} */}
                    
                    <button 
                      onClick={() => deleteBlog(b._id)} 
                      className="delete-btn"
                      title={t('deleteNote')}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
