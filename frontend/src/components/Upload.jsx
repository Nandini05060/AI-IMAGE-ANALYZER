import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload as UploadIcon, Image as ImageIcon } from 'lucide-react';

const API_BASE = 'http://localhost:8001/api';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      if (!title) setTitle(selectedFile.name.split('.')[0]);
      setError('');
    } else if (selectedFile) {
      setError('Please select a valid image file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      if (!title) setTitle(droppedFile.name.split('.')[0]);
      setError('');
    } else {
      setError('Please drop a valid image file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image to upload.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const response = await axios.post(`${API_BASE}/images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Navigate to the newly uploaded image details
      navigate(`/image/${response.data.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Upload Image</h2>
      
      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div 
          className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: '1.5rem' }}
        >
          {preview ? (
            <img src={preview} alt="Preview" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: 'var(--radius-md)' }} />
          ) : (
            <>
              <UploadIcon size={48} />
              <h3 style={{ margin: '0.5rem 0', color: 'var(--text-main)' }}>Drag & drop an image here</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>or click to browse from your computer</p>
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>

        <div className="input-group">
          <label htmlFor="title">Title</label>
          <input 
            type="text" 
            id="title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="E.g., Park Scene"
          />
        </div>

        <div className="input-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea 
            id="description" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="A brief description of the image"
            rows={3}
          />
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => navigate('/')}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <><span className="loading-spinner"></span> Uploading & Processing...</>
            ) : (
              <><UploadIcon size={18} /> Upload Image</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Upload;
