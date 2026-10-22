import type { Metadata,Viewport } from "next";
import "./globals.css";
export const metadata:Metadata={metadataBase:new URL("https://s-tournament-system.vercel.app"),applicationName:"S Tournament",title:{default:"S Tournament | The Multi-Sport Platform",template:"%s | S Tournament"},description:"Tournament operations, sports scoring, live broadcasts and organiser tools in one platform.",icons:{icon:[{url:"/icon.svg",type:"image/svg+xml"},{url:"/brand/icon.svg",type:"image/svg+xml"}],shortcut:"/icon.svg"},openGraph:{type:"website",title:"S Tournament | The Multi-Sport Platform",description:"Organise. Manage. Stream. Grow.",siteName:"S Tournament",images:["/brand/social-card.svg"]},twitter:{card:"summary_large_image",images:["/brand/social-card.svg"]}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#0a1224"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
