-- Approved additive test import. Target: 66.151.35.76 / rcmarket only.
-- Original products, orders, accounts and credentials are never updated.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(hashtext('rcm-demo-20260908'));
DO $import$
DECLARE
  batch jsonb := $payload$[{"draftId":"demo-cap-motorin","brand":"Zegna","title":"Бейсболка Motorin","category":"Аксессуары","description":"Бейсболка с изогнутым козырьком и лаконичной вышивкой спереди. Два варианта цвета: бежевый и горчичный.","testPriceRub":5900,"variants":[{"color":"Бежевый","testStock":8,"images":[{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/1-1-7e80a717c276a813.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/1-2-61f032417c9a66ee.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/1-3-67d1f3ebee5dc875.webp"}],"hex":"#CBBDA5","sku":"RCM-DEMO-20260908-1-1"},{"color":"Горчичный","testStock":6,"images":[{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/2-1-449eaf3b97063778.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/2-2-56ef622eea0a6a77.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/2-3-781f42cace17ddff.webp"}],"hex":"#BD8C28","sku":"RCM-DEMO-20260908-1-2"}],"publicId":"dm0901","article":"RCM-DEMO-20260908-1","categorySlug":"catalog-accessories-headwear","brandSlug":"zegna"},{"draftId":"demo-goggles-cassidy","brand":"Chloé Eyewear","title":"Лыжная маска Cassidy","category":"Спорт","description":"Маска с розовой линзой, светлой оправой и контрастным красным ремешком. Коллаборация с Fusalp указана в названии исходных файлов.","testPriceRub":12900,"variants":[{"color":"Розовый / красный","testStock":4,"images":[{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-goggles-cassidy/1-1-22c7d2acfb666c34.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-goggles-cassidy/1-2-1e5062abb05d183a.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-goggles-cassidy/1-3-6a5eeccec4bf2085.webp"}],"hex":"#B57A7E","sku":"RCM-DEMO-20260908-2-1"}],"publicId":"dm0902","article":"RCM-DEMO-20260908-2","categorySlug":"catalog-sport-accessories","brandSlug":"chloe-eyewear"},{"draftId":"demo-bracelet","brand":"Emanuele Bicocchi","title":"Цепочный браслет с фигурными звеньями","category":"Аксессуары","description":"Браслет серебристого цвета с фигурными звеньями и застёжкой. В галерее — предметный снимок и фото на руке.","testPriceRub":6900,"variants":[{"color":"Серебристый","testStock":6,"images":[{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-bracelet/1-1-4058ac71e20268e7.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-bracelet/1-2-1f797d0cfd18b993.webp"}],"hex":"#BFC0C0","sku":"RCM-DEMO-20260908-3-1"}],"publicId":"dm0903","article":"RCM-DEMO-20260908-3","categorySlug":"catalog-accessories","brandSlug":"emanuele-bicocchi"},{"draftId":"demo-belt-cassandre","brand":"Saint Laurent","title":"Ремень Cassandre Vadim","category":"Аксессуары","description":"Чёрный ремень с прямоугольной пряжкой золотистого цвета и монограммой. В галерее — общий вид и крупный план пряжки.","testPriceRub":7900,"variants":[{"color":"Чёрный","testStock":7,"images":[{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-belt-cassandre/1-1-487ada6c627b4865.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-belt-cassandre/1-2-4dc2bd202a1e0cbd.webp"}],"hex":"#111111","sku":"RCM-DEMO-20260908-4-1"}],"publicId":"dm0904","article":"RCM-DEMO-20260908-4","categorySlug":"catalog-accessories-belts","brandSlug":"saint-laurent"},{"draftId":"demo-watch-saturn","brand":"Swatch × Omega","title":"MoonSwatch Mission to Saturn, 42 мм","category":"Аксессуары","description":"Часы с круглым светлым корпусом, светлым циферблатом и коричневым ремешком. Название модели и диаметр взяты из имени файла.","testPriceRub":15900,"variants":[{"color":"Бежевый / коричневый","testStock":3,"images":[{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-watch-saturn/1-1-98a277ac110647e9.webp"},{"url":"https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-watch-saturn/1-2-bf02ebafbfd3a06f.webp"}],"hex":"#9A8162","sku":"RCM-DEMO-20260908-5-1"}],"publicId":"dm0905","article":"RCM-DEMO-20260908-5","categorySlug":"catalog-accessories-watches","brandSlug":"swatch-omega"}]$payload$::jsonb;
  item jsonb; variant jsonb; image jsonb;
  seller_id_value bigint; brand_id_value bigint; product_id_value bigint;
  category_id_value bigint; color_id_value bigint; colorway_id_value bigint;
  color_order integer; image_order integer; existing_count integer;
  before_products integer; before_variants integer; before_images integer;
BEGIN
  SELECT id INTO seller_id_value FROM users
  WHERE username = 'seed_seller_ip' AND role = 'SELLER' AND seller_approved IS TRUE;
  IF seller_id_value IS NULL THEN RAISE EXCEPTION 'Expected approved test seller not found'; END IF;

  SELECT count(*) INTO existing_count FROM products
  WHERE public_id IN ('dm0901','dm0902','dm0903','dm0904','dm0905');
  IF existing_count = 5 AND (SELECT count(*) FROM products WHERE public_id IN ('dm0901','dm0902','dm0903','dm0904','dm0905') AND article LIKE 'RCM-DEMO-20260908-%' AND seller_id=seller_id_value) = 5 THEN
    RAISE NOTICE 'Approved batch already exists; no changes made';
    RETURN;
  ELSIF existing_count <> 0 THEN
    RAISE EXCEPTION 'Public ID collision or incomplete prior batch; refusing to change existing data';
  END IF;
  SELECT count(*) INTO before_products FROM products;
  SELECT count(*) INTO before_variants FROM product_variants;
  SELECT count(*) INTO before_images FROM product_images;

  FOR item IN SELECT value FROM jsonb_array_elements(batch) LOOP
    SELECT id INTO category_id_value FROM category WHERE slug=item->>'categorySlug' AND is_active IS TRUE;
    IF category_id_value IS NULL THEN RAISE EXCEPTION 'Expected active category not found'; END IF;
    IF EXISTS (SELECT 1 FROM brands WHERE lower(name)=lower(item->>'brand') OR slug=item->>'brandSlug') THEN
      RAISE EXCEPTION 'Brand already exists; refusing to attach another seller without review';
    END IF;
    INSERT INTO brands(name,slug,is_active) VALUES(item->>'brand',item->>'brandSlug',TRUE) RETURNING id INTO brand_id_value;
    INSERT INTO seller_brands(seller_id,brand_id) VALUES(seller_id_value,brand_id_value);
    INSERT INTO products(public_id,title,description,seller_id,is_active,brand_id,category_id,audience,status,article,published_at)
      VALUES(item->>'publicId',item->>'title',item->>'description',seller_id_value,'true',brand_id_value,category_id_value,'UNISEX','ACTIVE',item->>'article',NOW())
      RETURNING id INTO product_id_value;
    color_order := 0; image_order := 0;
    FOR variant IN SELECT value FROM jsonb_array_elements(item->'variants') LOOP
      SELECT id INTO color_id_value FROM product_colors
      WHERE lower(replace(name,'ё','е'))=lower(replace(variant->>'color','ё','е')) AND is_active IS TRUE ORDER BY id LIMIT 1;
      IF color_id_value IS NULL THEN
        INSERT INTO product_colors(name,hex,is_active) VALUES(variant->>'color',variant->>'hex',TRUE) RETURNING id INTO color_id_value;
      END IF;
      INSERT INTO product_colorways(product_id,color_id,color_name,sort_order,is_default)
        VALUES(product_id_value,color_id_value,variant->>'color',color_order,color_order=0) RETURNING id INTO colorway_id_value;
      INSERT INTO product_variants(size,color,price,stock_quantity,reserved_quantity,stock_tracking_enabled,sku,seller_article,product_id,status,color_id,colorway_id)
        VALUES(NULL,variant->>'color',(item->>'testPriceRub')::numeric,(variant->>'testStock')::integer,0,TRUE,variant->>'sku',variant->>'sku',product_id_value,'ACTIVE',color_id_value,colorway_id_value);
      FOR image IN SELECT value FROM jsonb_array_elements(variant->'images') LOOP
        IF image->>'url' NOT LIKE 'https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/%' THEN RAISE EXCEPTION 'Unexpected asset namespace'; END IF;
        INSERT INTO product_images(url,product_id,colorway_id,sort_order)
          VALUES(image->>'url',product_id_value,colorway_id_value,image_order);
        image_order := image_order + 1;
      END LOOP;
      color_order := color_order + 1;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM products) <> before_products + 5
     OR (SELECT count(*) FROM product_variants) <> before_variants + 6
     OR (SELECT count(*) FROM product_images) <> before_images + 15 THEN
    RAISE EXCEPTION 'Unexpected imported row counts; rolling back';
  END IF;
END
$import$;
SELECT jsonb_build_object(
  'batch','rcm-demo-20260908',
  'database',current_database(),
  'seller','seed_seller_ip',
  'products',(SELECT jsonb_agg(jsonb_build_object(
    'id',p.id,'publicId',p.public_id,'title',p.title,'brand',b.name,'brandId',b.id,
    'category',c.name,'status',p.status,
    'variantCount',(SELECT count(*) FROM product_variants v WHERE v.product_id=p.id),
    'colorwayCount',(SELECT count(*) FROM product_colorways cw WHERE cw.product_id=p.id),
    'imageCount',(SELECT count(*) FROM product_images i WHERE i.product_id=p.id)
  ) ORDER BY p.public_id) FROM products p JOIN brands b ON b.id=p.brand_id JOIN category c ON c.id=p.category_id
  WHERE p.public_id IN ('dm0901','dm0902','dm0903','dm0904','dm0905'))
);
COMMIT;
