// client/src/pages/owner/EmployeeManagement.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Key, Shield, Briefcase } from 'lucide-react';
import DataService from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';
const permissionModules = ['bookings', 'cars', 'tours', 'transport', 'messages', 'reports', 'content', 'promotions', 'faqs', 'feedback', 'reviews', 'refunds'];

const EmployeeManagement = () => {
  const { data: employeesData, loading, refetch: fetchEmployees } = useApi(DataService.fetchAllEmployees);
  const employees = employeesData?.data || [];
  
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    role: 'employee',
    permissions: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handlePermissionChange = (e) => {
    const { name, checked } = e.target;
    let newPermissions = [...formData.permissions];

    if (checked) {
      if (!newPermissions.some(p => p.module === name)) {
        newPermissions.push({ module: name, access: 'full' });
      }
    } else {
      newPermissions = newPermissions.filter(p => p.module !== name);
    }
    setFormData({ ...formData, permissions: newPermissions });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let response;
      if (editingEmployee) {
        const { password, ...updateData } = formData;
        const dataToSend = password ? formData : updateData;
        response = await DataService.updateEmployee(editingEmployee._id, dataToSend);
      } else {
        response = await DataService.createEmployee(formData);
      }
      if (response.success) {
        alert(editingEmployee ? 'Employee updated successfully!' : 'Employee created successfully!');
        setShowModal(false);
        fetchEmployees();
      } else {
        throw new Error(response.message || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error("Failed to save employee:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    const employeeData = {
      ...initialFormState,
      ...employee,
      permissions: employee.permissions || []
    };
    setFormData({ ...employeeData, password: '' });
    setShowModal(true);
  };
  
  const handleDelete = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const response = await DataService.deleteEmployee(employeeId);
        if (response.success) {
          alert('Employee deleted successfully!');
          fetchEmployees(); 
        } else {
          throw new Error(response.message || 'Failed to delete employee.');
        }
      } catch (error) {
        console.error('Delete employee error:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Employee Management</h2>
        <button onClick={() => { setEditingEmployee(null); setFormData(initialFormState); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
          <Plus size={20} className="mr-2"/> Add Employee
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full">
            <thead className="bg-gray-100">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {loading ? <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr> : employees && employees.map(emp => (
                    <tr key={emp._id}>
                        <td className="px-6 py-4 whitespace-nowrap">{emp.firstName} {emp.lastName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{emp.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${emp.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {emp.role}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowGrap text-xs text-gray-500">
                          {emp.permissions?.map(p => p.module).join(', ') || 'None'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                           <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-900"><Edit3/></button>
                           <button onClick={() => handleDelete(emp._id)} className="text-red-600 hover:text-red-900"><Trash2/></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                  <h3 className="text-xl font-bold mb-4">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name" required className="w-full p-2 border rounded"/>
                      <input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name" required className="w-full p-2 border rounded"/>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required className="w-full p-2 border rounded"/>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder={editingEmployee ? "New Password (optional)" : "Password"} required={!editingEmployee} className="w-full p-2 border rounded"/>
                       <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input name="position" value={formData.position} onChange={handleInputChange} placeholder="Position (e.g., Booking Manager)" required className="w-full p-2 pl-10 border rounded"/>
                       </div>
                       <div className="relative">
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 pl-10 border rounded appearance-none">
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                      <div className="border p-4 rounded">
                          <h4 className="font-semibold mb-2">Permissions</h4>
                          <div className="grid grid-cols-2 gap-2">
                              {permissionModules.map(module => (
                                  <label key={module} className="flex items-center space-x-2 text-sm">
                                      <input
                                        type="checkbox"
                                        name={module}
                                        checked={formData.permissions.some(p => p.module === module)}
                                        onChange={handlePermissionChange}
                                      />
                                      <span className="capitalize">{module}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end space-x-4">
                          <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">{submitting ? 'Saving...' : 'Save'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default EmployeeManagement;