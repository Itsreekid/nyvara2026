-- Idempotent rewrite for historical Supabase-hosted product image URLs.
-- Safe to run multiple times; already-migrated R2 URLs are left untouched.

create or replace function public.nyvara_r2_image_url(source_url text)
returns text
language sql
immutable
as $$
  select case
    when source_url is null or source_url = '' then source_url
    when source_url like 'https://assets.nyvara.com/%' then source_url
    when source_url ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
      regexp_replace(
        source_url,
        '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?',
        'https://assets.nyvara.com/products/'
      )
    else source_url
  end
$$;

create or replace function public.nyvara_r2_color_options(input jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when input is null then null
    else coalesce((
      select jsonb_agg(
        case
          when jsonb_typeof(option) <> 'object' then option
          when (option->>'image_url') ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
            case
              when (option->>'image_url2') ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
                jsonb_set(
                  jsonb_set(
                    option,
                    '{image_url}',
                    to_jsonb(public.nyvara_r2_image_url(option->>'image_url')),
                    true
                  ),
                  '{image_url2}',
                  to_jsonb(public.nyvara_r2_image_url(option->>'image_url2')),
                  true
                )
              else
                jsonb_set(
                  option,
                  '{image_url}',
                  to_jsonb(public.nyvara_r2_image_url(option->>'image_url')),
                  true
                )
            end
          when (option->>'image_url2') ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
            jsonb_set(
              option,
              '{image_url2}',
              to_jsonb(public.nyvara_r2_image_url(option->>'image_url2')),
              true
            )
          else option
        end
      )
      from jsonb_array_elements(coalesce(input, '[]'::jsonb)) as option
    ), '[]'::jsonb)
  end
$$;

update public.products
set image_url = public.nyvara_r2_image_url(image_url)
where image_url ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?';

update public.products
set color_options = public.nyvara_r2_color_options(color_options)
where color_options::text ~ '^\[.*https://[^/]+/storage/v1/object/public/Product/(?:images/)?';

update public.product_images
set image_url = public.nyvara_r2_image_url(image_url)
where image_url ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?';
