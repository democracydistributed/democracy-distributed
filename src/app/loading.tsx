export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Nav skeleton */}
      <div style={{
        position: 'fixed', inset: '0 0 auto', zIndex: 50, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', background: 'rgba(12,20,40,.92)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={skel(120, 14)} />
          <div style={skel(80, 8)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={skel(90, 30, 3)} />
          <div style={skel(34, 34, 17)} />
        </div>
      </div>

      {/* Page header skeleton */}
      <div style={{ paddingTop: 104, paddingBottom: 28, paddingLeft: 48, paddingRight: 48, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div style={skel(160, 10, 2)} />
        <div style={{ marginTop: 18, display: 'flex', gap: 20 }}>
          <div style={skel(60, 60, 10)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={skel(240, 28, 2)} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={skel(72, 20, 3)} />
              <div style={skel(72, 20, 3)} />
              <div style={skel(72, 20, 3)} />
            </div>
            <div style={skel(340, 13, 2)} />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div style={{ background: 'var(--bg-card, #141f38)', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', padding: '0 40px', gap: 4 }}>
        {[80, 60, 72, 60].map((w, i) => (
          <div key={i} style={{ padding: '16px 22px' }}>
            <div style={skel(w, 10, 2)} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px', flex: '1 0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={skel(140, 9, 2)} />
            <div style={skel(200, 22, 2)} />
          </div>
        </div>
        {/* Sankey card skeleton */}
        <div style={{ background: 'var(--bg-card, #141f38)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, overflow: 'hidden', padding: 28 }}>
          <div style={skel('100%', 240, 4, true)} />
        </div>
      </div>
    </div>
  );
}

function skel(w: number | string, h: number, radius = 4, pulse = false): React.CSSProperties {
  return {
    width: w,
    height: h,
    borderRadius: radius,
    background: 'rgba(255,255,255,0.07)',
    animation: 'dd-pulse 1.6s ease-in-out infinite',
    flexShrink: 0,
  };
}
