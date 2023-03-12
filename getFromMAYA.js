const puppeteer = require('puppeteer');
require('dotenv').config();

const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const log4js = require("log4js");

log4js.configure({
  appenders: {
    console: { type: "console" },
    log: { type: "file", filename: "maya.log" },
  },
  categories: {
    default: { appenders: ["log", "console"], level: "debug" },
  },
});
const debug = log4js.getLogger("default");

const client = new Client({
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"]
  }
});


function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  });
}

async function loginPage(browser, page) {
  await page.goto('https://maya.um.edu.my/sitsvision/wrd/siw_lgn', { waitUntil: 'networkidle2' });
  await page.setViewport({ width: 1080, height: 1024 });
  debug.log('[LOGIN] Login Page loaded');
  //await page.screenshot({ path: 'user.png' });

  const userInput = await page.$x('//*[@id="MUA_CODE.DUMMY.MENSYS"]');
  await userInput[0].type(process.env.EMAIL);
  const passInput = await page.$x('//*[@id="PASSWORD.DUMMY.MENSYS"]');
  await passInput[0].type(process.env.PASSWORD);
  // await page.screenshot({ path: 'login.png' });
  debug.log('[LOGIN] Username and password typed.');

  await Promise.all([
    page.click('xpath/html/body/div[1]/div[1]/div/form/div[2]/div/div[1]/div/div[2]/div/fieldset/div[3]/div/input'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  // TODO: ADD Checking function if email and password correct / any error
  await page.screenshot({ path: 'dashboard.png' });
  debug.log('[LOGIN] Login sucessfully. Check screenshot.')
};

async function clickTimetable(browser, page) {
  //const matrixNumberField = await page.$x('//*[@id="student-tabs-1"]/div/div/table/tbody/tr[1]/td[2]');
  //const studentNameField = await page.$x('//*[@id="student-tabs-1"]/div/div/table/tbody/tr[4]/td[2]');
  //let matrixNumber = await page.evaluate(el => el.innerText, matrixNumberField[0]);
  //let studentName = await page.evaluate(el => el.innerText, studentNameField[0]);
  //debug.log(`[DASHBOARD] Logged in as ${studentName} (${matrixNumber})`);

  await page.click('xpath/html/body/div[1]/div/div/div/div[3]/div[2]/div/div/div[1]/div/div/div[2]/a/div');
  await page.waitForXPath('//*[@id="sits_dialog"]/center/div/div/div[2]/a');
  const tableButton = await page.$x('//*[@id="sits_dialog"]/center/div/div/div[2]/a');
  await Promise.all([
    tableButton[0].click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  //await page.screenshot({ path: 'timetable.png' });
  debug.log('[TIMETABLE] Navigated to timetable page. Check screenshot.')
}

async function selectTimetable(browser, page) {
  // TODO: SELECT using value instead of keyboard
  const yearInput = await page.$x('/html/body/div[1]/div/div/div/form/div[3]/div/div/div[2]/div[2]/div/div/fieldset/div[2]/div/div/div/div/input');
  await yearInput[0].type(process.env.YEAR);
  await page.keyboard.press('Enter');
  const periodInput = await page.$x('/html/body/div[1]/div/div/div/form/div[3]/div/div/div[2]/div[2]/div/div/fieldset/div[3]/div/div/div/div/input');
  await periodInput[0].type(process.env.SEMESTER);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  //const facultyInput = await page.$x('/html/body/div[1]/div/div/div/form/div[3]/div/div/div[2]/div[2]/div/div/fieldset/div[4]/div/div/div/div/input');
  //await facultyInput[0].type(process.env.FACULTY);
  //await page.keyboard.press('Enter');
  const codeInput = await page.$x('/html/body/div[1]/div/div/div/form/div[3]/div/div/div[2]/div[2]/div/div/fieldset/div[7]/div/div/input[1]');
  await codeInput[0].type(process.env.COURSE);

  //await page.screenshot({ path: 'course.png' });
  debug.log('[TIMETABLE] Keyed in all details. Check screenshot.')

  await Promise.all([
    page.click('xpath/html/body/div[1]/div/div/div/form/div[3]/div/div/div[2]/div[3]/div/input[3]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  //await page.screenshot({ path: 'searching.png' })
}

async function checkTimetable(browser, page) {

  const occuranceCountTextField = await page.$x('//*[@id="DataTables_Table_0_info"]');
  let occuranceCount = await page.evaluate(el => el.textContent, occuranceCountTextField[0])
  occuranceCount = occuranceCount.split(" ")[5];
  debug.log(`[TIMETABLE] Timetable obtained. Total ${occuranceCount} occurances.`)

  let dataTimeTable = [];
  if (occuranceCount <= 10) {
    dataTimeTable = await page.evaluate(
      () => Array.from(
        document.querySelectorAll('table[id="DataTables_Table_0"] > tbody > tr'),
        row => Array.from(row.querySelectorAll('th, td'), cell => cell.innerText)
      )
    );
  }
  else {
    for (i = 0; i < Math.floor(occuranceCount / 10) + 1; i++) {
      let dataTables = await page.evaluate(
        () => Array.from(
          document.querySelectorAll('table[id="DataTables_Table_0"] > tbody > tr'),
          row => Array.from(row.querySelectorAll('th, td'), cell => cell.innerText)
        )
      );
      dataTimeTable.push(...dataTables);
      console.log(i, dataTables.length);
      await (await page.$x('//*[@id="DataTables_Table_0_next"]/a'))[0].click();
      delay(10);
    }
  }
  const courseName = dataTimeTable[0][0];
  const lectName = dataTimeTable.map(function (x) { return x[5] });
  const capacity = dataTimeTable.map(function (x) { return `[${x[1]}] ${x[4].replace(/\n/g, ' ')}: ${x[8]}/${x[7]}` });
  const availability = dataTimeTable.map(function (x) { return x[8] });

  return [courseName, lectName, capacity, availability]
}

let lastAvailability=[]

async function main(phone, client,lastAvailability) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await loginPage(browser, page);
    await clickTimetable(browser, page);
    await selectTimetable(browser, page);
    let courseName, lectName, capacity, availability;
    [courseName, lectName, capacity, availability] = await checkTimetable(browser, page);

    if (JSON.stringify(availability)===JSON.stringify(lastAvailability)) {
      console.log('[MONITOR] Nothing changes');
    }
    else {
      lastAvailability = availability
      console.log('[MONITOR] Different from last check');
      client.sendMessage(phone, `*${courseName}*\n${capacity}\n_Refresh every 1 minutes_\n_Only send when availbility changes_`)
    }
    console.log('COURSE: ', courseName);
    console.log(capacity);
    
    await browser.close();
  }
  catch (err) {
    console.log('Error', err)
  }
  setTimeout(main, 40000, phone, client,lastAvailability)
}

main();
