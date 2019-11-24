import { Store, injectStore } from 'reqwq'
import { Launcher } from '@xmcl/launch'
import { Installer } from '@xmcl/installer'
import { Version } from '@xmcl/version'
import Task from '@xmcl/task'
import { download } from '../util'
import ProfilesStore from './ProfilesStore'

export default class GameStore extends Store {
  public status: 'ready' | 'launching' | 'launched'

  @injectStore(ProfilesStore)
  private profilesStore: ProfilesStore
  private worker: Worker = new Worker('../workers/launch.ts')

  constructor () {
    super()
    this.worker.addEventListener('message', (m) => {
      const { state, error } = m.data
      switch (state) {
        case 'error':
          // this.error = error
          console.error(error)
          this.status = 'ready'
          break
        case 'launched':
          console.log('launched!')
          this.status = 'launched'
          break
        case 'exit':
          if (m.data.code !== 0) {
            // this.error = ({ code: m.data.code, signal: m.data.signal })
          }
          this.status = 'ready'
          console.log('exit')
          break
      }
    })
  }
  public async launch (version?: string) {
    const { extraJson, root, getCurrentProfile, selectedVersion, versionManifest, ensureVersionManifest } = this.profilesStore
    const { javaArgs, javaPath } = extraJson

    const { accessToken = '', uuid, username, displayName, type } = getCurrentProfile()

    if (!version) {
      version = selectedVersion.lastVersionId
      switch (selectedVersion.type) {
        case 'latest-release':
        case 'latest-snapshot':
          version = selectedVersion.type
      }
    }

    let versionId: string

    switch (version) {
      case 'latest-release':
        await ensureVersionManifest()
        versionId = versionManifest.latest.release
        await this.ensureMinecraftVersion(root, versionManifest.versions.find(v => v.id === versionId))
        break
      case 'latest-snapshot':
        await ensureVersionManifest()
        versionId = versionManifest.latest.snapshot
        await this.ensureMinecraftVersion(root, versionManifest.versions.find(v => v.id === versionId))
        break
      default:
        versionId = version
        await this.ensureLocalVersion(root, versionId)
        break
    }

    const option: Launcher.Option = {
      version: versionId,
      javaPath: javaPath || 'java',
      extraJVMArgs: javaArgs.split(' '),
      accessToken: accessToken || '',
      gameProfile: { id: uuid, name: displayName || username },
      properties: {},
      userType: type || 'mojang' as any,
      gamePath: root,
      extraExecOption: {
        detached: true,
        env: {}
      }
    }
    this.status = 'launching'
    this.worker.postMessage(option)

    yield new Promise((res, rej) => {
      const onceLaunch = (m: MessageEvent) => {
        const { state, error } = m.data
        switch (state) {
          case 'error':
            this.worker.removeEventListener('message', onceLaunch)
            rej(error)
            break
          case 'launched':
            this.worker.removeEventListener('message', onceLaunch)
            res()
            break
        }
      }
      this.worker.addEventListener('message', onceLaunch)
    })
  }
  private async ensureMinecraftVersion (minecraft: string, version: Installer.VersionMeta) {
    const task = Installer.installTask('client', version, minecraft, {
      downloader ({ url, destination }) {
        return download({ url, file: destination }).then(() => undefined)
      }
    })
    await Task.execute(task)
  }
  private async ensureLocalVersion (minecraft: string, versionId: string) {
    const resolved = await Version.parse(minecraft, versionId)
    const task = Installer.installDependenciesTask(resolved, {
      downloader ({ url, destination }) {
        return download({ url, file: destination }).then(() => undefined)
      }
    })
    await Task.execute(task)
  }
}
