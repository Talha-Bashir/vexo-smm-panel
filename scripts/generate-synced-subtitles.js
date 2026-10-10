const fs = require('fs');
const path = require('path');

const assContent = `[Script Info]
Title: Vexaro SMM Synced Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,36,&H00FFFFFF,&H0000FFFF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,1,3.8,2,2,40,40,75,1
Style: Chapter,Arial,22,&H0000FFFF,&H0000FFFF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,1,2.5,1.5,7,60,60,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:00.00,0:00:34.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 01:{\\c&HFFFFFF&} THE 15-YEAR-OLD DECISION
Dialogue: 1,0:00:34.00,0:00:50.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 02:{\\c&HFFFFFF&} 3:00 AM CODING & FAILED ORDERS
Dialogue: 1,0:00:50.00,0:01:40.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 03:{\\c&HFFFFFF&} THE ₨2,000 RESELLER ARBITRAGE
Dialogue: 1,0:01:40.00,0:02:22.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 04:{\\c&HFFFFFF&} THE ZERO-CAPITAL HUSTLE
Dialogue: 1,0:02:22.00,0:02:59.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 05:{\\c&HFFFFFF&} SOLVING PAKISTAN PAYMENTS
Dialogue: 1,0:02:59.00,0:03:40.00,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 06:{\\c&HFFFFFF&} 2:30 AM CRISIS & AUTO-FAILOVER
Dialogue: 1,0:03:40.00,0:04:20.89,Chapter,,0,0,0,,{\\c&HBAFF00&}⚡ CHAPTER 07:{\\c&HFFFFFF&} VEXAROSMM.COM LAUNCH & BONUS

Dialogue: 0,0:00:00.00,0:00:02.80,Default,,0,0,0,,Jab main {\\c&HBAFF00&}15 saal{\\c&HFFFFFF&} ka hua...
Dialogue: 0,0:00:02.85,0:00:08.94,Default,,0,0,0,,...to mere paas {\\c&H00F0FF&}do raaste{\\c&HFFFFFF&} the. Pehla raasta: school jaaun, homework karun...
Dialogue: 0,0:00:09.25,0:00:16.11,Default,,0,0,0,,...aur raat ko doston ke saath {\\c&HFF3366&}PUBG khelun{\\c&HFFFFFF&} ya {\\c&H00F0FF&}TikTok scroll{\\c&HFFFFFF&} karun.
Dialogue: 0,0:00:16.30,0:00:25.93,Default,,0,0,0,,Aur dusra raasta: ek aisi cheez banaun jo log kehte hain{\\c&HBAFF00&} 15 saal ka bachcha nahi bana sakta!{\\c&HFFFFFF&}
Dialogue: 0,0:00:26.05,0:00:29.20,Default,,0,0,0,,To maine dusra raasta chuna, aur zero investment ke saath...
Dialogue: 0,0:00:29.40,0:00:33.77,Default,,0,0,0,,...ek automated platform khada kar diya, jiska naam hai {\\c&HBAFF00&}VEXARO SMM!{\\c&HFFFFFF&}
Dialogue: 0,0:00:34.30,0:00:37.76,Default,,0,0,0,,...jahan log seconds ke andar accounts grow karte hain.
Dialogue: 0,0:00:38.00,0:00:41.48,Default,,0,0,0,,Lekin yeh sab itna aasaan nahi tha.
Dialogue: 0,0:00:41.65,0:00:44.16,Default,,0,0,0,,Raat ke {\\c&HFF3366&}3 baje ki coding{\\c&HFFFFFF&}, failed orders...
Dialogue: 0,0:00:44.35,0:00:48.95,Default,,0,0,0,,...aur ghar walon ke taane...
Dialogue: 0,0:00:49.05,0:00:55.10,Default,,0,0,0,,...aur sab kuch khol kar batane wala hoon.
Dialogue: 0,0:00:55.15,0:01:01.34,Default,,0,0,0,,Pehle 1 minute mein samajhte hain ke yeh chakkar kya hai.
Dialogue: 0,0:01:01.55,0:01:05.73,Default,,0,0,0,,Aapne Instagram ya TikTok par dekha hoga, log kehte hain...
Dialogue: 0,0:01:05.90,0:01:07.77,Default,,0,0,0,,Bhai, 1000 followers le lo...
Dialogue: 0,0:01:07.77,0:01:10.89,Default,,0,0,0,,{\\c&HFF3366&}...2000 rupay mein!{\\c&HFFFFFF&}
Dialogue: 0,0:01:11.35,0:01:16.15,Default,,0,0,0,,Ab aam log sochte hain banda khud baith kar follow karta hoga.
Dialogue: 0,0:01:16.30,0:01:18.64,Default,,0,0,0,,{\\c&HFF3366&}Aisa bilkul nahi hota!{\\c&HFFFFFF&}
Dialogue: 0,0:01:18.80,0:01:24.74,Default,,0,0,0,,Asal mein internet ke peeche providers par wohi followers {\\c&HBAFF00&}50 ya 60 rupay{\\c&HFFFFFF&} ke milte hain!
Dialogue: 0,0:01:25.25,0:01:31.78,Default,,0,0,0,,Log bas beech mein 2000 ka bech kar {\\c&HFF3366&}1900 rupay ka margin{\\c&HFFFFFF&} le rahe hain!
Dialogue: 0,0:01:32.00,0:01:40.10,Default,,0,0,0,,Jab pata chala, maine socha mehnge daam par kyun loon? Main apna platform kyun na bana loon direct wholesale prices par!
Dialogue: 0,0:01:40.25,0:01:49.82,Default,,0,0,0,,Lekin mere paas na koi lakhon rupay the, na office aur na hi koi team.
Dialogue: 0,0:01:50.05,0:01:54.18,Default,,0,0,0,,Mere paas ek {\\c&H00F0FF&}purana laptop{\\c&HFFFFFF&} tha aur YouTube.
Dialogue: 0,0:01:54.25,0:02:01.42,Default,,0,0,0,,Din ke waqt school mein Physics Maths, aur raat 12 baje se subah 4 baje tak website ka code likhta.
Dialogue: 0,0:02:01.55,0:02:08.89,Default,,0,0,0,,Meri ammi room mein aa kar bolti thin: {\\c&HFFCC00&}'Beta so jao, yeh kya screen par safed kaali pattiyan dekh rahe ho?'{\\c&HFFFFFF&}
Dialogue: 0,0:02:09.05,0:02:14.82,Default,,0,0,0,,Unhein lagta tha timepass, lekin mere dimaag mein ek {\\c&HBAFF00&}junoon{\\c&HFFFFFF&} tha!
Dialogue: 0,0:02:15.00,0:02:21.71,Default,,0,0,0,,Maine faisla kiya main koi copy-paste website nahi banaunga.
Dialogue: 0,0:02:22.00,0:02:32.25,Default,,0,0,0,,Super fast website hogi, {\\c&H00F0FF&}dark cyber theme{\\c&HFFFFFF&}, mobile par 1 second mein open! Website ban gayi, lekin ab aaya sabse mushkil boss: {\\c&HFF3366&}PAYMENTS!{\\c&HFFFFFF&}
Dialogue: 0,0:02:32.55,0:02:40.97,Default,,0,0,0,,Bahar ke mulkon mein card use hota hai. Lekin Pakistan mein 99% log kehte hain...
Dialogue: 0,0:02:41.15,0:02:51.73,Default,,0,0,0,,{\\c&H00F0FF&}'Bhai EasyPaisa se chalega? JazzCash bhejo! Payment transfer kar di hai, balance add karo!'{\\c&HFFFFFF&}
Dialogue: 0,0:02:51.90,0:02:54.81,Default,,0,0,0,,School mein baitha hoon, teacher board par likh raha hai...
Dialogue: 0,0:02:54.85,0:02:59.50,Default,,0,0,0,,...aur pocket mein phone vibrate: {\\c&HBAFF00&}'Bhai funds add karne hain.'{\\c&HFFFFFF&}
Dialogue: 0,0:02:59.50,0:03:06.44,Default,,0,0,0,,Maine raat ko baith kar automatic deposit system banaya. Button dabate hi wallet recharge ho jata hai!
Dialogue: 0,0:03:06.55,0:03:10.26,Default,,0,0,0,,Saath mein crypto aur Binance bhi integrate kiya.
Dialogue: 0,0:03:10.40,0:03:15.52,Default,,0,0,0,,Lekin kahani itni seedhi nahi thi. Ek raat laga sab khatam ho gaya.
Dialogue: 0,0:03:16.15,0:03:21.99,Default,,0,0,0,,Raat ke 2:30 baje the: {\\c&HFF3366&}Ek supplier ka server down ho gaya!{\\c&HFFFFFF&}
Dialogue: 0,0:03:22.25,0:03:27.55,Default,,0,0,0,,Customer ke paise cut gaye lekin order aage nahi gaya.
Dialogue: 0,0:03:27.70,0:03:34.00,Default,,0,0,0,,WhatsApp message: {\\c&HFF3366&}'Bhai mere paise kahan gaye? Police mein report karunga!'{\\c&HFFFFFF&}
Dialogue: 0,0:03:34.00,0:03:40.03,Default,,0,0,0,,Main 15 saal ka bachcha, raat ke 2 baje paseene chhoot rahe the... Call ki, refund kiya aur maafi maangi.
Dialogue: 0,0:03:40.25,0:03:48.01,Default,,0,0,0,,Usi raat maine banaya: {\\c&HBAFF00&}THE AUTO-BACKUP FAILOVER SYSTEM!{\\c&HFFFFFF&} Ek server band ho to system doosre server par shift ho jata hai!
Dialogue: 0,0:03:48.15,0:03:52.47,Default,,0,0,0,,Customer ko pata bhi nahi chalta, aur order deliver ho jata hai.
Dialogue: 0,0:03:52.47,0:04:02.47,Default,,0,0,0,,Aur launch hua: {\\c&HBAFF00&}VEXAROSMM.COM!{\\c&HFFFFFF&} 500+ services: TikTok viral boosts, Instagram, YouTube watchtime, aur 24 ghante live WhatsApp support!
Dialogue: 0,0:04:02.65,0:04:11.48,Default,,0,0,0,,Internet par koi farq nahi padta aap 15 saal ke ho ya 30 saal ke. Internet sirf yeh dekhta hai: {\\c&HBAFF00&}kya aapko kaam karna aata hai ya nahi!{\\c&HFFFFFF&}
Dialogue: 0,0:04:11.75,0:04:16.50,Default,,0,0,0,,Roz ke 2 ghante real skill seekho to zindagi badal sakte ho.
Dialogue: 0,0:04:16.50,0:04:20.89,Default,,0,0,0,,Visit {\\c&HBAFF00&}vexarosmm.com{\\c&HFFFFFF&} | Like & Subscribe! Allah Hafiz.
`;

const outputPath = path.join(__dirname, '..', 'public', 'subtitles_master.ass');
fs.writeFileSync(outputPath, assContent, 'utf8');
console.log('✓ Created perfectly synchronized subtitles file at:', outputPath);
