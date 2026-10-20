import {redirect} from "next/navigation";
/** Spectators never register; staff accounts are privately provisioned. */
export default function Register(){redirect("/login");}
