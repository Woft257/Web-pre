import Image from "next/image";

export function MexcLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      className="mexc-logo"
      src="/brand/mexc-logo.svg"
      alt="MEXC"
      width={355}
      height={64}
      style={{ width: compact ? 100 : 144, height: "auto" }}
      priority
    />
  );
}
