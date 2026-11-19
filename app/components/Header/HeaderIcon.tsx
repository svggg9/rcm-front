import { CartIcon } from "../ui/CartIcon";
import { ProfileIcon, SearchIcon } from "../ui/NavigationIcons";

type Props = { name: "menu" | "heart" | "search" | "bag" | "user"; cartCount?: number };

// Original contours from the public-header reference approved by the user.
const paths = {
  menu: "M0 14v-1h16v1H0zm0-6V7h16v1H0zm0-7v1h16V1H0z",
  heart: "M1.563 2.726C.027 4.262.015 6.786 1.47 8.405l.468.488.127.127a4.8 4.8 0 00.33.295L8 14.692l5.625-5.355.142-.12.166-.154.445-.456c1.608-1.608 1.65-4.254.061-5.843-1.536-1.536-4.06-1.548-5.679-.094l-.505.487-.237.243-.096-.106-.515-.507c-1.608-1.608-4.254-1.65-5.843-.06zm4.992.633l.591.572.15.161.715.722.717-.71.127-.134.447-.437c1.223-1.223 3.235-1.255 4.429-.062 1.147 1.148 1.162 3.053.075 4.284l-.457.477-.118.118-.132.123-.132.111-4.966 4.724-4.946-4.743-.107-.09-.183-.168-.433-.445C1.109 6.639 1.077 4.627 2.27 3.433c1.148-1.147 3.053-1.162 4.285-.074z",
};

export function HeaderIcon({ name, cartCount }: Props) {
  if (name === "bag") return <CartIcon size={32} count={cartCount} />;
  if (name === "user") return <ProfileIcon size={32} />;
  if (name === "search") return <SearchIcon size={32} />;
  return (
    <svg viewBox="0 0 16 16" width="32" height="32" aria-hidden="true" focusable="false">
      <path d={paths[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
