const fs = require('fs');
const path = require('path');

const assContent = `[Script Info]
Title: Vexaro SMM Master Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,34,&H00FFFFFF,&H0000FFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,1,3.5,2,2,40,40,75,1
Style: Chapter,Arial,22,&H0000FFFF,&H0000FFFF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,1,2.5,1.5,7,60,60,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:00.00,0:00:34.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 01:{\\c&HFFFFFF&} THE 15-YEAR-OLD DECISION
Dialogue: 1,0:00:34.00,0:00:50.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 02:{\\c&HFFFFFF&} 3:00 AM CODING & FAILED ORDERS
Dialogue: 1,0:00:50.00,0:01:44.50,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 03:{\\c&HFFFFFF&} THE ₨2,000 RESELLER ARBITRAGE
Dialogue: 1,0:01:44.50,0:02:20.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 04:{\\c&HFFFFFF&} THE ZERO-CAPITAL HUSTLE
Dialogue: 1,0:02:20.00,0:02:50.50,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 05:{\\c&HFFFFFF&} SOLVING PAKISTAN PAYMENTS
Dialogue: 1,0:02:50.50,0:03:20.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 06:{\\c&HFFFFFF&} 2:30 AM CRISIS & AUTO-FAILOVER
Dialogue: 1,0:03:20.00,0:04:20.89,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 07:{\\c&HFFFFFF&} VEXAROSMM.COM LAUNCH & BONUS

Dialogue: 0,0:00:00.00,0:00:02.80,Default,,0,0,0,,Jab main {\\c&HBAFF00&}15 saal{\\c&HFFFFFF&} ka hua...
Dialogue: 0,0:00:02.80,0:00:06.50,Default,,0,0,0,,...to mere paas {\\c&H00F0FF&}do raaste{\\c&HFFFFFF&} the.
Dialogue: 0,0:00:06.50,0:00:09.40,Default,,0,0,0,,Pehla raasta: school jaaun, homework karun...
Dialogue: 0,0:00:09.40,0:00:14.50,Default,,0,0,0,,...raat ko doston ke saath {\\c&HFF3366&}PUBG khelun{\\c&HFFFFFF&} ya {\\c&H00F0FF&}TikTok scroll{\\c&HFFFFFF&} karun.
Dialogue: 0,0:00:14.50,0:00:19.50,Default,,0,0,0,,Aur dusra raasta: ek aisi cheez banaun jo log kehte hain{\\c&HBAFF00&} 15 saal ka bachcha nahi bana sakta!{\\c&HFFFFFF&}
Dialogue: 0,0:00:19.50,0:00:23.50,Default,,0,0,0,,To maine dusra raasta chuna...
Dialogue: 0,0:00:23.50,0:00:27.50,Default,,0,0,0,,...zero investment ke saath ek {\\c&HBAFF00&}automated platform{\\c&HFFFFFF&} khada kar diya!
Dialogue: 0,0:00:27.50,0:00:30.50,Default,,0,0,0,,Jiska naam hai: {\\c&HBAFF00&}VEXARO SMM{\\c&HFFFFFF&}!
Dialogue: 0,0:00:30.50,0:00:34.00,Default,,0,0,0,,Jahan log seconds ke andar accounts grow karte hain.
Dialogue: 0,0:00:34.00,0:00:38.00,Default,,0,0,0,,Lekin yeh sab itna aasaan nahi tha.
Dialogue: 0,0:00:38.00,0:00:41.80,Default,,0,0,0,,Raat ke {\\c&HFF3366&}3 baje ki coding{\\c&HFFFFFF&}, failed orders...
Dialogue: 0,0:00:41.80,0:00:44.60,Default,,0,0,0,,...aur ghar walon ke taane...
Dialogue: 0,0:00:44.60,0:00:50.00,Default,,0,0,0,,...aur sab kuch khol kar batane wala hoon.
Dialogue: 0,0:00:50.00,0:00:54.50,Default,,0,0,0,,Pehle 1 minute mein samajhte hain ke yeh chakkar kya hai.
Dialogue: 0,0:00:54.50,0:00:58.50,Default,,0,0,0,,Aapne Instagram ya TikTok par dekha hoga...
Dialogue: 0,0:00:58.50,0:01:03.50,Default,,0,0,0,,...log kehte hain: {\\c&HFF3366&}'1000 followers le lo 2000 rupay mein!'{\\c&HFFFFFF&}
Dialogue: 0,0:01:03.50,0:01:08.00,Default,,0,0,0,,Aam log sochte hain banda khud follow karta hoga.
Dialogue: 0,0:01:08.00,0:01:12.50,Default,,0,0,0,,Aisa bilkul nahi hota! Internet ke peeche ek aisi duniya hai...
Dialogue: 0,0:01:12.50,0:01:17.50,Default,,0,0,0,,...jahan providers par wohi followers {\\c&HBAFF00&}50 ya 60 rupay{\\c&HFFFFFF&} ke milte hain!
Dialogue: 0,0:01:17.50,0:01:23.00,Default,,0,0,0,,Log bas beech mein 2000 ka bech kar {\\c&HFF3366&}1900 rupay ka margin{\\c&HFFFFFF&} le rahe hain.
Dialogue: 0,0:01:23.00,0:01:27.50,Default,,0,0,0,,Jab mujhe yeh pata chala, maine socha mehnge daam par kyun loon?
Dialogue: 0,0:01:27.50,0:01:33.00,Default,,0,0,0,,Main apna platform kyun na bana loon direct {\\c&HBAFF00&}wholesale prices{\\c&HFFFFFF&} par!
Dialogue: 0,0:01:33.00,0:01:37.00,Default,,0,0,0,,Lekin mere paas na lakhon rupay the, na office, na team.
Dialogue: 0,0:01:37.00,0:01:42.50,Default,,0,0,0,,Mere paas ek {\\c&H00F0FF&}purana laptop{\\c&HFFFFFF&} tha aur YouTube.
Dialogue: 0,0:01:42.50,0:01:47.50,Default,,0,0,0,,Din ke waqt school mein Physics aur Maths padhta...
Dialogue: 0,0:01:47.50,0:01:52.50,Default,,0,0,0,,...aur raat 12 baje se subah 4 baje tak website ka code likhta.
Dialogue: 0,0:01:52.50,0:01:58.00,Default,,0,0,0,,Meri ammi room mein aa kar bolti thin: {\\c&HFFCC00&}'Beta so jao, subah school jana hai.'{\\c&HFFFFFF&}
Dialogue: 0,0:01:58.00,0:02:03.00,Default,,0,0,0,,{\\c&HFFCC00&}'Yeh kya screen par safed kaali pattiyan dekh rahe ho?'{\\c&HFFFFFF&}
Dialogue: 0,0:02:03.00,0:02:08.50,Default,,0,0,0,,Unhein lagta tha timepass, lekin mere dimaag mein ek {\\c&HBAFF00&}junoon{\\c&HFFFFFF&} tha!
Dialogue: 0,0:02:08.50,0:02:13.50,Default,,0,0,0,,Maine faisla kiya main koi copy-paste website nahi banaunga.
Dialogue: 0,0:02:13.50,0:02:20.50,Default,,0,0,0,,Super fast website hogi, {\\c&H00F0FF&}dark cyber theme{\\c&HFFFFFF&}, mobile par 1 second mein open!
Dialogue: 0,0:02:20.50,0:02:25.50,Default,,0,0,0,,Website ban gayi, lekin ab aaya sabse mushkil boss: {\\c&HFF3366&}PAYMENTS!{\\c&HFFFFFF&}
Dialogue: 0,0:02:25.50,0:02:30.50,Default,,0,0,0,,Bahar ke mulkon mein card use hota hai aur kaam khatam.
Dialogue: 0,0:02:30.50,0:02:36.50,Default,,0,0,0,,Lekin Pakistan mein 99% log kehte hain: {\\c&H00F0FF&}'EasyPaisa se chalega? JazzCash bhejo!'{\\c&HFFFFFF&}
Dialogue: 0,0:02:36.50,0:02:41.50,Default,,0,0,0,,School mein baitha hoon, teacher board par likh raha hai...
Dialogue: 0,0:02:41.50,0:02:46.50,Default,,0,0,0,,...aur pocket mein phone vibrate: {\\c&HBAFF00&}'Bhai funds add karne hain.'{\\c&HFFFFFF&}
Dialogue: 0,0:02:46.50,0:02:51.50,Default,,0,0,0,,Maine raat ko baith kar {\\c&HBAFF00&}automatic deposit system{\\c&HFFFFFF&} banaya!
Dialogue: 0,0:02:51.50,0:02:57.00,Default,,0,0,0,,Button dabate hi wallet automatically recharge ho jata hai!
Dialogue: 0,0:02:57.00,0:03:01.00,Default,,0,0,0,,Saath mein crypto aur Binance bhi integrate kiya.
Dialogue: 0,0:03:01.00,0:03:06.00,Default,,0,0,0,,Lekin kahani itni seedhi nahi thi. Ek raat laga sab khatam ho gaya.
Dialogue: 0,0:03:06.00,0:03:11.50,Default,,0,0,0,,Raat ke 2:30 baje the: {\\c&HFF3366&}Ek supplier ka server down ho gaya!{\\c&HFFFFFF&}
Dialogue: 0,0:03:11.50,0:03:16.50,Default,,0,0,0,,Customer ke paise cut gaye lekin order aage nahi gaya.
Dialogue: 0,0:03:16.50,0:03:22.00,Default,,0,0,0,,WhatsApp message: {\\c&HFF3366&}'Bhai mere paise kahan gaye? Police mein report karunga!'{\\c&HFFFFFF&}
Dialogue: 0,0:03:22.00,0:03:27.50,Default,,0,0,0,,Main 15 saal ka bachcha, raat ke 2 baje paseene chhoot rahe the...
Dialogue: 0,0:03:27.50,0:03:32.00,Default,,0,0,0,,Call ki, paise wapas kiye aur maafi maangi.
Dialogue: 0,0:03:32.00,0:03:37.00,Default,,0,0,0,,Usi raat maine banaya: {\\c&HBAFF00&}THE AUTO-BACKUP FAILOVER SYSTEM!{\\c&HFFFFFF&}
Dialogue: 0,0:03:37.00,0:03:42.50,Default,,0,0,0,,Ek server band ho to system khud doosre server par shift ho jata hai!
Dialogue: 0,0:03:42.50,0:03:46.00,Default,,0,0,0,,Customer ko pata bhi nahi chalta, aur order deliver ho jata hai.
Dialogue: 0,0:03:46.00,0:03:51.00,Default,,0,0,0,,Aur phir aaya official launch: {\\c&HBAFF00&}VEXAROSMM.COM!{\\c&HFFFFFF&}
Dialogue: 0,0:03:51.00,0:03:56.50,Default,,0,0,0,,500+ services: TikTok viral boosts, Instagram, YouTube watchtime!
Dialogue: 0,0:03:56.50,0:04:02.00,Default,,0,0,0,,24 ghante ki live human WhatsApp support, taake 1 rupaya bhi na phanse!
Dialogue: 0,0:04:02.00,0:04:07.50,Default,,0,0,0,,Internet par koi farq nahi padta aap 15 saal ke ho ya 30 saal ke.
Dialogue: 0,0:04:07.50,0:04:12.00,Default,,0,0,0,,Internet sirf yeh dekhta hai: {\\c&HBAFF00&}kya aapko kaam karna aata hai ya nahi!{\\c&HFFFFFF&}
Dialogue: 0,0:04:12.00,0:04:16.50,Default,,0,0,0,,Roz ke 2 ghante real skill seekho to apni zindagi badal sakte ho.
Dialogue: 0,0:04:16.50,0:04:20.89,Default,,0,0,0,,Visit {\\c&HBAFF00&}vexarosmm.com{\\c&HFFFFFF&} | Like & Subscribe! Allah Hafiz.
`;

const outputPath = path.join(__dirname, '..', 'public', 'subtitles_master.ass');
fs.writeFileSync(outputPath, assContent, 'utf8');
console.log('✓ Created subtitles file at:', outputPath);
