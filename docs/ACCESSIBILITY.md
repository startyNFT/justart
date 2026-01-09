# Accessibility Guide

This document outlines accessibility best practices for the JustArt NFT Gallery platform.

## Overview

Accessibility (a11y) ensures that all users, including those with disabilities, can use the application effectively. This includes:
- Screen reader users
- Keyboard-only users
- Users with visual impairments
- Users with motor disabilities
- Users with cognitive disabilities

## WCAG 2.1 Compliance

We aim for WCAG 2.1 Level AA compliance.

### Key Principles (POUR)

1. **Perceivable** - Information must be presentable in ways users can perceive
2. **Operable** - Interface components must be operable
3. **Understandable** - Information and operation must be understandable
4. **Robust** - Content must be robust enough to work with assistive technologies

---

## Implementation Guidelines

### 1. Semantic HTML

✅ **Good:**
```tsx
<button onClick={handleClick}>Submit</button>
<nav><a href="/explore">Explore</a></nav>
<main><h1>Gallery Title</h1></main>
```

❌ **Bad:**
```tsx
<div onClick={handleClick}>Submit</div>
<div><div className="link">Explore</div></div>
<div><div className="title">Gallery Title</div></div>
```

---

### 2. Keyboard Navigation

All interactive elements must be keyboard accessible:

**Requirements:**
- Tab order follows logical flow
- Focus indicators are visible
- No keyboard traps
- Enter/Space activate buttons
- Arrow keys navigate lists/grids

**Example:**
```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  Click me
</button>
```

**Focus Management:**
```tsx
import { useRef, useEffect } from 'react'

function Modal({ isOpen }: { isOpen: boolean }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Focus close button when modal opens
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  return (
    <dialog open={isOpen}>
      <button ref={closeButtonRef}>Close</button>
    </dialog>
  )
}
```

---

### 3. ARIA Labels and Roles

#### Button Groups

```tsx
<div role="group" aria-label="Image size options">
  <button
    aria-label="Set size to small"
    aria-pressed={size === 'small'}
    type="button"
  >
    <SmallIcon aria-hidden="true" />
  </button>
  <button
    aria-label="Set size to medium"
    aria-pressed={size === 'medium'}
    type="button"
  >
    <MediumIcon aria-hidden="true" />
  </button>
</div>
```

#### Icon Buttons

```tsx
// Decorative icons - hide from screen readers
<button aria-label="Delete gallery">
  <TrashIcon aria-hidden="true" />
</button>

// Informative icons - provide text alternative
<button aria-label="Like gallery (42 likes)">
  <HeartIcon aria-hidden="true" />
  <span className="sr-only">42 likes</span>
</button>
```

#### Loading States

```tsx
<button disabled aria-busy="true" aria-label="Loading galleries">
  <Loader2 className="animate-spin" aria-hidden="true" />
  <span className="sr-only">Loading...</span>
</button>
```

#### Form Inputs

```tsx
<label htmlFor="gallery-name">
  Gallery Name
  <span aria-label="required">*</span>
</label>
<input
  id="gallery-name"
  type="text"
  required
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'name-error' : undefined}
/>
{hasError && (
  <div id="name-error" role="alert">
    Gallery name is required
  </div>
)}
```

---

### 4. Color Contrast

**Minimum Ratios (WCAG AA):**
- Normal text: 4.5:1
- Large text (18pt+): 3:1
- UI components: 3:1

**Example: Color Picker**
```tsx
<button
  style={{ backgroundColor: color }}
  aria-label={`Select ${getColorName(color)} background color`}
  title={`${getColorName(color)} (${color})`}
>
  {/* Visual button */}
</button>
```

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Accessibility Panel

---

### 5. Images and Media

#### Decorative Images
```tsx
<img src="/decoration.png" alt="" aria-hidden="true" />
```

#### Informative Images
```tsx
<img
  src={nft.image}
  alt={`${nft.name} by ${nft.collection.name}`}
/>
```

#### Background Images with Content
```tsx
<div
  style={{ backgroundImage: `url(${image})` }}
  role="img"
  aria-label="Gallery preview"
>
  {/* Content */}
</div>
```

#### Video/Audio
```tsx
<video controls aria-label="NFT video">
  <source src={videoUrl} type="video/mp4" />
  <track kind="captions" src={captionsUrl} srclang="en" label="English" />
</video>
```

---

### 6. Navigation

#### Skip Links
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

<main id="main-content">
  {/* Content */}
</main>
```

#### Breadcrumbs
```tsx
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/explore">Explore</a></li>
    <li aria-current="page">Gallery Name</li>
  </ol>
</nav>
```

#### Pagination
```tsx
<nav aria-label="Pagination">
  <button
    disabled={currentPage === 1}
    aria-label="Go to previous page"
  >
    Previous
  </button>
  <span aria-current="page" aria-label={`Page ${currentPage}`}>
    {currentPage}
  </span>
  <button
    disabled={currentPage === totalPages}
    aria-label="Go to next page"
  >
    Next
  </button>
