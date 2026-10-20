import type {User} from "@supabase/supabase-js";

/** Auth providers must verify the email; display names/user metadata never grant staff permissions. */
export function isEmailVerified(user:Pick<User,"email"|"email_confirmed_at">|null|undefined):boolean{
 return Boolean(user?.email && user.email_confirmed_at);
}
export function staffDestination(role:unknown):"/admin"|"/referee"|null{
 return role==="owner"?"/admin":role==="referee"?"/referee":null;
}
