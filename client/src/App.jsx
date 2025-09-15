import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { api } from './api'
import PizzaLayers from './components/PizzaLayers'
import { load } from '@cashfreepayments/cashfree-js'
import pizzaBake from './assets/video/pizza-bake.mp4'

// ---- Pricing helpers (used only for UI display) ----
const USD_TO_INR = Number(import.meta.env.VITE_USD_TO_INR || '83')
const MARKET_ADJ = Number(import.meta.env.VITE_MARKET_ADJ || '0.20')
const adjToINR = (usd) => Number(usd || 0) * USD_TO_INR * MARKET_ADJ

const retailRoundINR = (n) => {
  const x = Math.max(0, Number(n || 0))
  let r = (x)
  if (r < 100) return r
  const lastTwo = r % 100
  if (lastTwo <= 25) return r - lastTwo
  if (lastTwo <= 75) return r - lastTwo + 49
  return r - lastTwo + 99
}

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(n || 0))

  // Numeric rupee value used for posting to the server (matches the UI)
const inrNumber = (usd) => adjToINR(usd);

const displayINR = (usd) => formatINR(adjToINR(usd));

// ✅ These two helpers guarantee “what you see is what you pay”
const toINRrupees = (usd) =>adjToINR(usd)      // rupees (integer)
const formatINRfromRupees = (r) => formatINR(Number(r || 0))      // pretty ₹ formatting

// small inline style helper for 2-line clamp
const CLAMP_2 = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
}

/* -------------------------------------------------------
   Asset aliases for PizzaLayers
-------------------------------------------------------- */
const ASSET_ALIASES = {
  bases: { thinCrust: 'thin-crust', handTossed: 'hand-tossed', cheeseBurst: 'cheese-burst' },
  sauces: { tomato: 'tomato', whiteSauce: 'white', pesto: 'pesto' },
  cheeses: { mozzarella: 'mozzarella', cheddar: 'cheddar', fourCheese: 'four-cheese' },
  veggies: {
    blackOlives: 'olives',
    redOnion: 'onion',
    capsicum: 'capsicum',
    jalapeno: 'jalapeno',
    sweetCorn: 'corn',
    mushroom: 'mushroom',
    paneer: 'paneer'
  }
}

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-2xl">🍕</span>
      <span className="text-xl font-extrabold tracking-tight">Pizza</span>
      <span className="badge ml-1">fresh & hot</span>
    </div>
  )
}

function useAuth() {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })
  useEffect(() => {
    api.me().then(({ user }) => {
      if (user) {
        setUser(user)
        localStorage.setItem('user', JSON.stringify(user))
      }
    }).catch(() => {})
  }, [])
  return useMemo(() => ({ user, setUser }), [user])
}

