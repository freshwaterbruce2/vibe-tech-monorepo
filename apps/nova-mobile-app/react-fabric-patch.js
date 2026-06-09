'use strict';

import { BatchedBridge } from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface';

let ReactFabric;

if (__DEV__) {
  ReactFabric = require('react-native/Libraries/Renderer/implementations/ReactFabric-dev');
} else {
  ReactFabric = require('react-native/Libraries/Renderer/implementations/ReactFabric-prod');
}

try {
  if (ReactFabric && ReactFabric.stopSurface) {
    global.RN$stopSurface = ReactFabric.stopSurface;
  }
} catch (e) {
  console.log('ANTIGRAVITY: Bypassed read-only RN$stopSurface assignment:', e.message);
}

if (global.RN$Bridgeless !== true && ReactFabric) {
  BatchedBridge.registerCallableModule('ReactFabric', ReactFabric);
}

export default ReactFabric;
