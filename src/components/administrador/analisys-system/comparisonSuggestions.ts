import { toIsoDate } from "@/components/administrador/reporteria/financiera/quoteUtils";
import type { AnalisysSectionId } from "./AnalisysSectionNav";
import type { TimeGranularity } from "./commissionAnalytics";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type ComparisonPeriod = DateRange & {
  label: string;
};

export type ComparisonSuggestionCategory =
  | "month"
  | "quarterSemester"
  | "year"
  | "teamTrends";

export type ComparisonSuggestion = {
  id: string;
  labelKey: string;
  category: ComparisonSuggestionCategory;
  loadRange: DateRange;
  periodA: ComparisonPeriod;
  periodB: ComparisonPeriod;
  targetSection: AnalisysSectionId;
  trendsGranularity?: TimeGranularity;
};

export type AppliedComparisonSuggestion = ComparisonSuggestion & {
  appliedAt: number;
};

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function unionRange(a: DateRange, b: DateRange): DateRange {
  return {
    startDate: minDate(a.startDate, b.startDate),
    endDate: maxDate(a.endDate, b.endDate),
  };
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date: Date): Date {
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth, 1);
}

function endOfQuarter(date: Date): Date {
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth + 3, 0);
}

function startOfSemester(date: Date): Date {
  const semesterMonth = date.getMonth() < 6 ? 0 : 6;
  return new Date(date.getFullYear(), semesterMonth, 1);
}

function endOfSemester(date: Date): Date {
  const semesterMonth = date.getMonth() < 6 ? 5 : 11;
  return new Date(date.getFullYear(), semesterMonth + 1, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatRangeLabel(start: Date, end: Date, locale: string): string {
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = start.toLocaleDateString(locale, { month: "short" });
    const year = start.getFullYear();
    if (start.getDate() === end.getDate()) {
      return `${start.getDate()} ${month} ${year}`;
    }
    return `${start.getDate()}–${end.getDate()} ${month} ${year}`;
  }

  if (sameYear) {
    const from = start.toLocaleDateString(locale, { day: "numeric", month: "short" });
    const to = end.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    return `${from} – ${to}`;
  }

  const from = start.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const to = end.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  return `${from} – ${to}`;
}

function makePeriod(start: Date, end: Date, locale: string): ComparisonPeriod {
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    label: formatRangeLabel(start, end, locale),
  };
}

function getMtdRange(reference: Date): ComparisonPeriod {
  return makePeriod(startOfMonth(reference), reference, "es");
}

function getSameDayPreviousMonth(reference: Date): ComparisonPeriod {
  const start = startOfMonth(new Date(reference.getFullYear(), reference.getMonth() - 1, 1));
  const day = Math.min(
    reference.getDate(),
    endOfMonth(new Date(reference.getFullYear(), reference.getMonth() - 1, 1)).getDate(),
  );
  const end = new Date(reference.getFullYear(), reference.getMonth() - 1, day);
  return makePeriod(start, end, "es");
}

function getSameDayPreviousYear(reference: Date): ComparisonPeriod {
  const start = new Date(reference.getFullYear() - 1, reference.getMonth(), 1);
  const day = Math.min(
    reference.getDate(),
    endOfMonth(new Date(reference.getFullYear() - 1, reference.getMonth(), 1)).getDate(),
  );
  const end = new Date(reference.getFullYear() - 1, reference.getMonth(), day);
  return makePeriod(start, end, "es");
}

function getClosedMonth(offsetMonthsFromLast = 0): ComparisonPeriod {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth() - 1 - offsetMonthsFromLast, 1);
  const monthEnd = endOfMonth(monthStart);
  return makePeriod(monthStart, monthEnd, "es");
}

function getQuarterToDate(reference: Date): ComparisonPeriod {
  return makePeriod(startOfQuarter(reference), reference, "es");
}

function getPreviousQuarterSamePoint(reference: Date): ComparisonPeriod {
  const quarterStart = startOfQuarter(reference);
  const offsetDays = daysBetweenInclusive(quarterStart, reference);
  const prevQuarterEnd = addDays(startOfQuarter(reference), -1);
  const prevQuarterStart = startOfQuarter(prevQuarterEnd);
  const end = addDays(prevQuarterStart, offsetDays);
  const cappedEnd = end > prevQuarterEnd ? prevQuarterEnd : end;
  return makePeriod(prevQuarterStart, cappedEnd, "es");
}

function getClosedQuarter(offsetQuartersFromLast = 0): ComparisonPeriod {
  const today = new Date();
  const currentQuarterStart = startOfQuarter(today);
  const targetQuarterEnd = addDays(currentQuarterStart, -1);
  let quarterEnd = targetQuarterEnd;
  for (let i = 0; i < offsetQuartersFromLast; i += 1) {
    quarterEnd = addDays(startOfQuarter(quarterEnd), -1);
  }
  const quarterStart = startOfQuarter(quarterEnd);
  return makePeriod(quarterStart, quarterEnd, "es");
}

