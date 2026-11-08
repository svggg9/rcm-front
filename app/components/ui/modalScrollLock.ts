let locks = 0;
let previousOverflow = "";
let previousRootOverflow = "";

/** Nested dialogs may unmount together, in either order. */
export function lockModalScroll() {
  if (locks++ === 0) {
    previousOverflow = document.body.style.overflow;
    previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    }
  };
}
