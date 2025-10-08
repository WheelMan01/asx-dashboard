import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Calendar, RefreshCw, Filter, Star, Bell, DollarSign, GitCompare, X, Plus, Minus, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedStock, setSelectedStock] = useState(null);
  const [filter, setFilter] = useState('all');
  const [watchlist, setWatchlist] = useState(['BHP', 'CBA']);
  const [timePeriod, setTimePeriod] = useState('1D');
  const [alerts, setAlerts] = useState([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [realTimeData, setRealTimeData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAPINotice, setShowAPINotice] = useState(false);

  // Demo data as fallback
  const demoStocks = [
    { symbol: 'BHP', name: 'BHP Group', prediction: 'Bullish', confidence: 87, currentPrice: 45.23, targetPrice: 48.50, change: 7.2, changePercent: 7.2, volume: '12.5M', marketCap: '228B' },
    { symbol: 'CBA', name: 'Commonwealth Bank', prediction: 'Bullish', confidence: 82, currentPrice: 108.45, targetPrice: 112.30, change: 3.5, changePercent: 3.5, volume: '8.2M', marketCap: '182B' },
    { symbol: 'CSL', name: 'CSL Limited', prediction: 'Bullish', confidence: 79, currentPrice: 287.50, targetPrice: 295.80, change: 2.9, changePercent: 2.9, volume: '2.1M', marketCap: '138B' },
    { symbol: 'WES', name: 'Wesfarmers', prediction: 'Bullish', confidence: 75, currentPrice: 62.80, targetPrice: 65.40, change: 4.1, changePercent: 4.1, volume: '5.3M', marketCap: '71B' },
    { symbol: 'FMG', name: 'Fortescue Metals', prediction: 'Bearish', confidence: 71, currentPrice: 18.95, targetPrice: 17.20, change: -9.2, changePercent: -9.2, volume: '15.8M', marketCap: '58B' },
    { symbol: 'NAB', name: 'National Australia Bank', prediction: 'Bullish', confidence: 68, currentPrice: 32.15, targetPrice: 33.80, change: 5.1, changePercent: 5.1, volume: '9.7M', marketCap: '104B' },
    { symbol: 'WOW', name: 'Woolworths Group', prediction: 'Bearish', confidence: 65, currentPrice: 38.20, targetPrice: 36.50, change: -4.5, changePercent: -4.5, volume: '6.4M', marketCap: '48B' },
  ];

  const stockNames = {
    'BHP': 'BHP Group',
    'CBA': 'Commonwealth Bank',
    'CSL': 'CSL Limited',
    'WES': 'Wesfarmers',
    'FMG': 'Fortescue Metals',
    'NAB': 'National Australia Bank',
    'WOW': 'Woolworths Group',
  };

  const marketCaps = {
    'BHP': '228B',
    'CBA': '182B',
    'CSL': '138B',
    'WES': '71B',
    'FMG': '58B',
    'NAB': '104B',
    'WOW': '48B',
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time data
  const fetchRealTimeData = async () => {
    if (!isAPIConfigured()) {
      setShowAPINotice(true);
      return;
    }

    setIsLoading(true);
    setIsRefreshing(true);

    try {
      const stockData = await fetchAllStocks();
      
      if (stockData && stockData.length > 0) {
        // Enhance with predictions based on technical indicators
        const enhancedData = stockData.map(stock => {
          // For demo, use simple prediction logic
          // In production, you'd fetch historical data for each stock
          const prediction = generatePrediction(stock.currentPrice, []);
          
          return {
            ...stock,
            name: stockNames[stock.symbol] || stock.symbol,
            marketCap: marketCaps[stock.symbol] || 'N/A',
            ...prediction,
          };
        });

        setRealTimeData(enhancedData);
        setIsLiveMode(true);
        setLastUpdate(new Date());
        showNotification('Live data updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      showNotification('Failed to fetch live data. Using demo mode.', 'warning');
      setIsLiveMode(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 5 minutes (to stay within API limits)
  useEffect(() => {
    if (isLiveMode && isAPIConfigured()) {
      const interval = setInterval(() => {
        fetchRealTimeData();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isLiveMode]);

  // Use real-time data if available, otherwise demo data
  const allStocks = isLiveMode && realTimeData.length > 0 ? realTimeData : demoStocks;

  const filteredStocks = allStocks.filter(stock => {
    if (filter === 'bullish') return stock.prediction === 'Bullish';
    if (filter === 'bearish') return stock.prediction === 'Bearish';
    return true;
  });

  const accuracyDataByPeriod = {
    '1D': [
      { time: '10:00', accuracy: 75 },
      { time: '11:00', accuracy: 78 },
      { time: '12:00', accuracy: 82 },
      { time: '13:00', accuracy: 79 },
      { time: '14:00', accuracy: 85 },
      { time: '15:00', accuracy: 83 },
    ],
    '1W': [
      { day: 'Mon', accuracy: 78 },
      { day: 'Tue', accuracy: 82 },
      { day: 'Wed', accuracy: 75 },
      { day: 'Thu', accuracy: 88 },
      { day: 'Fri', accuracy: 85 },
    ],
    '1M': [
      { week: 'W1', accuracy: 81 },
      { week: 'W2', accuracy: 79 },
      { week: 'W3', accuracy: 84 },
      { week: 'W4', accuracy: 82 },
    ],
  };

  const accuracyData = accuracyDataByPeriod[timePeriod];
  const avgAccuracy = accuracyData.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / accuracyData.length;

  const intradayDataByPeriod = {
    '1D': [
      { time: '10:00', BHP: 45.10, CBA: 107.80, CSL: 285.20 },
      { time: '11:00', BHP: 45.15, CBA: 108.00, CSL: 286.50 },
      { time: '12:00', BHP: 45.08, CBA: 107.90, CSL: 285.80 },
      { time: '13:00', BHP: 45.20, CBA: 108.20, CSL: 287.00 },
      { time: '14:00', BHP: 45.18, CBA: 108.30, CSL: 286.80 },
      { time: '15:00', BHP: 45.23, CBA: 108.45, CSL: 287.50 },
    ],
    '1W': [
      { day: 'Mon', BHP: 44.50, CBA: 106.20, CSL: 282.00 },
      { day: 'Tue', BHP: 44.80, CBA: 107.00, CSL: 284.50 },
      { day: 'Wed', BHP: 45.00, CBA: 107.50, CSL: 285.80 },
      { day: 'Thu', BHP: 45.15, CBA: 108.00, CSL: 286.90 },
      { day: 'Fri', BHP: 45.23, CBA: 108.45, CSL: 287.50 },
    ],
    '1M': [
      { week: 'W1', BHP: 43.20, CBA: 104.50, CSL: 278.00 },
      { week: 'W2', BHP: 44.10, CBA: 106.00, CSL: 282.50 },
      { week: 'W3', BHP: 44.80, CBA: 107.20, CSL: 285.00 },
      { week: 'W4', BHP: 45.23, CBA: 108.45, CSL: 287.50 },
    ],
  };

  const intradayData = intradayDataByPeriod[timePeriod];

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = () => {
    if (isLiveMode) {
      fetchRealTimeData();
    } else {
      setIsRefreshing(true);
      showNotification('Demo data refreshed!', 'info');
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const toggleLiveMode = () => {
    if (!isLiveMode) {
      fetchRealTimeData();
    } else {
      setIsLiveMode(false);
      setRealTimeData([]);
      showNotification('Switched to demo mode', 'info');
    }
  };

  const toggleWatchlist = (symbol) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(watchlist.filter(s => s !== symbol));
      showNotification(`${symbol} removed from watchlist`, 'info');
    } else {
      setWatchlist([...watchlist, symbol]);
      showNotification(`${symbol} added to watchlist`);
    }
  };

  const addAlert = (symbol, price, type) => {
    const newAlert = { id: Date.now(), symbol, price, type };
    setAlerts([...alerts, newAlert]);
    showNotification(`Alert set for ${symbol} at $${price.toFixed(2)}`);
    setShowAlertForm(false);
  };

  const removeAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
    showNotification('Alert removed', 'info');
  };

  const executeTrade = (symbol, action, quantity) => {
    const stock = allStocks.find(s => s.symbol === symbol);
    const trade = {
      id: Date.now(),
      symbol,
      action,
      quantity,
      price: stock.currentPrice,
      total: stock.currentPrice * quantity,
      timestamp: new Date().toLocaleString(),
    };
    setPortfolio([...portfolio, trade]);
    showNotification(`${action} ${quantity} ${symbol} @ $${stock.currentPrice}`);
    setSelectedStock(null);
  };

  const toggleCompareStock = (symbol) => {
    if (selectedForCompare.includes(symbol)) {
      setSelectedForCompare(selectedForCompare.filter(s => s !== symbol));
    } else if (selectedForCompare.length < 3) {
      setSelectedForCompare([...selectedForCompare, symbol]);
    } else {
      showNotification('Maximum 3 stocks for comparison', 'warning');
    }
  };

  const portfolioValue = portfolio.reduce((acc, trade) => {
    const multiplier = trade.action === 'BUY' ? -1 : 1;
    return acc + (trade.total * multiplier);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500' :
          notification.type === 'warning' ? 'bg-amber-500' :
          'bg-cyan-500'
        }`}>
          <Check className="w-5 h-5" />
          {notification.message}
        </div>
      )}

      {showAPINotice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full p-6 border border-slate-700">
            <div className="flex items-start gap-4 mb-4">
              <AlertCircle className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Real-Time Data Setup Required</h2>
                <p className="text-slate-300 mb-4">
                  To enable live market data, you need a free API key from Alpha Vantage:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 mb-4">
                  <li>Go to <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">alphavantage.co</a> and get your free API key</li>
                  <li>Open <code className="bg-slate-900 px-2 py-1 rounded">src/api.js</code></li>
                  <li>Replace <code className="bg-slate-900 px-2 py-1 rounded">YOUR_API_KEY_HERE</code> with your actual key</li>
                  <li>Save the file and refresh the dashboard</li>
                </ol>
                <div className="bg-slate-900 p-4 rounded mb-4">
                  <p className="text-sm text-slate-400 mb-2">Free Tier Limits:</p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• 25 API requests per day</li>
                    <li>• 5 requests per minute</li>
                    <li>• Auto-refresh every 5 minutes</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAPINotice(false)}
              className="w-full px-4 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold"
            >
              Continue with Demo Mode
            </button>
          </div>
        </div>
      )}

      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  ASX Day Trading Dashboard
                </h1>
                <p className="text-sm text-slate-400">AI-Powered Technical Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLiveMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLiveMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title={isLiveMode ? 'Live Mode Active' : 'Demo Mode'}
              >
                {isLiveMode ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isLiveMode ? 'LIVE' : 'DEMO'}
              </button>

              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedForCompare([]);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  compareMode ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                Compare
              </button>

              <div className="text-right">
                <div className="text-sm text-slate-400">
                  {isLiveMode && lastUpdate ? 
                    `Updated: ${lastUpdate.toLocaleTimeString()}` : 
                    'ASX Market Time'}
                </div>
                <div className="text-lg font-semibold">{currentTime.toLocaleTimeString()}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-400">Filter:</span>
            </div>
            {['all', 'bullish', 'bearish'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  filter === f
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-slate-400">Period:</span>
              {['1D', '1W', '1M'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    timePeriod === period
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="mb-6 bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-4 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-cyan-400 font-semibold">Fetching live market data...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">{avgAccuracy.toFixed(1)}%</span>
            </div>
            <div className="text-sm text-slate-400">Avg Accuracy</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400">
                {allStocks.filter(s => s.prediction === 'Bullish').length}
              </span>
            </div>
            <div className="text-sm text-slate-400">Bullish Signals</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-rose-400" />
              <span className="text-2xl font-bold text-rose-400">
                {allStocks.filter(s => s.prediction === 'Bearish').length}
              </span>
            </div>
            <div className="text-sm text-slate-400">Bearish Signals</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-amber-400" />
              <span className="text-2xl font-bold text-amber-400">{watchlist.length}</span>
            </div>
            <div className="text-sm text-slate-400">Watchlist</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-400" />
              <span className={`text-2xl font-bold ${portfolioValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${Math.abs(portfolioValue).toFixed(0)}
              </span>
            </div>
            <div className="text-sm text-slate-400">Portfolio P&L</div>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mb-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold">Active Alerts</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-slate-900/50 rounded p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{alert.symbol}</span>
                    <span className="text-slate-400 text-sm ml-2">
                      {alert.type} ${alert.price.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold">High Probability Gainers</h2>
              {compareMode && (
                <span className="ml-auto text-sm text-cyan-400">
                  Select up to 3 stocks to compare
                </span>
              )}
            </div>
            <div className="space-y-4">
              {filteredStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className={`bg-slate-900/50 rounded-lg p-4 border transition-all cursor-pointer ${
                    compareMode && selectedForCompare.includes(stock.symbol)
                      ? 'border-cyan-400'
                      : 'border-slate-700/30 hover:border-slate-600/50'
                  }`}
                  onClick={() => {
                    if (compareMode) {
                      toggleCompareStock(stock.symbol);
                    } else {
                      setSelectedStock(stock);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{stock.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          stock.prediction === 'Bullish' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {stock.prediction}
                        </span>
                        {watchlist.includes(stock.symbol) && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <div className="text-sm text-slate-400">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${stock.currentPrice.toFixed(2)}</div>
                      <div className={`text-sm font-semibold ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Target Price</div>
                      <div className="font-semibold">${stock.targetPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Confidence</div>
                      <div className="font-semibold">{stock.confidence}%</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="w-full bg-slate-700/30 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          stock.prediction === 'Bullish' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${stock.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">Accuracy - {timePeriod}</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey={timePeriod === '1D' ? 'time' : timePeriod === '1W' ? 'day' : 'week'} 
                  stroke="#94a3b8" 
                />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                />
                <Bar dataKey="accuracy" fill="#34d399" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{avgAccuracy.toFixed(1)}%</div>
              <div className="text-sm text-slate-400">Average Accuracy</div>
            </div>
          </div>
        </div>

        {compareMode && selectedForCompare.length > 0 && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <GitCompare className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">Stock Comparison - {timePeriod}</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={intradayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey={timePeriod === '1D' ? 'time' : timePeriod === '1W' ? 'day' : 'week'} 
                  stroke="#94a3b8" 
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                {selectedForCompare.map((symbol, index) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={['#34d399', '#60a5fa', '#a78bfa'][index]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {portfolio.length > 0 && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold">Paper Trading Portfolio</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="text-left py-3">Time</th>
                    <th className="text-left py-3">Action</th>
                    <th className="text-left py-3">Symbol</th>
                    <th className="text-right py-3">Qty</th>
                    <th className="text-right py-3">Price</th>
                    <th className="text-right py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.slice().reverse().map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-700/50">
                      <td className="py-3">{trade.timestamp}</td>
                      <td className={`py-3 font-semibold ${trade.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.action}
                      </td>
                      <td className="py-3 font-semibold">{trade.symbol}</td>
                      <td className="text-right py-3">{trade.quantity}</td>
                      <td className="text-right py-3">${trade.price.toFixed(2)}</td>
                      <td className="text-right py-3">${trade.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>This dashboard displays AI-generated predictions for educational purposes only.</p>
          <p className="mt-1">Not financial advice. Always conduct your own research before trading.</p>
          {isLiveMode && (
            <p className="mt-2 text-emerald-400">
              <Wifi className="w-4 h-4 inline mr-1" />
              Live market data • Auto-refreshes every 5 minutes
            </p>
          )}
        </div>
      </div>

      {selectedStock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold">{selectedStock.symbol}</h2>
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      selectedStock.prediction === 'Bullish' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {selectedStock.prediction}
                    </span>
                  </div>
                  <p className="text-slate-400">{selectedStock.name}</p>
                </div>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Current Price</div>
                  <div className="text-2xl font-bold">${selectedStock.currentPrice.toFixed(2)}</div>
                  <div className={`text-sm font-semibold ${selectedStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Target Price</div>
                  <div className="text-2xl font-bold">${selectedStock.targetPrice.toFixed(2)}</div>
                  <div className="text-sm text-slate-400">
                    {selectedStock.confidence}% confidence
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Volume</div>
                  <div className="text-xl font-bold">{selectedStock.volume}</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Market Cap</div>
                  <div className="text-xl font-bold">${selectedStock.marketCap}</div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => toggleWatchlist(selectedStock.symbol)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    watchlist.includes(selectedStock.symbol)
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <Star className={`w-5 h-5 ${watchlist.includes(selectedStock.symbol) ? 'fill-white' : ''}`} />
                  {watchlist.includes(selectedStock.symbol) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </button>

                <button
                  onClick={() => setShowAlertForm(!showAlertForm)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  Set Price Alert
                </button>

                {showAlertForm && (
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => addAlert(selectedStock.symbol, selectedStock.currentPrice * 1.05, 'Above')}
                        className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold"
                      >
                        Alert +5%
                      </button>
                      <button
                        onClick={() => addAlert(selectedStock.symbol, selectedStock.currentPrice * 0.95, 'Below')}
                        className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-lg text-sm font-semibold"
                      >
                        Alert -5%
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => executeTrade(selectedStock.symbol, 'BUY', 100)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Buy 100
                  </button>
                  <button
                    onClick={() => executeTrade(selectedStock.symbol, 'SELL', 100)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-600 rounded-lg font-semibold transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                    Sell 100
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
