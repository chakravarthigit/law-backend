const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.protect);

// User profile routes
router.get('/me', userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.patch('/updatePassword', userController.updatePassword);
router.delete('/deleteMe', userController.deleteMe);

// Admin only routes
router.use(authMiddleware.restrictTo('admin'));
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);

module.exports = router; 