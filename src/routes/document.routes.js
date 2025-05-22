const express = require('express');
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.protect);

// Document routes
router.post('/', upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.getUserDocuments);
router.get('/:id', documentController.getDocument);
router.patch('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.post('/:id/analyze', documentController.analyzeDocument);

module.exports = router; 