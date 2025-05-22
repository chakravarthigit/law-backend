const express = require('express');
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Chat routes
router.post('/chat', aiController.chatWithAI);
router.get('/chats', aiController.getUserChats);
router.get('/chats/:id', aiController.getChatById);
router.delete('/chats/:id', aiController.deleteChat);

// Law search routes
router.get('/search-laws', aiController.searchLaws);
router.get('/laws-news', aiController.getLawsNews);

module.exports = router;