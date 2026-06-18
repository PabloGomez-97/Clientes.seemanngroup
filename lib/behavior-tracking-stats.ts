/**
 * Stats aggregation aligned with ComportamientoDeClientes detail view:
 * only completed/abandoned sessions that selected a route count as relevant.
 */

/** MongoDB $group stage: roll events up to one row per client session. */
export const behaviorSessionGroupStage = {
  $group: {
    _id: { email: "$clientEmail", sessionId: "$sessionId" },
    hasCompleted: {
      $max: { $cond: [{ $eq: ["$event", "QUOTE_COMPLETED"] }, 1, 0] },
    },
    hasAbandoned: {
      $max: { $cond: [{ $eq: ["$event", "QUOTE_ABANDONED"] }, 1, 0] },
    },
    hasRoute: {
      $max: {
        $cond: [
          {
            $and: [
              { $eq: ["$event", "QUOTE_ROUTE_SELECTED"] },
              {
                $or: [
                  {
                    $gt: [
                      {
                        $strLenCP: {
                          $trim: { input: { $ifNull: ["$route.origin", ""] } },
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $strLenCP: {
                          $trim: {
                            input: { $ifNull: ["$route.destination", ""] },
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
          1,
          0,
        ],
      },
    },
    lastActivity: { $max: "$timestamp" },
    quoteType: { $first: "$quoteType" },
  },
};

/** Keep only sessions that match isRelevantQuoteSession in the UI. */
export const behaviorRelevantSessionFilterStage = {
  $match: {
    hasRoute: 1,
    $or: [
      { hasCompleted: 1 },
      { $and: [{ hasAbandoned: 1 }, { hasCompleted: 0 }] },
    ],
  },
};

/** MongoDB $group stage: aggregate relevant sessions per client email. */
export const behaviorClientStatsGroupStage = {
  $group: {
    _id: "$_id.email",
    totalEvents: { $sum: 1 },
    quotesStarted: { $sum: 1 },
    quotesCompleted: { $sum: "$hasCompleted" },
    quotesAbandoned: {
      $sum: {
        $cond: [
          { $and: [{ $eq: ["$hasAbandoned", 1] }, { $eq: ["$hasCompleted", 0] }] },
          1,
          0,
        ],
      },
    },
    lastActivity: { $max: "$lastActivity" },
    quoteTypes: { $addToSet: "$quoteType" },
  },
};

export interface BehaviorClientStatsRow {
  totalEvents: number;
  quotesStarted: number;
  quotesCompleted: number;
  quotesAbandoned: number;
  lastActivity: Date | string;
  quoteTypes: string[];
}

export function formatBehaviorClientStats(
  stats: BehaviorClientStatsRow,
): {
  totalEvents: number;
  quotesStarted: number;
  quotesCompleted: number;
  quotesAbandoned: number;
  completionRate: number;
  lastActivity: Date | string;
  quoteTypes: string[];
} {
  const totalWithOutcome = stats.quotesCompleted + stats.quotesAbandoned;
  return {
    totalEvents: stats.totalEvents,
    quotesStarted: stats.quotesStarted,
    quotesCompleted: stats.quotesCompleted,
    quotesAbandoned: stats.quotesAbandoned,
    completionRate:
      totalWithOutcome > 0
        ? Math.round((stats.quotesCompleted / totalWithOutcome) * 100)
        : 0,
    lastActivity: stats.lastActivity,
    quoteTypes: stats.quoteTypes,
  };
}
