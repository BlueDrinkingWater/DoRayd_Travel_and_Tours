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
    const logs = await ActivityLog.find().populate('employee', 'firstName lastName').sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};