function Nav({ user, onLogout }) {
  const [open, setOpen] = React.useState(false)
  const links = [
    { to: '/', label: 'Home' },
    { to: '/menu', label: 'Menu' },
    { to: '/build', label: 'Build your own' },
    ...(user ? [{ to: '/orders', label: 'My Orders' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : [])
  ]

  return (
    <header className="sticky top-0 z-40">
      <div className="container-xl py-3">
        <div className="glass px-4 md:px-5 py-3 flex items-center rounded-xl">
          <Logo />

          {/* mobile toggle */}
          <button
            className="ml-2 md:hidden btn btn-ghost"
            aria-label="Toggle navigation"
            onClick={() => setOpen(o => !o)}
          >☰</button>

          {/* center nav */}
          <nav className="hidden md:flex items-center gap-2 mx-auto">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-white/10 border border-white/10 text-[var(--primary)] font-bold'
                      : 'text-[var(--text)] hover:bg-white/5'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* right auth */}
          <div className="ml-auto hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden lg:inline text-sm text-[var(--muted)]">Hi, {user.name}</span>
                <button className="btn btn-primary" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/login">Login</Link>
                <Link className="btn btn-secondary" to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="md:hidden container-xl">
          <div className="glass rounded-xl mt-2 p-2 space-y-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={()=>setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg ${
                    isActive ? 'bg-white/80 text-[var(--primary)] font-bold' : 'hover:bg-white/60'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-white/60 mt-1">
              {user ? (
                <button className="btn btn-primary w-full" onClick={()=>{ setOpen(false); onLogout(); }}>Logout</button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link className="btn btn-primary" to="/login" onClick={()=>setOpen(false)}>Login</Link>
                  <Link className="btn btn-secondary" to="/register" onClick={()=>setOpen(false)}>Register</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function PopularTriptych(){
  const modules = import.meta.glob('./assets/carousel/*.{jpg,jpeg,png,webp,gif}', { eager: true })

  const slides = React.useMemo(() => {
    const items = Object.entries(modules).map(([path, mod]) => {
      const src = (mod && mod.default) || mod
      const file = path.split('/').pop() || ''
      const title = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
      return { src, title }
    })
    items.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
    return items
  }, [])

  const fallback = [
    { src: 'https://images.unsplash.com/photo-1548365328-9f547fb095d6?w=1000&q=80', title: 'Margherita' },
    { src: 'https://images.unsplash.com/photo-1541745537413-b804ebf3ed3f?w=1000&q=80', title: 'Mushroom Pizza' },
    { src: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=1000&q=80', title: 'Pepperoni' }
  ]

  const data = slides.length ? slides : fallback
  const imgs = data.map(s => s.src)
  const titles = data.map(s => s.title || 'Slide')

  const [idx, setIdx] = React.useState(0)
  React.useEffect(() => {
    if (imgs.length <= 1) return
    const id = setInterval(() => setIdx(v => (v + 1) % imgs.length), 1600)
    return () => clearInterval(id)
  }, [imgs.length])

  const n = imgs.length
  const pos = (k) => {
    const rel = (k - idx + n) % n
    if (rel === 0) return 0
    if (rel === 1) return 1
    if (rel === n - 1) return -1
    return 9
  }

  const cardStyle = (p) => {
    const base = {
      position: 'absolute', top: '50%', transformOrigin: '50% 50%',
      transition: 'transform 600ms ease, opacity 600ms ease',
      borderRadius: '50%', objectFit: 'cover', boxShadow: '0 18px 40px rgba(0,0,0,0.12)'
    }
    if (p === 0)   return { ...base, left: '50%', width: 320, height: 320, transform: 'translate(-50%, -50%) scale(1.0)', zIndex: 3, opacity: 1 }
    if (p === 1)   return { ...base, left: '82%', width: 220, height: 220, transform: 'translate(-50%, -50%) scale(0.85)', zIndex: 2, opacity: 0.9 }
    if (p === -1)  return { ...base, left: '18%', width: 220, height: 220, transform: 'translate(-50%, -50%) scale(0.85)', zIndex: 2, opacity: 0.9 }
    return { ...base, left: '50%', width: 100, height: 100, transform: 'translate(-50%, -50%) scale(0.6)', zIndex: 1, opacity: 0 }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 pt-8 md:pt-12">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="text-center px-4 pt-8 md:pt-12">
          <div style={{ fontSize:34, fontWeight:900, lineHeight:1.1 }}>Discover</div>
          <div style={{ fontSize:34, fontWeight:900, lineHeight:1.1, marginTop:4 }}>Popular Orders</div>
          <p style={{ maxWidth:560, margin:'10px auto 0', color:'#6b4f4a' }} />
        </div>

        <div className="relative mx-auto my-6 md:my-10" style={{ height: 360, maxWidth: 980 }}>
          {imgs.map((src, k) => {
            const p = pos(k)
            if (p === 9) return null
            return <img key={k} alt={titles[k] || 'slide'} src={src} style={cardStyle(p)} loading="lazy" />
          })}
        </div>

        <div className="text-center font-extrabold" style={{ color:'#c13b2a', fontSize:18, paddingBottom:18 }}>
          {titles[idx % titles.length]}
        </div>
      </div>
      <div className="h-10 md:h-14" />
    </section>
  )
}

function Login({ setUser }) {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h2 className="text-2xl font-bold mb-4">Welcome back</h2>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <input className="input w-full mb-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input w-full mb-4" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="btn btn-primary w-full" onClick={async () => {
        setErr('')
        try {
          const u = await api.login(form)
          setUser(u)
          localStorage.setItem('user', JSON.stringify(u))
          nav(u.role === 'admin' ? '/admin' : '/')
        } catch (e) { setErr(e.message) }
      }}>Login</button>
      <div className="mt-2 text-sm">
        <Link className="text-slate-600 hover:underline" to="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  )
}

function AdminLogin({ setUser }) {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h2 className="text-2xl font-bold mb-4">Admin login</h2>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <input className="input mb-3" placeholder="Admin Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input mb-4" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="btn btn-primary w-full" onClick={async () => {
        setErr('')
        try {
          const u = await api.login(form)
          if (u.role !== 'admin') throw new Error('Not an admin account')
          setUser(u)
          localStorage.setItem('user', JSON.stringify(u))
          nav('/admin')
        } catch (e) { setErr(e.message) }
      }}>Login</button>
    </div>
  )
}

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h2 className="text-2xl font-bold mb-4">Create account</h2>
      {msg && <p className="text-green-700 mb-2">{msg}</p>}
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <input className="input w-full mb-3" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className="input w-full mb-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input w-full mb-4" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="btn btn-primary w-full" onClick={async () => {
        setErr(''); setMsg('')
        try { await api.register(form); setMsg('Registered! Check your email to verify.') }
        catch (e) { setErr(e.message) }
      }}>Create Account</button>
    </div>
  )
}

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h2 className="text-2xl font-bold mb-4">Forgot password</h2>
      <input className="input mb-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn btn-primary w-full" onClick={async () => { await api.forgot({ email }); setMsg('If the email exists, a reset link was sent.') }}>Send Reset Link</button>
      {msg && <p className="text-green-700 mt-3">{msg}</p>}
    </div>
  )
}

function ResetPassword() {
  const [sp] = useSearchParams()
  const email = sp.get('email') || ''
  const token = sp.get('token') || ''
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h2 className="text-2xl font-bold mb-4">Reset password</h2>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      {msg && <p className="text-green-700 mb-2">{msg}</p>}
      <input className="input mb-3" placeholder="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary w-full" onClick={async () => {
        setErr(''); setMsg('')
        try { await api.reset({ email, token, password }); setMsg('Password updated. You can log in.') }
        catch (e) { setErr(e.message) }
      }}>Update Password</button>
    </div>
  )
}

