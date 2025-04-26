import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';

dotenv.config();

export class SESService {
  private client: SESClient;

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }

  async sendEmail(params: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    try {
      const command = new SendEmailCommand({
        Destination: {
          ToAddresses: [params.to]
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: params.html
            },
            Text: {
              Charset: 'UTF-8',
              Data: params.text
            }
          },
          Subject: {
            Charset: 'UTF-8',
            Data: params.subject
          }
        },
        Source: params.from
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('Error sending email via SES:', error);
      return false;
    }
  }
} 