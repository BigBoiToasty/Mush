// =============================================================================
// theme.js — the ONE file to change how the login page looks.
//
// Edit a value, save, and the page hot-reloads. Everything else (LoginCard.jsx)
// reads from here, so you shouldn't need to touch the component to restyle.
//
// Units you'll see:
//   cqw = percent of the CARD's width — scales as the card grows/shrinks.
//   %   = position or size relative to the card.
// =============================================================================

export const theme = {
  // ---- COLORS ----
  colors: {
    // Input box border: a gradient listed darker (outer) -> lighter (inner).
    // Add or remove hex values to change how many gradient steps there are.
    // NOTE: if you change how many colors are here, update frame.slice below
    // (slice should be at least this many colors + 1).
    inputBorder: ['#3f93c7', '#79c0e6', '#bfe4f6'],
    inputFill:   '#cdeaf8', // interior fill of the input boxes
    inputCorner: '#ffffff', // shows in the 4 rounded corners — match the paper behind the box
    outline:     '#0a0a0a', // black outer pixel line wrapping each box
    inputText:   '#0a2540', // text color inside inputs AND buttons
    label:       '#000000', // "Login" title + "Username"/"Password" labels
    // Page background: concentric arc bands behind the card, outer -> inner.
    pageBands: ['#081c3a', '#0a2a55', '#0b3a5e', '#0a4258', '#09494e', '#0a5346', '#0a5038', '#0e4a26'],
  },

  // ---- FONT ----
  font: {
    family: '"RetroByte"', // title/label font (a .ttf in assets/fonts)
    letterSpacing: '0.12em',
    title:  '5cqw',   // "Login" heading size
    label:  '3cqw',   // "Username" / "Password" size
    input:  '2.6cqw', // size of the text you type
    button: '2.6cqw', // button label size
  },

  // ---- PIXEL FRAME (the input box border artwork) ----
  frame: {
    grid:   16,       // source resolution. SMALLER = bigger, blockier pixels.
    radius: 2,        // corner clip size in source px (1 = square, higher = rounder/oval)
    cornerLayers: 4,  // how many OUTER rings get the clipped corner; lower this to keep inner rings + fill square (e.g. 2 = rectangular interior)
    slice:  4,        // 9-slice size. Keep >= (number of inputBorder colors + 1).
    width:  '1.4cqw', // how thick the border looks on screen
  },

  // ---- LAYOUT (positions & sizes as % of the card) ----
  layout: {
    titleTop:  '8%',     // vertical position of the "Login" heading
    fieldX:    '20.2%',  // left edge of the labels and input boxes
    fieldW:    '44%',    // input box width
    fieldH:    '13%',    // input box height
    inputPadX: '2.2cqw', // left/right padding inside the boxes
    pwToggleSize: '5.5cqw', // Sableye show/hide sprite width at the end of the password box (height auto)

    usernameLabelTop: '21.6%',
    usernameTop:      '30%',   // username input box
    passwordLabelTop: '46.5%',
    passwordTop:      '54.4%', // password input box

    buttonPadX:   '1.1cqw', // L/R padding (small gap word->border; keeps Login & Forgot from touching)
    buttonPadY:   '0.9cqw', // T/B padding (less dead space)
    googleIconSize: '5.2cqw', // Google logo HEIGHT. Fills the taller (input-height) Google button
    // Button positions (left / top as % of the card). Optional per-button flags:
    //   font       -> overrides font.button for just that one
    //   matchInput -> forces the button to the input-box height (fieldH), content centered
    buttons: {
      google: { left: '78%',   top: '30%', pad: '0cqw', matchInput: true }, // Username row; same height as inputs
      signup: { left: '75%',   top: '54.4%', matchInput: true },            // same height as inputs; clears card's right edge
      login:  { left: '20.2%', top: '75.9%', font: '2.7cqw' }, // aligns to password box FRONT (20.2%)
      forgot: { right: '35.8%', top: '75.9%', font: '2.7cqw' }, // aligns to password box END (64.2%); smaller font opens the middle gap
    },
  },
}
