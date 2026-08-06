--
-- PostgreSQL database dump
--

\restrict 9JPpmHLTXFi7ccjEbQraH2nqAHsL5LSgR5asSw3OA04t6O0qEaiVwGx4XQgZAcT

-- Dumped from database version 17.10 (Homebrew)
-- Dumped by pg_dump version 17.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'CASH'::text NOT NULL,
    opening double precision DEFAULT 0 NOT NULL,
    "minBalance" double precision,
    active boolean DEFAULT true NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Account" OWNER TO apple2;

--
-- Name: AdReport; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."AdReport" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "authorId" text,
    "periodFrom" timestamp(3) without time zone NOT NULL,
    "periodTo" timestamp(3) without time zone NOT NULL,
    budget double precision DEFAULT 0 NOT NULL,
    spent double precision DEFAULT 0 NOT NULL,
    leads integer DEFAULT 0 NOT NULL,
    actions integer DEFAULT 0 NOT NULL,
    "targetCpl" double precision NOT NULL,
    "targetCpa" double precision,
    bundles text,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdReport" OWNER TO apple2;

--
-- Name: BotSession; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."BotSession" (
    id text NOT NULL,
    "chatId" text NOT NULL,
    flow text NOT NULL,
    step text NOT NULL,
    data text DEFAULT '{}'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BotSession" OWNER TO apple2;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    name text NOT NULL,
    niche text,
    contact text,
    source text,
    status text DEFAULT 'TEST'::text NOT NULL,
    "avgCheck" double precision DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "churnedAt" timestamp(3) without time zone,
    services text DEFAULT ''::text NOT NULL,
    "adAccount" text,
    "nextPaymentAt" timestamp(3) without time zone,
    notes text,
    "targetologId" text,
    "accountId" text,
    "paymentDay" integer,
    "contractStart" timestamp(3) without time zone,
    "contractEnd" timestamp(3) without time zone,
    "profitPercent" double precision,
    goal text,
    agreement text,
    "targetCpl" double precision,
    "sitePrice" double precision,
    "botPrice" double precision,
    "videoPrice" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Client" OWNER TO apple2;

--
-- Name: ClientLink; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."ClientLink" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    type text DEFAULT 'OTHER'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClientLink" OWNER TO apple2;

--
-- Name: ClientMember; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."ClientMember" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    "rateType" text DEFAULT 'PERCENT'::text NOT NULL,
    rate double precision DEFAULT 0 NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClientMember" OWNER TO apple2;

--
-- Name: ClientSnapshot; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."ClientSnapshot" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    type text NOT NULL,
    "takenAt" timestamp(3) without time zone NOT NULL,
    leads integer,
    cpl double precision,
    "adSpend" double precision,
    revenue double precision,
    conversion double precision,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClientSnapshot" OWNER TO apple2;

--
-- Name: DictItem; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."DictItem" (
    id text NOT NULL,
    type text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    color text,
    hint text,
    "order" integer DEFAULT 100 NOT NULL,
    builtin boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public."DictItem" OWNER TO apple2;

--
-- Name: Expense; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'OTHER'::text NOT NULL,
    amount double precision NOT NULL,
    status text DEFAULT 'PAID'::text NOT NULL,
    method text DEFAULT 'TRANSFER'::text NOT NULL,
    "spentAt" timestamp(3) without time zone NOT NULL,
    "periodMonth" text NOT NULL,
    recurring boolean DEFAULT false NOT NULL,
    comment text,
    "clientId" text,
    "userId" text,
    "accountId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Expense" OWNER TO apple2;

--
-- Name: Goal; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Goal" (
    id text NOT NULL,
    "clientId" text,
    month text NOT NULL,
    metric text NOT NULL,
    target double precision NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Goal" OWNER TO apple2;

--
-- Name: Income; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Income" (
    id text NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'OTHER'::text NOT NULL,
    amount double precision NOT NULL,
    "receivedAt" timestamp(3) without time zone NOT NULL,
    "periodMonth" text NOT NULL,
    comment text,
    "accountId" text,
    "clientId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Income" OWNER TO apple2;

--
-- Name: MarketingReport; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."MarketingReport" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    channel text DEFAULT 'TARGET'::text NOT NULL,
    source text,
    direction text,
    spend double precision DEFAULT 0 NOT NULL,
    currency text DEFAULT 'KGS'::text NOT NULL,
    "usdRate" double precision,
    leads integer DEFAULT 0 NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    inquiries integer DEFAULT 0 NOT NULL,
    notes text,
    "authorId" text,
    "clientId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketingReport" OWNER TO apple2;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read boolean DEFAULT false NOT NULL,
    "dedupeKey" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO apple2;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    kind text DEFAULT 'SUBSCRIPTION'::text NOT NULL,
    amount double precision NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    method text DEFAULT 'TRANSFER'::text NOT NULL,
    "dueAt" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "periodMonth" text NOT NULL,
    comment text,
    "execShare" double precision DEFAULT 0 NOT NULL,
    reserve double precision DEFAULT 0 NOT NULL,
    "ownerNet" double precision DEFAULT 0 NOT NULL,
    "execUserId" text,
    "accountId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payment" OWNER TO apple2;

--
-- Name: Regulation; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Regulation" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    color text DEFAULT '#6d5efc'::text NOT NULL,
    items text DEFAULT '[]'::text NOT NULL,
    notes text,
    "ownerId" text,
    assignees text DEFAULT ''::text NOT NULL,
    "order" integer DEFAULT 100 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Regulation" OWNER TO apple2;

--
-- Name: Setting; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Setting" (
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public."Setting" OWNER TO apple2;

--
-- Name: Task; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    title text NOT NULL,
    board text DEFAULT 'TARGET'::text NOT NULL,
    stage text DEFAULT 'BRIEF'::text NOT NULL,
    "clientId" text,
    "assigneeId" text,
    "dueAt" timestamp(3) without time zone,
    comment text,
    done boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "archivedAt" timestamp(3) without time zone,
    "doneAt" timestamp(3) without time zone,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    recurrence text,
    "recurrenceParentId" text,
    "startedAt" timestamp(3) without time zone,
    tags text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."Task" OWNER TO apple2;

--
-- Name: TaskChecklistItem; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."TaskChecklistItem" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    text text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskChecklistItem" OWNER TO apple2;

--
-- Name: TaskComment; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."TaskComment" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "userId" text,
    text text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskComment" OWNER TO apple2;

--
-- Name: TaskTemplate; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."TaskTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    hint text,
    board text DEFAULT 'TARGET'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskTemplate" OWNER TO apple2;

--
-- Name: TaskTemplateItem; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."TaskTemplateItem" (
    id text NOT NULL,
    "templateId" text NOT NULL,
    title text NOT NULL,
    stage text DEFAULT 'BRIEF'::text NOT NULL,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    "dueDays" integer,
    checklist text DEFAULT ''::text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."TaskTemplateItem" OWNER TO apple2;

--
-- Name: Transfer; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."Transfer" (
    id text NOT NULL,
    "fromAccountId" text NOT NULL,
    "toAccountId" text NOT NULL,
    amount double precision NOT NULL,
    "madeAt" timestamp(3) without time zone NOT NULL,
    "periodMonth" text NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Transfer" OWNER TO apple2;

--
-- Name: User; Type: TABLE; Schema: public; Owner: apple2
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    rate double precision,
    "rateType" text DEFAULT 'PERCENT'::text NOT NULL,
    "projectLimit" integer DEFAULT 5 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    phone text,
    "tgChatId" text,
    "tgLinkCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO apple2;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Account" (id, name, kind, opening, "minBalance", active, note, "createdAt") FROM stdin;
cmsf0tfyw0006ucd5m20i6hh3	Касса (наличные)	CASH	120000	20000	t	деньги в офисе	2026-08-04 18:58:01.88
cmsf0tfyw0007ucd5tcp769s4	Оптима Банк	BANK	150000	50000	t	основной счёт агентства	2026-08-04 18:58:01.881
cmsf0tfyx0008ucd5zk8koi7t	Карта Мбанк	CARD	90000	10000	t	подписки и реклама	2026-08-04 18:58:01.882
\.


--
-- Data for Name: AdReport; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."AdReport" (id, "clientId", "authorId", "periodFrom", "periodTo", budget, spent, leads, actions, "targetCpl", "targetCpa", bundles, comment, "createdAt") FROM stdin;
cmsf0tg0r005nucd5rx2e5wit	cmsf0tfzr002fucd5alxgun7k	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-07 18:58:01.947	2026-07-14 18:58:01.947	15000	16500	21	6	500	1800	тест связок	\N	2026-08-04 18:58:01.947
cmsf0tg0s005pucd5opj9ymfq	cmsf0tfzr002fucd5alxgun7k	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-14 18:58:01.948	2026-07-21 18:58:01.948	15000	15000	24	7	500	1800	тест связок	\N	2026-08-04 18:58:01.948
cmsf0tg0t005rucd5ywhgakq8	cmsf0tfzr002fucd5alxgun7k	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-21 18:58:01.948	2026-07-28 18:58:01.948	15000	13500	27	8	500	1800	тест связок	\N	2026-08-04 18:58:01.949
cmsf0tg0t005tucd5ujd6epev	cmsf0tfzr002fucd5alxgun7k	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-28 18:58:01.949	2026-08-04 18:58:01.949	15000	12000	30	9	500	1800	2 связки в масштабе, 3 в тесте	\N	2026-08-04 18:58:01.95
cmsf0tg0u005vucd57pvq6474	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-07 18:58:01.95	2026-07-14 18:58:01.95	15000	16500	21	6	500	1800	тест связок	\N	2026-08-04 18:58:01.95
cmsf0tg0v005xucd5j8lypxlv	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-14 18:58:01.95	2026-07-21 18:58:01.95	15000	15000	24	7	500	1800	тест связок	\N	2026-08-04 18:58:01.951
cmsf0tg0v005zucd58ejgdxk8	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-21 18:58:01.951	2026-07-28 18:58:01.951	15000	13500	27	8	500	1800	тест связок	\N	2026-08-04 18:58:01.952
cmsf0tg0w0061ucd5gowijki4	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-28 18:58:01.952	2026-08-04 18:58:01.952	15000	12000	30	9	500	1800	2 связки в масштабе, 3 в тесте	\N	2026-08-04 18:58:01.952
cmsf0tg0w0063ucd5a6bbvhrj	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-07 18:58:01.952	2026-07-14 18:58:01.952	15000	16500	21	6	500	1800	тест связок	\N	2026-08-04 18:58:01.953
cmsf0tg0w0065ucd53p7cqgq2	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-14 18:58:01.952	2026-07-21 18:58:01.952	15000	15000	24	7	500	1800	тест связок	\N	2026-08-04 18:58:01.953
cmsf0tg0x0067ucd5xkoys7sr	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-21 18:58:01.953	2026-07-28 18:58:01.953	15000	13500	27	8	500	1800	тест связок	\N	2026-08-04 18:58:01.953
cmsf0tg0x0069ucd54gjb03cx	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-28 18:58:01.953	2026-08-04 18:58:01.953	15000	12000	30	9	500	1800	2 связки в масштабе, 3 в тесте	\N	2026-08-04 18:58:01.954
cmsf0tg0y006bucd5ve8onnoe	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-07 18:58:01.954	2026-07-14 18:58:01.954	15000	16500	21	6	500	1800	тест связок	\N	2026-08-04 18:58:01.954
cmsf0tg0y006ducd5ogy8l8vg	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-14 18:58:01.954	2026-07-21 18:58:01.954	15000	15000	24	7	500	1800	тест связок	\N	2026-08-04 18:58:01.955
cmsf0tg0z006fucd54r6bzbrt	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-21 18:58:01.954	2026-07-28 18:58:01.954	15000	13500	27	8	500	1800	тест связок	\N	2026-08-04 18:58:01.955
cmsf0tg0z006hucd5vgyyj68k	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyr0001ucd5wrqzuxmq	2026-07-28 18:58:01.955	2026-08-04 18:58:01.955	15000	12000	14	4	500	1800	2 связки в масштабе, 3 в тесте	\N	2026-08-04 18:58:01.955
cmsf0tg0z006jucd5mthl6aw6	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0002ucd5scrb784u	2026-07-07 18:58:01.955	2026-07-14 18:58:01.955	15000	16500	21	6	500	1800	тест связок	\N	2026-08-04 18:58:01.956
cmsf0tg10006lucd5vownjvuh	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0002ucd5scrb784u	2026-07-14 18:58:01.956	2026-07-21 18:58:01.956	15000	15000	24	7	500	1800	тест связок	\N	2026-08-04 18:58:01.956
cmsf0tg10006nucd5gl001be2	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0002ucd5scrb784u	2026-07-21 18:58:01.956	2026-07-28 18:58:01.956	15000	13500	27	8	500	1800	тест связок	\N	2026-08-04 18:58:01.957
cmsf0tg11006pucd5jx7hmgir	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0002ucd5scrb784u	2026-07-28 18:58:01.957	2026-08-04 18:58:01.957	15000	12000	30	9	500	1800	2 связки в масштабе, 3 в тесте	\N	2026-08-04 18:58:01.957
cmsf0tg12006rucd586ni0613	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0002ucd5scrb784u	2026-07-07 18:58:01.958	2026-07-14 18:58:01.958	15000	16500	21	6	500	1800	тест связок	\N	2026-08-04 18:58:01.958
cmsf0tg12006tucd5l4m4hrps	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0002ucd5scrb784u	2026-07-14 18:58:01.958	2026-07-21 18:58:01.958	15000	15000	24	7	500	1800	тест связок	\N	2026-08-04 18:58:01.959
cmsf0tg13006vucd56lo4uhqm	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0002ucd5scrb784u	2026-07-21 18:58:01.959	2026-07-28 18:58:01.959	15000	13500	27	8	500	1800	тест связок	\N	2026-08-04 18:58:01.96
cmsf0tg14006xucd5ijs0usmt	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0002ucd5scrb784u	2026-07-28 18:58:01.96	2026-08-04 18:58:01.96	15000	12000	30	9	500	1800	2 связки в масштабе, 3 в тесте	\N	2026-08-04 18:58:01.96
\.


--
-- Data for Name: BotSession; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."BotSession" (id, "chatId", flow, step, data, "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Client" (id, name, niche, contact, source, status, "avgCheck", "startedAt", "churnedAt", services, "adAccount", "nextPaymentAt", notes, "targetologId", "accountId", "paymentDay", "contractStart", "contractEnd", "profitPercent", goal, agreement, "targetCpl", "sitePrice", "botPrice", "videoPrice", "createdAt") FROM stdin;
cmsf0tfzr002fucd5alxgun7k	Стоматология «Ак Тиш»	стоматология	WhatsApp +996 555 000 000	рекомендация	TEST	35000	2026-07-05 18:58:01.911	\N	TARGET	кабинет клиента	2026-08-08 18:58:01.911	\N	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfys0003ucd57zkaeizj	5	2026-07-05 18:58:01.911	2027-07-05 18:58:01.911	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	\N	\N	2026-08-04 18:58:01.912
cmsf0tfzs002hucd5y6pfh4ra	Кофейня Sierra Bishkek	кофейни	WhatsApp +996 555 000 000	рекомендация	ACTIVE	45000	2026-04-06 18:58:01.912	\N	TARGET,VIDEO	кабинет клиента	2026-08-08 18:58:01.912	\N	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfys0003ucd57zkaeizj	10	2026-04-06 18:58:01.912	2027-04-06 18:58:01.912	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	\N	8000	2026-08-04 18:58:01.913
cmsf0tfzt002jucd5s8tmjkbo	Автосервис «Мотор+»	автосервис	WhatsApp +996 555 000 000	рекомендация	ACTIVE	40000	2026-05-06 18:58:01.913	\N	TARGET	кабинет клиента	2026-08-08 18:58:01.913	\N	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfys0003ucd57zkaeizj	7	2026-05-06 18:58:01.913	2027-05-06 18:58:01.913	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	\N	\N	2026-08-04 18:58:01.914
cmsf0tfzu002lucd5jekix2o5	Клиника «Медикал Плюс»	медицина	WhatsApp +996 555 000 000	рекомендация	RISK	50000	2026-03-07 18:58:01.914	\N	TARGET,SITE	кабинет клиента	2026-08-08 18:58:01.914	\N	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfys0003ucd57zkaeizj	15	2026-03-07 18:58:01.914	2027-03-07 18:58:01.914	15	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	25000	\N	\N	2026-08-04 18:58:01.914
cmsf0tfzv002nucd5wtn54531	Школа English Time	образование	WhatsApp +996 555 000 000	рекомендация	ACTIVE	38000	2026-01-16 18:58:01.914	\N	TARGET,BOT	кабинет клиента	2026-08-08 18:58:01.914	\N	cmsf0tfys0002ucd5scrb784u	cmsf0tfys0003ucd57zkaeizj	3	2026-01-16 18:58:01.914	2027-01-16 18:58:01.914	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	18000	\N	2026-08-04 18:58:01.915
cmsf0tfzw002pucd5b6fo2tt7	Мебель «Уют KG»	мебель	WhatsApp +996 555 000 000	рекомендация	ACTIVE	42000	2026-05-21 18:58:01.916	\N	TARGET	кабинет клиента	2026-08-08 18:58:01.916	\N	cmsf0tfys0002ucd5scrb784u	cmsf0tfys0003ucd57zkaeizj	20	2026-05-21 18:58:01.916	2027-05-21 18:58:01.916	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	\N	\N	2026-08-04 18:58:01.917
cmsf0tfzy002rucd5iaxzi6y4	Фитнес «Атлет»	фитнес	WhatsApp +996 555 000 000	рекомендация	PAUSED	35000	2025-12-07 18:58:01.917	\N	TARGET	кабинет клиента	2026-08-08 18:58:01.917	\N	cmsf0tfys0002ucd5scrb784u	cmsf0tfys0003ucd57zkaeizj	25	2025-12-07 18:58:01.917	2026-12-07 18:58:01.917	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	\N	\N	2026-08-04 18:58:01.918
cmsf0tfzz002tucd5u6781wba	Салон «Жаннат Beauty»	бьюти	WhatsApp +996 555 000 000	рекомендация	CHURNED	30000	2025-10-08 18:58:01.918	2026-07-15 18:58:01.918	TARGET	кабинет клиента	\N	\N	cmsf0tfys0002ucd5scrb784u	cmsf0tfys0003ucd57zkaeizj	1	2025-10-08 18:58:01.918	2026-07-15 18:58:01.918	\N	20 заявок в месяц не дороже 500 сом	Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю	500	\N	\N	\N	2026-08-04 18:58:01.919
\.


--
-- Data for Name: ClientLink; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."ClientLink" (id, "clientId", title, url, type, "createdAt") FROM stdin;
cmsgzxc520005uc9hw50bm23w	cmsf0tfzr002fucd5alxgun7k	Кабинет Facebook	https://business.facebook.com/adsmanager	ADS	2026-08-06 04:08:36.278
cmsgzxc580007uc9hrjt1am61	cmsf0tfzr002fucd5alxgun7k	Таблица по заявкам	https://docs.google.com/spreadsheets/d/x	SHEETS	2026-08-06 04:08:36.284
\.


--
-- Data for Name: ClientMember; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."ClientMember" (id, "clientId", "userId", role, "rateType", rate, note, "createdAt") FROM stdin;
cmsf0tfzz002vucd53i94gz7g	cmsf0tfzr002fucd5alxgun7k	cmsf0tfyr0001ucd5wrqzuxmq	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.92
cmsf0tg00002xucd5civylzna	cmsf0tfzr002fucd5alxgun7k	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.921
cmsf0tg01002zucd5z34h6deu	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyr0001ucd5wrqzuxmq	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.922
cmsf0tg020031ucd5vsaewi29	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.922
cmsf0tg020033ucd5zqjkngtp	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfyr0001ucd5wrqzuxmq	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.922
cmsf0tg020035ucd5uljl24na	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.923
cmsf0tg030037ucd5hwkzzy7w	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyr0001ucd5wrqzuxmq	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.923
cmsf0tg030039ucd5igbi86iv	cmsf0tfzu002lucd5jekix2o5	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.923
cmsf0tg03003bucd5sthv17pu	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0002ucd5scrb784u	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.924
cmsf0tg04003ducd5tqzyxmoe	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.924
cmsf0tg05003fucd5ap5kral9	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0002ucd5scrb784u	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.925
cmsf0tg05003hucd5uuods9e7	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.926
cmsf0tg06003jucd55sz4dtir	cmsf0tfzy002rucd5iaxzi6y4	cmsf0tfys0002ucd5scrb784u	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.926
cmsf0tg06003lucd51se0y94z	cmsf0tfzy002rucd5iaxzi6y4	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.927
cmsf0tg07003nucd5pcsidet5	cmsf0tfzz002tucd5u6781wba	cmsf0tfys0002ucd5scrb784u	TARGETOLOG	PERCENT	34	\N	2026-08-04 18:58:01.927
cmsf0tg07003pucd5itvx523x	cmsf0tfzz002tucd5u6781wba	cmsf0tfys0003ucd57zkaeizj	ACCOUNT	FIXED	3000	ведёт переписку и оплаты	2026-08-04 18:58:01.927
\.


--
-- Data for Name: ClientSnapshot; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."ClientSnapshot" (id, "clientId", type, "takenAt", leads, cpl, "adSpend", revenue, conversion, note, "createdAt") FROM stdin;
cmsgzxc4k0001uc9him6uth0n	cmsf0tfzr002fucd5alxgun7k	POINT_A	2026-05-07 00:00:00	20	800	16000	300000	12	на старте работали сами	2026-08-06 04:08:36.26
cmsgzxc4v0003uc9h8v4kxglj	cmsf0tfzr002fucd5alxgun7k	POINT_B	2026-08-01 00:00:00	65	420	27300	900000	18	после 3 месяцев	2026-08-06 04:08:36.271
\.


--
-- Data for Name: DictItem; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."DictItem" (id, type, key, name, color, hint, "order", builtin, active) FROM stdin;
cmsf0tfyx0009ucd5845wtuqd	CLIENT_STATUS	TEST	Тест	bg-sky-100 text-sky-700 border-sky-200	\N	10	t	t
cmsf0tfyy000aucd5h64fub18	CLIENT_STATUS	ACTIVE	Ведётся	bg-emerald-100 text-emerald-700 border-emerald-200	\N	20	t	t
cmsf0tfyz000bucd5y6yduc9q	CLIENT_STATUS	RISK	Риск оттока	bg-amber-100 text-amber-700 border-amber-200	\N	30	t	t
cmsf0tfyz000cucd5nrhxh38b	CLIENT_STATUS	PAUSED	Приостановлен	bg-zinc-100 text-zinc-700 border-zinc-200	\N	40	t	t
cmsf0tfz0000ducd5dragb44g	CLIENT_STATUS	CHURNED	Отток	bg-red-100 text-red-700 border-red-200	\N	50	t	t
cmsf0tfz0000eucd56rzkh5a6	SERVICE	TARGET	Таргет	\N	\N	10	t	t
cmsf0tfz1000fucd5sa8fpv3u	SERVICE	SITE	Сайт	\N	\N	20	t	t
cmsf0tfz1000gucd5qzjh5wzu	SERVICE	BOT	Чат-бот	\N	\N	30	t	t
cmsf0tfz2000hucd5scjzcvif	SERVICE	VIDEO	Монтаж	\N	\N	40	t	t
cmsf0tfz2000iucd588uxwz8r	SOURCE	REFERRAL	Рекомендация	\N	\N	10	t	t
cmsf0tfz2000jucd5rpihsd1j	SOURCE	INSTAGRAM	Instagram	\N	\N	20	t	t
cmsf0tfz3000kucd5h8en3lws	SOURCE	COLD	Холодный обзвон	\N	\N	30	t	t
cmsf0tfz3000lucd5gzrew533	SOURCE	SITE_FORM	Заявка с сайта	\N	\N	40	t	t
cmsf0tfz3000mucd5aw26uexy	NICHE	MEDICAL	Медицина	\N	\N	10	t	t
cmsf0tfz4000nucd5eefvlk73	NICHE	FOOD	Еда и кофейни	\N	\N	20	t	t
cmsf0tfz4000oucd56edv4tpw	NICHE	AUTO	Авто	\N	\N	30	t	t
cmsf0tfz4000pucd5oh5xhbdn	NICHE	EDU	Образование	\N	\N	40	t	t
cmsf0tfz5000qucd5a03fhwey	NICHE	BEAUTY	Бьюти	\N	\N	50	t	t
cmsf0tfz5000rucd5u3dmject	NICHE	GOODS	Товары	\N	\N	60	t	t
cmsf0tfz5000sucd5zpuqoz73	PAYMENT_KIND	SUBSCRIPTION	Абонплата	\N	\N	10	t	t
cmsf0tfz5000tucd5ufarjcwq	PAYMENT_KIND	SITE	Сайт	\N	\N	20	t	t
cmsf0tfz6000uucd5malr5mis	PAYMENT_KIND	BOT	Чат-бот	\N	\N	30	t	t
cmsf0tfz6000vucd5avuv0me7	PAYMENT_KIND	VIDEO	Монтаж	\N	\N	40	t	t
cmsf0tfz6000wucd5ukpoi1g8	PAYMENT_METHOD	TRANSFER	Перевод	\N	\N	10	t	t
cmsf0tfz7000xucd505sv2f9r	PAYMENT_METHOD	CASH	Наличные	\N	\N	20	t	t
cmsf0tfz7000yucd5iqzlsi0h	PAYMENT_METHOD	INVOICE	Счёт	\N	\N	30	t	t
cmsf0tfz8000zucd5apxjgea8	EXPENSE_CATEGORY	ADS	Реклама за наш счёт	\N	\N	10	t	t
cmsf0tfz80010ucd53qrw12e4	EXPENSE_CATEGORY	SALARY	Выплаты команде	\N	\N	20	t	t
cmsf0tfz80011ucd5mxtsimxd	EXPENSE_CATEGORY	SUBSCRIPTION	Сервисы и подписки	\N	\N	30	t	t
cmsf0tfz90012ucd5eb8l2zpq	EXPENSE_CATEGORY	OFFICE	Офис и связь	\N	\N	40	t	t
cmsf0tfz90013ucd52q8128g5	EXPENSE_CATEGORY	TAX	Налоги и комиссии	\N	\N	50	t	t
cmsf0tfz90014ucd5v79oomsm	EXPENSE_CATEGORY	EDU	Обучение	\N	\N	60	t	t
cmsf0tfza0015ucd5nz1c9xly	EXPENSE_CATEGORY	OTHER	Прочее	\N	\N	70	t	t
cmsf0tfza0016ucd5e8b6ui8n	INCOME_CATEGORY	CLIENT	Оплата клиента	\N	\N	10	t	t
cmsf0tfza0017ucd5eka02pmw	INCOME_CATEGORY	REFUND	Возврат средств	\N	\N	20	t	t
cmsf0tfzb0018ucd5smnxx2kj	INCOME_CATEGORY	PARTNER	Партнёрские	\N	\N	30	t	t
cmsf0tfzb0019ucd5cs89gx1y	INCOME_CATEGORY	OWN	Внесение своих	\N	\N	40	t	t
cmsf0tfzb001aucd51bm383ax	INCOME_CATEGORY	OTHER	Прочее	\N	\N	50	t	t
cmsf0tfzc001bucd5p7e0uolx	ACCOUNT_KIND	CASH	Наличные	\N	\N	10	t	t
cmsf0tfzc001cucd5tlhj3xm5	ACCOUNT_KIND	BANK	Банковский счёт	\N	\N	20	t	t
cmsf0tfzd001ducd5vkeby5lw	ACCOUNT_KIND	CARD	Карта	\N	\N	30	t	t
cmsf0tfzd001eucd5ygpl54vb	STAGE_TARGET	BRIEF	Бриф	\N	\N	10	t	t
cmsf0tfzd001fucd54vcivv1o	STAGE_TARGET	HYPOTHESES	Гипотезы / ТЗ	\N	\N	20	t	t
cmsf0tfze001gucd5tn9n97rq	STAGE_TARGET	SHOOTING	Клиент снимает видео	\N	\N	30	t	t
cmsf0tfze001hucd5t019vxft	STAGE_TARGET	LAUNCH	Запуск теста	\N	\N	40	t	t
cmsf0tfze001iucd5l8znbxmg	STAGE_TARGET	FILTER	Отсев	\N	\N	50	t	t
cmsf0tfzf001jucd5fmzzyf6g	STAGE_TARGET	SCALE	Масштаб	\N	\N	60	t	t
cmsf0tfzf001kucd5p1b1ywds	STAGE_TARGET	UPDATE	Обновление	\N	\N	70	t	t
cmsf0tfzg001lucd5efxd45ia	STAGE_DEV	BRIEF	Бриф	\N	\N	10	t	t
cmsf0tfzg001mucd52mnxii03	STAGE_DEV	DESIGN	Прототип	\N	\N	20	t	t
cmsf0tfzh001nucd59ncn5et6	STAGE_DEV	DEV	Разработка	\N	\N	30	t	t
cmsf0tfzh001oucd5potjpfbe	STAGE_DEV	REVIEW	Правки	\N	\N	40	t	t
cmsf0tfzi001pucd51l92ymbg	STAGE_DEV	DONE	Сдано	\N	\N	50	t	t
cmsf0tfzi001qucd5h271e9tz	STAGE_VIDEO	BRIEF	Материалы	\N	\N	10	t	t
cmsf0tfzi001rucd5qcdzzybq	STAGE_VIDEO	EDIT	Монтаж	\N	\N	20	t	t
cmsf0tfzi001sucd55z7roarq	STAGE_VIDEO	REVIEW	Правки	\N	\N	30	t	t
cmsf0tfzj001tucd57v2gp1og	STAGE_VIDEO	DONE	Сдано	\N	\N	40	t	t
\.


--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Expense" (id, title, category, amount, status, method, "spentAt", "periodMonth", recurring, comment, "clientId", "userId", "accountId", "createdAt") FROM stdin;
cmsf0tg1b007jucd5mojsbrrk	Аренда офиса	OFFICE	25000	PAID	CASH	2026-05-09 18:00:00	2026-05	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.967
cmsf0tg1c007lucd5ufgbc56v	Интернет и связь	OFFICE	3500	PAID	CASH	2026-05-09 18:00:00	2026-05	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.968
cmsf0tg1c007nucd54irtnsrd	Подписка на сервис аналитики	SUBSCRIPTION	4200	PAID	CARD	2026-05-09 18:00:00	2026-05	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.969
cmsf0tg1d007pucd513fln0yu	Хостинг и домены	SUBSCRIPTION	2800	PAID	CARD	2026-05-09 18:00:00	2026-05	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.969
cmsf0tg1d007rucd5c2gan7ig	Налоги и комиссии банка	TAX	12000	PAID	CARD	2026-05-09 18:00:00	2026-05	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.97
cmsf0tg1e007tucd5xx9n2irf	Аренда офиса	OFFICE	25000	PAID	CASH	2026-06-09 18:00:00	2026-06	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.97
cmsf0tg1e007vucd57whqfn2q	Интернет и связь	OFFICE	3500	PAID	CASH	2026-06-09 18:00:00	2026-06	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.971
cmsf0tg1f007xucd5qev2p92c	Подписка на сервис аналитики	SUBSCRIPTION	4200	PAID	CARD	2026-06-09 18:00:00	2026-06	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.971
cmsf0tg1f007zucd5b5pdw5a2	Хостинг и домены	SUBSCRIPTION	2800	PAID	CARD	2026-06-09 18:00:00	2026-06	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.972
cmsf0tg1g0081ucd57w9k2mos	Налоги и комиссии банка	TAX	12000	PAID	CARD	2026-06-09 18:00:00	2026-06	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.972
cmsf0tg1g0083ucd5jw211xr2	Аренда офиса	OFFICE	25000	PAID	CASH	2026-07-09 18:00:00	2026-07	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.972
cmsf0tg1g0085ucd53hvyzf1y	Интернет и связь	OFFICE	3500	PAID	CASH	2026-07-09 18:00:00	2026-07	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.973
cmsf0tg1h0087ucd5cz6u8gv5	Подписка на сервис аналитики	SUBSCRIPTION	4200	PAID	CARD	2026-07-09 18:00:00	2026-07	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.973
cmsf0tg1h0089ucd5b3ands5l	Хостинг и домены	SUBSCRIPTION	2800	PAID	CARD	2026-07-09 18:00:00	2026-07	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.974
cmsf0tg1i008bucd5vmlpv7cy	Налоги и комиссии банка	TAX	12000	PAID	CARD	2026-07-09 18:00:00	2026-07	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.975
cmsf0tg1j008ducd5233y3e0z	Обучение по таргету	EDU	15000	PAID	CARD	2026-07-09 18:00:00	2026-07	f	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.975
cmsf0tg1j008fucd5nx5oh6ej	Аренда офиса	OFFICE	25000	PAID	CASH	2026-08-09 18:00:00	2026-08	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.976
cmsf0tg1k008hucd5v12mls4r	Интернет и связь	OFFICE	3500	PAID	CASH	2026-08-09 18:00:00	2026-08	t	\N	\N	\N	cmsf0tfyw0006ucd5m20i6hh3	2026-08-04 18:58:01.976
cmsf0tg1l008jucd584aa7rcz	Подписка на сервис аналитики	SUBSCRIPTION	4200	PAID	CARD	2026-08-09 18:00:00	2026-08	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.977
cmsf0tg1l008lucd5w89fm7ic	Хостинг и домены	SUBSCRIPTION	2800	PAID	CARD	2026-08-09 18:00:00	2026-08	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.977
cmsf0tg1l008nucd5wq5tfjgd	Налоги и комиссии банка	TAX	12000	PLANNED	CARD	2026-08-09 18:00:00	2026-08	t	\N	\N	\N	cmsf0tfyx0008ucd5zk8koi7t	2026-08-04 18:58:01.978
cmsf0tg1m008pucd50uhao7xn	Выплата: Айбек Осмонов	SALARY	54400	PAID	TRANSFER	2026-07-27 18:00:00	2026-07	f	доля с проектов за месяц	\N	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.978
cmsf0tg1n008rucd563xgpams	Выплата: Нурзада Асанова	SALARY	39100	PAID	TRANSFER	2026-07-27 18:00:00	2026-07	f	доля с проектов за месяц	\N	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.979
cmsf0tg1o008tucd5piiv3jg8	Реклама за наш счёт (тестовый бюджет)	ADS	8000	PAID	CARD	2026-07-26 18:58:01.979	2026-07	f	первый тест перед стартом абонплаты	cmsf0tfzr002fucd5alxgun7k	\N	\N	2026-08-04 18:58:01.98
\.


--
-- Data for Name: Goal; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Goal" (id, "clientId", month, metric, target, comment, "createdAt") FROM stdin;
cmsf0tg07003rucd5y9el0jgw	\N	2026-08	REVENUE	350000	\N	2026-08-04 18:58:01.928
cmsf0tg08003tucd5p75cvvyr	\N	2026-08	PROFIT	180000	\N	2026-08-04 18:58:01.929
cmsf0tg09003vucd55d6gttvd	\N	2026-08	LEADS	200	\N	2026-08-04 18:58:01.929
cmsf0tg09003xucd5sn2kzf4o	\N	2026-08	CPL	500	\N	2026-08-04 18:58:01.93
\.


--
-- Data for Name: Income; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Income" (id, title, category, amount, "receivedAt", "periodMonth", comment, "accountId", "clientId", "createdAt") FROM stdin;
cmsf0tfzk001vucd5xi6unk10	Партнёрская комиссия за рекомендацию	PARTNER	15000	2026-08-03 18:58:01.903	2026-08	привёл клиента другому агентству	cmsf0tfyw0007ucd5tcp769s4	\N	2026-08-04 18:58:01.904
cmsf0tfzl001xucd5g2g5gc39	Возврат за неиспользованный сервис	REFUND	4200	2026-07-21 18:58:01.905	2026-07	\N	cmsf0tfyx0008ucd5zk8koi7t	\N	2026-08-04 18:58:01.906
cmsgytch3000kucupy40ecgq3	Тестовый приход	CLIENT	15000	2026-08-06 00:00:00	2026-08	\N	cmsf0tfyx0008ucd5zk8koi7t	\N	2026-08-06 03:37:30.471
cmsgyvx5i000mucupte8mxzu1	Тестовый приход	CLIENT	15000	2026-08-06 00:00:00	2026-08	\N	cmsf0tfyx0008ucd5zk8koi7t	\N	2026-08-06 03:39:30.582
\.


--
-- Data for Name: MarketingReport; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."MarketingReport" (id, date, channel, source, direction, spend, currency, "usdRate", leads, impressions, inquiries, notes, "authorId", "clientId", "createdAt") FROM stdin;
cmsf1hg83000tuc38m51d4z3y	2026-08-05 00:00:00	TARGET	\N	\N	4371	USD	87.42	5	1000	7	\N	cmsf0tfyp0000ucd5mfmmfw20	\N	2026-08-04 19:16:41.956
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Notification" (id, "userId", kind, title, body, link, read, "dedupeKey", "createdAt") FROM stdin;
cmsf1e7cn0001uc381spqai2d	cmsf0tfyp0000ucd5mfmmfw20	PAYMENT_DUE	Просрочена оплата: Стоматология «Ак Тиш»	35 000 сом · срок 05.08.2026	/clients/cmsf0tfzr002fucd5alxgun7k	f	pay-cmsf0tg0b0045ucd51l294ten-late	2026-08-04 19:14:10.487
cmsf1e7cr0003uc3860hsliar	cmsf0tfys0003ucd57zkaeizj	PAYMENT_DUE	Просрочена оплата: Стоматология «Ак Тиш»	35 000 сом · срок 05.08.2026	/clients/cmsf0tfzr002fucd5alxgun7k	f	pay-cmsf0tg0b0045ucd51l294ten-late	2026-08-04 19:14:10.492
cmsf1e7cx0005uc38fgxc2edt	cmsf0tfyp0000ucd5mfmmfw20	PAYMENT_DUE	Просрочена оплата: Клиника «Медикал Плюс»	50 000 сом · срок 05.08.2026	/clients/cmsf0tfzu002lucd5jekix2o5	f	pay-cmsf0tg0i004tucd57p1gu0s4-late	2026-08-04 19:14:10.497
cmsf1e7cz0007uc383rywi0cy	cmsf0tfys0003ucd57zkaeizj	PAYMENT_DUE	Просрочена оплата: Клиника «Медикал Плюс»	50 000 сом · срок 05.08.2026	/clients/cmsf0tfzu002lucd5jekix2o5	f	pay-cmsf0tg0i004tucd57p1gu0s4-late	2026-08-04 19:14:10.499
cmsf1e7d10009uc38wgv7lfr3	cmsf0tfyp0000ucd5mfmmfw20	PAYMENT_DUE	Скоро оплата: Школа English Time	18 000 сом · срок 07.08.2026	/clients/cmsf0tfzv002nucd5wtn54531	f	pay-cmsf0tg0q005lucd56oc0wuht-soon	2026-08-04 19:14:10.501
cmsf1e7d2000buc38mlv0gmwu	cmsf0tfys0003ucd57zkaeizj	PAYMENT_DUE	Скоро оплата: Школа English Time	18 000 сом · срок 07.08.2026	/clients/cmsf0tfzv002nucd5wtn54531	f	pay-cmsf0tg0q005lucd56oc0wuht-soon	2026-08-04 19:14:10.503
cmsf1e7d8000duc384idke6uz	cmsf0tfyr0001ucd5wrqzuxmq	TASK_DUE	Дедлайн задачи: Собрать бриф и доступы	Стоматология «Ак Тиш» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg14006zucd5rw6thl9x-2026-08-04	2026-08-04 19:14:10.509
cmsf1e7d9000fuc381b8x8vwj	cmsf0tfyr0001ucd5wrqzuxmq	TASK_DUE	Дедлайн задачи: Собрать бриф и доступы	Стоматология «Ак Тиш» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg14006zucd5rw6thl9x-2026-08-04	2026-08-04 19:14:10.509
cmsf1e7da000huc3812spywso	cmsf0tfys0002ucd5scrb784u	TASK_DUE	Дедлайн задачи: Масштабировать рабочую связку	Мебель «Уют KG» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg180079ucd51g67xtwh-2026-08-04	2026-08-04 19:14:10.51
cmsf1e7da000juc38o2fspwet	cmsf0tfys0002ucd5scrb784u	TASK_DUE	Дедлайн задачи: Масштабировать рабочую связку	Мебель «Уют KG» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg180079ucd51g67xtwh-2026-08-04	2026-08-04 19:14:10.511
cmsf1e7df000luc38p7to5ug3	cmsf0tfyr0001ucd5wrqzuxmq	CPL_ALERT	Превышен порог CPL: Клиника «Медикал Плюс»	CPL 857 сом при цели 500 сом	/clients/cmsf0tfzu002lucd5jekix2o5	f	cpl-cmsf0tg0z006hucd5vgyyj68k	2026-08-04 19:14:10.515
cmsf1e7df000nuc381hauuxei	cmsf0tfyr0001ucd5wrqzuxmq	CPL_ALERT	Превышен порог CPL: Клиника «Медикал Плюс»	CPL 857 сом при цели 500 сом	/clients/cmsf0tfzu002lucd5jekix2o5	f	cpl-cmsf0tg0z006hucd5vgyyj68k	2026-08-04 19:14:10.515
cmsf1e7dg000puc38e3x6a9se	cmsf0tfyp0000ucd5mfmmfw20	CPL_ALERT	Превышен порог CPL: Клиника «Медикал Плюс»	CPL 857 сом при цели 500 сом	/clients/cmsf0tfzu002lucd5jekix2o5	f	cpl-cmsf0tg0z006hucd5vgyyj68k	2026-08-04 19:14:10.516
cmsf1e7dg000ruc38q3avrf5q	cmsf0tfyp0000ucd5mfmmfw20	CPL_ALERT	Превышен порог CPL: Клиника «Медикал Плюс»	CPL 857 сом при цели 500 сом	/clients/cmsf0tfzu002lucd5jekix2o5	f	cpl-cmsf0tg0z006hucd5vgyyj68k	2026-08-04 19:14:10.516
cmsfvfdg70008ucupqdcuq41g	cmsf0tfyr0001ucd5wrqzuxmq	TASK_DUE	Дедлайн задачи: Собрать бриф и доступы	Стоматология «Ак Тиш» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg14006zucd5rw6thl9x-2026-08-05	2026-08-05 09:14:53.527
cmsfvfdgd000aucupioyt2z6h	cmsf0tfys0002ucd5scrb784u	TASK_DUE	Дедлайн задачи: Масштабировать рабочую связку	Мебель «Уют KG» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg180079ucd51g67xtwh-2026-08-05	2026-08-05 09:14:53.534
cmsgyiu80000cucuphq0knfbb	cmsf0tfyr0001ucd5wrqzuxmq	TASK_DUE	Просрочена задача: Собрать бриф и доступы	Стоматология «Ак Тиш» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg14006zucd5rw6thl9x-2026-08-06	2026-08-06 03:29:20.256
cmsgyiu86000eucupjslsckrc	cmsf0tfyr0001ucd5wrqzuxmq	TASK_DUE	Дедлайн задачи: Написать 10 гипотез + ТЗ на съёмку	Кофейня Sierra Bishkek · срок 07.08.2026	/tasks?board=TARGET	f	task-cmsf0tg150071ucd55nzhwhfh-2026-08-06	2026-08-06 03:29:20.262
cmsgyiu87000gucupty3cz3zi	cmsf0tfys0002ucd5scrb784u	TASK_DUE	Просрочена задача: Масштабировать рабочую связку	Мебель «Уют KG» · срок 06.08.2026	/tasks?board=TARGET	f	task-cmsf0tg180079ucd51g67xtwh-2026-08-06	2026-08-06 03:29:20.263
cmsgyiu88000iucup27kisi1i	cmsf0tfys0002ucd5scrb784u	TASK_DUE	Дедлайн задачи: Обновить креативы	Фитнес «Атлет» · срок 07.08.2026	/tasks?board=TARGET	f	task-cmsf0tg19007bucd54ln9jsmc-2026-08-06	2026-08-06 03:29:20.264
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Payment" (id, "clientId", kind, amount, status, method, "dueAt", "paidAt", "periodMonth", comment, "execShare", reserve, "ownerNet", "execUserId", "accountId", "createdAt") FROM stdin;
cmsf0tg0a003zucd51y546xud	cmsf0tfzr002fucd5alxgun7k	SUBSCRIPTION	35000	PAID	TRANSFER	2026-05-04 18:58:01.929	2026-05-04 18:58:01.929	2026-05	\N	11900	4200	18900	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.93
cmsf0tg0a0041ucd5924ukevx	cmsf0tfzr002fucd5alxgun7k	SUBSCRIPTION	35000	PAID	TRANSFER	2026-06-04 18:58:01.93	2026-06-04 18:58:01.93	2026-06	\N	11900	4200	18900	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.931
cmsf0tg0b0043ucd5w9et58vu	cmsf0tfzr002fucd5alxgun7k	SUBSCRIPTION	35000	PAID	TRANSFER	2026-07-04 18:58:01.931	2026-07-04 18:58:01.931	2026-07	\N	11900	4200	18900	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.931
cmsf0tg0b0045ucd51l294ten	cmsf0tfzr002fucd5alxgun7k	SUBSCRIPTION	35000	PENDING	TRANSFER	2026-08-04 18:58:01.931	\N	2026-08	\N	11900	4200	18900	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.932
cmsf0tg0c0047ucd5ddcu65i3	cmsf0tfzs002hucd5y6pfh4ra	SUBSCRIPTION	45000	PAID	TRANSFER	2026-05-04 18:58:01.932	2026-05-04 18:58:01.932	2026-05	\N	15300	5400	24300	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.933
cmsf0tg0d0049ucd5z68mczwn	cmsf0tfzs002hucd5y6pfh4ra	SUBSCRIPTION	45000	PAID	TRANSFER	2026-06-04 18:58:01.933	2026-06-04 18:58:01.933	2026-06	\N	15300	5400	24300	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.933
cmsf0tg0d004bucd5qdx3fzww	cmsf0tfzs002hucd5y6pfh4ra	SUBSCRIPTION	45000	PAID	TRANSFER	2026-07-04 18:58:01.933	2026-07-04 18:58:01.933	2026-07	\N	15300	5400	24300	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.934
cmsf0tg0e004ducd5v2hyvmix	cmsf0tfzs002hucd5y6pfh4ra	SUBSCRIPTION	45000	PAID	TRANSFER	2026-08-04 18:58:01.934	2026-08-04 18:58:01.934	2026-08	\N	15300	5400	24300	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.934
cmsf0tg0e004fucd5lqg3plmq	cmsf0tfzt002jucd5s8tmjkbo	SUBSCRIPTION	40000	PAID	TRANSFER	2026-05-04 18:58:01.934	2026-05-04 18:58:01.934	2026-05	\N	13600	4800	21600	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.935
cmsf0tg0f004hucd51mqe8kzq	cmsf0tfzt002jucd5s8tmjkbo	SUBSCRIPTION	40000	PAID	TRANSFER	2026-06-04 18:58:01.935	2026-06-04 18:58:01.935	2026-06	\N	13600	4800	21600	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.935
cmsf0tg0f004jucd59czx893p	cmsf0tfzt002jucd5s8tmjkbo	SUBSCRIPTION	40000	PAID	TRANSFER	2026-07-04 18:58:01.935	2026-07-04 18:58:01.935	2026-07	\N	13600	4800	21600	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.936
cmsf0tg0g004lucd5m5zhcujc	cmsf0tfzt002jucd5s8tmjkbo	SUBSCRIPTION	40000	PAID	TRANSFER	2026-08-04 18:58:01.936	2026-08-04 18:58:01.936	2026-08	\N	13600	4800	21600	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.936
cmsf0tg0h004nucd5k0bive52	cmsf0tfzu002lucd5jekix2o5	SUBSCRIPTION	50000	PAID	TRANSFER	2026-05-04 18:58:01.936	2026-05-04 18:58:01.936	2026-05	\N	17000	6000	27000	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.937
cmsf0tg0h004pucd5c1l4mx77	cmsf0tfzu002lucd5jekix2o5	SUBSCRIPTION	50000	PAID	TRANSFER	2026-06-04 18:58:01.937	2026-06-04 18:58:01.937	2026-06	\N	17000	6000	27000	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.938
cmsf0tg0i004rucd5x2hal6w3	cmsf0tfzu002lucd5jekix2o5	SUBSCRIPTION	50000	PAID	TRANSFER	2026-07-04 18:58:01.938	2026-07-04 18:58:01.938	2026-07	\N	17000	6000	27000	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.938
cmsf0tg0i004tucd57p1gu0s4	cmsf0tfzu002lucd5jekix2o5	SUBSCRIPTION	50000	DEBT	TRANSFER	2026-08-04 18:58:01.938	\N	2026-08	\N	17000	6000	27000	cmsf0tfyr0001ucd5wrqzuxmq	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.939
cmsf0tg0j004vucd50r5elsg2	cmsf0tfzv002nucd5wtn54531	SUBSCRIPTION	38000	PAID	TRANSFER	2026-05-04 18:58:01.939	2026-05-04 18:58:01.939	2026-05	\N	12920	4560	20520	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.939
cmsf0tg0j004xucd59nf071wx	cmsf0tfzv002nucd5wtn54531	SUBSCRIPTION	38000	PAID	TRANSFER	2026-06-04 18:58:01.939	2026-06-04 18:58:01.939	2026-06	\N	12920	4560	20520	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.94
cmsf0tg0k004zucd5eje2a01g	cmsf0tfzv002nucd5wtn54531	SUBSCRIPTION	38000	PAID	TRANSFER	2026-07-04 18:58:01.94	2026-07-04 18:58:01.94	2026-07	\N	12920	4560	20520	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.94
cmsf0tg0k0051ucd5p0hmzp7v	cmsf0tfzv002nucd5wtn54531	SUBSCRIPTION	38000	PAID	TRANSFER	2026-08-04 18:58:01.94	2026-08-04 18:58:01.94	2026-08	\N	12920	4560	20520	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.941
cmsf0tg0l0053ucd5zcbzbzit	cmsf0tfzw002pucd5b6fo2tt7	SUBSCRIPTION	42000	PAID	TRANSFER	2026-05-04 18:58:01.941	2026-05-04 18:58:01.941	2026-05	\N	14280	5040	22680	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.942
cmsf0tg0m0055ucd58qaa3p94	cmsf0tfzw002pucd5b6fo2tt7	SUBSCRIPTION	42000	PAID	TRANSFER	2026-06-04 18:58:01.942	2026-06-04 18:58:01.942	2026-06	\N	14280	5040	22680	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.942
cmsf0tg0m0057ucd5arv37z66	cmsf0tfzw002pucd5b6fo2tt7	SUBSCRIPTION	42000	PAID	TRANSFER	2026-07-04 18:58:01.942	2026-07-04 18:58:01.942	2026-07	\N	14280	5040	22680	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.943
cmsf0tg0n0059ucd5qjovcma2	cmsf0tfzw002pucd5b6fo2tt7	SUBSCRIPTION	42000	PAID	TRANSFER	2026-08-04 18:58:01.943	2026-08-04 18:58:01.943	2026-08	\N	14280	5040	22680	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.943
cmsf0tg0n005bucd5y85vys60	cmsf0tfzy002rucd5iaxzi6y4	SUBSCRIPTION	35000	PAID	TRANSFER	2026-05-04 18:58:01.943	2026-05-04 18:58:01.943	2026-05	\N	11900	4200	18900	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.944
cmsf0tg0o005ducd5uun0gp3w	cmsf0tfzy002rucd5iaxzi6y4	SUBSCRIPTION	35000	PAID	TRANSFER	2026-06-04 18:58:01.944	2026-06-04 18:58:01.944	2026-06	\N	11900	4200	18900	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.944
cmsf0tg0o005fucd5ohlzi3kb	cmsf0tfzy002rucd5iaxzi6y4	SUBSCRIPTION	35000	PAID	TRANSFER	2026-07-04 18:58:01.944	2026-07-04 18:58:01.944	2026-07	\N	11900	4200	18900	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.945
cmsf0tg0p005hucd5p9lqegm2	cmsf0tfzy002rucd5iaxzi6y4	SUBSCRIPTION	35000	PAID	TRANSFER	2026-08-04 18:58:01.945	2026-08-04 18:58:01.945	2026-08	\N	11900	4200	18900	cmsf0tfys0002ucd5scrb784u	cmsf0tfyw0007ucd5tcp769s4	2026-08-04 18:58:01.945
cmsf0tg0p005jucd5m0nejxd5	cmsf0tfzu002lucd5jekix2o5	SITE	25000	PAID	CASH	2026-07-23 18:58:01.945	2026-07-23 18:58:01.945	2026-07	Лендинг клиники	10000	3000	12000	cmsf0tfyt0004ucd5wlxv4vh8	\N	2026-08-04 18:58:01.946
cmsf0tg0q005lucd56oc0wuht	cmsf0tfzv002nucd5wtn54531	BOT	18000	PENDING	INVOICE	2026-08-06 18:58:01.946	\N	2026-08	Чат-бот записи на пробный урок	7200	2160	8640	cmsf0tfyt0004ucd5wlxv4vh8	\N	2026-08-04 18:58:01.947
\.


--
-- Data for Name: Regulation; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Regulation" (id, title, description, color, items, notes, "ownerId", assignees, "order", active, "createdAt", "updatedAt") FROM stdin;
cmsgzbud30001ucssrbcfyvbp	Ведение рекламных кабинетов	Открутка, связки, цена заявки по всем проектам	#6d5efc	["#Каждый день","Проверить открутку по всем кабинетам","Свести заявки за вчера","Отключить связки дороже целевого CPL","#Каждую неделю","Собрать отчёт клиенту и отправить","Запустить 3-5 новых связок","Обновить креативы там, где выгорело","#Каждый месяц","Пересчитать среднюю цену заявки по проекту","Согласовать бюджет на следующий месяц"]	Если CPL превышает цель два дня подряд — сразу писать в общий чат, не ждать отчёта.	cmsf0tfyr0001ucd5wrqzuxmq		1	t	2026-08-06 03:51:53.463	2026-08-06 03:51:53.463
cmsgzbud90003ucssn3d3lyqn	Работа с клиентами	Связь, оплаты, продления договоров	#0ea5e9	["#Каждый день","Ответить на все сообщения клиентов до 18:00","Занести новые договорённости в карточку клиента","#Каждую неделю","Созвон-статус с каждым активным клиентом","Проверить, кто не оплатил в срок","#Каждый месяц","Выставить счета за абонплату","Напомнить о продлении договоров, что заканчиваются"]	\N	cmsf0tfys0003ucd57zkaeizj	cmsf0tfyt0005ucd5ikyxc7ii	2	t	2026-08-06 03:51:53.469	2026-08-06 03:51:53.469
\.


--
-- Data for Name: Setting; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Setting" (key, value) FROM stdin;
targetologShare	0.34
devShare	0.4
reserveShare	0.12
projectLimit	5
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Task" (id, title, board, stage, "clientId", "assigneeId", "dueAt", comment, done, "order", "createdAt", "archivedAt", "doneAt", priority, recurrence, "recurrenceParentId", "startedAt", tags) FROM stdin;
cmsf0tg14006zucd5rw6thl9x	Собрать бриф и доступы	TARGET	BRIEF	cmsf0tfzr002fucd5alxgun7k	cmsf0tfyr0001ucd5wrqzuxmq	2026-08-05 18:58:01.96	\N	f	0	2026-08-04 18:58:01.961	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg150071ucd55nzhwhfh	Написать 10 гипотез + ТЗ на съёмку	TARGET	HYPOTHESES	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyr0001ucd5wrqzuxmq	2026-08-06 18:58:01.961	\N	f	0	2026-08-04 18:58:01.962	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg160073ucd5pguddnmp	Клиент снимает 5 роликов	TARGET	SHOOTING	cmsf0tfzt002jucd5s8tmjkbo	cmsf0tfyr0001ucd5wrqzuxmq	2026-08-07 18:58:01.962	\N	f	0	2026-08-04 18:58:01.963	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg170075ucd5j2dhxtn0	Запустить тест 5 связок	TARGET	LAUNCH	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyr0001ucd5wrqzuxmq	2026-08-08 18:58:01.963	\N	f	0	2026-08-04 18:58:01.963	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg170077ucd5yeszs8fb	Отсечь связки дороже 500 сом	TARGET	FILTER	cmsf0tfzv002nucd5wtn54531	cmsf0tfys0002ucd5scrb784u	2026-08-09 18:58:01.963	\N	f	0	2026-08-04 18:58:01.964	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg180079ucd51g67xtwh	Масштабировать рабочую связку	TARGET	SCALE	cmsf0tfzw002pucd5b6fo2tt7	cmsf0tfys0002ucd5scrb784u	2026-08-05 18:58:01.964	\N	f	0	2026-08-04 18:58:01.964	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg19007bucd54ln9jsmc	Обновить креативы	TARGET	UPDATE	cmsf0tfzy002rucd5iaxzi6y4	cmsf0tfys0002ucd5scrb784u	2026-08-06 18:58:01.965	\N	f	0	2026-08-04 18:58:01.965	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg19007ducd5e8uxztmg	Лендинг клиники: сборка страницы	DEV	DEV	cmsf0tfzu002lucd5jekix2o5	cmsf0tfyt0004ucd5wlxv4vh8	2026-08-08 18:58:01.965	\N	f	0	2026-08-04 18:58:01.966	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg1a007fucd5oxe6wq8m	Чат-бот записи: подключить CRM	DEV	BRIEF	cmsf0tfzv002nucd5wtn54531	cmsf0tfyt0004ucd5wlxv4vh8	2026-08-13 18:58:01.966	\N	f	0	2026-08-04 18:58:01.966	\N	\N	MEDIUM	\N	\N	\N	
cmsf0tg1a007hucd5zzmp48nq	Смонтировать 5 Reels для кофейни	VIDEO	EDIT	cmsf0tfzs002hucd5y6pfh4ra	cmsf0tfyt0004ucd5wlxv4vh8	2026-08-07 18:58:01.966	\N	f	0	2026-08-04 18:58:01.967	\N	\N	MEDIUM	\N	\N	\N	
cmsf23v5t0001ucuplrj3t97x	Проверка канбана	TARGET	HYPOTHESES	\N	\N	2026-08-05 00:00:00	\N	f	0	2026-08-04 19:34:07.745	\N	\N	URGENT	\N	\N	\N	
\.


--
-- Data for Name: TaskChecklistItem; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."TaskChecklistItem" (id, "taskId", text, done, "order", "createdAt") FROM stdin;
cmsf23v5w0003ucupe8bnb7s7	cmsf23v5t0001ucuplrj3t97x	Второй пункт	f	1	2026-08-04 19:34:07.748
cmsf23v5w0004ucupypldyfao	cmsf23v5t0001ucuplrj3t97x	Третий пункт	f	2	2026-08-04 19:34:07.748
cmsf23v5w0002ucupfxcypclo	cmsf23v5t0001ucuplrj3t97x	Первый пункт	t	0	2026-08-04 19:34:07.748
\.


--
-- Data for Name: TaskComment; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."TaskComment" (id, "taskId", "userId", text, "createdAt") FROM stdin;
cmsf240410006ucuphokg3lhk	cmsf23v5t0001ucuplrj3t97x	cmsf0tfyp0000ucd5mfmmfw20	Тестовый комментарий	2026-08-04 19:34:14.162
\.


--
-- Data for Name: TaskTemplate; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."TaskTemplate" (id, name, hint, board, active, "order", "createdAt") FROM stdin;
cmsf3hxva0000ucdqi8d70foy	Запуск нового клиента	от договора до первых заявок	TARGET	t	1	2026-08-04 20:13:04.054
cmsf3hxvf0006ucdq932ye0jy	Закрытие месяца	отчёты, оплаты, выплаты команде	TARGET	t	2	2026-08-04 20:13:04.059
\.


--
-- Data for Name: TaskTemplateItem; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."TaskTemplateItem" (id, "templateId", title, stage, priority, "dueDays", checklist, "order") FROM stdin;
cmsf3hxvc0001ucdqcb393f3n	cmsf3hxva0000ucdqi8d70foy	Собрать бриф и доступы	BRIEF	HIGH	1	Доступ к рекламному кабинету\nДоступ к странице\nЦелевая аудитория	0
cmsf3hxvc0002ucdqwezzyj6j	cmsf3hxva0000ucdqi8d70foy	Написать гипотезы и ТЗ на съёмку	HYPOTHESES	HIGH	3		1
cmsf3hxvc0003ucdq6quggy45	cmsf3hxva0000ucdqi8d70foy	Клиент снимает креативы	SHOOTING	MEDIUM	7		2
cmsf3hxvc0004ucdq62t0dqz4	cmsf3hxva0000ucdqi8d70foy	Запустить тест связок	LAUNCH	URGENT	9		3
cmsf3hxvc0005ucdqhx6bmibz	cmsf3hxva0000ucdqi8d70foy	Отсечь дорогие связки	FILTER	MEDIUM	14		4
cmsf3hxvf0007ucdqmwkb603p	cmsf3hxvf0006ucdq932ye0jy	Свести отчёты по всем клиентам	UPDATE	HIGH	1		0
cmsf3hxvf0008ucdq8v1ephvf	cmsf3hxvf0006ucdq932ye0jy	Выставить счета на абонплату	UPDATE	URGENT	1		1
cmsf3hxvf0009ucdqa1j8pdbq	cmsf3hxvf0006ucdq932ye0jy	Посчитать и выплатить доли команде	UPDATE	HIGH	3		2
\.


--
-- Data for Name: Transfer; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."Transfer" (id, "fromAccountId", "toAccountId", amount, "madeAt", "periodMonth", comment, "createdAt") FROM stdin;
cmsf0tfzm001zucd5n7hfs1j9	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyw0006ucd5m20i6hh3	35000	2026-05-07 18:58:01.906	2026-05	на текущие расходы офиса	2026-08-04 18:58:01.907
cmsf0tfzn0021ucd59ciqpvqh	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyx0008ucd5zk8koi7t	25000	2026-05-07 18:58:01.906	2026-05	на подписки и рекламу	2026-08-04 18:58:01.908
cmsf0tfzo0023ucd51phom7oc	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyw0006ucd5m20i6hh3	35000	2026-06-07 18:58:01.908	2026-06	на текущие расходы офиса	2026-08-04 18:58:01.908
cmsf0tfzp0025ucd5qi7twps4	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyx0008ucd5zk8koi7t	25000	2026-06-07 18:58:01.908	2026-06	на подписки и рекламу	2026-08-04 18:58:01.909
cmsf0tfzp0027ucd5i84abuqc	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyw0006ucd5m20i6hh3	35000	2026-07-07 18:58:01.909	2026-07	на текущие расходы офиса	2026-08-04 18:58:01.91
cmsf0tfzq0029ucd5op84473r	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyx0008ucd5zk8koi7t	25000	2026-07-07 18:58:01.909	2026-07	на подписки и рекламу	2026-08-04 18:58:01.91
cmsf0tfzq002bucd52z8cx2xu	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyw0006ucd5m20i6hh3	35000	2026-08-07 18:58:01.91	2026-08	на текущие расходы офиса	2026-08-04 18:58:01.911
cmsf0tfzq002ducd5sg4wq1y3	cmsf0tfyw0007ucd5tcp769s4	cmsf0tfyx0008ucd5zk8koi7t	25000	2026-08-07 18:58:01.91	2026-08	на подписки и рекламу	2026-08-04 18:58:01.911
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: apple2
--

COPY public."User" (id, email, "passwordHash", name, role, rate, "rateType", "projectLimit", active, phone, "tgChatId", "tgLinkCode", "createdAt") FROM stdin;
cmsf0tfyp0000ucd5mfmmfw20	owner@prime.kg	$2a$10$Dmam44gf471bCVRL4tywEuN8xWCaxo5oQPcszlO1.9/HzqR09xH.G	Aziz (владелец)	OWNER	\N	PERCENT	5	t	\N	\N	\N	2026-08-04 18:58:01.873
cmsf0tfyr0001ucd5wrqzuxmq	target1@prime.kg	$2a$10$Dmam44gf471bCVRL4tywEuN8xWCaxo5oQPcszlO1.9/HzqR09xH.G	Айбек Осмонов	TARGETOLOG	34	PERCENT	5	t	\N	\N	\N	2026-08-04 18:58:01.876
cmsf0tfys0002ucd5scrb784u	target2@prime.kg	$2a$10$Dmam44gf471bCVRL4tywEuN8xWCaxo5oQPcszlO1.9/HzqR09xH.G	Нурзада Асанова	TARGETOLOG	34	PERCENT	5	t	\N	\N	\N	2026-08-04 18:58:01.876
cmsf0tfys0003ucd57zkaeizj	account@prime.kg	$2a$10$Dmam44gf471bCVRL4tywEuN8xWCaxo5oQPcszlO1.9/HzqR09xH.G	Жанара Керимова	ACCOUNT	10	PERCENT	5	t	\N	\N	\N	2026-08-04 18:58:01.877
cmsf0tfyt0004ucd5wlxv4vh8	dev@prime.kg	$2a$10$Dmam44gf471bCVRL4tywEuN8xWCaxo5oQPcszlO1.9/HzqR09xH.G	Тимур (разработка/монтаж)	CONTRACTOR	40	PERCENT	5	t	\N	\N	\N	2026-08-04 18:58:01.878
cmsf0tfyt0005ucd5ikyxc7ii	buh@prime.kg	$2a$10$Dmam44gf471bCVRL4tywEuN8xWCaxo5oQPcszlO1.9/HzqR09xH.G	Айгуль Бакирова	ACCOUNTANT	\N	PERCENT	5	t	\N	\N	\N	2026-08-04 18:58:01.878
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: AdReport AdReport_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."AdReport"
    ADD CONSTRAINT "AdReport_pkey" PRIMARY KEY (id);


--
-- Name: BotSession BotSession_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."BotSession"
    ADD CONSTRAINT "BotSession_pkey" PRIMARY KEY (id);


--
-- Name: ClientLink ClientLink_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientLink"
    ADD CONSTRAINT "ClientLink_pkey" PRIMARY KEY (id);


--
-- Name: ClientMember ClientMember_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientMember"
    ADD CONSTRAINT "ClientMember_pkey" PRIMARY KEY (id);


--
-- Name: ClientSnapshot ClientSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientSnapshot"
    ADD CONSTRAINT "ClientSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: DictItem DictItem_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."DictItem"
    ADD CONSTRAINT "DictItem_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: Goal Goal_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_pkey" PRIMARY KEY (id);


--
-- Name: Income Income_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_pkey" PRIMARY KEY (id);


--
-- Name: MarketingReport MarketingReport_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."MarketingReport"
    ADD CONSTRAINT "MarketingReport_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Regulation Regulation_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Regulation"
    ADD CONSTRAINT "Regulation_pkey" PRIMARY KEY (id);


--
-- Name: Setting Setting_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Setting"
    ADD CONSTRAINT "Setting_pkey" PRIMARY KEY (key);


--
-- Name: TaskChecklistItem TaskChecklistItem_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskChecklistItem"
    ADD CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY (id);


--
-- Name: TaskComment TaskComment_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskComment"
    ADD CONSTRAINT "TaskComment_pkey" PRIMARY KEY (id);


--
-- Name: TaskTemplateItem TaskTemplateItem_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskTemplateItem"
    ADD CONSTRAINT "TaskTemplateItem_pkey" PRIMARY KEY (id);


--
-- Name: TaskTemplate TaskTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: Transfer Transfer_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Transfer"
    ADD CONSTRAINT "Transfer_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: BotSession_chatId_key; Type: INDEX; Schema: public; Owner: apple2
--

CREATE UNIQUE INDEX "BotSession_chatId_key" ON public."BotSession" USING btree ("chatId");


--
-- Name: ClientLink_clientId_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "ClientLink_clientId_idx" ON public."ClientLink" USING btree ("clientId");


--
-- Name: ClientMember_clientId_userId_role_key; Type: INDEX; Schema: public; Owner: apple2
--

CREATE UNIQUE INDEX "ClientMember_clientId_userId_role_key" ON public."ClientMember" USING btree ("clientId", "userId", role);


--
-- Name: ClientSnapshot_clientId_type_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "ClientSnapshot_clientId_type_idx" ON public."ClientSnapshot" USING btree ("clientId", type);


--
-- Name: DictItem_type_key_key; Type: INDEX; Schema: public; Owner: apple2
--

CREATE UNIQUE INDEX "DictItem_type_key_key" ON public."DictItem" USING btree (type, key);


--
-- Name: DictItem_type_order_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "DictItem_type_order_idx" ON public."DictItem" USING btree (type, "order");


--
-- Name: Goal_clientId_month_metric_key; Type: INDEX; Schema: public; Owner: apple2
--

CREATE UNIQUE INDEX "Goal_clientId_month_metric_key" ON public."Goal" USING btree ("clientId", month, metric);


--
-- Name: MarketingReport_date_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "MarketingReport_date_idx" ON public."MarketingReport" USING btree (date);


--
-- Name: Notification_dedupeKey_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "Notification_dedupeKey_idx" ON public."Notification" USING btree ("dedupeKey");


--
-- Name: Regulation_ownerId_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "Regulation_ownerId_idx" ON public."Regulation" USING btree ("ownerId");


--
-- Name: TaskChecklistItem_taskId_order_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "TaskChecklistItem_taskId_order_idx" ON public."TaskChecklistItem" USING btree ("taskId", "order");


--
-- Name: TaskComment_taskId_createdAt_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "TaskComment_taskId_createdAt_idx" ON public."TaskComment" USING btree ("taskId", "createdAt");


--
-- Name: TaskTemplateItem_templateId_order_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "TaskTemplateItem_templateId_order_idx" ON public."TaskTemplateItem" USING btree ("templateId", "order");


--
-- Name: Task_assigneeId_done_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "Task_assigneeId_done_idx" ON public."Task" USING btree ("assigneeId", done);


--
-- Name: Task_dueAt_idx; Type: INDEX; Schema: public; Owner: apple2
--

CREATE INDEX "Task_dueAt_idx" ON public."Task" USING btree ("dueAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: apple2
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_tgLinkCode_key; Type: INDEX; Schema: public; Owner: apple2
--

CREATE UNIQUE INDEX "User_tgLinkCode_key" ON public."User" USING btree ("tgLinkCode");


--
-- Name: AdReport AdReport_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."AdReport"
    ADD CONSTRAINT "AdReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdReport AdReport_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."AdReport"
    ADD CONSTRAINT "AdReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClientLink ClientLink_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientLink"
    ADD CONSTRAINT "ClientLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClientMember ClientMember_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientMember"
    ADD CONSTRAINT "ClientMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClientMember ClientMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientMember"
    ADD CONSTRAINT "ClientMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClientSnapshot ClientSnapshot_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."ClientSnapshot"
    ADD CONSTRAINT "ClientSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Client Client_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Client Client_targetologId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_targetologId_fkey" FOREIGN KEY ("targetologId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Goal Goal_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Income Income_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Income Income_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketingReport MarketingReport_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."MarketingReport"
    ADD CONSTRAINT "MarketingReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketingReport MarketingReport_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."MarketingReport"
    ADD CONSTRAINT "MarketingReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Regulation Regulation_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Regulation"
    ADD CONSTRAINT "Regulation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskChecklistItem TaskChecklistItem_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskChecklistItem"
    ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskComment TaskComment_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskComment"
    ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskComment TaskComment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskComment"
    ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskTemplateItem TaskTemplateItem_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."TaskTemplateItem"
    ADD CONSTRAINT "TaskTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."TaskTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transfer Transfer_fromAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Transfer"
    ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transfer Transfer_toAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apple2
--

ALTER TABLE ONLY public."Transfer"
    ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 9JPpmHLTXFi7ccjEbQraH2nqAHsL5LSgR5asSw3OA04t6O0qEaiVwGx4XQgZAcT

