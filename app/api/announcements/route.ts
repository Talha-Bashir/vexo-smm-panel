import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";
export const dynamic="force-dynamic";
export async function GET(){try{await ensureAdminSchema();const r=await db.query(`SELECT id,title,message,created_at FROM vexo_announcements WHERE enabled=true ORDER BY created_at DESC LIMIT 10`);return NextResponse.json({success:true,announcements:r.rows.map(x=>({id:x.id,title:x.title,message:x.message,createdAt:x.created_at}))})}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:"Unable to load announcements."},{status:500})}}
