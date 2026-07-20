import { Link } from 'react-router-dom'
import { Truck, Boxes, LineChart, ArrowRight } from 'lucide-react'
import Hero from '../components/Hero'
import FadeIn from '../components/FadeIn'

const features = [
  {
    icon: Truck,
    title: 'Truck Scale Live',
    status: 'Live',
    desc: 'Data timbangan truk realtime dari jembatan timbang, langsung ke dashboard di mana saja.',
    to: '/dashboard',
  },
  {
    icon: Boxes,
    title: 'Logistics',
    status: 'Segera',
    desc: 'Pelacakan armada, ritase, dan alur muatan dalam satu ekosistem.',
    to: '#',
  },
  {
    icon: LineChart,
    title: 'Insight',
    status: 'Segera',
    desc: 'Analitik tonase, tren, dan laporan otomatis untuk pengambilan keputusan.',
    to: '#',
  },
]

export default function Landing() {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <Hero />

      {/* Ecosystem / Features */}
      <section id="ecosystem" className="px-6 md:px-12 lg:px-16 py-20 lg:py-28">
        <FadeIn delay={0} duration={800}>
          <p className="text-sm text-[var(--muted)] mb-3">The UMS Ecosystem</p>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-normal mb-4"
            style={{ letterSpacing: '-0.03em' }}
          >
            One platform. Every operation.
          </h2>
          <p className="text-[var(--muted2)] max-w-2xl mb-12">
            Modul-modul yang saling terhubung. Fitur pertama yang aktif adalah
            Truck Scale Live — menampilkan hasil timbang truk secara realtime.
          </p>
        </FadeIn>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            const isLive = f.status === 'Live'
            const card = (
              <div className="glass border border-[var(--border)] rounded-2xl p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-xl bg-[var(--chip)] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      isLive
                        ? 'border-emerald-400/40 text-emerald-500'
                        : 'border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <h3 className="text-xl font-medium mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--muted2)] flex-1">{f.desc}</p>
                {isLive && (
                  <span className="mt-6 inline-flex items-center gap-1 text-sm text-[var(--text)]">
                    Buka <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )
            return (
              <FadeIn key={f.title} delay={150 * i} duration={800} className="h-full">
                {isLive ? (
                  <Link to={f.to} className="block h-full">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </FadeIn>
            )
          })}
        </div>
      </section>

      <footer className="px-6 md:px-12 lg:px-16 py-10 border-t border-[var(--border)] text-sm text-[var(--muted)] flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-lg font-semibold tracking-tight text-[var(--text)]">
          UMS Ecosystem
        </span>
        <span>© {new Date().getFullYear()} UMS Ecosystem. All rights reserved.</span>
      </footer>
    </div>
  )
}
