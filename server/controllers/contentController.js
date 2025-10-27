import Content from "../models/Content.js";
import { createNotification } from "./notificationController.js";
import { createActivityLog } from "./activityLogController.js";

// 洶 Get all unique content types
export const getAllContentTypes = async (req, res) => {
  try {
    const contentTypes = await Content.distinct("type");
    res.json({ success: true, data: contentTypes });
  } catch (error) {
    console.error("Error fetching content types:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 洶 Get content by its type (creates default if not existing)
export const getContentByType = async (req, res) => {
  const { type } = req.params;

  try {
    const defaultTitle =
      type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, " $1");

    // Atomically find or create the document to prevent race conditions
    const content = await Content.findOneAndUpdate(
      { type },
      { $setOnInsert: { type, title: defaultTitle, content: "" } },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json({ success: true, data: content });
  } catch (error) {
    console.error(`Error in getContentByType for type "${type}":`, error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 洶 Update content by its type
export const updateContent = async (req, res) => {
  const { type } = req.params;
  const { title, content } = req.body;

  try {
    // Update or create if not existing
    const contentDoc = await Content.findOneAndUpdate(
      { type },
      { title, content },
      { new: true, upsert: true, runValidators: true }
    );

    // 粕 Real-time activity + notification for admins
    const io = req.app.get("io");
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === "employee") {
      const message = `Employee ${req.user.firstName} updated the '${type}' content.`;
      const link = "/owner/content-management";

      const newLog = await createActivityLog(
        req.user.id,
        "UPDATE_CONTENT",
        `Content: ${type}`,
        link
      );
      if (newLog) io.to("admin").emit("activity-log-update", newLog); // Emit log only if created

      const notifications = await createNotification(
        { roles: ["admin"], module: "content" },
        message,
        { admin: link }
      );
      if (notifications && notifications.length > 0) {
        io.to("admin").emit("notification", notifications[0]);
      }
    }
    // *** END MODIFICATION ***

    res.json({
      success: true,
      message: "Content updated successfully",
      data: contentDoc,
    });
  } catch (error) {
    console.error(`Error updating content "${type}":`, error);
    res.status(400).json({ success: false, message: error.message });
  }
};