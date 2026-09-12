# Supabase backend — sancongcu.com

Project: `hxcucycjemuudlvaxhdk` (`https://hxcucycjemuudlvaxhdk.supabase.co`)

The initial schema has been applied through the project SQL Editor. It contains:

- `halls`: the five product categories, their poster, visibility, and ordering.
- `skills`: content for every Skill, price, thumbnail, introduction, benefits, usage instructions, publication status, and ordering.
- `skill_media`: swipeable input/output and other illustrative images for a Skill detail page.
- `orders` and `order_items`: manual-transfer activation orders and their items.
- `skill_packages`: versioned `SKILL.md` or ZIP packages uploaded by the administrator.
- `skill_entitlements`: one private installation link per purchased Skill line in an order.
- `skill-media` Storage bucket: public thumbnails and gallery images.
- `skill-downloads` Storage bucket: private delivery files, to be released only after manual confirmation.
- `skill-packages` Storage bucket: private installation packages; only the `skill-install` Edge Function can serve a package to a customer link.

Row Level Security is enabled. Visitors can only read visible halls, published Skills, and their public media. Management changes require authenticated access from either `sancongcu@gmail.com` or `trungnv32@gmail.com`.

The browser only uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add a Supabase service-role key to a Vite environment variable or Git.

## Skill installation links

After a payment is confirmed, the Dashboard can create an installation link for each Skill in the order. The link is a bearer credential and must be sent only to the customer. It is served by the `skill-install` Edge Function, is not cached or indexed, and can return either the raw `SKILL.md` or a short-lived download link for a ZIP package.
