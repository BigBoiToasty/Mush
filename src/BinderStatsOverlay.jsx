import { OverlayPanel, useAsync } from './ui'

export default function BinderStatsOverlay({ getCounts, getWorth, onClose }) {
  const { data: counts, error: countsError } = useAsync(getCounts, "Couldn't load binder info")
  const { data: worth, error: worthError } = useAsync(getWorth, "Couldn't load prices")

  return (
    <OverlayPanel title="Binder Info" onClose={onClose} panelStyle={{ minWidth: 220 }}>
      {countsError && <p className="card-search-error">{countsError}</p>}
      {!countsError && !counts && <p>Loading...</p>}
      {counts && (
        <div className="flex flex-col gap-1">
          <p>Cards: {counts.cardCount}</p>
          <p>Pages: {counts.pageCount}</p>
          {worthError && <p className="card-search-error">{worthError}</p>}
          {!worthError && worth === null && <p>Worth: Loading...</p>}
          {worth !== null && <p>Worth: ${worth.toFixed(2)}</p>}
        </div>
      )}
    </OverlayPanel>
  )
}
