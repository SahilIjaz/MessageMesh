const amqp = require('amqplib');
const { validateEvent } = require('./schemas');

let connection;
let channel;

const EXCHANGE_NAME = 'messagemesh';

const initEventBus = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    console.log('Event bus initialized');
    return channel;
  } catch (error) {
    console.error('Failed to initialize event bus:', error);
    throw error;
  }
};

const publishEvent = async (eventName, payload) => {
  if (!channel) {
    throw new Error('Event bus not initialized');
  }

  // Validate payload against schema
  const { error, value } = validateEvent(eventName, payload);
  if (error) {
    throw new Error(`Event validation failed: ${error.message}`);
  }

  try {
    channel.publish(
      EXCHANGE_NAME,
      eventName,
      Buffer.from(JSON.stringify(value)),
      { persistent: true },
    );
  } catch (err) {
    console.error(`Failed to publish event ${eventName}:`, err);
    throw err;
  }
};

const consumeEvent = async (eventName, handler, queueName) => {
  if (!channel) {
    throw new Error('Event bus not initialized');
  }

  try {
    // Create queue
    const queue = await channel.assertQueue(queueName || '', { exclusive: !queueName });

    // Bind queue to exchange
    await channel.bindQueue(queue.queue, EXCHANGE_NAME, eventName);

    // Consume messages
    channel.consume(
      queue.queue,
      async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            channel.ack(msg);
          } catch (error) {
            console.error(`Error processing event ${eventName}:`, error);
            // Nack and requeue for retry
            channel.nack(msg, false, true);
          }
        }
      },
    );
  } catch (error) {
    console.error(`Failed to consume event ${eventName}:`, error);
    throw error;
  }
};

const closeEventBus = async () => {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
};

module.exports = {
  initEventBus,
  publishEvent,
  consumeEvent,
  closeEventBus,
};
