import { useState, useMemo, useEffect } from 'react'
import { ClipboardList, Target, TrendingUp, CheckSquare, Download, AlertTriangle, Copy, CheckCircle, Send, Loader2, ExternalLink, XCircle, FolderOpen, FileText, ArrowRight, RotateCcw } from 'lucide-react'
import { parseProjectName, calculateEstimation, generateTasks, formatDate, getNextMonday } from './utils/parsing'
import { fetchPortfolioProjects, sendTasksToAsana } from './utils/asanaApi'

const PROJECT_TYPES = [
  { value: 'setup', label: 'Set Up', tag: '01', description: 'Onboarding inicial de nuevos clientes', gradient: 'from-mv-green to-emerald-600', bg: 'bg-mv-green/10', border: 'border-mv-green/30', text: 'text-mv-green', ring: 'ring-mv-green/30' },
  { value: 'upgrade', label: 'Upgrade', tag: '02', description: 'Ampliación de canales o plan', gradient: 'from-mv-orange to-amber-600', bg: 'bg-mv-orange/10', border: 'border-mv-orange/30', text: 'text-mv-orange', ring: 'ring-mv-orange/30' },
  { value: 'reonboarding', label: 'Reonboarding', tag: '03', description: 'Reactivación de clientes existentes', gradient: 'from-mv-magenta to-pink-600', bg: 'bg-mv-magenta/10', border: 'border-mv-magenta/30', text: 'text-mv-magenta', ring: 'ring-mv-magenta/30' },
]

const ESTIMATE_OPTIONS = [
  { value: 'optimista', label: 'Optimista', sublabel: 'P50', color: 'text-mv-green', bg: 'bg-mv-green/8', border: 'border-mv-green/20', ring: 'ring-mv-green/20', dot: 'bg-mv-green' },
  { value: 'esperado', label: 'Esperado', sublabel: 'Recomendado', color: 'text-mv-blue', bg: 'bg-mv-blue/8', border: 'border-mv-blue/20', ring: 'ring-mv-blue/20', dot: 'bg-mv-blue' },
  { value: 'conservador', label: 'Conservador', sublabel: 'P80', color: 'text-mv-coral', bg: 'bg-mv-coral/8', border: 'border-mv-coral/20', ring: 'ring-mv-coral/20', dot: 'bg-mv-coral' },
]

