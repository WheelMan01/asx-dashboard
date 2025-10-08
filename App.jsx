import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sample data for high probability gainers
  const topGainers = [
    { symbol: 'BHP', name: 'BHP Group', prediction: 'Bullish', confidence: 87, currentPrice: 45.23, targetPrice: 48.50, change: 7.2 },
    { symbol: 'CBA', name: 'Commonwealth Bank', prediction: 'Bullish', confidence: 82, currentPrice: 108.45, targetPrice: 112.30, change: 3.5 },
    { symbol: 'CSL', name: 'CSL Limited', prediction: 'Bullish', confidence: 79, currentPrice: 287.50, targetPrice: 295.80, change: 2.9 },
    { symbol: 'WES', name: 'Wesfarmers', prediction: 'Bullish', confidence: 75, currentPrice: 62.80, targetPrice: 65.40, change: 4.1 },
    { symbol: 'FMG', name: 'Fortescue Metals', prediction: 'Bearish', confidence: 71, currentPrice: 18.95, targetPrice: 17.20, change: -9.2 },
  ];

  // 7-day accuracy data
  const accuracyData = [
    { day: 'Mon', accuracy: 78 },
    { day: 'Tue', accuracy: 82 },
    { day: 'Wed', accuracy: 75 },
    { day: 'Thu', accuracy: 88 },
    { day: 'Fri', accuracy: 85 },
    { day: 'Sat', accuracy: 0 },
    { day: 'Sun', accuracy: 0 },
  ].filter(d => d.accuracy > 0);

  // Sample intraday data
  const intradayData = [
    { time: '10:00', price: 45.10 },
    { time: '10:30', price: 45.15 },
    { time: '11:00', price: 45.08 },
    { time: '11:30', price: 45.20 },
    { time: '12:00', price: 45.18 },
    { time: '12:30', price: 45.23 },
    { time: '13:00', price: 45.25 },
    { time: '13:30', price: 45.30 },
    { time: '14:00', price: 45.28 },
    { time: '14:30', price: 45.35 },
    { time: '15:00', price: 45.40 },
    { time: '15:30', price: 45.38 },
  ];

  const avgAccuracy = accuracyData.reduce((acc, curr) => acc + curr.accuracy, 0) / accuracyData.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  ASX Day Trading Dashboard
                </h1>
                <p className="text-sm text-slate-400">AI-Powered Technical Analysis</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">ASX Market Time</div>
              <div className="text-lg font-semibold">{currentTime.toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">{avgAccuracy.toFixed(1)}%</span>
            </div>
            <div className="text-sm text-slate-400">7-Day Avg Accuracy</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400">4</span>
            </div>
            <div className="text-sm text-slate-400">Bullish Signals</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-rose-400" />
              <span className="text-2xl font-bold text-rose-400">1</span>
            </div>
            <div className="text-sm text-slate-400">Bearish Signals</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-purple-400">5</span>
            </div>
            <div className="text-sm text-slate-400">Active Predictions</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* High Probability Gainers */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold">High Probability Gainers</h2>
            </div>
            <div className="space-y-4">
              {topGainers.map((stock) => (
                <div key={stock.symbol} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{stock.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          stock.prediction === 'Bullish' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {stock.prediction}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${stock.currentPrice.toFixed(2)}</div>
                      <div className={`text-sm font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change}%
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

          {/* 7-Day Accuracy Tracking */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">7-Day Accuracy</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
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

        {/* Intraday Chart */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">BHP Intraday Analysis</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={intradayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={['dataMin - 0.1', 'dataMax + 0.1']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#a78bfa" 
                strokeWidth={2}
                dot={{ fill: '#a78bfa', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>⚠️ This dashboard displays AI-generated predictions for educational purposes only.</p>
          <p className="mt-1">Not financial advice. Always conduct your own research before trading.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
