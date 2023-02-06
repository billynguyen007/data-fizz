import * as puppeteer from 'puppeteer-core';

const productScanner = async (page: puppeteer.Page) => {
    console.time('getProductData');
    const productName = await page.$eval('#productTitle', (el: Element) => el.textContent);
    const listPrice = await page.$eval('#regular-price-info', (el: Element) => el.textContent);
    // select only the first one

    const description = page.waitForSelector('#prodDesc>div>div>div>p').then ( async () => {
            return await page.$eval('#prodDesc > div > div > div > p',  (el: Element) => el.textContent);
        }).catch( () => {
            return '';
        });
    //const productWeight = await page.$eval('.universal-Shipping-Weight',  (el: Element) => el.textContent);
    const productDimensions = await page.$eval('.universal-product-inches',  (el: Element) => (el.textContent!.split(':')[1] + ' inches'));
    const imagesURLs = await page.$$eval('#thumbnailImages > li > button > img', (imgs: HTMLImageElement[]) => imgs.map(img => img.src));
    const ProductUPC = await page.evaluate(
        (el: any) => (el.textContent),
            (await page.$x('//*[th/strong[contains(.,"UPC")]]/td'))[0]);
            const sourceURL = page.url();
        const productData = {
            productName,
            listPrice,
            description,
            productDimensions,
            imagesURLs,
            ProductUPC,
            sourceURL
        };
        console.log(productData);
        console.timeEnd('getProductData');
        return {...productData};
}

export default productScanner;
