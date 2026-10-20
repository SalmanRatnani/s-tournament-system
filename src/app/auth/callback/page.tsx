"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Shell,PageHeading} from "@/components/shell";
import {supabaseBrowser} from "@/lib/supabase";
export default function AuthCallback(){
 const router=useRouter();const [message,setMessage]=useState("Confirming sign-in…");const [error,setError]=useState(false);
 useEffect(()=>{
  let active=true;
  async function finish(){
   try{
    const db=supabaseBrowser();if(!db)throw Error("Authentication is not configured.");
    const params=new URLSearchParams(window.location.search);
    const code=params.get("code");
    if(code){const {error}=await db.auth.exchangeCodeForSession(code);if(error)throw error;}
    const {data:{user},error}=await db.auth.getUser();
    if(error||!user)throw Error("Could not complete sign-in. Please try again.");
    if(!user.email_confirmed_at){await db.auth.signOut();throw Error("Verify your email address before accessing staff tools.");}
    const {data:profile,error:profileError}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profileError)throw Error("Unable to verify staff role.");
    if(!active)return;
    if(profile?.role!=="owner"&&profile?.role!=="referee"){
     await db.auth.signOut();
     setError(true);setMessage("This account is verified, but it is not approved as Main Controller or Referee. Ask the Main Controller to approve your account.");
     return;
    }
    router.replace(profile.role==="owner"?"/admin":"/referee");router.refresh();
   }catch(e){if(active){setError(true);setMessage(e instanceof Error?e.message:"Could not complete sign-in.");}}
  }
  void finish();return()=>{active=false;};
 },[router]);
 return <Shell title="STAFF VERIFICATION" mode="auth"><div className="content"><PageHeading eyebrow="SECURE SIGN-IN" title={error?"Access pending":"Verifying your account"} subtitle={message}/><div className="panel panel-pad form-card"><Link className="btn" href="/login">Back to staff login</Link> <Link className="btn" href="/live">Watch the tournament</Link></div></div></Shell>;
}
