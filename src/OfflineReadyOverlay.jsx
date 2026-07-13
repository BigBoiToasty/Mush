import { OverlayPanel } from './ui'

export default function OfflineReadyOverlay({ onClose }) {
  return (
    <OverlayPanel title="Offline Ready" onClose={onClose} panelStyle={{ minWidth: 220, maxWidth: 320 }}>
      <p>
        Every card in your collection -- images and details -- has been downloaded
        and stored on this device.
      </p>
      <p>
        You can lose wifi and still scroll through your binders and search your
        cards. Cards you add, move, or remove while offline sync automatically
        once you're back online.
      </p>
    </OverlayPanel>
  )
}
