import { Index } from '../types/IndexType'
import { Options } from '../types/Options'
import { PackageFile } from '../types/PackageFile'
import { VersionSpec } from '../types/VersionSpec'
import resolveDepSections from './resolveDepSections'

/**
 * @returns String safe for use in `new RegExp()`
 */
function escapeRegexp(s: string) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') // Thanks Stack Overflow!
}

/**
 * Upgrade the dependency declarations in the package data.
 *
 * @param pkgData The package.json data, as utf8 text
 * @param oldDependencies Old dependencies {package: range}
 * @param newDependencies New dependencies {package: range}
 * @returns The updated package data, as utf8 text
 * @description Side Effect: prompts
 */
async function upgradePackageData(
  pkgData: string,
  current: Index<VersionSpec>,
  upgraded: Index<VersionSpec>,
  options: Options,
) {
  const depSections = resolveDepSections(options.dep)

  // iterate through each dependency section
  const sectionRegExp = new RegExp(`"(${depSections.join(`|`)})"s*:[^}]*`, 'g')
  let newPkgData = pkgData.replace(sectionRegExp, section => {
    // replace each upgraded dependency in the section
    Object.keys(upgraded).forEach(dep => {
      const expression = `"${dep}"\\s*:\\s*"(${escapeRegexp(current[dep])})"`
      const regExp = new RegExp(expression, 'g')
      section = section.replace(regExp, `"${dep}": "${upgraded[dep]}"`)
    })

    return section
  })

  if (depSections.includes('packageManager')) {
    const pkg = JSON.parse(pkgData) as PackageFile
    if (pkg.packageManager) {
      const [name] = pkg.packageManager.split('@')
      if (upgraded[name]) {
        newPkgData = newPkgData.replace(
          /"packageManager"\s*:\s*".*?@[^"]*"/,
          `"packageManager": "${name}@${upgraded[name]}"`,
        )
      }
    }
  }

  return newPkgData
}

export default upgradePackageData
