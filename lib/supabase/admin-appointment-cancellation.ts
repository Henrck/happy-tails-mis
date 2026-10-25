export async function cancelStaffAppointment(appointmentId: string, reason: string): Promise<{ error: string | null }> {
  const clean = reason.trim();
  if (clean.length < 5 || clean.length > 500) return { error: "Enter a cancellation reason between 5 and 500 characters." };
  try {
    const response = await fetch("/api/admin/appointment-status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId, status: "cancelled", reason: clean }),
    });
    const result = await response.json();
    return { error: response.ok ? null : result.error ?? "Unable to cancel appointment." };
  } catch { return { error: "Network error. Please try again." }; }
}
