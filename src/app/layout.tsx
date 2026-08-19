import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppSettingsProvider from "@/components/AppSettings/AppSettingsProvider";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "TIL - Today I Learned",
    description: "Catatan pribadi dari hal-hal yang saya pelajari setiap hari",
    keywords: ["today i learned", "TIL", "catatan", "belajar", "programming"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id">
            <body className={inter.className}>
                <AppSettingsProvider>
                    {children}
                </AppSettingsProvider>
            </body>
        </html>
    );
}
