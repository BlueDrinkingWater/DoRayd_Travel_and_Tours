import { Resend } from 'resend';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();
const EMAIL_BACKGROUND_URL = 'https://res.cloudinary.com/dvzpybjjw/image/upload/s--MbQ4TCfM--/v1761882309/dorayd/payment_proofs/vd30hqzz0vnsvtq4fmhw.jpg';

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

/**
 * ✅ FIXED: Helper function to fetch attachment from Cloudinary
 * All attachments are stored as 'raw' resource type
 */
async function fetchCloudinaryAttachment(publicId, filename) {
  try {
    // Step 1: Verify the file exists on Cloudinary
    console.log(`🔍 Checking if attachment exists: ${publicId}`);
    await cloudinary.api.resource(publicId, { 
      resource_type: 'raw',  // ✅ Always 'raw' for attachments
      type: 'upload'
    });
    console.log(`✅ Attachment found: ${publicId}`);

    // Step 2: Generate signed URL
    const url = cloudinary.url(publicId, {
      resource_type: 'raw',  // ✅ Always 'raw' for attachments
      sign_url: true,
      secure: true,
      type: 'upload'
    });

    console.log(`📥 Downloading attachment from: ${url}`);

    // Step 3: Download the file
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000  // 30 second timeout
    });
    
    console.log(`✅ Downloaded ${filename} (${response.data.length} bytes)`);

    return {
      filename: filename,
      content: Buffer.from(response.data).toString('base64'),
    };
  } catch (error) {
    if (error.response) {
      console.error(`❌ Failed to fetch attachment: ${publicId}`, {
        status: error.response.status,
        statusText: error.response.statusText,
        cloudinaryError: error.response.headers['x-cld-error']
      });
    } else {
      console.error(`❌ Failed to fetch attachment: ${publicId}`, error.message);
    }
    return null;
  }
}


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
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        console.log(`📎 Sending ${mailOptions.attachments.length} attachment(s):`, 
          mailOptions.attachments.map(a => a.filename));
      }
      
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

  async sendStatusUpdate(booking) {
    switch (booking.status) {
      case 'confirmed':
        return this.sendBookingApproval(booking);
      case 'rejected':
        return this.sendBookingRejection(booking);
      case 'fully_paid':
        return this.sendBookingFullyPaid(booking); 
      case 'completed':
        return this.sendBookingCompleted(booking); 
      case 'cancelled':
        return this.sendBookingCancellation(booking); 
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
        const attachment = await fetchCloudinaryAttachment(lastNote.attachment, lastNote.attachmentOriginalName);
        if (attachment) attachments.push(attachment);
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
        const attachment = await fetchCloudinaryAttachment(lastNote.attachment, lastNote.attachmentOriginalName);
        if (attachment) attachments.push(attachment);
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
        const attachment = await fetchCloudinaryAttachment(lastNote.attachment, lastNote.attachmentOriginalName);
        if (attachment) attachments.push(attachment);
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
    return { success: true, message: 'Booking cancellation email sent successfully' };
  }

  async sendRefundStatusUpdate(refundRequest, note) {
    let subject = '';
    let content = '';

    if (refundRequest.status === 'approved') {
      subject = `Refund Request Approved: ${refundRequest.bookingReference}`;
      content = `
        <h1 style="color: #4CAF50;">Refund Request Approved</h1>
        <p>Dear <strong>${refundRequest.submitterName}</strong>,</p>
        <p>Your refund request for booking <strong>${refundRequest.bookingReference}</strong> has been approved.</p>
        <p>The amount of <strong>PHP ${refundRequest.calculatedRefundAmount.toLocaleString()}</strong> will be processed and sent to you shortly.</p>
        <p><strong>Note from admin:</strong> ${note.note || 'Approved for processing.'}</p>
      `;
    } else if (refundRequest.status === 'declined') {
      subject = `Refund Request Update: ${refundRequest.bookingReference}`;
      content = `
        <h1 style="color: #f44336;">Refund Request Declined</h1>
        <p>Dear <strong>${refundRequest.submitterName}</strong>,</p>
        <p>We regret to inform you that your refund request for booking <strong>${refundRequest.bookingReference}</strong> has been declined.</p>
        <p><strong>Reason:</strong> ${note.note || 'Your request does not meet the refund policy criteria.'}</p>
        <p>If you have any questions, please reply to this email.</p>
      `;
    } else if (refundRequest.status === 'confirmed') {
      subject = `Refund Processed: ${refundRequest.bookingReference}`;
      content = `
        <h1 style="color: #007bff;">Refund Processed</h1>
        <p>Dear <strong>${refundRequest.submitterName}</strong>,</p>
        <p>Your refund of <strong>PHP ${refundRequest.calculatedRefundAmount.toLocaleString()}</strong> for booking <strong>${refundRequest.bookingReference}</strong> has been processed and sent.</p>
        <p>Please allow 3-5 business days for it to appear in your account.</p>
        <p><strong>Note from admin:</strong> ${note.note || 'Refund has been sent.'}</p>
      `;
    } else {
      return;
    }

    let attachments = [];
    if (note.attachment) {
      const attachment = await fetchCloudinaryAttachment(note.attachment, note.attachmentOriginalName);
      if (attachment) attachments.push(attachment);
    }

    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: refundRequest.submitterEmail,
      subject: subject,
      html: createEmailTemplate(subject, content),
      attachments,
    };
    
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Refund status email sent successfully' };
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
          content: (await fs.readFile(file.path)).toString('base64'),
        }))
      ),
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Contact reply email sent successfully' };
  }
}

export default new EmailService();