import "./globals.css";

export const metadata = {
  title: "מסעדת רסיס — סידור עבודה",
  description: "מערכת סידור עבודה שבועית — מסעדת רסיס",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-[#0c2635]">{children}</body>
    </html>
  );
}
