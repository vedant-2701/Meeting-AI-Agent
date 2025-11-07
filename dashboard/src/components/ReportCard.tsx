"use client"; // This component needs interactivity, so it's a Client Component

import React, { useState } from "react";
import { MeetingReport } from "~/lib/types";
import { ParticipantItem } from "./ParticipantItem";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ReportCardProps {
    report: MeetingReport;
}

export function ReportCard({ report }: ReportCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Clean the URL for display
    const displayUrl = report.meetingUrl
        .replace("https://meet.google.com/", "")
        .replace(/\?.*/, ""); // Remove query params

    return (
        <div className="bg-gray-800 shadow-lg rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-4 sm:px-6">
                <div className="flex justify-between items-center">
                    {/* Left Side: Title & Date */}
                    <div>
                        <h3
                            className="text-lg font-semibold text-white truncate max-w-md"
                            title={report.meetingUrl}
                        >
                            {displayUrl}
                        </h3>
                        {/* <p className="text-sm text-gray-400">
                            {new Date().toLocaleString()}{" "}
                        </p> */}
                    </div>

                    {/* Right Side: Toggle Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium focus:outline-none"
                    >
                        {isOpen ? "Hide" : "Show"} Details (
                        {report.attendeeCount})
                        {isOpen ? (
                            <ChevronUp className="w-4 h-4 ml-1" />
                        ) : (
                            <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {isOpen && (
                <div className="border-t border-gray-700">
                    <ul className="divide-y divide-gray-700 px-4 sm:px-6">
                        {report.attendees.map((p) => (
                            <ParticipantItem
                                key={p.avatarUrl}
                                participant={p}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
