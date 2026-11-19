/** Former header outlines retained solely for comparison. */
export function PreviousNavigationIcon({ name, size }: { name: "user" | "search"; size: number }) {
  if (name === "user") return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="8" cy="4.5" r="3" />
      <path d="M2 15v-1a6 6 0 0 1 12 0v1" />
    </svg>
  );
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <path fill="currentColor" fillRule="evenodd" d="M11.846 3.075a5.747 5.747 0 00-7.89-1.967 5.749 5.749 0 002.968 10.678c.841 0 1.689-.197 2.486-.583L11.69 15h1.227l-2.601-4.33a5.747 5.747 0 001.53-7.595zM9.34 10.068a4.694 4.694 0 01-2.417.673 4.674 4.674 0 01-4.038-2.282 4.683 4.683 0 01-.532-3.561 4.674 4.674 0 012.142-2.894 4.693 4.693 0 012.417-.672c1.669 0 3.179.853 4.038 2.282a4.672 4.672 0 01.532 3.56 4.674 4.674 0 01-2.142 2.894z" />
    </svg>
  );
}
