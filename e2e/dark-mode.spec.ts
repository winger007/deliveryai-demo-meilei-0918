import { test, expect, type Page } from '@playwright/test'

/**
 * 夜间模式（Dark Mode）E2E 验收测试
 * 覆盖 REQ-001（切换入口与状态持久化）、REQ-002（全界面深色适配）、REQ-003（i18n 双语文案）
 */

/** 从首页绑定 A08 桌台并进入点餐视图（menu），使 TopBar 可见。 */
async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click() // home → welcome
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click() // welcome → menu
}

/** 获取夜间模式切换按钮（aria-label 根据当前主题动态切换）。 */
function themeToggle(page: Page) {
  return page.getByRole('button', { name: /切换至夜间模式|Switch to dark mode/ })
}

test.describe('夜间模式（Dark Mode）- E2E 验收测试', () => {
  test('REQ-001: 点击切换按钮在 light/dark 间切换并持久化到 localStorage', async ({ page }) => {
    await enterMenu(page)

    // 初始为浅色，html 无 dark class
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // 切换按钮存在且可点击
    const toggle = themeToggle(page)
    await expect(toggle).toBeVisible()

    // 点击切换到夜间模式
    await toggle.click()

    // 等待 250ms 全局过渡完成后再断言 computed class
    await page.waitForTimeout(400)

    // html 添加 dark class
    await expect(page.locator('html')).toHaveClass(/dark/)

    // localStorage 持久化
    const stored = await page.evaluate(() => localStorage.getItem('theme-mode'))
    expect(stored).toBe('dark')

    // toast 提示出现
    await expect(page.getByText('已切换为夜间模式')).toBeVisible()

    // 切换按钮 aria-label 更新为「切换至日间模式」
    await expect(page.getByRole('button', { name: '切换至日间模式' })).toBeVisible()

    // 刷新后恢复夜间模式（验证持久化 + 防 FOUC）
    await page.reload()

    // 刷新后 html 仍有 dark class（index.html 内联脚本防 FOUC）
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 切换回浅色
    await page.getByRole('button', { name: '切换至日间模式' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    const storedLight = await page.evaluate(() => localStorage.getItem('theme-mode'))
    expect(storedLight).toBe('light')
  })

  test('REQ-002: 夜间模式下全界面深色背景且跨视图保持', async ({ page }) => {
    await enterMenu(page)

    // 切换到夜间模式
    await themeToggle(page).click()
    await page.waitForTimeout(400)

    // 页面背景应为深色（index.css 中 .dark background: #1c1a17）
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })
    // rgb(28, 26, 23) == #1c1a17
    expect(bg).toBe('rgb(28, 26, 23)')

    // 切换到订单视图，深色态保持
    await page.getByRole('button', { name: /订单|Orders/ }).first().click()
    await expect(page).toHaveURL(/#\/order$/)
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 订单视图背景仍为深色
    const orderBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })
    expect(orderBg).toBe('rgb(28, 26, 23)')

    // 切换回点餐视图，深色态仍保持
    await page.getByRole('button', { name: /点餐|Menu/ }).first().click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 打开会员卡弹窗，验证弹窗内容深色适配（dialog.tsx dark:bg-[#1c1a17]）
    await page.getByRole('button', { name: /会员|Member/ }).first().click()
    await expect(page.getByText('Membership & Queue')).toBeVisible()
    // 弹窗内容区背景应为深色
    const dialogBg = await page.evaluate(() => {
      const content = document.querySelector('[role="dialog"]')
      if (!content) return null
      return window.getComputedStyle(content).backgroundColor
    })
    expect(dialogBg).toBe('rgb(28, 26, 23)')
    // 关闭弹窗
    await page.keyboard.press('Escape')
  })

  test('REQ-002.3 + REQ-003: 夜间模式与老人模式叠加且英文环境下 aria-label 正确', async ({ page }) => {
    await enterMenu(page)

    // 切换到英文
    await page.getByRole('button', { name: 'EN' }).click()

    // 英文环境下切换按钮 aria-label 为 "Switch to dark mode"
    const darkToggle = page.getByRole('button', { name: 'Switch to dark mode' })
    await expect(darkToggle).toBeVisible()
    await darkToggle.click()
    await page.waitForTimeout(400)

    // 英文 toast
    await expect(page.getByText('Switched to dark mode')).toBeVisible()

    // html 同时有 dark class
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 开启老人模式（英文环境下 aria-label 为「切换至老人模式」—— 仓库现有代码硬编码中文）
    await page.getByRole('button', { name: '切换至老人模式' }).click()
    await page.waitForTimeout(400)

    // html 同时有 dark 和 elderly class
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)

    // 关闭夜间模式，老人模式仍保持
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })
})
