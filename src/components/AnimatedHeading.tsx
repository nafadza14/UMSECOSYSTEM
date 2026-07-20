import { useEffect, useState, type CSSProperties } from 'react'

interface AnimatedHeadingProps {
  text: string
  className?: string
  style?: CSSProperties
  charDelay?: number
  initialDelay?: number
}

/**
 * Memecah teks berdasarkan \n menjadi baris, lalu tiap baris menjadi karakter.
 * Tiap karakter adalah <span> inline-block dengan transisi opacity + translateX.
 * Delay per karakter = (lineIndex * lineLength * charDelay) + (charIndex * charDelay).
 */
export default function AnimatedHeading({
  text,
  className = '',
  style = {},
  charDelay = 30,
  initialDelay = 200,
}: AnimatedHeadingProps) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), initialDelay)
    return () => clearTimeout(t)
  }, [initialDelay])

  const lines = text.split('\n')

  return (
    <h1 className={className} style={style}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="block">
          {line.split('').map((char, charIndex) => {
            const delay =
              lineIndex * line.length * charDelay + charIndex * charDelay
            return (
              <span
                key={charIndex}
                style={{
                  display: 'inline-block',
                  opacity: started ? 1 : 0,
                  transform: started ? 'translateX(0)' : 'translateX(-18px)',
                  transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
                }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}
