-- Development-only sample data. DO NOT run on tournament production data.
with t as (
 insert into public.tournaments(name,type,status,venue,starts_on)
 values('S Championship 2026','mixed','live','Main Arena',current_date)
 returning id
)
insert into public.matches(tournament_id,court_id,round,kind,side_a,side_b,status,score_a,score_b,games,current_game)
select t.id,v.court,v.round,v.kind,v.a,v.b,'live',v.sa,v.sb,v.games::jsonb,v.current_game
from t cross join (values
 (1,'MEN''S SINGLES • QUARTERFINAL','singles','Arjun Mehta','Rohan Shah',18,16,'[{"a":21,"b":17}]',2),
 (2,'WOMEN''S DOUBLES • SEMIFINAL','doubles','Ananya / Priya','Sara / Riya',12,14,'[]',1),
 (3,'TEAM EVENT • RUBBER 2','singles','Falcons • Kabir','Titans • Vivaan',9,10,'[{"a":19,"b":21}]',2)
) as v(court,round,kind,a,b,sa,sb,games,current_game);
