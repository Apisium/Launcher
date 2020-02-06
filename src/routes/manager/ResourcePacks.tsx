import './list.less'
import fs from 'fs-extra'
import history from '../../utils/history'
import Empty from '../../components/Empty'
import Loading from '../../components/Loading'
import React, { Suspense, useState } from 'react'
import { join, basename } from 'path'
import { plugins } from '../../plugin/internal/index'
import { ResourcePack as RPP } from '@xmcl/resourcepack'
import { ResourceResourcesPack } from '../../protocol/types'
import { createResource, OneCache } from 'react-cache-enhance'
import { uninstallResourcePack } from '../../protocol/uninstaller'
import { RESOURCES_RESOURCE_PACKS_INDEX_PATH, RESOURCE_PACKS_PATH } from '../../constants'

pluginMaster.addExtensionsButton({
  title: () => $('ResourcePacks'),
  key: 'resource-packs',
  onClick () { history.push('/manager/resourcePacks') }
}, plugins.resourceInstaller)

interface Ret { installed: ResourceResourcesPack[], unidentified: string[][] }

const cache = new OneCache()

const NIL: Ret = { installed: [], unidentified: [] }
const useResourcePack = createResource(async (): Promise<Ret> => {
  try {
    let files = (await fs.readdir(RESOURCE_PACKS_PATH)).filter(it => it.endsWith('.zip'))
    const stats = await Promise.all(files.map(it => fs.stat(join(RESOURCE_PACKS_PATH, it))))
    files = files.filter((_, i) => stats[i].isFile())
    const json: Record<string, ResourceResourcesPack> =
      await fs.readJson(RESOURCES_RESOURCE_PACKS_INDEX_PATH, { throws: false }) || { }
    const hashes = new Set<string>()
    const installed = Object.values(json)
    installed.forEach(it => it?.hashes?.forEach(h => hashes.add(h)))
    return { installed, unidentified: (await Promise.all(files.filter(it => !hashes.has(basename(it, '.zip')))
      .map(it => RPP.open(join(RESOURCE_PACKS_PATH, it))
        .then(r => Promise.all([r.icon(), r.info()]))
        .then(([icon, info]) => [
          it,
          icon ? URL.createObjectURL(new Blob([icon], { type: 'image/png' })) : null,
          typeof info.description === 'string' ? info.description.replace(/\u00A7[\da-fml]/g, '') : null
        ]).catch(e => {
          console.error(e)
          return [it]
        })))).sort((a, b) => +!a[1] - +!b[1]) }
  } catch { }
  return NIL
}, cache as any)

const ResourcePack: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const pack = useResourcePack()
  const requestUninstall = (id: string, d?: boolean) => !loading && openConfirmDialog({
    cancelButton: true,
    title: $('Warning!'),
    text: $('Are you sure to delete this resource pack? This is a dangerous operation and cannot be recovered after deletion!')
  }).then(ok => {
    if (ok) {
      setLoading(true)
      notice({ content: $('Deleting...') })
      uninstallResourcePack(id, d).then(() => notice({ content: $('Success!') })).catch(e => {
        console.error(e)
        notice({ content: $('Failed!'), error: true })
      }).finally(() => {
        cache.delete(cache.key)
        setLoading(false)
      })
    }
  })
  return pack.installed.length + pack.unidentified.length ? <ul className='scrollable'>
    {pack.installed.map(it => <li key={it.id}>
      {it.title ? <>{it.title} <span>({it.id})</span></> : it.id}
      <div className='time'>{it.description}</div>
      <div className='buttons'>
        <button
          className='btn2' onClick={() => 0}
        >
          {$('Export')}
        </button>
        <button className='btn2 danger' onClick={() => requestUninstall(it.id)}>{$('Delete')}</button>
      </div>
    </li>)}
    {pack.unidentified.map(it => <li key={it[0]}>
      {it[1] && <img src={it[1]} alt={it[0]} />}
      {it[2] ? <>{it[0]} <span>({it[2]})</span></> : it[0]}
      <div className='buttons'>
        <button
          className='btn2' onClick={() => 0}
        >
          {$('Export')}
        </button>
        <button className='btn2 danger' onClick={() => requestUninstall(it[0], true)}>{$('Delete')}</button>
      </div>
    </li>)}
  </ul> : <Empty />
}

const ResourcePacks: React.FC = () => {
  return <div className='manager-list version-switch manager-versions resource-packs'>
    <div className='list-top'>
      <span className='header no-button'>{$('ResourcePacks')}</span>
    </div>
    <Suspense fallback={<div style={{ flex: 1, display: 'flex' }}><Loading /></div>}><ResourcePack /></Suspense>
  </div>
}

export default ResourcePacks
