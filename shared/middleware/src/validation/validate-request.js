const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validateRequest;
