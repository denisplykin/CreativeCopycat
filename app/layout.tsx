import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Creative Copycat 🎨 - AI Creative Analysis & Generation',
  description: 'Analyze and generate advertising creatives with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white sticky top-0 z-50 shadow-2xl">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">🎨</span>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Creative Copycat</h1>
                  <p className="text-xs opacity-90">AI-Powered Creative Magic ✨</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/" className="hover:scale-110 transform transition-all">
                  <span className="text-2xl">🏠</span>
                </a>
                <a href="/creatives" className="hover:scale-110 transform transition-all">
                  <span className="text-2xl">🎯</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen pb-20">
          {children}
        </main>
        <footer className="bg-gray-900 text-white py-8">
          <div className="container mx-auto px-6 text-center">
            <p className="text-lg font-bold mb-2">Made with 💜 by Creative Copycat Team</p>
            <p className="text-sm opacity-75">AI • Design • Innovation</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
