import Link from "next/link";

export default function NoAccess() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="text-4xl">🔒</div>
      <div className="text-lg font-semibold">Нет доступа к этому разделу</div>
      <p className="text-sm text-zinc-500">Раздел доступен другой роли. Обратитесь к владельцу.</p>
      <Link href="/" className="btn-primary">На главную</Link>
    </div>
  );
}
