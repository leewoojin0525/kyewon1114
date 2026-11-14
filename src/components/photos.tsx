import { mediaInfo } from "@/lib/media";
import { type Photo } from "@/lib/model";
import { Gallery, ZoomImage } from "./gallery";
export async function PhotoImage({
  photo,
  priority = false,
  className = "",
  sizes = "100vw",
}: {
  photo: Photo;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const [media] = await mediaInfo([photo.id]);
  if (!media) return null;
  const derivatives = media.derivatives as {
    width: number;
    height: number;
    key: string;
  }[];
  const largest = derivatives.at(-1)!;
  const mobile = photo.mobileId ? (await mediaInfo([photo.mobileId]))[0] : null;
  return (
    <ZoomImage id={photo.id}>
      <picture
        className={className}
        style={
          {
            "--focal": `${photo.focalX}% ${photo.focalY}%`,
            "--mobile-focal": `${photo.mobileFocalX}% ${photo.mobileFocalY}%`,
          } as React.CSSProperties
        }
      >
        {mobile && (
          <source
            media="(max-width:767px)"
            srcSet={mobile.derivatives
              .map(
                (d: { width: number; key: string }) =>
                  `/media/${d.key} ${d.width}w`,
              )
              .join(", ")}
            sizes="100vw"
          />
        )}
        <img
          src={`/media/${largest.key}`}
          srcSet={derivatives
            .map((d) => `/media/${d.key} ${d.width}w`)
            .join(", ")}
          sizes={sizes}
          width={media.width}
          height={media.height}
          alt={photo.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      </picture>
    </ZoomImage>
  );
}
export async function PhotoGallery({ photos }: { photos: Photo[] }) {
  const media = await mediaInfo(photos.map((p) => p.id));
  const items = photos.flatMap((p) => {
    const m = media.find((m) => m.id === p.id);
    if (!m) return [];
    return [
      {
        ...p,
        src: `/media/${m.derivatives.at(-1).key}`,
        width: m.width,
        height: m.height,
      },
    ];
  });
  return <Gallery items={items} />;
}
