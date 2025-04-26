/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class EmailService {
  constructor() {
    this.testEmailDir = config.email.testDir;
    this.testEmailPattern = /@testemail\./;
    this.transporter = nodemailer.createTransport(config.smtp);
  }

  isTestMode() {
    return !process.env.SMTP_HOST || process.env.SMTP_HOST === 'testing@testing';
  }

  getTransporter() {
    if (this.isTestMode()) {
      return null;
    }
    
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 25,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : undefined
      });
    }
    
    return this.transporter;
  }

  async ensureTestEmailDir() {
    try {
      await fs.promises.mkdir(this.testEmailDir, { recursive: true, mode: 0o755 });
      await fs.promises.chmod(this.testEmailDir, 0o755);
    } catch (error) {
      console.error('Error creating test email directory:', error);
      throw new Error(`Failed to create test email directory: ${error.message}`);
    }
  }

  generateValidationToken(username, email) {
    return uuidv4();
  }

  isTestEmail(email) {
    return this.testEmailPattern.test(email);
  }

  async sendValidationEmail(username, email, token) {
    // Remove trailing /request if it exists in SERVICE_URL
    const baseUrl = (process.env.SERVICE_URL || 'http://localhost:3006').replace(/\/request$/, '');
    const validationUrl = `${baseUrl}/request/validate/${token}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const emailContent = {
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Validate your email address',
      text: `Hello ${username},\n\nPlease validate your email address by clicking the following link:\n${validationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not request this validation, please ignore this email.\n\nBest regards,\nCertificate Management System`,
      html: `<h2>Hello ${username},</h2><p>Please validate your email address by clicking the following link:</p><p><a href="${validationUrl}">${validationUrl}</a></p><p>This link will expire in 24 hours.</p><p>If you did not request this validation, please ignore this email.</p><p>Best regards,<br>Certificate Management System</p>`
    };

    try {
      if (this.isTestMode() || this.isTestEmail(email)) {
        await this.ensureTestEmailDir();
        const filename = path.join(this.testEmailDir, `${timestamp}-${username}-validation.json`);
        
        const fileContent = JSON.stringify({
          ...emailContent,
          validationToken: token,
          timestamp: new Date().toISOString()
        }, null, 2);
        
        await fs.promises.writeFile(filename, fileContent, { mode: 0o644 });
        console.info(`Test email saved to: ${filename}`);
      } else {
        const transporter = this.getTransporter();
        if (!transporter) {
          throw new Error('Email transporter not configured');
        }
        await transporter.sendMail(emailContent);
        console.info(`Validation email sent to ${email}`);
      }
    } catch (error) {
      console.error('Error handling email:', error);
      throw new Error(`Failed to handle email: ${error.message}`);
    }
  }
}

module.exports = EmailService; 