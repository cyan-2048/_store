/**
 * LibCrossTweak: toolbox library for platform-independent and unrooted KaiOS tweaks
 * 
 * Needs "certified" level in the app manifest.
 * Requires additional manifest permissions:
 * 
 * "power" - enable power management and privileged factory reset;
 * "external-api" - support KaiOS 2.5.1+ devices with non-standard protected extension;
 * "device-storage:apps": {"access": "readwrite"} - support package installation;
 * "webapps-manage" - support package installation (via navigator.mozApps interface);
 * "settings": {"access": "readwrite"} - support hidden settings manipulation.
 *
 * Library functions marked as [EXPERIMENTAL] may work or fail to work on a particular device
 * and/or with particular parameters.
 *
 * Current version: 0.1
 *
 * Version history:
 *
 * 2021-11-05: Initial release (v0.1)
 *
 * @license
 * -----------------------------------------------------------------------
 * This is free and unencumbered software released into the public domain.
 *
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 *
 * In jurisdictions that recognize copyright laws, the author or authors
 * of this software dedicate any and all copyright interest in the
 * software to the public domain. We make this dedication for the benefit
 * of the public at large and to the detriment of our heirs and
 * successors. We intend this dedication to be an overt act of
 * relinquishment in perpetuity of all present and future rights to this
 * software under copyright law.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * For more information, please refer to <http://unlicense.org/>
 **/

;(function(global, nav) {

  /**
   * Start the privileged factory reset procedure
   * (NOTE: only works until KaiOS 2.5.2.1, will do a usual factory reset afterwards!)
   */
  function privilegedFactoryReset() {
    nav.mozPower.factoryReset('root')
  }

  /**
   * Install an app package via the stock B2G API
   * (NOTE: only works until KaiOS 2.5.2.1, will do nothing in the later versions!)
   *
   * @param {File|Blob} packageFile The File or Blob object of the zip package to install
   * @param {function} successCb The callback that gets called on success
   * @param {function} errorCb The callback that gets called on error
   */
  function installPkg(packageFile, successCb, errorCb) {
  	if('import' in nav.mozApps.mgmt) {
		nav.mozApps.mgmt.import(packageFile).then(function(){
		  successCb()
		}).catch(function(e){
		  errorCb(e.name, e.message)
		})
	}
	else errorCb('Method outdated', 'The import method had been removed in this KaiOS version')
  }

  /**
   * Get a property from the system settings database
   * @param {string} key The name of the property to retrieve
   * @param {function} successCb The callback to which the value gets returned
   * @param {function} errorCb The callback that gets called on error
   */
  function getSystemSetting(key, successCb, errorCb) {
    var e = nav.mozSettings.createLock().get(key)
    e.onsuccess = function() {
      successCb(e.result[key])
    }
    e.onerror = errorCb
  }
  
  /**
   * Set a property in the system settings database
   * @param {string} key The name of the property to set
   * @param {string} value The value of the property to set
   * @param {function} successCb The callback that gets called on success
   * @param {function} errorCb The callback that gets called on error
   */
  function setSystemSetting(key, value, successCb, errorCb) {
    var setting = {}
    setting[key] = value
    var e = nav.mozSettings.createLock().set(setting)
    e.onsuccess = successCb
    e.onerror = errorCb
  }

  /**
   * Set browser-wide HTTP/HTTPS proxy configuration
   * @param {string} host Proxy hostname or IP
   * @param {number} port Proxy port number
   * @param {function} successCb The callback that gets called on success
   * @param {function} errorCb The callback that gets called on error
   */
  function setBrowserProxy(host, port, successCb, errorCb) {
    setSystemSetting('browser.proxy.host', host, function() {
      setSystemSetting('browser.proxy.port', port, function() {
        setSystemSetting('browser.proxy.enabled', true, successCb, errorCb)
      }, errorCb)
    }, errorCb)
  }

  /**
   * Disable browser-wide HTTP/HTTPS proxy
   */
  function unsetBrowserProxy(successCb, errorCb) {
    setSystemSetting('browser.proxy.enabled', false, successCb, errorCb)
  }

  /**
   * Calculate Luhn checksum of an IMEI number string (takes first 14 digits and computes the 15th)
   * @param {string|array} IMEI digit string or numeric array
   * @returns {number} Luhn checksum digit
   */
  function calcIMEIChecksum(imei) {
    if(imei === '' + imei) //split the digits if we passed the string
      imei = imei.split('').map(Number)
    var revmap = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9],
        oddsum = imei[0] + imei[2] + imei[4] + imei[6] + imei[8] + imei[10] + imei[12],
        evensum = revmap[imei[1]] + revmap[imei[3]] + revmap[imei[5]] + revmap[imei[7]] + revmap[imei[9]] + revmap[imei[11]] + revmap[imei[13]],
        luhn = 10 - (oddsum + evensum) % 10
    return luhn > 9 ? 0 : luhn
  }

  /**
   * Generate a random 15-digit IMEI that passes Luhn checksum
   * @param {string} tac Optional TAC variable length (typically 8-digit) string
   * @returns {string} random valid IMEI number
   */
  function generateRandomIMEI(tac='') {
    tac += ''
    var imei = new Uint8Array(14 - tac.length).map(x=>(Math.random()*1000|0)%10)
    imei = tac.split('').map(Number).concat(Array.from(imei))
    return imei.join('') + calcIMEIChecksum(imei)
  }

  /**
   * Generate a random 6-byte MAC address string
   * @param {string} pref Optional hex vendor prefix string (can be colon-separated)
   * @returns {string} random colon-separated MAC address
   */
  function generateRandomMAC(pref='') {
    pref = pref.toLowerCase().replace(/[^0-9a-f]/g, '')
    var mac = new Uint8Array(12 - pref.length).map(x=>(Math.random()*1000|0)&15)
    mac = pref.split('').map(x => parseInt(x, 16)).concat(Array.from(mac))
    return mac.map(x => x.toString(16)).join('').match(/.{2}/g).join(':')
  }

  /**
  * Enable/disable call recording in the main callscreen (KaiOS 2.5.2+ only)
  * (toggled by Camera button on the devices that have it and Left arrow on all others)
  * @param {string} flag (on|auto|off)
  * @param {string} format Recording format (wav, 3gpp, ogg or opus)
  * @param {function} successCb The callback that gets called on success
  * @param {function} errorCb The callback that gets called on error
  */
  function enableCallRecording(flag='on', format='wav', successCb, errorCb) {
    setSystemSetting('callrecording.mode', flag, function() {
      setSystemSetting('callrecording.file.format', format, function() {
        setSystemSetting('callrecording.notification.enabled', false, function() {
          setSystemSetting('callrecording.vibration.enabled', false, successCb, errorCb)
        }, errorCb)
      }, errorCb)
    }, errorCb)
  }

  global.CrossTweak = {
    privilegedFactoryReset: privilegedFactoryReset,
    getSystemSetting: getSystemSetting,
    setSystemSetting: setSystemSetting,
    setBrowserProxy: setBrowserProxy,
    unsetBrowserProxy: unsetBrowserProxy,
    calcIMEIChecksum: calcIMEIChecksum,
    generateRandomIMEI: generateRandomIMEI,
    generateRandomMAC: generateRandomMAC,
    installPkg: installPkg,
    enableCallRecording: enableCallRecording
  }

})(window, navigator)
