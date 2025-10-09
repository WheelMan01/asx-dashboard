import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Calendar, RefreshCw, Filter, Star, Bell, DollarSign, GitCompare, X, Plus, Minus, Check, Wifi, WifiOff, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedStock, setSelectedStock] = useState(null);
  const [filter, setFilter] = useState('all');
  const [watchlist, setWatchlist] = useState(['AAPL', 'MSFT']);
  const [timePeriod, setTimePeriod] = useState('1D');
  const [alerts, setAlerts] = useState([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiSetup, setShowApiSetup] = useState(true);
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Market status helper function
  const getMarketStatus = () => {
    const now = new Date();
    const usEastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = usEastern.getHours();
    const minutes = usEastern.getMinutes();
    const day = usEastern.getDay();
    
    // Weekend
    if (day === 0 || day === 6) {
      return { status: 'Closed', color: 'rose', label: 'Weekend' };
    }
    
    const timeInMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    const preMarketStart = 4 * 60; // 4:00 AM
    const afterHoursEnd = 20 * 60; // 8:00 PM
    
    if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
      return { status: 'Open', color: 'emerald', label: 'Market Open' };
    } else if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) {
      return { status: 'Pre-Market', color: 'amber', label: 'Pre-Market' };
    } else if (timeInMinutes >= marketClose && timeInMinutes < afterHoursEnd) {
      return { status: 'After-Hours', color: 'amber', label: 'After-Hours' };
    } else {
      return { status: 'Closed', color: 'rose', label: 'Market Closed' };
    }
  };

  const marketStatus = getMarketStatus();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedKey = localStorage.getItem('alphaVantageKey');
    if (savedKey) {
      setApiKey(savedKey);
      setShowApiSetup(false);
      fetchLiveData(savedKey);
    }
  }, []);

  useEffect(() => {
    if (apiKey && isLive) {
      const interval = setInterval(() => {
        fetchLiveData(apiKey);
      }, 300000);
      return () => clearInterval(interval);
    }
  }, [apiKey, isLive]);

  const calculateSMA = (prices, period) => {
    if (prices.length < period) return prices[prices.length - 1];
    const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
    return sum / period;
  };

  const calculateRSI = (prices, period = 14) => {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const difference = prices[i - 1] - prices[i];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  };

  const generatePrediction = (currentPrice, rsi, sma20, sma50, recentPrices) => {
    let bullishSignals = 0;
    let bearishSignals = 0;
    
    if (rsi < 30) bullishSignals += 2;
    else if (rsi > 70) bearishSignals += 2;
    else if (rsi > 40 && rsi < 60) bullishSignals += 1;
    
    if (currentPrice > sma20) bullishSignals += 1;
    else bearishSignals += 1;
    
    if (sma20 > sma50) bullishSignals += 1;
    else bearishSignals += 1;
    
    const momentum = ((currentPrice - recentPrices[0]) / recentPrices[0]) * 100;
    if (momentum > 2) bullishSignals += 1;
    else if (momentum < -2) bearishSignals += 1;
    
    const totalSignals = bullishSignals + bearishSignals;
    const confidence = Math.round((Math.max(bullishSignals, bearishSignals) / totalSignals) * 100);
    
    return {
      prediction: bullishSignals > bearishSignals ? 'Bullish' : 'Bearish',
      confidence: Math.min(confidence, 95),
      rsi: Math.round(rsi)
    };
  };

  const fetchLiveData = async (key) => {
    try {
      setIsLoading(true);
      
      const symbols = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'TSLA', name: 'Tesla Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation' },
        { symbol: 'META', name: 'Meta Platforms' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      ];

      const stockPromises = symbols.map(async ({ symbol, name }) => {
        try {
          const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`;
          const quoteResponse = await fetch(quoteUrl);
          const quoteData = await quoteResponse.json();
          
          if (!quoteData['Global Quote'] || Object.keys(quoteData['Global Quote']).length === 0) {
            console.warn(`No data for ${symbol}`);
            return null;
          }

          const quote = quoteData['Global Quote'];
          const currentPrice = parseFloat(quote['05. price']);
          const change = parseFloat(quote['09. change']);
          const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
          const volume = quote['06. volume'];

          await new Promise(resolve => setTimeout(resolve, 12000));

          const dailyUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${key}`;
          const dailyResponse = await fetch(dailyUrl);
          const dailyData = await dailyResponse.json();

          if (!dailyData['Time Series (Daily)']) {
            console.warn(`No daily data for ${symbol}`);
            return null;
          }

          const timeSeries = dailyData['Time Series (Daily)'];
          const dates = Object.keys(timeSeries).slice(0, 50);
          const prices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

          const rsi = calculateRSI(prices);
          const sma20 = calculateSMA(prices, 20);
          const sma50 = calculateSMA(prices, 50);

          const predictionData = generatePrediction(currentPrice, rsi, sma20, sma50, prices);

          const targetMultiplier = predictionData.prediction === 'Bullish' ? 1.05 : 0.95;
          const targetPrice = currentPrice * targetMultiplier;

          const formatVolume = (vol) => {
            const num = parseInt(vol);
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
            return num.toString();
          };

          const formatMarketCap = () => {
            const caps = {
              'AAPL': '2.8T', 'MSFT': '2.8T', 'GOOGL': '1.8T',
              'TSLA': '771B', 'NVDA': '1.2T', 'META': '894B', 'AMZN': '1.4T'
            };
            return caps[symbol] || 'N/A';
          };

          return {
            symbol: symbol,
            name,
            prediction: predictionData.prediction,
            confidence: predictionData.confidence,
            currentPrice: currentPrice,
            targetPrice: parseFloat(targetPrice.toFixed(2)),
            change: changePercent,
            volume: formatVolume(volume),
            marketCap: formatMarketCap(),
            rsi: predictionData.rsi
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(stockPromises);
      const validResults = results.filter(r => r !== null);
      
      if (validResults.length > 0) {
        setStockData(validResults);
        setIsLive(true);
        setLastUpdate(new Date());
        showNotification('Live data updated successfully!');
      } else {
        showNotification('No data received. Check API key or try again later.', 'warning');
        setIsLive(false);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      showNotification('Failed to fetch data. Using demo mode.', 'error');
      setIsLive(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApiSubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('alphaVantageKey', apiKey);
      setShowApiSetup(false);
      fetchLiveData(apiKey);
    }
  };

  const handleDemoMode = () => {
    setShowApiSetup(false);
    setIsLive(false);
  };

  const handleManualRefresh = () => {
    if (apiKey && !isRefreshing) {
      setIsRefreshing(true);
      fetchLiveData(apiKey);
    }
  };

  const allStocks = stockData || [
    { symbol: 'AAPL', name: 'Apple Inc.', prediction: 'Bullish', confidence: 87, currentPrice: 178.23, targetPrice: 185.50, change: 2.8, volume: '52.5M', marketCap: '2.8T', rsi: 62 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', prediction: 'Bullish', confidence: 82, currentPrice: 378.45, targetPrice: 390.30, change: 1.5, volume: '28.2M', marketCap: '2.8T', rsi: 58 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', prediction: 'Bullish', confidence: 79, currentPrice: 142.50, targetPrice: 148.80, change: 2.1, volume: '21.1M', marketCap: '1.8T', rsi: 55 },
    { symbol: 'TSLA', name: 'Tesla Inc.', prediction: 'Bullish', confidence: 75, currentPrice: 242.80, targetPrice: 255.40, change: 4.3, volume: '85.3M', marketCap: '771B', rsi: 68 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', prediction: 'Bullish', confidence: 90, currentPrice: 495.22, targetPrice: 520.00, change: 5.8, volume: '45.8M', marketCap: '1.2T', rsi: 72 },
    { symbol: 'META', name: 'Meta Platforms', prediction: 'Bullish', confidence: 68, currentPrice: 352.15, targetPrice: 365.80, change: 1.9, volume: '19.7M', marketCap: '894B', rsi: 51 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', prediction: 'Bearish', confidence: 65, currentPrice: 138.20, targetPrice: 132.50, change: -2.1, volume: '46.4M', marketCap: '1.4T', rsi: 38 },
  ];

  const filteredStocks = allStocks.filter(stock => {
    if (filter === 'bullish') return stock.prediction === 'Bullish';
    if (filter === 'bearish') return stock.prediction === 'Bearish';
    return true;
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleWatchlist = (symbol) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(watchlist.filter(s => s !== symbol));
      showNotification(`Removed ${symbol} from watchlist`);
    } else {
      setWatchlist([...watchlist, symbol]);
      showNotification(`Added ${symbol} to watchlist`);
    }
  };

  const addAlert = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newAlert = {
      id: Date.now(),
      symbol: formData.get('symbol'),
      price: parseFloat(formData.get('price')),
      condition: formData.get('condition'),
    };
    setAlerts([...alerts, newAlert]);
    setShowAlertForm(false);
    showNotification(`Alert set for ${newAlert.symbol}`);
  };

  const executeTrade = (stock, type) => {
    const shares = prompt(`How many shares of ${stock.symbol} would you like to ${type}?`);
    if (shares && parseInt(shares) > 0) {
      const trade = {
        id: Date.now(),
        symbol: stock.symbol,
        type,
        shares: parseInt(shares),
        price: stock.currentPrice,
        total: stock.currentPrice * parseInt(shares),
        date: new Date().toLocaleDateString(),
      };
      
      if (type === 'buy') {
        const existing = portfolio.find(p => p.symbol === stock.symbol);
        if (existing) {
          const newAvgPrice = ((existing.avgPrice * existing.shares) + trade.total) / (existing.shares + trade.shares);
          setPortfolio(portfolio.map(p => 
            p.symbol === stock.symbol 
              ? { ...p, shares: p.shares + trade.shares, avgPrice: newAvgPrice }
              : p
          ));
        } else {
          setPortfolio([...portfolio, {
            symbol: stock.symbol,
            name: stock.name,
            shares: trade.shares,
            avgPrice: trade.price,
          }]);
        }
        showNotification(`Bought ${shares} shares of ${stock.symbol}`);
      } else {
        const existing = portfolio.find(p => p.symbol === stock.symbol);
        if (existing && existing.shares >= trade.shares) {
          setPortfolio(portfolio.map(p => 
            p.symbol === stock.symbol 
              ? { ...p, shares: p.shares - trade.shares }
              : p
          ).filter(p => p.shares > 0));
          showNotification(`Sold ${shares} shares of ${stock.symbol}`);
        } else {
          showNotification(`Insufficient shares of ${stock.symbol}`, 'error');
        }
      }
    }
  };

  const toggleCompare = (symbol) => {
    if (selectedForCompare.includes(symbol)) {
      setSelectedForCompare(selectedForCompare.filter(s => s !== symbol));
    } else if (selectedForCompare.length < 3) {
      setSelectedForCompare([...selectedForCompare, symbol]);
    }
  };

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
      { time: '10:00', AAPL: 175.10, MSFT: 375.80, GOOGL: 140.20 },
      { time: '11:00', AAPL: 176.15, MSFT: 376.00, GOOGL: 141.50 },
      { time: '12:00', AAPL: 177.08, MSFT: 376.90, GOOGL: 141.80 },
      { time: '13:00', AAPL: 177.20, MSFT: 377.20, GOOGL: 142.00 },
      { time: '14:00', AAPL: 177.18, MSFT: 378.30, GOOGL: 142.80 },
      { time: '15:00', AAPL: 178.23, MSFT: 378.45, GOOGL: 142.50 },
    ],
    '1W': [
      { day: 'Mon', AAPL: 172.50, MSFT: 370.20, GOOGL: 138.00 },
      { day: 'Tue', AAPL: 174.80, MSFT: 373.00, GOOGL: 139.50 },
      { day: 'Wed', AAPL: 176.00, MSFT: 375.50, GOOGL: 140.80 },
      { day: 'Thu', AAPL: 177.15, MSFT: 377.00, GOOGL: 141.90 },
      { day: 'Fri', AAPL: 178.23, MSFT: 378.45, GOOGL: 142.50 },
    ],
    '1M': [
      { week: 'W1', AAPL: 165.20, MSFT: 360.50, GOOGL: 132.00 },
      { week: 'W2', AAPL: 170.10, MSFT: 365.00, GOOGL: 136.50 },
      { week: 'W3', AAPL: 174.80, MSFT: 372.20, GOOGL: 140.00 },
      { week: 'W4', AAPL: 178.23, MSFT: 378.45, GOOGL: 142.50 },
    ],
  };

  const intradayData = intradayDataByPeriod[timePeriod];

  const portfolioValue = portfolio.reduce((total, holding) => {
    const currentStock = allStocks.find(s => s.symbol === holding.symbol);
    return total + (currentStock ? currentStock.currentPrice * holding.shares : 0);
  }, 0);

  const portfolioPnL = portfolio.reduce((total, holding) => {
    const currentStock = allStocks.find(s => s.symbol === holding.symbol);
    if (!currentStock) return total;
    return total + ((currentStock.currentPrice - holding.avgPrice) * holding.shares);
  }, 0);

  if (showApiSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <Activity className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Enable Live US Stock Data</h1>
            <p className="text-slate-400">Connect to Alpha Vantage for real-time stock prices</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/50 rounded-lg p-6">
              <h3 className="font-bold text-emerald-400 mb-3">✅ With Live Data:</h3>
              <ul className="space-y-1">
                <li>✅ Real US stock prices</li>
                <li>✅ Auto-refresh every 5 minutes</li>
                <li>✅ Technical indicators (RSI, SMA)</li>
                <li>✅ AI predictions based on real data</li>
                <li>✅ Free tier: 25 requests/day</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6">
              <h3 className="font-bold text-amber-400 mb-3">Demo Mode:</h3>
              <ul className="space-y-1">
                <li>📊 Sample stock data</li>
                <li>🎮 All features functional</li>
                <li>💡 Perfect for testing</li>
                <li>⚡ Instant access</li>
                <li>🔄 Unlimited usage</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleApiSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Alpha Vantage API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-sm text-slate-500 mt-2">
                Get a free key at <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">alphavantage.co</a>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Connect & Start Live Trading
              </button>
              <button
                type="button"
                onClick={handleDemoMode}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
              >
                Use Demo Data
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-500' : 
          notification.type === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="mb-8 bg-slate-800/30 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    US Stock Trading Dashboard
                  </h1>
                  {isLive ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                      <Wifi className="w-3 h-3" />
                      LIVE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-slate-400 text-xs font-semibold">
                      <WifiOff className="w-3 h-3" />
                      DEMO
                    </div>
                  )}
                  <div className={`flex items-center gap-1 px-2 py-1 bg-${marketStatus.color}-500/20 rounded text-${marketStatus.color}-400 text-xs font-semibold`}>
                    <div className={`w-2 h-2 rounded-full bg-${marketStatus.color}-400 ${marketStatus.status === 'Open' ? 'animate-pulse' : ''}`}></div>
                    {marketStatus.status}
                  </div>
                </div>
                <p className="text-sm text-slate-400">
                  AI-Powered Technical Analysis • {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Demo Mode'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleManualRefresh}
                disabled={!isLive || isRefreshing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isLive && !isRefreshing
                    ? 'bg-cyan-500 hover:bg-cyan-600'
                    : 'bg-slate-700 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  compareMode ? 'bg-purple-500' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <GitCompare className="w-5 h-5" />
                Compare
              </button>

              <div className="text-right">
                <div className={`flex items-center gap-2 justify-end mb-1`}>
                  <div className={`w-2 h-2 rounded-full bg-${marketStatus.color}-400 animate-pulse`}></div>
                  <span className={`text-sm font-semibold text-${marketStatus.color}-400`}>
                    {marketStatus.label}
                  </span>
                </div>
                <div className="text-xs text-slate-400">US Eastern Time</div>
                <div className="text-base font-semibold">
                  {new Date().toLocaleTimeString('en-US', { 
                    timeZone: 'America/New_York',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Local: {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {isLoading && (
          <div className="text-center mb-8">
            <Loader className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-slate-400 mt-2">Fetching live market data...</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-8 h-8 text-emerald-400" />
              <div>
                <div className="text-3xl font-bold">{avgAccuracy.toFixed(1)}%</div>
                <div className="text-sm text-slate-400">Avg Accuracy</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <div>
                <div className="text-3xl font-bold">{filteredStocks.filter(s => s.prediction === 'Bullish').length}</div>
                <div className="text-sm text-slate-400">Bullish Signals</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-8 h-8 text-rose-400" />
              <div>
                <div className="text-3xl font-bold">{filteredStocks.filter(s => s.prediction === 'Bearish').length}</div>
                <div className="text-sm text-slate-400">Bearish Signals</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-3xl font-bold">{watchlist.length}</div>
                <div className="text-sm text-slate-400">Watchlist</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-3xl font-bold ${portfolioPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                  ${portfolioPnL >= 0 ? '' : '-'}${Math.abs(portfolioPnL).toFixed(0)}
                </div>
                <div className="text-sm text-slate-400">Portfolio P&L</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-400">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1 rounded text-sm font-semibold ${
                filter === 'all' ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('bullish')}
              className={`px-4 py-1 rounded text-sm font-semibold ${
                filter === 'bullish' ? 'bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              Bullish
            </button>
            <button
              onClick={() => setFilter('bearish')}
              className={`px-4 py-1 rounded text-sm font-semibold ${
                filter === 'bearish' ? 'bg-rose-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              Bearish
            </button>
          </div>
        </div>

        <div className="grid gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              High Probability Gainers
            </h2>
            <div className="space-y-3">
              {filteredStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="bg-slate-900/50 rounded-lg p-4 hover:bg-slate-900/70 transition-all cursor-pointer border border-slate-700/30"
                  onClick={() => setSelectedStock(stock)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{stock.symbol}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            stock.prediction === 'Bullish'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {stock.prediction}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(stock.symbol);
                          }}
                          className="p-1 hover:bg-slate-700 rounded"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              watchlist.includes(stock.symbol) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                            }`}
                          />
                        </button>
                        {compareMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(stock.symbol);
                            }}
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              selectedForCompare.includes(stock.symbol)
                                ? 'bg-purple-500'
                                : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                          >
                            {selectedForCompare.includes(stock.symbol) ? 'Selected' : 'Compare'}
                          </button>
                        )}
                        <span className="text-xs px-2 py-1 bg-slate-700 rounded">
                          RSI {stock.rsi}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{stock.name}</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold">${stock.currentPrice.toFixed(2)}</div>
                          <div className={`text-sm font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Target Price</div>
                          <div className="text-xl font-bold">${stock.targetPrice.toFixed(2)}</div>
                          <div className="text-xs text-slate-500">
                            {stock.prediction === 'Bullish' ? '+' : ''}{((stock.targetPrice - stock.currentPrice) / stock.currentPrice * 100).toFixed(1)}% potential
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-slate-400 mb-2">Confidence</div>
                      <div className="text-3xl font-bold mb-2">{stock.confidence}%</div>
                      <div className="w-24 bg-slate-700 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full ${
                            stock.prediction === 'Bullish' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${stock.confidence}%` }}
                        />
                      </div>
                      <div className="space-y-1 text-xs text-slate-400">
                        <div>Vol: {stock.volume}</div>
                        <div>MCap: {stock.marketCap}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeTrade(stock, 'buy');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 px-3 py-2 rounded font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Buy
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeTrade(stock, 'sell');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-rose-500 hover:bg-rose-600 px-3 py-2 rounded font-semibold text-sm"
                    >
                      <Minus className="w-4 h-4" />
                      Sell
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">Accuracy - {timePeriod}</h2>
            </div>
            <div className="flex gap-2 mb-4">
              {['1D', '1W', '1M'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-4 py-1 rounded text-sm font-semibold ${
                    timePeriod === period ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey={timePeriod === '1D' ? 'time' : timePeriod === '1W' ? 'day' : 'week'} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="accuracy" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{avgAccuracy.toFixed(1)}%</div>
              <div className="text-sm text-slate-400">Average Accuracy</div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">Paper Trading Portfolio</h2>
            </div>
            {portfolio.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No positions yet. Start trading!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolio.map((holding) => {
                  const currentStock = allStocks.find(s => s.symbol === holding.symbol);
                  const currentValue = currentStock ? currentStock.currentPrice * holding.shares : 0;
                  const pnl = currentValue - (holding.avgPrice * holding.shares);
                  const pnlPercent = (pnl / (holding.avgPrice * holding.shares)) * 100;

                  return (
                    <div key={holding.symbol} className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold">{holding.symbol}</div>
                          <div className="text-sm text-slate-400">{holding.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${currentValue.toFixed(2)}</div>
                          <div className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {holding.shares} shares @ ${holding.avgPrice.toFixed(2)} avg
                      </div>
                    </div>
                  );
                })}
                <div className="bg-slate-900/50 rounded-lg p-4 border-t-2 border-cyan-500">
                  <div className="flex justify-between items-center">
                    <div className="font-bold">Total Portfolio</div>
                    <div className="text-right">
                      <div className="text-xl font-bold">${portfolioValue.toFixed(2)}</div>
                      <div className={`text-sm font-semibold ${portfolioPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolioPnL >= 0 ? '+' : ''}${portfolioPnL.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <XAxis dataKey={timePeriod === '1D' ? 'time' : timePeriod === '1W' ? 'day' : 'week'} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                {selectedForCompare.map((symbol, index) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={['#10b981', '#06b6d4', '#8b5cf6'][index]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex gap-4 justify-center">
              {selectedForCompare.map((symbol, index) => (
                <div key={symbol} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6'][index] }}></div>
                  <span className="font-semibold">{symbol}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>⚠️ This is a demonstration dashboard. Not real financial advice. Do your own research.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
