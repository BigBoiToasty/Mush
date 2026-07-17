import { useRef, useState } from 'react'
import { OverlayPanel, NavBtn } from './ui'
import { uploadBinderBackground, setBinderBackground } from './cards'

const MAX_BYTES = 5 * 1024 * 1024

export default function BackgroundPicker({ userId, binderId, onChanged, onClose }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError('Image must be 5MB or smaller.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const url = await uploadBinderBackground(userId, binderId, file)
      onChanged(url)
      onClose()
    } catch {
      setError("Couldn't upload image. Please try again.")
      setUploading(false)
    }
  }

  async function handleReset() {
    setUploading(true)
    try {
      await setBinderBackground(binderId, null)
      onChanged(null)
      onClose()
    } catch {
      setError("Couldn't reset background. Please try again.")
      setUploading(false)
    }
  }

  return (
    <OverlayPanel title="Binder Background" onClose={onClose}>
      <div className="flex flex-col gap-3" style={{ minWidth: 260 }}>
        <NavBtn onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Choose Image'}
        </NavBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
        {error && <p className="card-search-error">{error}</p>}
        <NavBtn onClick={handleReset} disabled={uploading}>Reset to Default</NavBtn>
      </div>
    </OverlayPanel>
  )
}
