const express = require('express');
const router = express.Router();
const {generateQRCode, checkPaymentStatus} = require('../controller/bakong.controller');
// ✅ Fixed typo (was: bakong.controllerr)

// POST /api/bakong/generate  — generate a QR code and create a pending session
router.post('/generate', generateQRCode);

// POST /api/bakong/check     — check if payment has been received
router.post('/check', checkPaymentStatus);

module.exports = router;