function getSemesterToDate(reference: Date): ComparisonPeriod {
  return makePeriod(startOfSemester(reference), reference, "es");
}

function getPreviousSemesterSamePoint(reference: Date): ComparisonPeriod {
  const semesterStart = startOfSemester(reference);
  const offsetDays = daysBetweenInclusive(semesterStart, reference);
  const prevSemesterEnd = addDays(semesterStart, -1);
  const prevSemesterStart = startOfSemester(prevSemesterEnd);
  const end = addDays(prevSemesterStart, offsetDays);
  const cappedEnd = end > prevSemesterEnd ? prevSemesterEnd : end;
  return makePeriod(prevSemesterStart, cappedEnd, "es");
}

function getClosedSemester(): ComparisonPeriod {
  const today = new Date();
  const currentSemesterStart = startOfSemester(today);
  const prevSemesterEnd = addDays(currentSemesterStart, -1);
  const prevSemesterStart = startOfSemester(prevSemesterEnd);
  return makePeriod(prevSemesterStart, prevSemesterEnd, "es");
}

function getSemesterBeforeClosed(): ComparisonPeriod {
  const closed = getClosedSemester();
  const closedEnd = new Date(closed.endDate);
  const beforeEnd = addDays(startOfSemester(closedEnd), -1);
  const beforeStart = startOfSemester(beforeEnd);
  return makePeriod(beforeStart, beforeEnd, "es");
}

function getYtdRange(reference: Date): ComparisonPeriod {
  const start = new Date(reference.getFullYear(), 0, 1);
  return makePeriod(start, reference, "es");
}

function getPreviousYtdSameDay(reference: Date): ComparisonPeriod {
  const start = new Date(reference.getFullYear() - 1, 0, 1);
  const end = new Date(
    reference.getFullYear() - 1,
    reference.getMonth(),
    Math.min(
      reference.getDate(),
      endOfMonth(new Date(reference.getFullYear() - 1, reference.getMonth(), 1)).getDate(),
    ),
  );
  return makePeriod(start, end, "es");
}

function getClosedYear(offsetYearsFromLast = 0): ComparisonPeriod {
  const year = new Date().getFullYear() - 1 - offsetYearsFromLast;
  return makePeriod(new Date(year, 0, 1), new Date(year, 11, 31), "es");
}

function getRollingDays(reference: Date, days: number, offsetDays = 0): ComparisonPeriod {
  const end = addDays(reference, -offsetDays);
  const start = addDays(end, -(days - 1));
  return makePeriod(start, end, "es");
}

function localizePeriod(period: ComparisonPeriod, locale: string): ComparisonPeriod {
  const start = new Date(`${period.startDate}T12:00:00`);
  const end = new Date(`${period.endDate}T12:00:00`);
  return {
    ...period,
    label: formatRangeLabel(start, end, locale),
  };
}

