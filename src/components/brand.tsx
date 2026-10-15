/** Símbolo de SondIA (marca/sondia-simbolo.svg) y logotipo «sondia» en Sora. */
export function SondiaMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="var(--accent)">
        <path d="M0 27C0 12.1 12.1 0 27 0H87C94.2 0 100 5.8 100 13V39H68C57.5 39 54 54 41 54H7C3.1 54 0 50.9 0 47Z" />
        <path d="M100 73C100 87.9 87.9 100 73 100H13C5.8 100 0 94.2 0 87V61H32C42.5 61 46 46 59 46H93C96.9 46 100 49.1 100 53Z" />
      </g>
    </svg>
  );
}

export function SondiaLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SondiaMark className="size-5" />
      <span className="font-logo text-[17px] font-semibold tracking-[-0.02em] text-text">sondia</span>
    </span>
  );
}
