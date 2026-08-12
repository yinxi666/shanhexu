'use strict';
/* ============================================================
   数据与内容回归测试
   行为：为已知的数据类修复/约束提供回归兜底，防止被后续改动破坏：
   - 问答题库结构完整（30 题 / 每题 4 选项 / 唯一答案 / 解析）
   - 首页热力图官方名录分省数据求和 = 300，含港澳台 0
   - 场馆坐标完整且在合理国界内
   - 无重复场馆名
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers/css-analyzer');

const readFile = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('问答题库：30 题，每题 4 选项 + 有效答案 + 解析', () => {
  const src = readFile('js/quiz-data.js');
  // \n\s* 容忍任意缩进，避免"数据结构正确"依赖"源码排版不变"
  const m = src.match(/const quizData = (\[[\s\S]*?\n\s*\]);/);
  assert.ok(m, 'quiz-data.js 应包含 quizData 数组');
  const quizData = eval(m[1]);
  assert.strictEqual(quizData.length, 30, '题库应为 30 题');
  quizData.forEach((item, i) => {
    assert.ok(typeof item.q === 'string' && item.q.length > 0, `第${i + 1}题缺题干`);
    assert.strictEqual(item.opts.length, 4, `第${i + 1}题应恰有 4 个选项`);
    assert.ok(Number.isInteger(item.a) && item.a >= 0 && item.a < 4, `第${i + 1}题答案索引非法`);
    assert.ok(typeof item.tip === 'string' && item.tip.length > 0, `第${i + 1}题缺解析`);
  });
});

test('热力图官方数据：31 省求和 = 300（新疆含兵团），港澳台补 0', () => {
  const src = readFile('js/heatmap-data.js');
  const m = src.match(/const OFFICIAL_ATTRACTIONS = (\{[\s\S]*?\n\s*\});/);
  assert.ok(m, 'heatmap-data.js 应包含 OFFICIAL_ATTRACTIONS');
  const data = eval('(' + m[1] + ')');
  const sum = Object.values(data).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 300, '官方名录分省求和应为 300');
  assert.strictEqual(Object.keys(data).length, 31, '应为 31 个省级行政区（含兵团并入新疆，无港澳台）');
  assert.strictEqual(data['新疆维吾尔自治区'], 12, '新疆应为 8+兵团4=12');
});

test('场馆坐标：核心 15 馆全部有完整经纬度且在国界内', () => {
  const venues = JSON.parse(readFile('data/venues.json'));
  assert.strictEqual(venues.length, 15, '核心场馆应为 15 个');
  venues.forEach((v) => {
    assert.ok(v.coordinates && Number.isFinite(v.coordinates.lat) && Number.isFinite(v.coordinates.lng),
      `${v.name} 缺完整坐标`);
    assert.ok(v.coordinates.lat >= 15 && v.coordinates.lat <= 55, `${v.name} 纬度越界`);
    assert.ok(v.coordinates.lng >= 70 && v.coordinates.lng <= 140, `${v.name} 经度越界`);
  });
});

test('场馆名无重复（venues + province-candidates 合并前各自唯一）', () => {
  const venues = JSON.parse(readFile('data/venues.json'));
  const candidates = JSON.parse(readFile('data/province-candidates.json'));
  const names1 = new Set(venues.map((v) => v.name || v.standardName));
  assert.strictEqual(names1.size, venues.length, 'venues.json 存在重名场馆');
  const names2 = new Set(candidates.map((c) => c.name || c.standardName));
  assert.strictEqual(names2.size, candidates.length, 'province-candidates.json 存在重名候选');
});

test('扩展场馆元数据：无死键、字段完整，且无占位名残留', () => {
  const candidates = JSON.parse(readFile('data/province-candidates.json'));
  const aliases = JSON.parse(readFile('data/venue-aliases.json')).aliases;
  const meta = JSON.parse(readFile('data/extended-venues-meta.json'));
  const coreNames = new Set([
    ...JSON.parse(readFile('data/venues.json')).map((v) => v.name || v.standardName),
    ...aliases,
  ]);
  // 每个 meta 键都必须对应一个候选，且不可达键（被别名去重）不应残留在 meta 中
  const candidateStdNames = new Set(candidates.map((c) => c.standardName));
  for (const [key, entry] of Object.entries(meta)) {
    assert.ok(candidateStdNames.has(key), `meta 键 ${key} 无对应候选条目`);
    assert.ok(!coreNames.has(key), `meta 键 ${key} 与核心/别名重复（不可达死数据）`);
    assert.ok(entry.image && entry.image.startsWith('assets/'), `${key} 缺合法 image`);
    assert.ok(entry.category, `${key} 缺 category`);
    assert.ok(entry.coordinates && Number.isFinite(entry.coordinates.lat) && Number.isFinite(entry.coordinates.lng),
      `${key} 缺完整坐标`);
  }
  // 青海候选占位名不得残留（此前靠 data.js 魔法字符串救回）
  const qinghai = candidates.find((c) => c.standardName === '青海原子城纪念馆');
  assert.ok(qinghai && !/需进一步核验/.test(qinghai.name), '青海候选仍携带占位名');
});

test('china.json：34 个具名省级要素均有 center + centroid，末要素为南海诸岛轮廓', () => {
  const gj = JSON.parse(readFile('data/china.json'));
  const named = gj.features.filter((f) => f.properties && f.properties.name);
  assert.strictEqual(named.length, 34, '应恰有 34 个具名省级要素');
  named.forEach((f) => {
    assert.ok(Array.isArray(f.properties.center) && f.properties.center.length === 2, `${f.properties.name} 缺 center`);
    assert.ok(Array.isArray(f.properties.centroid) && f.properties.centroid.length === 2, `${f.properties.name} 缺 centroid`);
  });
  const unnamed = gj.features.filter((f) => f.properties && !f.properties.name);
  assert.strictEqual(unnamed.length, 1, '应恰有 1 个无名要素（南海诸岛）');
  // 标题承诺"末要素为南海诸岛轮廓"：校验无名要素确实排在数组末位（渲染层可能依赖最后绘制）
  assert.strictEqual(gj.features[gj.features.length - 1], unnamed[0], '南海诸岛轮廓应位于 features 末位');
});

test('别名全被消费：venue-aliases 中每个别名都是候选 standardName', () => {
  const aliases = JSON.parse(readFile('data/venue-aliases.json')).aliases;
  const candidates = JSON.parse(readFile('data/province-candidates.json'));
  const candidateStdNames = new Set(candidates.map((c) => c.standardName));
  for (const a of aliases) {
    assert.ok(candidateStdNames.has(a), `别名 ${a} 未对应任何候选（死别名）`);
  }
});
