import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allergy Madness — The Digital Allergy Test by Champ Health",
  description:
    "Discover your top allergen triggers with Allergy Madness, a free predictive allergy screening tool by Champ Health.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
