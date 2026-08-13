import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope } from "@/lib/access";
import NotesApp from "@/components/NotesApp";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await requireUser();
  const [notes, clients] = await Promise.all([
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.client.findMany({
      where: clientScope(user),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <NotesApp
      clients={clients}
      notes={notes.map((n) => ({
        id: n.id,
        folder: n.folder,
        title: n.title,
        body: n.body,
        pinned: n.pinned,
        clientId: n.clientId,
        updatedAt: n.updatedAt.toISOString(),
      }))}
    />
  );
}
