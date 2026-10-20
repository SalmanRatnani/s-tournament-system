import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let browser:SupabaseClient|null=null;
export function supabaseBrowser():SupabaseClient|null{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return null;
 if(!browser)browser=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});
 return browser;
}
export function supabaseServer():SupabaseClient{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("Database environment variables not configured");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
