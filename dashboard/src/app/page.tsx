import { fetchReports } from "~/lib/api";
import { Header } from "~/components/Header";
import { ReportCard } from "~/components/ReportCard";

/**
 * This is the main Home Page.
 * It's a Server Component, so it fetches data directly on the server.
 */
export default async function HomePage() {
    // We fetch data here *before* the page loads.
    // The Header's refresh button will trigger this to run again.
    const reports = await fetchReports();

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <Header />

            <main>
                {reports.length === 0 && (
                    <div className="text-center text-gray-400 p-8 bg-gray-800 rounded-lg">
                        <h3 className="text-xl font-semibold">
                            No reports found.
                        </h3>
                        <p className="mt-2">
                            Run the &quot;bot-service&quot; to join a meeting.
                        </p>
                        <p className="mt-1">
                            Once the bot finishes, click &quot;Refresh&quot; to
                            see your report.
                        </p>
                    </div>
                )}

                {reports.map((report) => (
                    <ReportCard key={report.meetingUrl} report={report} />
                ))}
            </main>
        </div>
    );
}

// Revalidate data every 10 seconds.
// You can also change this to 0 for on-demand revalidation only.
export const revalidate = 10;
