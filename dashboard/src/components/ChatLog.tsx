import React from "react";
import { ChatMessage } from "~/lib/types";
import { User } from "lucide-react";

interface ChatLogProps {
    chat: ChatMessage[];
}

export function ChatLog({ chat }: ChatLogProps) {
    if (!chat || chat.length === 0) {
        return (
            <div className="p-4 text-sm text-gray-400">
                No chat messages were found.
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-4 p-4">
            {chat.map((msg, index) => (
                <div
                    key={index}
                    className={`flex ${
                        msg.sender === "You" ? "justify-end" : "justify-start"
                    }`}
                >
                    <div
                        className={`flex items-start max-w-xs lg:max-w-md ${
                            msg.sender === "You"
                                ? "flex-row-reverse"
                                : "flex-row"
                        }`}
                    >
                        <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                                msg.sender === "You"
                                    ? "bg-purple-600 ml-2"
                                    : "bg-gray-600 mr-2"
                            }`}
                        >
                            {msg.sender === "You" ? "Y" : msg.sender.charAt(0)}
                        </div>
                        <div
                            className={`relative rounded-lg px-4 py-2 ${
                                msg.sender === "You"
                                    ? "bg-blue-700 text-white"
                                    : "bg-gray-700 text-gray-100"
                            }`}
                        >
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-semibold">
                                    {msg.sender}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {msg.time}
                                </span>
                            </div>
                            <p className="text-sm break-words">{msg.message}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
