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

function extractObject(src, name) {
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*(\\[|\\{)[\\s\\S]*?\\n\\s*\\];?');
  const m = src.match(re);
  assert.ok(m, `未找到 ${name} 定义`);
  return eval('(' + m[0].replace(/^const\s+\S+\s*=\s*/, '') + ')');
}

test('问答题库：30 题，每题 4 选项 + 有效答案 + 解析', () => {
  const src = readFile('js/quiz.js');
  const m = src.match(/const quizData = (\[[\s\S]*?\n  \]);/);
  assert.ok(m, 'quiz.js 应包含 quizData 数组');
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
  const src = readFile('js/heatmap.js');
  const m = src.match(/const OFFICIAL_ATTRACTIONS = (\{[\s\S]*?\n\});/);
  assert.ok(m, 'heatmap.js 应包含 OFFICIAL_ATTRACTIONS');
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
