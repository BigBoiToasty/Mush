import { navButtonClass, navButtonStyle } from './navButton'

export default function OfflineReadyOverlay({ onClose }) {
  return (
    <div className="card-search-overlay">
      <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 220, maxWidth: 320 }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">Offline Ready</span>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>

        <p>
          Every card in your collection -- images and details -- has been downloaded
          and stored on this device.
        </p>
        <p>
          You can lose wifi and still scroll through your binders and search your
          cards. Changes you make offline will sync once you're back online.
        </p>
      </div>
    </div>
  )
}
