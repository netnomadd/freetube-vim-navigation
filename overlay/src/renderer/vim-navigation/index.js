/**
 * Isolated Vimium-style hints for FreeTube.
 * Loaded only through App.vue hooks inserted by scripts/apply.py.
 */

const MARKER = 'freetube-vim-navigation'
const HINT_CHARS = 'asdfjklghn'
const CSS_ID = `${MARKER}-css`

const CLICK_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  '[role="tab"]',
  '[role="link"]',
  '[role="option"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
  '.profileList .profile',
].join(', ')

const VIDEO_CARD_SELECTOR = '.ft-list-video, .ft-list-item'
const EXTERNAL_BUTTON_SELECTOR = '.externalPlayerIcon button, .externalPlayerIcon'

/** @type {WeakMap<HTMLElement, HTMLElement>} */
const hintTargets = new WeakMap()

/** @type {{ store: unknown, hints: HTMLElement[], typed: string, mode: 'click' | 'external' | null, listeners: boolean, pendingG: boolean }} */
const state = {
  store: null,
  hints: [],
  typed: '',
  mode: null,
  listeners: false,
  pendingG: false,
}

const CSS_TEXT = `
.${MARKER}-hint {
  position: fixed;
  z-index: 2147483646;
  display: flex;
  padding: 1px 3px;
  border-radius: 3px;
  background: linear-gradient(to bottom, #fff7a0 0%, #e6c200 100%);
  color: #111;
  font: 600 12px/1.2 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.4px;
  pointer-events: none;
  box-shadow: 0 1px 2px rgb(0 0 0 / 45%);
}
.${MARKER}-hint[data-hidden="true"] {
  display: none;
}
.${MARKER}-hint .matched {
  color: #8a5a00;
}
.${MARKER}-banner {
  position: fixed;
  z-index: 2147483647;
  inset-block-start: 8px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 4px;
  background: rgb(20 20 20 / 88%);
  color: #fff;
  font: 600 13px/1.3 ui-sans-serif, system-ui, sans-serif;
  pointer-events: none;
}
`

export function installVimNavigation(store) {
  state.store = store
  injectCss()
  if (state.listeners) {
    return
  }
  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('mousedown', onPointer, true)
  document.addEventListener('scroll', onPointer, true)
  window.addEventListener('resize', onPointer, true)
  state.listeners = true
}

export function uninstallVimNavigation() {
  hideHints()
  if (!state.listeners) {
    return
  }
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('mousedown', onPointer, true)
  document.removeEventListener('scroll', onPointer, true)
  window.removeEventListener('resize', onPointer, true)
  state.listeners = false
  document.getElementById(CSS_ID)?.remove()
}

function isEnabled() {
  const getters = state.store?.getters
  if (!getters || typeof getters.getEnableVimNavigation === 'undefined') {
    return true
  }
  return getters.getEnableVimNavigation !== false
}

function injectCss() {
  if (document.getElementById(CSS_ID)) {
    return
  }
  const style = document.createElement('style')
  style.id = CSS_ID
  style.textContent = CSS_TEXT
  document.head.appendChild(style)
}

/**
 * @param {KeyboardEvent} event
 */
