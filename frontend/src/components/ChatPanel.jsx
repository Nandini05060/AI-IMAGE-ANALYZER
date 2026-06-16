import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';

const API_BASE = 'http://localhost:8001/api';

const ChatPanel = ({ imageId, disabled }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, [imageId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/images/${imageId}/chat`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    const userMsg = { role: 'user', message: input, tempId: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/images/${imageId}/chat`, {
        message: userMsg.message
      });
      setMessages(prev => prev.filter(m => !m.tempId).concat([
        { role: 'user', message: userMsg.message },
        { role: 'assistant', message: response.data.answer }
      ]));
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.tempId !== userMsg.tempId));
      alert('Failed to get response from Gemini. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
          <Bot size={20} /> Gemini Assistant
        </h3>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            <p>No messages yet.</p>
            <p style={{ fontSize: '0.875rem' }}>Ask Gemini about the objects or content of this image!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={msg.id || msg.tempId || idx} className={`message ${msg.role}`}>
            <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
              {msg.role === 'user' ? 'You' : 'Gemini'}
            </div>
            <div>{msg.message}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="loading-spinner primary"></span> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder={disabled ? "AI is analyzing image..." : "Ask a question about the image..."}
          disabled={isLoading || disabled}
        />
        <button type="submit" className="btn btn-primary" disabled={isLoading || disabled || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
