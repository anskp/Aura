require('dotenv').config();
const sumsubService = require('./src/services/sumsub.service');

async function test() {
    console.log('Testing Sumsub Service...');
    console.log('SUMSUB_APP_TOKEN:', process.env.SUMSUB_APP_TOKEN ? 'EXISTS' : 'MISSING');
    console.log('SUMSUB_SECRET_KEY:', process.env.SUMSUB_SECRET_KEY ? 'EXISTS' : 'MISSING');

    const mockUser = {
        id: 1,
        email: 'test@example.com'
    };

    try {
        console.log('Listing levels...');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'GET';
        const path = '/resources/sdkIntegrations/levels';
        const signature = sumsubService.generateSignature(method, path, '', timestamp);

        const axios = require('axios');
        try {
            const response = await axios({
                method,
                url: `${process.env.SUMSUB_BASE_URL}${path}`,
                headers: {
                    'X-App-Token': process.env.SUMSUB_APP_TOKEN,
                    'X-App-Access-Ts': timestamp,
                    'X-App-Access-Sig': signature
                }
            });
            console.log('Available Levels:', JSON.stringify(response.data, null, 2));
        } catch (e) {
            console.error('Failed to list levels:', e.response?.data || e.message);
        }

        console.log('Attempting to create applicant...');
        const applicant = await sumsubService.createApplicant(mockUser);
        console.log('Applicant created successfully:', applicant.id);
    } catch (error) {
        console.error('Final test error:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

test();
