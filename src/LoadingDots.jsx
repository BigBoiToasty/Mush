import { useEffect, useState } from 'react'

// "Loading" with a dot count cycling 1 -> 2 -> 3 -> 1. CSS can't reliably
// animate the `content` property across browsers, so this just ticks a
// counter on an interval -- simplest thing that actually works everywhere.
export default function LoadingDots({ label = 'Loading' }) {
  const [dots, setDots] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 400)
    return () => clearInterval(id)
  }, [])
  return <p className="loading-dots">{label}{'.'.repeat(dots)}</p>
}
