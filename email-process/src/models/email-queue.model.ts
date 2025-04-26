import { Model, DataTypes, Sequelize } from 'sequelize';

export interface EmailQueueAttributes {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

export class EmailQueue extends Model<EmailQueueAttributes> implements EmailQueueAttributes {
  public id!: string;
  public to!: string;
  public from!: string;
  public subject!: string;
  public text!: string;
  public html!: string;
  public status!: 'queued' | 'processing' | 'sent' | 'failed';
  public errorMessage!: string | undefined;
  public retryCount!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public sentAt!: Date | undefined;

  static initModel(sequelize: Sequelize): typeof EmailQueue {
    EmailQueue.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      to: {
        type: DataTypes.STRING,
        allowNull: false
      },
      from: {
        type: DataTypes.STRING,
        allowNull: false
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      html: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('queued', 'processing', 'sent', 'failed'),
        allowNull: false,
        defaultValue: 'queued'
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      retryCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      sequelize,
      tableName: 'email_queue',
      timestamps: true
    });

    return EmailQueue;
  }
} 