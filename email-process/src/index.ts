import express from 'express';
import dotenv from 'dotenv';
import emailRoutes from './routes/email.routes';
import sequelize from './config/database';
import { EmailQueue } from './models/email-queue.model';

dotenv.config();

const app = express();
const port = process.env.PORT || 3007;

app.use(express.json());
app.use('/api/email', emailRoutes);

// Initialize database and start server
async function start() {
  try {
    // Initialize models
    EmailQueue.initModel(sequelize);

    // Sync database
    await sequelize.sync();
    console.log('Database synchronized');

    // Start server
    app.listen(port, () => {
      console.log(`Email processing service listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start(); 