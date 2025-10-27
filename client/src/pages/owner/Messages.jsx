import React, { useState, useMemo, useEffect } from 'react';
import { useApi } from '../../hooks/useApi.jsx';
import DataService from '../../components/services/DataService.jsx';
import { Mail, Send, Inbox, Edit, Trash2, X, AlertOctagon, Archive, Search, Paperclip } from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import { useSocket } from '../../hooks/useSocket.jsx';
import { useSecureImage } from '../../hooks/useSecureImage.jsx';
import { useNavigate } from 'react-router-dom';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadge = (status) => {
  const config = {
    new: 'bg-red-100 text-red-800',
    read: 'bg-blue-100 text-blue-800',
    replied: 'bg-green-100 text-green-800',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config[status]}`}>{status}</span>;
};

const SecureAttachmentLink = ({ attachmentPath, originalName }) => {
    const { secureUrl, loading } = useSecureImage(attachmentPath);

    if (loading) return <span className="text-xs text-gray-500 italic">Loading attachment...</span>;
    if (!secureUrl) return <span className="text-xs text-red-500 italic">Error loading attachment</span>;

    return (
        <a
            href={secureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
            download={originalName}
        >
            <Paperclip size={14} /> {originalName || 'View Attachment'}
        </a>
    );
};

const Messages = () => {
  const [filter, setFilter] = useState('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // --- THIS IS THE FIX ---
  // Changed DataService.fetchAllMessages to DataService.getAllMessages
  const { data: messagesData, loading, error, refetch: fetchMessages } = useApi(
    () => DataService.getAllMessages({ status: filter, search: searchTerm }),
    [filter, searchTerm]
  );
  // --- END OF FIX ---

  const messages = messagesData?.data || [];

  useEffect(() => {
    if (socket) {
      const handleNewMessageNotification = (notification) => {
        console.log('Notification possibly related to messages received:', notification);
        fetchMessages(); // This will now call the correct function
      };

      socket.on('notification', handleNewMessageNotification);

      return () => {
        if (socket) {
          socket.off('notification', handleNewMessageNotification);
        }
      };
    }
  }, [socket, fetchMessages]);

  const handleSelectMessage = async (message) => {
    try {
      setSelectedMessage(message);
      setReplyMessage('');
      setAttachment(null);

      if (message.status === 'new') {
        try {
          await DataService.updateMessageStatus(message._id, 'read');
          fetchMessages();
        } catch (statusUpdateError) {
          console.error("Failed to mark message as read:", statusUpdateError);
        }
      }

    } catch (err) {
      console.error('Error selecting message:', err);
    }
  };


  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedMessage) return;

    setIsReplying(true);
    try {
      const formData = new FormData();
      formData.append('replyMessage', replyMessage.trim());
      if (attachment) {
        formData.append('attachment', attachment);
      }

      // --- FIX: Pass FormData directly to DataService.replyToMessage ---
      const response = await DataService.replyToMessage(selectedMessage._id, formData);
      // --- END FIX ---

      if (response.success) {
        setSelectedMessage(response.data);
        setReplyMessage('');
        setAttachment(null);
        fetchMessages();
      } else {
        throw new Error(response.message || 'Failed to send reply.');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert(`Error sending reply: ${err.message}`);
    } finally {
      setIsReplying(false);
    }
  };


  const handleDelete = async (messageId) => {
    try {
        const response = await DataService.deleteMessage(messageId);
        if (response.success) {
            setShowDeleteModal(null);
            setSelectedMessage(null);
            fetchMessages();
            alert('Message deleted successfully.');
        } else {
            throw new Error(response.message || 'Failed to delete message.');
        }
    } catch (err) {
        console.error('Error deleting message:', err);
        alert(`Error deleting message: ${err.message}`);
    }
  };


  const filteredMessages = messages;

  const stats = useMemo(() => {
    const all = messagesData?.data || [];
    return {
      new: all.filter(m => m.status === 'new').length,
      read: all.filter(m => m.status === 'read').length,
      replied: all.filter(m => m.status === 'replied').length,
    };
  }, [messagesData]);


  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Sidebar / Message List */}
      <div className="w-full md:w-1/3 xl:w-1/4 bg-white border-r border-gray-200 flex flex-col">
        {/* Header and Filter */}
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <FilterButton label="New" count={stats.new} active={filter === 'new'} onClick={() => setFilter('new')} />
            <FilterButton label="Read" count={stats.read} active={filter === 'read'} onClick={() => setFilter('read')} />
            <FilterButton label="Replied" count={stats.replied} active={filter === 'replied'} onClick={() => setFilter('replied')} />
          </div>
        </div>

        {/* Message List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No messages found.</div>
          ) : (
            <div>
              {filteredMessages.map((message) => (
                <MessageItem
                  key={message._id}
                  message={message}
                  isSelected={selectedMessage?._id === message._id}
                  onSelect={() => handleSelectMessage(message)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Detail View */}
      <div className="hidden md:flex flex-1 flex-col bg-gray-50">
        {selectedMessage ? (
          <div className="flex flex-col h-full">
            {/* Detail Header */}
            <div className="p-6 border-b bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">{selectedMessage.subject}</h2>
                <button
                  onClick={() => setShowDeleteModal(selectedMessage._id)}
                  className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
                  aria-label="Delete message"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-shrink-0">
                  <span className="font-semibold text-gray-800">{selectedMessage.name}</span>
                  <span className="text-gray-600 text-sm"> &lt;{selectedMessage.email}&gt;</span>
                </div>
                <div className="text-sm text-gray-500">{formatDate(selectedMessage.createdAt)}</div>
                {getStatusBadge(selectedMessage.status)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Phone: {selectedMessage.phone}</p>
            </div>

            {/* Message Body and Replies */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Original Message */}
              <div className="bg-white rounded-lg p-5 border shadow-sm">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Original Message:</h4>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </p>
              </div>

              {/* Admin Replies */}
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Admin Replies:</h5>
                  {selectedMessage.replies.map((reply, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 mb-4">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {reply.message}
                      </p>
                      {reply.attachment && (
                        <div className="mt-3">
                          <SecureAttachmentLink
                            attachmentPath={reply.attachment}
                            originalName={reply.attachmentOriginalName}
                          />
                        </div>
                      )}
                      <div className="mt-3 text-sm text-gray-600">
                        Replied by {reply.repliedBy?.firstName || 'Admin'} on {formatDate(reply.repliedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Form */}
            <div className="p-6 border-t bg-white">
              <form onSubmit={handleReplySubmit}>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows="4"
                  placeholder="Type your reply..."
                  required
                />
                <div className="flex justify-between items-center mt-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <Paperclip size={16} />
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setAttachment(e.target.files[0])}
                      />
                      <span>{attachment ? attachment.name : 'Attach file'}</span>
                      {attachment && (
                        <button type="button" onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      )}
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={isReplying}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    <Send size={16} />
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Inbox size={64} className="mx-auto text-gray-400" />
              <p className="mt-2">Select a message to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3">
              <AlertOctagon className="text-red-500" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Delete Message</h3>
            </div>
            <p className="text-gray-600 mt-4">Are you sure you want to permanently delete this message?</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

const FilterButton = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    <div className="flex items-center justify-center gap-2">
      <span>{label}</span>
      {count > 0 && (
        <span className={`px-2 rounded-full text-xs ${active ? 'bg-white text-blue-600' : 'bg-gray-300 text-gray-700'}`}>
          {count}
        </span>
      )}
    </div>
  </button>
);

const MessageItem = ({ message, isSelected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
      isSelected ? 'bg-blue-50' : ''
    } ${message.status === 'new' ? 'font-bold' : 'font-medium'}`}
  >
    <div className="flex justify-between items-center">
      <span className="text-gray-900 truncate">{message.name}</span>
      <span className={`text-xs ${message.status === 'new' ? 'text-red-600' : 'text-gray-500'}`}>
        {formatDate(message.createdAt).split(',')[0]}
      </span>
    </div>
    <p className={`text-sm truncate ${message.status === 'new' ? 'text-gray-800' : 'text-gray-600'}`}>
      {message.subject}
    </p>
    <p className={`text-sm truncate ${message.status === 'new' ? 'text-gray-600' : 'text-gray-500'}`}>
      {message.message}
    </p>
    <div className="mt-2">
      {getStatusBadge(message.status)}
    </div>
  </button>
);

export default Messages;