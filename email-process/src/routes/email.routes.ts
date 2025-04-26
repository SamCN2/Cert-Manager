import { Router, Request, Response } from 'express';
import { QueueService } from '../services/queue.service';
import { EmailQueue } from '../models/email-queue.model';

const router = Router();
const queueService = new QueueService();

// Start the queue processing when the routes are initialized
queueService.startProcessing().catch(error => {
  console.error('Failed to start queue processing:', error);
});

// Queue a new email
router.post('/queue', async (req: Request, res: Response) => {
  try {
    const { to, from, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !from || !subject || !text || !html) {
      return res.status(400).json({
        error: 'Missing required fields: to, from, subject, text, html'
      });
    }

    const email = await queueService.queueEmail({
      to,
      from,
      subject,
      text,
      html
    });

    res.status(200).json({
      message: 'Email queued successfully',
      id: email.id
    });
  } catch (error) {
    console.error('Error queuing email:', error);
    res.status(500).json({
      error: 'Failed to queue email'
    });
  }
});

// Get email status
router.get('/status/:id', async (req: Request, res: Response) => {
  try {
    const email = await EmailQueue.findByPk(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        error: 'Email not found'
      });
    }

    res.status(200).json({
      id: email.id,
      status: email.status,
      retryCount: email.retryCount,
      createdAt: email.createdAt,
      sentAt: email.sentAt,
      errorMessage: email.errorMessage
    });
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({
      error: 'Failed to get email status'
    });
  }
});

// Get queue statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [queued, processing, sent, failed] = await Promise.all([
      EmailQueue.count({ where: { status: 'queued' } }),
      EmailQueue.count({ where: { status: 'processing' } }),
      EmailQueue.count({ where: { status: 'sent' } }),
      EmailQueue.count({ where: { status: 'failed' } })
    ]);

    res.status(200).json({
      queued,
      processing,
      sent,
      failed,
      total: queued + processing + sent + failed
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      error: 'Failed to get queue statistics'
    });
  }
});

export default router; 