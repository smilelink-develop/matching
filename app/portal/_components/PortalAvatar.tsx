import Image from "next/image";

export default function PortalAvatar({
  name,
  photoUrl,
  size = 56,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="rounded-2xl object-cover"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-[#2563EB] font-bold text-white"
      style={{ width: size, height: size, fontSize: size / 2.8 }}
    >
      {name[0] ?? "人"}
    </div>
  );
}
