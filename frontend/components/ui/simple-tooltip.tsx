"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SimpleTooltipProps {
    content: string;
    children: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
}

export function SimpleTooltip({ content, children, side = "bottom", className }: SimpleTooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={cn(
                        "absolute z-50 px-2 py-1 text-xs font-medium text-white bg-black/90 rounded shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none",
                        side === "bottom" && "top-full mt-2",
                        side === "top" && "bottom-full mb-2",
                        side === "left" && "right-full mr-2",
                        side === "right" && "left-full ml-2",
                        className
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
