import "./globals.css";

import "./styles/tokens.css";
import "./styles/typography.css";

import "./styles/layout.css";
import "./styles/sections.css";
import "./styles/cards.css";
import "./styles/lists.css";
import "./styles/tables.css";
import "./styles/navigation.css";
import "./styles/buttons.css";
import "./styles/forms.css";
import "./styles/badges.css";
import "./styles/states.css";
import "./styles/modals.css";
import "./styles/loaders.css";
import "./styles/media.css";
import "./styles/utils.css";
import "./styles/sticky.css";
import "./styles/toasts.css";
import "./styles/empty.css";
import "./styles/alerts.css";
import "./styles/skeletons.css";
import "./styles/actions.css";

import { Inter } from "next/font/google";
import { Toaster } from "sonner";

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

              <main className="appMain">
                {children}
              </main>
            </div>

            <Toaster
              position="bottom-center"
              className="rcmToaster"
              toastOptions={{
                classNames: {
                  toast: "rcmToast",
                  title: "rcmToastTitle",
                  description: "rcmToastDescription",
                  actionButton: "rcmToastAction",
                  cancelButton: "rcmToastCancel",
                },
              }}
            />
          </AuthModalProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}