"use client";

import { deleteActivity } from "@/app/admin/actions";

export function DeleteActivityButton({ activityId }: { activityId: string }) {
  return (
    <form action={deleteActivity}>
      <input type="hidden" name="activityId" value={activityId} />
      <button
        type="submit"
        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
        onClick={(e) => {
          if (!confirm("Delete this activity? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
