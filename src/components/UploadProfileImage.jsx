// frontend/src/components/UploadProfileImage.jsx
import { useState, useContext } from "react";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";

export default function UploadProfileImage({ onUploadComplete }) {
  const { user, setUser } = useContext(AuthContext);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert("Please select an image file");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      alert("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", image);

    setLoading(true);

    try {
      const response = await API.post("/user/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      // Update user context with new profile image
      if (response.data.user && setUser) {
        setUser({ ...user, profileImage: response.data.user.profileImage });
      }
      
      if (onUploadComplete) {
        onUploadComplete(response.data.imageUrl || response.data.publicId);
      }
      
      alert("✅ Profile image uploaded successfully!");
      setImage(null);
      setPreview(null);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error?.response?.data?.message || "Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Upload Profile Image</h3>
      <div style={{ marginBottom: '15px' }}>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleImageChange}
          style={{ marginBottom: '10px' }}
        />
        {preview && (
          <div style={{ marginTop: '10px' }}>
            <img 
              src={preview} 
              alt="Preview" 
              style={{ 
                width: '150px', 
                height: '150px', 
                objectFit: 'cover',
                borderRadius: '50%',
                border: '2px solid #ddd'
              }} 
            />
          </div>
        )}
      </div>
      <button 
        onClick={handleUpload} 
        disabled={loading || !image}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading || !image ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? "⌛️ Uploading..." : "📤 Upload Image"}
      </button>
    </div>
  );
}
