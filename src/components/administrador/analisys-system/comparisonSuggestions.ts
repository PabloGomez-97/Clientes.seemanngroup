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
  | "teamTrends"
  | "custom";

/** Categories shown in the report-mode select (excludes custom dual-range). */
export type SuggestionPresetCategory = Exclude<ComparisonSuggestionCategory, "custom">;

export type ComparisonSuggestion = {
  id: string;
  labelKey: string;
  category: ComparisonSuggestionCategory;
  loadRange: DateRange;
  periodA: ComparisonPeriod;
  periodB: ComparisonPeriod;
  targetSection: AnalisysSectionId;
  trendsGranularity?: TimeGranularity;
  /** Optional explanation key shown under the period labels */
  explanationKey?: string;
};

export type AppliedComparisonSuggestion = ComparisonSuggestion & {
  appliedAt: number;
};

/** Sentinel values for the report-mode select (not real suggestion ids). */
export const REPORT_MODE_CUSTOM_RANGE = "custom-range";
export const REPORT_MODE_CUSTOM_COMPARISON = "custom-comparison";

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

function startOfSemester(date: Date): Date {
  const semesterMonth = date.getMonth() < 6 ? 0 : 6;
  return new Date(date.getFullYear(), semesterMonth, 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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
    const to = end.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${from} – ${to}`;
  }

  const from = start.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const to = end.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${from} – ${to}`;
}

function makePeriod(start: Date, end: Date, locale: string): ComparisonPeriod {
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    label: formatRangeLabel(start, end, locale),
  };
}

function makePeriodFromIso(range: DateRange, locale: string): ComparisonPeriod {
  const start = new Date(`${range.startDate}T12:00:00`);
  const end = new Date(`${range.endDate}T12:00:00`);
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    label: formatRangeLabel(start, end, locale),
  };
}

/** Current calendar period closed at today (start → today). */
function getCurrentMonthToToday(reference: Date, locale: string): ComparisonPeriod {
  return makePeriod(startOfMonth(reference), reference, locale);
}

function getCurrentQuarterToToday(reference: Date, locale: string): ComparisonPeriod {
  return makePeriod(startOfQuarter(reference), reference, locale);
}

function getCurrentSemesterToToday(reference: Date, locale: string): ComparisonPeriod {
  return makePeriod(startOfSemester(reference), reference, locale);
}

function getCurrentYearToToday(reference: Date, locale: string): ComparisonPeriod {
  return makePeriod(new Date(reference.getFullYear(), 0, 1), reference, locale);
}

function getClosedMonth(offsetMonthsFromLast = 0, locale = "es"): ComparisonPeriod {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth() - 1 - offsetMonthsFromLast, 1);
  const monthEnd = endOfMonth(monthStart);
  return makePeriod(monthStart, monthEnd, locale);
}

function getClosedQuarter(offsetQuartersFromLast = 0, locale = "es"): ComparisonPeriod {
  const today = new Date();
  const currentQuarterStart = startOfQuarter(today);
  const targetQuarterEnd = addDays(currentQuarterStart, -1);
  let quarterEnd = targetQuarterEnd;
  for (let i = 0; i < offsetQuartersFromLast; i += 1) {
    quarterEnd = addDays(startOfQuarter(quarterEnd), -1);
  }
  const quarterStart = startOfQuarter(quarterEnd);
  return makePeriod(quarterStart, quarterEnd, locale);
}

function getClosedSemester(offsetSemestersFromLast = 0, locale = "es"): ComparisonPeriod {
  const today = new Date();
  const currentSemesterStart = startOfSemester(today);
  let semesterEnd = addDays(currentSemesterStart, -1);
  for (let i = 0; i < offsetSemestersFromLast; i += 1) {
    semesterEnd = addDays(startOfSemester(semesterEnd), -1);
  }
  const semesterStart = startOfSemester(semesterEnd);
  return makePeriod(semesterStart, semesterEnd, locale);
}

function getClosedYear(offsetYearsFromLast = 0, locale = "es"): ComparisonPeriod {
  const year = new Date().getFullYear() - 1 - offsetYearsFromLast;
  return makePeriod(new Date(year, 0, 1), new Date(year, 11, 31), locale);
}

