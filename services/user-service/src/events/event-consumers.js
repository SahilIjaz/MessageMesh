const { consumeEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const { logger } = require('@messagemesh/middleware');
const userProfileModel = require('../models/user-profile');

const initEventConsumers = async () => {
  try {
    await consumeEvent(
      eventNames.USER_REGISTERED,
      async (event) => {
        try {
          const { userId, email } = event;

          await userProfileModel.create({
            userId,
            firstName: '',
            lastName: '',
            email,
          });

          logger.info({
            message: 'Created user profile from USER_REGISTERED event',
            userId,
            email,
          });
        } catch (error) {
          logger.error({
            message: 'Error consuming USER_REGISTERED event',
            error: error.message,
            stack: error.stack,
          });
          throw error;
        }
      }
    );

    logger.info({
      message: 'Event consumers initialized',
      service: 'user-service',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to initialize event consumers',
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  initEventConsumers,
};
