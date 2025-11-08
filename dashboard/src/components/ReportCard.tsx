"use client";

import React, { useState, useEffect } from "react";
import { MeetingReport } from "~/lib/types";
import { ParticipantItem } from "./ParticipantItem";
import { ChatLog } from "./ChatLog"; // *** --- IMPORT NEW COMPONENT --- ***
import { ChevronDown, ChevronUp, Users, MessageSquare } from "lucide-react";

interface ReportCardProps {
    report: MeetingReport;
}

export function ReportCard({ report }: ReportCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<"participants" | "chat">(
        "participants"
    );

    const displayUrl = report.meetingUrl
        .replace("https://meet.google.com/", "")
        .replace(/\?.*/, "");

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
                    </div>

                    {/* Right Side: Toggle Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium focus:outline-none"
                    >
                        {isOpen ? "Hide" : "Show"} Details
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
                    {/* *** --- NEW TABS --- *** */}
                    <div className="flex border-b border-gray-700">
                        <button
                            onClick={() => setActiveTab("participants")}
                            className={`flex-1 flex items-center justify-center p-3 text-sm font-medium ${
                                activeTab === "participants"
                                    ? "border-b-2 border-blue-500 text-white"
                                    : "text-gray-400 hover:bg-gray-700"
                            }`}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Participants ({report.attendeeCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex-1 flex items-center justify-center p-3 text-sm font-medium ${
                                activeTab === "chat"
                                    ? "border-b-2 border-blue-500 text-white"
                                    : "text-gray-400 hover:bg-gray-700"
                            }`}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat ({report.chat.length})
                        </button>
                    </div>
                    {/* *** --- END OF NEW TABS --- *** */}

                    {/* Conditionally render content based on active tab */}
                    {activeTab === "participants" && (
                        <ul className="divide-y divide-gray-700 px-4 sm:px-6">
                            {report.attendees.map((p) => (
                                <ParticipantItem
                                    key={p.avatarUrl}
                                    participant={p}
                                />
                            ))}
                        </ul>
                    )}

                    {activeTab === "chat" && (
                        <div className="max-h-96 overflow-y-auto bg-gray-800">
                            <ChatLog chat={report.chat} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
