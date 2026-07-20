import { useEffect, useState, type ReactNode, type CSSProperties } from 'react'

interface FadeInProps {
  delay?: number
  duration?: number
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Wrapper yang mulai dengan opacity: 0 dan transisi ke opacity: 1
 * setelah `delay` ms. Durasi transisi bisa dikonfigurasi.
 */
export default function FadeIn({
  delay = 0,
  duration = 1000,
  children,
  className = '',
  style = {},
}: FadeInProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${duration}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
