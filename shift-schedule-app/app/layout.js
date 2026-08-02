import { Heebo } from "next/font/google";
import "./globals.css";
import { UIProvider } from "../components/UIProvider";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
});

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
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="bg-[#0c2635] font-sans">
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
