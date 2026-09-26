async function testScreens() {
  const endpoints = [
    // Web Pages
    { name: 'Dashboard Page', url: 'http://localhost:3000/dashboard' },
    { name: 'Events Page', url: 'http://localhost:3000/events' },
    { name: 'Capital Flows Page', url: 'http://localhost:3000/flows' },
    { name: 'Predictions Page', url: 'http://localhost:3000/predictions' },
    { name: 'Market Intelligence Page', url: 'http://localhost:3000/market' },
    { name: 'Technical Analysis Page', url: 'http://localhost:3000/technical' },
    { name: 'Visualizations (SNA Graph) Page', url: 'http://localhost:3000/visualizations' },
    { name: 'Validation & Backtesting Page', url: 'http://localhost:3000/validation' },
    { name: 'Reports Page', url: 'http://localhost:3000/reports' },
    
    // API Gateway AI Proxies
    { name: 'API Summary', url: 'http://localhost:3001/api/v1/ai/dashboard/summary' },
    { name: 'API Events', url: 'http://localhost:3001/api/v1/ai/events' },
    { name: 'API Predictions', url: 'http://localhost:3001/api/v1/ai/predictions' },
    { name: 'API Forecast by Horizon', url: 'http://localhost:3001/api/v1/ai/forecast/by-horizon' },
    { name: 'API Countries', url: 'http://localhost:3001/api/v1/ai/countries' },
    { name: 'API Heatmap', url: 'http://localhost:3001/api/v1/ai/heatmap' },
    { name: 'API Network Stats', url: 'http://localhost:3001/api/v1/ai/network/statistics' },
    { name: 'API Event Chain', url: 'http://localhost:3001/api/v1/ai/event-chain' },
    { name: 'API Freshness', url: 'http://localhost:3001/api/v1/ai/explain/freshness' },
    { name: 'API Market Observations', url: 'http://localhost:3001/api/v1/ai/market/observations' },
    { name: 'API Market Signals', url: 'http://localhost:3001/api/v1/ai/market/signals' },
    { name: 'API Backtest Results', url: 'http://localhost:3001/api/v1/ai/backtest/results' },
    { name: 'API Technical AAPL', url: 'http://localhost:3001/api/v1/ai/technical/AAPL' },
  ];

  console.log('=== FULL SYSTEM SCREEN & DATA ENDPOINTS VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  for (const item of endpoints) {
    try {
      const res = await fetch(item.url);
      const isOk = res.status >= 200 && res.status < 400;
      if (isOk) {
        passed++;
        console.log(`✅ [${res.status}] ${item.name}`);
      } else {
        failed++;
        console.log(`❌ [${res.status}] ${item.name}`);
      }
    } catch (e) {
      failed++;
      console.log(`❌ [FAILED] ${item.name}: ${e.message}`);
    }
  }

  console.log(`\nResults: ${passed}/${endpoints.length} Passed, ${failed} Failed.`);
}

testScreens();