function onKeydown(event) {
  if (!isEnabled()) {
    return
  }

  if (state.mode) {
    handleHintKey(event)
    return
  }

  if (isEditable(event.target) || isEditable(document.activeElement)) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      const field = isEditable(event.target) ? event.target : document.activeElement
      field.blur()
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    return
  }

  if ((event.ctrlKey || event.metaKey) && !event.altKey) {
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault()
      event.stopImmediatePropagation()
      state.pendingG = false
      scrollPage(halfPageDelta())
    } else if (event.key.toLowerCase() === 'u') {
      event.preventDefault()
      event.stopImmediatePropagation()
      state.pendingG = false
      scrollPage(-halfPageDelta())
    }
    return
  }

  if (event.ctrlKey || event.metaKey) {
    return
  }

  if (event.altKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    event.stopImmediatePropagation()
    state.pendingG = false
    showHints('click')
    return
  }

  // Plain f is hints everywhere. Shift+F is left for the player fullscreen shortcut.
  if (event.key === 'f' && !event.altKey && !event.shiftKey) {
    event.preventDefault()
    event.stopImmediatePropagation()
    state.pendingG = false
    showHints('click')
    return
  }

  if (event.key.toLowerCase() === 'v' && !event.altKey) {
    event.preventDefault()
    event.stopImmediatePropagation()
    state.pendingG = false
    showHints('external')
    return
  }

  if (event.altKey) {
    return
  }

  if (event.key === 'j' && !event.shiftKey) {
    event.preventDefault()
    event.stopImmediatePropagation()
    state.pendingG = false
    scrollPage(lineDelta())
    return
  }

  if (event.key === 'k' && !event.shiftKey) {
    event.preventDefault()
    event.stopImmediatePropagation()
    state.pendingG = false
    scrollPage(-lineDelta())
    return
  }

  if (event.key === 'G' && event.shiftKey) {
    event.preventDefault()
    event.stopImmediatePropagation()
    state.pendingG = false
    scrollPage(Number.POSITIVE_INFINITY)
    return
  }

  if (event.key === 'g' && !event.shiftKey) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (state.pendingG) {
      state.pendingG = false
      scrollPage(Number.NEGATIVE_INFINITY)
    } else {
      state.pendingG = true
    }
    return
  }

  state.pendingG = false
}

/**
 * @param {KeyboardEvent} event
 */
function handleHintKey(event) {
  event.preventDefault()
  event.stopImmediatePropagation()

  if (event.key === 'Escape' || event.key === 'Esc') {
    hideHints()
    return
  }

  if (event.key === 'Backspace') {
    state.typed = state.typed.slice(0, -1)
    filterHints()
    return
  }

  if (event.key.length !== 1 || event.altKey) {
    return
  }

  const ch = event.key.toLowerCase()
  if (!HINT_CHARS.includes(ch)) {
    return
  }

  state.typed += ch
  filterHints()
}

function onPointer() {
  if (state.mode) {
    hideHints()
  }
}

function lineDelta() {
  return Math.max(60, Math.round(window.innerHeight * 0.12))
}

function halfPageDelta() {
  return Math.max(120, Math.round(window.innerHeight * 0.45))
}

/**
 * @returns {Element}
 */
function scrollingElement() {
  const prompt = document.querySelector('.prompt')
  if (prompt instanceof HTMLElement && prompt.scrollHeight > prompt.clientHeight + 8) {
    return prompt
  }
  const main = document.querySelector('[role="main"]')
  if (main instanceof HTMLElement && main.scrollHeight > main.clientHeight + 8) {
    return main
  }
  return document.scrollingElement || document.documentElement
}

/**
 * @param {number} delta
 */
function scrollPage(delta) {
  const el = scrollingElement()
  if (!Number.isFinite(delta)) {
    el.scrollTo({
      top: delta > 0 ? el.scrollHeight : 0,
      behavior: 'auto',
    })
    return
  }
  el.scrollBy({
    top: delta,
    behavior: 'auto',
  })
}

/**
 * @param {EventTarget | null} target
 * @returns {target is HTMLElement}
 */
function isEditable(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') {
    return true
  }
  if (tag !== 'INPUT') {
    return false
  }
  const type = (target.getAttribute('type') || 'text').toLowerCase()
  return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden', 'image', 'range', 'color'].includes(type)
}

/**
 * @param {HTMLElement} el
 * @returns {HTMLElement | null}
 */
function findEditable(el) {
  if (isEditable(el)) {
    return el
  }
  const inner = el.querySelector(
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'
  )
  return inner instanceof HTMLElement && isEditable(inner) ? inner : null
}

/**
 * @param {HTMLElement} field
 */
