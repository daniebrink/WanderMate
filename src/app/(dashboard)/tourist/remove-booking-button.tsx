"use client";

export function RemoveBookingButton() {
  return (
    <button
      type="submit"
      className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
      onClick={(e) => {
        if (!confirm("Remove this booking from your history?")) {
          e.preventDefault();
        }
      }}
    >
      Remove
    </button>
  );
}
