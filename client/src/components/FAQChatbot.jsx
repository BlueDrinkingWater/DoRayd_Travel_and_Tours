import React, { useState, useEffect } from 'react';

const FAQChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const faqData = [
    {
      keywords: ['booking', 'reserve', 'book'],
      response: 'To make a booking, select your preferred service, choose dates, and submit your details. You can book with or without creating an account.'
    },
    {
      keywords: ['payment', 'pay', 'cost'],
      response: 'We accept various payment methods. Upload your payment receipt during booking, and our admin will verify it before confirmation.'
    },
    {
      keywords: ['cancel', 'refund'],
      response: 'Cancellation policies vary by service. Please contact our admin for specific cancellation and refund information.'
    }
  ];

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);

    // Simple keyword matching
    const response = findResponse(inputValue.toLowerCase());
    const botMessage = { type: 'bot', text: response };
    
    setTimeout(() => {
      setMessages(prev => [...prev, botMessage]);
    }, 500);

    setInputValue('');
  };

  const findResponse = (input) => {
    for (const faq of faqData) {
      if (faq.keywords.some(keyword => input.includes(keyword))) {
        return faq.response;
      }
    }
    return "I'm sorry, I don't have information about that. Please contact our support team for assistance.";
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50"
      >
        💬
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl z-50 flex flex-col">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">FAQ Assistant</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-2 rounded ${
                  msg.type === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a question..."
                className="flex-1 border rounded-l px-3 py-2"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
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