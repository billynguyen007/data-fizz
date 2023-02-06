# Crawling excercise

## Decisions
- Using `puppeteer-core` and `@sparticuz/chromium` is almost always better than
straight up crawling since it becomes a lot easier to emulate user interaction
(avoid being blocked), execute javascript and reduce requests made.

## Run
- This project uses `yarn --version = 3.3.1`, doing `yarn start` or `yarn dev`
(for nodemon) will run `index.ts` using `ts-node`

## Lint
- With eslint as linter, just run `yarn lint`
