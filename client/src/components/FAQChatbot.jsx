import React, { useState, useEffect, useRef } from 'react';
import DataService from './services/DataService';

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const FAQChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [faqData, setFaqData] = useState([]);
  const [predefinedQuestions, setPredefinedQuestions] = useState([]);
  const messagesEndRef = useRef(null);
  const [isLoadingFAQs, setIsLoadingFAQs] = useState(false);
  const [faqError, setFaqError] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchFAQs = async () => {
      setIsLoadingFAQs(true);
      setFaqError(null);
      setPredefinedQuestions([]); 

      try {
        const response = await DataService.fetchAllFaqs();
        if (response.success) {
          setFaqData(response.data);
          
          const featured = response.data
            .filter(faq => faq.isFeatured)
            .map(faq => ({ question: faq.question, answer: faq.answer }));
          
          setPredefinedQuestions(featured);
        } else {
          setFaqError("Failed to load FAQs.");
        }
      } catch (error) {
        console.error("Failed to fetch FAQs for chatbot:", error);
        setFaqError("Sorry, the FAQ assistant is unavailable right now.");
      } finally {
        setIsLoadingFAQs(false);
      }
    };
    
    if (isOpen) {
        fetchFAQs();
    }
  }, [isOpen]); 

  useEffect(() => {
    if (isOpen) {
      setMessages([{
        type: 'bot',
        text: "Hello! I'm the FAQ assistant. How can I help you today? You can ask me about bookings, payments, cars, or tours."
      }]);
    } else {
      setMessages([]);
      setFaqError(null);
    }
  }, [isOpen]);

  const findResponse = (input) => {
    const stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'what\'s']);
    const processText = (text) => 
      text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word && !stopWords.has(word));
    const inputTokens = processText(input);
    if (inputTokens.length === 0) {
      return "Please ask a more specific question.";
    }
    let bestMatch = { 
        score: 0, 
        answer: "I'm sorry, I can't find an answer to that. You can try rephrasing your question, or visit our Contact page for more assistance." 
    };
    faqData.forEach(faq => {
        let score = 0;
        const questionTokens = processText(faq.question);
        const keywordTokens = faq.keywords.flatMap(kw => processText(kw));
        inputTokens.forEach(token => {
            if (keywordTokens.includes(token)) {
                score += 2;
            }
            if (questionTokens.includes(token)) {
                score += 1;
            }
        });
        if (score > 1) {
          score += inputTokens.filter(token => questionTokens.includes(token) || keywordTokens.includes(token)).length;
        }
        if (score > bestMatch.score) {
            bestMatch = { score: score, answer: faq.answer };
        }
    });
    if (bestMatch.score >= 2) { 
        return bestMatch.answer;
    }
    return bestMatch.answer;
  };

  const handleSendMessage = (message) => {
    const text = message || inputValue;
    if (!text.trim()) return;
    const userMessage = { type: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    const response = findResponse(text);
    const botMessage = { type: 'bot', text: response };
    setTimeout(() => {
      setMessages(prev => [...prev, botMessage]);
    }, 500);
    setInputValue('');
  };

  const handlePredefinedClick = (faq) => {
    const userMessage = { type: 'user', text: faq.question };
    const botMessage = { type: 'bot', text: faq.answer };
    setMessages(prev => [...prev, userMessage, botMessage]);
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50 transition-all duration-300 ease-in-out transform hover:scale-110"
        aria-label="Open FAQ Assistant"
      >
        <ChatIcon />
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
          
          <div className="bg-blue-600 text-white p-5 rounded-t-2xl flex justify-between items-center shadow-sm">
            {}
            <h3 className="font-semibold text-lg">FAQ Assistant</h3>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.type === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-lg' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-lg'
                }`}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                </div>
              </div>
            ))}
            
            <div className="space-y-3 pt-2">
              {isLoadingFAQs && (
                   <p className="text-xs text-gray-400 text-center">Loading common questions...</p>
              )}
              
              {faqError && (
                   <p className="text-xs text-red-500 text-center">{faqError}</p>
              )}

              {!isLoadingFAQs && !faqError && predefinedQuestions.length > 0 && (
                <>
                  <p className="text-sm text-gray-500 text-center">Here are some common questions:</p>
                  
                  {}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {predefinedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handlePredefinedClick(q)} 
                        className="px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium shadow-sm hover:bg-blue-100 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {q.question}
                      </button>
                    ))}
                  </div>
                  {}
                </>
              )}
              
              {!isLoadingFAQs && !faqError && predefinedQuestions.length === 0 && messages.length <= 1 && (
                   <p className="text-xs text-gray-400 text-center">No common questions found.</p>
              )}
            </div>
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t border-gray-100 bg-white">
            {}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a question..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FAQChatbot;