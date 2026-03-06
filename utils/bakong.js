const {BakongKHQR, khqrData} = require('bakong-khqr');

/**
 * @typedef {Object} khqrData
 * @property {Object} currency
 * @property {number} currency.usd
 * @property {number} currency.khr
 */

/**
 * @typedef {"merchant" | "individual"} merchantType
 */

/**
 * @typedef {Object} IndividualInfo
 * @property {string} bakongAccountID
 * @property {string} merchantName
 * @property {string} [merchantCity]
 * @property {string} [accountInformation]
 * @property {string} acquiringBank
 * @property {number} [currency]
 * @property {number} [amount]
 * @property {string} [billNumber]
 * @property {string} [storeLabel]
 * @property {string} [terminalLabel]
 * @property {string} [mobileNumber]
 * @property {string} [purposeOfTransaction]
 * @property {string} [languagePreference]
 * @property {string} [merchantNameAlternateLanguage]
 * @property {string} [merchantCityAlternateLanguage]
 * @property {string} [upiMerchantAccount]
 */

/**
 * @typedef {IndividualInfo & { merchantID: string }} MerchantInfo
 */

/**
 * @typedef {Object} KHQRResponse
 * @property {Object} status
 * @property {number} status.code
 * @property {number|null} status.errorCode
 * @property {string|null} status.message
 * @property {any|null} data
 */

const CURRENCY = {
    usd: khqrData.currency.usd,
    khr: khqrData.currency.khr
};

/**
 * Generate a Bakong KHQR string using generateMerchant.
 * @param {number} amount - Amount in USD or KHR depending on currencyCode
 * @param {'usd'|'khr'} currencyCode
 * @param {string} billNumber - Unique bill/session reference (max 25 chars)
 * @returns {{ qrString: string, md5: string } | { failedStatus: object } | { exceptionMessage: string, stack: string }}
 */
const generateQR = (amount, currencyCode = 'usd', billNumber = '') => {
    try { // Enforce 25-char limit required by KHQR spec
        const bill = (billNumber || `INV${
            Date.now()
        }`).slice(0, 25);

        // The backend controller calculates `amount` in base USD (the product's default price).
        // If the user requested KHR, convert to KHR and set currency flag to KHR.
        // If the user requested USD, keep as USD and set currency flag to USD.
        const finalAmount = currencyCode === 'khr' ? Math.round(amount * 4100) : amount;
        const finalCurrency = currencyCode === 'khr' ? CURRENCY.khr : CURRENCY.usd;

        /** @type {MerchantInfo} */
        const merchantInfo = {
            merchantID: "1456",
            bakongAccountID: "bun_sengtri@bkrt",
            merchantName: "SENGTREE bUN",
            acquiringBank: "National Bank of Cambodia",
            mobileNumber: "85599706869",
            merchantCity: "Phnom Penh",
            currency: finalCurrency,
            amount: finalAmount,
            billNumber: bill,

            // Required by the bakong-khqr library (errorCode 45 if missing)
            expirationTimestamp: Date.now() + 15 * 60 * 1000
        };


        const khqr = new BakongKHQR();
        const res = khqr.generateMerchant(merchantInfo);

        console.log('[Bakong] status:', JSON.stringify(res ?. status));

        if (! res || res.status.code !== 0 || ! res.data) {
            console.error('[Bakong] failed:', JSON.stringify(res ?. status));
            return {
                failedStatus: res ?. status
            };
        }

        return {qrString: res.data.qr, md5: res.data.md5};
    } catch (err) {
        console.error('[Bakong] exception:', err.message || err);
        return {exceptionMessage: err.message, stack: err.stack};
    }
};

/**
 * Verify payment status via Bakong API (check_transaction_by_md5).
 * @param {string} md5 - MD5 hash from the generated QR
 * @returns {Promise<{ isPaid: boolean, data: any }>}
 */
const verifyPayment = async (md5) => {
    const token = process.env.BAKONG_TOKEN;

    const baseUrl = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';

    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/v1/check_transaction_by_md5`, {
        method: 'POST',
        headers,
        body: JSON.stringify({md5})
    });

    console.log('[Bakong] Checking MD5:', md5);
    const json = await res.json();
    console.log('[Bakong Check] Response:', JSON.stringify(json, null, 2));

    // responseCode === 0 and a non-null data object means payment confirmed
    const isPaid = json ?. responseCode === 0 && !! json ?. data;

    return {isPaid, data: json};
};

module.exports = {
    generateQR,
    verifyPayment,
    CURRENCY
};
