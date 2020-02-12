import './index.css'
import './utils/hacks'
import './utils/isDev'
import './plugin/index'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import Notification from 'rc-notification'
import './protocol/index'
import { remote, shell } from 'electron'

const main = document.getElementsByTagName('main')[0]
const top = document.getElementById('top')
const logo = document.getElementById('top-logo')
logo.onclick = () => shell.openExternal('https://pl.apisium.cn')

let instance: any
Notification.newInstance({ getContainer: () => document.body }, it => (instance = it))
window.notice = (ctx: { content: React.ReactNode, duration?: number, error?: boolean }) => {
  if (!ctx.duration) ctx.duration = 5
  const ac = ctx as any
  ac.style = { }
  if (ctx.error) {
    ac.style.backgroundColor = '#d4441a'
    ac.style.color = '#fff'
    if (typeof ctx.content === 'string') ctx.content = $('Error:') + ' ' + ctx.content
  }
  instance.notice(ctx)
}

pluginMaster.once('loaded', () => {
  document.getElementsByTagName('html')[0].style.opacity = '1'
  ReactDOM.render(<App />, document.getElementById('root'), () => {
    let full = true
    const content = document.getElementById('main-content')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onclick = () => {
      if (full) {
        full = false
        content.style.opacity = '0'
        topBar.containers[2].style.opacity = '0'
        logo.style.opacity = '0'
        setTimeout(() => {
          top.style.width = '220px'
          main.style.width = '180px'
          topBar.containers[0].style.width = '220px'
          topBar.containers[1].style.width = '180px'
        }, 700)
        setTimeout(() => remote.getCurrentWindow().setSize(240, 586), 4000)
      } else {
        full = true
        setTimeout(() => {
          remote.getCurrentWindow().setSize(816, 586)
          top.style.width = ''
          topBar.containers[2].style.display = ''
          main.style.width = ''
          topBar.containers[0].style.width = ''
          topBar.containers[1].style.width = ''
          setTimeout(() => {
            topBar.containers[2].style.opacity = '1'
            content.style.opacity = '1'
            logo.style.opacity = '1'
          }, 3000)
        }, 1000)
      }
    }
  })
})

const clickSound = new Audio(require('./assets/sounds/click.ogg'))
clickSound.oncanplay = () => document.addEventListener('click', e => {
  const t = e.target as HTMLElement
  if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.dataset.sound) {
    clickSound.play().catch(() => {})
  }
})

document.getElementById('close').onclick = () => setTimeout(() => remote.app.quit(), 500)
document.getElementById('hide').onclick = () => remote.getCurrentWindow().minimize()
