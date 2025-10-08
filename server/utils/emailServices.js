import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Ensure .env variables are loaded

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
  }

  async initializeTransporter() {
    try {
      // Ensure credentials are defined before creating the transporter
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Missing email credentials in environment variables');
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Verify connection to Gmail
      await this.transporter.verify();
      this.isInitialized = true;
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.isInitialized = false;
    }
  }

  async reinitialize() {
    console.log('🔄 Reinitializing email service...');
    this.isInitialized = false;
    this.transporter = null;
    await this.initializeTransporter();
  }

  isServiceReady() {
    return this.isInitialized && this.transporter !== null;
  }

  async ensureReady() {
    if (!this.isServiceReady()) {
      await this.initializeTransporter();
    }
    if (!this.isServiceReady()) {
      throw new Error('Email service is not available');
    }
  }

  async sendPasswordReset(email, resetUrl) {
    try {
      await this.ensureReady();

      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
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

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully to:', email);
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error.message);
      throw error;
    }
  }

  async sendBookingApproval(booking) {
    try {
      await this.ensureReady();

      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Approved: ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Booking Approved!</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
              <p>Your booking has been approved and confirmed.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px;">
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
                <p><strong>Service:</strong> ${booking.itemName}</p>
                <p><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
                ${booking.endDate ? `<p><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</p>` : ''}
                <p><strong>Total Amount:</strong> ₱${booking.totalPrice.toLocaleString()}</p>
              </div>

              ${booking.adminNotes ? `
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px;">
                  <h4>Message from our team:</h4>
                  <p>${booking.adminNotes}</p>
                </div>` : ''}

              <p>Thank you for choosing DoRayd Travel & Tours!</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking approval email sent successfully to:', booking.email);
      return { success: true, message: 'Booking approval email sent successfully' };
    } catch (error) {
      console.error('❌ Failed to send booking approval email:', error.message);
      throw error;
    }
  }

  async sendBookingRejection(booking) {
    try {
      await this.ensureReady();

      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Status Update: ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
              <h1>Booking Rejected</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
              <p>We regret to inform you that your booking request could not be approved.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px;">
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
                <p><strong>Service:</strong> ${booking.itemName}</p>
                <p><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
              </div>

              ${booking.adminNotes ? `
                <div style="background-color: #ffebee; padding: 15px; border-radius: 5px;">
                  <h4>Reason:</h4>
                  <p>${booking.adminNotes}</p>
                </div>` : ''}

              <p>We appreciate your understanding and look forward to serving you next time.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking rejection email sent successfully to:', booking.email);
      return { success: true, message: 'Booking rejection email sent successfully' };
    } catch (error) {
      console.error('❌ Failed to send booking rejection email:', error.message);
      throw error;
    }
  }

    async sendBookingCancellation(booking) {
    try {
      await this.ensureReady();
  
      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Cancellation: ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #9E9E9E; color: white; padding: 20px; text-align: center;">
              <h1>Booking Cancelled</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
              <p>This email is to confirm that your booking has been cancelled.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px;">
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
                <p><strong>Service:</strong> ${booking.itemName}</p>
              </div>
              
              ${booking.adminNotes ? `
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;">
                  <h4>Notes from our team:</h4>
                  <p>${booking.adminNotes}</p>
                </div>` : ''}

              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
          </div>
        `,
      };
  
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking cancellation email sent to:', booking.email);
      return { success: true, message: 'Booking cancellation email sent' };
    } catch (error) {
      console.error('❌ Failed to send booking cancellation email:', error.message);
      throw error;
    }
  }

  async sendStatusUpdate(booking) {
    try {
      if (booking.status === 'confirmed') {
        return await this.sendBookingApproval(booking);
      } else if (booking.status === 'rejected') {
        return await this.sendBookingRejection(booking);
      }

      await this.ensureReady();

      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Update: ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Booking Status Update</h2>
            <p>Dear ${booking.firstName},</p>
            <p>Your booking status has been updated to: <strong>${booking.status.toUpperCase()}</strong>.</p>
            ${booking.adminNotes ? `<p><strong>Notes:</strong> ${booking.adminNotes}</p>` : ''}
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Status update email sent successfully to:', booking.email);
      return { success: true, message: 'Status update email sent successfully' };
    } catch (error) {
      console.error('❌ Failed to send status update email:', error.message);
      throw error;
    }
  }

    async sendContactReply(message, replyMessage, attachments = []) {
    try {
      await this.ensureReady();

      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: message.email,
        subject: `Re: ${message.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Reply to Your Message</h2>
            <p>Dear ${message.name},</p>
            <p>Thank you for contacting us. Here's our response:</p>
            <blockquote style="background-color: #f0f0f0; padding: 10px; border-left: 4px solid #007bff;">
              ${replyMessage}
            </blockquote>
            <p>Best regards,<br>DoRayd Travel & Tours Team</p>
          </div>
        `,
        attachments: attachments, // Add attachments here
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Contact reply email sent successfully to:', message.email);
      return { success: true, message: 'Contact reply email sent successfully' };
    } catch (error) {
      console.error('❌ Failed to send contact reply email:', error.message);
      throw error;
    }
  }

  async sendBookingConfirmation(booking) {
    try {
      await this.ensureReady();

      const mailOptions = {
        from: `"DoRayd Travel & Tours" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Received: ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>📋 Booking Received</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
              <p>We have received your booking request and it is currently under review.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px;">
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
                <p><strong>Service:</strong> ${booking.itemName}</p>
                <p><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
                ${booking.endDate ? `<p><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</p>` : ''}
                <p><strong>Total Amount:</strong> ₱${booking.totalPrice.toLocaleString()}</p>
                <p><strong>Status:</strong> <span style="color: #ff9800;">Pending Approval</span></p>
              </div>

              <p>You will receive another email once your booking is reviewed.</p>
              <p>Thank you for choosing DoRayd Travel & Tours!</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking confirmation email sent successfully to:', booking.email);
      return { success: true, message: 'Booking confirmation email sent successfully' };
    } catch (error) {
      console.error('❌ Failed to send booking confirmation email:', error.message);
      throw error;
    }
  }
}

export default new EmailService();