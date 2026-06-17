import Script from "next/script";

export default function ItemRecordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
      {children}
    </>
  );
}
