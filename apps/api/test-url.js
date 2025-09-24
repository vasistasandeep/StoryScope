const axios = require('axios');

// Railway URL from the dashboard networking section
const RAILWAY_URL = 'https://storyscope-production-up.railway.app';

async function testEndpoints() {
    console.log('🔍 Starting comprehensive tests...\n');

    const endpoints = [
        { path: '/health', method: 'GET', description: 'Health Check' },
        { path: '/stories', method: 'GET', description: 'Get Stories' },
        {
            path: '/stories', method: 'POST', description: 'Create Story',
            data: {
                summary: "Test Story",
                description: "Created via test script",
                labels: "test,automation",
                complexity_score: 3
            }
        }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\nTesting: ${endpoint.description}`);
            console.log(`${endpoint.method} ${RAILWAY_URL}${endpoint.path}`);

            const config = {
                method: endpoint.method,
                url: `${RAILWAY_URL}${endpoint.path}`,
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                validateStatus: false
            };

            if (endpoint.data) {
                config.data = endpoint.data;
            }

            const response = await axios(config);

            console.log('Status:', response.status);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            console.log('✅ Test completed');

        } catch (error) {
            console.error(`\n❌ Error testing ${endpoint.description}:`);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Response:', error.response.data);
            } else {
                console.error('Error:', error.message);
            }
        }
    }
}

testEndpoints();