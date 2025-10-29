// server/utils/emailServices.js
import { Resend } from 'resend';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import axios from 'axios';

dotenv.config();

// --- UPDATE: Add your public image URL here ---
const EMAIL_BACKGROUND_URL = 'https://res.cloudinary.com/dvzpybjjw/image/upload/v1760891076/dorayd/content/qdrqzwfxr9ukryxdtipp.jpg';

/**
 * Creates a full HTML email template with a background image.
 * @param {string} subject - The subject of the email.
 * @param {string} content - The HTML content for the body of the email.
 * @returns {string} - The full HTML for the email.
 */
const createEmailTemplate = (subject, content) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px;">
                <tr>
                  <td align="center" background="${EMAIL_BACKGROUND_URL}" bgcolor="#2196F3" style="padding: 40px 0; background-image: url(${EMAIL_BACKGROUND_URL}); background-size: cover; background-position: center;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="background-color: rgba(0, 0, 0, 0.5); padding: 10px 20px; border-radius: 8px; display: inline-block;">
                            <h1 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 28px; margin: 0;">DoRayd Travel & Tours</h1>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#ffffff" style="padding: 40px 30px;">
                    <div style="color: #333333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
                      ${content}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#333333" style="padding: 30px 30px;">
                    <p style="color: #cccccc; font-family: Arial, sans-serif; font-size: 12px; text-align: center; margin: 0;">
                      &copy; ${new Date().getFullYear()} DoRayd Travel & Tours. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};