export function buildComparisonSuggestions(locale = "es"): ComparisonSuggestion[] {
  const today = new Date();
  const es = locale.startsWith("es") ? "es" : "en";

  const mtd = getMtdRange(today);
  const prevMonthSameDay = getSameDayPreviousMonth(today);
  const prevYearSameDay = getSameDayPreviousYear(today);
  const closedMonth = getClosedMonth(0);
  const prevClosedMonth = getClosedMonth(1);
  const qtd = getQuarterToDate(today);
  const prevQuarterSamePoint = getPreviousQuarterSamePoint(today);
  const closedQuarter = getClosedQuarter(0);
  const prevClosedQuarter = getClosedQuarter(1);
  const std = getSemesterToDate(today);
  const prevSemesterSamePoint = getPreviousSemesterSamePoint(today);
  const closedSemester = getClosedSemester();
  const prevClosedSemester = getSemesterBeforeClosed();
  const ytd = getYtdRange(today);
  const prevYtd = getPreviousYtdSameDay(today);
  const closedYear = getClosedYear(0);
  const prevClosedYear = getClosedYear(1);
  const last30 = getRollingDays(today, 30, 0);
  const prev30 = getRollingDays(today, 30, 30);
  const last12Start = new Date(today);
  last12Start.setFullYear(last12Start.getFullYear() - 1);
  const trend12 = makePeriod(last12Start, today, es);

  const localize = (p: ComparisonPeriod) => localizePeriod(p, es);

  return [
    {
      id: "mtd-vs-prev-month-same-day",
      labelKey: "analisysSystem.suggestions.items.mtdVsPrevMonthSameDay",
      category: "month",
      loadRange: unionRange(mtd, prevMonthSameDay),
      periodA: localize(mtd),
      periodB: localize(prevMonthSameDay),
      targetSection: "periodComparison",
    },
    {
      id: "mtd-vs-prev-year-same-day",
      labelKey: "analisysSystem.suggestions.items.mtdVsPrevYearSameDay",
      category: "month",
      loadRange: unionRange(mtd, prevYearSameDay),
      periodA: localize(mtd),
      periodB: localize(prevYearSameDay),
      targetSection: "periodComparison",
    },
    {
      id: "last-30-vs-prev-30",
      labelKey: "analisysSystem.suggestions.items.last30VsPrev30",
      category: "month",
      loadRange: unionRange(last30, prev30),
      periodA: localize(last30),
      periodB: localize(prev30),
      targetSection: "periodComparison",
    },
    {
      id: "closed-month-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedMonthVsPrev",
      category: "month",
      loadRange: unionRange(closedMonth, prevClosedMonth),
      periodA: localize(closedMonth),
      periodB: localize(prevClosedMonth),
      targetSection: "periodComparison",
    },
    {
      id: "qtd-vs-prev-quarter-same-point",
      labelKey: "analisysSystem.suggestions.items.qtdVsPrevQuarterSamePoint",
      category: "quarterSemester",
      loadRange: unionRange(qtd, prevQuarterSamePoint),
      periodA: localize(qtd),
      periodB: localize(prevQuarterSamePoint),
      targetSection: "periodComparison",
    },
    {
      id: "closed-quarter-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedQuarterVsPrev",
      category: "quarterSemester",
      loadRange: unionRange(closedQuarter, prevClosedQuarter),
      periodA: localize(closedQuarter),
      periodB: localize(prevClosedQuarter),
      targetSection: "periodComparison",
    },
    {
      id: "std-vs-prev-semester-same-point",
      labelKey: "analisysSystem.suggestions.items.stdVsPrevSemesterSamePoint",
      category: "quarterSemester",
      loadRange: unionRange(std, prevSemesterSamePoint),
      periodA: localize(std),
      periodB: localize(prevSemesterSamePoint),
      targetSection: "periodComparison",
    },
    {
      id: "closed-semester-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedSemesterVsPrev",
      category: "quarterSemester",
      loadRange: unionRange(closedSemester, prevClosedSemester),
      periodA: localize(closedSemester),
      periodB: localize(prevClosedSemester),
      targetSection: "periodComparison",
    },
    {
      id: "ytd-vs-prev-ytd",
      labelKey: "analisysSystem.suggestions.items.ytdVsPrevYtd",
      category: "year",
      loadRange: unionRange(ytd, prevYtd),
      periodA: localize(ytd),
      periodB: localize(prevYtd),
      targetSection: "periodComparison",
    },
    {
      id: "closed-year-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedYearVsPrev",
      category: "year",
      loadRange: unionRange(closedYear, prevClosedYear),
      periodA: localize(closedYear),
      periodB: localize(prevClosedYear),
      targetSection: "periodComparison",
    },
    {
      id: "trend-12-months",
      labelKey: "analisysSystem.suggestions.items.trend12Months",
      category: "teamTrends",
      loadRange: trend12,
      periodA: localize(trend12),
      periodB: localize(trend12),
      targetSection: "trends",
      trendsGranularity: "month",
    },
    {
      id: "team-comparison-ytd",
      labelKey: "analisysSystem.suggestions.items.teamComparisonYtd",
      category: "teamTrends",
      loadRange: ytd,
      periodA: localize(ytd),
      periodB: localize(ytd),
      targetSection: "comparison",
    },
    {
      id: "team-comparison-closed-month",
      labelKey: "analisysSystem.suggestions.items.teamComparisonClosedMonth",
      category: "teamTrends",
      loadRange: closedMonth,
      periodA: localize(closedMonth),
      periodB: localize(closedMonth),
      targetSection: "comparison",
    },
  ];
}

export const SUGGESTION_CATEGORY_ORDER: ComparisonSuggestionCategory[] = [
  "month",
  "quarterSemester",
  "year",
  "teamTrends",
];

export const SUGGESTION_CATEGORY_LABEL_KEYS: Record<ComparisonSuggestionCategory, string> = {
  month: "analisysSystem.suggestions.categories.month",
  quarterSemester: "analisysSystem.suggestions.categories.quarterSemester",
  year: "analisysSystem.suggestions.categories.year",
  teamTrends: "analisysSystem.suggestions.categories.teamTrends",
};

export function findSuggestionById(
  id: string,
  locale = "es",
): ComparisonSuggestion | undefined {
  return buildComparisonSuggestions(locale).find((item) => item.id === id);
}
