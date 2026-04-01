import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

/**
 * Nunito — Google Fonts fallback for "Arial Rounded MT Bold".
 * Shares the same rounded, friendly character as the brand title font.
 * Applied via CSS variable so the @theme --font-title stack can reference it.
 */
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Allergy Madness — The Digital Allergy Test by Champ Allergy",
  description:
    "Discover your top allergen triggers with Allergy Madness, a free predictive allergy screening tool by Champ Allergy.",
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
    <html lang="en" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
