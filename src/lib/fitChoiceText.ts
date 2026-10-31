/** Keep each title as large as possible without changing its button's size. */
export function fitChoiceText(node: HTMLSpanElement, label: string) {
  void label;
  const button = node.parentElement;
  if (!button) return;

  let frame = 0;
  let destroyed = false;

  function fit() {
    if (!button || destroyed) return;
    const style = getComputedStyle(button);
    const width = button.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = button.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (width <= 0 || height <= 0) return;
    const bounds = button.getBoundingClientRect();
    const left = bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const top = bounds.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
    const range = document.createRange();
    range.selectNodeContents(node);

    // Half-pixel steps retain a little more space for long, mixed-language titles.
    let lower = 24;
    let upper = 72;
    let best = lower;
    while (lower <= upper) {
      const size = Math.floor((lower + upper) / 2);
      node.style.fontSize = `${size / 2}px`;
      const textFits = [...range.getClientRects()].every(
        (rect) => rect.left >= left && rect.right <= left + width && rect.top >= top && rect.bottom <= top + height
      );
      if (node.scrollWidth <= width && node.getBoundingClientRect().height <= height && textFits) {
        best = size;
        lower = size + 1;
      } else {
        upper = size - 1;
      }
    }
    node.style.fontSize = `${best / 2}px`;
  }

  function schedule() {
    if (destroyed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  }

  const observer = new ResizeObserver(schedule);
  observer.observe(button);
  void document.fonts.ready.then(schedule);
  schedule();

  return {
    update: schedule,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    }
  };
}
