import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NotesApp from "@/components/NotesApp";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await requireUser();
  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <NotesApp
      notes={notes.map((n) => ({
        id: n.id,
        folder: n.folder,
        title: n.title,
        body: n.body,
        pinned: n.pinned,
        updatedAt: n.updatedAt.toISOString(),
      }))}
    />
  );
}