class EmailService {
  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.isInitialized = true;
      console.log('✅ Resend email service initialized.');
    } else {
      this.isInitialized = false;
      console.error('❌ RESEND_API_KEY not found in environment variables. Email service is disabled.');
    }
    this.fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  }

  async sendEmail(mailOptions) {
    if (!this.isInitialized) {
      const errorMessage = 'Email service is not configured because RESEND_API_KEY is missing.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      await this.resend.emails.send(mailOptions);
      console.log('✅ Email sent successfully to:', mailOptions.to);
    } catch (error) {
      console.error('❌ Failed to send email via Resend:', error);
      throw error;
    }
  }

  async sendPasswordReset(email, resetUrl) {
    const subject = 'Password Reset Request';
    const content = `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the button below to create a new password. This link is valid for 10 minutes.</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: email,
      subject: subject,
      html: createEmailTemplate(subject, content),
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Password reset email sent successfully' };
  }

  async sendBookingConfirmation(booking) {
    const subject = `Booking Received: ${booking.bookingReference}`;
    const content = `
      <h1>Booking Received</h1>
      <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
      <p>We have received your booking request and it is currently under review. You will receive another email once your booking is confirmed.</p>
      <p>Thank you for choosing DoRayd Travel & Tours!</p>
    `;

    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking confirmation email sent successfully' };
  }

  // --- MODIFIED FUNCTION ---
  async sendStatusUpdate(booking) {
    // Using switch for clarity
    switch (booking.status) {
      case 'confirmed':
        return this.sendBookingApproval(booking);
      case 'rejected':
        return this.sendBookingRejection(booking);
      case 'fully_paid':
        return this.sendBookingFullyPaid(booking); // ADDED
      case 'completed':
        return this.sendBookingCompleted(booking); // ADDED
      case 'cancelled':
        return this.sendBookingCancellation(booking); // ADDED
      default:
        console.warn(`No email handler for status: ${booking.status}`);
        return;
    }
  }

  async sendBookingApproval(booking) {
    const subject = `Booking Approved: ${booking.bookingReference}`;
    const content = `
      <h1 style="color: #4CAF50;">Booking Approved</h1>
      <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
      <p>Great news! Your booking has been approved and confirmed. We look forward to serving you.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <h3 style="margin-top: 0;">Booking Summary</h3>
        <p><strong>Reference:</strong> ${booking.bookingReference}</p>
        <p><strong>Service:</strong> ${booking.itemName}</p>
        <p><strong>Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
        <p><strong>Total Price:</strong> PHP ${booking.totalPrice.toLocaleString()}</p>
      </div>
      ${booking.notes && booking.notes.length > 0 ? `<p style="margin-top: 15px;"><strong>A note from our team:</strong> ${booking.notes[booking.notes.length - 1].note}</p>` : ''}
    `;

    let attachments = [];
    if (booking.notes && booking.notes.length > 0) {
      const lastNote = booking.notes[booking.notes.length - 1];
      if (lastNote.attachment) {
        try {
          const response = await axios.get(lastNote.attachment, { responseType: 'arraybuffer' });
          attachments.push({
            filename: lastNote.attachmentOriginalName,
            content: Buffer.from(response.data),
          });
        } catch (error) {
          console.error("Failed to fetch attachment for email:", error);
        }
      }
    }

    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
      attachments,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking approval email sent successfully' };
  }

  async sendBookingRejection(booking) {
    const subject = `Booking Status Update: ${booking.bookingReference}`;
    const content = `
      <h1 style="color: #f44336;">Booking Rejected</h1>
      <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
      <p>We regret to inform you that your booking request could not be approved at this time.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <h3 style="margin-top: 0;">Booking Summary</h3>
        <p><strong>Reference:</strong> ${booking.bookingReference}</p>
        <p><strong>Service:</strong> ${booking.itemName}</p>
        <p><strong>Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
      </div>
      ${booking.notes && booking.notes.length > 0 ? `<p style="margin-top: 15px;"><strong>Reason:</strong> ${booking.notes[booking.notes.length - 1].note}</p>` : ''}
      <p>We appreciate your understanding and hope to serve you in the future.</p>
    `;

    let attachments = [];
    if (booking.notes && booking.notes.length > 0) {
      const lastNote = booking.notes[booking.notes.length - 1];
      if (lastNote.attachment) {
        try {
          const response = await axios.get(lastNote.attachment, { responseType: 'arraybuffer' });
          attachments.push({
            filename: lastNote.attachmentOriginalName,
            content: Buffer.from(response.data),
          });
        } catch (error) {
          console.error("Failed to fetch attachment for email:", error);
        }
      }
    }

    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
      attachments,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking rejection email sent successfully' };
  }

  // --- ADDED FUNCTION ---
  async sendBookingFullyPaid(booking) {
    const subject = `Payment Received: ${booking.bookingReference}`;
    const content = `
      <h1 style="color: #4CAF50;">Payment Received</h1>
      <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
      <p>We have received your full payment for booking ${booking.bookingReference}. Your booking is now fully paid.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <h3 style="margin-top: 0;">Booking Summary</h3>
        <p><strong>Reference:</strong> ${booking.bookingReference}</p>
        <p><strong>Service:</strong> ${booking.itemName}</p>
        <p><strong>Total Price:</strong> PHP ${booking.totalPrice.toLocaleString()}</p>
      </div>
    `;
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking fully paid email sent' };
  }

  // --- ADDED FUNCTION ---
  async sendBookingCompleted(booking) {
    const subject = `Booking Completed: ${booking.bookingReference}`;
    const content = `
      <h1 style="color: #007bff;">Booking Completed</h1>
      <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
      <p>Your booking (Ref: ${booking.bookingReference}) has been marked as completed. We hope you enjoyed our service!</p>
      <p>We would love to hear your feedback. Please feel free to leave us a review.</p>
    `;
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking completed email sent' };
  }

  async sendBookingCancellation(booking) {
    const subject = `Booking Cancellation: ${booking.bookingReference}`;
    const content = `
      <h1 style="color: #9E9E9E;">Booking Cancelled</h1>
      <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
      <p>This email is to confirm that your booking (Ref: ${booking.bookingReference}) has been cancelled.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <h3 style="margin-top: 0;">Booking Summary</h3>
        <p><strong>Reference:</strong> ${booking.bookingReference}</p>
        <p><strong>Service:</strong> ${booking.itemName}</p>
        <p><strong>Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
      </div>
      ${booking.notes && booking.notes.length > 0 ? `<p style="margin-top: 15px;"><strong>Notes:</strong> ${booking.notes[booking.notes.length - 1].note}</p>` : ''}
    `;

    let attachments = [];
    if (booking.notes && booking.notes.length > 0) {
      const lastNote = booking.notes[booking.notes.length - 1];
      if (lastNote.attachment) {
        try {
          const response = await axios.get(lastNote.attachment, { responseType: 'arraybuffer' });
          attachments.push({
            filename: lastNote.attachmentOriginalName,
            content: Buffer.from(response.data),
          });
        } catch (error) {
          console.error("Failed to fetch attachment for email:", error);
        }
      }
    }
    
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
      attachments,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking cancellation email sent' };
  }

  async sendContactReply(message, replyMessage, attachments = []) {
    const subject = `Re: ${message.subject}`;
    const content = `
      <p>Dear ${message.name},</p>
      <p>Thank you for contacting us. Here is our response to your inquiry:</p>
      <blockquote style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
        ${replyMessage}
      </blockquote>
      <p>Best regards,<br>DoRayd Travel & Tours Team</p>
    `;
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: message.email,
      subject: subject,
      html: createEmailTemplate(subject, content),
      attachments: await Promise.all(
        attachments.map(async (file) => ({
          filename: file.filename,
          content: await fs.readFile(file.path),
        }))
      ),
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Contact reply email sent successfully' };
  }
}

export default new EmailService();