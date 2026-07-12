import { SVGProps } from "react";

export function TridentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      <path d="M50 31V78" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M30 44V57C30 68 39 75 50 78"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M70 44V57C70 68 61 75 50 78"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M50 23L42 36H58L50 23Z" fill="currentColor" />
      <path d="M30 32L22 46H38L30 32Z" fill="currentColor" />
      <path d="M70 32L62 46H78L70 32Z" fill="currentColor" />
    </svg>
  );
}
