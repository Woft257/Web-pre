import Image from "next/image";

const sources: Record<string, string> = {
  FRA: "/teams/fr.png",
  ENG: "/teams/eng.png",
  ARG: "/teams/ar.png",
  ESP: "/teams/es.png",
};

export function TeamFlag({ code, size = 40 }: { code: string; size?: number }) {
  const source = sources[code];
  if (!source) {
    return <span className="flag-fallback">{code}</span>;
  }
  return (
    <span className="team-flag" style={{ width: size, height: size }}>
      <Image
        src={source}
        alt={`${code} flag`}
        fill
        sizes={`${size}px`}
        loading="eager"
        unoptimized
      />
    </span>
  );
}
