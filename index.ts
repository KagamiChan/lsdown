import Promise from 'bluebird'
import prettier from 'prettier'
import puppeteer from 'puppeteer'
import TurndownService from 'turndown'

const turndownService = new TurndownService()

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
        const content = document.querySelector('.blogpost')!.innerHTML

        return {
          content,
          time,
          title,
        }
      })
    },
    { concurrency: 3 },
  )

  await browser.close()
}

read()
