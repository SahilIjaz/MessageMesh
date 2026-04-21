const Joi = require('joi');
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const { AppError } = require('@messagemesh/middleware').errorHandler;
const logger = require('@messagemesh/middleware').logger;
const {
  createGroup,
  getGroup,
  getGroupWithMembers,
  getUserGroups,
  getUserGroupCount,
  addMember,
  removeMember,
  getGroupMembers,
  isGroupMember,
  isGroupAdmin,
  sendGroupMessage,
  getGroupMessages,
  getGroupMessageCount,
} = require('../models/group');

const createGroupHandler = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().max(500).optional(),
      memberIds: Joi.array().items(Joi.string().uuid()).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { name, description, memberIds = [] } = value;
    const createdBy = req.userId;

    const group = await createGroup(createdBy, name, description, null);

    const allMemberIds = [createdBy, ...memberIds];
    for (const memberId of memberIds) {
      await addMember(group.id, memberId, 'member');
    }

    await publishEvent(eventNames.GROUP_CREATED, {
      groupId: group.id,
      name: group.name,
      createdBy,
      memberIds: allMemberIds,
      timestamp: new Date(),
    });

    const members = await getGroupMembers(group.id);
    res.status(201).json({
      ...group,
      members,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupsHandler = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const userId = req.userId;

    const groups = await getUserGroups(userId, limit, offset);
    const total = await getUserGroupCount(userId);

    res.status(200).json({
      data: groups,
      limit,
      offset,
      total,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupHandler = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new AppError('Not a member of this group', 403, 'NOT_A_MEMBER');
    }

    const group = await getGroupWithMembers(groupId);
    if (!group) {
      throw new AppError('Group not found', 404, 'GROUP_NOT_FOUND');
    }

    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

const addMemberHandler = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const isAdmin = await isGroupAdmin(groupId, userId);
    if (!isAdmin) {
      throw new AppError('Only admins can add members', 403, 'NOT_ADMIN');
    }

    const { userId: newUserId } = value;
    const isMember = await isGroupMember(groupId, newUserId);
    if (isMember) {
      throw new AppError('User is already a member', 409, 'ALREADY_MEMBER');
    }

    const member = await addMember(groupId, newUserId, 'member');

    await publishEvent(eventNames.GROUP_MEMBER_ADDED, {
      groupId,
      userId: newUserId,
      addedBy: userId,
      timestamp: new Date(),
    });

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
};

const removeMemberHandler = async (req, res, next) => {
  try {
    const { groupId, userId: memberToRemove } = req.params;
    const requesterId = req.userId;

    const isAdmin = await isGroupAdmin(groupId, requesterId);
    const isRemovingSelf = requesterId === memberToRemove;

    if (!isAdmin && !isRemovingSelf) {
      throw new AppError('Only admins can remove members', 403, 'NOT_ADMIN');
    }

    if (isRemovingSelf && isAdmin) {
      const members = await getGroupMembers(groupId);
      const adminCount = members.filter((m) => m.role === 'admin').length;
      if (adminCount === 1) {
        throw new AppError('Cannot remove the last admin from a group', 400, 'LAST_ADMIN');
      }
    }

    await removeMember(groupId, memberToRemove);

    await publishEvent(eventNames.GROUP_MEMBER_REMOVED, {
      groupId,
      userId: memberToRemove,
      removedBy: requesterId,
      timestamp: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

const sendGroupMessageHandler = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const schema = Joi.object({
      content: Joi.string().min(1).max(5000).required(),
      mediaUrl: Joi.string().uri().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new AppError('Not a member of this group', 403, 'NOT_A_MEMBER');
    }

    const { content, mediaUrl } = value;
    const messageType = mediaUrl ? 'media' : 'text';

    const message = await sendGroupMessage(groupId, userId, content, messageType, mediaUrl);

    const members = await getGroupMembers(groupId);
    const memberIds = members.map((m) => m.user_id);

    const contentPreview = content.substring(0, 100);

    await publishEvent(eventNames.GROUP_MESSAGE_SENT, {
      messageId: message.id,
      groupId,
      senderId: userId,
      memberIds,
      contentPreview,
      timestamp: new Date(),
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

const getGroupMessagesHandler = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new AppError('Not a member of this group', 403, 'NOT_A_MEMBER');
    }

    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const messages = await getGroupMessages(groupId, limit, offset);
    const total = await getGroupMessageCount(groupId);

    res.status(200).json({
      data: messages,
      limit,
      offset,
      total,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup: createGroupHandler,
  getGroups: getGroupsHandler,
  getGroup: getGroupHandler,
  addMember: addMemberHandler,
  removeMember: removeMemberHandler,
  sendGroupMessage: sendGroupMessageHandler,
  getGroupMessages: getGroupMessagesHandler,
};
