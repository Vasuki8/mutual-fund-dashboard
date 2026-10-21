import "./globals.css";
import type { ReactNode } from "react";
export const metadata={title:"FundScope — Indian mutual fund research",description:"Research Indian mutual funds with historical NAV data, risk analysis and regularly updated market data."};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>;}
