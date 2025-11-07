import React from "react";
import { Participant } from "~/lib/types";
import { RoleTag } from "./RoleTag";
import Image from "next/image";

interface ParticipantItemProps {
    participant: Participant;
}

export function ParticipantItem({ participant }: ParticipantItemProps) {
    return (
        <li className="flex items-center justify-between py-3">
            <div className="flex items-center">
                <Image
                    className="w-10 h-10 rounded-full mr-4 object-cover"
                    src={participant.avatarUrl}
                    alt={participant.name}
                    width={10}
                    height={10}
                    // Fallback in case an avatar link breaks
                    onError={(e) =>
                        (e.currentTarget.src =
                            "https://placehold.co/40x40/555/FFF?text=?")
                    }
                />
                <div>
                    <p className="text-sm font-medium text-white truncate">
                        {participant.name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {participant.roles.map((role) => (
                            <RoleTag key={role} role={role} />
                        ))}
                    </div>
                </div>
            </div>
        </li>
    );
}