function focusEditable(field) {
  // FreeTube itself focuses the search bar asynchronously so Chromium on
  // KDE/Plasma actually shows a caret (see FreeTube#2019).
  setTimeout(() => {
    field.focus()
    if (typeof field.setSelectionRange === 'function') {
      try {
        const len = field.value?.length ?? 0
        field.setSelectionRange(len, len)
      } catch {
        // some input types reject setSelectionRange
      }
    }
  }, 0)
}

/**
 * @param {'click' | 'external'} mode
 */
function showHints(mode) {
  hideHints()
  state.mode = mode
  state.typed = ''

  const roots = hintRoots()
  const targets = []
  const seen = new Set()

  for (const root of roots) {
    const nodes = collectTargets(root, mode)
    for (const node of nodes) {
      if (seen.has(node) || !isVisible(node)) {
        continue
      }
      seen.add(node)
      targets.push(node)
    }
  }

  if (targets.length === 0) {
    hideHints()
    return
  }

  const labels = generateHints(targets.length, HINT_CHARS)
  for (let i = 0; i < targets.length; i++) {
    const hint = document.createElement('div')
    hint.className = `${MARKER}-hint`
    hint.dataset.label = labels[i]
    hintTargets.set(hint, targets[i])
    positionHint(hint, targets[i])
    document.body.appendChild(hint)
    state.hints.push(hint)
  }

  renderHintLabels()
  showBanner(mode)
}

/**
 * @returns {ParentNode[]}
 */
function hintRoots() {
  const prompt = document.querySelector('.prompt')
  if (prompt) {
    return [prompt]
  }
  return [document]
}

/**
 * @param {ParentNode} root
 * @param {'click' | 'external'} mode
 * @returns {HTMLElement[]}
 */
function collectTargets(root, mode) {
  if (mode === 'external') {
    const cards = [...root.querySelectorAll(VIDEO_CARD_SELECTOR)]
      .filter((el) => videoIdFrom(el))
    const buttons = [...root.querySelectorAll(EXTERNAL_BUTTON_SELECTOR)]
    const watchLink = root.querySelector?.('a[href*="/watch/"]')
    const unique = []
    const seenIds = new Set()
    for (const card of cards) {
      const id = videoIdFrom(card)
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        unique.push(card)
      }
    }
    for (const button of buttons) {
      if (!(button instanceof HTMLElement)) {
        continue
      }
      if (unique.some((card) => card.contains(button))) {
        continue
      }
      unique.push(button)
    }
    if (unique.length === 0 && watchLink instanceof HTMLElement) {
      return [watchLink]
    }
    return unique
  }

  return [...root.querySelectorAll(CLICK_SELECTOR)].filter((el) => {
    if (!(el instanceof HTMLElement)) {
      return false
    }
    if (el.closest('.vimHint, .' + MARKER + '-hint')) {
      return false
    }
    // Collapsed description links are tabindex=-1; skip those and other
    // non-tabbable duplicates (e.g. video thumbnails).
    if (el.getAttribute('tabindex') === '-1') {
      return false
    }
    return true
  })
}

/**
 * @param {HTMLElement} el
 */
function isVisible(el) {
  if (el.closest('[hidden], [inert], [aria-hidden="true"]')) {
    return false
  }
  const rect = el.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) {
    return false
  }
  if (rect.bottom < 0 || rect.right < 0 || rect.top > innerHeight || rect.left > innerWidth) {
    return false
  }
  const style = getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
    return false
  }
  return isInsideOverflow(el, rect)
}

/**
 * @param {HTMLElement} el
 * @param {DOMRect} rect
 */
function isInsideOverflow(el, rect) {
  let parent = el.parentElement
  while (parent && parent !== document.documentElement) {
    const cs = getComputedStyle(parent)
    if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + cs.overflowY)) {
      const pr = parent.getBoundingClientRect()
      const overlapW = Math.min(rect.right, pr.right) - Math.max(rect.left, pr.left)
      const overlapH = Math.min(rect.bottom, pr.bottom) - Math.max(rect.top, pr.top)
      if (overlapW < 2 || overlapH < 2) {
        return false
      }
    }
    parent = parent.parentElement
  }
  return true
}

