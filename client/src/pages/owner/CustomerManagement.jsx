import React, { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';
import DataService from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';

const CustomerManagement = () => {
  const { data: customersData, loading, refetch: fetchCustomers } = useApi(DataService.fetchAllCustomers);
  const customers = customersData?.data || [];
  
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenModal = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
    setNewPassword('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      alert('Please enter a new password.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await DataService.resetCustomerPassword(selectedCustomer._id, newPassword);
      if (response.success) {
        alert('Password reset successfully!');
        setShowModal(false);
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      alert('An error occurred while resetting the password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading customers...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Customer Management</h2>
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map(customer => (
              <tr key={customer._id}>
                <td className="px-6 py-4 whitespace-nowrap">{customer.firstName} {customer.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.phone || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button onClick={() => handleOpenModal(customer)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                    <Key size={16} /> Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Reset Password</h3>
              <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <p className="text-sm mb-4">Resetting password for: <strong>{selectedCustomer.email}</strong></p>
            <form onSubmit={handleResetPassword}>
              <label className="block text-sm font-medium">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border rounded mt-1"
                required
              />
              <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;