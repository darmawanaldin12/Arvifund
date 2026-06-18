'use client'
import AppHeader from '../layout/AppHeader'

const SHIMMER_BASE = {
  background: 'linear-gradient(105deg, var(--surface2) 0%, var(--surface2) 38%, var(--surface3) 50%, var(--surface2) 62%, var(--surface2) 100%)',
  backgroundSize: '300% 100%',
  animation: 'shimmer 1.8s ease-in-out infinite',
}

function Sk({ w = '100%', h = 14, r = 8, mb = 0, delay = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb, flexShrink: 0, ...SHIMMER_BASE, animationDelay: `${delay}s` }} />
  )
}

function CardSk({ children, style = {} }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, ...style }}>
      {children}
    </div>
  )
}

function DotSk({ size = 28, r, delay = 0 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: r ?? size / 2, flexShrink: 0, ...SHIMMER_BASE, animationDelay: `${delay}s` }} />
  )
}

export default function DashboardLoadingState({ onRefresh }) {
  return (
    <>
      <AppHeader title="Financial Overview" onRefresh={onRefresh} loading={true} />
      <div className="page-container">

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflow: 'hidden' }}>
          {[72,88,80,76,84].map((w,i) => <Sk key={i} w={w} h={32} r={99} delay={i*0.06} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[0,1,2,3].map(i => (
            <CardSk key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Sk w="55%" h={10} delay={i*0.07} />
                <DotSk size={28} r={9} delay={i*0.07+0.05} />
              </div>
              <Sk w="75%" h={20} mb={6} delay={i*0.07+0.1} />
              <Sk w="50%" h={10} delay={i*0.07+0.15} />
            </CardSk>
          ))}
        </div>

        <CardSk style={{ marginBottom: 12 }}>
          <Sk w="45%" h={11} mb={12} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 13, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <DotSk size={28} r={9} delay={i*0.08} />
                <Sk w="60%" h={9}  delay={i*0.08+0.06} />
                <Sk w="80%" h={16} delay={i*0.08+0.12} />
              </div>
            ))}
          </div>
        </CardSk>

        <CardSk style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Sk w="40%" h={11} />
            <Sk w={40} h={20} r={99} delay={0.05} />
          </div>
          <Sk w="35%" h={22} mb={2} />
          <Sk w="28%" h={10} mb={14} delay={0.05} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 56 }}>
            {[40,65,50,85,35,20,60].map((pct,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
                <div style={{ width:'100%', height:`${pct}%`, borderRadius:'4px 4px 0 0', ...SHIMMER_BASE, animationDelay:`${i*0.05}s` }} />
                <Sk w="90%" h={9} r={3} delay={i*0.05+0.1} />
              </div>
            ))}
          </div>
        </CardSk>

        {[3,5,4].map((rows,ci) => (
          <CardSk key={ci} style={{ marginBottom: 12 }}>
            <Sk w="40%" h={11} mb={14} />
            {Array.from({ length: rows }).map((_,i) => (
              <div key={i} style={{ marginBottom: i < rows-1 ? 12 : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <Sk w="38%" h={11} delay={i*0.06} />
                  <Sk w="18%" h={11} delay={i*0.06+0.03} />
                </div>
                <Sk w="100%" h={5} r={99} delay={i*0.06+0.06} />
              </div>
            ))}
          </CardSk>
        ))}

        <CardSk style={{ marginBottom: 12 }}>
          <Sk w="38%" h={11} mb={12} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: 42 }).map((_,i) => (
              <Sk key={i} w="100%" h={14} r={3} delay={(i%7)*0.04} />
            ))}
          </div>
        </CardSk>

        <CardSk style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <Sk w="42%" h={13} />
            <div style={{ display:'flex', gap:5 }}>
              {[0,1,2,3,4,5].map(i => <Sk key={i} w={i===1?16:6} h={6} r={3} delay={i*0.04} />)}
            </div>
          </div>
          <Sk w="100%" h={160} r={8} mb={12} delay={0.1} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <DotSk size={32} r={8} />
            <Sk w={40} h={11} delay={0.05} />
            <DotSk size={32} r={8} delay={0.1} />
          </div>
        </CardSk>

        <CardSk style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <Sk w="45%" h={13} />
            <Sk w={64} h={13} delay={0.05} />
          </div>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i<4?'1px solid var(--border)':'none' }}>
              <DotSk size={36} r={11} delay={i*0.07} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                <Sk w="55%" h={12} delay={i*0.07+0.04} />
                <Sk w="35%" h={10} delay={i*0.07+0.08} />
              </div>
              <Sk w={60} h={13} delay={i*0.07+0.12} />
            </div>
          ))}
        </CardSk>

      </div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -300% 0; }
          100% { background-position:  300% 0; }
        }
      `}</style>
    </>
  )
}
