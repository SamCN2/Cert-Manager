import { EmailQueue } from '../models/email-queue.model';
import { SESService } from './ses.service';
import { Op } from 'sequelize';

export class QueueService {
  private sesService: SESService;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private processingInterval: number = 30000; // 30 seconds

  constructor() {
    this.sesService = new SESService();
  }

  async queueEmail(params: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<EmailQueue> {
    return EmailQueue.create({
      ...params,
      status: 'queued',
      retryCount: 0
    });
  }

  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log('Starting email queue processing');

    while (this.isProcessing) {
      try {
        // Get next batch of emails to process
        const emails = await EmailQueue.findAll({
          where: {
            status: 'queued',
            retryCount: {
              [Op.lt]: this.maxRetries
            }
          },
          limit: 10,
          order: [['createdAt', 'ASC']]
        });

        for (const email of emails) {
          try {
            // Mark as processing
            await email.update({ status: 'processing' });

            // Try to send
            const success = await this.sesService.sendEmail({
              to: email.to,
              from: email.from,
              subject: email.subject,
              text: email.text,
              html: email.html
            });

            if (success) {
              await email.update({
                status: 'sent',
                sentAt: new Date()
              });
            } else {
              await email.update({
                status: 'queued',
                retryCount: email.retryCount + 1,
                errorMessage: 'Failed to send via SES'
              });
            }
          } catch (error) {
            console.error('Error processing email:', error);
            await email.update({
              status: 'queued',
              retryCount: email.retryCount + 1,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Wait before next batch
        await new Promise(resolve => setTimeout(resolve, this.processingInterval));
      } catch (error) {
        console.error('Error in queue processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, this.processingInterval));
      }
    }
  }

  async stopProcessing(): Promise<void> {
    this.isProcessing = false;
    console.log('Stopping email queue processing');
  }
} 