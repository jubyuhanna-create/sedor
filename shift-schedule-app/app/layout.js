import "./globals.css";

export const metadata = {
  title: "מסעדת רסיס — סידור עבודה",
  description: "מערכת סידור עבודה שבועית — מסעדת רסיס",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "רסיס",
  },
};

export const viewport = {
  themeColor: "#90d3d9",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-[#0c2635]">{children}</body>
    </html>
  );
}
