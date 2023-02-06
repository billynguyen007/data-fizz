import chromium from '@sparticuz/chromium';
import * as puppeteer from 'puppeteer-core';
import productScanner from './productScanner';
import writeFileSync from 'fs';

const MAX_NETWORK_IDLE_TIME = 5000;
const CRAWL_START_URL = 'https://walgreens.com';
const CRAWL_TARGET = 'Household Essentials';
const MAX_LISTING_PAGES = 1;
const MAX_RETRY = 10;

(async () => {

    console.time('Launching browser...');
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: true,
    });
    console.timeEnd('Launching browser...');
    try {
        console.time('Waiting for page to load...');
        let page = await browser.newPage();
        page.setDefaultNavigationTimeout(0)
        await page.goto(CRAWL_START_URL, {waitUntil: 'networkidle2'});
        console.timeEnd('Waiting for page to load...');
        await page.keyboard.press('Escape');
        await page.keyboard.press('End');
        page.waitForNavigation();
        console.time(`Waiting for ${CRAWL_TARGET} to load...`);
        await page.click(`xpath///footer/div/div/div/div/div/ul/li/a[contains(.,"${CRAWL_TARGET}")]`);
        // TODO: find out why category shop all link doesn't show sometimes
        const category = page.url().split('=')[1].split('-')[0];
        const shopAllLink = `${CRAWL_START_URL}/store/c/productlist/N=${category}/1/ShopAll=${category}`;
        console.timeEnd(`Waiting for ${CRAWL_TARGET} to load...`);
        console.time(`Waiting for ${CRAWL_TARGET} Shop All to load...${shopAllLink}`);
        let tries = 0;
        while (tries < MAX_RETRY) {
            try {
                await page.goto(shopAllLink, {waitUntil: 'networkidle2'});
                await page.keyboard.press('Escape');
                await page.keyboard.press('End');
                break;
            } catch (error) {
                console.log(`Loading for the ${tries}th time`);
                if( tries === MAX_RETRY - 1) {
                    throw new Error(`Failed to load ${shopAllLink} after ${MAX_RETRY} tries`);
                }
                tries++;
            }
        }
        console.timeEnd(`Waiting for ${CRAWL_TARGET} Shop All to load...${shopAllLink}`);
        let listingPage = 1;
        let products = [];
        let currentListing = shopAllLink;
        page.keyboard.press('Escape');
        page.keyboard.press('End');
        page.waitForNetworkIdle({ idleTime: MAX_NETWORK_IDLE_TIME, timeout: 0 });
        const productListingPagesHandle = await page.$x('//label[contains(@for,"counter")]/../span[contains(@class, "sr-only")]/text()[last()]');
        const productListingPages = Number((await Promise.all(productListingPagesHandle.map(async (handle: any) => {
            return await page.evaluate((node: any) : string => (node.textContent || '').trim(), handle);
        })))[0]);
        console.log(`Found ${productListingPages} pages of products`);
        while(listingPage <= Math.min(MAX_LISTING_PAGES, productListingPages)) {
            console.log(`Listing page ${listingPage} of ${MAX_LISTING_PAGES}`);
            page.keyboard.press('Escape');
            page.keyboard.press('End');
            page.waitForNetworkIdle({ idleTime: MAX_NETWORK_IDLE_TIME, timeout: 0 });
            const productHandles = await page.$x('//a[contains(@id,"productOmniSelectcompare")]');
            const productLinks = await Promise.all(productHandles.map(async (handle: any) => {
                return await page.evaluate(
                    (link: any) :string => link.href, handle);
            }));
            console.log(`Found ${productLinks.length} products on page`);
            for (const productLink of productLinks) {
                console.log(`Navigating to product page: ${productLink}`);
                page.waitForNetworkIdle({ idleTime: MAX_NETWORK_IDLE_TIME, timeout: 0 });
                await page.goto(productLink);
                const product = await productScanner(page);
                products.push({id: products.length + 1, ...product});
            }
            page.goto(currentListing, {waitUntil: 'networkidle0'});
            page.waitForNavigation();
            page.click('#omni-next-click');
            listingPage++;
            currentListing = page.url();

        }
        console.log(products);
        writeFileSync.writeFileSync('products.json', JSON.stringify(products, null, 2));
    }
    catch (error) {
        console.log(error);
    }

    await browser.close();
})();
