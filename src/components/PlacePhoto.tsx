"use client";

import Image from "next/image";
import { useState } from "react";
import type { CategoryId, Photo } from "@/domain/place";
import { Poster } from "./Poster";

interface Props {
  slug: string;
  name: string;
  category: CategoryId;
  photo: Pick<Photo, "src" | "blur"> | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** The place's photo, or its illustrated poster when there's none (or it fails to load). */
export function PlacePhoto({ slug, name, category, photo, sizes, priority = false, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!photo || failed) {
    return <Poster seed={slug} category={category} className={`absolute inset-0 h-full w-full ${className}`} />;
  }

  return (
    <Image
      src={photo.src}
      alt={name}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={photo.blur ? "blur" : "empty"}
      blurDataURL={photo.blur ?? undefined}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={`object-cover transition-opacity duration-500 ${loaded || photo.blur ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
