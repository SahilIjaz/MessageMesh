const EVENTS = {
  USER_REGISTERED: 'user.registered',
  USER_PROFILE_CREATED: 'user.profile_created',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  USER_BLOCKED: 'user.blocked',
  CONNECTION_REQUESTED: 'connection.requested',
  CONNECTION_ACCEPTED: 'connection.accepted',
  MESSAGE_SENT: 'message.sent',
  NEW_MESSAGE: 'message.new',
  USER_ONLINE: 'user.online',
  USER_OFFLINE: 'user.offline',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  TYPING_STARTED: 'typing.started',
  TYPING_STOPPED: 'typing.stopped',
};

module.exports = EVENTS;
