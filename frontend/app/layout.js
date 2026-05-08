import "./globals.css";

export const metadata = {
  title: "Structure Monitor",
  description: "Detect HTML structure changes with automated checks"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
