"use client";
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">{message}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold text-sm py-2 rounded-full text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-brand-pink hover:bg-brand-pink-dark"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
