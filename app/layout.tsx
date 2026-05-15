import "./globals.css";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/layout.css";
import "./styles/buttons.css";
import "./styles/forms.css";
import "./styles/sections.css";
import "./styles/tables.css";
import "./styles/badges.css";

import { Inter } from "next/font/google";
import { Header } from "./components/Header/Header";
import { FavoritesProvider } from "./lib/FavoritesContext";
import { AuthModalProvider } from "./components/AuthModal/AuthModalProvider";

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
        <FavoritesProvider>
          <AuthModalProvider>
          <div className="appShell">
            <Header />
            <main className="appMain">{children}</main>
          </div>
          </AuthModalProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}