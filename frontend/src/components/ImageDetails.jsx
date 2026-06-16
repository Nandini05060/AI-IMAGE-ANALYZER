import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, FileText, Settings, Trash2, Edit2, Upload, Save, X } from 'lucide-react';
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
  
  // Natural image dimensions for scaling bounding boxes
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 });
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Replace image state
  const fileInputRef = useRef(null);
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    fetchImageDetails();
  }, [id]);

  const fetchImageDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE}/images/${id}`);
      setImage(response.data);
      setEditTitle(response.data.title || '');
      setEditDesc(response.data.description || '');
    } catch (error) {
      console.error('Error fetching details:', error);
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (e) => {
    setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  };

  const generateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const response = await axios.post(`${API_BASE}/images/${id}/caption`);
      setCaption(response.data.caption);
    } catch (error) {
      console.error('Error generating caption:', error);
      const msg = error.response?.data?.detail || 'Failed to generate caption.';
      alert(msg);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const reDetect = async () => {
    setIsRedetecting(true);
    try {
      await axios.post(`${API_BASE}/images/${id}/rerun-detection`);
      await fetchImageDetails(); // Reload to get new detections
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

  const saveMetadata = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append('title', editTitle);
    formData.append('description', editDesc);
    try {
      await axios.patch(`${API_BASE}/images/${id}`, formData);
      setIsEditing(false);
      setImage({ ...image, title: editTitle, description: editDesc });
    } catch (error) {
      console.error('Error updating metadata:', error);
      alert('Failed to update image details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReplaceImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsReplacing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.put(`${API_BASE}/images/${id}/replace`, formData);
      setCaption(null); // clear old caption
      await fetchImageDetails();
    } catch (error) {
      console.error('Error replacing image:', error);
      alert('Failed to replace image.');
    } finally {
      setIsReplacing(false);
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
            {/* Image and Bounding Boxes overlay */}
            <div style={{ position: 'relative', width: '100%', backgroundColor: 'var(--bg-color)', display: 'flex', justifyContent: 'center' }}>
              {isReplacing && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="loading-spinner primary"></div>
                </div>
              )}
              <img 
                src={`http://localhost:8001${image.original_image_path}?t=${Date.now()}`} 
                alt={image.title} 
                onLoad={handleImageLoad}
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
              
              {/* Draw boxes natively via CSS */}
              {image.detections?.map((det, idx) => {
                const left = (det.bbox_xmin / imgDims.w) * 100;
                const top = (det.bbox_ymin / imgDims.h) * 100;
                const width = ((det.bbox_xmax - det.bbox_xmin) / imgDims.w) * 100;
                const height = ((det.bbox_ymax - det.bbox_ymin) / imgDims.h) * 100;

                return (
                  <div key={idx} style={{
                    position: 'absolute',
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    border: '3px solid red',
                    boxSizing: 'border-box',
                    pointerEvents: 'none'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '-3px',
                      backgroundColor: 'red',
                      color: 'white',
                      padding: '2px 6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {det.label} {(det.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              
              {/* Metadata Edit Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Image Metadata</h3>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>
                      <Edit2 size={14} /> Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={saveMetadata} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }} disabled={isSaving}>
                        {isSaving ? 'Saving...' : <><Save size={14} /> Save</>}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="text" 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      placeholder="Title" 
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                    <textarea 
                      value={editDesc} 
                      onChange={(e) => setEditDesc(e.target.value)} 
                      placeholder="Description (Optional)" 
                      rows={2}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'vertical' }}
                    />
                  </div>
                ) : (
                  <div>
                    {image.description ? <p style={{ margin: 0, color: 'var(--text-muted)' }}>{image.description}</p> : <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>No description provided.</p>}
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Uploaded: {new Date(image.upload_timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button onClick={reDetect} className="btn btn-outline" disabled={isRedetecting} style={{ flex: 1, justifyContent: 'center' }}>
                  <RefreshCw size={16} className={isRedetecting ? 'spin' : ''} /> 
                  {isRedetecting ? 'Detecting...' : 'Re-run Detection'}
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleReplaceImage} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline" disabled={isReplacing} style={{ flex: 1, justifyContent: 'center' }}>
                  <Upload size={16} /> Replace Image
                </button>
              </div>

              {/* Caption Section */}
              {caption && (
                <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: 'var(--radius-md)', marginTop: '1.5rem', border: '1px solid #bae6fd' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> AI Caption
                  </h4>
                  <p style={{ margin: 0, color: '#0c4a6e', lineHeight: 1.5 }}>{caption}</p>
                </div>
              )}

              {!caption && (
                <button onClick={generateCaption} className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }} disabled={isGeneratingCaption}>
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
