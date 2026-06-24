const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

// ===== Sentiment Analysis (Keyword-based) =====
const POSITIVE_WORDS = [
  // ผลประกอบการดี
  "กำไร","กำไรสุทธิ","กำไรพุ่ง","กำไรสูงสุด","รายได้เพิ่ม","รายได้สูง","ผลประกอบการดี",
  "เกินคาด","เหนือคาด","ดีกว่าคาด","ทำสถิติ","ทุบสถิติ","นิวไฮ","ทำนิวไฮ","สูงสุดใหม่",
  // การเติบโต
  "เติบโต","ขยายตัว","เร่งตัว","พุ่งสูง","พุ่ง","กระโดด","ทะยาน","โต","บูม","ฟื้นตัว",
  "ฟื้นฟู","ฟื้น","ดีขึ้น","แข็งแกร่ง","แข็งค่า","แข็งแกร่งขึ้น","ปรับตัวขึ้น","ขึ้น","เพิ่ม","เพิ่มขึ้น",
  // ความสำเร็จ
  "ประสบความสำเร็จ","ความสำเร็จ","ชนะ","ได้รับ","คว้า","เปิดตัว","เปิดตลาด","เปิดบริการ",
  "เปิดโรงงาน","เปิดสาขา","เปิดดำเนินการ","ลงนาม","จับมือ","พันธมิตร","ร่วมมือ","ความร่วมมือ",
  // การลงทุนและการเงิน
  "ลงทุน","ระดมทุน","ซื้อกิจการ","ควบรวม","ส่วนแบ่ง","ส่วนแบ่งตลาด","ดีล","ข้อตกลง",
  "สัญญา","อนุมัติ","ผ่าน","รับรอง","ได้รับการอนุมัติ","ได้รับอนุญาต","ไฟเขียว",
  // คำบวกทั่วไป
  "บวก","เกิน","แซง","โอกาส","ศักยภาพ","แนวโน้มดี","มองบวก","มั่นใจ","แข็งแกร่ง",
  "ยั่งยืน","มีประสิทธิภาพ","ประหยัด","คุ้มค่า","สร้างมูลค่า","สร้างรายได้","ทำกำไร",
  "ปันผล","เงินปันผล","ซื้อคืนหุ้น","buyback","ปรับเพิ่ม","อัพเกรด"
]

const NEGATIVE_WORDS = [
  // ผลประกอบการแย่
  "ขาดทุน","ขาดทุนสุทธิ","ขาดทุนพุ่ง","ผลขาดทุน","รายได้ลด","รายได้หด","ต่ำกว่าคาด",
  "ผิดคาด","พลาดเป้า","ต่ำกว่าเป้า","ไม่เป็นไปตามเป้า","ผลประกอบการแย่","ขาดทุนหนัก",
  // การลดลง
  "ลด","ลดลง","ร่วง","ดิ่ง","ทรุด","หดตัว","ถดถอย","ตกต่ำ","ตก","ปรับตัวลง","ลงต่ำ",
  "อ่อนค่า","อ่อนตัว","อ่อนแอ","ติดลบ","ส่งผลลบ","กดดัน","ฉุด","ลากลง","ร่วงแรง",
  // ปัญหาและวิกฤต
  "วิกฤต","วิกฤตการณ์","ปัญหา","อุปสรรค","ติดขัด","ชะงัก","สะดุด","ล้มเหลว","ไม่สำเร็จ",
  "ไม่ประสบความสำเร็จ","ล้ม","พัง","เสียหาย","สูญเสีย","สูญ","บาดเจ็บ","กระทบ","ผลกระทบลบ",
  // ความเสี่ยงและความไม่แน่นอน
  "เสี่ยง","ความเสี่ยง","กังวล","วิตก","ไม่แน่นอน","ความไม่แน่นอน","ระมัดระวัง","ระวัง",
  "เตือน","คำเตือน","แจ้งเตือน","สัญญาณอันตราย","น่าเป็นห่วง","เป็นห่วง",
  // กฎหมายและการทุจริต
  "ถูกฟ้อง","ฟ้องร้อง","คดีความ","คดี","โกง","ทุจริต","ฉ้อโกง","คอร์รัปชัน","สอบสวน",
  "ตรวจสอบ","ถูกสอบสวน","ถูกตรวจสอบ","ปรับ","โทษ","บทลงโทษ","ถูกแบน","ระงับใบอนุญาต",
  // การปลดและปิดกิจการ
  "ปลด","ไล่ออก","ลดพนักงาน","ปลดพนักงาน","ปิดตัว","ปิดกิจการ","เลิกกิจการ","ล้มละลาย",
  "พิทักษ์ทรัพย์","ฟื้นฟูกิจการ","ยุบ","ถอนตัว","ถอนการลงทุน",
  // หนี้และการเงิน
  "หนี้","หนี้สิน","ผิดนัด","ผิดนัดชำระ","ชำระหนี้ไม่ได้","ภาระหนี้","เจ้าหนี้","ล้นหนี้",
  "ขาดสภาพคล่อง","สภาพคล่องตึงตัว","เงินสดไม่พอ",
  // การชะลอและยกเลิก
  "ชะลอ","ชะลอตัว","ล่าช้า","ยกเลิก","เลื่อน","ระงับ","หยุดชะงัก","ไม่คืบหน้า",
  "ติดขัด","ขาดแคลน","ขาดแคลนวัตถุดิบ","ซัพพลายขาด",
  // การขายและเทขาย
  "เทขาย","แรงขาย","แรงเทขาย","นักลงทุนเทขาย","ถูกเทขาย",
  // คำลบที่มากับคำบวก (negation)
  "ไม่กำไร","ไม่เติบโต","ไม่ผ่าน","ไม่ได้รับอนุมัติ","ไม่ประสบความสำเร็จ",
  "ไม่เป็นไปตามคาด","ไม่บรรลุเป้า","ไม่สำเร็จ","ไม่ฟื้นตัว","ยังไม่ฟื้น"
]

