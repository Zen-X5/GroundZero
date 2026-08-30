import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Move } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CommandAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Commander, Ground-Zero Agent online. Ask me for sit-reps, building status, or drone telemetry."
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: window.innerHeight - 500 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8005/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: '⚠️ Connection lost. Unable to reach AI command service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#00d2ff',
            color: '#000',
            border: 'none',
            boxShadow: '0 4px 15px rgba(0, 210, 255, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageCircle size={30} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '320px',
            height: '450px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            backdropFilter: 'blur(10px)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div 
            onMouseDown={handleMouseDown}
            style={{
              padding: '12px',
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00d2ff' }}>
              <Bot size={18} />
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Command Agent</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Move size={16} color="#94a3b8" />
              <X 
                size={18} 
                color="#94a3b8" 
                style={{ cursor: 'pointer' }} 
                onClick={() => setIsOpen(false)} 
              />
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  backgroundColor: msg.role === 'user' ? '#0ea5e9' : '#334155',
                  padding: '6px',
                  borderRadius: '50%'
                }}>
                  {msg.role === 'user' ? <User size={14} color="#fff"/> : <Bot size={14} color="#00d2ff"/>}
                </div>
                <div style={{
                  backgroundColor: msg.role === 'user' ? '#0ea5e9' : '#1e293b',
                  color: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  maxWidth: '75%',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Bot size={14} color="#00d2ff" style={{ opacity: 0.5 }}/>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Agent is analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid #334155',
            display: 'flex',
            gap: '8px'
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask for drone status..."
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#f8fafc',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: '#0ea5e9',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading || !input.trim() ? 0.5 : 1
              }}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CommandAgent;
