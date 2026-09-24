import Login from "./login";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { redirect } from "next/navigation";
import { getPortfolioOwner } from "@/app/owner";
export const dynamic="force-dynamic";
export default async function Ingresar(){if(await getPortfolioOwner())redirect("/");const existing=await getDb().select({id:users.id}).from(users).limit(1);return <Login setup={!existing.length}/>}
