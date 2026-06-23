import type { ReactElement, SVGProps } from "react";

type IconName =
  | "bell"
  | "calendar"
  | "checkCircle"
  | "chevronRight"
  | "filePlus"
  | "fileText"
  | "folder"
  | "logOut"
  | "moon"
  | "search"
  | "settings"
  | "shieldCheck"
  | "users";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const paths: Record<IconName, ReactElement> = {
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  checkCircle: (
    <>
      <path d="M21.5 11.1a9.5 9.5 0 1 1-4.1-7.8" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  chevronRight: <path d="m9 18 6-6-6-6" />,
  filePlus: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </>
  ),
  fileText: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v1H3z" />
      <path d="M3 10h18l-2 9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
    </>
  ),
  logOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  moon: <path d="M21 15.8A9 9 0 1 1 8.2 3 7 7 0 0 0 21 15.8z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  settings: (
    <>
      <path d="M12.2 2h-.4l-1 3.2a7 7 0 0 0-1.7.7L6.2 4.4l-.3.3-2 3.4.2.3 2.4.8a7 7 0 0 0 0 1.8l-2.4.8-.2.3 2 3.4.3.3 2.9-1.5a7 7 0 0 0 1.7.7l1 3.2h.4l1-3.2a7 7 0 0 0 1.7-.7l2.9 1.5.3-.3 2-3.4-.2-.3-2.4-.8a7 7 0 0 0 0-1.8l2.4-.8.2-.3-2-3.4-.3-.3-2.9 1.5a7 7 0 0 0-1.7-.7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.5 8.8a1.6 1.6 0 0 1-1 0C7.5 20.5 4 18 4 13V5l8-3 8 3z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
};

export function Icon({ name, size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
