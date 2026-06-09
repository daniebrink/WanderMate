"use client";

import { deletePackage } from "@/app/admin/actions";

export function DeletePackageButton({ packageId }: { packageId: string }) {
  return (
    <form action={deletePackage}>
      <input type="hidden" name="packageId" value={packageId} />
      <button
        type="submit"
        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
        onClick={(e) => {
          if (!confirm("Delete this package? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
