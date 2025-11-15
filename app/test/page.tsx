'use client';

import { useState } from 'react';
import Image from 'next/image';

type GenerationMode = 'dalle_simple' | 'character_swap' | 'openai_2step';

interface TestResult {
  mode: GenerationMode;
  imageUrl: string;
  logs: string[];
  error?: string;
  duration?: number;
}

export default function TestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [description, setDescription] = useState('Tech education platform with modern design, engaging visuals');
  const [modifications, setModifications] = useState('Replace the child with a 18-22 year old male student');
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<{ [key in GenerationMode]?: boolean }>({});
  const [logs, setLogs] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      addLog(`📁 File selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testMode = async (mode: GenerationMode) => {
    if (!selectedFile) {
      alert('Please upload an image first!');
      return;
    }

    setLoading(prev => ({ ...prev, [mode]: true }));
    addLog(`🚀 Starting ${mode} generation...`);

    const startTime = Date.now();

    try {
      // Upload image to temporary storage
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (mode === 'dalle_simple') {
        formData.append('description', description);
      } else if (mode === 'openai_2step') {
        formData.append('modifications', modifications);
      }

      addLog(`📤 Uploading image...`);
      const uploadResponse = await fetch('/api/test-generate', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Generation-Mode': mode,
        },
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await uploadResponse.json();
      const duration = Date.now() - startTime;

      addLog(`✅ ${mode} complete in ${(duration / 1000).toFixed(1)}s`);

      setResults(prev => [
        ...prev,
        {
          mode,
          imageUrl: result.imageUrl,
          logs: result.logs || [],
          duration,
        },
      ]);
    } catch (error) {
      const duration = Date.now() - startTime;
      addLog(`❌ ${mode} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setResults(prev => [
        ...prev,
        {
          mode,
          imageUrl: '',
          logs: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
        },
      ]);
    } finally {
      setLoading(prev => ({ ...prev, [mode]: false }));
    }
  };

  const clearResults = () => {
    setResults([]);
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🧪 Creative Generation Test Lab
          </h1>
          <p className="text-purple-200">
            Upload an image and test different generation modes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input & Controls */}
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">📤 Upload Image</h2>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-white bg-purple-600/50 border border-purple-400 rounded-lg px-4 py-3 cursor-pointer hover:bg-purple-600/70 transition"
              />

              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-lg border-2 border-purple-400"
                  />
                </div>
              )}
            </div>

            {/* Description for DALL-E Simple */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">📝 Description</h2>
              <p className="text-purple-200 text-sm mb-2">
                For DALL-E Simple mode (text-to-image)
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/30 text-white border border-purple-400 rounded-lg px-4 py-3 h-24 resize-none"
                placeholder="Describe the creative you want to generate..."
              />
            </div>

            {/* Modifications for OpenAI 2-Step */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">🔧 Modifications</h2>
              <p className="text-purple-200 text-sm mb-2">
                For OpenAI 2-Step mode (required)
              </p>
              <textarea
                value={modifications}
                onChange={(e) => setModifications(e.target.value)}
                className="w-full bg-black/30 text-white border border-purple-400 rounded-lg px-4 py-3 h-24 resize-none"
                placeholder="Example: Replace the child with a 18-22 year old male student"
              />
              <p className="text-purple-300 text-xs mt-2">
                💡 Examples: "Change main color to purple" / "Replace character with a woman" / "Change background to sunset"
              </p>
            </div>

            {/* Generation Modes */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">🎨 Generation Modes</h2>
              
              <div className="space-y-3">
                {/* DALL-E Simple */}
                <button
                  onClick={() => testMode('dalle_simple')}
                  disabled={loading.dalle_simple || !selectedFile}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition shadow-lg disabled:cursor-not-allowed"
                >
                  {loading.dalle_simple ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    '🎨 DALL-E Direct (Text → Image)'
                  )}
                </button>

                {/* Character Swap */}
                <button
                  onClick={() => testMode('character_swap')}
                  disabled={loading.character_swap || !selectedFile}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition shadow-lg disabled:cursor-not-allowed"
                >
                  {loading.character_swap ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    '👧 Character Swap (25yo Indonesian woman)'
                  )}
                </button>

                {/* OpenAI 2-Step */}
                <button
                  onClick={() => testMode('openai_2step')}
                  disabled={loading.openai_2step || !selectedFile || !modifications.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition shadow-lg disabled:cursor-not-allowed"
                >
                  {loading.openai_2step ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    '🤖 OpenAI 2-Step (Custom Changes)'
                  )}
                </button>
              </div>

              {results.length > 0 && (
                <button
                  onClick={clearResults}
                  className="w-full mt-4 bg-red-500/50 hover:bg-red-600/70 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  🗑️ Clear Results
                </button>
              )}
            </div>

            {/* Logs */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">📋 Logs</h2>
              <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm text-green-300">
                {logs.length === 0 ? (
                  <p className="text-gray-400">No logs yet...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-4">🎯 Results</h2>
              
              {results.length === 0 ? (
                <div className="text-center text-purple-200 py-12">
                  <p className="text-xl">No results yet</p>
                  <p className="text-sm mt-2">Upload an image and click a generation button</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[800px] overflow-y-auto">
                  {results.map((result, i) => (
                    <div key={i} className="bg-black/30 rounded-lg p-4 border border-purple-400/50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {result.mode === 'dalle_simple' ? '🎨 DALL-E Direct' : 
                           result.mode === 'character_swap' ? '👧 Character Swap' : 
                           '🤖 OpenAI 2-Step'}
                        </h3>
                        {result.duration && (
                          <span className="text-xs text-purple-300">
                            {(result.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      {result.error ? (
                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200 text-sm">
                          ❌ {result.error}
                        </div>
                      ) : result.imageUrl ? (
                        <div>
                          <img
                            src={result.imageUrl}
                            alt={`Result ${i + 1}`}
                            className="w-full rounded-lg border-2 border-green-400"
                          />
                          <a
                            href={result.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-2 text-center text-sm text-cyan-300 hover:text-cyan-100 underline"
                          >
                            Open in new tab
                          </a>
                        </div>
                      ) : (
                        <div className="text-yellow-300 text-sm">⏳ Processing...</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

