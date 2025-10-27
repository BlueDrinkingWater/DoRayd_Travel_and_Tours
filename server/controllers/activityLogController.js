import ActivityLog from '../models/ActivityLog.js';

export const createActivityLog = async (employeeId, action, details, link) => { // <-- Added 'link' parameter
  try {
    const newLog = new ActivityLog({
      employee: employeeId,
      action,
      details,
      link // <-- Save the link
    });
    await newLog.save();
    return newLog;
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

export const getActivityLogs = async (req, res) => {
  try {
    // --- MODIFICATION: Get user role and ID ---
    const { role, id } = req.user;

    // --- MODIFICATION: Create dynamic query ---
    const query = {};
    if (role === 'employee') {
      query.employee = id; // Filter by employee's own ID
    }
    // If role is 'admin', query remains empty {} to fetch all

    // --- MODIFICATION: Use the dynamic query ---
    const logs = await ActivityLog.find(query) 
      .populate('employee', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20);
      
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};