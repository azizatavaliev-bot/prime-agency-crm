import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportMetrics } from "@/lib/finance";
import {
  CLIENT_STATUS,
  PAYMENT_KIND,
  PAYMENT_STATUS,
  EXPENSE_CATEGORY,
  EXPENSE_STATUS,
  ROLES,
  BOARDS,
  stagesFor,
} from "@/lib/constants";

const d = (x: Date | null) => (x ? x.toLocaleDateString("ru-RU") : "");
const csv = (rows: (string | number)[][]) =>
  "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");

export async function GET(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "SUPER_ADMIN") return new NextResponse("Нет доступа", { status: 403 });

  const type = new URL(req.url).searchParams.get("type") ?? "payments";
  let rows: (string | number)[][] = [];
  let name = type;

  if (type === "clients") {
    const list = await prisma.client.findMany({ include: { targetolog: true } });
    rows = [
      ["Клиент", "Ниша", "Статус", "Таргетолог", "Средний чек, сом", "Услуги", "Старт", "Источник"],
      ...list.map((c) => [
        c.name,
        c.niche ?? "",
        CLIENT_STATUS[c.status as keyof typeof CLIENT_STATUS],
        c.targetolog?.name ?? "",
        Math.round(c.avgCheck),
        c.services,
        d(c.startedAt),
        c.source ?? "",
      ]),
    ];
    name = "klienty";
  } else if (type === "reports") {
    const list = await prisma.adReport.findMany({ include: { client: true } });
    rows = [
      ["Проект", "С", "По", "Бюджет", "Потрачено", "Заявки", "CPL", "Цель CPL", "CPA", "В цели"],
      ...list.map((r) => {
        const m = reportMetrics(r);
        return [
          r.client.name,
          d(r.periodFrom),
          d(r.periodTo),
          Math.round(r.budget),
          Math.round(r.spent),
          r.leads,
          m.cpl ? Math.round(m.cpl) : "",
          Math.round(r.targetCpl),
          m.cpa ? Math.round(m.cpa) : "",
          m.inTarget === null ? "" : m.inTarget ? "да" : "нет",
        ];
      }),
    ];
    name = "otchety";
  } else if (type === "expenses") {
    const list = await prisma.expense.findMany({ include: { client: true, user: true } });
    rows = [
      ["Расход", "Категория", "Сумма", "Статус", "Дата", "Месяц", "Проект", "Кому", "Ежемесячный", "Комментарий"],
      ...list.map((e) => [
        e.title,
        EXPENSE_CATEGORY[e.category as keyof typeof EXPENSE_CATEGORY],
        Math.round(e.amount),
        EXPENSE_STATUS[e.status as keyof typeof EXPENSE_STATUS],
        d(e.spentAt),
        e.periodMonth,
        e.client?.name ?? "",
        e.user?.name ?? "",
        e.recurring ? "да" : "нет",
        e.comment ?? "",
      ]),
    ];
    name = "rashody";
  } else if (type === "tasks") {
    const list = await prisma.task.findMany({ include: { client: true, assignee: true } });
    rows = [
      ["Задача", "Доска", "Этап", "Клиент", "Ответственный", "Дедлайн", "Выполнена", "Комментарий"],
      ...list.map((t) => [
        t.title,
        BOARDS[t.board as keyof typeof BOARDS] ?? t.board,
        stagesFor(t.board)[t.stage] ?? t.stage,
        t.client?.name ?? "",
        t.assignee?.name ?? "",
        d(t.dueAt),
        t.done ? "да" : "нет",
        t.comment ?? "",
      ]),
    ];
    name = "zadachi";
  } else if (type === "team") {
    const list = await prisma.user.findMany({
      include: { clientsAsTargetolog: true, clientsAsAccount: true, tasks: true },
    });
    rows = [
      [
        "Сотрудник",
        "Email",
        "Роль",
        "Ставка",
        "Тип ставки",
        "Лимит проектов",
        "Проектов",
        "Открытых задач",
        "Активен",
      ],
      ...list.map((u) => [
        u.name,
        u.email,
        ROLES[u.role as keyof typeof ROLES] ?? u.role,
        u.rate ?? "",
        u.rateType === "PERCENT" ? "% от чека" : "фикс",
        u.projectLimit,
        u.role === "TEAM_LEAD" ? u.clientsAsAccount.length : u.clientsAsTargetolog.length,
        u.tasks.filter((t) => !t.done).length,
        u.active ? "да" : "нет",
      ]),
    ];
    name = "komanda";
  } else if (type === "ledger") {
    const [payments, incomes, expenses, transfers] = await Promise.all([
      prisma.payment.findMany({ include: { client: true, account: true } }),
      prisma.income.findMany({ include: { account: true } }),
      prisma.expense.findMany({ include: { account: true } }),
      prisma.transfer.findMany({ include: { fromAccount: true, toAccount: true } }),
    ]);
    const ops: (string | number)[][] = [
      ...payments.map((p) => [
        d(p.paidAt ?? p.dueAt),
        "Оплата клиента",
        p.client.name,
        Math.round(p.amount),
        p.account?.name ?? "",
        PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS],
      ]),
      ...incomes.map((i) => [
        d(i.receivedAt),
        "Приход",
        i.title,
        Math.round(i.amount),
        i.account?.name ?? "",
        "Оплачено",
      ]),
      ...expenses.map((e) => [
        d(e.spentAt),
        "Расход",
        e.title,
        -Math.round(e.amount),
        e.account?.name ?? "",
        EXPENSE_STATUS[e.status as keyof typeof EXPENSE_STATUS],
      ]),
      ...transfers.map((t) => [
        d(t.madeAt),
        "Перевод",
        `${t.fromAccount.name} → ${t.toAccount.name}`,
        Math.round(t.amount),
        t.fromAccount.name,
        "Проведён",
      ]),
    ];
    rows = [["Дата", "Тип", "Операция", "Сумма", "Счёт", "Статус"], ...ops];
    name = "zhurnal-operaciy";
  } else {
    const list = await prisma.payment.findMany({ include: { client: true } });
    rows = [
      ["Клиент", "Тип", "Сумма", "Статус", "План", "Оплачено", "Месяц", "Исполнителю", "Резерв", "Владельцу"],
      ...list.map((p) => [
        p.client.name,
        PAYMENT_KIND[p.kind as keyof typeof PAYMENT_KIND],
        Math.round(p.amount),
        PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS],
        d(p.dueAt),
        d(p.paidAt),
        p.periodMonth,
        Math.round(p.execShare),
        Math.round(p.reserve),
        Math.round(p.ownerNet),
      ]),
    ];
    name = "oplaty";
  }

  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prime-${name}.csv"`,
    },
  });
}
