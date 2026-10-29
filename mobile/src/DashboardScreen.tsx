import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchSummary } from "./api";
import { ageLabel, formatShortDate, formatTaka, formatWeekday } from "./format";
import { colors } from "./theme";
import type { Summary, Transaction } from "./types";

export function DashboardScreen({ passcode, onSignOut }: { passcode: string; onSignOut: () => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef(false);

  function isForeground(): boolean {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      return document.visibilityState !== "hidden";
    }
    return AppState.currentState !== "background";
  }

  const refresh = useCallback(
    async (manual = false) => {
      if (pending.current) return;
      pending.current = true;
      if (manual) setRefreshing(true);
      const result = await fetchSummary(passcode);
      if (result.ok) {
        setSummary(result.summary);
        setError(null);
      } else {
        setError(result.message);
      }
      pending.current = false;
      if (manual) setRefreshing(false);
    },
    [passcode],
  );

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => {
      if (isForeground()) void refresh();
    }, 15_000);
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") void refresh();
    };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      subscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [refresh]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
          styles.content,
          { paddingTop: (Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 24) : 16) + 8 },
        ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} colors={[colors.good]} tintColor={colors.good} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Daily budget</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Spending</Text>
            {summary?.source === "fixture" ? <Text style={styles.sample}>Sample</Text> : null}
          </View>
        </View>
        <View style={styles.headerSide}>
          <Text style={styles.updated}>{summary ? ageLabel(summary.generatedAt, now) : ""}</Text>
          <Pressable accessibilityRole="button" onPress={onSignOut} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.banner}>{summary ? `${error} Showing the last numbers.` : error}</Text> : null}

      {summary ? (
        <>
          <TodayCard summary={summary} />
          <MonthCard summary={summary} />
          <Categories summary={summary} />
          <Recent summary={summary} />
        </>
      ) : (
        <View style={styles.loading}>
          {error ? (
            <Pressable accessibilityRole="button" onPress={() => void refresh(true)} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={colors.good} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function TodayCard({ summary }: { summary: Summary }) {
  const planned = summary.today.planned;
  const remaining = summary.today.remaining;
  const over = remaining !== null && remaining < 0;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.cardLabel}>Today</Text>
        <Text style={styles.cardLabel}>{formatWeekday(summary.today.date)}</Text>
      </View>
      <Text style={styles.hero}>{formatTaka(summary.today.spend)}</Text>
      <Text style={styles.caption}>spent</Text>
      {planned === null ? (
        <Text style={styles.caption}>No planned budget for this day</Text>
      ) : (
        <>
          <Text style={[styles.status, over ? styles.over : styles.good]}>
            {over
              ? `${formatTaka(Math.abs(remaining ?? 0))} over ${formatTaka(planned)}`
              : `${formatTaka(remaining ?? 0)} left of ${formatTaka(planned)}`}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                over ? styles.fillOver : styles.fillGood,
                { width: `${spentRatio(summary.today.spend, planned) * 100}%` },
              ]}
            />
          </View>
        </>
      )}
    </View>
  );
}

function MonthCard({ summary }: { summary: Summary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{summary.month.label}</Text>
      <Text style={styles.monthFigure}>{formatTaka(summary.month.spend)}</Text>
      <Text style={styles.caption}>spent this month</Text>
      <Text style={[styles.status, styles.good]}>{formatTaka(summary.month.income)} income</Text>
    </View>
  );
}

function Categories({ summary }: { summary: Summary }) {
  const max = summary.categories.reduce((highest, category) => Math.max(highest, category.amount), 0);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>By category</Text>
      {summary.categories.length === 0 ? (
        <Text style={styles.caption}>No expenses this month.</Text>
      ) : (
        summary.categories.map((category) => (
          <View key={category.category} style={styles.category}>
            <View style={styles.row}>
              <Text style={styles.categoryName}>{category.category}</Text>
              <Text style={styles.amount}>{formatTaka(category.amount)}</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  styles.fillGood,
                  { width: `${max > 0 ? Math.max(0, (category.amount / max) * 100) : 0}%` },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function Recent({ summary }: { summary: Summary }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent</Text>
      {summary.recent.length === 0 ? (
        <Text style={styles.caption}>No transactions yet.</Text>
      ) : (
        summary.recent.map((transaction, index) => (
          <RecentRow key={`${transaction.date}-${transaction.id}-${index}`} transaction={transaction} />
        ))
      )}
    </View>
  );
}

function RecentRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === "income";
  return (
    <View style={[styles.recent, income && styles.recentIncome]}>
      <View style={styles.recentText}>
        <Text numberOfLines={1} style={styles.recentTitle}>
          <Text style={styles.categoryName}>{transaction.category}</Text>
          {transaction.note ? <Text style={styles.note}> · {transaction.note}</Text> : null}
        </Text>
        <Text style={styles.date}>{formatShortDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.amount, income && styles.good]}>
        {income ? `+${formatTaka(transaction.amount)}` : formatTaka(-Math.abs(transaction.amount))}
      </Text>
    </View>
  );
}

function spentRatio(spend: number, planned: number): number {
  if (planned <= 0) return spend > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, spend / planned));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  headerSide: {
    alignItems: "flex-end",
  },
  kicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  titleRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 28,
  },
  sample: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#d9efe6",
    color: colors.good,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  updated: {
    color: colors.muted,
    fontSize: 12,
  },
  signOut: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  banner: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "#f8e4e1",
    color: colors.over,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  card: {
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  hero: {
    marginTop: 10,
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 48,
    fontVariant: ["tabular-nums"],
  },
  monthFigure: {
    marginTop: 10,
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 36,
    fontVariant: ["tabular-nums"],
  },
  caption: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
  },
  status: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  good: {
    color: colors.good,
  },
  over: {
    color: colors.over,
  },
  track: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  fillGood: {
    backgroundColor: colors.good,
  },
  fillOver: {
    backgroundColor: colors.over,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  category: {
    marginTop: 10,
  },
  categoryName: {
    color: colors.ink,
    fontSize: 15,
    textTransform: "capitalize",
  },
  amount: {
    color: colors.ink,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  recent: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  recentIncome: {
    backgroundColor: "#e7f5ee",
  },
  recentText: {
    flex: 1,
  },
  recentTitle: {
    color: colors.ink,
    fontSize: 15,
  },
  note: {
    color: colors.muted,
  },
  date: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  loading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  retry: {
    borderRadius: 14,
    backgroundColor: colors.good,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
