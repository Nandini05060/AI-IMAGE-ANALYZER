import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trash2, Edit } from 'lucide-react';

const API_BASE = 'http://localhost:8001/api';

const Dashboard = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_BASE}/images/`);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (id, e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await axios.delete(`${API_BASE}/images/${id}`);
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loading-spinner primary"></div></div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Your Images</h2>
      {images.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No images uploaded yet.</p>
          <Link to="/upload" className="btn btn-primary">Upload your first image</Link>
        </div>
      ) : (
        <div className="grid">
          {images.map(image => (
            <Link to={`/image/${image.id}`} key={image.id} className="card" style={{ display: 'block', padding: 0, overflow: 'hidden', color: 'inherit' }}>
              <img 
                src={`http://localhost:8001${image.processed_image_path || image.original_image_path}`} 
                alt={image.title} 
                className="image-preview"
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              />
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{image.title || 'Untitled'}</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(image.upload_timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => deleteImage(image.id, e)}
                    className="btn btn-danger"
                    style={{ padding: '0.3rem' }}
                    title="Delete Image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
