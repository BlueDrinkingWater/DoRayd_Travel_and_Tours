import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, Trash2, Reply, Star, Archive, Search, Filter, Clock, User, Send, X, Paperclip } from 'lucide-react';
import DataService from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';

const Messages = () => {
  const { data: messagesData, loading, error, refetch: fetchMessages } = useApi(DataService.fetchAllMessages);
  const messages = messagesData?.data || [];
  
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);

  const handleMarkAsRead = async (messageId) => {
    try {
      await DataService.updateMessageStatus(messageId, 'read');
      fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      alert('Please enter a reply message');
      return;
    }

    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('replyMessage', replyContent);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      await DataService.replyToMessage(selectedMessage._id, formData);
      alert('Reply sent successfully!');
      setShowReplyModal(false);
      setReplyContent('');
      setAttachment(null);
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const selectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.read) {
      handleMarkAsRead(message._id);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'read' && message.read) ||
      (filterStatus === 'unread' && !message.read) ||
      (filterStatus === 'replied' && message.replied);
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Messages</h1>
          <p className="text-gray-600">
            Manage customer inquiries and messages ({unreadCount} unread)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Total: {messages.length} messages
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Messages</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
                <div className="p-4 text-red-500">{error.message}</div>
            ) : filteredMessages.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <div
                    key={message._id}
                    onClick={() => selectMessage(message)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedMessage?._id === message._id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    } ${!message.read ? 'bg-blue-25' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${!message.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {!message.read ? (
                          <Mail className="w-4 h-4 text-blue-600" />
                        ) : (
                          <MailOpen className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium truncate ${!message.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {message.name}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.createdAt).split(',')[0]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{message.email}</p>
                        {message.subject && (
                          <p className={`text-sm truncate mb-1 ${!message.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {message.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {message.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {message.replied && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Reply className="w-3 h-3 mr-1" />
                              Replied
                            </span>
                          )}
                          {!message.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Mail className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium mb-2">No messages found</p>
                <p className="text-sm">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No customer messages yet.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          {selectedMessage ? (
            <>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedMessage.name}</h3>
                      <p className="text-sm text-gray-600">{selectedMessage.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(selectedMessage.createdAt)}
                    </span>
                    {selectedMessage.replied && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Reply className="w-4 h-4 mr-1" />
                        Replied
                      </span>
                    )}
                  </div>
                </div>

                {selectedMessage.subject && (
                  <div className="mb-4">
                    <h4 className="text-lg font-medium text-gray-900">{selectedMessage.subject}</h4>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReplyModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                  <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {selectedMessage.replied && selectedMessage.replyMessage && (
                    <div className="mt-6">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Admin Reply:</h5>
                      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {selectedMessage.replyMessage}
                        </p>
                        <div className="mt-3 text-sm text-gray-600">
                          Replied on {formatDate(selectedMessage.repliedAt)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    {selectedMessage.readAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Read on {formatDate(selectedMessage.readAt)}
                      </span>
                    )}
                  </div>
                  <span>Message ID: {selectedMessage._id.slice(-8)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a message</h3>
                <p className="text-sm">Choose a message from the list to view its details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Reply to Message</h2>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Original Message</h3>
                  <div className="text-sm text-gray-700">
                    <p><strong>From:</strong> {selectedMessage.name} ({selectedMessage.email})</p>
                    {selectedMessage.subject && <p><strong>Subject:</strong> {selectedMessage.subject}</p>}
                    <p className="mt-2 italic line-clamp-3">"{selectedMessage.message}"</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Reply
                  </label>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your reply here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach File (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label htmlFor="attachment-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        <Paperclip className="w-4 h-4 inline-block mr-2"/>
                        Choose File
                    </label>
                    <input id="attachment-upload" type="file" className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
                    {attachment && <span className="text-sm text-gray-600">{attachment.name}</span>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={sendingReply || !replyContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingReply ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;