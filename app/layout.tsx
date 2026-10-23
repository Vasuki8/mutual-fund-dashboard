import "./globals.css";
import type { ReactNode } from "react";
export const metadata={title:"FundScope — Indian mutual fund research",description:"Research Indian mutual funds with available MFAPI NAV histories, risk analysis and fund comparisons."};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{if(localStorage.getItem('fundscope-appearance-v1')==='dark')document.documentElement.dataset.appearance='dark';}catch{}"}}/></head><body>{children}</body></html>;}
