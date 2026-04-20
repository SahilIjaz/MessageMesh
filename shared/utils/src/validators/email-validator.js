const Joi = require('joi');

const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .required()
  .lowercase()
  .trim();

const passwordSchema = Joi.string()
  .min(8)
  .required()
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/\d/, 'number')
  .messages({
    'string.pattern.uppercase': 'Password must contain uppercase letters',
    'string.pattern.lowercase': 'Password must contain lowercase letters',
    'string.pattern.number': 'Password must contain numbers',
    'string.min': 'Password must be at least 8 characters',
  });

const isValidEmail = (email) => {
  const { error } = emailSchema.validate(email);
  return !error;
};

const isValidPassword = (password) => {
  const { error } = passwordSchema.validate(password);
  return !error;
};

const validateEmail = (email) => {
  return emailSchema.validate(email);
};

const validatePassword = (password) => {
  return passwordSchema.validate(password);
};

module.exports = {
  isValidEmail,
  isValidPassword,
  validateEmail,
  validatePassword,
  emailSchema,
  passwordSchema,
};
