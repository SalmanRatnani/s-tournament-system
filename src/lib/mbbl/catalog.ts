/** MBBL Season 1 announcement transcription, sourced from six supplied roster posters.
 * Official spellings and owner names should be verified by organiser before fixtures are locked.
 * Poster sources are image(5).png through image(10).png (original user uploads).
 */
export const MBBL_SEASON_NAME="Mira-Bhayandar Badminton League — Season 1";
export const MBBL_RULEBOOK_VERSION="MBBL-S1-2026-user-upload";
export const MBBL_CATEGORY_ORDER=["A+","A1","A2","A3","B1","B2","B3","B4","B5","C1","C2","C3","C4","K1","K2","W1","W2","G1"] as const;
export type MBBLCategory=typeof MBBL_CATEGORY_ORDER[number];
export type MBBLPlayer={category:MBBLCategory;name:string};
export type MBBLTeam={slug:string;name:string;owners:readonly string[];accent:string;poster:string;players:readonly MBBLPlayer[]};
function buildRoster(names:readonly string[]):MBBLPlayer[]{
 if(names.length!==MBBL_CATEGORY_ORDER.length)throw Error("MBBL requires exactly 18 roster names");
 return names.map((name,i)=>({category:MBBL_CATEGORY_ORDER[i],name}));
}
export const MBBL_TEAMS:readonly MBBLTeam[]=[
 {slug:"asha-smashers",name:"Asha Smashers",owners:["Dr Mahesh Salunke"],accent:"#fd4055",poster:"image(5).png",players:buildRoster(["Justin","Prateek M","Arun","Clint","Ayush K","Maj. Dr Harshad","Krish Jain","Shreyas Shetty","Shubh Handa","Hardik P","Sandeep Gupta","Sonu Singh","Suchit Patil","Venessa","Paridhi","Christy","Preeti","Dr Mahesh Salunke"])},
 {slug:"tsar-strikers",name:"TSAR Strikers",owners:["Sanjeev Prasad"],accent:"#e93744",poster:"image(6).png",players:buildRoster(["Aarav","Akash Shukla","Allan","Jack Dsouza","Sanjeev Prasad","Deeyan Poojari","Amit Agarwal","Ayan Khan","Keanan Dcosta","Omkar Rakvi","Shashank Sharma","Dr Vijay Kedar","Deep Doshi","Yuvraj Singh","Rudra","Sonica","Maya","Suraj Singh Rawat"])},
 {slug:"shuttle-psychos",name:"Shuttle Psychos",owners:["Sasidhar Reddy"],accent:"#ff8f2d",poster:"image(7).png",players:buildRoster(["Prathamesh","Atul","Ansh","Sasidhar Reddy","Jayprakash","Aman Mohmad","Parth Amal","Ishit Jain","Vikas Pradhan","Collice","Narendra Kumawat","Vatsal Parikh","Vivek","Shain Charlie","Teesha","Leena","Ankita","Mario Fernades"])},
 {slug:"mb-baddy-group",name:"MB Baddy Group",owners:["Hazel","Abhishek"],accent:"#e8c62d",poster:"image(8).png",players:buildRoster(["Vinit","Sanskar","Durgesh","Ajay","Salman","Aedaan","Sohel","Rahul Malik","Shreyansh Bohra","Harsh Chhaparia","Sanal Fernades","Ashish Bobade","Shubham Sartape","Dhani","Hasnain Ali","Joyline","Hazel","Kumar Gandharva Singh"])},
 {slug:"bad-minions",name:"Bad Minions",owners:["Lloyd Michael"],accent:"#ffd020",poster:"image(9).png",players:buildRoster(["Karan Shetty","Akaash Supal","Lloyd","Atharva Gupta","Prakhar Jalan","Atharva Jadhav","Pratham Hari","Pawan Poojari","Sujit Nair","Amaan Kapadia","Somesh","Prakash Ahuja","Anurag Pandey","Vaidik","Aniya","Nidhi Thaker","Priyal","Krishna Bhandari"])},
 {slug:"supreme-aces",name:"Supreme Aces",owners:["Sidon Hanso","Manish Naik"],accent:"#b5f12b",poster:"image(10).png",players:buildRoster(["Sidon","Balraj","Veeransh","Chetas","Mayuresh Mhatre","Manish","Rishabh Pandey","Shashank Gavandi","Anuj Maurya","Dheer","Vishal Kapur","Sagar Aswal","Mohit Jain","Taksh","Yashica","Sakshi","Sneha","Ajit Yadav"])}
] as const;
export const MBBL_ROSTER_COUNTS={teams:6,playersPerTeam:18,playersTotal:108} as const;
export function getMBBLTeam(slug:string){return MBBL_TEAMS.find(t=>t.slug===slug)||null;}
