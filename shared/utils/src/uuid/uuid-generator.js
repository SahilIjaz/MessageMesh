const { v4: uuidv4, validate: validateUUID } = require('uuid');

const generateUUID = () => {
  return uuidv4();
};

const isValidUUID = (uuid) => {
  return validateUUID(uuid);
};

module.exports = {
  generateUUID,
  isValidUUID,
};
