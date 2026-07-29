import "./globals.css";

export const metadata = {
  title: "סידור עבודה",
  description: "מערכת סידור עבודה שבועית",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-gray-950">{children}</body>
    </html>
  );
}
