# Digital Garden design system

The homepage is the canonical visual reference. Other pages should feel like they were opened inside the same handmade garden workspace, without copying the homepage layout literally.

## Foundations

- **Ink:** `#293129` for primary text and strong borders; `#556057` for supporting text.
- **Canvas:** sage `#b8cdb9` with a quiet six-pixel speckle and a soft diagonal highlight.
- **Paper:** warm `#f5eddf`; use `#faf3e7` for brighter working surfaces and `#eadfce` for inset areas.
- **Accents:** stone `#c5c1b6`, ochre `#e5c77f`, clay `#d8a28d`, leaf `#b9c6a1`, and lilac `#c9c0d2`.
- **UI type:** system monospace (`SFMono-Regular`, Menlo, Monaco, Consolas, Courier New).
- **Reading type:** Georgia for descriptions and long-form article copy only.
- **Borders:** two-pixel ink for the outer window; roughly one-and-a-third pixels for paper objects; soft one-pixel dividers inside them.
- **Shadows:** hard, low-offset paper shadows. Avoid soft floating-card shadows except on the outer window.
- **Shape:** restrained four-to-seven-pixel radii for paper objects and twenty pixels for the outer desktop window.

The reusable tokens live in `app/garden-design-system.css` and use the `--ds-*` prefix.

## Composition rules

1. Every public page except the homepage sits inside a single 1120-pixel desktop frame: shared header, sage workspace, dark footer.
2. The primary page introduction is one warm paper panel with a small tape strip, a section accent, and one intentionally imperfect rotation.
3. Collections use a twelve-column editorial grid on wide screens and one column on small screens.
4. Cards use paper, ink borders, hard shadows, and very small rotations. Do not stack multiple decorative effects on the same card.
5. Post pages keep the same workspace frame but narrow prose to 690 pixels for comfortable reading.
6. Section colors are semantic and stable: Build = stone, Notes = ochre, Shelf = clay, Life = leaf.
7. Botanical marks, tape, speckles, and stamps are supporting details. They should never compete with titles or reading content.

## Interaction and accessibility

- Hover raises paper by two to three pixels and deepens its hard shadow.
- Keyboard focus uses a two-pixel dashed ink outline with visible offset.
- Controls retain text labels; decorative symbols and images use empty alt text or `aria-hidden`.
- Layouts collapse before 620 pixels, remove the outer frame edges, and keep at least 44-pixel touch targets for controls.
- Motion is removed when the user prefers reduced motion.

## Implementation map

- `app/garden-design-system.css`: shared tokens, public-page frame, section, post, error, header, and footer patterns.
- `app/components/shelf-library.module.css`: shelf-specific component treatment using the same tokens.
- `app/admin/admin.module.css`: a scoped bridge for the private studio and authentication surfaces.
- `app/components/garden-home-content.tsx` and `app/components/garden-home-content.module.css`: the untouched reference implementation.
