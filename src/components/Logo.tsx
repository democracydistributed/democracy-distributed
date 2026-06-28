interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

/**
 * Democracy Distributed — Logo mark + wordmark.
 * Geometry traced in Adobe Illustrator from the final approved mark.
 *
 * Theme via CSS custom properties (see globals.css TOKENS):
 *   --dd-hex  = hex border ring colour  (amber dark / navy light)
 *   --dd-gold = traces + nodes colour   (gold both modes)
 * Inner fill is always #112240 (dark navy).
 */
export function Logo({ size = 36, className = '', showWordmark = true }: LogoProps) {
  const gap = Math.round(size * 0.33);
  const f1 = Math.round(size * 0.44);
  const f2 = Math.round(size * 0.22);

  return (
    <span className={className} style={{ display:'inline-flex', alignItems:'center', gap:gap+'px', lineHeight:1, textDecoration:'none' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="20 60 575 665"
        aria-hidden="true"
        style={{ width:'auto', height:size+'px', flexShrink:0, display:'block' }}
      >
        {/* Hex border ring — compound path (outer minus inner = ring) */}
        <path
          style={{ fill:'var(--dd-hex,#e8a020)', fillRule:'evenodd' }}
          d="M579.99,236.18L305.31,77.54,31.32,237.37l.69,318.46,274.68,158.63,274-159.83-.69-318.45Z
             M306.63,686.04l-250.17-144.48-.62-290.02,249.53-145.57,250.17,144.48.62,290.03-249.53,145.56Z"
        />
        {/* Inner fill — always dark navy */}
        <polygon
          style={{ fill:'#112240' }}
          points="565.89 546.11 307.19 696.22 47.82 547.22 47.18 248.13 305.88 98.01 565.25 247 565.89 546.11"
        />
        {/* Gold nodes + traces */}
        <g style={{ fill:'var(--dd-gold,#c49a3c)' }}>
          <circle cx="376.01" cy="191.17" r="22.53"/>
          <circle cx="233.58" cy="280.22" r="22.53"/>
          <circle cx="302.67" cy="317.06" r="22.53"/>
          <circle cx="433.5"  cy="369.34" r="22.53"/>
          <circle cx="233.58" cy="498.02" r="22.53"/>
          <circle cx="376.01" cy="479.42" r="22.53"/>
          <circle cx="521.47" cy="362.12" r="22.53"/>
          <circle cx="169.56" cy="235.31" r="22.53"/>
          <circle cx="440.93" cy="549.07" r="22.53"/>
          <circle cx="89.06"  cy="355.32" r="22.53"/>
          <circle cx="88.65"  cy="427.94" r="22.53"/>
          <circle cx="243"    cy="609.24" r="22.53"/>
          <polygon points="103.16 345.77 99.39 339.29 165.9 299.42 173.3 303.26 103.16 345.77"/>
          <rect x="165.82" y="256.33" width="7.49" height="46.94"/>
          <rect x="84.9"   y="372.36" width="7.49" height="47.34"/>
          <polygon points="103.45 432.06 99.68 425.58 228.52 349.89 235.89 352.1 103.45 432.06"/>
          <rect x="228.45" y="301.34" width="7.49" height="50.76"/>
          <rect x="164.79" y="390.06" width="7.49" height="77"/>
          <polygon points="233.66 443.75 229.88 437.29 372.14 354.2 379.78 358.41 233.66 443.75"/>
          <rect x="229.84" y="437.28" width="7.49" height="39.52"/>
          <polygon points="371.12 362.26 317.36 331.22 321.1 324.73 376.66 356.81 371.12 362.26"/>
          <rect x="189.84" y="448.38" width="7.49" height="62.08" transform="translate(-318.4 407.36) rotate(-60)"/>
          <polygon points="307.96 448.68 301.05 444.04 415.16 377.67 418.93 384.15 307.96 448.68"/>
          <polygon points="308.54 518.22 301.05 518.22 301.05 444.04 308.54 446.61 308.54 518.22"/>
          <rect x="223.95" y="521.75" width="142.09" height="7.49" transform="translate(-224.19 219.54) rotate(-30.18)"/>
          <rect x="231.71" y="557.99" width="7.49" height="43.23"/>
          <rect x="297.15" y="528.83" width="84.59" height="7.49" transform="translate(-221.73 242.84) rotate(-30.18)"/>
          <rect x="250.88" y="594.77" width="59.65" height="7.49" transform="translate(-262.84 222.25) rotate(-30.18)"/>
          <rect x="300.89" y="550.61" width="7.49" height="36.1"/>
          <rect x="239.5"  y="228.2"  width="138.88" height="7.49" transform="translate(-74.73 186.75) rotate(-30.18)"/>
          <rect x="370.74" y="213.16" width="7.49" height="63.84"/>
          <rect x="434.2"  y="236.61" width="7.49" height="151.73" transform="translate(-53.75 530.82) rotate(-59.45)"/>
          <polygon points="442.82 416.29 437.19 410.9 503.09 372.58 506.86 379.05 442.82 416.29"/>
          <polygon points="444.68 528.78 437.19 528.78 437.19 410.9 444.68 413.08 444.68 528.78"/>
          <rect x="370.56" y="497.96" width="7.49" height="15.97"/>
        </g>
      </svg>

      {showWordmark && (
        <span style={{ display:'flex', flexDirection:'column', gap:0 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:f1+'px', color:'var(--dd-wordmark,currentColor)', letterSpacing:'-0.01em', lineHeight:1.2, whiteSpace:'nowrap' }}>
            Democracy
          </span>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:f2+'px', color:'var(--dd-gold,#c49a3c)', letterSpacing:'0.28em', textTransform:'uppercase', lineHeight:1.3, whiteSpace:'nowrap' }}>
            Distributed
          </span>
        </span>
      )}
    </span>
  );
}
