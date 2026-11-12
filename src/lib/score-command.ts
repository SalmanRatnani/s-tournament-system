export type ScoreCommand={tieId:string;game:number;side:"a"|"b";action:"point"|"undo";expectedVersion:number;requestId:string};
export class ScoreCommandError extends Error{
 constructor(message:string,public uncertain:boolean){super(message);}
}
/** Retries reuse the exact request ID and version, so a lost response cannot add twice. */
export async function sendMBBLCommand(command:ScoreCommand,token:string){
 const body=JSON.stringify(command);
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch("/api/mbbl/score",{method:"POST",signal:controller.signal,
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body});
   const result=await response.json();
   if(!response.ok){
    if(response.status<500)throw new ScoreCommandError(result.error||"Score rejected",false);
    throw Error("Server did not confirm the point");
   }
   return result.result as {tie_id:string;game:number;score_a:number;score_b:number;version:number;replayed:boolean};
  }catch(error){
   if(error instanceof ScoreCommandError)throw error;
   if(attempt===1)throw new ScoreCommandError("The server has not confirmed this command. Retry it before entering another point.",true);
  }finally{clearTimeout(timer);}
 }
 throw new ScoreCommandError("Score confirmation unavailable",true);
}
