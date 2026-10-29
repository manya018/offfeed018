-- Brand shipping profile: pickup/return information and default packed parcel measurements.
-- Payout onboarding is intentionally delegated to a verified provider; do not store bank credentials here.
alter table public.brand_shipping_profiles
  add column if not exists pickup_contact_name text,
  add column if not exists pickup_phone text,
  add column if not exists pickup_address text,
  add column if not exists return_address text,
  add column if not exists gstin text,
  add column if not exists parcel_weight_grams integer not null default 500,
  add column if not exists parcel_length_cm numeric(8,2) not null default 25,
  add column if not exists parcel_width_cm numeric(8,2) not null default 20,
  add column if not exists parcel_height_cm numeric(8,2) not null default 5;

alter table public.brand_shipping_profiles
  add constraint brand_shipping_profiles_parcel_weight_positive check (parcel_weight_grams > 0),
  add constraint brand_shipping_profiles_parcel_length_positive check (parcel_length_cm > 0),
  add constraint brand_shipping_profiles_parcel_width_positive check (parcel_width_cm > 0),
  add constraint brand_shipping_profiles_parcel_height_positive check (parcel_height_cm > 0);

comment on column public.brand_shipping_profiles.pickup_address is 'Private pickup address for courier collections; access restricted by existing brand profile RLS.';
comment on column public.brand_shipping_profiles.return_address is 'Optional private return destination address.';
comment on column public.brand_shipping_profiles.gstin is 'Optional GSTIN supplied by the brand, if applicable.';
comment on column public.brand_shipping_profiles.parcel_weight_grams is 'Default packed parcel weight; courier quotes must use actual parcel data when available.';
