const crypto = require('crypto');
const BakongSession = require('../models/BakongSessionModels');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const {generateQR, verifyPayment} = require('../utils/bakong');

// ─────────────────────────────────────────────────────────────
// POST /api/bakong/generate
// Body: { userId, items: [{ product_id, quantity }], currency?, notes? }
// ─────────────────────────────────────────────────────────────
const generateQRCode = async (req, res) => {
    try {
        const {
            userId,
            items,
            currency = 'usd',
            notes
        } = req.body;

        if (!userId || !items || items.length === 0) {
            return res.status(400).json({message: 'userId and at least one item are required.'});
        }

        // ── Resolve products & build cart ────────────────────────
        const sessionItems = [];
        let total_amount = 0;

        for (const item of items) {
            const product = await Product.findById(item.product_id);
            if (! product) {
                return res.status(404).json({
                        message: `Product not found: ${
                        item.product_id
                    }`
                });
            }

            if (product.quantity_in_stock<item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for "${product.product_name}". Available: ${product.quantity_in_stock}, Requested: ${item.quantity}`, });
            }

            const subtotal = item.quantity * product.unit_price;
            total_amount += subtotal;

            sessionItems.push({
                product_id: product._id, product_name: product.product_name, product_code: product.product_code, quantity: item.quantity, unit_price: product.unit_price, subtotal, remarks: item.remarks || '', });
        }

        // ── Generate QR ──────────────────────────────────────────
        const sessionId = crypto.randomUUID();
        const qrResult = generateQR(total_amount, currency, sessionId);

        if (!qrResult || qrResult.failedStatus || qrResult.exceptionMessage) {
            const detail = qrResult
                ? JSON.stringify(qrResult)
                : 'Null result';
            console.error('[Bakong Controller] QR generation failed:', detail);
            return res
                .status(500)
                .json({ message: `Bakong QR generation failed: ${detail}` });
        }

        // ── Persist session ──────────────────────────────────────
        const session = await BakongSession.create({
            sessionId, userId, items: sessionItems, total_amount, currency, qrString: qrResult.qrString, md5: qrResult.md5, notes: notes || '', status: 'pending', });

        return res.status(200).json({
            sessionId: session.sessionId, qrString: session.qrString, md5: session.md5, total_amount: session.total_amount, currency: session.currency, expiresAt: session.expiresAt, });
    } catch (error) {
        console.error('[Bakong Controller] Generate Error:', error);
        return res
            .status(500)
            .json({ message: 'Internal server error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/bakong/check
// Body: { sessionId }
// ─────────────────────────────────────────────────────────────
const checkPaymentStatus = async (req, res) => {
                try {
                    const {sessionId} = req.body;

                    if (!sessionId) {
                        return res.status(400).json({message: 'sessionId is required.'});
                    }

                    // Accept either sessionId UUID or md5 hash
                    const session = await BakongSession.findOne({
                        $or: [
                            {
                                sessionId
                            }, {
                                md5: sessionId
                            }
                        ]
                    });

                    if (! session) {
                        console.log(`[Bakong Controller] ❌ Session not found: ${sessionId}`,);
                        return res.status(404).json({message: 'Session not found.'});
                    }

                    // Already-paid guard
                    if (session.status === 'paid') {
                        return res.status(200).json({isPaid: true, message: 'Payment already confirmed.'});
                    }

                    // Expired guard
                    if (session.status === 'expired' || new Date() > session.expiresAt) {
                        session.status = 'expired';
                        await session.save();
                        return res.status(200).json({isPaid: false, message: 'QR code has expired.'});
                    }

                    // ── Poll Bakong API ──────────────────────────────────────
                    console.log(`[Bakong Controller] ⏳ Polling Bakong for MD5: ${
                        session.md5
                    }`,);
                    const verification = await verifyPayment(session.md5);

                    if (! verification.isPaid) {
                        return res.status(200).json({isPaid: false, message: 'Payment not yet received.'});
                    }

                    // ── Payment confirmed — create Sale ──────────────────────
                    session.status = 'paid';
                    await session.save();

                    // Build sale items array (matches Sale.js saleItemSchema)
                    const saleItems = session.items.map((item) => ({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        product_code: item.product_code,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        subtotal: item.subtotal
                    }));

                    // Find User to record who ordered
                    const User = require('../models/User');
                    let buyerName = 'Guest (Bakong QR)';
                    if (session.userId && session.userId !== '000000000000000000000001') {
                        try {
                            const user = await User.findById(session.userId);
                            if (user) {
                                buyerName = user.username + ' (Web Client)';
                            }
                        } catch (err) {}
                    }

                    // Create the Sale record
                    const newSale = await Sale.create({
                        customer_id: null,
                        customer_name: buyerName,
                        items: saleItems,
                        total_amount: session.total_amount,
                        payment_status: 'PAID',
                        notes: `Bakong QR payment | session: ${
                            session.sessionId
                        }${
                            session.notes ? ' | ' + session.notes : ''
                        }`
                    });

                    // Deduct stock & create StockTransaction for each item
                    for (const item of saleItems) {
                        const product = await Product.findById(item.product_id);
                        if (product) {
                            await product.updateStock(item.quantity, 'OUT');

                            await StockTransaction.create({
                                product_id: product._id,
                                product_name: product.product_name,
                                product_code: product.product_code,
                                transaction_type: 'OUT',
                                quantity: item.quantity,
                                notes: `Bakong Sale #${
                                    newSale._id
                                }`,
                                performed_by: 'Bakong'
                            });
                        }
                    }

                    console.log(`[Bakong Controller] ✅ Payment confirmed. Sale created: ${
                        newSale._id
                    }`,);
                    return res.status(200).json({isPaid: true, message: 'Payment confirmed & sale created.', sale: newSale});
                } catch (error) {
                    console.error('[Bakong Controller] Check Error:', error);
                    return res.status(500).json({message: 'Internal server error', error: error.message});
                }
            };

            module.exports =
                { generateQRCode,
                checkPaymentStatus
            };
