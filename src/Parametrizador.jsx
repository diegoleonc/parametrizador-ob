import { useState, useMemo, useEffect } from 'react'
import { Zap, ClipboardList, Target, TrendingUp, CheckSquare, Download, AlertTriangle, Copy, CheckCircle, Search, Send, Loader2, ExternalLink, XCircle, FolderOpen, FileText } from 'lucide-react'
import { parseProjectName, calculateEstimation, generateTasks, formatDate, getNextMonday } from './utils/parsing'
import { fetchPortfolioProjects, searchProjects, sendTasksToAsana } from './utils/asanaApi'

const PROJECT_TYPES = [
  { value: 'setup', label: '01 Set Up', description: 'Onboarding inicial de nuevos clientes', icon: '🚀', color: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { value: 'upgrade', label: '02 Upgrade', description: 'Ampliación de canales o plan', icon: '⬆️', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { value: 'reonboarding', label: '03 Reonboarding', description: 'Reactivación de clientes existentes', icon: '🔄', color: 'from-violet-500 to-purple-700', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
]

const ESTIMATE_OPTIONS = [
  { value: 'optimista', label: 'Optimista (P50)', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'esperado', label: 'Esperado (Recomendado)', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'conservador', label: 'Conservador (P80)', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
]

export default function Parametrizador() {
  // Step 1: Type selector
  const [selectedType, setSelectedType] = useState(null)

  // Step 2: Project selector
  const [portfolioProjects, setPortfolioProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [portfolioStats, setPortfolioStats] = useState(null)
  const [selectedAsanaProject, setSelectedAsanaProject] = useState(null)

  // Step 3: Parametrization
  const [startDate, setStartDate] = useState(formatDate(getNextMonday(new Date())))
  const [estimateType, setEstimateType] = useState('esperado')
  const [showResults, setShowResults] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [estimations, setEstimations] = useState(null)
  const [copied, setCopied] = useState(false)

  // Asana send state
  const [sendingToAsana, setSendingToAsana] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, message: '' })
  const [sendResult, setSendResult] = useState(null)

  const tasks = useMemo(() => {
    if (!parsed || !estimations) return []
    return generateTasks(parsed, estimations[estimateType], startDate)
  }, [parsed, estimations, estimateType, startDate])

  // Fetch projects when type is selected
  useEffect(() => {
    if (!selectedType) return
    setLoadingProjects(true)
    setProjectsError('')
    setPortfolioProjects([])
    setSelectedAsanaProject(null)
    setShowResults(false)
    setParsed(null)
    setEstimations(null)
    setSendResult(null)

    fetchPortfolioProjects(selectedType)
      .then((data) => {
        setPortfolioProjects(data.projects)
        setPortfolioStats({ total: data.total, active: data.active, unparametrized: data.unparametrized })
      })
      .catch((err) => setProjectsError(err.message))
      .finally(() => setLoadingProjects(false))
  }, [selectedType])

  // Auto-parametrize when project is selected
  const handleSelectProject = (project) => {
    setSelectedAsanaProject(project)
    setSendResult(null)

    const p = parseProjectName(project.name)
    const e = calculateEstimation(p.plan, p.type, p.totalChannels, p.channels)
    setParsed(p)
    setEstimations(e)
    setShowResults(true)
  }

  const handleCopyName = async () => {
    if (!selectedAsanaProject) return
    await navigator.clipboard.writeText(selectedAsanaProject.name)
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

  const handleSendToAsana = async () => {
    if (!selectedAsanaProject || tasks.length === 0) return
    setSendingToAsana(true)
    setSendResult(null)
    setSendProgress({ current: 0, total: 0, message: 'Iniciando...' })

    try {
      const result = await sendTasksToAsana(
        selectedAsanaProject.gid,
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

  const handleReset = () => {
    setSelectedType(null)
    setSelectedAsanaProject(null)
    setShowResults(false)
    setParsed(null)
    setEstimations(null)
    setSendResult(null)
    setPortfolioProjects([])
  }

  const uniqueChannels = parsed ? [...new Set(parsed.channels)] : []
  const activeType = PROJECT_TYPES.find(t => t.value === selectedType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Zap size={28} />
              <h1 className="text-2xl font-bold">Parametrizador de Onboarding</h1>
            </div>
            <p className="text-blue-200">Generador de tareas para Asana basado en el análisis de 1,035 proyectos completados</p>
          </div>
          {selectedType && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-200 hover:text-white border border-blue-400 hover:border-white px-4 py-2 rounded-lg transition-all"
            >
              Reiniciar
            </button>
          )}
        </div>
      </div>

      {/* Step 1: Type selector */}
      <Card icon={<FolderOpen size={20} />} title="Paso 1: Tipo de proyecto" step={1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROJECT_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                selectedType === type.value
                  ? `${type.bg} ${type.border} ring-2 ring-offset-1 ${type.border.replace('border', 'ring')}`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-3xl mb-3">{type.icon}</div>
              <div className={`text-base font-bold ${selectedType === type.value ? type.text : 'text-slate-800'}`}>
                {type.label}
              </div>
              <div className="text-xs text-slate-500 mt-1">{type.description}</div>
              {selectedType === type.value && (
                <CheckCircle size={18} className={`absolute top-3 right-3 ${type.text}`} />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Step 2: Project selector */}
      {selectedType && (
        <Card icon={<FileText size={20} />} title="Paso 2: Seleccionar proyecto sin parametrizar" step={2}>
          {loadingProjects ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-sm text-slate-500">Buscando proyectos sin parametrizar en <strong>{activeType?.label}</strong>...</p>
              <p className="text-xs text-slate-400">Verificando tareas en cada proyecto del portfolio</p>
            </div>
          ) : projectsError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{projectsError}</p>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              {portfolioStats && (
                <div className={`${activeType?.bg} border ${activeType?.border} rounded-xl p-4 mb-5 flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className={`text-2xl font-bold ${activeType?.text}`}>{portfolioStats.unparametrized}</span>
                      <span className="text-sm text-slate-500 ml-1">sin parametrizar</span>
                    </div>
                    <div className="h-8 w-px bg-slate-300" />
                    <div>
                      <span className="text-sm text-slate-500">{portfolioStats.active} activos de {portfolioStats.total} totales</span>
                    </div>
                  </div>
                </div>
              )}

              {portfolioProjects.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
                  <p className="font-medium text-slate-600">Todos los proyectos están parametrizados</p>
                  <p className="text-sm mt-1">No hay proyectos pendientes en {activeType?.label}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {portfolioProjects.map(p => (
                    <button
                      key={p.gid}
                      onClick={() => handleSelectProject(p)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                        selectedAsanaProject?.gid === p.gid
                          ? `border-blue-500 bg-blue-50 ring-2 ring-blue-200`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-700 truncate">{p.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedAsanaProject?.gid === p.gid && (
                          <CheckCircle size={18} className="text-blue-600" />
                        )}
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Step 3: Date + Estimation config */}
      {showResults && parsed && estimations && (
        <>
          {/* Summary */}
          <Card icon={<Target size={20} />} title="Paso 3: Resumen detectado" step={3}>
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

          {/* Estimates + Date */}
          <Card icon={<TrendingUp size={20} />} title="Paso 4: Estimación y fecha de inicio" step={4}>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full md:w-64 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </Card>

          {/* Tasks */}
          <Card icon={<CheckSquare size={20} />} title="Paso 5: Tareas generadas" step={5}>
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

          {/* Send to Asana */}
          <Card icon={<Send size={20} />} title="Paso 6: Enviar a Asana" step={6}>
            <div className="space-y-5">
              {/* Project info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Proyecto seleccionado</p>
                    <p className="text-sm text-blue-600">{selectedAsanaProject.name}</p>
                  </div>
                  <a
                    href={selectedAsanaProject.url || `https://app.asana.com/0/${selectedAsanaProject.gid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {sendResult ? (
                  <div className={`rounded-xl p-4 border ${
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
                          <p key={i} className="text-xs text-amber-700">{e.task}: {e.error}</p>
                        ))}
                      </div>
                    )}
                    <a
                      href={selectedAsanaProject.url || `https://app.asana.com/0/${selectedAsanaProject.gid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      <ExternalLink size={14} />
                      Ver proyecto en Asana
                    </a>
                  </div>
                ) : sendingToAsana ? (
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
            </div>
          </Card>

          {/* CSV fallback */}
          <Card icon={<Download size={20} />} title="Exportar CSV (alternativa)" step={null}>
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

          {/* Formula info */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
            <strong>Fórmula:</strong> Starter: 59 + 5×canales | Pro: 56 + 12×canales | Advanced: 48 + 18×canales | Enterprise: 80 + 10×canales | Upgrade: 14 + 3×canales. Integraciones complejas: +16 días
          </div>
        </>
      )}
    </div>
  )
}

function Card({ icon, title, step, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        {step && (
          <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {step}
          </div>
        )}
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
