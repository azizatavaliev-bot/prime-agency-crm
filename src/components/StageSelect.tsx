"use client";

export default function StageSelect({
  stages,
  value,
}: {
  stages: [string, string][];
  value: string;
}) {
  return (
    <select
      name="stage"
      defaultValue={value}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600"
    >
      {stages.map(([k, v]) => (
        <option key={k} value={k}>
          → {v}
        </option>
      ))}
    </select>
  );
}
