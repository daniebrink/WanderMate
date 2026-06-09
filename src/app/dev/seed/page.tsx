"use client";

import { useState } from "react";

type SeedResults = {
  usersCreated: string[];
  usersUpdated: string[];
  guidesCreated: string[];
  guidesUpdated: string[];
  driversCreated: string[];
  driversUpdated: string[];
  activitiesCreated: string[];
  activitiesUpdated: string[];
  packagesCreated?: string[];
  packagesUpdated?: string[];
  errors: string[];
};

export default function DevSeedPage() {
  const [capeTownLoading, setCapeTownLoading] = useState(false);
  const [jhbLoading, setJhbLoading] = useState(false);
  const [result, setResult] = useState<SeedResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSeed(endpoint: string) {
    const isCapeTown = endpoint === "/api/seed-demo";
    if (isCapeTown) setCapeTownLoading(true);
    else setJhbLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data.results);
      }
    } catch (err: any) {
      setError(err.message ?? "Network error");
    } finally {
      if (isCapeTown) setCapeTownLoading(false);
      else setJhbLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Development Seeder</h1>
          <p className="text-muted-foreground">
            One-click demo data for local development. Only works in{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">development</code>{" "}
            mode.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Cape Town */}
          <div className="bg-background rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold text-lg">Cape Town</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>
                <strong>5 verified guides</strong> — Thandiwe, James, Sarah, David, Emma
              </li>
              <li>
                <strong>3 verified drivers</strong> — Pieter, Bongani, Fatima
              </li>
              <li>
                <strong>10 activities</strong> — wine tours, hiking, food, culture, wildlife, photography
              </li>
            </ul>
            <button
              onClick={() => handleSeed("/api/seed-demo")}
              disabled={capeTownLoading || jhbLoading}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {capeTownLoading ? "Seeding…" : "Seed Cape Town"}
            </button>
          </div>

          {/* Johannesburg */}
          <div className="bg-background rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold text-lg">Johannesburg</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>
                <strong>5 verified guides</strong> — Nomsa, Johan, Lerato, Michael, Amina
              </li>
              <li>
                <strong>3 verified drivers</strong> — Sipho, Greta, Thabo
              </li>
              <li>
                <strong>10 activities</strong> — Soweto, safari, street art, caves, cooking
              </li>
              <li>
                <strong>3 packages</strong> — Heritage Weekend, Pilanesberg Safari, Creative Day
              </li>
            </ul>
            <button
              onClick={() => handleSeed("/api/seed-johannesburg")}
              disabled={capeTownLoading || jhbLoading}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {jhbLoading ? "Seeding…" : "Seed Johannesburg"}
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
          <strong>Idempotent:</strong> Run this as many times as you want.
          Existing accounts are updated, not duplicated.
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && <ResultsPanel results={result} />}
      </div>
    </div>
  );
}

function ResultsPanel({ results }: { results: SeedResults }) {
  const totalCreated =
    results.usersCreated.length +
    results.guidesCreated.length +
    results.driversCreated.length +
    results.activitiesCreated.length +
    (results.packagesCreated?.length ?? 0);

  const totalUpdated =
    results.usersUpdated.length +
    results.guidesUpdated.length +
    results.driversUpdated.length +
    results.activitiesUpdated.length +
    (results.packagesUpdated?.length ?? 0);

  return (
    <div className="bg-background rounded-lg border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <h2 className="font-semibold text-green-700">Seed Complete</h2>
          <p className="text-sm text-muted-foreground">
            {totalCreated > 0 ? `${totalCreated} created` : ""}
            {totalCreated > 0 && totalUpdated > 0 ? ", " : ""}
            {totalUpdated > 0 ? `${totalUpdated} updated` : ""}
            {totalCreated === 0 && totalUpdated === 0 ? "Nothing changed" : ""}
          </p>
        </div>
      </div>

      <Section title="Users" created={results.usersCreated} updated={results.usersUpdated} />
      <Section title="Guides" created={results.guidesCreated} updated={results.guidesUpdated} />
      <Section title="Drivers" created={results.driversCreated} updated={results.driversUpdated} />
      <Section title="Activities" created={results.activitiesCreated} updated={results.activitiesUpdated} />
      {results.packagesCreated && (
        <Section title="Packages" created={results.packagesCreated} updated={results.packagesUpdated ?? []} />
      )}

      {results.errors.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-destructive mb-2">
            Errors ({results.errors.length})
          </h3>
          <ul className="text-sm space-y-1">
            {results.errors.map((err, i) => (
              <li key={i} className="text-destructive">
                ⚠️ {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t pt-4 text-sm text-muted-foreground space-y-1">
        <p>
          All demo passwords are{" "}
          <code className="text-xs bg-muted px-1 rounded">demo1234</code>.
        </p>
        <p>
          Cape Town login:{" "}
          <code className="text-xs bg-muted px-1 rounded">thandiwe@wandermate.demo</code>
        </p>
        <p>
          Johannesburg login:{" "}
          <code className="text-xs bg-muted px-1 rounded">nomsa@wandermate.demo</code>
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  created,
  updated,
}: {
  title: string;
  created: string[];
  updated: string[];
}) {
  const total = created.length + updated.length;
  if (total === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1.5">
        {title}{" "}
        <span className="text-xs font-normal">
          (+{created.length} new{updated.length > 0 ? `, ${updated.length} updated` : ""})
        </span>
      </h3>
      <ul className="text-sm space-y-0.5">
        {created.map((item, i) => (
          <li key={`c-${i}`} className="text-foreground">
            <span className="text-green-600 mr-1">+</span>
            {item}
          </li>
        ))}
        {updated.map((item, i) => (
          <li key={`u-${i}`} className="text-muted-foreground">
            <span className="text-amber-500 mr-1">↻</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
