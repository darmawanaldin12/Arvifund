'use client'
import AppHeader from '../layout/AppHeader'

function Sk({ w = '100%', h = 14, r = 8, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--surface2) 25%,var(--surface3) 50%,var(--surface2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      marginBottom: mb, flexShrink: 0,
    }} />
  )
}

function CardSk({ children, style = {} }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, ...style }}>
      {children}
    </div>
  )
}

export default function DashboardLoadingState({ onRefresh }) {
  return (
    <>
      <AppHeader title="Financial Overview" onRefresh={onRefresh} loading={true} />
      <div className="page-container">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflow: 'hidden' }}>
          {[72,88,80,76,84].map((w,i) => <Sk key={i} w={w} h={32} r={99} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[0,1,2,3].map(i => (
            <CardSk key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Sk w="55%" h={10} /><Sk w={28} h={28} r={9} />
              </div>
              <Sk w="75%" h={20} mb={6} /><Sk w="50%" h={10} />
            </CardSk>
          ))}
        </div>
        <CardSk style={{ marginBottom: 12 }}>
          <Sk w="45%" h={11} mb={12} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 13, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <Sk w={28} h={28} r={9} /><Sk w="60%" h={9} /><Sk w="80%" h={16} />
              </div>
            ))}
          </div>
        </CardSk>
        <CardSk style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Sk w="40%" h={11} /><Sk w={40} h={20} r={99} />
          </div>
          <Sk w="35%" h={22} mb={2} /><Sk w="28%" h={10} mb={14} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 56 }}>
            {[40,65,50,85,35,20,60].map((pct,i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${pct}%`, borderRadius: '4px 4px 0 0', background: 'var(--surface3)' }} />
                <Sk w="90%" h={9} r={3} />
              </div>
            ))}
          </div>
        </CardSk>
        {[3,5,4].map((rows,ci) => (
          <CardSk key={ci} style={{ marginBottom: 12 }}>
            <Sk w="40%" h={11} mb={14} />
            {Array.from({ length: rows }).map((_,i) => (
              <div key={i} style={{ marginBottom: i < rows-1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Sk w="38%" h={11} /><Sk w="18%" h={11} />
                </div>
                <Sk w="100%" h={5} r={99} />
              </div>
            ))}
          </CardSk>
        ))}
        <CardSk style={{ marginBottom: 12 }}>
          <Sk w="38%" h={11} mb={12} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: 42 }).map((_,i) => <Sk key={i} w="100%" h={14} r={3} />)}
          </div>
        </CardSk>
        <CardSk style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <Sk w="42%" h={13} />
            <div style={{ display: 'flex', gap: 5 }}>
              {[0,1,2,3,4,5].map(i => <Sk key={i} w={i===1?16:6} h={6} r={3} />)}
            </div>
          </div>
          <Sk w="100%" h={160} r={8} mb={12} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Sk w={32} h={32} r={8} /><Sk w={40} h={11} /><Sk w={32} h={32} r={8} />
          </div>
        </CardSk>
        <CardSk style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <Sk w="45%" h={13} /><Sk w={64} h={13} />
          </div>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <Sk w={36} h={36} r={11} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Sk w="55%" h={12} /><Sk w="35%" h={10} />
              </div>
              <Sk w={60} h={13} />
            </div>
          ))}
        </CardSk>
      </div>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </>
  )
}
