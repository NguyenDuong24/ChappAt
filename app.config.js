export default {
  "expo": {
    "name": "ChatApp",
    "slug": "ChatApp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.saigondating.firebasesign",
      "googleServicesFile": process.env.GOOGLE_SERVICES_INFOPLIST
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON,
      "package": "com.saigindating.firebasesignin"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
  "expo-router",
  "@react-native-firebase/app",
  [
    "expo-build-properties",
    {
      "ios": {
        "useFrameworks": "static",
        "deploymentTarget": "13.4"
      },
      "android": {
        "compileSdkVersion": 34,
        "targetSdkVersion": 34,
        "buildToolsVersion": "34.0.0"
      }
    }
  ]
],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "ed2cdfd3-38bc-45cf-85bf-437b2b33a320"
      }
    }
  }
}
