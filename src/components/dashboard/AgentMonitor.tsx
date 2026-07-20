import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Server,
  Database,
  Timer,
  Inbox,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase, DATA_SOURCE } from '../../lib/supabase'
import { useTheme } from '../../lib/theme'

interface SyncLog {
  time: string
  batch: string
  received: number
  inserted: number
  updated: number
  duplicate: number
  status: 'ok' | 'error'
}

interface AgentState {
  online: boolean
  lastBeat: number // epoch ms
  version: string
  site: string
  bufferPending: number
  syncedToday: number
  intervalSec: number
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return `${s} detik lalu`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} menit lalu`
  return `${Math.round(m / 60)} jam lalu`
}

function Card({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Server
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-[var(--chip)] flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-sm text-[var(--faint)] mt-1">{sub}</div>}
    </div>
  )
}

export default function AgentMonitor({ totalCloud }: { totalCloud: number }) {
  const { theme } = useTheme()
  const [live, setLive] = useState(false)
  const [agent, setAgent] = useState<AgentState>({
    online: true,
    lastBeat: Date.now(),
    version: '1.0.0',
    site: 'SITE01',
    bufferPending: 0,
    syncedToday: 128,
    intervalSec: 5,
  })
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [, force] = useState(0)
  const seq = useRef(6600)

  // Coba baca dari Supabase (mode live). Kalau gagal/kosong → simulasi.
  useEffect(() => {
    let mounted = true
    async function loadLive() {
      if (DATA_SOURCE !== 'supabase' || !supabase) return false
      try {
        const { data: st } = await supabase
          .from('agent_status')
          .select('*')
          .order('last_heartbeat_at', { ascending: false })
          .limit(1)
        const { data: lg } = await supabase
          .from('sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15)
        if (!mounted) return false
        if (st && st.length > 0) {
          const s = st[0] as Record<string, unknown>
          setAgent({
            online:
              Date.now() - new Date(s.last_heartbeat_at as string).getTime() < 5 * 60 * 1000,
            lastBeat: new Date(s.last_heartbeat_at as string).getTime(),
            version: (s.version as string) ?? '-',
            site: (s.site as string) ?? 'SITE01',
            bufferPending: (s.buffer_pending as number) ?? 0,
            syncedToday: (s.synced_today as number) ?? 0,
            intervalSec: 5,
          })
          setLogs(
            (lg ?? []).map((r: Record<string, unknown>) => ({
              time: new Date(r.created_at as string).toLocaleTimeString('id-ID'),
              batch: String(r.batch_id ?? '-').slice(-8),
              received: (r.received_count as number) ?? 0,
              inserted: (r.inserted_count as number) ?? 0,
              updated: (r.updated_count as number) ?? 0,
              duplicate: (r.duplicate_count as number) ?? 0,
              status: r.error_text ? 'error' : 'ok',
            })),
          )
          setLive(true)
          return true
        }
      } catch {
        /* fallback simulasi */
      }
      return false
    }
    loadLive()
    const poll = setInterval(loadLive, 10000)
    return () => {
      mounted = false
      clearInterval(poll)
    }
  }, [])

  // Simulasi asupan data (kalau bukan mode live)
  useEffect(() => {
    if (live) return
    const beat = setInterval(() => {
      setAgent((a) => ({ ...a, lastBeat: Date.now(), online: true }))
      force((x) => x + 1)
    }, 3000)
    const intake = setInterval(() => {
      const received = 1 + Math.floor(Math.random() * 4)
      const dup = Math.random() < 0.2 ? 1 : 0
      const inserted = received - dup
      seq.current += received
      setAgent((a) => ({
        ...a,
        syncedToday: a.syncedToday + inserted,
        bufferPending: Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 3),
      }))
      setLogs((prev) =>
        [
          {
            time: new Date().toLocaleTimeString('id-ID'),
            batch: `b${seq.current}`,
            received,
            inserted,
            updated: Math.random() < 0.3 ? 1 : 0,
            duplicate: dup,
            status: 'ok' as const,
          },
          ...prev,
        ].slice(0, 15),
      )
    }, 5000)
    return () => {
      clearInterval(beat)
      clearInterval(intake)
    }
  }, [live])

  // update "x detik lalu" tiap detik
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const chartData = useMemo(
    () =>
      [...logs]
        .slice(0, 12)
        .reverse()
        .map((l, i) => ({ i, v: l.received })),
    [logs],
  )
  const barColor = theme === 'light' ? '#0f172a' : '#e2e8f0'
  const online = agent.online && Date.now() - agent.lastBeat < 5 * 60 * 1000

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              online ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
            }`}
          >
            <Activity className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="font-medium">
                Sync Agent {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-[var(--muted)]">
              Site {agent.site} · versi {agent.version} · heartbeat {ago(agent.lastBeat)}
            </div>
          </div>
        </div>
        <span
          className={`self-start text-xs px-2.5 py-1 rounded-full border ${
            live
              ? 'border-emerald-400/40 text-emerald-500'
              : 'border-[var(--border)] text-[var(--muted)]'
          }`}
        >
          {live ? 'Mode Live (Supabase)' : 'Mode Simulasi (demo)'}
        </span>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Inbox} label="Data masuk hari ini" value={agent.syncedToday.toLocaleString('id-ID')} sub="tiket tersinkron" />
        <Card icon={Database} label="Total di cloud" value={totalCloud.toLocaleString('id-ID')} sub="tiket termuat" />
        <Card icon={Server} label="Buffer tertunda" value={String(agent.bufferPending)} sub={agent.bufferPending === 0 ? 'semua terkirim' : 'menunggu koneksi'} />
        <Card icon={Timer} label="Interval sinkron" value={`${agent.intervalSec} dtk`} sub="frekuensi baca .mdb" />
      </div>

      {/* Asupan data + Log */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-base font-medium mb-1">Asupan Data</h3>
          <p className="text-sm text-[var(--muted)] mb-4">Tiket diterima per siklus</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="i" hide />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    background: theme === 'light' ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.85)',
                    border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: 10,
                    fontSize: 12,
                    color: theme === 'light' ? '#111827' : '#fff',
                  }}
                  formatter={(v: number) => [`${v} tiket`, 'Diterima']}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="v" fill={barColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass border border-[var(--border)] rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-medium">Log Sinkronisasi</h3>
              <p className="text-sm text-[var(--muted)]">Batch terakhir dari agent</p>
            </div>
            <RefreshCw className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <div className="overflow-x-auto thin-scroll -mx-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                  <th className="font-normal py-2 px-2">Waktu</th>
                  <th className="font-normal py-2 px-2">Batch</th>
                  <th className="font-normal py-2 px-2 text-right">Diterima</th>
                  <th className="font-normal py-2 px-2 text-right">Insert</th>
                  <th className="font-normal py-2 px-2 text-right">Update</th>
                  <th className="font-normal py-2 px-2 text-right">Duplikat</th>
                  <th className="font-normal py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-[var(--border-soft)]">
                    <td className="py-2 px-2 text-[var(--muted2)] whitespace-nowrap">{l.time}</td>
                    <td className="py-2 px-2 text-[var(--muted)]">{l.batch}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{l.received}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{l.inserted}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{l.updated}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{l.duplicate}</td>
                    <td className="py-2 px-2">
                      <span className={`text-xs ${l.status === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {l.status === 'ok' ? 'OK' : 'Error'}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-[var(--faint)] py-8">
                      Menunggu data dari agent…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!live && (
        <p className="text-xs text-[var(--faint)]">
          Mode simulasi menampilkan contoh aliran data. Untuk data nyata: jalankan Sync Agent +
          set <code>VITE_DATA_SOURCE=supabase</code> dan buat tabel <code>agent_status</code> &{' '}
          <code>sync_logs</code> (lihat <code>supabase/agent_schema.sql</code>).
        </p>
      )}
    </div>
  )
}
