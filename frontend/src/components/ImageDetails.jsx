import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, FileText, Settings, Trash2 } from 'lucide-react';
import ChatPanel from './ChatPanel';

const API_BASE = 'http://localhost:8001/api';

const ImageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isRedetecting, setIsRedetecting] = useState(false);

  useEffect(() => {
    fetchImageDetails();
  }, [id]);

  const fetchImageDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE}/images/${id}`);
      setImage(response.data);
    } catch (error) {
      console.error('Error fetching details:', error);
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const response = await axios.post(`${API_BASE}/images/${id}/caption`);
      setCaption(response.data.caption);
    } catch (error) {
      console.error('Error generating caption:', error);
      alert('Failed to generate caption.');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const reDetect = async () => {
    setIsRedetecting(true);
    try {
      await axios.post(`${API_BASE}/images/${id}/redetect`);
      await fetchImageDetails(); // Reload to get new detections and image
    } catch (error) {
      console.error('Error redetecting:', error);
      alert('Failed to re-run detection.');
    } finally {
      setIsRedetecting(false);
    }
  };

  const deleteImage = async () => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await axios.delete(`${API_BASE}/images/${id}`);
      navigate('/');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image.');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loading-spinner primary"></div></div>;
  if (!image) return <div className="card">Image not found.</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/" className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ margin: 0, color: 'var(--text-main)' }}>{image.title}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button onClick={deleteImage} className="btn btn-danger" title="Delete Image">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <img 
              src={`http://localhost:8001${image.processed_image_path || image.original_image_path}?t=${Date.now()}`} 
              alt={image.title} 
              style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: 'var(--bg-color)' }} 
            />
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Image Metadata</h3>
                  {image.description && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{image.description}</p>}
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Uploaded: {new Date(image.upload_timestamp).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={reDetect} className="btn btn-outline" disabled={isRedetecting}>
                    <RefreshCw size={16} className={isRedetecting ? 'spin' : ''} /> 
                    {isRedetecting ? 'Detecting...' : 'Re-run Detection'}
                  </button>
                </div>
              </div>

              {caption && (
                <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: 'var(--radius-md)', marginTop: '1rem', border: '1px solid #bae6fd' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> AI Caption
                  </h4>
                  <p style={{ margin: 0, color: '#0c4a6e', lineHeight: 1.5 }}>{caption}</p>
                </div>
              )}

              {!caption && (
                <button onClick={generateCaption} className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={isGeneratingCaption}>
                  {isGeneratingCaption ? <><span className="loading-spinner"></span> Generating...</> : <><FileText size={16} /> Generate Caption</>}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} /> YOLOv8 Detections
              <span className="badge" style={{ marginLeft: 'auto' }}>{image.detections?.length || 0} Objects</span>
            </h3>
            
            {image.detections && image.detections.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {image.detections.map((det, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{det.label}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${det.confidence * 100}%`, height: '100%', backgroundColor: det.confidence > 0.7 ? 'var(--success-color)' : 'var(--primary-color)' }}></div>
                          </div>
                          <span style={{ fontSize: '0.875rem', width: '40px', textAlign: 'right' }}>{(det.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No objects detected in this image.</p>
            )}
          </div>
        </div>

        <div>
          <ChatPanel imageId={id} />
        </div>
      </div>
    </div>
  );
};

export default ImageDetails;
