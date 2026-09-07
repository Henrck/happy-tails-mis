import Navbar from "@/components/landing/Navbar";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";
import { fetchActiveGalleryPhotos } from "@/lib/supabase/gallery";

export default async function GalleryPage() {
  const photos = await fetchActiveGalleryPhotos();

  return (
    <main className="min-h-screen bg-brand-tint">
      <Navbar />
      <div className="py-8">
        <h1 className="text-center text-2xl font-bold text-zinc-900 md:text-3xl">
          Happy Tails, Happy Pets
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-600 md:text-base">
          Before-and-afters from our grooming table.
        </p>
        <GalleryPageClient photos={photos} />
      </div>
    </main>
  );
}
