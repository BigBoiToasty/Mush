import BinderGrid from './BinderGrid'
import notebookBg from './assets/binder-notebook.png'

// The open notebook: two pages side by side, or one page on portrait phones
// (see useSpreadNav). `nav` is the object useSpreadNav returns.
export default function BinderSpread({ nav, leftSlots, rightSlots, heldCard = null, onSlotChoose, onSlotView }) {
  const { activePage, half, singlePage, swipeHandlers } = nav
  const grid = (pageNumber, slots) => (
    <BinderGrid
      pageNumber={pageNumber}
      slots={slots}
      heldCard={heldCard}
      onSlotChoose={onSlotChoose}
      onSlotView={onSlotView}
    />
  )

  return (
    <div className="binder-scale-wrap" {...swipeHandlers}>
      {singlePage ? (
        <div id="binderView" className={`binder-single ${half ? 'binder-single--right' : ''}`}>
          <img src={notebookBg} alt="" className="binder-notebook-bg" aria-hidden="true" />
          <div className="binder-page-single">
            {grid(activePage + half, half ? rightSlots : leftSlots)}
          </div>
        </div>
      ) : (
        <div id="binderView">
          <img src={notebookBg} alt="" className="binder-notebook-bg" aria-hidden="true" />
          <div className="binder-page-left">{grid(activePage, leftSlots)}</div>
          <div className="binder-page-right">{grid(activePage + 1, rightSlots)}</div>
        </div>
      )}
    </div>
  )
}
