"use client"; // This is a client component because it has a button with an onClick handler

import React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function Header() {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        // This is the standard Next.js way to re-fetch server data
        router.refresh();
        // Set a timeout to turn off the spinning icon
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <header className="mb-8 flex justify-between items-center">
            <h1 className="text-4xl font-bold text-white">
                AI Agent Dashboard
            </h1>
            <button
                onClick={handleRefresh}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-all disabled:opacity-70"
                disabled={isRefreshing}
            >
                {isRefreshing ? (
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                    <RefreshCw className="w-5 h-5 mr-2" />
                )}
                {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
        </header>
    );
}
