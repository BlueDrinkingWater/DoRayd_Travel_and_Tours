// server/utils/emailServices.js
import { Resend } from 'resend';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

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
    // This MUST be an email you have verified with Resend (e.g., noreply@yourdomain.com)
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
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click below to create a new password. This link is valid for 10 minutes.</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Password reset email sent successfully' };
  }

  async sendBookingConfirmation(booking) {
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: `Booking Received: ${booking.bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
            <h1>📋 Booking Received</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
            <p>We have received your booking request and it is currently under review. You will receive another email once your booking is confirmed.</p>
            <p>Thank you for choosing DoRayd Travel & Tours!</p>
          </div>
        </div>
      `,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking confirmation email sent successfully' };
  }

  async sendStatusUpdate(booking) {
    if (booking.status === 'confirmed') {
      return this.sendBookingApproval(booking);
    }
    if (booking.status === 'rejected') {
      return this.sendBookingRejection(booking);
    }
    // Add any other status updates you need here
  }

  async sendBookingApproval(booking) {
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: `Booking Approved: ${booking.bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>🎉 Booking Approved!</h1>
          </div>
          <div style="padding: 20px;">
            <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
            <p>Great news! Your booking has been approved and confirmed. We look forward to serving you.</p>
            ${booking.adminNotes ? `<p><strong>A note from our team:</strong> ${booking.adminNotes}</p>` : ''}
          </div>
        </div>
      `,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking approval email sent successfully' };
  }

  async sendBookingRejection(booking) {
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: `Booking Status Update: ${booking.bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>Booking Rejected</h1>
          </div>
          <div style="padding: 20px;">
            <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
            <p>We regret to inform you that your booking request could not be approved at this time.</p>
            ${booking.adminNotes ? `<p><strong>Reason:</strong> ${booking.adminNotes}</p>` : ''}
            <p>We appreciate your understanding and hope to serve you in the future.</p>
          </div>
        </div>
      `,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking rejection email sent successfully' };
  }

  async sendBookingCancellation(booking) {
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: booking.email,
      subject: `Booking Cancellation: ${booking.bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #9E9E9E; color: white; padding: 20px; text-align: center;">
            <h1>Booking Cancelled</h1>
          </div>
          <div style="padding: 20px;">
            <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
            <p>This email is to confirm that your booking (Ref: ${booking.bookingReference}) has been cancelled.</p>
            ${booking.adminNotes ? `<p><strong>Notes:</strong> ${booking.adminNotes}</p>` : ''}
          </div>
        </div>
      `,
    };
    await this.sendEmail(mailOptions);
    return { success: true, message: 'Booking cancellation email sent' };
  }

  async sendContactReply(message, replyMessage, attachments = []) {
    const mailOptions = {
      from: `DoRayd Travel & Tours <${this.fromAddress}>`,
      to: message.email,
      subject: `Re: ${message.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Dear ${message.name},</p>
          <p>Thank you for contacting us. Here is our response to your inquiry:</p>
          <blockquote style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
            ${replyMessage}
          </blockquote>
          <p>Best regards,<br>DoRayd Travel & Tours Team</p>
        </div>
      `,
      // Resend handles attachments by reading the file content into a buffer
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