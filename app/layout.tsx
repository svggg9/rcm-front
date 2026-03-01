import "./globals.css";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/layout.css";

import { Inter } from "next/font/google";
import { Header } from "./components/Header/Header";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>
        <div className="appShell">
          {/* ШАПКА НА ВСЕХ СТРАНИЦАХ */}
          <Header />

          {/* КОНТЕНТ СТРАНИЦ */}
          <main className="appMain">{children}</main>
        </div>
      </body>
    </html>
  );
}