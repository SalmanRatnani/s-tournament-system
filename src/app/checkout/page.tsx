import Link from "next/link";
import {ArrowLeft,ArrowRight,Check,LockKeyhole,ShieldCheck} from "lucide-react";
import {Shell} from "@/components/shell";
import {formatInr,getPlan,quotePlan,type BillingInterval} from "@/lib/billing/plans";

export const dynamic="force-dynamic";
type Props={searchParams:Promise<{plan?:string;interval?:string}>};
export default async function Checkout({searchParams}:Props){
 const params=await searchParams;
 const plan=getPlan(params.plan);
 const interval:BillingInterval=params.interval==="annual"?"annual":params.interval==="monthly"?"monthly":"event";
 const quote=plan?quotePlan(plan.id,interval):null;
 return <Shell title="SECURE CHECKOUT" mode="public"><div className="content animate-in checkout-page">
  <Link href="/pricing" className="checkout-back"><ArrowLeft size={16}/> Back to pricing</Link>
  <div className="checkout-intro"><span className="eyebrow">ORGANISER BILLING</span><h1 className="headline display">Plan checkout</h1><p className="subline">Preview the subscription structure. No payment information is requested while commerce is offline.</p></div>
  {!plan?<div className="panel panel-pad checkout-invalid"><h2>Choose a plan first</h2><p>Open the pricing page and select an organiser plan to review it here.</p><Link href="/pricing" className="btn btn-primary">View plans <ArrowRight size={15}/></Link></div>:
  <div className="checkout-layout">
   <section className="panel panel-pad checkout-summary" aria-labelledby="checkout-summary"><div className="eyebrow">YOUR SELECTION</div><h2 id="checkout-summary">{plan.name}</h2><p className="subline">{plan.summary}</p>
    <div className="checkout-line"><span>Plan</span><strong>{plan.name}</strong></div><div className="checkout-line"><span>Billing cycle</span><strong>{quote?quote.interval==="annual"?"Annual":quote.interval==="monthly"?"Monthly":"Per event":"By quotation"}</strong></div><div className="checkout-line"><span>Indicative subtotal</span><strong>{quote?formatInr(quote.amountInr):"Custom"}</strong></div>
    <div className="checkout-line"><span>Taxes</span><strong>Calculated at launch</strong></div>
    <div className="checkout-total"><span>Proposed price before taxes</span><strong>{quote?formatInr(quote.amountInr):"Quote required"}</strong></div>
    <p className="help-note">Prices are proposals, not binding offers. Actual invoices will show legal entity, customer billing information, taxes and the final payable amount.</p>
   </section>
   <section className="panel panel-pad checkout-gate" aria-labelledby="checkout-heading"><div className="checkout-lock"><LockKeyhole size={26}/></div><div className="eyebrow">PAYMENT SYSTEM UNDER PREPARATION</div><h2 id="checkout-heading">Payments aren't enabled yet.</h2><p>We're building secure organisation billing before accepting card or UPI payments. Your plan selection does not create an account, reservation, invoice or charge.</p>
    <div className="checkout-safeguards"><div><Check size={17}/> Organisation owner must approve the purchase</div><div><Check size={17}/> Provider-hosted payment, no card storage</div><div><Check size={17}/> Verified receipts and invoice history</div><div><Check size={17}/> Cancellation, refund and access controls</div></div>
    <button type="button" disabled className="btn btn-primary checkout-disabled" aria-describedby="checkout-status">Secure payment — unavailable</button>
    <p id="checkout-status" className="help-note">No payment gateway is connected to the production platform. No charges can be submitted from this page.</p>
    <Link href="/pricing" className="checkout-secondary">Compare other plans <ArrowRight size={14}/></Link>
   </section>
  </div>}
  <div className="checkout-foot"><ShieldCheck size={19}/><span>When launched, subscriptions will be linked to the organisation—not to a tournament participant or referee.</span></div>
 </div></Shell>;
}
