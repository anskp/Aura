const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const sumsubService = require('./src/services/sumsub.service');

async function testDebug() {
    const mockUser = {
        id: 2,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
    };

    try {
        console.log('Starting Protocol Debug Test...');
        const token = await sumsubService.generateSdkAccessToken(mockUser);
        console.log('Result:', token);
    } catch (error) {
        console.error('Test completed with error (check logs above for protocol details)');
    }
}

testDebug();
