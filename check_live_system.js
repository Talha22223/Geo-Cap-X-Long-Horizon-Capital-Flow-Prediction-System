async function test() {
  const tests = [
    { name: 'AI Engine (/health)', url: 'http://localhost:8000/health' },
    { name: 'API Gateway (/api/v1/health)', url: 'http://localhost:3001/api/v1/health' },
    { name: 'API Gateway Proxy (/api/v1/ai/dashboard/summary)', url: 'http://localhost:3001/api/v1/ai/dashboard/summary' },
    { name: 'API Gateway Proxy (/api/v1/ai/events)', url: 'http://localhost:3001/api/v1/ai/events' },
    { name: 'API Gateway Proxy (/api/v1/ai/predictions)', url: 'http://localhost:3001/api/v1/ai/predictions' },
    { name: 'API Gateway Proxy (/api/v1/ai/network/statistics)', url: 'http://localhost:3001/api/v1/ai/network/statistics' },
    { name: 'Next.js Frontend (/)', url: 'http://localhost:3000' }
  ];

  console.log('--- SYSTEM HEALTH & PROXY VERIFICATION ---');
  for (const t of tests) {
    try {
      const res = await fetch(t.url);
      console.log(`[${res.status} ${res.statusText}] ${t.name}`);
    } catch (e) {
      console.log(`[FAILED] ${t.name}: ${e.message}`);
    }
  }
}
test();
