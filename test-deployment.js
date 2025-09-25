// Simple test script to verify deployment
const https = require('https');

function testEndpoint(url, description) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`✅ ${description}: ${res.statusCode}`);
                if (res.statusCode !== 200) {
                    console.log(`   Response: ${data.substring(0, 100)}...`);
                }
                resolve(res.statusCode === 200);
            });
        }).on('error', (err) => {
            console.log(`❌ ${description}: ${err.message}`);
            resolve(false);
        });
    });
}

async function testDeployment(baseUrl) {
    console.log(`Testing deployment at: ${baseUrl}`);
    console.log('='.repeat(50));

    const tests = [
        [`${baseUrl}/api/test`, 'API Test Endpoint'],
        [`${baseUrl}/api/health`, 'API Health Check'],
        [`${baseUrl}/`, 'Frontend Homepage'],
    ];

    let passed = 0;
    for (const [url, desc] of tests) {
        const success = await testEndpoint(url, desc);
        if (success) passed++;
    }

    console.log('='.repeat(50));
    console.log(`Tests passed: ${passed}/${tests.length}`);

    if (passed === tests.length) {
        console.log('🎉 All tests passed! Deployment is working.');
    } else {
        console.log('⚠️  Some tests failed. Check the logs above.');
    }
}

// Get URL from command line or use default
const baseUrl = process.argv[2] || 'https://your-project.vercel.app';
testDeployment(baseUrl);
