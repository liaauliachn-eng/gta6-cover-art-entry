// Fixed scenes for screenshots, driven by the URL query. `?shot=editor` shows the
// full editor with the demo photos loaded; `?shot=cover` shows the cover alone,
// edge to edge. `size` picks square, portrait or wide, `grade` the colour grade,
// `title` and `subtitle` the caption. window.__shotReady is set once the scene has
// painted with the display font loaded, so a screenshot never catches it half-drawn.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const size = query.get('size');
  if (size === 'square' || size === 'portrait' || size === 'wide') api.setSize(size);
  const grade = query.get('grade');
  if (grade === 'sunset' || grade === 'neon' || grade === 'chrome') api.setGrade(grade);
  api.setCaption(
    query.get('title') ?? 'Sunset Heist',
    query.get('subtitle') ?? 'Palms · Chrome · Neon Nights',
  );
  await api.loadDemos();
  if (document.fonts?.ready) await document.fonts.ready;
  api.redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
