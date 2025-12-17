import "./globals.css";
import { Header } from "./components/Header/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        {/* ШАПКА НА ВСЕХ СТРАНИЦАХ */}
        <Header />

        {/* КОНТЕНТ СТРАНИЦ */}
        {children}
      </body>
    </html>
  );
}