function getRollingDays(
  reference: Date,
  days: number,
  offsetDays = 0,
  locale = "es",
): ComparisonPeriod {
  const end = addDays(reference, -offsetDays);
  const start = addDays(end, -(days - 1));
  return makePeriod(start, end, locale);
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
  const localize = (p: ComparisonPeriod) => localizePeriod(p, es);

  const monthToToday = getCurrentMonthToToday(today, es);
  const prevClosedMonth = getClosedMonth(0, es);
  const closedMonth = getClosedMonth(0, es);
  const prevPrevClosedMonth = getClosedMonth(1, es);

  const quarterToToday = getCurrentQuarterToToday(today, es);
  const prevClosedQuarter = getClosedQuarter(0, es);
  const closedQuarter = getClosedQuarter(0, es);
  const prevPrevClosedQuarter = getClosedQuarter(1, es);

  const semesterToToday = getCurrentSemesterToToday(today, es);
  const prevClosedSemester = getClosedSemester(0, es);
  const closedSemester = getClosedSemester(0, es);
  const prevPrevClosedSemester = getClosedSemester(1, es);

  const yearToToday = getCurrentYearToToday(today, es);
  const prevClosedYear = getClosedYear(0, es);
  const closedYear = getClosedYear(0, es);
  const prevPrevClosedYear = getClosedYear(1, es);

  const last30 = getRollingDays(today, 30, 0, es);
  const prev30 = getRollingDays(today, 30, 30, es);
  const last12Start = new Date(today);
  last12Start.setFullYear(last12Start.getFullYear() - 1);
  const trend12 = makePeriod(last12Start, today, es);

  return [
    {
      id: "month-to-today-vs-prev-closed",
      labelKey: "analisysSystem.suggestions.items.monthToTodayVsPrevClosed",
      category: "month",
      loadRange: unionRange(monthToToday, prevClosedMonth),
      periodA: localize(monthToToday),
      periodB: localize(prevClosedMonth),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.currentVsPrevClosed",
    },
    {
      id: "closed-month-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedMonthVsPrev",
      category: "month",
      loadRange: unionRange(closedMonth, prevPrevClosedMonth),
      periodA: localize(closedMonth),
      periodB: localize(prevPrevClosedMonth),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.closedVsClosed",
    },
    {
      id: "last-30-vs-prev-30",
      labelKey: "analisysSystem.suggestions.items.last30VsPrev30",
      category: "month",
      loadRange: unionRange(last30, prev30),
      periodA: localize(last30),
      periodB: localize(prev30),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.rolling30",
    },
    {
      id: "quarter-to-today-vs-prev-closed",
      labelKey: "analisysSystem.suggestions.items.quarterToTodayVsPrevClosed",
      category: "quarterSemester",
      loadRange: unionRange(quarterToToday, prevClosedQuarter),
      periodA: localize(quarterToToday),
      periodB: localize(prevClosedQuarter),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.currentVsPrevClosed",
    },
    {
      id: "closed-quarter-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedQuarterVsPrev",
      category: "quarterSemester",
      loadRange: unionRange(closedQuarter, prevPrevClosedQuarter),
      periodA: localize(closedQuarter),
      periodB: localize(prevPrevClosedQuarter),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.closedVsClosed",
    },
    {
      id: "semester-to-today-vs-prev-closed",
      labelKey: "analisysSystem.suggestions.items.semesterToTodayVsPrevClosed",
      category: "quarterSemester",
      loadRange: unionRange(semesterToToday, prevClosedSemester),
      periodA: localize(semesterToToday),
      periodB: localize(prevClosedSemester),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.currentVsPrevClosed",
    },
    {
      id: "closed-semester-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedSemesterVsPrev",
      category: "quarterSemester",
      loadRange: unionRange(closedSemester, prevPrevClosedSemester),
      periodA: localize(closedSemester),
      periodB: localize(prevPrevClosedSemester),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.closedVsClosed",
    },
    {
      id: "year-to-today-vs-prev-closed",
      labelKey: "analisysSystem.suggestions.items.yearToTodayVsPrevClosed",
      category: "year",
      loadRange: unionRange(yearToToday, prevClosedYear),
      periodA: localize(yearToToday),
      periodB: localize(prevClosedYear),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.currentVsPrevClosed",
    },
    {
      id: "closed-year-vs-prev",
      labelKey: "analisysSystem.suggestions.items.closedYearVsPrev",
      category: "year",
      loadRange: unionRange(closedYear, prevPrevClosedYear),
      periodA: localize(closedYear),
      periodB: localize(prevPrevClosedYear),
      targetSection: "periodComparison",
      explanationKey: "analisysSystem.suggestions.explanations.closedVsClosed",
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
      loadRange: yearToToday,
      periodA: localize(yearToToday),
      periodB: localize(yearToToday),
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

export function buildCustomComparisonSuggestion(
  periodARange: DateRange,
  periodBRange: DateRange,
  locale = "es",
): ComparisonSuggestion {
  const es = locale.startsWith("es") ? "es" : "en";
  const periodA = makePeriodFromIso(periodARange, es);
  const periodB = makePeriodFromIso(periodBRange, es);

  return {
    id: REPORT_MODE_CUSTOM_COMPARISON,
    labelKey: "analisysSystem.suggestions.items.customComparison",
    category: "custom",
    loadRange: unionRange(periodA, periodB),
    periodA,
    periodB,
    targetSection: "periodComparison",
    explanationKey: "analisysSystem.suggestions.explanations.customComparison",
  };
}

export const SUGGESTION_CATEGORY_ORDER: SuggestionPresetCategory[] = [
  "month",
  "quarterSemester",
  "year",
  "teamTrends",
];

export const SUGGESTION_CATEGORY_LABEL_KEYS: Record<SuggestionPresetCategory, string> = {
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
