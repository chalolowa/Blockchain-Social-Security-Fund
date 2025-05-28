import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Decentralized Social Security Fund",
  description: "Decentralized Social Security Fund",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
