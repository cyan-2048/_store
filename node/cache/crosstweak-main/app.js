window.addEventListener('DOMContentLoaded', function() {
  var actionLock = false,
      currentKaiosVersion = '', enableCallRecordingActions = false

  function pickAndSetRingtone(prefix) {
  	actionLock = true
  	var ringPicker = new MozActivity({name: "pick"})
  	ringPicker.onsuccess = function(e) {
  	  var ringBlob = this.result.blob, ringBlobProp = prefix + '.ringtone',
  	  	  ringIdProp = ringBlobProp + '.id', 
  	  	  ringNameProp = ringBlobProp + '.name',
  	  	  setting = {}
  	  setting[ringBlobProp] = ringBlob
  	  setting[ringIdProp] = 'custom:1' 
  	  setting[ringNameProp] = this.result.name || 'Untitled'
	  var e = navigator.mozSettings.createLock().set(setting)
	  e.onsuccess = function() {
	  	window.alert('Tone set successfully!')
	    actionLock = false
	  }
	  e.onerror = function(e) {
	  	window.alert('Error setting the tone: ' + e.name)
	    actionLock = false
	  }
  	}
    ringPicker.onerror = function(e) {
	  window.alert('Error picking the ringtone: ' + e.name)
	  actionLock = false
    }

  }

  CrossTweak.getSystemSetting('deviceinfo.os', function(resVer) {
	currentKaiosVersion = resVer
	enableCallRecordingActions = (parseInt(currentKaiosVersion.split('.').slice(0,3).join('')) >= 252)
	if(!enableCallRecordingActions)
	  document.querySelector('.callrec').classList.add('disabled')
  })
  
  window.addEventListener('keydown', function(e) {
    if(!actionLock) {
      switch(e.key) {
        case '1': //set arbitrary ringtone
          pickAndSetRingtone('dialer')
          break
        case '2': //set arbitrary notification tone
          pickAndSetRingtone('notification')
          break
        case '3': //call recording AUTO/ON/OFF
          if(enableCallRecordingActions) {
            CrossTweak.getSystemSetting('callrecording.mode', function(curMode) {
              var nextMode = 'on'
              if(curMode === 'auto') nextMode = 'off'
              else if(curMode === 'on') nextMode = 'auto'
              CrossTweak.enableCallRecording(nextMode, 'wav', function() {
                var msgs = {
                  'on': 'set to manual',
                  'auto': 'set to automatic',
                  'off': 'disabled'
                }
                window.alert('Call recording ' + msgs[nextMode])
              }, function(e) {
                window.alert('Error: ' + e)
              })
            }, function(e) {
              window.alert('Error: ' + e)
            })
          } else window.alert('Sorry, call recording is implemented in KaiOS 2.5.2 and above, but you have ' + currentKaiosVersion)
          break
        case '4': //install app package
          actionLock = true
          var pickPackage = new MozActivity({name: "pick"})
          pickPackage.onsuccess = function() {
            CrossTweak.installPkg(this.result.blob, function() {
              window.alert('App ' + pickPackage.result.blob.name + ' successfully installed')
              actionLock = false
            }, function(e) {
              if(e.toString() === 'InvalidPrivilegeLevel')
                window.alert('Insufficient privileges. You must enable developer menu (#) before trying to install packages.')
              else
                window.alert('Error installing the package file: ' + e)
              actionLock = false
            })
          }
          pickPackage.onerror = function(e) {
            window.alert('Error picking the package file: ' + e.name)
            actionLock = false
          }
          break
        case '5': //Enable developer menu
        	CrossTweak.setSystemSetting('developer.menu.enabled', true, function() {
        	  window.alert('Developer menu enabled in Settings')
        	}, function(e) {window.alert('Error: ' + e)})
          break
        case '6': //Enter Engineering menu
          var a = new MozActivity({name:"engmode"})
          break
        case '7': //Proxy on/off
          CrossTweak.getSystemSetting('browser.proxy.enabled', function(res) {
            var newVal = !(res === true)
            CrossTweak.setSystemSetting('browser.proxy.enabled', newVal, function() {
              window.alert('Proxy ' + (newVal ? 'enabled' : 'disabled') + ' successfully')
            }, function(e) {
              window.alert('Error ' + (newVal ? 'enabling' : 'disabling') + ' proxy: ' + e)
            })
          }, function(e) {
            window.alert('Error: ' + e)
          })
          break
        case '8': //Set proxy host/port
          actionLock = true
          CrossTweak.getSystemSetting('browser.proxy.host', function(oldHost) {
            CrossTweak.getSystemSetting('browser.proxy.port', function(oldPort) {
              var newHost = window.prompt('Proxy host', oldHost || '')
              var newPort = Number(window.prompt('Proxy port', oldPort || ''))
              if(newHost && newPort) {
                CrossTweak.setSystemSetting('browser.proxy.host', newHost, function() {
                  CrossTweak.setSystemSetting('browser.proxy.port', newPort, function() {
                    window.alert('Proxy set successfully')
                    actionLock = false
                  }, function(e) {
                    window.alert('Error setting proxy port: ' + e)
                    actionLock = false
                  })
                }, function(e) {
                  window.alert('Error setting proxy host: ' + e)
                  actionLock = false
                })
              }
              else {
                window.alert('Error: Cannot set empty values for host or port')
                actionLock = false
              }
            }, function(e) {
              window.alert('Error: ' + e)
              actionLock = false
            })
          }, function(e) {
            window.alert('Error: ' + e)
            actionLock = false
          })
          break
        case '9': //view and modify arbitrary MozSetting
          var setting = window.prompt('Enter setting name')
          if(setting) {
          	CrossTweak.getSystemSetting(setting, function(value) {
			  if(value instanceof Blob) {
				window.alert('The setting ' + setting + ' has a Blob value, CrossTweak cannot view it')
			  }
			  else {
				if(window.confirm('Current ' + setting + ' value is:\n' + value + '\nDo you want to modify it?')) {
					var newVal = window.prompt('Enter new value: ', value || '')
					var vtl = newVal.toLowerCase().trim()
					if(vtl === 'true') newVal = true
					else if(vtl === 'false') newVal = false
					CrossTweak.setSystemSetting(setting, newVal, function(){window.alert('Setting ' + setting + ' updated successfully!')}, function(e){window.alert('Error: ' + e)})
				}
			  }
			}, function(e) {
				window.alert('Error: ' + e)
          	})
          }
          break
        case '#': //privileged reset just like in OmniSD
          if(window.confirm('Perform a privileged factory reset? All your data will be wiped!'))
          	CrossTweak.privilegedFactoryReset()
          break
        default:
          break
      }
    }
  })
}, false)