function Menu({ addToCart }) {
  const [pizzas, setPizzas] = useState([])
  useEffect(() => { api.pizzas().then(setPizzas) }, [])

  return (
    <section className="container-xl pb-8 space-y-6 pt-6 md:pt-8">
      <div className="flex items-end justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight">Our Pizzas</h2>
        <span className="text-sm text-slate-600">Made fresh, delivered hot</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pizzas.map((p) => {
          const img = p.imageUrl
          return (
            <div key={p._id} className="card hover:shadow-lg transition transform hover:-translate-y-1">
              {img && (
                <div className="mb-2 overflow-hidden rounded-lg">
                  <img
                    src={img}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-40 object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}
              <div className="flex items-start justify-between mb-2 gap-3">
                <h3 className="text-xl font-bold" style={CLAMP_2}>{p.name}</h3>
                <span className="badge shrink-0">{displayINR(p.price)}</span>
              </div>
              {p.description && <p className="text-sm text-[var(--muted)] mb-3" style={CLAMP_2}>{p.description}</p>}
              <button className="btn btn-secondary w-full" onClick={() => addToCart(p)}>Add to cart</button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CustomBuilder({ addCustomToCart }) {
  const [opts, setOpts] = useState(null)
  const [sel, setSel] = useState({
    base: '', sauce: '', cheese: '', veggies: [],
    density: { sauce: 'normal', cheese: 'normal', toppings: 'normal' },
    toppingLevels: {}
  })
  const [price, setPrice] = useState(0)

  useEffect(() => {
    api.customizeOptions().then((raw) => {
      const filtered = {
        ...raw,
        cheeses: (raw.cheeses || []).filter((ch) => {
          const id = String(ch.id || '').toLowerCase()
          const name = String(ch.name || '').toLowerCase()
          return !id.includes('vegan') && !name.includes('vegan')
        })
      }
      setOpts(filtered)
    })
  }, [])

  useEffect(() => {
    if (!opts) return
    const find = (arr, id) => arr.find(x => x.id === id)?.price || 0

    const base   = find(opts.bases || [], sel.base)
    const sauceP = find(opts.sauces || [], sel.sauce)
    const cheeseP= find(opts.cheeses|| [], sel.cheese)

    const d = sel.density || {}
    const norm = (v) => String(v || 'normal').toLowerCase()
    const mult = (amt) => {
      const a = norm(amt)
      return (a==='low'||a==='light') ? 1 : (a==='extra' ? 3 : 2)
    }
    const mSauce = mult(d.sauce)
    const mCheese= mult(d.cheese)

    const vegTotal = (sel.veggies || []).reduce((sum, id) => {
      const price = find(opts.veggies || [], id)
      const level = sel.toppingLevels?.[id] ?? d.toppings ?? 'normal'
      return sum + price * mult(level)
    }, 0)

    const total = 2 + base + sauceP * mSauce + cheeseP * mCheese + vegTotal
    setPrice(Number(total.toFixed(2)))
  }, [sel, opts])

  React.useEffect(() => {
    if (!opts) return
    console.log('[customizeOptions ids]', {
      bases:   (opts.bases||[]).map(x => ({ id:x.id, name:x.name })),
      sauces:  (opts.sauces||[]).map(x => ({ id:x.id, name:x.name })),
      cheeses: (opts.cheeses||[]).map(x => ({ id:x.id, name:x.name })),
      veggies: (opts.veggies||[]).map(x => ({ id:x.id, name:x.name }))
    })
  }, [opts])

  if (!opts) return (
    <section className="max-w-6xl mx-auto px-4 py-6"><div className="card">Loading builder…</div></section>
  )

  const toggleVeg = (id) => {
    const item = (opts.veggies || []).find(v => v.id === id)
    if (!item || item.disabled) return
    setSel((s) => {
      const selected = s.veggies.includes(id)
      if (selected) {
        const { [id]: _drop, ...restLevels } = s.toppingLevels || {}
        return { ...s, veggies: s.veggies.filter(x => x !== id), toppingLevels: restLevels }
      } else {
        return { ...s, veggies: [...s.veggies, id], toppingLevels: { ...(s.toppingLevels||{}), [id]: 'normal' } }
      }
    })
  }

  const selectedDisabled =
    (sel.base   && (opts.bases?.find(b => b.id===sel.base)?.disabled))   ||
    (sel.sauce  && (opts.sauces?.find(s => s.id===sel.sauce)?.disabled)) ||
    (sel.cheese && (opts.cheeses?.find(c => c.id===sel.cheese)?.disabled)) ||
    (sel.veggies || []).some(id => (opts.veggies?.find(v => v.id===id)?.disabled))

  const canAdd = sel.base && sel.sauce && sel.cheese && !selectedDisabled

  const LevelButtons = ({ value, onChange, disabled }) => {
    const options = ['low','normal','extra']
    return (
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-slate-600">Amount:</span>
        {options.map(v => (
          <button
            key={v}
            className={`btn ${value===v ? 'btn-secondary' : 'btn-ghost'}`}
            disabled={disabled}
            onClick={() => !disabled && onChange(v)}
          >{v}</button>
        ))}
      </div>
    )
  }

  const Pill = ({ disabled, active, onClick, children }) => (
    <button
      className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={!!active}
      title={disabled ? 'Out of stock' : ''}
    >
      {children} {disabled ? ' (out)' : ''}
    </button>
  )

  return (
    <section className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight">Build your own</h2>
        <span className="text-sm text-slate-600">Custom pizza crafted your way</span>
      </div>

      <div className="card">
        <PizzaLayers sel={sel} opts={opts} assetMap={ASSET_ALIASES} size={560} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <h3 className="font-bold mb-2">1. Choose base</h3>
          <div className="grid grid-cols-2 gap-2">
            {(opts.bases || []).map(b => (
              <Pill key={b.id}
                disabled={!!b.disabled}
                active={sel.base === b.id}
                onClick={() => !b.disabled && setSel({ ...sel, base: b.id })}
              >{b.name}</Pill>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold mb-2">2. Choose sauce</h3>
          <div className="grid grid-cols-2 gap-2">
            {(opts.sauces || []).map(s => (
              <Pill key={s.id}
                disabled={!!s.disabled}
                active={sel.sauce === s.id}
                onClick={() => !s.disabled && setSel({ ...sel, sauce: s.id })}
              >{s.name}</Pill>
            ))}
          </div>
          <LevelButtons
            value={sel.density.sauce}
            disabled={!!(opts.sauces?.find(s => s.id===sel.sauce)?.disabled) || !sel.sauce}
            onChange={(v) => setSel({ ...sel, density: { ...sel.density, sauce: v } })}
          />
        </div>

        <div className="card">
          <h3 className="font-bold mb-2">3. Choose cheese</h3>
          <div className="grid grid-cols-2 gap-2">
            {(opts.cheeses || []).map(c => (
              <Pill key={c.id}
                disabled={!!c.disabled}
                active={sel.cheese === c.id}
                onClick={() => !c.disabled && setSel({ ...sel, cheese: c.id })}
              >{c.name}</Pill>
            ))}
          </div>
          <LevelButtons
            value={sel.density.cheese}
            disabled={!!(opts.cheeses?.find(c => c.id===sel.cheese)?.disabled) || !sel.cheese}
            onChange={(v) => setSel({ ...sel, density: { ...sel.density, cheese: v } })}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">4. Veggies</h3>
        <div className="flex flex-wrap gap-2">
          {(opts.veggies || []).map(v => (
            <button key={v.id}
              className={`btn ${sel.veggies.includes(v.id) ? 'btn-secondary' : 'btn-ghost'}`}
              disabled={!!v.disabled}
              onClick={() => toggleVeg(v.id)}
              title={v.disabled ? 'Out of stock' : ''}
            >
              {v.name} {v.disabled ? ' (out)' : ''}
            </button>
          ))}
        </div>

        {sel.veggies.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-slate-600 font-semibold">Topping amounts</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sel.veggies.map(id => {
                const v = (opts.veggies || []).find(x => x.id === id)
                const level = sel.toppingLevels?.[id] ?? 'normal'
                return (
                  <div key={id} className="glass p-2 rounded">
                    <div className="text-sm font-medium">{v?.name || id}</div>
                    <div className="mt-2 flex gap-2">
                      {['low','normal','extra'].map(opt => (
                        <button
                          key={opt}
                          className={`btn ${level===opt ? 'btn-secondary' : 'btn-ghost'}`}
                          onClick={() => setSel(s => ({
                            ...s,
                            toppingLevels: { ...(s.toppingLevels||{}), [id]: opt }
                          }))}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-sm text-slate-600">Estimated price</div>
        <div className="text-2xl font-extrabold">{displayINR(price)}</div>
        <button className="btn btn-primary mt-3" disabled={!canAdd} onClick={() => addCustomToCart(sel, price)}>
          Add to cart
        </button>
      </div>
    </section>
  )
}

function Orders() {
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api.myOrders()
      .then(setOrders)
      .catch((e) => { console.error('myOrders error', e); setErr('Could not load orders') })
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      api.myOrders().then(setOrders).catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const itemLabel = (it) => {
    if (it?.pizza?.name) return it.pizza.name
    if (typeof it?.pizza === 'string') return `Pizza ${it.pizza}`
    if (it?.custom) return 'Custom Pizza'
    return 'Item'
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-3xl font-extrabold tracking-tight mb-4">My Orders</h2>
      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
      <div className="space-y-4">
        {(orders || []).map((o) => (
          <div key={o._id} className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-600">
                {o?.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
              </div>
              <div className="font-semibold">
                Total: {formatINR(o?.total ?? 0)}
              </div>
            </div>
            <div className="mb-2">
              <span className="badge">{o?.status || 'payment_pending'}</span>
            </div>
            <ul className="list-disc ml-5 text-sm text-slate-700">
              {(o?.items || []).map((it, idx) => (
                <li key={idx}>
                  {it?.quantity ?? 0} x {itemLabel(it)}
                </li>
              ))}
            </ul>
            {o?.address && (
              <div className="mt-2 text-xs text-slate-500">Address: {o.address}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function PizzaImageManager({ pizza, gallery, saveUrl, reload }) {
  const [url, setUrl] = React.useState(pizza.imageUrl || '')

  const onPick = async (src) => {
    try {
      setUrl(src)
      await saveUrl(pizza._id, src)
      await reload()
    } catch (e) {
      alert(e.message || 'Save failed')
    }
  }

  const onRemove = async () => {
    try {
      setUrl('')
      await saveUrl(pizza._id, '')
      await reload()
    } catch (e) {
      alert(e.message || 'Remove failed')
    }
  }

  return (
    <div className="glass p-3 rounded-lg mt-3">
      <div className="font-semibold mb-2">Pizza Image</div>

      {url ? (
        <div className="flex items-start gap-3 mb-3">
          <img src={url} alt={pizza.name} className="w-20 h-20 object-cover rounded-md border" loading="lazy" />
          <div className="flex-1 space-y-2">
            <div className="text-xs text-slate-300 break-all">{url}</div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => window.open(url, '_blank')}>Open</button>
              <button className="btn btn-ghost" onClick={onRemove}>Remove</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="text-sm text-slate-300 mb-1">Choose from gallery</div>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {gallery.map(g => (
          <button
            key={g.src}
            className="glass p-1 rounded-md hover:scale-[1.02] transition"
            onClick={() => onPick(g.src)}
            title={g.name}
          >
            <img src={g.src} alt={g.name} className="w-full h-16 object-cover rounded" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}

function Admin() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('') // Enter USD here; shown as INR in lists
  const [description, setDescription] = useState('')

  const [orders, setOrders] = useState([])
  const [refresh, setRefresh] = useState(0)

  const [pizzas, setPizzas] = useState([])
  const [loadingPizzas, setLoadingPizzas] = useState(false)
  const [pizzaErr, setPizzaErr] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const [vInv, setVInv] = useState(null)
  const [vEdit, setVEdit] = useState(null)
  const [vLoading, setVLoading] = useState(false)
  const [vErr, setVErr] = useState('')

  // remember open/closed across reloads
  const [mpOpen, setMpOpen] = useState(() => {
    const v = localStorage.getItem('admin.managePizzas.open');
    return v !== 'false'; // default: open
  });
  useEffect(() => {
    localStorage.setItem('admin.managePizzas.open', String(mpOpen));
  }, [mpOpen]);

  // Collapsible: Orders
  const [ordersOpen, setOrdersOpen] = useState(() => {
    const v = localStorage.getItem('admin.orders.open');
    return v !== 'false'; // default open
  });
  useEffect(() => {
    localStorage.setItem('admin.orders.open', String(ordersOpen));
  }, [ordersOpen]);


  const gallery = React.useMemo(() => {
    const mods = import.meta.glob('./assets/pizza-gallery/*.{jpg,jpeg,png,webp,gif}', { eager: true })
    return Object.entries(mods).map(([p, mod]) => {
      const src = mod.default || mod
      const name = (p.split('/').pop() || '').replace(/\.[^.]+$/, '')
      return { src, name }
    }).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [])

  useEffect(() => {
    api.admin.orders().then(setOrders)
    loadPizzas()
    loadVariantInv()
  }, [refresh])

  async function loadPizzas() {
    try {
      setLoadingPizzas(true); setPizzaErr('')
      const list = await api.pizzas()
      setPizzas(list || [])
    } catch (e) {
      setPizzaErr('Could not load pizzas')
    } finally {
      setLoadingPizzas(false)
    }
  }

  async function onDeletePizza(id) {
    if (!id) return
    if (!confirm('Delete this pizza?')) return
    try {
      setDeletingId(id)
      await api.admin.pizzasDelete(id)
      await loadPizzas()
    } finally { setDeletingId(null) }
  }

  // async function loadVariantInv() {
  //   try {
  //     setVLoading(true); setVErr('')
  //     const data = await api.admin.inventoryVariantsGet()
  //     setVInv(data)
  //     setVEdit(JSON.parse(JSON.stringify(data)))
  //   } catch (e) {
  //     console.error(e)
  //     setVErr('Could not load variant inventory')
  //   } finally {
  //     setVLoading(false)
  //   }
  // }
    async function loadVariantInv() {
    try {
      setVLoading(true); setVErr('');
      const data = await api.admin.inventoryVariantsGet();

      // ⬇️ Remove vegan cheese rows by id or name (case-insensitive)
      const scrubbed = {
        ...data,
        cheeses: (data.cheeses || []).filter(x =>
          !/vegan/i.test(String(x.id || '')) &&
          !/vegan/i.test(String(x.name || ''))
        ),
      };

      setVInv(scrubbed);
      setVEdit(JSON.parse(JSON.stringify(scrubbed))); // editable copy
    } catch (e) {
      console.error(e);
      setVErr('Could not load variant inventory');
    } finally {
      setVLoading(false);
    }
  }


  async function saveVariantInv() {
    try {
      await api.admin.inventoryVariantsSave({
        bases:   (vEdit?.bases   || []).map(x => ({ id: x.id, stock: Number(x.stock||0), threshold: Number(x.threshold||0) })),
        sauces:  (vEdit?.sauces  || []).map(x => ({ id: x.id, stock: Number(x.stock||0), threshold: Number(x.threshold||0) })),
        cheeses: (vEdit?.cheeses || []).map(x => ({ id: x.id, stock: Number(x.stock||0), threshold: Number(x.threshold||0) })),
        veggies: (vEdit?.veggies || []).map(x => ({ id: x.id, stock: Number(x.stock||0), threshold: Number(x.threshold||0) }))
      })
      await loadVariantInv()
    } catch (e) {
      alert(e.message || 'Save failed')
    }
  }

  const CatTable = ({ label, keyName }) => {
    const rows = vEdit?.[keyName] || []
    return (
      <div className="glass p-3">
        <div className="font-semibold mb-2">{label}</div>
        {rows.length === 0 ? (
          <div className="text-sm text-slate-600">No variants</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => {
              const disabled = Number(r.stock||0) < Number(r.threshold||0)
              return (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="w-40 truncate">{r.name || r.id}</div>
                  <input className="input w-20" type="number" value={r.stock}
                         onChange={e => {
                           const v = {...r, stock: Number(e.target.value)}
                           const arr = [...rows]; arr[i] = v
                           setVEdit(prev => ({ ...prev, [keyName]: arr }))
                         }} />
                  <input className="input w-24" type="number" value={r.threshold}
                         onChange={e => {
                           const v = {...r, threshold: Number(e.target.value)}
                           const arr = [...rows]; arr[i] = v
                           setVEdit(prev => ({ ...prev, [keyName]: arr }))
                         }} />
                  <span className={`badge ${disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {disabled ? 'Disabled (stock<threshold)' : 'Enabled'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-3">Create Pizza</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input className="input" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="input" placeholder="Price (USD)" value={price} onChange={(e)=>setPrice(e.target.value)} />
          <input className="input sm:col-span-2" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" onClick={async ()=>{
            await api.admin.pizzasCreate({ name, price: Number(price), description, isAvailable: true })
            setName(''); setPrice(''); setDescription('')
            await loadPizzas()
          }}>Create</button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Variant Inventory</h3>
        {vErr && <div className="text-red-600 text-sm mb-2">{vErr}</div>}
        {vLoading || !vEdit ? <div>Loading…</div> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CatTable label="Bases"   keyName="bases" />
              <CatTable label="Sauces"  keyName="sauces" />
              <CatTable label="Cheeses" keyName="cheeses" />
              <CatTable label="Veggies" keyName="veggies" />
            </div>
            <div className="mt-3">
              <button className="btn btn-primary" onClick={saveVariantInv}>Save Variant Inventory</button>
              <button className="btn btn-ghost ml-2" onClick={loadVariantInv}>Reload</button>
            </div>
          </>
        )}
      </div>

      {/* <div className="card">
        <h3 className="text-xl font-semibold mb-3">Orders</h3>
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o._id} className="glass p-3">
              <div className="flex items-center justify-between text-sm">
                <div><strong>{o.user?.name}</strong> · {o.user?.email}</div>
                <div className="font-semibold">{formatINR(o.total)}</div>
              </div>
              <div className="text-sm text-[var(--muted)]">Address: {o.address}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge">{o.status}</span>
                <div className="ml-auto flex gap-2">
                  <button className="btn btn-ghost" onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'order_received' }); setRefresh(x=>x+1) }}>Order received</button>
                  <button className="btn btn-ghost" onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'in_kitchen' }); setRefresh(x=>x+1) }}>In the kitchen</button>
                  <button className="btn btn-ghost" onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'sent_to_delivery' }); setRefresh(x=>x+1) }}>Sent to delivery</button>
                  <button className="btn btn-primary" onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'delivered' }); setRefresh(x=>x+1) }}>Delivered</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div> */}

      {/* Orders (collapsible) */}
      <div className="card">
        {/* Header row: toggle + count badge */}
        <button
          type="button"
          onClick={() => setOrdersOpen(o => !o)}
          className="w-full flex items-center justify-between"
          aria-expanded={ordersOpen}
          aria-controls="admin-orders-body"
        >
          <h3 className="text-xl font-semibold">Orders</h3>
          <div className="flex items-center gap-2">
            <span className="badge">{orders.length}</span>
            <span
              className="transition-transform"
              style={{ transform: ordersOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              aria-hidden
            >
              ▶
            </span>
          </div>
        </button>

        {/* Body (render only when open) */}
        {ordersOpen && (
          <div id="admin-orders-body" className="mt-3">
            <div className="mb-2 flex items-center gap-2">
              <button className="btn btn-ghost" onClick={() => setRefresh(x => x + 1)}>Reload</button>
            </div>

            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="text-sm text-slate-600">No orders yet.</div>
              ) : (
                orders.map((o) => (
                  <div key={o._id} className="glass p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <strong>{o.user?.name}</strong> · {o.user?.email}
                        <div className="text-xs text-[var(--muted)]">
                          {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className="font-semibold">{displayINR(o.total)}</div>
                    </div>

                    <div className="text-sm text-[var(--muted)]">Address: {o.address}</div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge">{o.status}</span>
                      <div className="ml-auto flex gap-2">
                        <button
                          className="btn btn-ghost"
                          onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'order_received' }); setRefresh(x=>x+1) }}
                        >
                          Order received
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'in_kitchen' }); setRefresh(x=>x+1) }}
                        >
                          In the kitchen
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'sent_to_delivery' }); setRefresh(x=>x+1) }}
                        >
                          Sent to delivery
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={async ()=>{ await api.admin.orderStatus(o._id, { status: 'delivered' }); setRefresh(x=>x+1) }}
                        >
                          Delivered
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>


      {/* <div className="card">
        <h3 className="text-xl font-semibold mb-3">Manage Pizzas</h3>
        {pizzaErr && <div className="text-red-600 text-sm mb-2">{pizzaErr}</div>}
        {loadingPizzas ? <div>Loading pizzas…</div> : (
          pizzas.length === 0 ? <div className="text-sm text-slate-600">No pizzas found.</div> :
          <div className="space-y-3">
            {pizzas.map(p => {
              const thumb = p.imageUrl
              return (
                <div key={p._id} className="glass p-3">
                  <div className="flex items-center gap-3">
                    {thumb
                      ? <img src={thumb} alt={p.name} className="w-12 h-12 object-cover rounded border" loading="lazy" />
                      : <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-[var(--muted)]">No image</div>}
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-[var(--muted)]">{displayINR(p.price)}</div>
                    <div className="text-xs text-[var(--muted)] ml-auto">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                    <button className="btn btn-ghost" disabled={deletingId===p._id} onClick={()=>onDeletePizza(p._id)}>
                      {deletingId===p._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>

                  <PizzaImageManager
                    pizza={p}
                    gallery={gallery}
                    saveUrl={(id, url) => api.admin.pizzasImageSetUrl(id, url)}
                    reload={loadPizzas}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div> */}
      {/* Manage Pizzas (collapsible) */}
      <div className="card">
        {/* Header row is clickable */}
        <button
          type="button"
          onClick={() => setMpOpen(o => !o)}
          className="w-full flex items-center justify-between"
          aria-expanded={mpOpen}
          aria-controls="manage-pizzas-body"
        >
          <h3 className="text-xl font-semibold">Manage Pizzas</h3>
          <span
            className="transition-transform"
            style={{ transform: mpOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-hidden
          >
            ▶
          </span>
        </button>

        {/* Body (render only when open for perf) */}
        {mpOpen && (
          <div id="manage-pizzas-body" className="mt-3">
            {pizzaErr && <div className="text-red-600 text-sm mb-2">{pizzaErr}</div>}
            {loadingPizzas ? (
              <div>Loading pizzas…</div>
            ) : (
              pizzas.length === 0 ? (
                <div className="text-sm text-slate-600">No pizzas found.</div>
              ) : (
                <div className="space-y-3">
                  {pizzas.map(p => {
                    const thumb = p.imageUrl;
                    return (
                      <div key={p._id} className="glass p-3">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded border"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-[var(--muted)]">
                              No image
                            </div>
                          )}
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-sm text-[var(--muted)]">{displayINR(p.price)}</div>
                          <div className="text-xs text-[var(--muted)] ml-auto">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                          </div>
                          <button
                            className="btn btn-ghost"
                            disabled={deletingId === p._id}
                            onClick={() => onDeletePizza(p._id)}
                          >
                            {deletingId === p._id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>

                        {/* Image controls */}
                        <PizzaImageManager
                          pizza={p}
                          gallery={gallery}
                          saveUrl={(id, url) => api.admin.pizzasImageSetUrl(id, url)}
                          reload={loadPizzas}
                        />
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>

    </section>
  )
}

/* ---------- Payment result UI ---------- */
function PaymentStatus({ status, orderId, onClose }) {
  const ok = status === 'success'
  return (
    <div className="text-center py-6">
      <div className={`mx-auto w-16 h-16 rounded-full ${ok ? 'bg-green-500/20' : 'bg-rose-500/20'} flex items-center justify-center`}>
        <div className={`text-3xl ${ok ? 'text-green-500' : 'text-rose-500'}`}>{ok ? '✓' : '✕'}</div>
      </div>

      <h3 className="text-2xl font-extrabold mt-3">
        {ok ? 'Payment successful' : 'Payment failed'}
      </h3>

      {orderId ? (
        <div className="mt-1 text-sm text-slate-400">
          Order ID: <span className="font-mono">{orderId}</span>
        </div>
      ) : null}

      <p className="text-sm text-slate-500 mt-2">
        {ok
          ? "We’re firing up the oven. You can track your order anytime."
          : "Your payment couldn’t be verified. You can try again or contact support."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {ok ? (
          <>
            <Link className="btn btn-primary" to="/orders" onClick={onClose}>Track my order</Link>
            <Link className="btn btn-ghost" to="/menu" onClick={onClose}>Back to menu</Link>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={onClose}>Try again</button>
            <Link className="btn btn-ghost" to="/menu" onClick={onClose}>Back to menu</Link>
          </>
        )}
      </div>
    </div>
  )
}

function CheckoutVideo({ src = "/media/pizza-bake.mp4", placing }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-black/40 aspect-[16/10]">
      <video
        key={placing ? 'play' : 'idle'}
        src={src}
        autoPlay
        muted
        playsInline
        loop
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 p-2 text-center text-sm text-white/90 bg-gradient-to-t from-black/40 to-transparent">
        {placing ? 'Baking your pizza…' : 'Your pizza is about to bake'}
      </div>
    </div>
  )
}

export default function App() {
  const { user, setUser } = useAuth()
  const [cart, setCart] = useState([])
  const [cfMode, setCfMode] = useState(import.meta.env.VITE_CASHFREE_MODE || 'sandbox')
  const nav = useNavigate()
  useEffect(() => { api.payment.config().then(c=> setCfMode(c.mode || 'sandbox')).catch(()=>{}) }, [])

  const addToCart = (pizza) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.pizza._id === pizza._id)
      if (i >= 0) { const copy = [...c]; copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 }; return copy }
      return [...c, { pizza, quantity: 1 }]
    })
  }

  // --- Address validation helpers ---
  const [addrTouched, setAddrTouched] = useState({ name: false, street: false, city: false, state: false, zip: false, phone: false })
  const validators = {
    name:   (v) => String(v).trim().length >= 2,
    street: (v) => String(v).trim().length >= 5,
    city:   (v) => String(v).trim().length >= 2,
    state:  (v) => String(v).trim().length >= 2,
    zip:    (v) => /^[1-9][0-9]{5}$/.test(String(v).trim()),
    phone:  (v) => /^[6-9]\d{9}$/.test(String(v).trim())
  }
  function isAddressValid(a) {
    return validators.name(a.name) && validators.street(a.street) && validators.city(a.city) &&
           validators.state(a.state) && validators.zip(a.zip) && validators.phone(a.phone)
  }
  const markTouched = (field) => setAddrTouched((s) => ({ ...s, [field]: true }))

  // --- Pay callback page (reuses PaymentStatus) ---
  function PayCallback() {
    const nav = useNavigate()
    const loc = useLocation()
    const [state, setState] = useState({ status: 'loading', orderId: '' })
    useEffect(() => {
      const sp = new URLSearchParams(loc.search)
      const orderId = sp.get('order_id') || ''
      if (!orderId) { setState({ status: 'error', orderId: '' }); return }
      api.payment.verify({ orderId })
        .then((v) => setState({ status: v.success ? 'success' : 'error', orderId }))
        .catch(() => setState({ status: 'error', orderId }))
    }, [loc.search])

    if (state.status === 'loading') {
      return (<div className="max-w-md mx-auto mt-10 card"><div className="py-6 text-center">Verifying payment…</div></div>)
    }
    return (
      <div className="max-w-md mx-auto mt-10 card">
        <PaymentStatus status={state.status} orderId={state.orderId} onClose={() => nav(state.status === 'success' ? '/orders' : '/menu')} />
      </div>
    )
  }

  const addCustomToCart = (custom, computedPrice) => {
    setCart((c) => [...c, { custom, price: computedPrice, quantity: 1 }])
  }

  // ✅ Cart totals in rupees (EXACTLY what we send to Cashfree)
  const lineUnitRupees = (it) => toINRrupees(it.pizza ? it.pizza.price : it.price)
  const cartTotalRupees = cart.reduce((s, it) => s + lineUnitRupees(it) * it.quantity, 0)
  const cartTotalPaise  = cartTotalRupees * 100

  const [showCheckout, setShowCheckout] = useState(false)
  const [addr, setAddr] = useState({ name: '', street: '', city: '', state: '', zip: '', phone: '' })
  const [placing, setPlacing] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [payResult, setPayResult] = useState({ status: 'idle', orderId: '' })

  const cashfreeRef = useRef(null)
  const [sdkReady, setSdkReady] = useState(false)
  useEffect(() => {
    let alive = true
    load({ mode: (cfMode || 'sandbox') })
      .then((inst) => { if (alive) { cashfreeRef.current = inst; setSdkReady(true) } })
      .catch((e) => { console.error('Cashfree SDK load failed:', e); setSdkReady(false) })
    return () => { alive = false }
  }, [cfMode])

  function openCheckout() {
    if (!user) { alert('Login first'); return }
    setAddr({ name: '', street: '', city: '', state: '', zip: '', phone: '' })
    setAddrTouched({ name:false, street:false, city:false, state:false, zip:false, phone:false })
    setPlacing(false)
    setPayResult({ status: 'idle', orderId: '' })
    setShowCheckout(true)
  }

  async function payNow() {
    try {
      if (!sdkReady || !cashfreeRef.current) {
        try {
          const inst = await load({ mode: (cfMode || 'sandbox') })
          cashfreeRef.current = inst
          setSdkReady(true)
        } catch (e) {
          console.error('SDK not ready and reload failed:', e)
        }
      }

      const address = `${addr.name}, ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}. Phone: ${addr.phone}`
      const items = cart.map((c) =>
        c.pizza ? ({ pizza: c.pizza._id, quantity: c.quantity }) : ({ custom: c.custom, quantity: c.quantity })
      )

      const cartUsdTotal = cart.reduce((s, it) => s + (it.pizza ? it.pizza.price : it.price) * it.quantity, 0);
      const cartInrTotal = inrNumber(cartUsdTotal); // e.g., 399
      // Optional: log once to confirm what’s being posted
      console.log('[checkout] posting amount (INR):', cartInrTotal);


      // 🔴 Force the backend to use the exact cart total (no conversion)
      const init = await api.payment.checkout({
        items,
        address,
        currency: 'INR',
        amount: cartInrTotal             // <-- THE number Cashfree will charge
      })

      const sessionId =
        init?.orderToken ||
        init?.payment_session_id ||
        (init?.cf && init.cf.payment_session_id)

      const orderId = init.orderId || init.order_id

      if (!sessionId || !orderId) {
        if (init.hostedCheckoutUrl) { window.location.href = init.hostedCheckoutUrl; return }
        if (init.paymentLink)       { window.location.href = init.paymentLink;       return }
        alert('Missing payment_session_id or order_id')
        return
      }

      if (!cashfreeRef.current) {
        if (init.hostedCheckoutUrl) { window.location.href = init.hostedCheckoutUrl; return }
        if (init.paymentLink)       { window.location.href = init.paymentLink;       return }
        alert('Payment SDK not available')
        return
      }

      setPlacing(true)

      const result = await cashfreeRef.current.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_modal"
      })

      console.log('Checkout finished:', result)

      if (!result?.error) {
        try {
          await new Promise(r => setTimeout(r, 400))
          const v = await api.payment.verify({ orderId })
          if (v?.success) {
            setCart([])
            setPayResult({ status: 'success', orderId })
          } else {
            setPayResult({ status: 'error', orderId })
          }
        } catch (e) {
          console.error('Verify error:', e)
          setPayResult({ status: 'error', orderId })
        }
      } else {
        console.warn('Checkout error:', result.error)
        setPayResult({ status: 'error', orderId })
      }
    } catch (error) {
      console.error('Payment start failed:', error)
      alert('Could not start payment. Check console for details.')
    } finally {
      setPlacing(false)
    }
  }

  function incItem(idx) { setCart((c) => c.map((it, i) => i===idx ? { ...it, quantity: it.quantity + 1 } : it)) }
  function decItem(idx) { setCart((c) => c.flatMap((it, i) => i===idx ? (it.quantity>1 ? [{...it, quantity: it.quantity - 1}] : []) : [it])) }
  function removeItem(idx) { setCart((c) => c.filter((_, i) => i !== idx)) }

  async function onLogout() {
    await api.logout()
    localStorage.removeItem('user')
    setUser(null)
  }

  function BuilderTab() {
    return <CustomBuilder addCustomToCart={addCustomToCart} />
  }

  function CartFloating() {
    return (
      <>
        {/* Cart panel */}
        <div className="fixed right-4 bottom-4 glass w-80 p-4" style={{ display: cartOpen ? 'block' : 'none' }}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-bold">Your Cart</h4>
            <button className="btn btn-ghost" title="Minimize" onClick={() => setCartOpen(false)}>✕</button>
          </div>

          {cart.length === 0 && <div className="text-sm text-slate-600">Empty</div>}

          <div className="space-y-2 max-h-60 overflow-auto pr-1">
            {cart.map((it, idx) => (
              <div key={it.pizza ? it.pizza._id : `custom-${idx}`} className="flex items-center justify-between gap-2 text-sm">
                <div className="truncate">{it.pizza ? it.pizza.name : 'Custom Pizza'}</div>

                <div className="flex items-center gap-1">
                  <button className="btn btn-ghost" onClick={() => decItem(idx)}>-</button>
                  <span className="w-6 text-center">{it.quantity}</span>
                  <button className="btn btn-ghost" onClick={() => incItem(idx)}>+</button>
                </div>

                <div className="w-24 text-right">
                  {formatINRfromRupees(lineUnitRupees(it) * it.quantity)}
                </div>

                <button className="btn btn-ghost" onClick={() => removeItem(idx)}>✕</button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 font-semibold">
            <span>Total</span>
            <span>{formatINRfromRupees(cartTotalRupees)}</span>
          </div>

          <button className="btn btn-primary w-full mt-2" onClick={openCheckout} disabled={cart.length === 0}>
            Checkout
          </button>
        </div>

        {/* FAB */}
        {!cartOpen && (
          <button
            className="fixed right-4 bottom-4 z-20 flex items-center justify-center rounded-full shadow-lg"
            style={{ width: 56, height: 56, background: 'var(--primary)', color: '#0b0f14', fontSize: 26, boxShadow:'var(--shadow)' }}
            onClick={() => setCartOpen(true)}
            title={cart.length ? `${cart.length} item(s)` : 'Cart'}
          >
            🛒
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-rose-600 text-xs font-bold rounded-full px-1.5 py-0.5 shadow">
                {cart.length}
              </span>
            )}
          </button>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen relative">
      <div className="bg-confetti absolute inset-0 pointer-events-none" />
      <Nav user={user} onLogout={onLogout} />

      <Routes>
        <Route path="/" element={<PopularTriptych />} />
        <Route path="/menu" element={<Menu addToCart={addToCart} />} />
        <Route path="/build" element={<BuilderTab />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/admin-login" element={<AdminLogin setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pay-callback" element={<PayCallback />} />
        <Route path="/orders" element={<ProtectedRoute user={user}><Orders /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute user={user} role="admin"><Admin /></ProtectedRoute>} />
      </Routes>

      {/* Show floating cart on Build-your-own and Menu pages */}
      {(() => {
        const path = window.location.pathname
        return (path === '/build' || path === '/menu') ? <CartFloating /> : null
      })()}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-30">
          <div className="glass w-full max-w-4xl p-5">
            {payResult.status === 'success' || payResult.status === 'error' ? (
              <PaymentStatus status={payResult.status} orderId={payResult.orderId} onClose={() => setShowCheckout(false)} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
                {/* LEFT: address form */}
                <form className="space-y-3" onSubmit={(e)=>{ e.preventDefault(); if (!isAddressValid(addr)) { setAddrTouched({ name:true, street:true, city:true, state:true, zip:true, phone:true }); return; } payNow(); }}>
                  <h3 className="text-xl font-bold">Delivery address</h3>

                  <label className="block">
                    <span className="block text-sm text-[var(--muted)] mb-1">Full name</span>
                    <input className="input min-h-[44px]" placeholder="Full name" value={addr.name} onChange={e=>setAddr({...addr, name:e.target.value})} onBlur={()=>markTouched('name')} />
                    {addrTouched.name && !validators.name(addr.name) && (<div className="text-xs text-rose-400 mt-1">Enter at least 2 characters.</div>)}
                  </label>

                  <label className="block">
                    <span className="block text-sm text-[var(--muted)] mb-1">Street address</span>
                    <input className="input min-h-[44px]" placeholder="Street address" value={addr.street} onChange={e=>setAddr({...addr, street:e.target.value})} onBlur={()=>markTouched('street')} />
                    {addrTouched.street && !validators.street(addr.street) && (<div className="text-xs text-rose-400 mt-1">Enter a more detailed street address.</div>)}
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-sm text-[var(--muted)] mb-1">City</span>
                      <input className="input min-h-[44px]" placeholder="City" value={addr.city} onChange={e=>setAddr({...addr, city:e.target.value})} onBlur={()=>markTouched('city')} />
                      {addrTouched.city && !validators.city(addr.city) && (<div className="text-xs text-rose-400 mt-1">City is required.</div>)}
                    </label>

                    <label className="block">
                      <span className="block text-sm text-[var(--muted)] mb-1">State</span>
                      <input className="input min-h-[44px]" placeholder="State" value={addr.state} onChange={e=>setAddr({...addr, state:e.target.value})} onBlur={()=>markTouched('state')} />
                      {addrTouched.state && !validators.state(addr.state) && (<div className="text-xs text-rose-400 mt-1">State is required.</div>)}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-sm text-[var(--muted)] mb-1">PIN code</span>
                      <input className="input min-h-[44px]" placeholder="PIN code" value={addr.zip} onChange={e=>setAddr({...addr, zip:e.target.value})} onBlur={()=>markTouched('zip')} />
                      {addrTouched.zip && !validators.zip(addr.zip) && (<div className="text-xs text-rose-400 mt-1">Enter a valid 6-digit PIN code.</div>)}
                    </label>

                    <label className="block">
                      <span className="block text-sm text-[var(--muted)] mb-1">Phone (10 digits)</span>
                      <input className="input min-h-[44px]" placeholder="Phone (10 digits)" value={addr.phone} onChange={e=>setAddr({...addr, phone:e.target.value})} onBlur={()=>markTouched('phone')} />
                      {addrTouched.phone && !validators.phone(addr.phone) && (<div className="text-xs text-rose-400 mt-1">Enter a valid 10-digit mobile starting 6–9.</div>)}
                    </label>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button type="button" className="btn btn-ghost" onClick={()=>setShowCheckout(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={placing || cart.length===0 || !isAddressValid(addr)} title={!isAddressValid(addr) ? 'Fill all address fields correctly' : ''}>
                      {placing ? 'Processing…' : 'Pay now'}
                    </button>
                  </div>
                </form>

                {/* RIGHT: video pane */}
                <div className="self-center">
                  <CheckoutVideo src={pizzaBake} placing={placing} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
