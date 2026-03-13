import { useState, useMemo } from 'react'
import { Zap, ClipboardList, Target, TrendingUp, CheckSquare, Download, AlertTriangle, Copy, CheckCircle, Search, Send, Loader2, ExternalLink, XCircle } from 'lucide-react'
import { parseProjectName, calculateEstimation, generateTasks, formatDate, getNextMonday } from './utils/parsing'
import { searchProjects, sendTasksToAsana } from './utils/asanaApi'

const ESTIMATE_OPTIONS = [
  { value: 'optimista', label: 'Optimista (P50)', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'esperado', label: 'Esperado (Recomendado)', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'conservador', label: 'Conservador (P80)', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
]

export default function Parametrizador() {
  const [projectName, setProjectName] = useState('')
  const [startDate, setStartDate] = useState(formatDate(getNextMonday(new Date())))
  const [estimateType, setEstimateType] = useState('esperado')
  const [showResults, setShowResults] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [estimations, setEstimations] = useState(null)
  const [copied, setCopied] = useState(false)

  // Asana integration state
  const [asanaSearch, setAsanaSearch] = useState('')
  const [asanaResults, setAsanaResults] = useState([])
  const [asanaSearching, setAsanaSearching] = useState(false)
  const [asanaSearchError, setAsanaSearchError] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [sendingToAsana, setSendingToAsana] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, message: '' })
  const [sendResult, setSendResult] = useState(null)

  const tasks = useMemo(() => {
    if (!parsed || !estimations) return []
    return generateTasks(parsed, estimations[estimateType], startDate)
  }, [parsed, estimations, estimateType, startDate])

  const handleParametrize = () => {
    if (!projectName.trim()) return
    const p = parseProjectName(projectName)
    const e = calculateEstimation(p.plan, p.type, p.totalChannels, p.channels)
    setParsed(p)
    setEstimations(e)
    setShowResults(true)

    // Pre-fill Asana search with company name
    if (p.company) {
      setAsanaSearch(p.company)
    }

    // Reset Asana state
    setSelectedProject(null)
    setSendResult(null)
    setAsanaResults([])
  }

  const handleCopyName = async () => {
    await navigator.clipboard.writeText(projectName)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadCSV = () => {
    let csv = 'Name,Section/Column,Due Date\n'
    let currentSection = ''
    for (const t of tasks) {
      if (t.section !== currentSection) {
        currentSection = t.section
        csv += `"${t.section}","${t.section}",""\n`
      }
      csv += `"${t.task}","${t.section}","${t.date}"\n`
    }
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tareas-onboarding-${formatDate(new Date())}.csv`
    link.click()
  }

  // Asana integration handlers
  const handleAsanaSearch = async () => {
    if (!asanaSearch.trim()) return
    setAsanaSearching(true)
    setAsanaSearchError('')
    setAsanaResults([])
    setSelectedProject(null)
    try {
      const projects = await searchProjects(asanaSearch)
      setAsanaResults(projects)
      if (projects.length === 0) {
        setAsanaSearchError('No se encontraron proyectos con ese nombre')
      }
    } catch (err) {
      setAsanaSearchError(err.message)
    } finally {
      setAsanaSearching(false)
    }
  }

  const handleSendToAsana = async () => {
    if (!selectedProject || tasks.length === 0) return
    setSendingToAsana(true)
    setSendResult(null)
    setSendProgress({ current: 0, total: 0, message: 'Iniciando...' })

    try {
      const result = await sendTasksToAsana(
        selectedProject.gid,
        tasks,
        (current, total, message) => setSendProgress({ current, total, message })
      )
      setSendResult(result)
    } catch (err) {
      setSendResult({ created: 0, errors: [{ task: 'General', error: err.message }] })
    } finally {
      setSendingToAsana(false)
    }
  }

  const uniqueChannels = parsed ? [...new Set(parsed.channels)] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap size={28} />
          <h1 className="text-2xl font-bold">Parametrizador de Onboarding</h1>
        </div>
        <p className="text-blue-200">Generador de tareas para Asana basado en el análisis de 1,035 proyectos completados</p>
      </div>

      {/* Step 1: Input */}
      <Card icon={<ClipboardList size={20} />} title="Paso 1: Datos del proyecto">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-blue-700">
            Pegue el nombre exacto del proyecto desde Asana. El sistema detectará automáticamente empresa, país, plan y canales.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del proyecto de Asana</label>
            <textarea
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Ej: PC Express- Setup Starter (Falabella/Walmart/Paris/Ripley)"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none h-28"
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleParametrize() }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleParametrize}
          className="w-full mt-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3.5 rounded-xl font-semibold text-base hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.99]"
        >
          Parametrizar
        </button>
      </Card>

      {/* Formula info */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        <strong>Fórmula:</strong> Starter: 59 + 5×canales | Pro: 56 + 12×canales | Advanced: 48 + 18×canales | Enterprise: 80 + 10×canales | Upgrade: 14 + 3×canales. Integraciones complejas: +16 días
      </div>

      {showResults && parsed && estimations && (
        <>
          {/* Step 2: Summary */}
          <Card icon={<Target size={20} />} title="Paso 2: Resumen detectado">
            {parsed.parseWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">{parsed.parseWarnings.join(' | ')}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <SummaryItem label="Empresa" value={parsed.company || '-'} />
              <SummaryItem label="País" value={parsed.country || '-'} />
              <SummaryItem label="Plan" value={parsed.plan} />
              <SummaryItem label="Tipo" value={parsed.type} />
              <SummaryItem label="Canales" value={parsed.totalChannels} />
              <div className="col-span-2 md:col-span-3 lg:col-span-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Canales detectados</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueChannels.map(ch => {
                    const count = parsed.channels.filter(c => c === ch).length
                    return (
                      <span key={ch} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ch}{count > 1 ? ` ×${count}` : ''}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Step 3: Estimates */}
          <Card icon={<TrendingUp size={20} />} title="Paso 3: Estimaciones de duración">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {ESTIMATE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEstimateType(opt.value)}
                  className={`p-5 rounded-xl border-2 text-center transition-all ${
                    estimateType === opt.value
                      ? `${opt.bg} ${opt.border} ring-2 ring-offset-1 ${opt.border.replace('border', 'ring')}`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{opt.label}</div>
                  <div className={`text-4xl font-bold ${opt.color}`}>{estimations[opt.value]}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {Math.ceil(estimations[opt.value] / 7)} semanas
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Step 4: Tasks */}
          <Card icon={<CheckSquare size={20} />} title="Paso 4: Tareas generadas">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-3 rounded-xl mb-4 text-center font-semibold">
              Total: {tasks.length} tareas
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Sección</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Tarea</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-800 whitespace-nowrap">{t.section}</td>
                      <td className="px-4 py-3 text-slate-700">{t.task}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Step 5: Send to Asana */}
          <Card icon={<Send size={20} />} title="Paso 5: Enviar a Asana">
            <div className="space-y-5">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Buscar proyecto en Asana</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={asanaSearch}
                    onChange={e => setAsanaSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAsanaSearch() }}
                    placeholder="Nombre del proyecto..."
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={handleAsanaSearch}
                    disabled={asanaSearching || !asanaSearch.trim()}
                    className="px-5 py-3 bg-slate-800 text-white rounded-xl font-medium text-sm hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {asanaSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Buscar
                  </button>
                </div>
              </div>

              {/* Search error */}
              {asanaSearchError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <XCircle size={18} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{asanaSearchError}</p>
                </div>
              )}

              {/* Search results */}
              {asanaResults.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Seleccionar proyecto ({asanaResults.length} resultados)
                  </label>
                  <div className="space-y-2">
                    {asanaResults.map(p => (
                      <button
                        key={p.gid}
                        onClick={() => setSelectedProject(p)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                          selectedProject?.gid === p.gid
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-700">{p.name}</span>
                        {selectedProject?.gid === p.gid && (
                          <CheckCircle size={18} className="text-blue-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Send button */}
              {selectedProject && !sendResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Proyecto seleccionado</p>
                      <p className="text-sm text-blue-600">{selectedProject.name}</p>
                    </div>
                    <a
                      href={`https://app.asana.com/0/${selectedProject.gid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>

                  {sendingToAsana ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                        <span className="text-sm text-blue-700">{sendProgress.message}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: sendProgress.total ? `${(sendProgress.current / sendProgress.total) * 100}%` : '0%' }}
                        />
                      </div>
                      <p className="text-xs text-blue-500 text-right">
                        {sendProgress.current} / {sendProgress.total}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendToAsana}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3.5 rounded-xl font-semibold text-base hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      Crear {tasks.length} tareas en Asana
                    </button>
                  )}
                </div>
              )}

              {/* Send result */}
              {sendResult && (
                <div className={`rounded-xl p-5 border ${
                  sendResult.errors.length === 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {sendResult.errors.length === 0 ? (
                      <CheckCircle size={20} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={20} className="text-amber-600" />
                    )}
                    <p className={`font-semibold ${
                      sendResult.errors.length === 0 ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {sendResult.created} tareas creadas exitosamente
                      {sendResult.errors.length > 0 && ` | ${sendResult.errors.length} errores`}
                    </p>
                  </div>
                  {sendResult.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {sendResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-amber-700">
                          {e.task}: {e.error}
                        </p>
                      ))}
                    </div>
                  )}
                  <a
                    href={`https://app.asana.com/0/${selectedProject.gid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    <ExternalLink size={14} />
                    Ver proyecto en Asana
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Step 6: CSV Export (fallback) */}
          <Card icon={<Download size={20} />} title="Paso 6: Exportar CSV (alternativa)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleCopyName}
                className="flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-blue-600 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? 'Copiado!' : 'Copiar nombre del proyecto'}
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all"
              >
                <Download size={18} />
                Descargar CSV para Asana
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Card({ icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="text-blue-700">{icon}</div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <div className="text-base font-bold text-blue-800">{value}</div>
    </div>
  )
}
