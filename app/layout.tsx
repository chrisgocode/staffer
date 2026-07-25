import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { IBM_Plex_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
	subsets: ["latin"],
	weight: ["200", "300", "400", "500", "600", "700", "800"],
	variable: "--font-sans",
});
const ibmPlexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700"],
	variable: "--font-mono",
});
const lora = Lora({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-serif",
});

export const metadata: Metadata = {
	title: "NC Staffing",
	description:
		"Manage event staffing, shift scheduling, and more soon to come!",
	icons: {
		icon: "/favicon.svg",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ConvexAuthNextjsServerProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={`${plusJakartaSans.variable} ${ibmPlexMono.variable} ${lora.variable} font-sans antialiased`}
				>
					<ConvexClientProvider>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							{children}
						</ThemeProvider>
					</ConvexClientProvider>
					<Toaster />
					<Analytics />
					<SpeedInsights />
				</body>
			</html>
		</ConvexAuthNextjsServerProvider>
	);
}
