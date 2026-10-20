/** Public YouTube LIVE/watch URLs only. Never accept stream/RTMP keys. */
export function youtubeVideoId(input:string):string|null{
 const value=input.trim();
 if(!value)return null;
 if(/^[a-zA-Z0-9_-]{11}$/.test(value))return value;
 try {
  const u=new URL(value);
  if(u.protocol!=="https:" || u.username || u.password)return null;
  const host=u.hostname.toLowerCase();
  let candidate:string|null=null;
  if(host==="youtu.be"||host==="www.youtu.be"){candidate=u.pathname.split("/")[1]||null;}
  else if(["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(host)){
   if(u.pathname==="/watch")candidate=u.searchParams.get("v");
   else if(/^\/(live|embed|shorts)\/[^/]+\/?$/.test(u.pathname))candidate=u.pathname.split("/")[2]||null;
  }
  return candidate&&/^[a-zA-Z0-9_-]{11}$/.test(candidate)?candidate:null;
 }catch{return null;}
}
export const youtubeWatchUrl=(videoId:string)=>"https://www.youtube.com/watch?v="+encodeURIComponent(videoId);
export const youtubeEmbedUrl=(videoId:string)=>"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(videoId)+"?rel=0";
