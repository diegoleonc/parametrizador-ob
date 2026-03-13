import Parametrizador from './Parametrizador'

export default function App() {
  return (
    <div className="min-h-screen bg-mv-bg">
      {/* Navbar */}
      <nav className="bg-mv-navy sticky top-0 z-50 shadow-lg shadow-mv-navy/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/brand/isotipo.png" alt="Multivende" className="w-8 h-8" />
              <div className="h-5 w-px bg-white/20" />
              <span className="text-white/90 text-sm font-medium tracking-wide">Parametrizador OB</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-mv-blue-light font-medium px-3 py-1 rounded-full bg-white/10">
                v2.0
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Parametrizador />
      </main>

      {/* Footer */}
      <footer className="border-t border-mv-navy/10 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <img src="/brand/logo-azul.png" alt="Multivende" className="h-5 opacity-40" />
          <span className="text-xs text-mv-navy/30">Merchant Success</span>
        </div>
      </footer>
    </div>
  )
}
