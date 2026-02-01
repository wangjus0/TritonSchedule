import { SVGProps } from "react";

export function TridentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Center prong */}
      <path d="M12 2v6" />
      <path d="M12 8l-1 2h2l-1-2" />
      
      {/* Left prong */}
      <path d="M7 4v4" />
      <path d="M7 8l-1 1.5h2L7 8" />
      <path d="M7 9.5L9 12" />
      
      {/* Right prong */}
      <path d="M17 4v4" />
      <path d="M17 8l-1 1.5h2L17 8" />
      <path d="M17 9.5L15 12" />
      
      {/* Connecting bar */}
      <path d="M9 12h6" />
      
      {/* Handle */}
      <path d="M12 12v10" />
      <path d="M10 20h4" />
    </svg>
  );
}
