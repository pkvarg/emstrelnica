import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import ReactPDF from "@react-pdf/renderer";

const { Document, Page, Text, View, StyleSheet, renderToBuffer } = ReactPDF;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 20 },
  subtitle: { fontSize: 12, marginBottom: 10, marginTop: 16 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#18181b", paddingBottom: 4, marginBottom: 4 },
  col1: { width: "40%" },
  col2: { width: "20%", textAlign: "right" },
  col3: { width: "20%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  summary: { flexDirection: "row", gap: 40, marginBottom: 20 },
  summaryBox: { padding: 8 },
  summaryValue: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  summaryLabel: { fontSize: 9, color: "#71717a" },
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year = parseInt(req.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const completed = await db
    .select({
      userId: bookings.userId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      effectiveMinutes: bookings.effectiveMinutes,
      userName: users.firstName,
      userLastName: users.lastName,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.status, "completed"));

  const yearBookings = completed.filter(
    (b) => b.startsAt >= yearStart && b.startsAt < yearEnd,
  );

  const totalVisits = yearBookings.length;
  const totalMinutes = yearBookings.reduce(
    (s, b) => s + (b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000)),
    0,
  );

  const byUser: Record<string, { name: string; visits: number; minutes: number }> = {};
  for (const b of yearBookings) {
    if (!byUser[b.userId]) {
      byUser[b.userId] = { name: `${b.userName} ${b.userLastName}`, visits: 0, minutes: 0 };
    }
    byUser[b.userId].visits++;
    byUser[b.userId].minutes += b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000);
  }

  const sortedUsers = Object.values(byUser).sort((a, b) => b.minutes - a.minutes);

  const pdf = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Štatistiky strelnice — {year}</Text>

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{totalVisits}</Text>
            <Text style={styles.summaryLabel}>Návštevy</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{Math.round(totalMinutes / 60 * 10) / 10}h</Text>
            <Text style={styles.summaryLabel}>Strelecké hodiny</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Podľa členov</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.col1, styles.bold]}>Člen</Text>
          <Text style={[styles.col2, styles.bold]}>Návštevy</Text>
          <Text style={[styles.col3, styles.bold]}>Hodiny</Text>
        </View>
        {sortedUsers.map((u, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.col1}>{u.name}</Text>
            <Text style={styles.col2}>{u.visits}</Text>
            <Text style={styles.col3}>{Math.round(u.minutes / 60 * 10) / 10}h</Text>
          </View>
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(pdf);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="strelnica-stats-${year}.pdf"`,
    },
  });
}
