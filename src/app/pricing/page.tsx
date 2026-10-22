"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowRight,Check,ShieldCheck,Zap,HelpCircle} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {plans,quotePlan,formatInr,type BillingInterval} from "@/lib/billing/plans";

const questions=[
 {q:"Is payment live yet?",a:"No. This is a proposed launch catalogue for organiser feedback. We will not accept charges until merchant onboarding, verified webhooks, invoices, billing access rules and a reviewed launch are complete."},
 {q:"Will spectators pay to watch?",a:"No. Public tournament results and spectator viewing pages are designed to remain free. YouTube may show its own ads."},
 {q:"What happens to my existing badminton tournament?",a:"The existing badminton tournament stays in its current workspace. Multi-sport and organisation features will be migrated in stages, not switched on through an untested database rewrite."},
 {q:"Does this include registration or entry fees?",a:"No. These proposed prices are for organiser software access. Collecting participants' entry fees for organisers requires a separate payment and settlement product with additional provider approvals."},
 {q:"Are taxes included?",a:"The proposed INR prices exclude any applicable taxes. The final checkout must show the actual tax calculation and invoice details before payment."}
];
export default function Pricing(){
 const [interval,setInterval]=useState<"monthly"|"annual">("monthly");
 return <Shell mode="public" title="PRICING"><div className="content animate-in pricing-page">
  <div className="pricing-intro"><div className="eyebrow">BUILT FOR THE ORGANISERS BEHIND THE GAME</div><h1 className="pricing-title display">Great tournaments.<br/><span>Simple pricing.</span></h1><p>Run the competition. Empower your managers. Let the audience experience every moment.</p>
    <div className="pricing-preview-note" role="status"><ShieldCheck size={17}/> Proposed launch pricing — preview only. Payments and new organiser subscriptions are not enabled.</div>
  </div>
  <div className="pricing-switch" aria-label="Choose club billing term"><span>Pro plan billing</span><div role="group" aria-label="Billing interval"><button type="button" className={interval==="monthly"?"selected":""} aria-pressed={interval==="monthly"} onClick={()=>setInterval("monthly")}>Monthly</button><button type="button" className={interval==="annual"?"selected":""} aria-pressed={interval==="annual"} onClick={()=>setInterval("annual")}>Annual <span>Save ~17%</span></button></div></div>
  <div className="pricing-grid">{plans.map(plan=>{
    const cycle:BillingInterval=plan.id==="club"?interval:"event";
    const quote=quotePlan(plan.id,cycle);
    return <article className={"pricing-tier"+(plan.highlighted?" highlighted":"")} key={plan.id}>
      <div className="pricing-tier-top"><span className="pricing-tag">{plan.eyebrow}</span>{plan.highlighted&&<span className="pricing-recommended"><Zap size={12}/> EVENT FAVOURITE</span>}</div>
      <h2>{plan.name}</h2><p className="pricing-summary">{plan.summary}</p>
      <div className="pricing-value">{quote?<><strong>{formatInr(quote.amountInr)}</strong><span>/{quote.interval==="event"?(plan.id==="community"?"trial":"event"):quote.interval==="monthly"?"month":"year"}</span></>:<strong>Custom</strong>}</div>
      <p className="pricing-tax">{quote?"Indicative price · applicable taxes extra":"Contact-based pricing · final quote required"}</p>
      {plan.id==="community"?<Link href="/login" className="btn pricing-tier-cta">Explore staff login <ArrowRight size={15}/></Link>:
       plan.id==="enterprise"?<Link href="/checkout?plan=enterprise" className="btn pricing-tier-cta">Explore enterprise onboarding <ArrowRight size={15}/></Link>:
       <Link href={"/checkout?plan="+plan.id+"&interval="+cycle} className={"btn pricing-tier-cta"+(plan.highlighted?" btn-primary":"")}>Review plan <ArrowRight size={15}/></Link>}
      <div className="pricing-includes">PROPOSED CAPABILITIES</div><ul className="pricing-features">{plan.features.map(feature=><li key={feature}><Check size={16}/><span>{feature}</span></li>)}</ul>
    </article>;
  })}</div>
  <div className="pricing-bottom"><div><ShieldCheck size={22}/><strong>Designed to give organisers control</strong><p>Every organisation will have separate events, sport managers, referee permissions and branded public pages.</p></div><div><Zap size={22}/><strong>Pay for the software, not the audience</strong><p>Spectator access stays open. Streaming ingest and card payments are handled by the respective providers.</p></div></div>
  <section className="pricing-faq"><div className="eyebrow">BEFORE YOU CHOOSE</div><h2>Frequently asked questions</h2>{questions.map(item=><details key={item.q}><summary><HelpCircle size={17}/>{item.q}</summary><p>{item.a}</p></details>)}</section>
 </div></Shell>;
}
