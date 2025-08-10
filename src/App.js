import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, MessageCircle, Loader, ExternalLink } from 'lucide-react';
import './App.css';

const App = () => {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const pdfViewerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    
    // Create object URL for PDF viewer
    const url = URL.createObjectURL(selectedFile);
    setFileUrl(url);

    // Add initial processing message
    setMessages([{
      type: 'system',
      content: `📄 Processing "${selectedFile.name}"... Please wait while we analyze your PDF and prepare it for chat.`,
      timestamp: new Date().toISOString(),
      isProcessing: true
    }]);

    // Upload and process the file
    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      console.log('File processed successfully:', result);
      
      // Update with success message
      setMessages([{
        type: 'system',
        content: `✅ PDF "${selectedFile.name}" has been successfully processed! 
        
📊 Document Summary:
• ${result.totalPages} pages processed
• ${result.chunksCreated} text sections created
• Search method: ${result.searchMethod || 'Semantic + Keyword'}
${result.warning ? `⚠️ ${result.warning}` : ''}

You can now start asking questions about your document's content.`,
        timestamp: new Date().toISOString(),
        isProcessing: false
      }]);
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Update with error message
      setMessages([{
        type: 'system',
        content: `❌ Failed to process PDF: ${error.message}
        
Please try:
• Uploading a smaller PDF file
• Checking your internet connection  
• Refreshing the page and trying again

If the problem persists, the PDF might be too large or corrupted.`,
        timestamp: new Date().toISOString(),
        isProcessing: false,
        isError: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !file) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          fileName: file.name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const result = await response.json();
      
      const botMessage = {
        type: 'bot',
        content: result.response,
        citations: result.citations || [],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (pageNumber) => {
    if (pdfViewerRef.current) {
      // This would work with a more advanced PDF viewer like react-pdf
      console.log(`Navigate to page ${pageNumber}`);
      // For now, we'll just scroll to the PDF viewer
      pdfViewerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <FileText size={24} />
            <span>PDF Reader</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-container">
          {/* PDF Upload Section */}
          {!file && (
            <div className="upload-section">
              <div className="upload-card">
                <Upload size={48} className="upload-icon" />
                <h2>Upload a PDF to get started</h2>
                <p>Upload your PDF document and start asking questions about its content</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="file-input"
                />
                <button
                  className="upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader size={20} className="spinning" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Choose PDF File
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Main Interface */}
          {file && (
            <div className="main-interface">
              {/* PDF Viewer Section */}
              <div className="pdf-section">
                <div className="pdf-header">
                  <FileText size={20} />
                  <span>{file.name}</span>
                  <button
                    className="change-file-btn"
                    onClick={() => {
                      setFile(null);
                      setFileUrl(null);
                      setMessages([]);
                      URL.revokeObjectURL(fileUrl);
                    }}
                  >
                    Change File
                  </button>
                </div>
                <div className="pdf-viewer" ref={pdfViewerRef}>
                  {fileUrl && (
                    <iframe
                      src={fileUrl}
                      width="100%"
                      height="100%"
                      title="PDF Viewer"
                      className="pdf-iframe"
                    />
                  )}
                </div>
              </div>

              {/* Chat Section */}
              <div className="chat-section">
                <div className="chat-header">
                  <MessageCircle size={20} />
                  <span>Ask questions about your PDF</span>
                </div>
                
                <div className="messages-container">
                  {messages.map((message, index) => (
                    <div key={index} className={`message ${message.type} ${message.isError ? 'error' : ''} ${message.isProcessing ? 'processing' : ''}`}>
                      <div className="message-content">
                        {message.isProcessing && (
                          <div className="processing-indicator">
                            <Loader size={16} className="spinning" />
                            <span className="processing-text">Processing...</span>
                          </div>
                        )}
                        <p className={message.isProcessing ? 'processing-message' : ''}>{message.content}</p>
                        {message.citations && message.citations.length > 0 && (
                          <div className="citations">
                            <span className="citations-label">Sources:</span>
                            {message.citations.map((citation, idx) => (
                              <button
                                key={idx}
                                className="citation-btn"
                                onClick={() => handleCitationClick(citation.page)}
                              >
                                <ExternalLink size={12} />
                                Page {citation.page}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: true})}
                      </span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message bot loading">
                      <div className="message-content">
                        <Loader size={20} className="spinning" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                  <div className="chat-input-wrapper">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isProcessing ? "Please wait while your PDF is being processed..." : "Ask anything about your PDF..."}
                      className="chat-input"
                      rows={1}
                      disabled={isLoading || isProcessing}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading || isProcessing}
                      className="send-button"
                      title={isProcessing ? "Please wait while your PDF is being processed" : "Send message"}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;