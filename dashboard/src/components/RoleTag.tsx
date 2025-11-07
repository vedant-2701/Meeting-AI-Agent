import React from "react";

interface RoleTagProps {
    role: string;
}

// A map to define the icon and color for each role
const roleStyles: Record<string, { icon: string; className: string }> = {
    Participant: { icon: "👤", className: "bg-blue-600 text-blue-100" },
    Host: { icon: "👑", className: "bg-yellow-500 text-yellow-100" },
    Presenter: { icon: "🖥️", className: "bg-green-500 text-green-100" },
    You: { icon: "👋", className: "bg-purple-500 text-purple-100" },
};

export function RoleTag({ role }: RoleTagProps) {
    const style = roleStyles[role] || roleStyles.Participant;

    return (
        <span
            className={`text-xs font-medium me-2 px-2.5 py-0.5 rounded-full ${style.className}`}
        >
            {style.icon} {role}
        </span>
    );
}
