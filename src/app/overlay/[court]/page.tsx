import {notFound} from "next/navigation";
import {verifyOverlayToken} from "@/lib/overlay-token";
import OverlayClient from "./overlay-client";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export default async function OverlayPage({params,searchParams}:{params:Promise<{court:string}>;searchParams:Promise<{token?:string|string[]}>}){
 const [{court:raw},{token}]=await Promise.all([params,searchParams]);
 const court=Number(raw);
 if(!Number.isInteger(court)||typeof token!=="string"||!verifyOverlayToken(court,token))notFound();
 return <OverlayClient court={court}/>;
}
