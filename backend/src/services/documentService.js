const documentUploadService = require('./documentUploadService');
const documentQueryService = require('./documentQueryService');

module.exports = {
  ...documentUploadService,
  ...documentQueryService,
};