</nav>
```

---

### 7. Live Regions

For dynamic content updates:

```tsx
// Success message
<div role="status" aria-live="polite">
  Gallery saved successfully!
</div>

// Error message (urgent)
<div role="alert" aria-live="assertive">
  Failed to save gallery. Please try again.
</div>

// Loading count
<div role="status" aria-live="polite" aria-atomic="true">
  Loading: {loaded} of {total} NFTs
</div>
```

---

### 8. Modals and Dialogs

```tsx
function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <h2 id="modal-title">{title}</h2>
      <div id="modal-description">{children}</div>
      <button onClick={onClose} aria-label="Close dialog">
        Close
      </button>
    </dialog>
  )
}
```

---

### 9. Forms

#### Required Fields
```tsx
<label htmlFor="name">
  Gallery Name
  <span aria-label="required">*</span>
</label>
<input
  id="name"
  required
  aria-required="true"
  aria-describedby="name-hint"
/>
<div id="name-hint">Choose a unique name for your gallery</div>
```

#### Error Handling
```tsx
<form onSubmit={handleSubmit} aria-label="Create gallery form">
  {errors.general && (
    <div role="alert" className="error">
      {errors.general}
    </div>
  )}

  <input
    aria-invalid={!!errors.name}
    aria-errormessage={errors.name ? 'name-error' : undefined}
  />
  {errors.name && (
    <div id="name-error" role="alert">
      {errors.name}
    </div>
  )}
</form>
```

---

### 10. Tables

```tsx
<table>
  <caption>Gallery statistics</caption>
  <thead>
    <tr>
      <th scope="col">Gallery</th>
      <th scope="col">Views</th>
      <th scope="col">Likes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">My Gallery</th>
      <td>1,234</td>
      <td>56</td>
    </tr>
  </tbody>
</table>
```

---

## Testing

### Automated Testing

```bash
# Install dependencies
npm install --save-dev @axe-core/react jest-axe

# Run accessibility tests
npm test
```

**Example Test:**
```tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Manual Testing

#### Keyboard Navigation
1. Unplug your mouse
2. Use Tab to navigate
3. Use Enter/Space to activate
4. Use Escape to close modals
5. Use Arrow keys in menus/grids

#### Screen Reader Testing

**macOS - VoiceOver:**
```
Cmd + F5 - Enable/Disable
Ctrl + Option + Right Arrow - Next element
Ctrl + Option + Cmd + H - Next heading
```

**Windows - NVDA (free):**
```
Ctrl + Alt + N - Start NVDA
Down Arrow - Next element
H - Next heading
```

**Chrome Extension:**
- [Screen Reader](https://chrome.google.com/webstore/detail/screen-reader/kgejglhpjiefppelpmljglcjbhoiplfn)

### Tools

1. **Browser DevTools**
   - Chrome Lighthouse (Accessibility audit)
   - Firefox Accessibility Inspector

2. **Browser Extensions**
   - axe DevTools
   - WAVE Evaluation Tool
   - HeadingsMap

3. **Color Contrast**
   - WebAIM Contrast Checker
   - Colorblind simulator

---

## Common Patterns

### Loading States
```tsx
<button disabled={loading} aria-busy={loading}>
  {loading ? (
    <>
      <Loader2 className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </>
  ) : (
    'Submit'
  )}
</button>
```

### Tooltips
```tsx
<button
  aria-label="Delete gallery"
  aria-describedby="delete-tooltip"
>
  <TrashIcon aria-hidden="true" />
</button>
<div id="delete-tooltip" role="tooltip">
  This action cannot be undone
</div>
```

### Tabs
```tsx
<div role="tablist" aria-label="Gallery settings">
  <button
    role="tab"
    aria-selected={activeTab === 'customize'}
    aria-controls="customize-panel"
    id="customize-tab"
  >
    Customize
  </button>
  <button
    role="tab"
    aria-selected={activeTab === 'nfts'}
    aria-controls="nfts-panel"
    id="nfts-tab"
  >
    Select NFTs
  </button>
</div>

<div
  role="tabpanel"
  id="customize-panel"
  aria-labelledby="customize-tab"
  hidden={activeTab !== 'customize'}
>
  {/* Content */}
</div>
```

---

## Screen Reader Only (sr-only) Class

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## Checklist

Before deploying:

- [ ] All images have alt text
- [ ] All buttons have accessible names
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Form inputs have labels
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Modal focus is trapped
- [ ] Skip links are present
- [ ] Headings are hierarchical (h1 → h2 → h3)
- [ ] Links are distinguishable from text
- [ ] Interactive elements have focus states
- [ ] No keyboard traps
- [ ] Screen reader testing complete

---

## Resources

### Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Learning
- [WebAIM](https://webaim.org/)
- [A11ycasts](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)
- [The A11Y Project](https://www.a11yproject.com/)

---

## Support

For accessibility issues:
- Create an issue with the `accessibility` label
- Tag @accessibility-team
- Include screen reader/browser version
- Provide steps to reproduce
