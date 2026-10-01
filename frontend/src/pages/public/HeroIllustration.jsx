/** Ilustración del hero: un aula atendida (ecran, proyector, escalera y caja de herramientas) y un ticket en curso. */
export default function HeroIllustration({ className }) {
  return (
    <svg className={className} viewBox="0 0 480 300" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hero-art-stripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" className="hero-art__stripe" />
        </pattern>
      </defs>

      <rect width="480" height="300" className="hero-art__wall" />
      <rect width="480" height="300" fill="url(#hero-art-stripes)" />
      <rect y="262" width="480" height="38" className="hero-art__floor" />

      <rect x="246" width="4" height="14" className="hero-art__dark" />
      <rect x="226" y="14" width="44" height="16" rx="3" className="hero-art__dark" />
      <circle cx="248" cy="30" r="4" className="hero-art__lens" />
      <polygon points="244,32 252,32 344,50 156,50" className="hero-art__beam" />

      <rect x="150" y="42" width="200" height="8" rx="3" className="hero-art__dark" />
      <rect x="156" y="50" width="188" height="110" className="hero-art__surface" />
      <rect x="174" y="68" width="96" height="8" rx="2" className="hero-art__line" />
      <rect x="174" y="86" width="148" height="6" rx="2" className="hero-art__soft" />
      <rect x="174" y="100" width="128" height="6" rx="2" className="hero-art__soft" />
      <rect x="174" y="122" width="40" height="22" rx="2" className="hero-art__soft" />
      <rect x="222" y="114" width="40" height="30" rx="2" className="hero-art__soft" />
      <rect x="270" y="128" width="40" height="16" rx="2" className="hero-art__soft" />

      <path
        d="M352 262 380 124M378 262 406 124M357 236h26M363 208h26M369 180h26M374 152h26"
        className="hero-art__ladder"
      />
      <path d="M430 236v-7h22v7" className="hero-art__handle" />
      <rect x="418" y="236" width="46" height="26" rx="3" className="hero-art__toolbox" />
      <rect x="418" y="245" width="46" height="3" className="hero-art__dark" />

      <rect x="28" y="168" width="214" height="106" rx="4" className="hero-art__surface" />
      <rect x="28" y="168" width="4" height="106" className="hero-art__critical" />
      <text x="44" y="193" className="hero-art__code">
        TCK-2026-00147
      </text>
      <rect x="160" y="180" width="70" height="20" rx="3" className="hero-art__status" />
      <text x="195" y="194" textAnchor="middle" className="hero-art__status-text">
        En atención
      </text>
      <rect x="44" y="208" width="150" height="6" rx="2" className="hero-art__line" />
      <rect x="44" y="220" width="104" height="6" rx="2" className="hero-art__soft" />
      <path d="M52 252h120" className="hero-art__track" />
      <path d="M52 252h80" className="hero-art__progress" />
      <circle cx="52" cy="252" r="6" className="hero-art__done" />
      <circle cx="92" cy="252" r="6" className="hero-art__done" />
      <circle cx="132" cy="252" r="6" className="hero-art__current" />
      <circle cx="172" cy="252" r="6" className="hero-art__pending" />
    </svg>
  )
}
