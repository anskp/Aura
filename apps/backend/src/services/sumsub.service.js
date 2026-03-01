const axios = require('axios');
const crypto = require('crypto');

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

const generateSignature = (method, path, body, timestamp) => {
    const signature = crypto.createHmac('sha256', SUMSUB_SECRET_KEY);
    signature.update(timestamp + method.toUpperCase() + path + (body || ''));
    return signature.digest('hex');
};

const createApplicant = async (user) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'POST';
    const path = '/resources/applicants';

    const externalUserId = `user-${user.id}`;
    const bodyData = {
        externalUserId,
        email: user.email,
        info: {
            firstName: user.firstName || "User",
            lastName: user.lastName || "Unknown",
            country: "USA"
        },
        fixedInfo: {
            email: user.email
        },
        requiredIdDocs: {
            docSets: [
                {
                    idDocSetType: "IDENTITY",
                    types: ["PASSPORT", "ID_CARD", "DRIVERS"]
                },
                {
                    idDocSetType: "SELFIE",
                    types: ["SELFIE"]
                }
            ]
        }
    };

    const body = JSON.stringify(bodyData);
    const signature = generateSignature(method, path, body, timestamp);

    try {
        const response = await axios({
            method,
            url: `${SUMSUB_BASE_URL}${path}`,
            headers: {
                'X-App-Token': SUMSUB_APP_TOKEN,
                'X-App-Access-Ts': timestamp,
                'X-App-Access-Sig': signature,
                'Content-Type': 'application/json'
            },
            data: body
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 409) {
            const description = error.response.data.description || "";
            const existingApplicantId = description.match(/([a-f0-9]{24})/)?.[1];

            if (existingApplicantId) {
                console.log(`Reusing existing applicant: ${existingApplicantId}`);
                return { id: existingApplicantId };
            }
        }

        console.error('Sumsub createApplicant error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.description || 'Failed to create Sumsub applicant');
    }
};

const generateSdkAccessToken = async (user) => {
    const https = require('https');
    const levelName = process.env.SUMSUB_LEVEL_NAME;
    if (!levelName) {
        throw new Error('SUMSUB_LEVEL_NAME not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'POST';
    // Exact query string order: userId, levelName, ttlInSecs
    const path = `/resources/accessTokens?userId=user-${user.id}&levelName=${levelName}&ttlInSecs=600`;
    const body = '';

    const signature = generateSignature(method, path, body, timestamp);

    const options = {
        hostname: 'api.sumsub.com',
        port: 443,
        path: path,
        method: method,
        headers: {
            'X-App-Token': SUMSUB_APP_TOKEN,
            'X-App-Access-Ts': timestamp,
            'X-App-Access-Sig': signature
        }
    };

    console.log("----- SUMSUB DEBUG START -----");
    console.log("TIMESTAMP:", timestamp);
    console.log("METHOD:", method);
    console.log("PATH:", path);
    console.log("BODY LENGTH:", body.length);
    console.log("SIGN STRING:");
    console.log(timestamp + method + path + body);
    console.log("GENERATED SIGNATURE:", signature);
    console.log("HEADERS SENT:", options.headers);

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log("STATUS CODE:", res.statusCode);
                console.log("RAW RESPONSE BODY:", data);

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Sumsub API error: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('HTTPS Request Error:', e);
            reject(e);
        });

        req.end(); // Call with NO arguments
    });
};

const getApplicantDetails = async (user) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = `/resources/applicants/-;externalUserId=user-${user.id}/one`;

    const signature = generateSignature(method, path, '', timestamp);

    try {
        const response = await axios({
            method,
            url: `${SUMSUB_BASE_URL}${path}`,
            headers: {
                'X-App-Token': SUMSUB_APP_TOKEN,
                'X-App-Access-Ts': timestamp,
                'X-App-Access-Sig': signature
            }
        });
        console.log('--- SUMSUB APPLICANT DETAILS ---');
        console.log(JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('Sumsub getApplicantDetails error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.description || 'Failed to fetch Sumsub applicant details');
    }
};

const verifyWebhookSignature = (payload, headers) => {
    const signatureHeader = headers['x-payload-digest'];
    const webhookSecret = process.env.SUMSUB_WEBHOOK_SECRET;

    if (!signatureHeader || !webhookSecret) return false;

    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(payload);
    const digest = hmac.digest('hex');

    return digest === signatureHeader;
};

module.exports = {
    createApplicant,
    generateSdkAccessToken,
    getApplicantDetails,
    verifyWebhookSignature
};
