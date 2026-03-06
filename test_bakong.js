/**
 * test_bakong.js — Quick local test for Bakong QR generation
 * Run: node test_bakong.js
 *
 * This does NOT require the server to be running.
 * It calls generateQR() directly and prints the result.
 */

require('dotenv').config();
const {generateQR, verifyPayment, CURRENCY} = require('./utils/bakong');

// ─── Test 1: Generate a QR (USD) ────────────────────────────────────────────
console.log('\n──────────────────────────────────────────');
console.log('TEST 1: Generate QR — 5 USD');
console.log('──────────────────────────────────────────');

const result = generateQR(5, 'usd', 'TEST_ORDER_001');

if (result.exceptionMessage) {
    console.error('❌ Exception thrown:', result.exceptionMessage);
    console.error(result.stack);
} else if (result.failedStatus) {
    console.error('❌ KHQR library rejected the request:');
    console.error(JSON.stringify(result.failedStatus, null, 2));
} else {
    console.log('✅ QR generated successfully!');
    console.log('  QR String :', result.qrString);
    console.log('  MD5       :', result.md5);
    console.log('\n  👉 Copy the QR string into https://www.qr-code-generator.com/');
    console.log('     or scan with the Bakong app to verify it renders correctly.');
}

// ─── Test 2: Generate a QR (KHR) ────────────────────────────────────────────
console.log('\n──────────────────────────────────────────');
console.log('TEST 2: Generate QR — 20,000 KHR');
console.log('──────────────────────────────────────────');

const resultKHR = generateQR(20000, 'khr', 'TEST_ORDER_002');
if (resultKHR.qrString) {
    console.log('✅ KHR QR generated!');
    console.log('  QR String :', resultKHR.qrString);
    console.log('  MD5       :', resultKHR.md5);
} else {
    console.error('❌ KHR QR failed:', JSON.stringify(resultKHR, null, 2));
}

// ─── Test 3: verifyPayment (only works with a real MD5 from Bakong) ──────────
// Uncomment and replace <md5> with the actual md5 from test 1 to test live.
/*
console.log('\n──────────────────────────────────────────');
console.log('TEST 3: Verify Payment');
console.log('──────────────────────────────────────────');

(async () => {
    const md5 = '<paste md5 from TEST 1 here>';
    const verification = await verifyPayment(md5);
    console.log('isPaid:', verification.isPaid);
    console.log('Response:', JSON.stringify(verification.data, null, 2));
})();
*/

console.log('\n──────────────────────────────────────────');
console.log('DONE. Start the server with: npm start');
console.log('Then use the curl commands in test_bakong_api.sh');
console.log('──────────────────────────────────────────\n');