// ตรวจจับ negation pattern เพิ่มเติม
function hasNegationBefore(text, word) {
  const negations = ["ไม่","ยัง","ยังไม่","ไม่ได้","ไม่สามารถ","ล้มเหลว"]
  const idx = text.indexOf(word)
  if (idx === -1) return false
  const before = text.substring(Math.max(0, idx - 10), idx)
  return negations.some(n => before.includes(n))
}

function analyzeSentiment(title, summary) {
  const text = (title + " " + summary).toLowerCase() //นำหัวข้อและเนื้อหาข่าวมาต่อกันเป็นข้อความเดียว แล้วแปลงเป็นตัวพิมพ์เล็กทั้งหมด เพื่อให้การเปรียบเทียบคำไม่สนใจตัวพิมพ์ใหญ่-เล็ก
  let posScore = 0, negScore = 0
  POSITIVE_WORDS.forEach(w => {
    if (text.includes(w.toLowerCase())) {
      // ถ้ามีคำปฏิเสธนำหน้า ให้นับเป็น negative แทน
      if (hasNegationBefore(text, w.toLowerCase())) negScore++
      else posScore++
    }
  })
    //นับคะแนน Negative
  NEGATIVE_WORDS.forEach(w => { if (text.includes(w.toLowerCase())) negScore++ })
    //ตัดสินผลลัพธ์
  if (posScore === 0 && negScore === 0) return "neutral"
  if (posScore > negScore) return "positive"
  if (negScore > posScore) return "negative"
  return "neutral"
}





// เสิร์ฟไฟล์ในโฟลเดอร์ public (เช่น index.html)
app.use(express.static("public"));

// ===== Middleware =====
app.use(express.json());
app.use(cors());

// log ทุก request
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

