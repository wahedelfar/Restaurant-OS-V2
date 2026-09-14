export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar">
      <body style={{margin:0}}>{children}</body>
    </html>
  );
}
