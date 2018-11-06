import Promise from 'bluebird'
import { format, parse } from 'date-fns'
import filenamify from 'filenamify'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { trim } from 'lodash'
import path from 'path'
import prettier from 'prettier'
import puppeteer from 'puppeteer'
import TurndownService from 'turndown'

const turndownService = new TurndownService()

const prettify = (text: string) =>
  prettier.format(
    text
      .replace(/“(.+?)”/g, (match: string, p1: string) => `「${p1}」`)
      .replace(/”(.+?)“/g, (match: string, p1: string) => `「${p1}」`)
      .replace(/‘(.+?)’/g, (match: string, p1: string) => `『${p1}』`)
      .replace(/’(.+?)‘/g, (match: string, p1: string) => `『${p1}』`),
    {
      parser: 'markdown',
      printWidth: 120,
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
    },
  )

const read = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:5000/')

  const items: string[] = await page.evaluate(() => {
    const links = document.querySelectorAll('a')

    return [].map.call(links, (link: HTMLLinkElement) => {
      return link.href
    })
  })
  await Promise.map(
    items,
    async (item: string) => {
      const subpage = await browser.newPage()
      await subpage.goto(item)

      const result = await subpage.evaluate(() => {
        const title = document.querySelector('h2')!.innerText
        const time = document.querySelector('h5')!.innerText
        const article = document.querySelector('.blogpost')!.innerHTML

        return {
          content: article,
          time,
          title,
        }
      })

      const folder = path.join(__dirname, 'post', filenamify(`${format(result.time, 'YYYY-MM-DD')}-${result.title}`))

      await fs.ensureDir(folder)

      const content = matter.stringify(prettify(turndownService.turndown(result.content)), {
        draft: false,
        post_id: 0,
        publish_date: format(result.time),
        revise_date: format(result.time),
        tags: [],
        title: trim(prettify(result.title)),
      })

      await fs.writeFile(path.join(folder, 'index.md'), content)

      await subpage.close()
    },
    { concurrency: 3 },
  )

  await browser.close()
}

read()
