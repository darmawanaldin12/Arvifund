/**
 * GeminiIcon – SVG inline persis sama dengan logo Google Gemini
 * Gradient: ungu (#8B5CF6) → biru (#3B82F6) → cyan (#06B6D4)
 *
 * Props:
 *   size   – number, default 24 (px)
 *   style  – object tambahan
 */
export function GeminiIcon({ size = 24, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <defs>
        <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#8B5CF6" />
          <stop offset="50%"  stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      {/* Bintang 4 sudut khas Gemini – dibuat dari 2 elips yang dirotasi */}
      <path
        d="M14 1C14 1 16.5 10 25 14C16.5 18 14 27 14 27C14 27 11.5 18 3 14C11.5 10 14 1 14 1Z"
        fill="url(#gemini-grad)"
      />
    </svg>
  )
}

export default GeminiIcon
