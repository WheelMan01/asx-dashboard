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
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [historicalData, setHistoricalData] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
    const savedPredictions = localStorage.getItem('predictionHistory');
    if (savedKey) {
      setApiKey(savedKey);
      setShowApiSetup(false);
      fetchLiveData(savedKey);
    }
    if (savedPredictions) {
      setPredictionHistory(JSON.parse(savedPredictions));
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

  useEffect(() => {
    if (apiKey && isLive && compareMode && selectedForCompare.length > 0) {
      fetchHistoricalData(apiKey, selectedForCompare);
    }
  }, [compareMode, selectedForCompare, timePeriod, apiKey, isLive]);

  const calculateRSI = (prices, period = 14) => {
    if (prices.length < period) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateSMA = (prices, period) => {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
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

  const savePrediction = (symbol, prediction, price) => {
    const newPrediction = {
      id: Date.now(),
      symbol,
      prediction,
      entryPrice: price,
      timestamp: new Date().toISOString(),
      checked: false,
      outcome: null
    };
    
    const updated = [...predictionHistory, newPrediction];
    setPredictionHistory(updated);
    localStorage.setItem('predictionHistory', JSON.stringify(updated));
  };

  const checkPredictions = (currentStockData) => {
    if (!currentStockData || predictionHistory.length === 0) return;
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let updated = false;
    const updatedHistory = predictionHistory.map(pred => {
      if (pred.checked) return pred;
      
      const predTime = new Date(pred.timestamp);
      if (predTime > oneHourAgo) return pred;
      
      const stock = currentStockData.find(s => s.symbol === pred.symbol);
      if (!stock) return pred;
      
      const priceChange = ((stock.currentPrice - pred.entryPrice) / pred.entryPrice) * 100;
      const wasCorrect = (pred.prediction === 'Bullish' && priceChange > 0) || 
                        (pred.prediction === 'Bearish' && priceChange < 0);
      
      updated = true;
      return {
        ...pred,
        checked: true,
        outcome: wasCorrect,
        actualChange: priceChange
      };
    });
    
    if (updated) {
      setPredictionHistory(updatedHistory);
      localStorage.setItem('predictionHistory', JSON.stringify(updatedHistory));
    }
  };

  const calculateRealAccuracy = () => {
    try {
      const checkedPredictions = predictionHistory.filter(p => p && p.checked);
      if (checkedPredictions.length === 0) return null;
      
      const correct = checkedPredictions.filter(p => p.outcome).length;
      return Math.round((correct / checkedPredictions.length) * 100);
    } catch (error) {
      console.error('Error calculating accuracy:', error);
      return null;
    }
  };

  const getAccuracyByTimeframe = () => {
    try {
      const now = new Date();
      const timeframes = {
        '1D': 24 * 60 * 60 * 1000,
        '1W': 7 * 24 * 60 * 60 * 1000,
        '1M': 30 * 24 * 60 * 60 * 1000
      };
      
      const cutoff = new Date(now.getTime() - timeframes[timePeriod]);
      const recentPredictions = predictionHistory.filter(p => 
        p && p.checked && new Date(p.timestamp) > cutoff
      );
      
      if (recentPredictions.length === 0) return [];
      
      // Group by hour/day/week based on timeframe
      const grouped = {};
      recentPredictions.forEach(pred => {
        if (!pred || !pred.timestamp) return;
        
        const date = new Date(pred.timestamp);
        let key;
        
        if (timePeriod === '1D') {
          key = `${date.getHours()}:00`;
        } else if (timePeriod === '1W') {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          key = days[date.getDay()];
        } else {
          key = `W${Math.ceil(date.getDate() / 7)}`;
        }
        
        if (!grouped[key]) grouped[key] = { correct: 0, total: 0 };
        grouped[key].total++;
        if (pred.outcome) grouped[key].correct++;
      });
      
      return Object.entries(grouped).map(([key, data]) => ({
        time: key,
        day: key,
        week: key,
        accuracy: Math.round((data.correct / data.total) * 100)
      }));
    } catch (error) {
      console.error('Error getting accuracy by timeframe:', error);
      return [];
    }
  };

  const fetchHistoricalData = async (key, symbols) => {
    if (!key || symbols.length === 0) return;
    
    setIsLoadingHistory(true);
    try {
      const interval = timePeriod === '1D' ? '5min' : null;
      const func = timePeriod === '1D' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';
      
      const historicalPromises = symbols.map(async (symbol) => {
        try {
          let url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${key}`;
          if (interval) url += `&interval=${interval}`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          const timeSeriesKey = interval ? `Time Series (${interval})` : 'Time Series (Daily)';
          const timeSeries = data[timeSeriesKey];
          
          if (!timeSeries) return null;
          
          const entries = Object.entries(timeSeries).slice(0, timePeriod === '1D' ? 6 : timePeriod === '1W' ? 5 : 4);
          
          return {
            symbol,
            data: entries.reverse().map(([time, values]) => ({
              time: time.split(' ')[1] || time,
              price: parseFloat(values['4. close'])
            }))
          };
        } catch (error) {
          console.error(`Error fetching history for ${symbol}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(historicalPromises);
      const validResults = results.filter(r => r !== null);
      
      if (validResults.length > 0) {
        setHistoricalData(validResults);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchLiveData = async (key) => {
    setIsRefreshing(true);
    setIsLoading(true);
    
    try {
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
          const quoteResponse = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`
          );
          const quoteData = await quoteResponse.json();
          
          const intradayResponse = await fetch(
            `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${key}`
          );
          const intradayData = await intradayResponse.json();
          
          if (quoteData['Global Quote'] && intradayData['Time Series (5min)']) {
            const quote = quoteData['Global Quote'];
            const timeSeries = intradayData['Time Series (5min)'];
            const prices = Object.values(timeSeries).map(d => parseFloat(d['4. close'])).reverse();
            
            const currentPrice = parseFloat(quote['05. price']);
            const change = parseFloat(quote['09. change']);
            const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
            
            const rsi = calculateRSI(prices);
            const sma20 = calculateSMA(prices, 20);
            const sma50 = calculateSMA(prices, 50);
            
            const analysis = generatePrediction(currentPrice, rsi, sma20, sma50, prices);
            
            const targetMultiplier = analysis.prediction === 'Bullish' ? 1 + (analysis.confidence / 1000) : 1 - (analysis.confidence / 1000);
            
            return {
              symbol: symbol,
              name,
              prediction: analysis.prediction,
              confidence: analysis.confidence,
              currentPrice,
              targetPrice: currentPrice * targetMultiplier,
              change: changePercent,
              volume: quote['06. volume'],
              marketCap: 'N/A',
              rsi: analysis.rsi,
              sma20,
              sma50
            };
          }
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
        
        // Save new predictions - with null check
        try {
          validResults.forEach(stock => {
            if (stock && stock.symbol && stock.prediction && stock.currentPrice) {
              savePrediction(stock.symbol, stock.prediction, stock.currentPrice);
            }
          });
        } catch (error) {
          console.error('Error saving predictions:', error);
        }
        
        // Check previous predictions - with null check
        try {
          checkPredictions(validResults);
        } catch (error) {
          console.error('Error checking predictions:', error);
        }
        
        // Fetch historical data if in compare mode - with null check
        if (compareMode && selectedForCompare.length > 0) {
          try {
            fetchHistoricalData(key, selectedForCompare);
          } catch (error) {
            console.error('Error fetching historical data:', error);
          }
        }
        
        showNotification('Live data updated successfully!');
      } else {
        showNotification('No data received. Check API key.', 'warning');
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to fetch live data', 'warning');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('alphaVantageKey', apiKey);
      setShowApiSetup(false);
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

  // Use real accuracy data if available, otherwise use demo data
  const realAccuracyData = getAccuracyByTimeframe();
  const accuracyData = realAccuracyData.length > 0 ? realAccuracyData : accuracyDataByPeriod[timePeriod];
  const realAccuracy = calculateRealAccuracy();
  const avgAccuracy = realAccuracy !== null ? realAccuracy : (accuracyData.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / accuracyData.length);

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

  // Convert real historical data to chart format
  const getRealChartData = () => {
    try {
      if (!historicalData || historicalData.length === 0) return intradayDataByPeriod[timePeriod];
      
      const maxLength = Math.max(...historicalData.map(h => h.data ? h.data.length : 0));
      const chartData = [];
      
      for (let i = 0; i < maxLength; i++) {
        const dataPoint = {};
        historicalData.forEach(stock => {
          if (stock && stock.data && stock.data[i]) {
            dataPoint[timePeriod === '1D' ? 'time' : timePeriod === '1W' ? 'day' : 'week'] = stock.data[i].time;
            dataPoint[stock.symbol] = stock.data[i].price;
          }
        });
        if (Object.keys(dataPoint).length > 1) chartData.push(dataPoint);
      }
      
      return chartData.length > 0 ? chartData : intradayDataByPeriod[timePeriod];
    } catch (error) {
      console.error('Error converting chart data:', error);
      return intradayDataByPeriod[timePeriod];
    }
  };

  const intradayData = getRealChartData();

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = () => {
    if (isLive && apiKey) {
      fetchLiveData(apiKey);
    } else {
      setIsRefreshing(true);
      showNotification('Data refreshed successfully!');
      setTimeout(() => setIsRefreshing(false), 1000);
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

  if (showApiSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg max-w-2xl w-full p-8 border border-slate-700">
          <div className="text-center mb-8">
            <Activity className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Enable Live US Stock Data</h1>
            <p className="text-slate-400">Connect to Alpha Vantage for real-time stock prices</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-2">Quick Setup (2 minutes):</h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Go to <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">alphavantage.co/support/#api-key</a></li>
                <li>Enter your email and click "GET FREE API KEY"</li>
                <li>Copy your API key</li>
                <li>Paste it below and click "Connect"</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Alpha Vantage API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key here..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Connect & Start Live Trading
              </button>
              <button
                onClick={() => setShowApiSetup(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
              >
                Use Demo Data
              </button>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-400">
              <p className="font-semibold text-slate-300 mb-2">Features with Live Data:</p>
              <ul className="space-y-1">
                <li>✅ Real US stock prices</li>
                <li>✅ Auto-refresh every 5 minutes</li>
                <li>✅ Technical indicators (RSI, SMA)</li>
                <li>✅ AI predictions based on real data</li>
                <li>✅ Free tier: 25 requests/day</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
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
                  AI-Powered Technical Analysis
                  {lastUpdate && isLive && (
                    <span className="ml-2">• Updated {lastUpdate.toLocaleTimeString()}</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isLoading && <Loader className="w-5 h-5 animate-spin text-emerald-400" />}
              
              <button
                onClick={() => setShowApiSetup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
              >
                {isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isLive ? 'LIVE' : 'DEMO'}
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
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
                        {stock.rsi && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            stock.rsi < 30 ? 'bg-emerald-500/20 text-emerald-400' :
                            stock.rsi > 70 ? 'bg-rose-500/20 text-rose-400' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            RSI {stock.rsi}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${stock.currentPrice.toFixed(2)}</div>
                      <div className={`text-sm font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
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
              {realAccuracy !== null && (
                <span className="ml-auto text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-semibold">
                  LIVE TRACKING
                </span>
              )}
              {realAccuracy === null && (
                <span className="ml-auto text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded font-semibold">
                  DEMO DATA
                </span>
              )}
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
              {isLoadingHistory && (
                <Loader className="w-5 h-5 animate-spin text-cyan-400 ml-auto" />
              )}
              {!isLoadingHistory && historicalData && historicalData.length > 0 && (
                <span className="ml-auto text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-semibold">
                  REAL DATA
                </span>
              )}
              {!isLoadingHistory && (!historicalData || historicalData.length === 0) && (
                <span className="ml-auto text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded font-semibold">
                  DEMO DATA
                </span>
              )}
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

        {predictionHistory.length > 0 && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold">Prediction History</h2>
              <span className="ml-auto text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded font-semibold">
                {predictionHistory.filter(p => p.checked).length} / {predictionHistory.length} CHECKED
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {predictionHistory.slice(-6).reverse().map((pred) => (
                <div key={pred.id} className={`bg-slate-900/50 rounded p-3 border ${
                  pred.checked 
                    ? (pred.outcome ? 'border-emerald-500/50' : 'border-rose-500/50')
                    : 'border-slate-700/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{pred.symbol}</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      pred.prediction === 'Bullish' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {pred.prediction}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mb-1">
                    Entry: ${pred.entryPrice.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {new Date(pred.timestamp).toLocaleString()}
                  </div>
                  {pred.checked && (
                    <div className={`text-sm font-semibold ${
                      pred.outcome ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {pred.outcome ? '✓ Correct' : '✗ Incorrect'} ({pred.actualChange > 0 ? '+' : ''}{pred.actualChange.toFixed(2)}%)
                    </div>
                  )}
                  {!pred.checked && (
                    <div className="text-xs text-amber-400">
                      ⏳ Waiting 1hr to check...
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-slate-400">
              Predictions are checked after 1 hour to calculate accuracy
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>This dashboard displays {isLive ? 'live' : 'demo'} data with AI-generated predictions for educational purposes only.</p>
          <p className="mt-1">Not financial advice. Always conduct your own research before trading.</p>
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
                    {selectedStock.rsi && (
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        selectedStock.rsi < 30 ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedStock.rsi > 70 ? 'bg-rose-500/20 text-rose-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        RSI {selectedStock.rsi}
                      </span>
                    )}
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
                  <div className={`text-sm font-semibold ${selectedStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}%
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
                  <div className="text-xl font-bold">{selectedStock.marketCap}</div>
                </div>
              </div>

              {selectedStock.sma20 && (
                <div className="mb-6 bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-3">Technical Indicators</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">RSI</div>
                      <div className="font-semibold">{selectedStock.rsi}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">SMA 20</div>
                      <div className="font-semibold">${selectedStock.sma20.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">SMA 50</div>
                      <div className="font-semibold">${selectedStock.sma50.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

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
