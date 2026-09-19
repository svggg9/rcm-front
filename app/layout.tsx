import "./globals.css";
import { toastIcons } from "./components/ui/toastIcons";

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
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { Header } from "./components/Header/Header";
import { loadMenuCategories } from "./components/Header/menuCategories";
import { Footer } from "./components/Footer/Footer";
import { FormValidationBoundary } from "./components/ui/FormValidationBoundary";
import { FavoritesProvider } from "./lib/FavoritesContext";
import { AuthModalProvider } from "./components/AuthModal/AuthModalProvider";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "рцмаркет",
  applicationName: "рцмаркет",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menuCategories = await loadMenuCategories().catch(() => null);

  return (
    <html lang="ru" className={inter.variable}>
      <body>
        <FavoritesProvider>
          <AuthModalProvider>
            <div className="appShell">
              <Header initialCategories={menuCategories} />

              <FormValidationBoundary>
                {children}
              </FormValidationBoundary>
              <Footer />
            </div>

            <Toaster
              icons={toastIcons}
              position="bottom-center"
              duration={1500}
              className="rcmToaster"
              toastOptions={{
                closeButtonAriaLabel: "Закрыть уведомление",
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
