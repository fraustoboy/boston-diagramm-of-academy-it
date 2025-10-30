export const metadata = { title: "BCG Matrix" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ background: "#f8fafc", color: "#0f172a", margin: 0 }}>{children}</body>
    </html>
  );
}
