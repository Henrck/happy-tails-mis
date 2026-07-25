"use client";
export default function ArchiveConfirmModal({
  itemName,
  archived,
  onClose,
  onConfirm,
}: {
  itemName: string;
  archived: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-xs bg-white rounded-3xl overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-zinc-600">
          {archived ? "Unarchive" : "Archive"} <strong>{itemName}</strong>?
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">
            No
          </button>
          <button onClick={onConfirm} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm py-2 rounded-full transition-colors">
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
