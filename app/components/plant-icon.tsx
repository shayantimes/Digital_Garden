import Image from "next/image";

export function PlantIcon({ className = "", label }: { className?: string; label?: string }) {
  return (
    <span className={className} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      <Image
        src="/plant-icon.png"
        alt=""
        width={160}
        height={168}
        sizes="160px"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
