import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IdentityKitProvider } from "@nfid/identitykit/react";

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
        <IdentityKitProvider
          authType="DELEGATION"
          signerClientOptions={{
            targets: [
              process.env.NEXT_PUBLIC_CANISTER_ID || "",
            ],
          }}
        >
          {children}
        </IdentityKitProvider>
      </body>
    </html>
  );
}
