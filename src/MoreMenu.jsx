import { NavBtn, DropdownMenu } from './ui'

// [label, action key, danger?] for the "More" dropdown. Keys are overlay
// names except 'export'/'import', which BinderPage handles directly.
const MENU_ITEMS = [
  ['Find in Binder', 'find'],
  ['Binders', 'switcher'],
  ['Binder Info', 'stats'],
  ['Share Binder', 'share'],
  ['Set Completion', 'completion'],
  ['Button Style', 'buttonStyle'],
  ['Binder Background', 'background'],
  ['Export CSV', 'export'],
  ['Import CSV', 'import'],
  ['Delete Binder', 'delete', true],
]

// Ten flat items overload the menu; extra space before these keys splits it
// into navigate / info+share / customize / data / danger groups.
const MENU_GROUP_STARTS = new Set(['stats', 'buttonStyle', 'export', 'delete'])

const itemStyle = {
  padding: 'clamp(0.15rem, 0.7vh, 0.4rem) clamp(0.4rem, 1.8vh, 0.75rem)',
  fontSize: 'clamp(0.75rem, 2.2vh, 1rem)',
  whiteSpace: 'nowrap',
}

// The menu itself is position: fixed (flush to the viewport's top-right
// corner), so it can never affect the header row's height. To still get the
// "push Add Cards/More left" effect, an invisible same-sized stack of the
// menu buttons sits in normal flow reserving that width -- all stacked on
// the same grid cell so only the widest label's width counts.
export default function MoreMenu({ open, onClose, onSelect }) {
  return (
    <>
      {/* Always mounted so grid-template-columns can transition both ways:
          0fr collapses it when closed, 1fr expands it to the invisible
          stack's natural width when open. 0.2s ease-out matches
          .dropdown-menu-slide-in (styles.css) so the push-left and the
          menu's slide-in overlap. */}
      <div
        className="grid"
        style={{ gridTemplateColumns: open ? '1fr' : '0fr', transition: 'grid-template-columns 0.2s ease-out' }}
      >
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          <div className="grid">
            {MENU_ITEMS.map(([label]) => (
              <NavBtn
                key={label}
                aria-hidden
                tabIndex={-1}
                style={{ ...itemStyle, gridArea: '1 / 1', visibility: 'hidden', pointerEvents: 'none' }}
              >
                {label}
              </NavBtn>
            ))}
          </div>
        </div>
      </div>
      {open && (
        <DropdownMenu
          onClose={onClose}
          className="dropdown-menu-slide-in fixed right-0 top-0 flex flex-col items-end"
          style={{ gap: 'clamp(2px, 0.8vh, 8px)' }}
        >
          {MENU_ITEMS.map(([label, key, danger]) => (
            <NavBtn
              key={key}
              danger={danger}
              onClick={() => onSelect(key)}
              style={{ ...itemStyle, ...(MENU_GROUP_STARTS.has(key) && { marginTop: 'clamp(8px, 1.6vh, 16px)' }) }}
            >
              {label}
            </NavBtn>
          ))}
        </DropdownMenu>
      )}
    </>
  )
}
