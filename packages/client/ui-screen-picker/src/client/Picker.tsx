import { useCallback, useRef, useState } from 'react'

export function ScreenPicker() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = useCallback(async () => {
    setError(null)
    try {
      const stream = await (navigator.mediaDevices as unknown as { getDisplayMedia: (c: unknown) => Promise<MediaStream> }).getDisplayMedia({ video: { displaySurface: 'browser' } as unknown as MediaTrackConstraints, audio: false })
      setSharing(true)
      const video = videoRef.current
      if (video !== null) {
        video.srcObject = stream
        await video.play().catch(() => {})
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { setSharing(false) })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  return (
    <div>
      <button type="button" onClick={() => { void pick() }}>{sharing ? 'Compartilhando aba — clique para trocar' : 'Compartilhar aba (Site Explorer)'}</button>
      {error !== null && <div role="alert">{error}</div>}
      <video ref={videoRef} autoPlay muted playsInline style={{ display: sharing ? 'block' : 'none', maxWidth: '100%', borderRadius: 8 }} />
    </div>
  )
}