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
    pageBack:    '#4B5563', // underside color of the peel/curl during page-turn
    inputText:   '#0a2540', // text color inside inputs AND buttons
    label:       '#000000', // "Login" title + "Username"/"Password" labels
    // Page background: concentric arc bands behind the card, outer -> inner.
    pageBands: ['#081c3a', '#0a2a55', '#0b3a5e', '#0a4258', '#09494e', '#0a5346', '#0a5038', '#0e4a26'],
  },

  // ---- FONT ----
  font: {
    family: '"RetroByte"',
    letterSpacing: '0.12em',
    title:  '5cqw',   // heading size
    label:  '3cqw',   // field label size
    input:  '2.6cqw', // typed text size
    button: '2.6cqw', // button label size
  },

  // ---- PIXEL FRAME (the input/button border artwork) ----
  frame: {
    grid:         16, // source canvas resolution — smaller = blockier pixels
    radius:       2,  // corner clip in source px
    cornerLayers: 4,  // how many outer rings get the clipped corner
    slice:        4,  // 9-slice size; keep >= (inputBorder.length + 1)
    width:        '1.4cqw', // rendered border thickness
  },

  // ---- LAYOUT — positions taken from Figma (900×558 canvas → %) ----
  layout: {
    titleTop:  '8%',
    fieldX:    '20.2%',
    fieldW:    '44%',
    fieldH:    '13%',
    inputPadX: '2.2cqw',
    pwToggleSize: '5.5cqw',

    usernameLabelTop:  '22.65%',
    usernameTop:       '30%',
    passwordLabelTop:  '47.56%',
    passwordTop:       '54.91%',

    // Signup-only: confirm password sits naturally below the password row
    confirmPwLabelTop: '72.47%',
    confirmPwTop:      '79.28%',

    buttonPadX:     '1.1cqw',
    buttonPadY:     '0.9cqw',
    googleIconSize: '5.2cqw',

    // Button positions. Optional flags:
    //   pad        -> uniform padding override (all four sides)
    //   matchInput -> locks height to fieldH and centers content
    buttons: {
      google:     { left: '80.7%',  top: '30%',    pad: '0cqw',  matchInput: true }, // username row, login only
      flip:       { left: '75.2%',  top: '54.91%', matchInput: true },               // password row, both modes
      login:      { left: '20.2%',  top: '73.54%', font: '2.7cqw' },
      forgot:     { left: '36.67%', top: '73.54%', font: '2.7cqw' },
      createAcct: { left: '70.1%',  top: '79.28%', matchInput: true },               // confirm pw row, signup only
    },
  },

  // ---- PAGE-TURN ----
  flip: {
    columns:  8,
    steps:    6,
    duration: 700,
  },

  copy: {
    login:  { title: 'Login',   primary: 'Login',          alt: 'Sign Up →' },
    signup: { title: 'Sign Up', primary: 'Create Account', alt: '← Login'   },
  },
}
