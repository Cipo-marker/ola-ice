import { createServer } from 'node:http';
import { createHash, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(?:"(.*)"|'(.*)')$/, '$1$2');
  }
}
const dataDir = resolve(process.env.OLAICE_DATA_DIR || join(root, 'data'));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(resolve(dataDir, 'olaice.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
db.exec(`
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, category_id TEXT NOT NULL, data TEXT NOT NULL, FOREIGN KEY(category_id) REFERENCES categories(id));
CREATE TABLE IF NOT EXISTS product_variants(id TEXT PRIMARY KEY, product_id TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, stock_quantity INTEGER NOT NULL, data TEXT NOT NULL, FOREIGN KEY(product_id) REFERENCES products(id));
CREATE TABLE IF NOT EXISTS delivery_zones(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, data TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, customer_phone TEXT NOT NULL, order_status TEXT NOT NULL, placed_at TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS orders_status_date_idx ON orders(order_status, placed_at);
CREATE TABLE IF NOT EXISTS order_items(id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT, variant_id TEXT, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL, data TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE TABLE IF NOT EXISTS order_status_histories(id TEXT PRIMARY KEY, order_id TEXT NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS inventory_movements(id TEXT PRIMARY KEY, variant_id TEXT NOT NULL, order_id TEXT NOT NULL, movement_type TEXT NOT NULL, quantity INTEGER NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(variant_id) REFERENCES product_variants(id), FOREIGN KEY(order_id) REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS staff(id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, zone TEXT, pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL);
`);

const count = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
if (!count) {
  const seeds = JSON.parse(readFileSync(join(root, 'server', 'seed-data.json'), 'utf8'));
  const tx = db.prepare('INSERT INTO categories(id,data) VALUES(?,?)');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of seeds.categories) tx.run(row.id, JSON.stringify(row));
    const p = db.prepare('INSERT INTO products(id,category_id,data) VALUES(?,?,?)');
    for (const row of seeds.products) p.run(row.id, row.category_id, JSON.stringify(row));
    const v = db.prepare('INSERT INTO product_variants(id,product_id,sku,stock_quantity,data) VALUES(?,?,?,?,?)');
    for (const row of seeds.variants) v.run(row.id, row.product_id, row.sku, row.stock_quantity, JSON.stringify(row));
    const z = db.prepare('INSERT INTO delivery_zones(id,data) VALUES(?,?)');
    for (const row of seeds.zones) z.run(row.id, JSON.stringify(row));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

const staffRows = db.prepare('SELECT * FROM staff').all();
if (!staffRows.length) {
  const adminPin = process.env.OLAICE_ADMIN_PIN || randomBytes(9).toString('base64url');
  const drivers = [
    ['Koffi (Moto Express 01)', 'Cotonou Centre & Littoral'],
    ['Moussa (Moto Express 02)', 'Calavi & Godomey'],
    ['Aïcha (Moto Express 03)', 'Akpakpa & Cotonou Est'],
    ['Bio (Moto Express 04)', 'Cadjehoun & Haie Vive'],
  ];
  const save = db.prepare('INSERT INTO staff(id,name,role,zone,pin_salt,pin_hash) VALUES(?,?,?,?,?,?)');
  const addStaff = (id, name, role, zone, pin) => {
    const salt = randomBytes(16).toString('hex');
    save.run(id, name, role, zone, salt, scryptSync(pin, salt, 64).toString('hex'));
  };
  addStaff('admin', 'Direction & Administration', 'admin', null, adminPin);
  const credentials = [];
  drivers.forEach(([name, zone], i) => {
    const pin = randomBytes(4).readUInt32BE(0).toString().slice(-6).padStart(6, '0');
    addStaff(`driver-${i + 1}`, name, 'delivery', zone, pin);
    credentials.push(`${name}: ${pin}`);
  });
  console.log('\nOLA ICE — accès personnel générés (à conserver en lieu sûr)');
  console.log(`Administrateur: ${adminPin}`);
  credentials.forEach((entry) => console.log(entry));
  console.log('Ces codes ne seront plus affichés après ce premier démarrage.\n');
}

const sessions = new Map();
const loginAttempts = new Map();
const trackingAttempts = new Map();
const readRows = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
async function bodyJson(req) {
  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); if (chunks.reduce((n, b) => n + b.length, 0) > 1_000_000) throw new Error('Corps de requête trop volumineux.'); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function staffFrom(req) {
  const token = (req.headers.cookie || '').split(';').map((v) => v.trim()).find((v) => v.startsWith('olaice_session='))?.slice('olaice_session='.length);
  return token ? sessions.get(token) : undefined;
}
function matchesPin(input, row) {
  const candidate = Buffer.from(scryptSync(String(input || ''), row.pin_salt, 64).toString('hex'));
  const expected = Buffer.from(row.pin_hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
function loadOrder(id) {
  const row = db.prepare('SELECT data FROM orders WHERE id=?').get(id);
  if (!row) return undefined;
  const order = JSON.parse(row.data);
  order.items = db.prepare('SELECT data FROM order_items WHERE order_id=?').all(id).map((item) => JSON.parse(item.data));
  order.status_history = db.prepare('SELECT data FROM order_status_histories WHERE order_id=? ORDER BY created_at').all(id).map((item) => JSON.parse(item.data));
  return order;
}
function distanceMeters(lat, lng) {
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(lat - 7.1833258), dLng = radians(lng - 2.0433176);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(7.1833258)) * Math.cos(radians(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function distanceFee(meters) {
  if (meters < 500) return 50;
  if (meters < 1000) return 100;
  return 200 + Math.floor((meters - 1000) / 500) * 100;
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  if (req.method === 'GET' && path === '/api/health') return send(res, 200, { ok: true, database: 'sqlite' });
  if (req.method === 'GET' && path === '/api/bootstrap') return send(res, 200, {
    categories: readRows('categories'), products: readRows('products'), variants: readRows('product_variants'), zones: readRows('delivery_zones'),
  });
  if (req.method === 'POST' && path === '/api/staff/login') {
    const body = await bodyJson(req);
    const address = req.socket.remoteAddress || 'local';
    const now = Date.now();
    const attempts = (loginAttempts.get(address) || []).filter((time) => now - time < 15 * 60 * 1000);
    if (attempts.length >= 8) return send(res, 429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { 'retry-after': '900' });
    const row = db.prepare('SELECT * FROM staff WHERE role=? AND (? IS NULL OR name=?)').get(body.role, body.name ?? null, body.name ?? null);
    if (!row || !matchesPin(body.pin, row)) {
      attempts.push(now); loginAttempts.set(address, attempts);
      return send(res, 401, { error: 'Code d’accès invalide.' });
    }
    loginAttempts.delete(address);
    const token = randomBytes(32).toString('base64url');
    const user = { role: row.role, name: row.name, badgeId: row.id, assignedZone: row.zone || undefined };
    sessions.set(token, user);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return send(res, 200, { user }, { 'set-cookie': `olaice_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}` });
  }
  if (req.method === 'POST' && path === '/api/staff/logout') {
    const token = (req.headers.cookie || '').split(';').map((v) => v.trim()).find((v) => v.startsWith('olaice_session='))?.slice('olaice_session='.length);
    if (token) sessions.delete(token);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return send(res, 200, { ok: true }, { 'set-cookie': `olaice_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}` });
  }
  if (req.method === 'GET' && path === '/api/staff/session') return send(res, 200, { user: staffFrom(req) || null });

  if (req.method === 'GET' && path === '/api/orders') {
    const staff = staffFrom(req);
    if (!staff) return send(res, 401, { error: 'Connexion du personnel requise.' });
    const ids = db.prepare(staff.role === 'admin' ? 'SELECT id FROM orders ORDER BY placed_at DESC' : 'SELECT id FROM orders WHERE order_status IN (\'READY\',\'OUT_FOR_DELIVERY\') AND (delivery_agent_name=? OR delivery_agent_name IS NULL) ORDER BY placed_at DESC').all(...(staff.role === 'admin' ? [] : [staff.name]));
    return send(res, 200, { orders: ids.map(({ id }) => loadOrder(id)) });
  }
  if (req.method === 'POST' && path === '/api/orders') {
    const body = await bodyJson(req);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) return send(res, 400, { error: 'Votre panier est vide ou invalide.' });
    if (!String(body.customer_name || '').trim() || String(body.customer_phone || '').replace(/\D/g, '').length < 8 || !String(body.delivery_address || '').trim()) return send(res, 400, { error: 'Nom, téléphone et adresse sont obligatoires.' });
    if (body.order_type && !['standard','wholesale','event'].includes(body.order_type)) return send(res, 400, { error: 'Type de commande invalide.' });
    const zoneRow = db.prepare('SELECT data FROM delivery_zones WHERE id=?').get(body.delivery_zone_id);
    const zone = zoneRow && JSON.parse(zoneRow.data);
    const hasGpsCoordinates = body.delivery_fee_calculation_mode === 'gps_distance' && Number.isFinite(body.customer_latitude) && Number.isFinite(body.customer_longitude) && Math.abs(body.customer_latitude) <= 90 && Math.abs(body.customer_longitude) <= 180;
    if (!hasGpsCoordinates && (!zone || !zone.is_active)) return send(res, 400, { error: 'Zone de livraison invalide.' });
      const normalized = body.items.map((item) => ({ variantId: String(item.variant_id), quantity: Number(item.quantity), flavor: item.flavor }));
    for (const item of body.items) {
      const quantity = Number(item.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return send(res, 400, { error: 'Quantité invalide.' });
    }
    const id = randomUUID();
    const placedAt = new Date().toISOString();
    const datePart = placedAt.slice(0, 10).replaceAll('-', '');
    let order;
    db.exec('BEGIN IMMEDIATE');
    try {
      const items = [];
      const movements = [];
      let subtotal = 0, normalSubtotal = 0;
      for (const item of normalized) {
        const { variantId, quantity } = item;
        const row = db.prepare('SELECT v.data AS variant_data,p.data AS product_data FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=?').get(variantId);
        if (!row) throw new Error('Un produit de votre panier n’est plus disponible.');
        const variant = JSON.parse(row.variant_data), product = JSON.parse(row.product_data);
        if (!variant.is_active || product.status !== 'active') throw new Error(`« ${variant.name} » n’est plus disponible.`);
        if (variant.track_stock && variant.stock_quantity < quantity) throw new Error(`Stock insuffisant pour « ${variant.name} » (restant : ${variant.stock_quantity}).`);
        const isWholesale = Boolean(product.allow_wholesale && variant.wholesale_price && variant.wholesale_min_quantity && quantity >= variant.wholesale_min_quantity);
        const unitPrice = isWholesale ? variant.wholesale_price : variant.price;
        const lineTotal = unitPrice * quantity;
        if (!Number.isSafeInteger(lineTotal)) throw new Error('Le montant de votre panier est invalide.');
        subtotal += lineTotal; normalSubtotal += variant.price * quantity;
        items.push({ id: randomUUID(), order_id: id, product_id: product.id, product_variant_id: variant.id, product_name: product.name, variant_name: variant.name, flavor: item.flavor || undefined, sku: variant.sku, unit_price: unitPrice, is_wholesale: isWholesale, quantity, total_price: lineTotal });
        if (variant.track_stock) {
          const next = { ...variant, stock_quantity: variant.stock_quantity - quantity };
          db.prepare('UPDATE product_variants SET stock_quantity=?,data=? WHERE id=?').run(next.stock_quantity, JSON.stringify(next), variant.id);
          movements.push({ variantId: variant.id, quantity });
        }
      }
      const serverDistance = hasGpsCoordinates ? distanceMeters(body.customer_latitude, body.customer_longitude) : undefined;
      const deliveryFee = serverDistance === undefined ? zone.delivery_fee : distanceFee(serverDistance);
      if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) throw new Error('Frais de livraison invalides.');
      const code = `OLA-${datePart}-${randomBytes(3).toString('hex').toUpperCase()}`;
      order = {
        id, customer_id: body.customer_id, order_number: code, order_type: body.order_type || (normalSubtotal > subtotal ? 'wholesale' : 'standard'), customer_name: String(body.customer_name).trim(), customer_phone: String(body.customer_phone).trim(), customer_email: body.customer_email || undefined,
        delivery_zone_id: zone?.id || 'zone-gps', delivery_zone_name: zone?.name || 'Livraison mesurée par GPS', delivery_address: String(body.delivery_address).trim(), delivery_landmark: body.delivery_landmark || undefined,
        customer_latitude: body.customer_latitude, customer_longitude: body.customer_longitude, delivery_distance_meters: serverDistance, delivery_distance_text: serverDistance === undefined ? undefined : serverDistance < 1000 ? `${serverDistance} m` : `${(serverDistance / 1000).toFixed(2).replace('.', ',')} km`, delivery_fee_calculation_mode: serverDistance === undefined ? 'zone_fixed' : 'gps_distance',
        subtotal, delivery_fee: deliveryFee, discount_amount: normalSubtotal - subtotal, total: subtotal + deliveryFee, payment_method: 'cash_on_delivery', payment_status: 'pending', order_status: 'PENDING', customer_note: body.customer_note || undefined,
        placed_at: placedAt, items, status_history: [{ id: randomUUID(), order_id: id, to_status: 'PENDING', changed_by: 'Client Web', comment: 'Commande passée en ligne — paiement à la livraison.', created_at: placedAt }],
      };
      db.prepare('INSERT INTO orders(id,order_number,customer_phone,order_status,placed_at,data) VALUES(?,?,?,?,?,?)').run(id, order.order_number, order.customer_phone, order.order_status, placedAt, JSON.stringify(order));
      const saveMovement = db.prepare('INSERT INTO inventory_movements VALUES(?,?,?,?,?,?)');
      for (const movement of movements) saveMovement.run(randomUUID(), movement.variantId, id, 'sale', -movement.quantity, placedAt);
      const saveItem = db.prepare('INSERT INTO order_items(id,order_id,product_id,variant_id,quantity,unit_price,data) VALUES(?,?,?,?,?,?,?)');
      for (const item of items) saveItem.run(item.id, id, item.product_id, item.product_variant_id, item.quantity, item.unit_price, JSON.stringify(item));
      const saveHistory = db.prepare('INSERT INTO order_status_histories(id,order_id,created_at,data) VALUES(?,?,?,?)');
      for (const entry of order.status_history) saveHistory.run(entry.id, id, entry.created_at, JSON.stringify(entry));
      const phone = order.customer_phone.replace(/\D/g, '');
      const existingCustomer = db.prepare('SELECT id,data FROM customers WHERE phone=?').get(phone);
      const customer = { id: existingCustomer?.id || randomUUID(), phone: order.customer_phone, fullName: order.customer_name, email: order.customer_email, lastActiveAt: placedAt, createdAt: existingCustomer ? JSON.parse(existingCustomer.data).createdAt : placedAt };
      db.prepare('INSERT INTO customers(id,phone,data,created_at) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET data=excluded.data').run(customer.id, phone, JSON.stringify(customer), customer.createdAt);
      order.customer_id = customer.id;
      db.prepare('UPDATE orders SET data=? WHERE id=?').run(JSON.stringify(order), id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); return send(res, 400, { error: error.message || 'Commande impossible.' }); }
    return send(res, 201, { order });
  }
  if (req.method === 'POST' && path === '/api/track-order') {
    const body = await bodyJson(req);
    const address = req.socket.remoteAddress || 'local';
    const now = Date.now();
    const attempts = (trackingAttempts.get(address) || []).filter((time) => now - time < 15 * 60 * 1000);
    if (attempts.length >= 30) return send(res, 429, { error: 'Trop de recherches. Réessayez dans quelques minutes.' }, { 'retry-after': '900' });
    attempts.push(now);
    trackingAttempts.set(address, attempts);
    const phoneDigits = String(body.phone || '').replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15 || !/^OLA-\d{8}-[A-F0-9]{6}$/i.test(String(body.order_number || '').trim())) return send(res, 404, { error: 'Commande introuvable. Vérifiez le numéro de commande et le téléphone.' });
    const rows = db.prepare('SELECT id,customer_phone FROM orders WHERE order_number=?').all(String(body.order_number || '').trim().toUpperCase());
    const match = rows.find((row) => { const saved = row.customer_phone.replace(/\D/g, ''); return saved.endsWith(phoneDigits) || phoneDigits.endsWith(saved); });
    if (!match) return send(res, 404, { error: 'Commande introuvable. Vérifiez le numéro de commande et le téléphone.' });
    return send(res, 200, { order: loadOrder(match.id) });
  }
  if (path.startsWith('/api/admin/') || path.startsWith('/api/staff/') || req.method === 'PATCH' && path.startsWith('/api/orders/') && path.endsWith('/status')) {
    const staff = staffFrom(req);
    if (!staff) return send(res, 401, { error: 'Connexion du personnel requise.' });
    const isOrderStatusUpdate = req.method === 'PATCH' && path.startsWith('/api/orders/') && path.endsWith('/status');
    if (staff.role !== 'admin' && !isOrderStatusUpdate) return send(res, 403, { error: 'Accès réservé à la direction.' });
    if (req.method === 'GET' && path === '/api/admin/customers') return send(res, 200, { customers: readRows('customers') });
    if (req.method === 'PUT' && path === '/api/admin/catalog') {
      const body = await bodyJson(req);
      const kind = body.kind;
      const row = body.row;
      if (!row?.id || !['product', 'variant', 'zone'].includes(kind)) return send(res, 400, { error: 'Modification invalide.' });
      if (kind === 'variant' && (![row.price, row.stock_quantity].every((n) => Number.isSafeInteger(n) && n >= 0) || row.wholesale_price != null && (!Number.isSafeInteger(row.wholesale_price) || row.wholesale_price < 0) || row.wholesale_min_quantity != null && (!Number.isSafeInteger(row.wholesale_min_quantity) || row.wholesale_min_quantity < 1) || !String(row.sku || '').trim())) return send(res, 400, { error: 'Prix, seuil ou stock invalide.' });
      if (kind === 'zone' && (!Number.isSafeInteger(row.delivery_fee) || row.delivery_fee < 0)) return send(res, 400, { error: 'Frais de livraison invalides.' });
      if (kind === 'product') db.prepare('INSERT INTO products(id,category_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,data=excluded.data').run(row.id, row.category_id, JSON.stringify(row));
      if (kind === 'variant') db.prepare('INSERT INTO product_variants(id,product_id,sku,stock_quantity,data) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id,sku=excluded.sku,stock_quantity=excluded.stock_quantity,data=excluded.data').run(row.id, row.product_id, row.sku, row.stock_quantity, JSON.stringify(row));
      if (kind === 'zone') db.prepare('INSERT INTO delivery_zones(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(row.id, JSON.stringify(row));
      return send(res, 200, { ok: true });
    }
    if (req.method === 'PATCH' && (path.startsWith('/api/admin/orders/') || path.startsWith('/api/orders/') && path.endsWith('/status'))) {
      const isAdminRoute = path.startsWith('/api/admin/orders/');
      if (isAdminRoute && staff.role !== 'admin') return send(res, 403, { error: 'Accès réservé à la direction.' });
      const orderId = decodeURIComponent(path.slice(isAdminRoute ? '/api/admin/orders/'.length : '/api/orders/'.length, isAdminRoute ? undefined : -'/status'.length));
      const body = await bodyJson(req);
      const current = loadOrder(orderId);
      if (!current) return send(res, 404, { error: 'Commande introuvable.' });
      if (staff.role === 'delivery' && !['READY','OUT_FOR_DELIVERY'].includes(current.order_status)) return send(res, 403, { error: 'Cette commande ne fait pas partie de votre tournée.' });
      if (staff.role === 'delivery' && current.delivery_agent_name && current.delivery_agent_name !== staff.name) return send(res, 403, { error: 'Cette commande est attribuée à un autre livreur.' });
      if (staff.role === 'delivery' && !['OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY'].includes(body.status)) return send(res, 403, { error: 'Action non autorisée pour un livreur.' });
      const graph = { PENDING: ['CONFIRMED','CANCELLED'], CONFIRMED: ['PREPARING','CANCELLED'], PREPARING: ['READY','CANCELLED'], READY: ['OUT_FOR_DELIVERY','CANCELLED'], OUT_FOR_DELIVERY: ['DELIVERED','FAILED_DELIVERY'], DELIVERED: [], CANCELLED: [], FAILED_DELIVERY: [] };
      if (!graph[current.order_status]?.includes(body.status)) return send(res, 409, { error: `Transition impossible : ${current.order_status} → ${body.status}.` });
      const nextAt = new Date().toISOString();
      db.exec('BEGIN IMMEDIATE');
      try {
        const updated = { ...current, order_status: body.status };
        if (staff.role === 'delivery' && body.status === 'OUT_FOR_DELIVERY') updated.delivery_agent_name = staff.name;
        else if (body.agent_name && staff.role === 'admin') updated.delivery_agent_name = body.agent_name;
        if (body.status === 'CONFIRMED') updated.confirmed_at = nextAt;
        if (body.status === 'DELIVERED') { updated.delivered_at = nextAt; updated.payment_status = 'paid'; }
        if (body.status === 'FAILED_DELIVERY') updated.payment_status = 'failed';
        if (body.status === 'CANCELLED') {
          updated.cancelled_at = nextAt;
          for (const item of current.items) {
            const variantRow = db.prepare('SELECT data FROM product_variants WHERE id=?').get(item.product_variant_id);
            if (variantRow) { const v = JSON.parse(variantRow.data); if (v.track_stock) { v.stock_quantity += item.quantity; db.prepare('UPDATE product_variants SET stock_quantity=?,data=? WHERE id=?').run(v.stock_quantity, JSON.stringify(v), v.id); db.prepare('INSERT INTO inventory_movements VALUES(?,?,?,?,?,?)').run(randomUUID(), v.id, orderId, 'cancellation', item.quantity, nextAt); } }
          }
        }
        const history = { id: randomUUID(), order_id: orderId, from_status: current.order_status, to_status: body.status, changed_by: staff.name, comment: body.comment || `Statut passé à ${body.status}`, created_at: nextAt };
        updated.status_history.push(history);
        db.prepare('UPDATE orders SET order_status=?,data=? WHERE id=?').run(updated.order_status, JSON.stringify(updated), orderId);
        db.prepare('INSERT INTO order_status_histories(id,order_id,created_at,data) VALUES(?,?,?,?)').run(history.id, orderId, nextAt, JSON.stringify(history));
        db.exec('COMMIT');
        return send(res, 200, { order: updated });
      } catch (error) { db.exec('ROLLBACK'); return send(res, 500, { error: 'La commande n’a pas pu être mise à jour.' }); }
    }
  }
  return send(res, 404, { error: 'Page introuvable.' });
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.OLAICE_SERVE_DIST === 'true';
const vite = isProduction ? null : await (await import('vite')).createServer({ configFile: join(root, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon' };
const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) {
    try { await route(req, res); }
    catch (error) { console.error(error); send(res, 500, { error: 'Erreur serveur.' }); }
    return;
  }
  if (vite) { vite.middlewares(req, res, (error) => { if (error) { console.error(error); res.statusCode = 500; res.end('Erreur de développement.'); } }); return; }
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const distRoot = resolve(root, 'dist');
  const path = resolve(distRoot, `.${requested === '/' ? '/index.html' : requested}`);
  const file = (path === distRoot || path.startsWith(`${distRoot}/`) || path.startsWith(`${distRoot}\\`)) && existsSync(path) ? path : join(distRoot, 'index.html');
  try { res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end('Introuvable.'); }
});
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Ola Ice est disponible sur http://localhost:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { server.close(); vite?.close(); db.close(); });
