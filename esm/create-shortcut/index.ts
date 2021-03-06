import {Command, flags} from '@oclif/command'
import { platform as osPlatform, type as platformType, release as platformRelease } from 'os'
import { writeFile, existsSync } from 'fs'
import { dir as tempDir } from 'tmp'
import { cp, mv, echo, exec, pwd, cd, cat, mkdir, test, rm } from 'shelljs'
import fetch from 'node-fetch'
import pageIcon = require('page-icon')
import sharp = require('sharp')
import pngToIco = require('png-to-ico')
import ICO = require('icojs')
const dedent = str=>str.replace(/  +/g, '')
import semver = require('semver')
const icnsConvert = require('@fiahfy/icns-convert')
const createNodeAppWithoutTerminal = require('create-nodew-exe')
const windowsShortcut = require('windows-shortcuts')
const { exec: pkgExec } = require('pkg')

const placeholderAppName = 'quark-carlo-placeholder'
const iconSizes = [16, 24, 32, 48, 64, 72, 96, 128, 256]

const guranteeSemverFormat = (version:string) => {
  if (version.split('.').length === 2) {
    version += '.0'
  }
  return version
}
const isLessThanWin8 =() => {
  return (
    platformType() === 'Windows_NT' &&
    semver.satisfies(guranteeSemverFormat(platformRelease()), '<6.2.9200')
  )
}
const isLinux = () => osPlatform() === 'linux'
const isWindows = () => osPlatform() === 'win32'
const isMac = () => osPlatform() === 'darwin'
const getPlatform = () => {
  switch (osPlatform()) {
    case 'win32':
      return 'win'
    case 'darwin':
      return 'macos'
    case 'linux':
      return 'linux'
    default:
      return osPlatform()
  }
}
const getNormalizedPlatform = (platform:string) => platform !== 'host' ? platform : getPlatform()

const execPath = pwd().valueOf()

const getLinuxInstallationDesktopFilesPath = () => {
  cd()
  const homePath = pwd().valueOf()
  cd(execPath)
  return `${homePath}/.local/share/applications`
}

const getLinuxInstallationDesktopFilesIconFilesPath = (dimension:number, tillDimension:boolean = false) => {
  cd()
  const homePath = pwd().valueOf()
  cd(execPath)
  return `${homePath}/.local/share/icons/hicolor/${dimension}x${dimension}${tillDimension ? '' : '/apps'}`
}

const getMacOSApplicationsPath = () => {
  cd()
  const homePath = pwd().valueOf()
  cd(execPath)
  return `${homePath}/Applications`
}

