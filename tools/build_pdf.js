// 주차별 교안 요약(weeks/*.html)을 A4 PDF로 만듦.
// 여백(한글 편집 용지 기준): 왼쪽·오른쪽 30mm, 위쪽 20mm + 머리말 15mm, 아래쪽 15mm + 꼬리말 15mm, 제본 0mm
// → 본문 영역: 위 35mm, 아래 30mm, 좌우 30mm. 머리말은 위 20~35mm, 꼬리말은 아래 15~30mm 구간에 놓임.
// 전체 묶음: pdfunite pdf/week0*.pdf pdf/all_weeks_02-08.pdf
// 실행: node tools/build_pdf.js  (Playwright 필요, 글꼴 Pretendard가 시스템에 설치되어 있어야 함.
// OTF(CFF)를 설치하면 PDF에 Type 3 글꼴로 들어가므로 TTF로 설치할 것)
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "pdf");
const WEEKS = [
  ["02", "week02_cell_communication", "세포는 어떻게 소통할까"],
  ["03", "week03_genetic_variation", "유전 변이와 유전질환"],
  ["04", "week04_cancer", "암과 암세포의 특징"],
  ["05", "week05_immunity_allergy", "면역과 알레르기"],
  ["06", "week06_homeostasis_memory_self", "항상성·기억과 자아"],
  ["07", "week07_genome_acquired_change", "유전체 정보의 후천적 변화"],
  ["08", "week08_mrna_therapeutics", "mRNA 치료제와 전달 시스템"],
];

// 인쇄용으로 덧붙이는 스타일
const PRINT_CSS = `
  .sitebar, .pager, nav.toc { display: none !important; }
  html { scroll-behavior: auto; }
  body { background: #fff; }
  .wrap { max-width: none; padding: 0; }
  header.hero { padding: 26px 24px 22px; border-radius: 8px; margin-bottom: 26px; }
  header.hero .wrap { padding: 0; }
  .hero h1 { font-size: 28px; }
  .part { margin-top: 0; }
  .part-head, h3, h4, h5, .label, .tag { break-after: avoid; }
  section.topic { margin-top: 28px; }
  .tbl { overflow: visible; }
  .tbl, table { break-inside: auto !important; }
  table { font-size: 13.5px; }
  thead { display: table-header-group; }
  tr, li, .eval { break-inside: avoid; }
  footer { margin-top: 36px; break-inside: avoid; }
  .quiz details { display: block; }
`;

const FONT = `font-family:Pretendard,sans-serif;font-size:7.5pt;color:#56635b;`;
const header = (wk, title) => `
  <div style="${FONT}width:100%;margin:0 30mm;padding-top:22mm;display:flex;justify-content:space-between;
    border-bottom:0.5pt solid #bbe5c8;padding-bottom:1.5mm;-webkit-print-color-adjust:exact;">
    <span style="color:#166534;font-weight:700;">생명과학의 세계 · ${Number(wk)}주차</span><span>${title}</span>
  </div>`;
const footer = `
  <div style="${FONT}width:100%;margin:0 30mm 16mm;text-align:center;">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // 외부 글꼴 CSS는 쓰지 않고 시스템에 설치된 Pretendard를 씀
  await page.route(/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr/, (r) => r.abort());
  const files = [];
  for (const [wk, name, title] of WEEKS) {
    await page.goto("file://" + path.join(ROOT, "weeks", name + ".html"), { waitUntil: "load" });
    await page.addStyleTag({ content: PRINT_CSS });
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    // 차시(강의)마다 새 쪽에서 시작. 교안 HTML에서 .part가 중첩된 경우가 있어 문서 순서로 처리함
    await page.evaluate(() => document.querySelectorAll(".part").forEach((el, i) => { if (i) el.style.breakBefore = "page"; }));
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `week${wk}_${name.slice(7)}.pdf`);
    await page.pdf({
      path: file,
      format: "A4",
      printBackground: true,
      scale: 0.8,
      margin: { top: "35mm", bottom: "30mm", left: "30mm", right: "30mm" },
      displayHeaderFooter: true,
      headerTemplate: header(wk, title),
      footerTemplate: footer,
    });
    files.push(file);
    console.log("완료", path.relative(ROOT, file));
  }
  await browser.close();
})();
