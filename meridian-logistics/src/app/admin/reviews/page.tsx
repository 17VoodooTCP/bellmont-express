"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DbReview,
  createReview,
  deleteReview,
  getToken,
  listAllReviews,
  updateReview,
} from "@/lib/adminApi";
import { Stars } from "@/components/ReviewsSection";

export default function AdminReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setReviews(await listAllReviews());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
      if (String(err).includes("Sign in")) router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.replace("/admin/login"); return; }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (id: string, part: Partial<DbReview>) =>
    setReviews((p) => p.map((r) => (r.id === id ? { ...r, ...part } : r)));

  const uploadAvatar = (id: string, file: File) => {
    if (file.size > 400 * 1024) return alert("Avatar must be under 400 KB.");
    const reader = new FileReader();
    reader.onload = () => patch(id, { avatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  const saveOne = async (r: DbReview) => {
    setError("");
    try {
      await updateReview(r.id, r);
      setSavedId(r.id);
      setTimeout(() => setSavedId(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const addNew = async () => {
    await createReview({ name: "New Customer", role: "Role, Company", stars: 5, quote: "Write the review here.", sortOrder: reviews.length + 1 });
    void refresh();
  };

  return (
    <div className="mx-auto max-w-4xl px-5 pb-28 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sage">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Reviews editor</h1>
          <p className="mt-2 text-sm text-ink-mute">
            Stored in the database. Edits publish to every visitor immediately.
          </p>
        </div>
        <Link href="/admin" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">
          Back to console
        </Link>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-sage-tint px-4 py-3 text-sm text-sage-deep">{error}</p>}
      {loading && <p className="mt-10 text-sm text-ink-mute">Loading… the free service may take a minute to wake.</p>}

      <div className="mt-8 space-y-6">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line p-6">
            <div className="flex flex-wrap items-center gap-4">
              {r.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ocean text-sm font-bold">
                  {r.name[0] ?? "?"}
                </span>
              )}
              <label className="cursor-pointer rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-ink">
                Upload avatar
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(r.id, f); }} />
              </label>
              <div className="ml-auto flex items-center gap-3">
                <Stars n={r.stars} />
                <input
                  type="range" min={1} max={5} step={1} value={r.stars}
                  aria-label="Star rating"
                  onChange={(e) => patch(r.id, { stars: Number(e.target.value) })}
                  className="w-28 accent-sage"
                />
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <input type="checkbox" checked={r.published}
                    onChange={(e) => patch(r.id, { published: e.target.checked })}
                    className="accent-sage" />
                  Published
                </label>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} aria-label="Name"
                className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-ink" />
              <input value={r.role} onChange={(e) => patch(r.id, { role: e.target.value })} aria-label="Role"
                className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-ink" />
            </div>
            <textarea value={r.quote} onChange={(e) => patch(r.id, { quote: e.target.value })} aria-label="Review text" rows={3}
              className="mt-3 w-full rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-ink" />
            <div className="mt-4 flex items-center gap-4">
              <button onClick={() => void saveOne(r)} className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white hover:bg-sage">
                Save
              </button>
              <button
                onClick={() => { if (confirm("Delete this review?")) deleteReview(r.id).then(refresh); }}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
              {savedId === r.id && <span className="text-sm font-medium text-green-600">Saved and live.</span>}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => void addNew()} className="mt-8 rounded-full border border-line px-6 py-3 text-sm font-semibold hover:border-ink">
        Write a review
      </button>
    </div>
  );
}
