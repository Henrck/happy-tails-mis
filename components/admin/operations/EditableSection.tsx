"use client";
// Wraps a real section of the live site with an "Edit" button overlay,
// shown only when the parent page's global edit mode is on. Clicking it
// opens the upload modal scoped to that section's site_settings key.
//
// REAL BUG FIXED: this renders the actual live Navbar/Hero/banner
// components — not a mockup — which means their real links and buttons
// (nav items, the "Login" button) were genuinely clickable inside the
// admin preview. Clicking any of them navigated the whole admin app
// away to the public site or /sign-in, kicking the superadmin out of
// the dashboard. `pointer-events-none` on the content wrapper makes
// everything underneath purely visual — pixel-identical, but clicks
// never reach the real <a>/<button> elements inside it. The Edit
// button itself explicitly re-enables pointer-events so it still
// works, since it sits inside the otherwise-disabled zone.
export default function EditableSection({
  editMode,
  label,
  onEdit,
  children,
}: {
  editMode: boolean;
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none" aria-hidden="true">
        {children}
      </div>
      {editMode && (
        <button
          onClick={onEdit}
          className="pointer-events-auto absolute top-4 right-4 z-10 bg-white text-brand-pink border-2 border-brand-pink font-semibold text-sm px-5 py-2 rounded-full shadow-lg hover:bg-brand-pink hover:text-white transition-colors"
        >
          Edit {label}
        </button>
      )}
    </div>
  );
}
