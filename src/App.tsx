import React, { createRef, useState, useEffect } from 'react'
import Dialog from 'rc-dialog'
import isDev from './utils/isDev'
import history from './utils/history'
import LiveRoute from './components/LiveRoute'
import installLocal from './protocol/install-local'
import { render, unmountComponentAtNode } from 'react-dom'
import { ipcRenderer } from 'electron'
import { Router, Redirect } from 'react-router-dom'

import Provider from './models/index'

import Home from './routes/Home'
import Settings from './routes/Settings'
import Manager from './routes/Manager'
import ErrorPage from './routes/Error'
import ServerHome from './routes/ServerHome'
import SideBar from './SideBar'
import InstallList from './components/InstallList'

ipcRenderer.on('pure-launcher-reload', () => location.reload())
const ref = createRef()
require('./i18n').setInstance(ref)

const PluginRoutes: React.FC = () => {
  (window as any).__routerUpdater = useState(false)
  return React.createElement(React.Fragment, null, ...pluginMaster.routes)
}

document.ondragenter = e => e.preventDefault()
const Drag: React.FC = () => {
  const [show, setShow] = useState(false)
  useEffect(() => {
    document.ondrop = e => {
      e.preventDefault()
      setShow(false)
      const files = e.dataTransfer.files
      if (!files || !files.length) return
      const file = files.item(0)
      if (!file || !file.size) return
      console.log(file)
      switch (file.type) {
        case 'application/x-zip-compressed':
          notice({ content: $('Installing resources...') })
          installLocal(file.path)
            .then(() => notice({ content: $('Success!') }))
            .catch(e => notice({ content: e ? e.message : $('Failed!'), error: true }))
          break
      }
    }
    document.ondragover = e => {
      e.preventDefault()
      setShow(true)
    }
    document.ondragleave = e => {
      e.preventDefault()
      setShow(false)
    }
    return () => {
      document.ondrop = null
      document.ondragover = null
      document.ondragleave = null
    }
  }, [])
  return <div id='pl-drag' style={{ opacity: +show }}>
    <i className='iconfont icon-tuoruwenjian' />
    <p>{$('File drag detected, release to install.')}</p>
  </div>
}

const App: React.FC = () => {
  try {
    return (
      <Provider>
        <Router ref={ref as any} history={history}>
          <SideBar />
          <section id='main-content' className='scrollable'>
            <LiveRoute exact component={Home} path='/' />
            <LiveRoute component={Manager} path='/manager/:type' className='vh100' />
            <LiveRoute exact component={Settings} path='/settings' />
            <LiveRoute exact component={ErrorPage} path='/error' className='vh100' />
            <LiveRoute exact component={ServerHome} path='/serverHome' className='vh100' />
            <Redirect to='/serverHome?host=hz.apisium.cn&port=25587&name=NekoCraft' />
            <PluginRoutes />
          </section>
        </Router>
        <InstallList />
        <Drag />
      </Provider>
    )
  } catch (e) {
    console.error(e)
    if (!isDev) location.reload()
    return <h1>Error: {e}</h1>
  }
}

global.openConfirmDialog = (data: { text: string, title?: string, cancelButton?: boolean }) => new Promise(r => {
  const elm = document.createElement('div')
  const E = () => {
    const [open, setOpen] = useState(true)
    const fn = (t: boolean) => {
      r(t)
      setOpen(false)
      setTimeout(unmountComponentAtNode, 1000, elm)
    }
    return <Dialog
      visible={open}
      animation='zoom'
      destroyOnClose
      maskAnimation='fade'
      onClose={() => fn(false)}
      title={data.title || $('News:')}
      children={data.text}
      bodyStyle={{ whiteSpace: 'pre-wrap' }}
      footer={[
        <button key='ok' className='btn btn-primary' onClick={() => fn(true)}>{$('OK')}</button>,
        data.cancelButton && <button key='cancel' className='btn btn-secondary' onClick={() => fn(false)}>
          {$('CANCEL')}</button>
      ]}
    />
  }
  render(<E />, elm)
})

export default App
