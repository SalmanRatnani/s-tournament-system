/**
 * PROPOSED commercial catalogue (October 2026). These are not live entitlements.
 * This product has no active checkout or merchant configuration.
 *
 * Never trust client-provided amounts or plan IDs for payment creation.
 * When billing launches, snapshot the server-side catalogue version and amount
 * in an organization-scoped invoice/checkout intent BEFORE redirecting to PSP.
 */
export type PlanId="community"|"event"|"club"|"enterprise";
export type BillingInterval="event"|"monthly"|"annual";
export type PlanSpec={
 id:PlanId;
 name:string;
 eyebrow:string;
 summary:string;
 highlighted:boolean;
 features:readonly string[];
};
export const CATALOG_VERSION="2026-10-proposal-1";
export const plans:readonly PlanSpec[]=[
 {id:"community",name:"Community",eyebrow:"DISCOVER THE PLATFORM",summary:"Explore tournament workflows before launching a paid event.",highlighted:false,features:["Explore one tournament workspace","Public event and results pages","Core fixtures and score tracking","Community support"]},
 {id:"event",name:"Event Pass",eyebrow:"FOR ONE CHAMPIONSHIP",summary:"Best for clubs, schools and organisers running occasional events.",highlighted:true,features:["One paid tournament activation","Multi-sport event configuration","Delegated event managers and officials","Live scoring and public pages","Court or field broadcast links","Event branding and sponsor graphics"]},
 {id:"club",name:"Organiser Pro",eyebrow:"FOR RECURRING EVENTS",summary:"For organisations running several tournaments through the year.",highlighted:false,features:["Multiple concurrent events (policy TBD)","Sport managers and event managers","Central organisation dashboard","Registration and roster workflows","Broadcast and overlay studio","Priority operational support (subject to launch terms)"]},
 {id:"enterprise",name:"Enterprise",eyebrow:"FOR LEAGUES & FEDERATIONS",summary:"Custom rollout, contract terms and support for larger sports programmes.",highlighted:false,features:["Tailored usage and staff limits","Multi-venue operations","Custom branding and domains","Advanced audit and reporting","Custom onboarding and service terms"]}
] as const;
/** Illustrative INR list prices, before any applicable taxes. */
export const PROPOSED_PRICES_INR={
 community:{event:0},
 event:{event:1499},
 club:{monthly:2999,annual:29990}
} as const;
export function getPlan(id:unknown):PlanSpec|null{return typeof id==="string"?plans.find(p=>p.id===id)||null:null;}
export function quotePlan(id:PlanId,interval:BillingInterval){
 if(id==="community")return interval==="event"?{amountInr:0,interval:"event" as const}:null;
 if(id==="event")return interval==="event"?{amountInr:PROPOSED_PRICES_INR.event.event,interval:"event" as const}:null;
 if(id==="club")return interval==="monthly"?{amountInr:PROPOSED_PRICES_INR.club.monthly,interval:"monthly" as const}:interval==="annual"?{amountInr:PROPOSED_PRICES_INR.club.annual,interval:"annual" as const}:null;
 return null;
}
export function formatInr(amountInr:number){return "₹"+amountInr.toLocaleString("en-IN");}
