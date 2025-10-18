import React, { useState, useEffect, useRef } from 'react';
import DataService from './services/DataService';

const FAQChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [faqData, setFaqData] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await DataService.fetchAllFaqs();
        if (response.success) {
          setFaqData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch FAQs for chatbot:", error);
      }
    };
    fetchFAQs();
  }, []);

  // Add a welcome message when the chat opens
  useEffect(() => {
    if (isOpen) {
      setMessages([{
        type: 'bot',
        text: "Hello! I'm the FAQ assistant. How can I help you today? You can ask me about bookings, payments, cars, or tours."
      }]);
    }
  }, [isOpen]);

  const findResponse = (input) => {
    // A list of common "stop words" to ignore
    const stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'what\'s']);

    // Function to process text into meaningful tokens
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

    // Score each FAQ based on the user's input
    faqData.forEach(faq => {
        let score = 0;
        const questionTokens = processText(faq.question);
        const keywordTokens = faq.keywords.flatMap(kw => processText(kw));

        inputTokens.forEach(token => {
            if (keywordTokens.includes(token)) {
                score += 2; // Higher weight for matching a keyword
            }
            if (questionTokens.includes(token)) {
                score += 1; // Lower weight for matching a word in the question
            }
        });

        // Bonus for matching multiple tokens
        if (score > 1) {
          score += inputTokens.filter(token => questionTokens.includes(token) || keywordTokens.includes(token)).length;
        }

        if (score > bestMatch.score) {
            bestMatch = { score: score, answer: faq.answer };
        }
    });

    // Only return a match if the score is above a certain threshold (e.g., 2)
    if (bestMatch.score >= 2) { 
        return bestMatch.answer;
    }

    return bestMatch.answer; // Return the default message
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: 'user', text: inputValue };
    
    setMessages(prev => [...prev, userMessage]);

    const response = findResponse(inputValue);
    const botMessage = { type: 'bot', text: response };
    
    setTimeout(() => {
      setMessages(prev => [...prev, botMessage]);
    }, 500);

    setInputValue('');
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50 transition-transform hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1Zm0 0a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Zm-1-2a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Zm0 0a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1ZM7 8a.5.5 0 0 0 1 0v1a.5.5 0 0 0-1 0v-1Zm0 0a.5.5 0 0 0-1 0v-1a.5.5 0 0 0 1 0v1Zm2 2a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1Zm0 0a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Z"/></svg>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-[28rem] bg-white rounded-xl shadow-2xl z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-blue-600 text-white p-4 rounded-t-xl flex justify-between items-center">
            <h3 className="font-semibold">FAQ Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full">&times;</button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  msg.type === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a question..."
                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FAQChatbot;