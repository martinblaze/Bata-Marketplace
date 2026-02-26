'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'

// ── Particle Canvas ────────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMouseMove)

    const COUNT = 250
    type Particle = {
      x: number; y: number; ox: number; oy: number
      vx: number; vy: number; size: number; alpha: number
      color: string; speed: number
    }

    const COLORS = ['#5b21b6', '#4c1d95', '#3730a3', '#6d28d9', '#312e81', '#4338ca']

    const particles: Particle[] = Array.from({ length: COUNT }, () => {
      const x = Math.random() * window.innerWidth
      const y = Math.random() * window.innerHeight
      return {
        x, y, ox: x, oy: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: Math.random() * 0.5 + 0.1,
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Very subtle mouse glow
      const grd = ctx.createRadialGradient(
        mouse.current.x, mouse.current.y, 0,
        mouse.current.x, mouse.current.y, 180
      )
      grd.addColorStop(0, 'rgba(91,33,182,0.05)')
      grd.addColorStop(1, 'rgba(91,33,182,0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        // Drift origin point
        p.ox += p.vx
        p.oy += p.vy

        // Wrap origin around edges
        if (p.ox < 0) p.ox = canvas.width
        if (p.ox > canvas.width) p.ox = 0
        if (p.oy < 0) p.oy = canvas.height
        if (p.oy > canvas.height) p.oy = 0

        // Mouse repulsion — subtle, no glow or size change
        const dx = p.ox - mouse.current.x
        const dy = p.oy - mouse.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const repulse = 100

        if (dist < repulse && dist > 0) {
          const force = (repulse - dist) / repulse
          p.x = p.ox + (dx / dist) * force * 30
          p.y = p.oy + (dy / dist) * force * 30
        } else {
          p.x += (p.ox - p.x) * 0.05
          p.y += (p.oy - p.y) * 0.05
        }

        // Plain dot — fixed size, fixed alpha, no glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 90) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(91,33,182,${(1 - dist / 90) * 0.1})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 1800
        const steps = 60
        const increment = target / steps
        let current = 0
        const timer = setInterval(() => {
          current = Math.min(current + increment, target)
          setCount(Math.floor(current))
          if (current >= target) clearInterval(timer)
        }, duration / steps)
      }
    }, { threshold: 0.5 })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ── Magnetic card ─────────────────────────────────────────────────────────────
function MagneticCard({ children, className = '', href }: {
  children: React.ReactNode; className?: string; href?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    el.style.transform = `perspective(600px) rotateX(${-dy * 6}deg) rotateY(${dx * 6}deg) translateZ(8px)`
  }, [])

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)'
  }, [])

  const inner = (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transition: 'transform 0.15s ease', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const categories = [
    { name: 'Fashion & Clothing', icon: '👔', count: '3.1K items', accent: '#7c3aed', bg: 'bg-purple-100', text: 'text-purple-600' },
    { name: 'Food Services',      icon: '🍔', count: '1.2K items', accent: '#d97706', bg: 'bg-orange-100', text: 'text-orange-600' },
    { name: 'Room Essentials',    icon: '🏠', count: '950 items',  accent: '#059669', bg: 'bg-green-100',  text: 'text-green-600' },
    { name: 'School Supplies',    icon: '🎒', count: '740 items',  accent: '#2563eb', bg: 'bg-blue-100',   text: 'text-blue-600' },
    { name: 'Tech Gadgets',       icon: '🎧', count: '680 items',  accent: '#4f46e5', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { name: 'Cosmetics',          icon: '💄', count: '520 items',  accent: '#db2777', bg: 'bg-pink-100',   text: 'text-pink-600' },
    { name: 'Snacks',             icon: '🍿', count: '890 items',  accent: '#ca8a04', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    { name: 'Books',              icon: '📚', count: '650 items',  accent: '#0d9488', bg: 'bg-teal-100',   text: 'text-teal-600' },
  ]

  const locations = ['Aroma', 'Tempsite', 'Express Gate', 'Ifite', 'Amansea', 'Bus Stand', 'School Hostel']

  return (
    <>
      {/* Google Fonts - must be a link tag, not @import inside style, to avoid hydration mismatch */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap"
      />
      <style suppressHydrationWarning>{`
        .bata-page { font-family: 'DM Sans', sans-serif; }
        .bata-display { font-family: 'Syne', sans-serif; }

        .hero-text-gradient {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4f46e5 70%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% 200%;
          animation: shimmer 4s ease infinite;
        }

        @keyframes shimmer {
          0%   { background-position: 0% 50% }
          50%  { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }

        .glow-ring {
          box-shadow: 0 0 0 1px rgba(124,58,237,0.2), 0 0 20px rgba(99,102,241,0.08);
        }

        .category-card:hover .category-icon {
          transform: scale(1.15) rotate(-5deg);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .category-icon {
          transition: transform 0.3s ease;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) }
          50% { transform: translateY(-12px) }
        }

        .float-slow { animation: float 6s ease-in-out infinite }
        .float-med  { animation: float 4s ease-in-out infinite 1s }
        .float-fast { animation: float 5s ease-in-out infinite 0.5s }

        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(124,58,237,0.5) }
          70%  { transform: scale(1);    box-shadow: 0 0 0 12px rgba(124,58,237,0) }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(124,58,237,0) }
        }
        .pulse-ring { animation: pulse-ring 2.5s ease-out infinite }

        .stat-card {
          position: relative;
          overflow: hidden;
        }
        .stat-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent);
        }

        @keyframes border-flow {
          0%   { background-position: 0% 50% }
          100% { background-position: 200% 50% }
        }

        .animated-border {
          position: relative;
        }
        .animated-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.8), rgba(99,102,241,0.9), transparent);
          background-size: 200% 100%;
          animation: border-flow 3s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .location-pill {
          position: relative;
          transition: all 0.3s ease;
          cursor: default;
        }
        .location-pill:hover {
          background: rgba(124,58,237,0.1);
          border-color: rgba(124,58,237,0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(124,58,237,0.15);
        }

        .cta-btn {
          position: relative;
          overflow: hidden;
        }
        .cta-btn::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }
        .cta-btn:hover::before {
          width: 400px;
          height: 400px;
        }

        /* Sections sit above canvas but let it show through via transparent backgrounds */
        .bata-page section, .bata-page footer {
          position: relative;
          z-index: 1;
        }

        .grid-pattern {
          background-image:
            linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .hero-bg {
          background: linear-gradient(135deg, rgba(245,243,255,0.75) 0%, rgba(255,255,255,0.70) 40%, rgba(237,233,254,0.75) 70%, rgba(245,243,255,0.75) 100%);
        }
        .section-white { background: rgba(255,255,255,0.82); }
        .section-light { background: rgba(249,250,251,0.82); }
        .section-purple-soft { background: linear-gradient(135deg, rgba(245,243,255,0.80), rgba(237,233,254,0.80)); }
      `}</style>

      <div className="bata-page min-h-screen text-gray-900 relative overflow-x-hidden" style={{background: '#f0eeff'}}>
        <ParticleCanvas />

        {/* ── HERO ── */}
        <section className="relative min-h-screen flex items-center justify-center px-4 hero-bg grid-pattern">
          {/* Background orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center">

            {/* Badge */}
            <Reveal>
              <div className="inline-flex items-center gap-2.5 bg-white/80 border border-purple-200 backdrop-blur-sm px-5 py-2 rounded-full mb-8 glow-ring shadow-sm">
                <div className="pulse-ring w-2 h-2 bg-purple-600 rounded-full" />
                <span className="text-sm font-medium text-purple-700 tracking-wide bata-display">
                  BATA — UNIZIK's Campus Marketplace
                </span>
              </div>
            </Reveal>

            {/* Headline */}
            <Reveal delay={100}>
              <h1 className="bata-display text-5xl md:text-7xl lg:text-8xl font-800 leading-[0.95] tracking-tight mb-6">
                <span className="hero-text-gradient">Buy. Sell.</span>
                <br />
                <span className="text-gray-900">Deliver.</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-gray-500 text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-10">
                The smartest way for UNIZIK students to trade — secure escrow payments,
                campus-wide delivery, real seller verification.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/signup"
                  className="cta-btn group relative w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-10 py-4 rounded-xl font-semibold text-base bata-display tracking-wide transition-all duration-300 shadow-[0_0_30px_rgba(91,33,182,0.4)] hover:shadow-[0_0_50px_rgba(91,33,182,0.6)]"
                >
                  Join BATA — It's Free
                </Link>
                <Link
                  href="/marketplace"
                  className="cta-btn group w-full sm:w-auto bg-white hover:bg-purple-50 border-2 border-purple-600 text-purple-700 hover:text-purple-800 px-10 py-4 rounded-xl font-semibold text-base bata-display tracking-wide transition-all duration-300 shadow-sm"
                >
                  Explore Marketplace →
                </Link>
              </div>
            </Reveal>

            {/* Floating icons */}
            <Reveal delay={400}>
              <div className="flex justify-center items-end gap-6 mt-16">
                {[
                  { icon: '🛍️', label: 'Buy', color: 'from-purple-100 to-purple-50', border: 'border-purple-200', cls: 'float-slow' },
                  { icon: '🔐', label: 'Escrow', color: 'from-indigo-100 to-indigo-50', border: 'border-indigo-200', cls: 'float-med' },
                  { icon: '🛵', label: 'Deliver', color: 'from-violet-100 to-violet-50', border: 'border-violet-200', cls: 'float-fast' },
                ].map(({ icon, label, color, border, cls }) => (
                  <div key={label} className={`${cls} text-center`}>
                    <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${color} border ${border} rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-md`}>
                      {icon}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 tracking-widest uppercase">{label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400 tracking-widest uppercase">Scroll</span>
            <div className="w-px h-12 bg-gradient-to-b from-purple-500/50 to-transparent animate-pulse" />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="relative py-24 px-4 section-white">
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="relative max-w-6xl mx-auto">

            <Reveal>
              <div className="text-center mb-16">
                <p className="text-purple-600 text-xs tracking-[0.3em] uppercase font-semibold mb-3 bata-display">The Process</p>
                <h2 className="bata-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">How BATA Works</h2>
                <p className="text-gray-500 max-w-lg mx-auto">Built for student commerce — secure, fast, and campus-native</p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6 relative">
              {[
                {
                  num: '01',
                  title: 'Browse & Buy',
                  desc: 'Explore products from verified UNIZIK students across all faculties and hostels.',
                  icon: '🔍',
                  color: 'from-purple-50 to-white',
                  border: 'border-purple-200',
                  numColor: 'text-purple-400',
                },
                {
                  num: '02',
                  title: 'Secure Escrow',
                  desc: 'Your money is held safely in escrow. Released to seller only after you confirm delivery.',
                  icon: '🔐',
                  color: 'from-indigo-50 to-white',
                  border: 'border-indigo-200',
                  numColor: 'text-indigo-400',
                  featured: true,
                },
                {
                  num: '03',
                  title: 'Fast Delivery',
                  desc: 'Campus riders deliver to your hostel or pickup point — often within the hour.',
                  icon: '🛵',
                  color: 'from-violet-50 to-white',
                  border: 'border-violet-200',
                  numColor: 'text-violet-400',
                },
              ].map(({ num, title, desc, icon, color, border, numColor, featured }, i) => (
                <Reveal key={title} delay={i * 120}>
                  <MagneticCard
                    className={`relative h-full p-8 rounded-2xl bg-gradient-to-br ${color} border ${border} shadow-sm hover:shadow-md ${featured ? 'animated-border' : ''} group transition-shadow duration-300`}
                  >
                    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{icon}</div>
                    <div className={`text-xs ${numColor} font-mono tracking-widest mb-2 bata-display`}>{num}</div>
                    <h3 className="bata-display text-xl font-bold text-gray-900 mb-3">{title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>

                    <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-purple-200/60 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-purple-100/40 rounded-bl-lg" />
                  </MagneticCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section className="relative py-24 px-4 section-light">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-300/40 to-transparent" />

          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-purple-600 text-xs tracking-[0.3em] uppercase font-semibold mb-3 bata-display">Products</p>
                <h2 className="bata-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Shop by Category</h2>
                <p className="text-gray-500">Everything a UNIZIK student needs — in one place</p>
              </div>
            </Reveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map(({ name, icon, count, accent, bg, text }, i) => (
                <Reveal key={name} delay={i * 60}>
                  <MagneticCard href={`/marketplace?category=${encodeURIComponent(name)}`}>
                    <div
                      className="category-card relative p-5 rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group"
                    >
                      {/* Accent glow on hover */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
                        style={{ background: `radial-gradient(ellipse at top left, ${accent}10, transparent 70%)` }}
                      />
                      {/* Top border accent */}
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-xl"
                        style={{ background: `linear-gradient(90deg, transparent, ${accent}90, transparent)` }}
                      />

                      <div className={`category-icon w-14 h-14 ${bg} rounded-2xl flex items-center justify-center text-3xl mb-3`}>{icon}</div>
                      <h3 className="bata-display font-semibold text-gray-900 text-sm leading-snug mb-1">{name}</h3>
                      <p className="text-xs text-gray-400">{count}</p>
                    </div>
                  </MagneticCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── LOCATIONS ── */}
        <section className="relative py-24 px-4 section-white">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-200/60 to-transparent" />
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="text-purple-600 text-xs tracking-[0.3em] uppercase font-semibold mb-3 bata-display">Coverage</p>
              <h2 className="bata-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Delivering Across UNIZIK
              </h2>
              <p className="text-gray-500 mb-12 max-w-md mx-auto">
                Our rider network covers every major location on and around campus
              </p>
            </Reveal>

            <Reveal delay={100}>
              <div className="flex flex-wrap justify-center gap-3">
                {locations.map((loc, i) => (
                  <div
                    key={loc}
                    className="location-pill flex items-center gap-2 bg-purple-50 border border-purple-200/60 px-5 py-2.5 rounded-full text-sm text-purple-700 font-medium"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    {loc}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-12 relative h-px">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-300/30 to-transparent" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="relative py-24 px-4 overflow-hidden section-purple-soft">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

          <div className="relative max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-purple-600 text-xs tracking-[0.3em] uppercase font-semibold mb-3 bata-display">By The Numbers</p>
                <h2 className="bata-display text-4xl md:text-5xl font-bold text-gray-900">Growing Every Day</h2>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 2000, suffix: '+', label: 'Active Users', sub: 'students trading daily', icon: '👥' },
                { value: 5000, suffix: '+', label: 'Products Listed', sub: 'across all categories', icon: '📦' },
                { value: 98,   suffix: '%', label: 'Satisfaction Rate', sub: 'verified buyer reviews', icon: '⭐' },
              ].map(({ value, suffix, label, sub, icon }, i) => (
                <Reveal key={label} delay={i * 100}>
                  <MagneticCard>
                    <div className="stat-card relative p-8 rounded-2xl bg-white border border-purple-100 text-center shadow-sm">
                      <div className="text-3xl mb-4">{icon}</div>
                      <div className="bata-display text-5xl font-bold bg-gradient-to-br from-purple-700 to-indigo-600 bg-clip-text text-transparent tabular-nums mb-2">
                        <AnimatedCounter target={value} suffix={suffix} />
                      </div>
                      <p className="text-gray-900 font-semibold mb-1 bata-display">{label}</p>
                      <p className="text-gray-400 text-xs">{sub}</p>
                    </div>
                  </MagneticCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-28 px-4 section-white overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-200/50 to-transparent" />

          {/* Giant watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="bata-display text-[20vw] font-bold text-purple-100 tracking-tighter">BATA</span>
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <Reveal>
              <p className="text-purple-600 text-xs tracking-[0.3em] uppercase font-semibold mb-4 bata-display">Get Started</p>
              <h2 className="bata-display text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Ready to Start
                <br />
                <span className="hero-text-gradient">Trading?</span>
              </h2>
              <p className="text-gray-500 text-lg max-w-md mx-auto mb-10">
                Join thousands of UNIZIK students using BATA for campus commerce. Free to join, easy to use.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="cta-btn inline-block bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-12 py-4 rounded-xl font-bold text-lg bata-display tracking-wide transition-all duration-300 shadow-[0_0_40px_rgba(91,33,182,0.3)] hover:shadow-[0_0_60px_rgba(91,33,182,0.5)] hover:-translate-y-1"
                >
                  Create Free Account
                </Link>
              </div>

              <p className="text-gray-400 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-600 hover:text-purple-700 transition-colors font-medium">
                  Sign in →
                </Link>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── RIDER CTA ── */}
        <Reveal>
          <div className="relative bg-gradient-to-r from-purple-50 to-indigo-50 border-y border-purple-100 py-5 px-4 text-center">
            <Link
              href="/rider-signup"
              className="inline-flex items-center gap-3 text-purple-700 hover:text-purple-900 transition-colors group"
            >
              <span className="text-xl">🛵</span>
              <span className="bata-display font-semibold tracking-wide">Become a Rider</span>
              <span className="text-gray-400 text-sm">— Earn ₦560 per delivery</span>
              <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </Reveal>

        {/* ── FOOTER ── */}
        <footer className="relative bg-gray-50 border-t border-gray-200 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-700 to-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">B</div>
                  <span className="bata-display font-bold text-gray-900 text-lg tracking-wide">BATA</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Student-to-student marketplace built exclusively for UNIZIK.
                </p>
              </div>
              {[
                {
                  label: 'Product',
                  links: [
                    { name: 'Marketplace', href: '/marketplace' },
                    { name: 'Sell on BATA', href: '/sell' },
                    { name: 'Become a Rider', href: '/rider-signup' },
                  ],
                },
                {
                  label: 'Company',
                  links: [
                    { name: 'About', href: '/about' },
                    { name: 'Contact', href: '/contact' },
                  ],
                },
                {
                  label: 'Legal',
                  links: [
                    { name: 'Privacy Policy', href: '/privacy' },
                    { name: 'Terms of Use', href: '/terms' },
                  ],
                },
              ].map(({ label, links }) => (
                <div key={label}>
                  <h4 className="bata-display text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{label}</h4>
                  <ul className="space-y-2.5">
                    {links.map(({ name, href }) => (
                      <li key={name}>
                        <Link
                          href={href}
                          className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
                        >
                          {name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8" />

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-xs">© 2026 BATA. Built with ❤️ for UNIZIK Students.</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}