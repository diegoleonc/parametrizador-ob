import Parametrizador from './Parametrizador'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar - matches dashboard brand-gradient */}
      <nav className="brand-gradient sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/brand/isotipo.png" alt="Multivende" className="w-8 h-8" />
              <span className="text-white font-semibold tracking-wide">MULTIVENDE</span>
              <span className="text-white/50">|</span>
              <span className="text-white/70 text-sm">Onboarding Ops</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-sm font-medium px-5 py-1.5 rounded-lg">
                Parametrizador
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Parametrizador />
      </main>

      {/* Footer - matches dashboard */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brand/isotipo.png" alt="Multivende" className="h-5 opacity-50" />
            <span className="text-xs text-slate-400">Onboarding Operations Platform</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