export default function Parametrizador() {
  const [selectedType, setSelectedType] = useState(null)
  const [portfolioProjects, setPortfolioProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [portfolioStats, setPortfolioStats] = useState(null)
  const [selectedAsanaProject, setSelectedAsanaProject] = useState(null)
  const [startDate, setStartDate] = useState(formatDate(getNextMonday(new Date())))
  const [estimateType, setEstimateType] = useState('esperado')
  const [showResults, setShowResults] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [estimations, setEstimations] = useState(null)
  const [copied, setCopied] = useState(false)
  const [sendingToAsana, setSendingToAsana] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, message: '' })
  const [sendResult, setSendResult] = useState(null)

  const tasks = useMemo(() => {
    if (!parsed || !estimations) return []
    return generateTasks(parsed, estimations[estimateType], startDate)
  }, [parsed, estimations, estimateType, startDate])

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
        selectedAsanaProject.gid, tasks,
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
      {/* Hero header */}
      <div className="relative overflow-hidden bg-mv-navy rounded-2xl p-8 md:p-10">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #54CC85 0%, transparent 50%), radial-gradient(circle at 80% 50%, #6681C6 0%, transparent 50%)',
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              Parametrizador
            </h1>
            <p className="text-mv-blue-light/80 text-sm max-w-md">
              Generador automático de tareas para proyectos de onboarding. Basado en el análisis de 1,035 proyectos completados.
            </p>
          </div>
          {selectedType && (
            <button
              onClick={handleReset}
              className="text-sm text-white/60 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          )}
        </div>

        {/* Step progress */}
        {selectedType && (
          <div className="relative mt-6 flex items-center gap-2">
            <StepDot active={true} label="Tipo" />
            <StepLine active={!!selectedAsanaProject} />
            <StepDot active={!!selectedAsanaProject} label="Proyecto" />
            <StepLine active={showResults} />
            <StepDot active={showResults} label="Tareas" />
            <StepLine active={!!sendResult} />
            <StepDot active={!!sendResult} label="Asana" />
          </div>
        )}
      </div>

      {/* Step 1: Type selector */}
      <Card icon={<FolderOpen size={18} />} title="Tipo de proyecto" step={1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROJECT_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg ${
                selectedType === type.value
                  ? `${type.bg} ${type.border} ring-2 ${type.ring}`
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-mv-navy/5'
              }`}
            >
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold mb-3 ${
                selectedType === type.value
                  ? `bg-gradient-to-r ${type.gradient} text-white`
                  : 'bg-mv-navy/8 text-mv-navy/60'
              }`}>
                {type.tag}
              </div>
              <div className={`text-lg font-semibold mb-1 ${
                selectedType === type.value ? type.text : 'text-mv-navy'
              }`}>
                {type.label}
              </div>
              <div className="text-xs text-mv-navy/50">{type.description}</div>
              {selectedType === type.value && (
                <CheckCircle size={18} className={`absolute top-4 right-4 ${type.text}`} />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Step 2: Project selector */}
      {selectedType && (
        <div className="fade-in">
          <Card icon={<FileText size={18} />} title="Proyecto sin parametrizar" step={2}>
            {loadingProjects ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-3 border-mv-navy/10 border-t-mv-green animate-spin" style={{ borderWidth: '3px' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-mv-navy/70">Escaneando portfolio <span className={activeType?.text}>{activeType?.label}</span></p>
                  <p className="text-xs text-mv-navy/40 mt-1">Verificando tareas en cada proyecto...</p>
                </div>
              </div>
            ) : projectsError ? (
              <div className="bg-mv-coral/8 border border-mv-coral/20 rounded-xl p-4 flex items-center gap-3">
                <XCircle size={18} className="text-mv-coral shrink-0" />
                <p className="text-sm text-mv-coral">{projectsError}</p>
              </div>
            ) : (
              <>
                {portfolioStats && (
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${activeType?.bg} ${activeType?.border} border`}>
                      <span className={`text-xl font-bold ${activeType?.text}`}>{portfolioStats.unparametrized}</span>
                      <span className="text-xs text-mv-navy/50">pendientes</span>
                    </div>
                    <span className="text-xs text-mv-navy/30">de {portfolioStats.active} activos ({portfolioStats.total} totales)</span>
                  </div>
                )}

                {portfolioProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-mv-green/10 flex items-center justify-center">
                      <CheckCircle size={28} className="text-mv-green" />
                    </div>
                    <p className="font-semibold text-mv-navy">Todo al día</p>
                    <p className="text-sm text-mv-navy/40 mt-1">No hay proyectos pendientes en {activeType?.label}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {portfolioProjects.map(p => (
                      <button
                        key={p.gid}
                        onClick={() => handleSelectProject(p)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 group ${
                          selectedAsanaProject?.gid === p.gid
                            ? 'border-mv-navy bg-mv-navy/5 shadow-sm'
                            : 'border-transparent hover:bg-mv-navy/3 hover:border-mv-navy/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                            selectedAsanaProject?.gid === p.gid ? 'bg-mv-green' : 'bg-mv-navy/15 group-hover:bg-mv-navy/30'
                          }`} />
                          <span className="text-sm text-mv-navy truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {selectedAsanaProject?.gid === p.gid && (
                            <ArrowRight size={14} className="text-mv-navy" />
                          )}
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-mv-navy/20 hover:text-mv-blue transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {showResults && parsed && estimations && (
        <>
          {/* Summary */}
          <div className="slide-up">
            <Card icon={<Target size={18} />} title="Resumen detectado" step={3}>
              {parsed.parseWarnings.length > 0 && (
                <div className="bg-mv-yellow/10 border border-mv-yellow/30 rounded-xl p-4 mb-5 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-mv-orange shrink-0" />
                  <p className="text-sm text-mv-navy/70">{parsed.parseWarnings.join(' | ')}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                <SummaryPill label="Empresa" value={parsed.company || '-'} />
                <SummaryPill label="País" value={parsed.country || '-'} />
                <SummaryPill label="Plan" value={parsed.plan} />
                <SummaryPill label="Tipo" value={parsed.type} />
                <SummaryPill label="Canales" value={parsed.totalChannels} highlight />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mv-navy/40 uppercase tracking-wider mb-2">Canales detectados</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueChannels.map(ch => {
                    const count = parsed.channels.filter(c => c === ch).length
                    return (
                      <span key={ch} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-mv-navy/5 text-mv-navy border border-mv-navy/10">
                        {ch}{count > 1 && <span className="ml-1.5 text-mv-blue font-bold">×{count}</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Estimates + Date */}
          <div className="slide-up">
            <Card icon={<TrendingUp size={18} />} title="Estimación y fecha de inicio" step={4}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {ESTIMATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEstimateType(opt.value)}
                    className={`p-5 rounded-xl border-2 text-center transition-all duration-200 ${
                      estimateType === opt.value
                        ? `${opt.bg} ${opt.border} ring-2 ${opt.ring}`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      <span className="text-xs font-semibold text-mv-navy/40 uppercase tracking-wider">{opt.label}</span>
                    </div>
                    <div className={`text-4xl font-bold font-display ${opt.color}`}>{estimations[opt.value]}</div>
                    <div className="text-xs text-mv-navy/40 mt-1">
                      {Math.ceil(estimations[opt.value] / 7)} semanas · {opt.sublabel}
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-mv-navy/40 uppercase tracking-wider mb-2">Fecha de inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full md:w-56 px-4 py-2.5 border border-mv-navy/15 rounded-lg text-sm text-mv-navy focus:ring-2 focus:ring-mv-blue/30 focus:border-mv-blue transition-all"
                />
              </div>
            </Card>
          </div>

          {/* Tasks */}
          <div className="slide-up">
            <Card icon={<CheckSquare size={18} />} title="Tareas generadas" step={5}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mv-navy text-white text-sm font-semibold mb-4">
                <CheckSquare size={14} />
                {tasks.length} tareas
              </div>
              <div className="overflow-x-auto rounded-xl border border-mv-navy/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-mv-navy/3">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-mv-navy/50 uppercase tracking-wider">Sección</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-mv-navy/50 uppercase tracking-wider">Tarea</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-mv-navy/50 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t, i) => (
                      <tr key={i} className="border-t border-mv-navy/5 hover:bg-mv-blue/3 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-mv-navy whitespace-nowrap text-xs">{t.section}</td>
                        <td className="px-4 py-2.5 text-mv-navy/70">{t.task}</td>
                        <td className="px-4 py-2.5 text-mv-navy/40 font-mono text-xs">{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Send to Asana */}
          <div className="slide-up">
            <Card icon={<Send size={18} />} title="Enviar a Asana" step={6}>
              <div className="bg-mv-navy/3 border border-mv-navy/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-semibold text-mv-navy/40 uppercase tracking-wider mb-1">Proyecto destino</p>
                    <p className="text-sm font-medium text-mv-navy">{selectedAsanaProject.name}</p>
                  </div>
                  <a
                    href={selectedAsanaProject.url || `https://app.asana.com/0/${selectedAsanaProject.gid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mv-blue hover:text-mv-navy transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {sendResult ? (
                  <div className={`rounded-xl p-5 border ${
                    sendResult.errors.length === 0
                      ? 'bg-mv-green/8 border-mv-green/20'
                      : 'bg-mv-yellow/10 border-mv-yellow/30'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {sendResult.errors.length === 0 ? (
                        <CheckCircle size={20} className="text-mv-green" />
                      ) : (
                        <AlertTriangle size={20} className="text-mv-orange" />
                      )}
                      <p className="font-semibold text-mv-navy">
                        {sendResult.created} tareas creadas
                        {sendResult.errors.length > 0 && ` · ${sendResult.errors.length} errores`}
                      </p>
                    </div>
                    {sendResult.errors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {sendResult.errors.map((e, i) => (
                          <p key={i} className="text-xs text-mv-coral">{e.task}: {e.error}</p>
                        ))}
                      </div>
                    )}
                    <a
                      href={selectedAsanaProject.url || `https://app.asana.com/0/${selectedAsanaProject.gid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-mv-blue hover:text-mv-navy transition-colors"
                    >
                      <ExternalLink size={14} />
                      Abrir proyecto en Asana
                    </a>
                  </div>
                ) : sendingToAsana ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin text-mv-blue" />
                      <span className="text-sm text-mv-navy/70">{sendProgress.message}</span>
                    </div>
                    <div className="w-full bg-mv-navy/10 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-mv-blue to-mv-green h-1.5 rounded-full transition-all duration-300"
                        style={{ width: sendProgress.total ? `${(sendProgress.current / sendProgress.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <p className="text-xs text-mv-navy/30 text-right">{sendProgress.current} / {sendProgress.total}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleSendToAsana}
                    className="w-full bg-mv-navy hover:bg-mv-navy-light text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-mv-navy/20 active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    Crear {tasks.length} tareas en Asana
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* CSV fallback - compact */}
          <div className="slide-up">
            <div className="bg-white rounded-xl border border-mv-navy/8 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-mv-navy/30 font-medium uppercase tracking-wider">Exportar como alternativa</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-mv-navy/50 hover:text-mv-navy border border-mv-navy/10 hover:border-mv-navy/20 rounded-lg transition-all"
                  >
                    {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar nombre'}
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-mv-navy/50 hover:text-mv-navy border border-mv-navy/10 hover:border-mv-navy/20 rounded-lg transition-all"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="text-xs text-mv-navy/25 text-center py-2">
            Starter: 59+5×ch | Pro: 56+12×ch | Advanced: 48+18×ch | Enterprise: 80+10×ch | Upgrade: 14+3×ch · Complejas: +16d
          </div>
        </>
      )}
    </div>
  )
}

function Card({ icon, title, step, children }) {
  return (
    <div className="bg-white rounded-2xl border border-mv-navy/8 shadow-sm shadow-mv-navy/3 p-6">
      <div className="flex items-center gap-3 mb-5">
        {step && (
          <div className="w-6 h-6 rounded-full bg-mv-navy flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{step}</span>
          </div>
        )}
        <div className="text-mv-navy/40">{icon}</div>
        <h2 className="text-sm font-semibold text-mv-navy uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SummaryPill({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3.5 ${highlight ? 'bg-mv-navy text-white' : 'bg-mv-navy/4'}`}>
      <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${highlight ? 'text-white/50' : 'text-mv-navy/35'}`}>{label}</label>
      <div className={`text-base font-bold ${highlight ? 'text-white' : 'text-mv-navy'}`}>{value}</div>
    </div>
  )
}

function StepDot({ active, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${active ? 'bg-mv-green scale-100' : 'bg-white/20 scale-90'}`} />
      <span className={`text-[9px] font-medium tracking-wider uppercase transition-colors ${active ? 'text-mv-green' : 'text-white/25'}`}>{label}</span>
    </div>
  )
}

function StepLine({ active }) {
  return (
    <div className="flex-1 h-px mb-4">
      <div className={`h-full transition-all duration-500 ${active ? 'bg-mv-green' : 'bg-white/15'}`} />
    </div>
  )
}