// ===== ตั้งค่า MySQL (แก้ค่าให้ตรงกับ phpMyAdmin ของเรา) =====
const pool = mysql.createPool({
  host: "localhost",
  user: "root",        // ปกติ XAMPP จะเป็น root
  password: "",        // ถ้ามีรหัส ให้ใส่ตรงนี้
  database: "myproject_db", // ตั้งชื่อ database ตามที่สร้างใน phpMyAdmin
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// สร้างตารางถ้ายังไม่มี
async function initDb() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS news (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title TEXT,
      summary TEXT,
      url TEXT,
      source VARCHAR(255),
      published_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      sentiment VARCHAR(20) NULL
    )
  `;
  const conn = await pool.getConnection();
  try {
    await conn.query(createTableSql);
    console.log("✅ MySQL table 'news' ready")
    // เพิ่ม column sentiment ถ้ายังไม่มี (สำหรับ DB เก่า)
    try { await conn.query("ALTER TABLE news ADD COLUMN sentiment VARCHAR(20) NULL") } catch(e) {};
  } finally {
    conn.release();
  }
}

initDb().catch((err) => {
  console.error("DB init error:", err);
  process.exit(1);
});

// ===== Routes =====

// root เอาไว้เทส
//app.get("/", (req, res) => {
//  res.send("Hello from ROOT with MySQL on port 4000");
//});

// GET /api/news : ดึงข่าวจาก DB
app.get("/api/news", async (req, res) => {
  console.log("GET /api/news handler running");
  try {
    const [rows] = await pool.query(
     "SELECT * FROM news WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err); //ถ้าดึงข่าวไม่สำเร็จ
    res.status(500).json({ message: "ดึงข่าวไม่สำเร็จ" });
  }
});

app.delete("/api/news/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE news SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข่าว หรือถูกลบไปแล้ว" });
    }
    res.json({ message: "ลบข่าวแบบ soft delete แล้ว" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "ลบข่าวไม่สำเร็จ" });
  }
});


// GET /api/momentum?range=1d|7d|30d : สถิติข่าวเชิงปริมาณจริง
app.get("/api/momentum", async (req, res) => {
  try {

    // ── range config ──────────────────────────────────────────
    const range = req.query.range || "1d" //ถ้าไม่ส่งค่า range มา ระบบจะใช้ "1d" เป็นค่าเริ่มต้น

    // "current" period = ช่วงที่เลือก
    // "prev"    period = ช่วงก่อนหน้าขนาดเดียวกัน (เพื่อคำนวณ change)
    const rangeConfig = {
      "1d":  { label: "24 ชม.",   curInterval: "24 HOUR",  prevStart: "48 HOUR", prevEnd: "24 HOUR", avgDays: 7  },
      "7d":  { label: "7 วัน",    curInterval: "7 DAY",    prevStart: "14 DAY",  prevEnd: "7 DAY",   avgDays: 30 },
      "30d": { label: "30 วัน",   curInterval: "30 DAY",   prevStart: "60 DAY",  prevEnd: "30 DAY",  avgDays: 90 },
    }
    const cfg = rangeConfig[range] || rangeConfig["1d"]

    // ── current period ────────────────────────────────────────
    const [current] = await pool.query(`
      SELECT source, COUNT(*) as count
      FROM news
      WHERE created_at >= NOW() - INTERVAL ${cfg.curInterval}
        AND deleted_at IS NULL
      GROUP BY source
    `);

    // ── previous period (เพื่อเทียบ change) ────────────────── (SELECT source, COUNT(*) as count)ดึงจำนวนข่าวย้อนหลังตาม range ที่เลือก
    const [previous] = await pool.query(`
      SELECT source, COUNT(*) as count  
      FROM news
      WHERE created_at BETWEEN
            NOW() - INTERVAL ${cfg.prevStart}
            AND NOW() - INTERVAL ${cfg.prevEnd}
        AND deleted_at IS NULL
      GROUP BY source
    `);

    // ── moving average: นับจากวันที่มีข้อมูลจริง ──────────────
    const [avgRows] = await pool.query(`
      SELECT source, COUNT(*) as count
      FROM news
      WHERE created_at BETWEEN
            NOW() - INTERVAL ${cfg.avgDays + 1} DAY
            AND NOW() - INTERVAL 1 DAY
        AND deleted_at IS NULL
      GROUP BY source
    `);

    // นับจำนวนวันจริงที่มีข้อมูลใน avgDays window
    const [actualDaysRows] = await pool.query(`
      SELECT source, COUNT(DISTINCT DATE(created_at)) as actual_days
      FROM news
      WHERE created_at BETWEEN
            NOW() - INTERVAL ${cfg.avgDays + 1} DAY
            AND NOW() - INTERVAL 1 DAY
        AND deleted_at IS NULL
      GROUP BY source
    `);

    // รวมข่าวทั้งหมดใน period นี้
    const totalCurrent = current.reduce((sum, t) => sum + Number(t.count), 0);

    const result = current.map(t => {
      const curCount  = Number(t.count);
      const p         = previous.find(i => i.source === t.source);
      const prevCount = p ? Number(p.count) : 0;
      const a         = avgRows.find(i => i.source === t.source);
      const avgCount  = a ? Number(a.count) : 0;
      const d         = actualDaysRows.find(i => i.source === t.source);
      // หารตามวันจริงที่มีข้อมูล (min 1) ไม่ใช่ cfg.avgDays เสมอ
      const actualDays = d ? Math.max(Number(d.actual_days), 1) : 1;

      // avg ต่อวัน (หารด้วยวันจริง)
      const avgPerDay = +(avgCount / actualDays).toFixed(1);
      // บอกด้วยว่าคำนวณจากกี่วันจริง
      const avgBaseDays = actualDays;

      // change เทียบช่วงก่อนหน้า
      const change    = curCount - prevCount;
      const changePct = prevCount > 0
        ? +((change / prevCount) * 100).toFixed(1)
        : null;

      // สัดส่วนต่อ total ของ period นี้
      const shareOfTotal = totalCurrent > 0
        ? +((curCount / totalCurrent) * 100).toFixed(1)
        : 0;

      const isNew = prevCount === 0;

      return {
        category:      t.source,
        today:         curCount,
        yesterday:     prevCount,
        change,
        changePct,
        avgPerDay,
        avgBaseDays,   // จำนวนวันจริงที่ใช้คำนวณ avg
        shareOfTotal,
        totalToday:    totalCurrent,
        isNew,
        rangeLabel:    cfg.label
      };
    });

    res.json(result);

  } catch (err) {
    console.error("Momentum error:", err);
    res.status(500).json({ message: "momentum error" });
  }
});


//ใช้ไลบรารี yahoo-finance2 เป็นตัวกลางในการดึงข้อมูลจาก Yahoo Finance
// ===== ETF mapping: หมวดข่าวภาษาไทย → ETF symbol =====
const ETF_MAP = {
  "การเงิน":                    { symbol: "XLF", name: "Financial" },
  "พลังงาน":                    { symbol: "XLE", name: "Energy" },
  "เทคโนโลยี":                  { symbol: "XLK", name: "Technology" },
  "สุขภาพ":                     { symbol: "XLV", name: "Health Care" },
  "ยาและชีวเวชภัณฑ์":           { symbol: "XLV", name: "Health Care" },
  "เวชภัณฑ์และอุปกรณ์การแพทย์": { symbol: "XLV", name: "Health Care" },
  "อุตสาหกรรม":                 { symbol: "XLI", name: "Industrials" },
  "วัสดุ":                      { symbol: "XLB", name: "Materials" },
  "อสังหาริมทรัพย์":            { symbol: "XLRE", name: "Real Estate" },
  "สินค้าอุปโภคบริโภค":         { symbol: "XLP", name: "Consumer Staples" },
  "สินค้าฟุ่มเฟือย":            { symbol: "XLY", name: "Consumer Discr." },
  "โทรคมนาคม":                  { symbol: "XLC", name: "Comm. Services" },
  "สาธารณูปโภค":                { symbol: "XLU", name: "Utilities" },
  // ดัชนีหลัก
  "ตลาดรวม":                    { symbol: "SPY", name: "S&P 500" },
};

// GET /api/stocks : ดึงราคา ETF ผ่าน yahoo-finance2 (npm install yahoo-finance2)
app.get("/api/stocks", async (req, res) => {
  try {
    const { default: YahooFinance } = await import("yahoo-finance2")
    const yahooFinance = new YahooFinance()

    // รวม symbol ที่ไม่ซ้ำกัน
    const symbols = [...new Set(Object.values(ETF_MAP).map(e => e.symbol))]

    // ดึงพร้อมกันทุกตัว
    const results = await Promise.allSettled(
      symbols.map(sym =>
        yahooFinance.quote(sym, {}, { validateResult: false })
      )
    )

    const priceMap = {}
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        const q = r.value
        priceMap[symbols[i]] = {
          symbol:    symbols[i],
          name:      q.shortName || q.longName || symbols[i],
          price:     +(q.regularMarketPrice        || 0).toFixed(2),
          change:    +(q.regularMarketChange        || 0).toFixed(2),
          changePct: +(q.regularMarketChangePercent || 0).toFixed(2),
        }
      }
    })

    res.json({ prices: priceMap, etfMap: ETF_MAP })

  } catch (err) {
    console.error("Stock fetch error:", err.message)
    res.status(500).json({ message: "ดึงราคาหุ้นไม่สำเร็จ", error: err.message })
  }
})

// POST /api/news/bulk : รับหลายข่าวจาก n8n (แบบแยกตามหมวด)
app.post("/api/news/bulk", async (req, res) => {
  console.log("BODY:", JSON.stringify(req.body, null, 2));

  let data = req.body.news; // อันนี้อาจเป็น [ { ... } ] หรือ { ... } หรือ string

  // ถ้าเป็น string (เช่น ถูกส่งมาเป็น JSON string) ให้ลอง parse ก่อน
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return res.status(400).json({
        message: "news เป็น string ที่ parse ไม่ได้",
      });
    }
  }

  // ถ้าเป็น array แบบ [ { ... } ] ให้หยิบตัวแรกมาใช้เป็น grouped
  let grouped = null;
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === "object") {
      grouped = data[0];
    }
  } else if (data && typeof data === "object") {
    // กรณีส่งมาเป็น object อยู่แล้ว
    grouped = data;
  }

  if (!grouped || typeof grouped !== "object") {
    return res.status(400).json({
      message:
        "รูปแบบข้อมูลไม่ถูกต้อง ต้องอยู่ในรูปแบบ { news: {หมวดหมู่: [...] } } หรือ { news: [ {หมวดหมู่: [...] } ] }",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // grouped = { "เทคโนโลยี": [...], "ยาและชีวเวชภัณฑ์": [...], ... }
    for (const [category, items] of Object.entries(grouped)) {
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const title = item["หัวข้อ"] || "";
        const summary = item["เนื้อหาสำคัญ"] || "";
        const url = item["url"] || ""; // รับ URL จาก n8n
        console.log("URL:", item["url"], "keys:", Object.keys(item));
        const source = category; // ใส่ชื่อหมวดลง column source
        const published_at = null;


        const sentiment = analyzeSentiment(title, summary);

        await conn.query(
          `INSERT INTO news (title, summary, url, source, published_at, sentiment)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [title, summary, url, source, published_at, sentiment]
        );
      }
    }

    await conn.commit();
    res.json({ message: "บันทึกข่าวตามหมวดหมู่สำเร็จ" });
  } catch (err) {
    await conn.rollback();
    console.error("DB error:", err);
    res.status(500).json({
      message: "บันทึกข่าวแบบ bulk ไม่สำเร็จ",
      error: err.message,
    });
  } finally {
    conn.release();
  }
});

// POST /api/news/analyze : วิเคราะห์ sentiment ข่าวเก่าที่ยังไม่มีค่า
app.post("/api/news/analyze", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, summary FROM news WHERE sentiment IS NULL AND deleted_at IS NULL"
    )
    if (rows.length === 0) return res.json({ message: "ไม่มีข่าวที่ต้องวิเคราะห์", analyzed: 0 })

    for (const row of rows) {
      const sentiment = analyzeSentiment(row.title, row.summary)
      await pool.query("UPDATE news SET sentiment = ? WHERE id = ?", [sentiment, row.id])
    }

    res.json({ message: `วิเคราะห์เสร็จ ${rows.length} ข่าว`, analyzed: rows.length })
  } catch (err) {
    console.error("Analyze error:", err)
    res.status(500).json({ message: "วิเคราะห์ไม่สำเร็จ" })
  }
})

// 404 จับ route ที่ไม่มี
app.use((req, res) => {
  res
    .status(404)
    .send(`Custom 404 from THIS NODE SERVER for ${req.method} ${req.url}`);
});

// ===== Start server =====
app.listen(4000, () => {
  console.log("Server listening on http://localhost:4000");
});