/**
 * @param {HTMLElement} hint
 * @param {HTMLElement} target
 */
function positionHint(hint, target) {
  const rect = target.getBoundingClientRect()
  hint.style.top = `${Math.max(0, rect.top)}px`
  hint.style.left = `${Math.max(0, rect.left)}px`
}

function renderHintLabels() {
  for (const hint of state.hints) {
    const label = hint.dataset.label || ''
    hint.replaceChildren()
    for (const ch of label) {
      const span = document.createElement('span')
      span.textContent = ch.toUpperCase()
      hint.appendChild(span)
    }
  }
  filterHints()
}

function filterHints() {
  const typed = state.typed
  const matches = []
  for (const hint of state.hints) {
    const label = hint.dataset.label || ''
    const ok = label.startsWith(typed)
    hint.dataset.hidden = ok ? 'false' : 'true'
    if (!ok) {
      continue
    }
    matches.push(hint)
    const spans = [...hint.children]
    for (let i = 0; i < spans.length; i++) {
      spans[i].classList.toggle('matched', i < typed.length)
    }
  }

  if (matches.length === 1 && typed.length > 0) {
    activate(matches[0])
    return
  }

  if (matches.length === 0) {
    hideHints()
  }
}

/**
 * @param {HTMLElement} hint
 */
function activate(hint) {
  const target = hintTargets.get(hint)
  const mode = state.mode
  hideHints()
  if (!(target instanceof HTMLElement)) {
    return
  }
  if (mode === 'external') {
    openExternal(target)
    return
  }
  const field = findEditable(target)
  if (field) {
    focusEditable(field)
    return
  }
  target.click()
}

/**
 * @param {HTMLElement} target
 */
function openExternal(target) {
  const icon = target.matches?.('.externalPlayerIcon, .externalPlayerIcon *')
    ? target.closest('.externalPlayerIcon') || target
    : target.querySelector?.('.externalPlayerIcon button, .externalPlayerIcon')

  if (icon instanceof HTMLElement) {
    const clickable = icon.matches('button') ? icon : icon.querySelector('button') || icon
    clickable.click()
    return
  }

  const videoId = videoIdFrom(target)
  if (videoId && window.ftElectron?.openInExternalPlayer) {
    window.ftElectron.openInExternalPlayer({ videoId })
    return
  }

  target.click()
}

/**
 * @param {Element} el
 * @returns {string | null}
 */
function videoIdFrom(el) {
  const scoped = el.matches?.('a[href]') ? el : el.querySelector('a[href*="/watch/"]')
  const href = scoped?.getAttribute('href') || ''
  const match = href.match(/\/watch\/([\w-]{11})/)
  if (match) {
    return match[1]
  }
  if (location.hash.startsWith('#/watch/')) {
    const id = location.hash.slice('#/watch/'.length).split(/[/?&]/)[0]
    if (/^[\w-]{11}$/.test(id)) {
      return id
    }
  }
  return null
}

function showBanner(mode) {
  const banner = document.createElement('div')
  banner.className = `${MARKER}-banner`
  banner.id = `${MARKER}-banner`
  banner.textContent = mode === 'external'
    ? 'External player: type a hint (Esc cancels)'
    : 'Hints: type a label (Esc cancels)'
  document.body.appendChild(banner)
}

function hideHints() {
  for (const hint of state.hints) {
    hint.remove()
  }
  state.hints = []
  state.typed = ''
  state.mode = null
  state.pendingG = false
  document.getElementById(`${MARKER}-banner`)?.remove()
}

/**
 * @param {number} count
 * @param {string} chars
 * @returns {string[]}
 */
function generateHints(count, chars) {
  const base = chars.length
  let width = 1
  while (base ** width < count) {
    width += 1
  }
  const hints = []
  for (let i = 0; i < count; i++) {
    let n = i
    let out = ''
    for (let w = 0; w < width; w++) {
      out = chars[n % base] + out
      n = Math.floor(n / base)
    }
    hints.push(out)
  }
  return hints
}
