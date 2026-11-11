import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema=z.object({
 name:z.string().trim().min(2).max(100), productScope:z.enum(["collection","selected"]),
 productIds:z.array(z.string().uuid()).max(500), discountType:z.enum(["percentage","fixed"]),
 discountValue:z.number().positive().max(10000000), startsAt:z.string().datetime(), endsAt:z.string().datetime()
}).superRefine((v,c)=>{
 if(new Date(v.endsAt)<=new Date(v.startsAt)) c.addIssue({code:"custom",path:["endsAt"],message:"End must be after start."});
 if(v.discountType==="percentage"&&v.discountValue>70)c.addIssue({code:"custom",path:["discountValue"],message:"Discounts above 70% require OFFFEED approval."});
 if(v.productScope==="selected"&&!v.productIds.length)c.addIssue({code:"custom",path:["productIds"],message:"Choose at least one product."});
});
const dbFor=async()=>{const {supabaseAdmin}=await import("@/integrations/supabase/client.server");return supabaseAdmin as any;};

export const getBrandSalesData=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=await dbFor();
 const {data:brand,error:be}=await db.from("brand_applications").select("id,brand_name").eq("user_id",context.userId).eq("status","approved").maybeSingle();
 if(be||!brand)throw new Error("An approved OFFFEED brand workspace is required.");
 const [{data:products,error:pe},{data:sales,error:se}]=await Promise.all([
  db.from("brand_products").select("id,product_name,price,status,audience,image_path").eq("brand_application_id",brand.id).eq("status","published").order("created_at",{ascending:false}),
  db.from("brand_sales").select("id,name,product_scope,discount_type,discount_value,starts_at,ends_at,status,created_at,brand_sale_products(product_id)").eq("user_id",context.userId).order("created_at",{ascending:false}).limit(50)
 ]);
 if(pe)throw new Error("Published products could not be loaded.");
 if(se)throw new Error("Sales database setup is not applied yet.");
 const now=Date.now();
 return {brand,products:products??[],sales:(sales??[]).map((s:any)=>({...s,status:s.status==="cancelled"?"cancelled":new Date(s.ends_at).getTime()<=now?"ended":new Date(s.starts_at).getTime()<=now?"active":"scheduled"}))};
});

export const createBrandSale=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(v=>inputSchema.parse(v)).handler(async({context,data})=>{
 const db=await dbFor();
 const {data:brand,error:be}=await db.from("brand_applications").select("id").eq("user_id",context.userId).eq("status","approved").maybeSingle();
 if(be||!brand)throw new Error("An approved brand workspace is required.");
 const {data:all,error:pe}=await db.from("brand_products").select("id,price").eq("brand_application_id",brand.id).eq("status","published");
 if(pe)throw new Error("Products could not be verified.");
 const rows=all??[], ids=data.productScope==="collection"?rows.map((p:any)=>p.id):[...new Set(data.productIds)];
 if(!ids.length||ids.some((id:string)=>!rows.some((p:any)=>p.id===id)))throw new Error("Choose products from your own published collection.");
 if(data.discountType==="fixed"&&rows.filter((p:any)=>ids.includes(p.id)).some((p:any)=>data.discountValue>=Number(p.price)))throw new Error("Fixed discount must be lower than every selected product price.");
 const {data:existing,error:ee}=await db.from("brand_sale_products").select("product_id,brand_sales!inner(id,status,starts_at,ends_at)").in("product_id",ids);
 if(ee)throw new Error("Existing sales could not be checked.");
 const start=Date.parse(data.startsAt),end=Date.parse(data.endsAt);
 if((existing??[]).some((r:any)=>r.brand_sales.status!=="cancelled"&&Date.parse(r.brand_sales.ends_at)>start&&Date.parse(r.brand_sales.starts_at)<end))throw new Error("A selected product already has an overlapping sale.");
 const {data:sale,error:se}=await db.from("brand_sales").insert({brand_application_id:brand.id,user_id:context.userId,name:data.name,product_scope:data.productScope,discount_type:data.discountType,discount_value:data.discountValue,starts_at:data.startsAt,ends_at:data.endsAt,status:"scheduled"}).select("id").single();
 if(se||!sale)throw new Error("Sale could not be created.");
 const {error:me}=await db.from("brand_sale_products").insert(ids.map((product_id:string)=>({sale_id:sale.id,product_id})));
 if(me)throw new Error("Sale created but product mapping failed; contact OFFFEED support.");
 return {id:sale.id,productCount:ids.length};
});

export const cancelBrandSale=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(v=>z.object({saleId:z.string().uuid()}).parse(v)).handler(async({context,data})=>{
 const db=await dbFor();
 const {data:sale,error}=await db.from("brand_sales").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",data.saleId).eq("user_id",context.userId).neq("status","cancelled").select("id").maybeSingle();
 if(error||!sale)throw new Error("Sale could not be ended.");
 return {id:sale.id};
});
