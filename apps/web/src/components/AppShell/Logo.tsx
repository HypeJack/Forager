import { useParams } from "@tanstack/react-router";

interface LogoProps {
  expanded?: boolean;
}

const TENANT_LOGOS: Record<string, string> = {
  sunrise: "/logo-sunrise.svg",
  northwood: "/logo-northwood.svg",
};

export function Logo({ expanded = true }: LogoProps) {
  const { slug } = useParams({ strict: false }) as { slug?: string };

  const tenantLogo = slug ? TENANT_LOGOS[slug] : null;

  if (tenantLogo) {
    return (
      <img
        src={tenantLogo}
        alt={`${slug} logo`}
        className={expanded ? "h-8 w-auto" : "h-8 w-8 object-contain"}
      />
    );
  }

  // Fallback to Forager logos
  return (
    <img
      src={expanded ? "/logo-forager.svg" : "/logo-forager-mark.svg"}
      alt="Forager"
      className={expanded ? "h-6 w-auto" : "h-6 w-6 object-contain"}
    />
  );
}
