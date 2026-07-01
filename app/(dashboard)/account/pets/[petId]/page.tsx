// /account/pets/[petId] — view/edit a single pet's profile
export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Pet: {petId}</h1>
      <p className="mt-2 text-zinc-500">Placeholder — pet profile view/edit.</p>
    </div>
  );
}
