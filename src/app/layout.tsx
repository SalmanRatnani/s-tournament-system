import type { Metadata,Viewport } from "next";
import "./globals.css";
export const metadata:Metadata={title:{default:"S Tournament | Live badminton",template:"%s | S Tournament"},description:"The modern badminton tournament control center. Live court scoring, match tracking and broadcast overlays."};
export const viewport:Viewport={width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
