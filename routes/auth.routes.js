const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');

router.post('/login', authController.login);
router.post('/register', authController.registerClient);
router.post('/seed', authController.seedAdmin); // Useful for initializing

module.exports = router;
