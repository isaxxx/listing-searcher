const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');

const crawl = async (target, isSP = false) => {
  let suffix = isSP ? '（iPhone6）' : '（Desktop）';
  const targetName = target + suffix;
  console.log(chalk.green('Start: ' + targetName));

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  });
  const page = await browser.newPage();

  if (isSP) {
    await page.emulate(devices['iPhone 6']);
  } else {
    await page.emulate({
      name: 'Desktop 1366x768',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
      viewport: {
        width: 1366,
        height: 768
      }
    });
  }

  const response = await page.goto('https://www.google.co.jp/', {
    // waitUntil: 'networkidle2',
    waitUntil: 'domcontentloaded',
  });

  await page.type('input[name="q"]', target);

  await page.evaluate(({}) => {
    const $form = document.querySelector('#tsf');
    $form.submit();
  },{});

  await page.waitForNavigation({
    waitUntil: 'domcontentloaded',
  });

  let data;

  if (isSP) {
    data = await page.evaluate(({}) => {
      let d = [];
      const $tagList = document.querySelectorAll('.rtDDKc.VqFMTc');
      [].forEach.call($tagList, ($tag) => {
        if ($tag.innerText === '広告') {
          const $cite = $tag.nextSibling;
          if ($cite && $cite.classList.contains('qzEoUe')) {
            d.push($cite.innerText);
          }
        }
      })
      return d;
    }, {});
  } else {
    data = await page.evaluate(({}) => {
      let d = [];
      const $tagList = document.querySelectorAll('.Z98Wse');
      [].forEach.call($tagList, ($tag) => {
        if ($tag.innerText === '広告') {
          const $cite = $tag.nextSibling;
          if ($cite && $cite.tagName === 'CITE') {
            d.push($cite.innerText);
          }
        }
      })
      return d;
    }, {});
  }

  data = data.map((text) => {
    return text.replace(/\/(.*)/, '');
  });

  const dataString = data.join('\n');

  await page.screenshot({
    path: './dist/' + targetName + '.png',
    fullPage: true,
  });

  browser.close();

  await fsExtra.outputFile('./dist/' + targetName + '.txt', dataString, 'utf-8');
}

const start = () => {
  if (!fs.existsSync('./dist/')) {
    fs.mkdirSync('./dist/');
  }
  fs.readFile('./list.txt', 'utf-8', async(err, data) => {
    const targetList = data.split('\n');
    for (let i = 0; i < targetList.length; i++) {
      if (targetList[i] !== '') {
        await crawl(targetList[i], true);
        await crawl(targetList[i], false);
      }
    }
  });
}

start();