const filenameSafe = (str:string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase()
const filenameSafeDisplayName = (str:string) => str.replace(/[^a-z0-9 ]/gi, '_')

const getProperPageIcon = (url:string):Promise<PageIcon.Icon> => new Promise((resolve, reject) => {
  pageIcon(url)
    .then((icon) => {
      if (icon === undefined) {
        return reject('icon fetch failed')
      }
      if (icon.ext.toLowerCase() !== '.png') {
        return reject('icon not png')
      }
      resolve(icon)
    })
    .catch(() => {
      return reject('size calculation failed')
    })
})

const getIconFiles = (
  url:string,
  log:Function,
  isIcoNeeded = true,
  isIcnsNeeded = true,
  {
    tempPngOutPath = null,
    tempIcoOutPath = null,
    tempIcnsOutPath = null,
    pngOutPath = null,
    icoOutPath = null,
    icnsOutPath = null,
  }:{
    tempPngOutPath:string|null,
    tempIcoOutPath:string|null,
    tempIcnsOutPath:string|null,
    pngOutPath:string|null,
    icoOutPath:string|null,
    icnsOutPath:string|null,
  },
) => new Promise((resolve, reject) => {
  log('Looking for appropriate icon image...')
  if (tempPngOutPath=== null || tempIcoOutPath === null || tempIcnsOutPath === null) {
    return reject('tempPngOutPath, tempIcoOutPath or tempIcnsOutPath not supplied')
  }
  if (pngOutPath === null) {
    return reject('pngOutPath not supplied')
  }
  getProperPageIcon(url)
    .then((icon) => {
      fetch(icon.source)
        .then(response => response.buffer())
        .then((pngBuf) => {
          writeFile(
            tempPngOutPath,
            pngBuf,
            (err) => {
              if (err) {
                reject('writing png file failed')
              } else {
                cp(tempPngOutPath, pngOutPath)
                log('Appropriate icon file saved...')
                if (isIcoNeeded) {
                  pngToIco(icon.source)
                    .then((icoBuf:any) => {
                      writeFile(
                        tempIcoOutPath,
                        icoBuf,
                        (err) => {
                          if (err) {
                            reject('writing ico file failed')
                          } else {
                            if (icoOutPath === null) {
                              reject('icoOutPath not supplied')
                            } else {
                              cp(tempIcoOutPath, icoOutPath)
                              log('Ico file generated...')
                              if (isIcnsNeeded) {
                                icnsConvert(pngBuf)
                                  .then((icnsBuf:any) => {
                                    writeFile(
                                      tempIcnsOutPath,
                                      icnsBuf,
                                      (err) => {
                                        if (err) {
                                          reject('writing icns file failed')
                                        } else {
                                          if (icnsOutPath === null) {
                                            reject('icnsOutPath not supplied')
                                          } else {
                                            cp(tempIcnsOutPath, icnsOutPath)
                                            log('Icns file generated...')
                                            resolve()
                                          }
                                        }
                                      },
                                    )
                                  })
                                  .catch((err:any) => reject(err))
                              } else {
                                resolve()
                              }
                            }
                          }
                        },
                      )
                    })
                    .catch((err:any) => reject(err))
                } else {
                  if (isIcnsNeeded) {
                    icnsConvert(pngBuf)
                    .then((icnsBuf:any) => {
                      writeFile(
                        tempIcnsOutPath,
                        icnsBuf,
                        (err) => {
                          if (err) {
                            reject('writing icns file failed')
                          } else {
                            if (icnsOutPath === null) {
                              reject('icnsOutPath not supplied')
                            } else {
                              cp(tempIcnsOutPath, icnsOutPath)
                              log('Icns file generated...')
                              resolve()
                            }
                          }
                        },
                      )
                    })
                    .catch((err:any) => reject(err))
                  } else {
                    resolve()
                  }
                }
              }
            },
          )
        })
        .catch((err:any) => reject(err))
    })
    .catch((err) => {
      log('Ico generation failed, falling back to using favicon.ico...')
      fetch(`${url}/favicon.ico`)
        .then(response => response.buffer())
        .then((icoBuf) => {
          writeFile(
            tempIcoOutPath,
            icoBuf,
            (err) => {
              if (err) {
                reject('writing ico file failed')
              } else {
                if (isIcoNeeded) {
                  if (icoOutPath === null) {
                    return reject('icoOutPath not supplied')
                  } else {
                    cp(tempIcoOutPath, icoOutPath)
                    log('Ico file saved...')
                  }
                }
                ICO.parse(icoBuf, 'image/png')
                  .then((images) => {
                    const largestImage = images.sort((a, b) => b.width - a.width)[0]
                    return sharp(Buffer.from(largestImage.buffer))
                      .resize(iconSizes[iconSizes.length - 1], iconSizes[iconSizes.length - 1])
                      .png()
                      .toBuffer()
                      .then((pngBuf) => {
                        writeFile(
                          tempPngOutPath,
                          pngBuf,
                          (err) => {
                            if (err) {
                              reject('writing png file failed')
                            } else {
                              cp(tempPngOutPath, pngOutPath)
                              log('Png icon file saved...')
                              if (isIcnsNeeded) {
                                icnsConvert(pngBuf)
                                .then((icnsBuf:any) => {
                                  writeFile(
                                    tempIcnsOutPath,
                                    icnsBuf,
                                    (err) => {
                                      if (err) {
                                        reject('writing icns file failed')
                                      } else {
                                        if (icnsOutPath === null) {
                                          reject('icnsOutPath not supplied')
                                        } else {
                                          cp(tempIcnsOutPath, icnsOutPath)
                                          log('Icns file generated...')
                                          resolve()
                                        }
                                      }
                                    },
                                  )
                                })
                                .catch((err:any) => reject(err))
                              } else {
                                resolve()
                              }
                            }
                          },
                        )
                      })
                      .catch((err) => {
                        throw err
                      })
                  })
                  .catch(() => reject('Converting favicon.ico into png failed'))
              }
            },
          )
        })
        .catch(() => reject('Saving favicon.ico failed'))
    })
})

class QuarkCarlo extends Command {
  static description = 'Create native app from any web app, optionally install a shortcut so that the app shows up in the application menu'
  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n', description: 'name of application', required: true }),
    url: flags.string({ char: 'u', description: 'url to load in application', required: true }),
    platform: flags.string({
      char: 'p',
      description: 'Platform to build the binary for, defaults to the running platform, possible options are linux, macos, win',
      default: 'host',
    }),
    install: flags.boolean({
      char: 'i',
      description: 'Install a shortcut so that the app shows up in the application menu',
      default: false,
    }),
    dimensions: flags.string({
      char: 'd',
      description: 'Dimensions of application window as [width]x[height], for example 1280x720',
      default: '1280x720',
    }),
    additionalInternalHostnames: flags.string({
      char: 'a',
      description: 'Comma separated list of additional hostnames that are to be opened within the app, for example oauth login page hostnames (for Google: accounts.google.com)',
      default: '',
    }),
    debug: flags.boolean({
      char: 'D',
      description: 'Create debug app to identify required additional internal hostnames, on encountering navigation to an external hostname the app will show an alert with the hostname value to pass in additionalInternalHostnames',
      default: false,
    }),
  }

  async installShortcut(
    binaryName:string,
    platform:string,
    pngOutPath:string,
    {
      url = null,
      binaryPath = null,
      shortcutFilePath = null,
      shortcutName = null,
      icoOutPath = null,
      launcherName = null,
      outPkgDirectoryPath = null,
    }:{
      url:string|null,
      binaryPath:string|null,
      shortcutFilePath:string|null,
      shortcutName:string|null,
      icoOutPath:string|null,
      launcherName:string|null,
      outPkgDirectoryPath:string|null,
    }
  ) {
    if (platform === 'host' || platform === getPlatform()) {
      this.log('Installing shortcut...')
      if (isLinux()) {
        if (url === null) throw 'no url supplied'
        if (binaryPath === null) throw 'no binary path supplied'
        if (launcherName === null) throw 'no launcher name supplied'
        const iconGenerationPromises:Array<Promise<string>> = iconSizes.map((size) => new Promise((resolve, reject) => {
          sharp(pngOutPath)
            .resize(size, size)
            .toBuffer()
            .then((resizedIconData) => {
              if (!test('-d', getLinuxInstallationDesktopFilesIconFilesPath(size, true))) {
                mkdir(getLinuxInstallationDesktopFilesIconFilesPath(size, true))
              }
              if (!test('-d', getLinuxInstallationDesktopFilesIconFilesPath(size))) {
                mkdir(getLinuxInstallationDesktopFilesIconFilesPath(size))
              }
              writeFile(
                `${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}.png`,
                resizedIconData,
                { mode: 0o666, flag: 'w' },
                (err) => {
                  if (err) {
                    return reject(err)
                  } else {
                    this.log(`Icon file of ${size}x${size} generated...`)
                    resolve(`${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}.png`)
                  }
                }
              )
            })
            .catch((err) => {
              return reject(err)
            })
        }))
        Promise.all(iconGenerationPromises)
          .then((iconPaths) => {
            cat(`${__dirname}/../installation/linux/app.desktop`)
              .sed('@@NAME@@', launcherName)
              .sed('@@PATH@@', binaryPath)
              .sed('@@FILENAME@@', `${binaryName}`)
              .to(`${getLinuxInstallationDesktopFilesPath()}/${binaryName}.desktop`)
            this.log('Desktop file generated...')
            this.log('Shortcut installation complete...')
            this.log('To remove installation of shortcut, remove following files:')
            this.log(`${getLinuxInstallationDesktopFilesPath()}/${binaryName}.desktop`)
            iconPaths.forEach((iconPath) => {
              this.log(iconPath)
            })
          })
          .catch((err) => {
            throw err
          })
      } else if (isWindows()) {
        if (shortcutFilePath === null) throw 'no shortcut file path supplied'
        if (shortcutName === null) throw 'no shortcut name supplied'
        if (outPkgDirectoryPath === null) throw 'no out package directory path supplied'
        if (binaryPath === null) throw 'no binary path supplied'
        if (icoOutPath === null) throw 'no ico out path supplied'
        const windowsInstallationStartMenuShortcutFilesPath = `${getWindowsInstallationStartMenuShortcutFilesPath()}/${shortcutName}.lnk`
        this.log('Installing shortcut to Start Menu...')
        if (isLessThanWin8()) {
          cp(shortcutFilePath, windowsInstallationStartMenuShortcutFilesPath)
        } else {
          exec(`${outPkgDirectoryPath}/notifier/SnoreToast.exe -install "${windowsInstallationStartMenuShortcutFilesPath}" "${binaryPath}" "${binaryName}"`, { silent: true }, (code) => {
            if (code === 0) {
              windowsShortcut.edit(
                windowsInstallationStartMenuShortcutFilesPath,
                {
                  icon: icoOutPath,
                },
                (err:string) => {
                  if (err === null) {
                    this.log('Shortcut installation complete...')
                    this.log('To remove installation of shortcut, remove following files:')
                    this.log(windowsInstallationStartMenuShortcutFilesPath)
                  } else {
                    this.error('Shortcut installation failed')
                  }
                },
              )
            } else {
              throw 'shortcut install failed'
            }
          })
        }
      } else if (isMac()) {
        this.log(`To install the app, drag and drop the ${binaryName}.app file onto the Applications folder in Finder.`)
      } else {
        this.log('Creating shortcut for the current platform isn\'t supported yet.')
      }
    } else {
      this.error('Shortcut can only be installed if the platform is the same as the running platform')
    }
  }

  async run() {
    const { flags } = this.parse(QuarkCarlo)
    const { name, url, dimensions, install, additionalInternalHostnames, debug } = flags
    let { platform } = flags

    let width = 1280
    let height = 720
    let parsedAdditionalInternalHostnames = <string[]>[]

    try {
      if (dimensions === undefined) throw 'dimensions undefined'
      if (dimensions.split('x').length !== 2) throw 'dimensions invalid format'
      const parsedWidth = parseInt(dimensions.split('x')[0])
      const parsedHeight = parseInt(dimensions.split('x')[1])
      if (isNaN(parsedWidth) || isNaN(parsedHeight)) throw 'dimension is not a number'
      width = parsedWidth
      height = parsedHeight
    } catch (err) {
      this.warn('Invalid dimensions format, using default value')
    }
    try {
      if (!['host', 'linux', 'win', 'macos'].includes(platform)) throw 'supplied platform invalid'
    } catch (err) {
      platform = 'host'
      this.warn('Invalid platform value, building for running platform')
    }
    try {
      if (additionalInternalHostnames.length !== 0) {
        const hostnames = additionalInternalHostnames.split(',')
        .map(hostname => hostname.trim())
        .map(hostname => new URL(`https://${hostname}`).hostname)
        parsedAdditionalInternalHostnames = parsedAdditionalInternalHostnames.concat(hostnames)
      }
    } catch (err) {
      this.warn('Invalid additional internal hostnames supplied, make sure you pass a comma separated list of hostnames')
    }

    const binaryName = getNormalizedPlatform(platform) === 'win' ? filenameSafeDisplayName(name) : filenameSafe(name)
    const outPkgDirectoryPath = `${execPath}/${filenameSafe(name)}`

    const config = JSON.stringify({
      name,
      url,
      width,
      height,
      iconPath: 'icon.png',
      additionalInternalHostnames: parsedAdditionalInternalHostnames,
      appName: binaryName,
      dirName: filenameSafe(name),
      platform: getNormalizedPlatform(platform),
      debug,
    })
    tempDir({ unsafeCleanup: true }, (err, tempDirPath) => {
      if (err) throw err
      cp('-R', `${__dirname}/../app/*`, tempDirPath)
      this.log(`Config options:`)
      echo(config).to(`${tempDirPath}/config.json`)
      cd(tempDirPath)
      this.log('Installing dependencies...')
      exec('npm install', { silent: true }, (code) => {
        cd(execPath)
        if (code === 0) {
          this.log('Successfully installed dependencies...')
          this.log('Building binaries...')
          pkgExec([ tempDirPath, '--out-path', tempDirPath, '--targets', `node10-${getNormalizedPlatform(platform)}`, '--no-bytecode' ])
            .then(() => {
              const tempPkgBinaryName = getNormalizedPlatform(platform) === 'win' ? `${placeholderAppName}.exe` : placeholderAppName
              const outPkgBinaryName = getNormalizedPlatform(platform) === 'win' ? `${binaryName}.exe` : binaryName
              const tempPkgBinaryPath = `${tempDirPath}/${tempPkgBinaryName}`
              const outPkgBinaryPath = `${outPkgDirectoryPath}/${outPkgBinaryName}`
              if (existsSync(outPkgDirectoryPath)) {
                rm('-rf', outPkgDirectoryPath)
              }
              mkdir(outPkgDirectoryPath)
              if (!test('-f', tempPkgBinaryPath)) {
                throw 'Binary packaging failed'
              }
              this.log('Generated binary successfully...')
              cp(tempPkgBinaryPath, outPkgBinaryPath)
              const icoOutPath = `${outPkgDirectoryPath}/icon.ico`
              const icnsOutPath = `${outPkgDirectoryPath}/icon.icns`
              const pngOutPath = `${outPkgDirectoryPath}/icon.png`
              getIconFiles(
                url,
                (msg:any) => this.log(msg),
                getNormalizedPlatform(platform) === 'win',
                getNormalizedPlatform(platform) === 'macos',
                {
                  tempIcoOutPath: `${tempDirPath}/icon.ico`,
                  icoOutPath,
                  tempIcnsOutPath: `${tempDirPath}/icon.icns`,
                  icnsOutPath,
                  tempPngOutPath: `${tempDirPath}/icon.png`,
                  pngOutPath,
                },
              )
                .then(() => {
                  if (getNormalizedPlatform(platform) === 'win') {
                    this.log('Making binary silent on launch...')
                    createNodeAppWithoutTerminal({
                      src: outPkgBinaryPath,
                      dst: outPkgBinaryPath,
                    })
                    mkdir(`${outPkgDirectoryPath}/notifier`)
                    cp(`${tempDirPath}/node_modules/node-notifier/vendor/notifu/notifu.exe`, `${outPkgDirectoryPath}/notifier/notifu.exe`)
                    cp(`${tempDirPath}/node_modules/node-notifier/vendor/notifu/notifu64.exe`, `${outPkgDirectoryPath}/notifier/notifu64.exe`)
                    cp(`${tempDirPath}/node_modules/node-notifier/vendor/snoreToast/SnoreToast.exe`, `${outPkgDirectoryPath}/notifier/SnoreToast.exe`)
                    // Making SnoreToast binary silent too, although this library is only meant for node exe
                    createNodeAppWithoutTerminal({
                      src: `${outPkgDirectoryPath}/notifier/SnoreToast.exe`,
                      dst: `${outPkgDirectoryPath}/notifier/SnoreToast.exe`,
                    })
                    if (isWindows()) {
                      const shortcutOutPath = `${execPath}/${binaryName}.lnk`
                      this.log('Creating shortcut for the app...')
                      windowsShortcut.create(
                        shortcutOutPath,
                        {
                          target: outPkgBinaryPath,
                          icon: icoOutPath,
                        },
                        (err:string) => {
                          if (err === null) {
                            this.log('Shortcut file created...')
                            if (install) {
                              this.installShortcut(
                                binaryName,
                                platform,
                                pngOutPath,
                                {
                                  shortcutName: binaryName,
                                  shortcutFilePath: shortcutOutPath,
                                  icoOutPath: icoOutPath,
                                  binaryPath: outPkgBinaryPath,
                                  url: null,
                                  launcherName: null,
                                  outPkgDirectoryPath: outPkgDirectoryPath,                                  
                                },
                              )
                            } else {
                              this.log('Application created successfully.')
                            }
                          } else {
                            this.error('Creating shortcut file failed')
                          }
                        },
                      )
                    } else {
                      this.log(dedent(`
                        Shortcut can only be ${install ? 'installed' : 'created'} on Windows,
                        Please create a shortcut of the binary manually,
                        and assign icon.ico to the shortcut manually on Windows.
                      `))
                      this.log('Application created successfully.')
                    }
                  } else if (getNormalizedPlatform(platform) === 'linux') {
                    if (install) {
                      this.installShortcut(binaryName, platform, pngOutPath, { launcherName: filenameSafeDisplayName(name), url, binaryPath: outPkgBinaryPath, shortcutFilePath: null, shortcutName: null, icoOutPath: null, outPkgDirectoryPath: null })
                    } else {
                      this.log('Application created successfully.')
                    }
                  } else if (getNormalizedPlatform(platform) === 'macos') {
                    mkdir(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app`)
                    mkdir(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents`)
                    mkdir(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/MacOS`)
                    mkdir(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/Resources`)
                    cat(`${__dirname}/../installation/macos/Info.plist`)
                      .sed('@@NAME@@', filenameSafeDisplayName(name))
                      .sed('@@FILENAME@@', binaryName)
                      .to(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/Info.plist`)
                    mv(`${outPkgDirectoryPath}/icon.png`, `${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/Resources/icon.png`)
                    mv(`${outPkgDirectoryPath}/icon.icns`, `${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/Resources/${binaryName}.icns`)
                    mkdir(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/Resources/terminal-notifier.app`)
                    cp('-R', `${tempDirPath}/node_modules/node-notifier/vendor/mac.noindex/terminal-notifier.app/*`, `${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/Resources/terminal-notifier.app`)
                    mv(`${outPkgDirectoryPath}/${binaryName}`, `${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app/Contents/MacOS/${binaryName}`)
                    if (existsSync(`${filenameSafeDisplayName(name)}.app`)) {
                      rm('-rf', `${filenameSafeDisplayName(name)}.app`)
                    }
                    mv(`${outPkgDirectoryPath}/${filenameSafeDisplayName(name)}.app`, `${filenameSafeDisplayName(name)}.app`)
                    rm('-rf', outPkgDirectoryPath)
                    this.log('Application created successfully.')
                    if (install) {
                      const installedApplicationsDirectoryPath = `${getMacOSApplicationsPath()}/${filenameSafeDisplayName(name)}.app`
                      if (existsSync(installedApplicationsDirectoryPath)) {
                        rm('-rf', installedApplicationsDirectoryPath)
                      }
                      mkdir(installedApplicationsDirectoryPath)
                      cp('-R', `${filenameSafeDisplayName(name)}.app/*`, installedApplicationsDirectoryPath)
                      rm('-rf', `${filenameSafeDisplayName(name)}.app`)
                      this.log('Application installed successfully...')
                      this.log('To remove installation of shortcut, remove the following:')
                      this.log(installedApplicationsDirectoryPath)
                    }
                  } else {
                    if (install) {
                      this.installShortcut(binaryName, platform, pngOutPath, { launcherName: filenameSafeDisplayName(name), url, binaryPath: outPkgBinaryPath, shortcutFilePath: null, shortcutName: null, icoOutPath: null, outPkgDirectoryPath: null })
                    } else {
                      this.log('Application created successfully.')
                    }
                  }
                })
                .catch((err:any) => this.error(err))
            })
            .catch(() => this.error('Binary packaging failed'))
        } else {
          this.error('npm install failed')
        }
      })
    })
  }
}

export = QuarkCarlo
