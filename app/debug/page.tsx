'use client';

import { useState, useEffect } from 'react';
import type { Creative } from '@/types/creative';

interface TestResult {
  mode: string;
  status: 'pending' | 'running' | 'success' | 'error';
  url?: string;
  error?: string;
  time?: number;
}

const MODES = [
  { id: 'mask_edit', name: '🎭 Mask Edit', copyMode: 'mask_edit' },
];

export default function DebugPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    try {
      const response = await fetch('/api/creatives');
      const data = await response.json();
      const completed = data.creatives.filter((c: Creative) => c.status === 'completed' && c.analysis);
      setCreatives(completed);
      if (completed.length > 0) {
        setSelectedId(completed[0].id);
      }
    } catch (err) {
      addLog(`❌ Error fetching creatives: ${err}`);
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testAllModes = async () => {
    if (!selectedId) {
      alert('Please select a creative!');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    
    // Initialize results
    const initialResults: TestResult[] = MODES.map(mode => ({
      mode: mode.name,
      status: 'pending' as const,
    }));
    setResults(initialResults);

    addLog(`🚀 Starting test for creative: ${selectedId}`);
    addLog(`📊 Testing ${MODES.length} modes...`);

    // Run all modes sequentially (to avoid rate limits)
    for (let i = 0; i < MODES.length; i++) {
      const mode = MODES[i];
      
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'running' as const } : r
      ));

      addLog(`\n${mode.name} - Starting...`);
      const startTime = Date.now();

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creativeId: selectedId,
            generationType: 'full_creative',
            copyMode: mode.copyMode,
            aspectRatio: '9:16',
          }),
        });

        const data = await response.json();
        const time = Date.now() - startTime;

        if (response.ok) {
          addLog(`✅ ${mode.name} - Success in ${(time / 1000).toFixed(1)}s`);
          addLog(`   URL: ${data.generated_url}`);
          
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { 
              ...r, 
              status: 'success' as const, 
              url: data.generated_url,
              time: time,
            } : r
          ));
        } else {
          throw new Error(data.error || data.details || 'Unknown error');
        }
      } catch (err) {
        const time = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);
        
        addLog(`❌ ${mode.name} - Failed in ${(time / 1000).toFixed(1)}s`);
        addLog(`   Error: ${errorMsg}`);
        
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { 
            ...r, 
            status: 'error' as const, 
            error: errorMsg,
            time: time,
          } : r
        ));
      }

      // Small delay between requests
      if (i < MODES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    addLog(`\n✅ All tests completed!`);
    setIsRunning(false);
  };

  const selectedCreative = creatives.find(c => c.id === selectedId);

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            🐛 Debug Generator
          </h1>
          <p className="text-lg text-gray-600">Test all generation modes with one click</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-6">
            {/* Creative Selector */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
              <label className="block text-sm font-bold mb-3 text-gray-700">
                📸 Select Creative
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none font-medium"
              >
                {creatives.map((creative) => (
                  <option key={creative.id} value={creative.id}>
                    {creative.competitor_name} - {new Date(creative.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>

              {/* Creative Preview */}
              {selectedCreative && (
                <div className="mt-4">
                  <img
                    src={selectedCreative.original_image_url}
                    alt="Preview"
                    className="w-full rounded-xl shadow-lg"
                  />
                  <div className="mt-3 text-xs text-gray-500">
                    <div>📝 {selectedCreative.analysis?.ocr?.blocks?.length || 0} text blocks</div>
                    <div>🌐 {selectedCreative.analysis?.language || 'en'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Test Button */}
            <button
              onClick={testAllModes}
              disabled={isRunning || !selectedId}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </span>
              ) : (
                '🚀 Test All 4 Modes'
              )}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="font-bold text-lg mb-4">📊 Results</h3>
                <div className="space-y-3">
                  {results.map((result, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border-2 ${
                        result.status === 'success' ? 'bg-green-50 border-green-300' :
                        result.status === 'error' ? 'bg-red-50 border-red-300' :
                        result.status === 'running' ? 'bg-blue-50 border-blue-300 animate-pulse' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{result.mode}</span>
                        {result.status === 'running' && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {result.status === 'success' && <span className="text-green-600">✅</span>}
                        {result.status === 'error' && <span className="text-red-600">❌</span>}
                      </div>
                      
                      {result.time && (
                        <div className="text-xs text-gray-500 mb-2">
                          ⏱️ {(result.time / 1000).toFixed(1)}s
                        </div>
                      )}
                      
                      {result.url && (
                        <div className="mt-2">
                          <img
                            src={result.url}
                            alt={result.mode}
                            className="w-full rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(result.url, '_blank')}
                          />
                        </div>
                      )}
                      
                      {result.error && (
                        <div className="text-xs text-red-600 mt-2 font-mono bg-red-100 p-2 rounded">
                          {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Logs */}
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 max-h-[800px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-green-400">📝 Live Logs</h3>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No logs yet. Click "Test All 4 Modes" to start.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`${
                      log.includes('❌') ? 'text-red-400' :
                      log.includes('✅') ? 'text-green-400' :
                      log.includes('🚀') ? 'text-cyan-400' :
                      log.includes('URL:') ? 'text-blue-300 ml-4' :
                      log.includes('Error:') ? 'text-red-300 ml-4' :
                      'text-gray-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

