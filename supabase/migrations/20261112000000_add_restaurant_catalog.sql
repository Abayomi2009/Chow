insert into public.restaurants (
  id, name, category, description, image_url, latitude, longitude,
  delivery_fee, delivery_minutes, rating
)
values
  ('00000000-0000-4000-8000-000000000004', 'Suya Social', 'Nigerian · Grill', 'Yaji-dusted skewers, smoky grills and late-night Lagos energy.', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900', 6.4312, 3.4281, 1000, 28, 4.9),
  ('00000000-0000-4000-8000-000000000005', 'Lagos Noodle House', 'Asian · Noodles', 'Fast wok-fired bowls with Lagos heat and Asian comfort.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900', 6.4268, 3.4167, 1000, 30, 4.7),
  ('00000000-0000-4000-8000-000000000006', 'Crust & Coast', 'Pizza · Pizzeria', 'Stone-baked pies, bold toppings and proper stretchy cheese.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900', 6.4198, 3.4254, 1300, 35, 4.7),
  ('00000000-0000-4000-8000-000000000007', 'Pita & Pepper', 'Shawarma · Street food', 'Freshly wrapped shawarma with pepper sauce made in-house.', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=900', 6.4381, 3.4212, 800, 25, 4.6),
  ('00000000-0000-4000-8000-000000000008', 'Coastline Catch', 'Seafood · Coastal', 'A coastal-inspired seafood grill with generous rice plates.', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900', 6.4175, 3.4391, 1400, 40, 4.8),
  ('00000000-0000-4000-8000-000000000009', 'Sunday Brunch Club', 'Breakfast · Brunch', 'Slow mornings, good coffee and all-day brunch favourites.', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=900', 6.4412, 3.4145, 900, 30, 4.7),
  ('00000000-0000-4000-8000-000000000010', 'Buka 9ja', 'Nigerian · Buka', 'Home-style soups, swallows and jollof for the whole table.', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=900', 6.4242, 3.4108, 900, 32, 4.8)
on conflict (id) do nothing;

insert into public.menu_items (id, restaurant_id, name, description, image_url, price)
values
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000004', 'Chicken suya wrap', 'Char-grilled chicken, yaji spice, crunchy slaw and creamy pepper sauce.', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500', 6200),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000004', 'Beef suya platter', 'Smoky beef skewers with onions, tomatoes and warm suya spice.', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500', 7800),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000005', 'Pepper chicken noodles', 'Wok-tossed noodles, tender chicken, greens and Lagos-style pepper.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500', 6800),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000005', 'Sesame veggie noodles', 'Noodles, crisp vegetables and toasted sesame-soy dressing.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500', 5200),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000006', 'Pepperoni heat pizza', 'Stone-baked crust, mozzarella, pepperoni and a little heat.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500', 9500),
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000006', 'Smoked suya chicken pizza', 'Grilled chicken, red onion, mozzarella and house yaji oil.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500', 10500),
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000007', 'Lagos chicken shawarma', 'Chicken, cabbage, pickles and creamy pepper sauce in fresh pita.', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500', 5800),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000007', 'Beef suya shawarma', 'Sliced beef, suya spice, lettuce and smoky garlic sauce.', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500', 6500),
  ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000008', 'Grilled croaker & jollof', 'Pepper-marinated croaker with smoky jollof rice and slaw.', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500', 13800),
  ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000008', 'Coconut prawn rice', 'Pan-seared prawns over fragrant coconut rice with fresh herbs.', 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=500', 11500),
  ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000009', 'Pancakes & fresh fruit', 'Fluffy buttermilk pancakes, seasonal fruit and maple syrup.', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500', 6400),
  ('00000000-0000-4000-8000-000000000116', '00000000-0000-4000-8000-000000000009', 'Plantain brunch plate', 'Soft scrambled eggs, ripe plantain, sautéed greens and toast.', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500', 7200),
  ('00000000-0000-4000-8000-000000000117', '00000000-0000-4000-8000-000000000010', 'Smoky jollof & grilled chicken', 'Party-style jollof, grilled chicken and sweet fried plantain.', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=500', 8200),
  ('00000000-0000-4000-8000-000000000118', '00000000-0000-4000-8000-000000000010', 'Egusi & pounded yam', 'Rich melon-seed soup with greens, served with soft pounded yam.', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500', 9800)
on conflict (id) do nothing;
