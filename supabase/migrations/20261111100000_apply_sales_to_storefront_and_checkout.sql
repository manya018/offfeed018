-- Publicly expose only currently running promotions and their product links.
drop policy if exists "Public can view active brand sales" on public.brand_sales;
create policy "Public can view active brand sales" on public.brand_sales
 for select to anon, authenticated
 using (status <> 'cancelled' and starts_at <= now() and ends_at > now());
drop policy if exists "Public can view products in active sales" on public.brand_sale_products;
create policy "Public can view products in active sales" on public.brand_sale_products
 for select to anon, authenticated
 using (exists (
   select 1 from public.brand_sales s
   where s.id = sale_id and s.status <> 'cancelled'
     and s.starts_at <= now() and s.ends_at > now()
 ));

-- Replace the checkout RPC so the authoritative price is calculated server-side.
create or replace function public.create_offfeed_cod_orders(
 p_customer_name text,p_customer_email text,p_customer_phone text,
 p_delivery_address jsonb,p_destination_pin_code text,p_items jsonb
)
returns table(order_id uuid,order_number text,brand_name text,product_name text,quantity integer,line_total numeric)
language plpgsql security definer set search_path=public
as $$
declare
 item jsonb; product_row record; new_order_id uuid; new_order_number text;
 item_quantity integer; requested_size text; requested_color text;
 final_unit_price numeric(12,2);
begin
 if char_length(trim(coalesce(p_customer_name,''))) not between 2 and 160 then raise exception 'Enter your full name.'; end if;
 if char_length(trim(coalesce(p_customer_email,''))) not between 3 and 254 or p_customer_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then raise exception 'Enter a valid email address.'; end if;
 if char_length(coalesce(p_customer_phone,'')) not between 7 and 30 then raise exception 'Enter a valid phone number.'; end if;
 if coalesce(p_destination_pin_code,'') !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid 6-digit Indian PIN code.'; end if;
 if jsonb_typeof(p_delivery_address)<>'object' or char_length(trim(coalesce(p_delivery_address->>'line1','')))<4
 or char_length(trim(coalesce(p_delivery_address->>'city','')))<2 or char_length(trim(coalesce(p_delivery_address->>'state','')))<2 then
 raise exception 'Enter your complete delivery address.'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Your bag must contain between 1 and 20 items.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  item_quantity := (item->>'quantity')::integer;
  requested_size := left(coalesce(item->>'size',''),40);
  requested_color := left(coalesce(item->>'color',''),60);
  if item_quantity not between 1 and 10 then raise exception 'Quantity must be between 1 and 10.'; end if;
  select p.id as product_id,p.product_name,p.price,p.sizes,p.colors,
         a.id as brand_application_id,a.user_id as brand_user_id,a.brand_name
    into product_row from public.brand_products p
    join public.brand_applications a on a.id=p.brand_application_id
   where p.id=(item->>'productId')::uuid and p.status='published'
     and p.brand_approved=true and a.status='approved' limit 1;
  if not found then raise exception 'One of the products in your bag is no longer available. Please refresh your bag.'; end if;
  if requested_size<>'' and not(requested_size=any(product_row.sizes)) then raise exception 'A selected size is no longer available. Please review your bag.'; end if;
  if requested_color<>'' and not(requested_color=any(product_row.colors)) then raise exception 'A selected colour is no longer available. Please review your bag.'; end if;
  select case s.discount_type when 'percentage' then round(product_row.price*(1-s.discount_value/100),2)
              when 'fixed' then round(product_row.price-s.discount_value,2) end
    into final_unit_price
    from public.brand_sale_products sp join public.brand_sales s on s.id=sp.sale_id
   where sp.product_id=product_row.product_id and s.status<>'cancelled'
     and s.starts_at<=now() and s.ends_at>now()
   order by s.created_at desc limit 1;
  final_unit_price := greatest(0,coalesce(final_unit_price,product_row.price));
  if final_unit_price<=0 then raise exception 'This promotion creates an invalid product price. Please contact OFFFEED.'; end if;
  new_order_number := 'OFF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.brand_orders(order_number,brand_application_id,brand_user_id,customer_user_id,customer_name,customer_email,customer_phone,
   delivery_address,destination_pin_code,product_id,product_name,selected_size,selected_color,quantity,unit_price,currency,status)
  values(new_order_number,product_row.brand_application_id,product_row.brand_user_id,auth.uid(),trim(p_customer_name),lower(trim(p_customer_email)),
   trim(p_customer_phone),p_delivery_address,p_destination_pin_code,product_row.product_id,product_row.product_name,requested_size,requested_color,
   item_quantity,final_unit_price,'INR','pending') returning id into new_order_id;
  order_id:=new_order_id; order_number:=new_order_number; brand_name:=product_row.brand_name;
  product_name:=product_row.product_name; quantity:=item_quantity; line_total:=final_unit_price*item_quantity; return next;
 end loop;
end;
$$;
revoke all on function public.create_offfeed_cod_orders(text,text,text,jsonb,text,jsonb) from public;
grant execute on function public.create_offfeed_cod_orders(text,text,text,jsonb,text,jsonb) to anon,authenticated;
